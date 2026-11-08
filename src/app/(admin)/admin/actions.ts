"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: me } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) redirect("/entrar");
  return supabase;
}

/** Volta para a tela de origem (apenas rotas /admin) com ou sem mensagem de erro. */
function done(fd: FormData, error?: string): never {
  const raw = str(fd, "return");
  const base = raw.startsWith("/admin") && !raw.startsWith("//") ? raw.split("?")[0] : "/admin";
  const keep = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1).replace(/(^|&)erro=[^&]*/g, "").replace(/^&/, "") : "";
  revalidatePath(base);
  const qs = [keep, error ? `erro=${encodeURIComponent(error)}` : ""].filter(Boolean).join("&");
  redirect(qs ? `${base}?${qs}` : base);
}

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

/* ───────── Moderação ───────── */

export async function setUserStatus(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, "id");
  const status = str(fd, "status");
  if (!UUID_RE.test(id)) return done(fd, "Usuário inválido.");
  const { error } = await supabase.rpc("admin_set_user_status", { p_user: id, p_status: status });
  if (error) return done(fd, error.message.includes("CANNOT_MODERATE_SELF") ? "Você não pode suspender a própria conta." : "Não foi possível alterar o status.");
  done(fd);
}

export async function setVerified(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, "id");
  const kind = str(fd, "kind");
  const value = str(fd, "value") === "true";
  if (!UUID_RE.test(id) || !["professional", "company"].includes(kind)) return done(fd, "Dados inválidos.");
  const table = kind === "professional" ? "professional_profiles" : "company_profiles";
  const { error } = await supabase.from(table).update({ is_verified: value }).eq("id", id);
  if (error) return done(fd, "Não foi possível alterar o selo.");
  done(fd);
}

/* ───────── Categorias e serviços ───────── */

export async function saveCategory(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, "id");
  const name = str(fd, "name");
  if (name.length < 2) return done(fd, "Informe o nome da categoria.");
  const payload = {
    name,
    description: str(fd, "description") || null,
    icon_name: str(fd, "icon_name") || null,
    display_order: Number(str(fd, "display_order")) || 0,
  };
  const res = id
    ? await supabase.from("categories").update(payload).eq("id", id)
    : await supabase.from("categories").insert({ ...payload, slug: slugify(str(fd, "slug") || name) });
  if (res.error) return done(fd, res.error.code === "23505" ? "Já existe uma categoria com esse slug." : "Não foi possível salvar a categoria.");
  done(fd);
}

export async function setCategoryActive(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, "id");
  if (!UUID_RE.test(id)) return done(fd, "Dados inválidos.");
  const { error } = await supabase.from("categories").update({ is_active: str(fd, "value") === "true" }).eq("id", id);
  if (error) return done(fd, "Não foi possível alterar a categoria.");
  done(fd);
}

export async function saveService(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, "id");
  const category_id = str(fd, "category_id");
  const name = str(fd, "name");
  const price = Number(str(fd, "suggested_min_price").replace(",", "."));
  if (name.length < 2) return done(fd, "Informe o nome do serviço.");
  if (!Number.isFinite(price) || price < 0) return done(fd, "Preço sugerido inválido.");
  const res = id
    ? await supabase.from("services").update({ name, suggested_min_price: price }).eq("id", id)
    : UUID_RE.test(category_id)
      ? await supabase.from("services").insert({ category_id, name, slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`, suggested_min_price: price })
      : { error: { code: "x" } };
  if (res.error) return done(fd, "Não foi possível salvar o serviço.");
  done(fd);
}

export async function setServiceActive(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, "id");
  if (!UUID_RE.test(id)) return done(fd, "Dados inválidos.");
  const { error } = await supabase.from("services").update({ is_active: str(fd, "value") === "true" }).eq("id", id);
  if (error) return done(fd, "Não foi possível alterar o serviço.");
  done(fd);
}

/* ───────── Campanhas e pacotes ───────── */

export async function setCampaignFeatured(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, "id");
  if (!UUID_RE.test(id)) return done(fd, "Dados inválidos.");
  const { error } = await supabase.from("campaigns").update({ is_featured: str(fd, "value") === "true" }).eq("id", id);
  if (error) return done(fd, "Não foi possível alterar o destaque.");
  done(fd);
}

export async function closeCampaign(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, "id");
  if (!UUID_RE.test(id)) return done(fd, "Dados inválidos.");
  const { error } = await supabase.from("campaigns").update({ status: "CANCELLED" }).eq("id", id);
  if (error) return done(fd, "Não foi possível encerrar a campanha.");
  done(fd);
}

export async function setPackageActive(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, "id");
  if (!UUID_RE.test(id)) return done(fd, "Dados inválidos.");
  const { error } = await supabase.from("service_packages").update({ is_active: str(fd, "value") === "true" }).eq("id", id);
  if (error) {
    const m = error.message;
    return done(fd, m.includes("PROFILE_INCOMPLETE") ? "O perfil do dono tem menos de 80%: não dá para reativar."
      : m.includes("PACKAGE_LIMIT_REACHED") ? "O dono já está no limite de pacotes ativos do plano." : "Não foi possível alterar o pacote.");
  }
  done(fd);
}

/* ───────── Assinaturas ───────── */

export async function setUserPlan(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, "id");
  const plan = str(fd, "plan");
  if (!UUID_RE.test(id) || !plan) return done(fd, "Dados inválidos.");
  const { error } = await supabase.rpc("admin_set_user_plan", { p_user: id, p_plan_slug: plan });
  if (error) return done(fd, error.message.includes("ROLE_MISMATCH") ? "Esse usuário não tem esse tipo de conta." : "Não foi possível alterar o plano.");
  done(fd);
}
