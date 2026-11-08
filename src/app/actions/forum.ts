"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";
import { UUID_RE } from "@/lib/escola";

function friendly(message: string | undefined, fallback: string) {
  const m = message ?? "";
  if (m.includes("RATE_LIMIT")) return "Você está publicando rápido demais. Aguarde um pouco e tente de novo.";
  if (m.includes("TOPIC_LOCKED")) return "Este tópico foi trancado pela moderação.";
  if (m.includes("TOPIC_UNAVAILABLE")) return "Este tópico não está mais disponível.";
  if (m.includes("CATEGORY_INACTIVE")) return "Esta categoria não está recebendo novos tópicos.";
  if (m.includes("row-level security")) return "Você não tem permissão para esta ação.";
  return fallback;
}

async function session() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

const LOGIN: FormState = { ok: false, error: "Sessão expirada. Entre novamente." };

export async function createTopic(_prev: FormState, fd: FormData): Promise<FormState> {
  const s = await session();
  if (!s) return LOGIN;
  const category_id = String(fd.get("category_id") ?? "");
  const title = String(fd.get("title") ?? "").trim();
  const body = String(fd.get("body") ?? "").trim();
  if (!UUID_RE.test(category_id)) return { ok: false, error: "Escolha uma categoria." };
  if (title.length < 5 || title.length > 140) return { ok: false, error: "O título precisa ter de 5 a 140 caracteres." };
  if (!body || body.length > 8000) return { ok: false, error: "Escreva o conteúdo do tópico (até 8000 caracteres)." };

  const { data, error } = await s.supabase.from("forum_topics")
    .insert({ category_id, author_id: s.user.id, title, body }).select("id").single();
  if (error || !data) return { ok: false, error: friendly(error?.message, "Não foi possível publicar o tópico.") };
  revalidatePath("/comunidade", "layout");
  redirect(`/comunidade/t/${data.id}`);
}

export async function createPost(_prev: FormState, fd: FormData): Promise<FormState> {
  const s = await session();
  if (!s) return LOGIN;
  const topic_id = String(fd.get("topic_id") ?? "");
  const body = String(fd.get("body") ?? "").trim();
  if (!UUID_RE.test(topic_id)) return { ok: false, error: "Tópico inválido." };
  if (!body) return { ok: false, error: "Escreva sua resposta." };
  if (body.length > 8000) return { ok: false, error: "A resposta passou de 8000 caracteres." };

  const { error } = await s.supabase.from("forum_posts").insert({ topic_id, author_id: s.user.id, body });
  if (error) return { ok: false, error: friendly(error.message, "Não foi possível publicar a resposta.") };
  revalidatePath(`/comunidade/t/${topic_id}`);
  return { ok: true, message: "Resposta publicada!" };
}

export async function toggleLike(target: { topicId?: string; postId?: string }): Promise<{ ok: boolean; liked?: boolean; error?: string }> {
  const s = await session();
  if (!s) return { ok: false, error: "Sessão expirada." };
  const isTopic = !!target.topicId;
  const id = (isTopic ? target.topicId : target.postId) ?? "";
  if (!UUID_RE.test(id)) return { ok: false, error: "Dados inválidos." };
  const col = isTopic ? "topic_id" : "post_id";

  const { data: existing } = await s.supabase.from("forum_likes").select("id").eq("user_id", s.user.id).eq(col, id).maybeSingle();
  if (existing) {
    const { error } = await s.supabase.from("forum_likes").delete().eq("id", existing.id);
    return error ? { ok: false, error: "Não foi possível descurtir." } : { ok: true, liked: false };
  }
  const { error } = await s.supabase.from("forum_likes").insert({ user_id: s.user.id, [col]: id });
  return error ? { ok: false, error: "Não foi possível curtir." } : { ok: true, liked: true };
}

export async function reportContent(input: { topicId?: string; postId?: string; reason: string }): Promise<FormState> {
  const s = await session();
  if (!s) return LOGIN;
  const reason = input.reason.trim();
  const id = input.topicId ?? input.postId ?? "";
  if (!UUID_RE.test(id)) return { ok: false, error: "Dados inválidos." };
  if (reason.length < 3) return { ok: false, error: "Conte rapidamente o motivo da denúncia." };

  const { error } = await s.supabase.from("forum_reports").insert({
    reporter_id: s.user.id,
    topic_id: input.topicId ?? null,
    post_id: input.postId ?? null,
    reason: reason.slice(0, 500),
  });
  if (error) return { ok: false, error: error.code === "23505" ? "Você já denunciou este conteúdo." : "Não foi possível enviar a denúncia." };
  revalidatePath("/comunidade", "layout");
  return { ok: true, message: "Denúncia enviada. Obrigado por cuidar da comunidade!" };
}

export async function deleteOwn(kind: "topic" | "post", id: string): Promise<FormState & { redirectTo?: string }> {
  const s = await session();
  if (!s) return LOGIN;
  if (!UUID_RE.test(id)) return { ok: false, error: "Dados inválidos." };
  const { error } = await s.supabase.from(kind === "topic" ? "forum_topics" : "forum_posts").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível apagar." };
  revalidatePath("/comunidade", "layout");
  return { ok: true, redirectTo: kind === "topic" ? "/comunidade" : undefined };
}

/** Controles de moderação no próprio tópico (somente admin; o banco também impõe). */
export async function setTopicFlag(id: string, field: "is_pinned" | "is_locked" | "is_hidden", value: boolean): Promise<FormState> {
  const s = await session();
  if (!s) return LOGIN;
  if (!UUID_RE.test(id) || !["is_pinned", "is_locked", "is_hidden"].includes(field)) return { ok: false, error: "Dados inválidos." };
  const { data: me } = await s.supabase.from("users").select("is_admin").eq("id", s.user.id).single();
  if (!me?.is_admin) return { ok: false, error: "Somente moderadores." };
  const { error } = await s.supabase.from("forum_topics").update({ [field]: value }).eq("id", id);
  if (error) return { ok: false, error: "Não foi possível atualizar." };
  revalidatePath("/comunidade", "layout");
  return { ok: true };
}
