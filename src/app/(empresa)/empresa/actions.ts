"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";
import { UFS, isHttpUrl, onlyDigits } from "@/lib/constants";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => {
  const n = Number(String(fd.get(k) ?? "0").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

async function session() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: company } = await supabase
    .from("company_profiles").select("id,slug").eq("user_id", user.id).maybeSingle();
  return { supabase, user, company };
}

function slugify(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "empresa";
}

/* ───────────────────────── PERFIL DA EMPRESA ───────────────────────── */

export async function saveCompanyProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const s = await session();
  if (!s) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const company_name = str(fd, "company_name");
  const state_uf = str(fd, "state_uf");
  const city = str(fd, "city");
  const sector_niche = str(fd, "sector_niche");
  const cnpj = onlyDigits(str(fd, "cnpj"));
  const logo = str(fd, "logo_url");
  const website = str(fd, "website_url");
  const phone = onlyDigits(str(fd, "phone"));

  if (company_name.length < 2) return { ok: false, error: "Informe o nome da empresa." };
  if (!sector_niche) return { ok: false, error: "Informe o setor / nicho da empresa." };
  if (!(UFS as readonly string[]).includes(state_uf) || !city) return { ok: false, error: "Informe UF e cidade." };
  if (phone.length < 10 || phone.length > 13) return { ok: false, error: "Informe o WhatsApp da empresa com DDD." };
  if (cnpj && cnpj.length !== 14) return { ok: false, error: "CNPJ deve ter 14 dígitos." };
  if (logo && !isHttpUrl(logo)) return { ok: false, error: "Logo inválido." };
  if (website && !isHttpUrl(website)) return { ok: false, error: "Site inválido (comece com https://)." };

  const payload = {
    company_name,
    trade_name: str(fd, "trade_name") || null,
    cnpj: cnpj || null,
    logo_url: logo || null,
    website_url: website || null,
    instagram_handle: str(fd, "instagram_handle").replace(/^@/, "") || null,
    sector_niche,
    description: str(fd, "description") || null,
    state_uf,
    city,
    amazon_territory_pole: str(fd, "amazon_territory_pole") || null,
  };

  if (s.company) {
    const { error } = await s.supabase.from("company_profiles").update(payload).eq("id", s.company.id);
    if (error) return { ok: false, error: "Não foi possível salvar o perfil." };
  } else {
    // slug único: tenta o nome limpo e, se já existir, acrescenta um sufixo
    const base = slugify(company_name);
    let error = null;
    for (const slug of [base, `${base}-${Math.random().toString(36).slice(2, 6)}`]) {
      ({ error } = await s.supabase.from("company_profiles").insert({ ...payload, user_id: s.user.id, slug }));
      if (!error || error.code !== "23505") break;
    }
    if (error) return { ok: false, error: "Não foi possível criar o perfil da empresa." };
  }

  // WhatsApp fica em users (o mesmo número da conta, se ela também for de creator).
  // Só sai para o profissional pelo RPC get_match_whatsapp, depois do match mútuo.
  const { error: uErr } = await s.supabase
    .from("users").update({ is_company: true, phone_whatsapp: phone }).eq("id", s.user.id);
  if (uErr) return { ok: false, error: "Perfil salvo, mas não foi possível salvar o WhatsApp." };

  revalidatePath("/empresa", "layout");
  return { ok: true, message: "Perfil da empresa salvo!" };
}

/* ───────────────────────── INTERESSE (match) ───────────────────────── */

function matchError(message: string | undefined, code: string | undefined) {
  if (message?.includes("MATCH_LIMIT_REACHED"))
    return "Você atingiu o limite mensal de interesses do seu plano. Faça upgrade para o Premium.";
  if (code === "23505") return "Você já demonstrou interesse neste profissional.";
  if (message?.includes("INVALID_PACKAGE")) return "Pacote inválido.";
  return "Não foi possível enviar o interesse.";
}

export async function expressInterest(input: {
  professionalId: string;
  packageId?: string;
  filters?: Record<string, string>;
}): Promise<FormState> {
  const s = await session();
  if (!s) return { ok: false, error: "Sessão expirada. Entre novamente." };
  if (!s.company) return { ok: false, error: "Complete o perfil da empresa primeiro." };
  if (!UUID_RE.test(input.professionalId) || (input.packageId && !UUID_RE.test(input.packageId)))
    return { ok: false, error: "Dados inválidos." };

  // só profissionais públicos (a view já filtra)
  const { data: visible } = await s.supabase
    .from("public_professional_profiles").select("id").eq("id", input.professionalId).maybeSingle();
  if (!visible) return { ok: false, error: "Profissional indisponível." };

  const { error } = await s.supabase.from("matches").insert({
    company_id: s.company.id,
    professional_id: input.professionalId,
    service_package_id: input.packageId ?? null,
    initiated_by: "COMPANY", // o banco reforça isso e os demais campos de estado
    search_context_json: input.filters ?? {},
  });
  if (error) return { ok: false, error: matchError(error.message, error.code) };

  revalidatePath("/empresa", "layout");
  return {
    ok: true,
    message: input.packageId ? "Pedido de contratação enviado!" : "Interesse enviado! Avisaremos quando o profissional responder.",
  };
}

/* ───────────────────────── FAVORITOS ───────────────────────── */

export async function toggleFavorite(professionalId: string, folder = "Geral"): Promise<FormState & { favorited?: boolean }> {
  const s = await session();
  if (!s?.company) return { ok: false, error: "Complete o perfil da empresa primeiro." };
  if (!UUID_RE.test(professionalId)) return { ok: false, error: "Dados inválidos." };

  const { data: existing } = await s.supabase
    .from("company_favorites").select("id").eq("company_id", s.company.id).eq("professional_id", professionalId);
  if (existing && existing.length > 0) {
    const { error } = await s.supabase.from("company_favorites").delete()
      .eq("company_id", s.company.id).eq("professional_id", professionalId);
    if (error) return { ok: false, error: "Não foi possível remover." };
    revalidatePath("/empresa/favoritos");
    return { ok: true, favorited: false };
  }
  const { error } = await s.supabase.from("company_favorites")
    .insert({ company_id: s.company.id, professional_id: professionalId, folder_name: folder });
  if (error) return { ok: false, error: "Não foi possível favoritar." };
  revalidatePath("/empresa/favoritos");
  return { ok: true, favorited: true };
}

export async function moveFavorite(id: string, folder: string): Promise<FormState> {
  const s = await session();
  if (!s?.company) return { ok: false, error: "Sessão expirada." };
  const name = folder.trim().slice(0, 40);
  if (!name) return { ok: false, error: "Dê um nome à pasta." };
  const { error } = await s.supabase.from("company_favorites").update({ folder_name: name })
    .eq("id", id).eq("company_id", s.company.id);
  if (error) return { ok: false, error: error.code === "23505" ? "Já está nessa pasta." : "Não foi possível mover." };
  revalidatePath("/empresa/favoritos");
  return { ok: true };
}

export async function removeFavorite(id: string): Promise<FormState> {
  const s = await session();
  if (!s?.company) return { ok: false, error: "Sessão expirada." };
  const { error } = await s.supabase.from("company_favorites").delete().eq("id", id).eq("company_id", s.company.id);
  if (error) return { ok: false, error: "Não foi possível remover." };
  revalidatePath("/empresa/favoritos");
  return { ok: true };
}

/* ───────────────────────── CAMPANHAS / OPORTUNIDADES ───────────────────────── */

function campaignError(message: string | undefined) {
  if (message?.includes("CAMPAIGN_LIMIT_REACHED"))
    return "Você já tem o máximo de campanhas abertas do seu plano. Encerre uma ou faça upgrade para o Premium.";
  if (message?.includes("campaigns_slots_valid")) return "Vagas preenchidas não podem passar do total de vagas.";
  return "Não foi possível salvar a oportunidade.";
}

export async function saveCampaign(_prev: FormState, fd: FormData): Promise<FormState> {
  const s = await session();
  if (!s) return { ok: false, error: "Sessão expirada. Entre novamente." };
  if (!s.company) return { ok: false, error: "Complete o perfil da empresa primeiro." };

  const id = str(fd, "id");
  const intent = str(fd, "intent"); // "publish" | "draft"
  const title = str(fd, "title");
  const category_id = str(fd, "category_id");
  const briefing = str(fd, "briefing_description");
  const deliverables = str(fd, "deliverables_expected");
  const compensation = str(fd, "compensation_type");
  const budget = num(fd, "budget_per_professional");
  const barter = str(fd, "barter_description");
  const slots = Math.floor(num(fd, "slots_total"));
  const deadline = Math.floor(num(fd, "deadline_days"));
  const uf = str(fd, "target_state_uf");

  if (title.length < 4) return { ok: false, error: "Dê um título à oportunidade." };
  if (!UUID_RE.test(category_id)) return { ok: false, error: "Escolha a categoria buscada." };
  if (!briefing) return { ok: false, error: "Escreva o briefing." };
  if (!deliverables) return { ok: false, error: "Descreva os entregáveis esperados." };
  if (!["PAID", "BARTER", "HYBRID"].includes(compensation)) return { ok: false, error: "Escolha o tipo de remuneração." };
  if (Number.isNaN(budget)) return { ok: false, error: "Orçamento inválido." };
  if ((compensation === "PAID" || compensation === "HYBRID") && !(budget > 0))
    return { ok: false, error: "Informe o orçamento por profissional." };
  if ((compensation === "BARTER" || compensation === "HYBRID") && !barter)
    return { ok: false, error: "Descreva o que será oferecido na permuta." };
  if (!(slots >= 1)) return { ok: false, error: "Informe ao menos 1 vaga." };
  if (uf && !(UFS as readonly string[]).includes(uf)) return { ok: false, error: "UF inválida." };

  const payload = {
    category_id,
    title,
    briefing_description: briefing,
    deliverables_expected: deliverables,
    compensation_type: compensation,
    budget_per_professional: budget,
    barter_description: barter || null,
    slots_total: slots,
    work_modality: str(fd, "work_modality") || "REMOTE",
    target_state_uf: uf || null,
    target_city: str(fd, "target_city") || null,
    target_niches: fd.getAll("target_niches").map(String),
    deadline_days: Number.isNaN(deadline) || deadline < 1 ? 7 : deadline,
    status: intent === "publish" ? "OPEN" : "DRAFT",
    updated_at: new Date().toISOString(),
  };

  let res;
  if (id) {
    if (!UUID_RE.test(id)) return { ok: false, error: "Dados inválidos." };
    // não rebaixa uma campanha em andamento/concluída para rascunho
    const { data: cur } = await s.supabase.from("campaigns").select("status").eq("id", id).eq("company_id", s.company.id).maybeSingle();
    if (!cur) return { ok: false, error: "Oportunidade não encontrada." };
    const keepStatus = cur.status !== "DRAFT" && cur.status !== "OPEN";
    res = await s.supabase.from("campaigns")
      .update(keepStatus ? { ...payload, status: cur.status } : payload)
      .eq("id", id).eq("company_id", s.company.id);
  } else {
    res = await s.supabase.from("campaigns").insert({ ...payload, company_id: s.company.id });
  }
  if (res.error) return { ok: false, error: campaignError(res.error.message) };

  revalidatePath("/empresa/oportunidades");
  redirect("/empresa/oportunidades");
}

export async function setCampaignStatus(id: string, status: "DRAFT" | "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"): Promise<FormState> {
  const s = await session();
  if (!s?.company) return { ok: false, error: "Sessão expirada." };
  if (!UUID_RE.test(id)) return { ok: false, error: "Dados inválidos." };
  const { error } = await s.supabase.from("campaigns").update({ status }).eq("id", id).eq("company_id", s.company.id);
  if (error) return { ok: false, error: campaignError(error.message) };
  revalidatePath("/empresa/oportunidades", "layout");
  return { ok: true };
}

export async function deleteCampaign(id: string): Promise<FormState> {
  const s = await session();
  if (!s?.company) return { ok: false, error: "Sessão expirada." };
  if (!UUID_RE.test(id)) return { ok: false, error: "Dados inválidos." };
  // só apaga rascunhos; campanhas publicadas são canceladas para preservar o histórico
  const { error } = await s.supabase.from("campaigns").delete().eq("id", id).eq("company_id", s.company.id).eq("status", "DRAFT");
  if (error) return { ok: false, error: "Não foi possível excluir." };
  revalidatePath("/empresa/oportunidades", "layout");
  return { ok: true };
}
