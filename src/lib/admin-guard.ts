import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Garante sessão de admin dentro de uma Server Action (o banco também impõe via RLS). */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: me } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) redirect("/entrar");
  return supabase;
}

/** Volta para a tela de origem (somente rotas /admin), com ou sem mensagem de erro. */
export function done(fd: FormData, error?: string): never {
  const raw = str(fd, "return");
  const ok = raw.startsWith("/admin") && !raw.startsWith("//");
  const base = ok ? raw.split("?")[0] : "/admin";
  const keep = ok && raw.includes("?") ? raw.slice(raw.indexOf("?") + 1).replace(/(^|&)erro=[^&]*/g, "").replace(/^&/, "") : "";
  revalidatePath(base);
  const qs = [keep, error ? `erro=${encodeURIComponent(error)}` : ""].filter(Boolean).join("&");
  redirect(qs ? `${base}?${qs}` : base);
}

export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
