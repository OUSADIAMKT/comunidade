"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MIN_ACCOUNT_AGE, UFS, UNDERAGE_MESSAGE, USERNAME_RE, ageFromISODate, isHttpUrl, onlyDigits } from "@/lib/constants";

export type FormState = { ok: boolean; error?: string; message?: string; score?: number };

async function session() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("professional_profiles").select("id,username").eq("user_id", user.id).maybeSingle();
  if (!profile) return null;
  return { supabase, user, profile };
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => {
  const n = Number(String(fd.get(k) ?? "0").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const handle =(v: string) => v.replace(/^@/, "").replace(/[^\w.]/g, "");

/* ───────────────────────── PERFIL ───────────────────────── */

export async function saveProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const s = await session();
  if (!s) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const { supabase, user, profile } = s;

  const username = str(fd, "username").toLowerCase();
  const full_name = str(fd, "full_name");
  const state_uf = str(fd, "state_uf");
  const city = str(fd, "city");
  const categoryIds = fd.getAll("categories").map(String);
  const primary = str(fd, "primary_category");
  const phone = onlyDigits(str(fd, "phone"));
  const starting_price = num(fd, "starting_price");
  const avatar = str(fd, "avatar_url");

  if (full_name.length < 2) return { ok: false, error: "Informe seu nome." };
  if (!USERNAME_RE.test(username)) return { ok: false, error: "Usuário: 3 a 30 caracteres (a-z, 0-9 e _)." };
  if (!categoryIds.length) return { ok: false, error: "Escolha pelo menos uma categoria." };
  if (!categoryIds.every((c) => UUID_RE.test(c))) return { ok: false, error: "Categoria inválida." };
  if (!categoryIds.includes(primary)) return { ok: false, error: "Marque qual é a categoria principal." };
  if (!(UFS as readonly string[]).includes(state_uf) || !city) return { ok: false, error: "Informe UF e cidade." };
  if (phone && (phone.length < 10 || phone.length > 13)) return { ok: false, error: "WhatsApp inválido. Use DDD + número." };
  if (Number.isNaN(starting_price)) return { ok: false, error: "Preço inicial inválido." };
  if (avatar && !isHttpUrl(avatar)) return { ok: false, error: "Foto inválida." };

  const followers = (k: string) => {
    const n = Math.floor(num(fd, k));
    return Number.isNaN(n) ? 0 : n;
  };

  const { error: uErr } = await supabase
    .from("users")
    .update({ full_name, phone_whatsapp: phone || null, avatar_url: avatar || null })
    .eq("id", user.id);
  if (uErr) return { ok: false, error: "Não foi possível salvar seus dados básicos." };

  const { error: pErr } = await supabase
    .from("professional_profiles")
    .update({
      username,
      headline: str(fd, "headline") || null,
      bio: str(fd, "bio") || null,
      state_uf,
      city,
      amazon_territory_pole: str(fd, "amazon_territory_pole") || null,
      niches: fd.getAll("niches").map(String),
      starting_price,
      work_modality: str(fd, "work_modality") || "HYBRID",
      is_available: fd.get("is_available") === "on",
      is_public: fd.get("is_public") === "on",
      instagram_handle: handle(str(fd, "instagram_handle")) || null,
      instagram_followers: followers("instagram_followers"),
      tiktok_handle: handle(str(fd, "tiktok_handle")) || null,
      tiktok_followers: followers("tiktok_followers"),
      youtube_handle: handle(str(fd, "youtube_handle")) || null,
      youtube_followers: followers("youtube_followers"),
      pinterest_handle: handle(str(fd, "pinterest_handle")) || null,
      pinterest_followers: followers("pinterest_followers"),
    })
    .eq("id", profile.id);
  if (pErr) {
    return { ok: false, error: pErr.code === "23505" ? "Este @usuário já está em uso." : "Não foi possível salvar o perfil." };
  }

  const birth = str(fd, "birth_date");
  if (birth) {
    const age = ageFromISODate(birth);
    if (age === null) return { ok: false, error: "Data de nascimento inválida." };
    if (age < MIN_ACCOUNT_AGE) return { ok: false, error: UNDERAGE_MESSAGE };
  }

  // Dados sensíveis (LGPD): tabela privada, só o dono e admins leem
  const { error: privErr } = await supabase.from("professional_private_data").upsert({
    professional_id: profile.id,
    user_id: user.id,
    pix_key: str(fd, "pix_key") || null,
    cpf_cnpj: onlyDigits(str(fd, "cpf_cnpj")) || null,
    birth_date: str(fd, "birth_date") || null,
    updated_at: new Date().toISOString(),
  });
  if (privErr) return { ok: false, error: "Perfil salvo, mas falhou ao salvar os dados de recebimento." };

  // Categorias N:N — remove as desmarcadas e faz upsert das marcadas
  const { error: delErr } = await supabase
    .from("professional_categories")
    .delete()
    .eq("professional_id", profile.id)
    .not("category_id", "in", `(${categoryIds.join(",")})`);
  if (delErr) return { ok: false, error: "Falha ao atualizar as categorias." };

  const { error: catErr } = await supabase.from("professional_categories").upsert(
    categoryIds.map((category_id) => ({
      professional_id: profile.id,
      category_id,
      is_primary: category_id === primary,
      experience_years: Math.max(1, Math.floor(num(fd, `exp_${category_id}`)) || 1),
    })),
  );
  if (catErr) return { ok: false, error: "Falha ao salvar as categorias." };

  const { data: fresh } = await supabase
    .from("professional_profiles").select("profile_completion_score").eq("id", profile.id).single();

  revalidatePath("/profissional", "layout");
  revalidatePath(`/c/${username}`);
  return { ok: true, message: "Perfil salvo!", score: fresh?.profile_completion_score ?? 0 };
}

/* ───────────────────────── PORTFÓLIO ───────────────────────── */

export async function addPortfolioItem(input: {
  title: string;
  brand_name: string;
  description: string;
  category_id: string;
  media_type: "VIDEO" | "IMAGE" | "EXTERNAL_LINK";
  media_url: string;
}): Promise<FormState> {
  const s = await session();
  if (!s) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Dê um título ao trabalho." };
  if (!["VIDEO", "IMAGE", "EXTERNAL_LINK"].includes(input.media_type)) return { ok: false, error: "Tipo de mídia inválido." };
  if (!isHttpUrl(input.media_url)) return { ok: false, error: "Link inválido." };

  const { error } = await s.supabase.from("portfolio_items").insert({
    professional_id: s.profile.id,
    category_id: input.category_id || null,
    title,
    brand_name: input.brand_name.trim() || null,
    description: input.description.trim() || null,
    media_type: input.media_type,
    media_url: input.media_url,
  });
  if (error) return { ok: false, error: "Não foi possível salvar o item." };

  revalidatePath("/profissional", "layout");
  revalidatePath(`/c/${s.profile.username}`);
  return { ok: true, message: "Item adicionado ao portfólio." };
}

export async function deletePortfolioItem(id: string): Promise<FormState> {
  const s = await session();
  if (!s) return { ok: false, error: "Sessão expirada." };
  const { data: item } = await s.supabase
    .from("portfolio_items").select("media_url,media_type").eq("id", id).eq("professional_id", s.profile.id).maybeSingle();
  const { error } = await s.supabase.from("portfolio_items").delete().eq("id", id).eq("professional_id", s.profile.id);
  if (error) return { ok: false, error: "Não foi possível remover." };

  // Remove o arquivo do Storage se foi upload nosso (dentro da pasta do usuário)
  if (item && item.media_type !== "EXTERNAL_LINK") {
    const marker = "/storage/v1/object/public/media/";
    const idx = item.media_url.indexOf(marker);
    if (idx >= 0) {
      const path = decodeURIComponent(item.media_url.slice(idx + marker.length));
      if (path.startsWith(`${s.user.id}/`)) await s.supabase.storage.from("media").remove([path]);
    }
  }
  revalidatePath("/profissional", "layout");
  revalidatePath(`/c/${s.profile.username}`);
  return { ok: true };
}

export async function toggleFeatured(id: string, value: boolean): Promise<FormState> {
  const s = await session();
  if (!s) return { ok: false, error: "Sessão expirada." };
  const { error } = await s.supabase
    .from("portfolio_items").update({ is_featured: value }).eq("id", id).eq("professional_id", s.profile.id);
  if (error) return { ok: false, error: "Não foi possível atualizar." };
  revalidatePath("/profissional/portfolio");
  revalidatePath(`/c/${s.profile.username}`);
  return { ok: true };
}

/* ───────────────────────── PACOTES (20Pila) ───────────────────────── */

function packageError(code: string | undefined, message: string | undefined): string {
  if (message?.includes("PROFILE_INCOMPLETE"))
    return "Complete seu perfil (pontuação mínima de 80) para publicar pacotes.";
  if (message?.includes("PACKAGE_LIMIT_REACHED"))
    return "Você atingiu o limite de pacotes ativos do seu plano. Desative um pacote para ativar outro.";
  return code === "23503" ? "Categoria inválida." : "Não foi possível salvar o pacote.";
}

export async function savePackage(_prev: FormState, fd: FormData): Promise<FormState> {
  const s = await session();
  if (!s) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const id = str(fd, "id");
  const title = str(fd, "title");
  const description = str(fd, "description");
  const category_id = str(fd, "category_id");
  const price = num(fd, "price");
  const delivery_days = Math.floor(num(fd, "delivery_days"));
  const revisions_included = Math.floor(num(fd, "revisions_included"));

  if (title.length < 3) return { ok: false, error: "Dê um título ao pacote (ex: 1 Vídeo UGC de Produto)." };
  if (!description) return { ok: false, error: "Descreva o que está incluso." };
  if (!category_id) return { ok: false, error: "Escolha a categoria do pacote." };
  if (!(price > 0)) return { ok: false, error: "Informe um valor maior que zero." };
  if (!(delivery_days >= 1)) return { ok: false, error: "O prazo mínimo é 1 dia." };

  // O pacote só pode usar categorias que o profissional possui
  const { data: owns } = await s.supabase
    .from("professional_categories").select("category_id")
    .eq("professional_id", s.profile.id).eq("category_id", category_id).maybeSingle();
  if (!owns) return { ok: false, error: "Escolha uma das suas categorias." };

  const payload = {
    category_id,
    title,
    description,
    deliverables_summary: str(fd, "deliverables_summary") || null,
    price,
    delivery_days,
    revisions_included: Number.isNaN(revisions_included) ? 1 : revisions_included,
    updated_at: new Date().toISOString(),
  };

  const res = id
    ? await s.supabase.from("service_packages").update(payload).eq("id", id).eq("professional_id", s.profile.id)
    : await s.supabase.from("service_packages").insert({ ...payload, professional_id: s.profile.id });
  if (res.error) return { ok: false, error: packageError(res.error.code, res.error.message) };

  revalidatePath("/profissional/servicos");
  revalidatePath(`/c/${s.profile.username}`);
  return { ok: true, message: id ? "Pacote atualizado." : "Pacote criado!" };
}

export async function setPackageActive(id: string, active: boolean): Promise<FormState> {
  const s = await session();
  if (!s) return { ok: false, error: "Sessão expirada." };
  const { error } = await s.supabase
    .from("service_packages").update({ is_active: active }).eq("id", id).eq("professional_id", s.profile.id);
  if (error) return { ok: false, error: packageError(error.code, error.message) };
  revalidatePath("/profissional/servicos");
  revalidatePath(`/c/${s.profile.username}`);
  return { ok: true };
}

export async function deletePackage(id: string): Promise<FormState> {
  const s = await session();
  if (!s) return { ok: false, error: "Sessão expirada." };
  const { error } = await s.supabase.from("service_packages").delete().eq("id", id).eq("professional_id", s.profile.id);
  if (error) return { ok: false, error: "Não foi possível excluir." };
  revalidatePath("/profissional/servicos");
  revalidatePath(`/c/${s.profile.username}`);
  return { ok: true };
}
