"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";
import { isHttpUrl } from "@/lib/constants";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Traduz os erros levantados pelos triggers do banco em mensagens para o usuário. */
function friendly(error: { message?: string; code?: string } | null, fallback: string): string {
  const m = error?.message ?? "";
  const map: [string, string][] = [
    ["PROFILE_INCOMPLETE", "Complete seu perfil (mínimo de 80%) para se candidatar."],
    ["APPLICATION_LIMIT_REACHED", "Você usou todas as candidaturas do mês. Elas renovam no dia 1º do próximo mês."],
    ["CAMPAIGN_CLOSED", "Esta oportunidade não está mais aberta."],
    ["CAMPAIGN_FULL", "Todas as vagas desta oportunidade já foram preenchidas."],
    ["SELF_APPLICATION", "Você não pode se candidatar à oportunidade da sua própria empresa."],
    ["MATCH_NOT_CONFIRMED", "Só é possível enviar proposta depois do match confirmado."],
    ["CONTRACT_EXISTS", "Já existe um contrato em andamento com este parceiro."],
    ["INVALID_PROPOSAL", "Valor e prazo da proposta precisam ser maiores que zero."],
    ["DELIVERY_REQUIRED", "Informe o link da entrega."],
    ["NOT_DELIVERED", "O contrato só pode ser concluído depois da entrega."],
    ["RATING_REQUIRED", "Avalie o profissional de 1 a 5 estrelas para concluir."],
    ["uq_contracts_active", "Já existe um contrato em andamento com este parceiro."],
    ["applications_campaign_id_professional_id_key", "Você já se candidatou a esta oportunidade."],
    ["FORBIDDEN", "Você não tem permissão para esta ação."],
  ];
  for (const [key, text] of map) if (m.includes(key)) return text;
  if (error?.code === "23505") return "Esta ação já foi registrada.";
  return fallback;
}

async function session() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

function refresh() {
  revalidatePath("/profissional", "layout");
  revalidatePath("/empresa", "layout");
}

const need = (...ids: string[]) => ids.every((i) => UUID_RE.test(i));
const LOGIN: FormState = { ok: false, error: "Sessão expirada. Entre novamente." };

/* ───────────── Candidaturas ───────────── */

export async function applyToCampaign(input: { campaignId: string; pitch?: string; value?: number | null }): Promise<FormState> {
  const s = await session();
  if (!s) return LOGIN;
  if (!need(input.campaignId)) return { ok: false, error: "Dados inválidos." };
  const value = input.value ?? null;
  if (value !== null && !(value >= 0)) return { ok: false, error: "Valor proposto inválido." };

  const { data: prof } = await s.supabase.from("professional_profiles").select("id").eq("user_id", s.user.id).maybeSingle();
  if (!prof) return { ok: false, error: "Crie seu perfil profissional primeiro." };

  const { error } = await s.supabase.from("applications").insert({
    campaign_id: input.campaignId,
    professional_id: prof.id,
    pitch_message: input.pitch?.trim().slice(0, 1000) || null,
    proposed_value: value && value > 0 ? value : null,
  });
  if (error) return { ok: false, error: friendly(error, "Não foi possível enviar a candidatura.") };
  refresh();
  return { ok: true, message: "Candidatura enviada!" };
}

export async function setApplicationStatus(
  applicationId: string,
  status: "SHORTLISTED" | "APPROVED" | "REJECTED",
): Promise<FormState> {
  const s = await session();
  if (!s) return LOGIN;
  if (!need(applicationId) || !["SHORTLISTED", "APPROVED", "REJECTED"].includes(status))
    return { ok: false, error: "Dados inválidos." };
  const { data, error } = await s.supabase
    .from("applications").update({ status }).eq("id", applicationId).select("id,status");
  if (error) return { ok: false, error: friendly(error, "Não foi possível atualizar a candidatura.") };
  if (!data?.length) return { ok: false, error: "Candidatura não encontrada." };
  refresh();
  return { ok: true };
}

/* ───────────── Matches ───────────── */

/** Aceita ou recusa um interesse pendente. O banco calcula MUTUAL_MATCH / DECLINED. */
export async function respondMatch(matchId: string, accept: boolean): Promise<FormState> {
  const s = await session();
  if (!s) return LOGIN;
  if (!need(matchId)) return { ok: false, error: "Dados inválidos." };

  const { data: m } = await s.supabase
    .from("matches").select("id,company_id,professional_id,status").eq("id", matchId).maybeSingle();
  if (!m || m.status !== "PENDING") return { ok: false, error: "Este interesse não está mais pendente." };

  const [{ data: prof }, { data: comp }] = await Promise.all([
    s.supabase.from("professional_profiles").select("id").eq("user_id", s.user.id).maybeSingle(),
    s.supabase.from("company_profiles").select("id").eq("user_id", s.user.id).maybeSingle(),
  ]);
  const patch = !accept
    ? { status: "DECLINED" }
    : prof?.id === m.professional_id ? { professional_interested: true }
    : comp?.id === m.company_id ? { company_interested: true }
    : null;
  if (!patch) return { ok: false, error: "Você não faz parte deste match." };

  const { error } = await s.supabase.from("matches").update(patch).eq("id", matchId);
  if (error) return { ok: false, error: friendly(error, "Não foi possível responder.") };
  refresh();
  return { ok: true, message: accept ? "Match confirmado! WhatsApp liberado." : "Interesse recusado." };
}

/* ───────────── Propostas ───────────── */

function validProposal(scope: string, amount: number, days: number): string | null {
  if (scope.trim().length < 5) return "Descreva o escopo do serviço.";
  if (!(amount > 0)) return "Informe um valor maior que zero.";
  if (!(Number.isInteger(days) && days >= 1)) return "O prazo mínimo é 1 dia.";
  return null;
}

export async function sendProposal(input: { matchId: string; scope: string; amount: number; days: number }): Promise<FormState> {
  const s = await session();
  if (!s) return LOGIN;
  if (!need(input.matchId)) return { ok: false, error: "Dados inválidos." };
  const bad = validProposal(input.scope, input.amount, input.days);
  if (bad) return { ok: false, error: bad };

  const { error } = await s.supabase.from("proposals").insert({
    match_id: input.matchId,
    sender_user_id: s.user.id, // o banco reforça
    scope_description: input.scope.trim(),
    proposed_amount: input.amount,
    delivery_days: input.days,
  });
  if (error) return { ok: false, error: friendly(error, "Não foi possível enviar a proposta.") };
  refresh();
  return { ok: true, message: "Proposta enviada!" };
}

export async function respondProposal(proposalId: string, status: "ACCEPTED" | "DECLINED"): Promise<FormState> {
  const s = await session();
  if (!s) return LOGIN;
  if (!need(proposalId)) return { ok: false, error: "Dados inválidos." };
  const { data, error } = await s.supabase.from("proposals").update({ status }).eq("id", proposalId).eq("status", "SENT").select("id");
  if (error) return { ok: false, error: friendly(error, "Não foi possível responder à proposta.") };
  if (!data?.length) return { ok: false, error: "Proposta não está mais pendente." };
  refresh();
  return { ok: true, message: status === "ACCEPTED" ? "Proposta aceita — contrato criado!" : "Proposta recusada." };
}

export async function counterProposal(input: {
  proposalId: string; scope: string; amount: number; days: number;
}): Promise<FormState> {
  const s = await session();
  if (!s) return LOGIN;
  if (!need(input.proposalId)) return { ok: false, error: "Dados inválidos." };
  const bad = validProposal(input.scope, input.amount, input.days);
  if (bad) return { ok: false, error: bad };

  const { data: old } = await s.supabase.from("proposals").select("id,match_id,status").eq("id", input.proposalId).maybeSingle();
  if (!old || old.status !== "SENT") return { ok: false, error: "Proposta não está mais pendente." };

  // 1) cria a nova (validações do banco rodam aqui) e 2) marca a antiga como COUNTER_OFFER
  const { error } = await s.supabase.from("proposals").insert({
    match_id: old.match_id,
    sender_user_id: s.user.id,
    scope_description: input.scope.trim(),
    proposed_amount: input.amount,
    delivery_days: input.days,
  });
  if (error) return { ok: false, error: friendly(error, "Não foi possível enviar a contraproposta.") };
  const { error: upErr } = await s.supabase.from("proposals").update({ status: "COUNTER_OFFER" }).eq("id", old.id);
  if (upErr) return { ok: false, error: friendly(upErr, "Contraproposta enviada, mas a proposta original não foi atualizada.") };
  refresh();
  return { ok: true, message: "Contraproposta enviada." };
}

/* ───────────── Contratos ───────────── */

export async function deliverContract(input: { contractId: string; link: string; notes?: string }): Promise<FormState> {
  const s = await session();
  if (!s) return LOGIN;
  if (!need(input.contractId)) return { ok: false, error: "Dados inválidos." };
  if (!isHttpUrl(input.link.trim())) return { ok: false, error: "Cole um link válido (https://...) com a entrega." };

  const { data, error } = await s.supabase.from("contracts")
    .update({ status: "DELIVERED", delivery_link: input.link.trim(), delivery_notes: input.notes?.trim() || null })
    .eq("id", input.contractId).in("status", ["ACTIVE", "DELIVERED"]).select("id");
  if (error) return { ok: false, error: friendly(error, "Não foi possível registrar a entrega.") };
  if (!data?.length) return { ok: false, error: "Contrato não está mais em andamento." };
  refresh();
  return { ok: true, message: "Entrega enviada para aprovação." };
}

export async function completeContract(input: { contractId: string; rating: number; review?: string }): Promise<FormState> {
  const s = await session();
  if (!s) return LOGIN;
  if (!need(input.contractId)) return { ok: false, error: "Dados inválidos." };
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)
    return { ok: false, error: "Avalie de 1 a 5 estrelas." };

  const { data, error } = await s.supabase.from("contracts")
    .update({ status: "COMPLETED", company_rating: input.rating, company_review: input.review?.trim().slice(0, 1000) || null })
    .eq("id", input.contractId).eq("status", "DELIVERED").select("id");
  if (error) return { ok: false, error: friendly(error, "Não foi possível concluir o contrato.") };
  if (!data?.length) return { ok: false, error: "O contrato precisa estar com a entrega enviada." };
  refresh();
  return { ok: true, message: "Contrato concluído e avaliado. Obrigado!" };
}

export async function reopenContract(contractId: string): Promise<FormState> {
  const s = await session();
  if (!s) return LOGIN;
  if (!need(contractId)) return { ok: false, error: "Dados inválidos." };
  const { data, error } = await s.supabase.from("contracts").update({ status: "ACTIVE" }).eq("id", contractId).eq("status", "DELIVERED").select("id");
  if (error) return { ok: false, error: friendly(error, "Não foi possível solicitar ajustes.") };
  if (!data?.length) return { ok: false, error: "Nada a ajustar neste contrato." };
  refresh();
  return { ok: true, message: "Ajustes solicitados ao profissional." };
}

export async function cancelContract(contractId: string): Promise<FormState> {
  const s = await session();
  if (!s) return LOGIN;
  if (!need(contractId)) return { ok: false, error: "Dados inválidos." };
  const { data, error } = await s.supabase.from("contracts").update({ status: "CANCELLED" }).eq("id", contractId).in("status", ["ACTIVE", "DELIVERED"]).select("id");
  if (error) return { ok: false, error: friendly(error, "Não foi possível cancelar.") };
  if (!data?.length) return { ok: false, error: "Contrato já foi encerrado." };
  refresh();
  return { ok: true };
}

/* ───────────── Notificações ───────────── */

export async function markNotificationsRead(): Promise<FormState> {
  const s = await session();
  if (!s) return LOGIN;
  await s.supabase.from("notifications").update({ is_read: true }).eq("user_id", s.user.id).eq("is_read", false);
  refresh();
  return { ok: true };
}
