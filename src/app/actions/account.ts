"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";

/**
 * Ativa um papel (Profissional ou Empresa) na própria conta e leva ao cadastro daquele perfil.
 * `exclusive=1` (usado no onboarding) desliga o outro papel quando ele ainda não tem perfil criado:
 * é o caso de quem entrou pelo Google, virou "profissional" por padrão e na verdade é empresa.
 */
export async function activateRole(fd: FormData): Promise<void> {
  const role = String(fd.get("role") ?? "");
  if (role !== "PROFESSIONAL" && role !== "COMPANY") redirect("/");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const patch: Record<string, unknown> = { active_context: role };
  if (role === "COMPANY") patch.is_company = true;
  else patch.is_professional = true;

  if (fd.get("exclusive") === "1") {
    if (role === "COMPANY") {
      const { data: prof } = await supabase.from("professional_profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!prof) patch.is_professional = false;
    } else {
      const { data: comp } = await supabase.from("company_profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!comp) patch.is_company = false;
    }
  }

  await supabase.from("users").update(patch).eq("id", user.id);
  revalidatePath("/", "layout");
  redirect(role === "COMPANY" ? "/empresa/perfil" : "/onboarding");
}

/** Aceite da Política de Privacidade + declaração de 18+ para quem ainda não aceitou (ex.: cadastro pelo Google). */
export async function acceptTerms(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!fd.get("terms")) return { ok: false, error: "Aceite a Política de Privacidade para continuar." };
  if (!fd.get("adult")) {
    return {
      ok: false,
      error: "Confirme que você tem 18 anos ou mais. Menores não se cadastram: o responsável legal faz o cadastro.",
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("users")
    .update({ terms_accepted_at: now, privacy_accepted_at: now })
    .eq("id", user.id);
  if (error) return { ok: false, error: "Não foi possível registrar o aceite. Tente de novo." };
  await supabase.auth.updateUser({ data: { adult_declaration_at: now, terms_accepted_at: now, privacy_accepted_at: now } });

  revalidatePath("/", "layout");
  return { ok: true };
}
