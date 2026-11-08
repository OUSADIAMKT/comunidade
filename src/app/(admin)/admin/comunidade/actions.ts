"use server";

import { revalidatePath } from "next/cache";
import { done, requireAdmin, slugify, str } from "@/lib/admin-guard";
import { UUID_RE } from "@/lib/escola";

/** Trata um conteúdo denunciado: restaurar (descarta denúncias), manter oculto ou apagar. */
export async function resolveReported(fd: FormData) {
  const supabase = await requireAdmin();
  const kind = str(fd, "kind");
  const id = str(fd, "id");
  const action = str(fd, "action");
  if (!UUID_RE.test(id) || !["topic", "post"].includes(kind) || !["restore", "hide", "delete"].includes(action)) return done(fd, "Dados inválidos.");

  const table = kind === "topic" ? "forum_topics" : "forum_posts";
  const col = kind === "topic" ? "topic_id" : "post_id";

  if (action === "delete") {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return done(fd, "Não foi possível apagar.");
  } else {
    const hide = action === "hide";
    const { error } = await supabase.from(table).update({ is_hidden: hide }).eq("id", id);
    if (error) return done(fd, "Não foi possível atualizar o conteúdo.");
    await supabase.from("forum_reports").update({ status: hide ? "ACTIONED" : "DISMISSED" }).eq(col, id).eq("status", "OPEN");
  }
  revalidatePath("/comunidade", "layout");
  done(fd);
}

export async function saveForumCategory(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, "id");
  const name = str(fd, "name");
  if (name.length < 2) return done(fd, "Informe o nome da categoria.");
  const payload = {
    name,
    description: str(fd, "description") || null,
    position: Number(str(fd, "position")) || 0,
    is_active: str(fd, "is_active") !== "false",
  };
  const res = id && UUID_RE.test(id)
    ? await supabase.from("forum_categories").update(payload).eq("id", id)
    : await supabase.from("forum_categories").insert({ ...payload, slug: slugify(str(fd, "slug") || name) });
  if (res.error) return done(fd, res.error.code === "23505" ? "Já existe uma categoria com esse nome/slug." : "Não foi possível salvar a categoria.");
  revalidatePath("/comunidade", "layout");
  done(fd);
}
