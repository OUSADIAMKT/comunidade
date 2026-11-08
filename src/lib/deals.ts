import type { SupabaseClient } from "@supabase/supabase-js";
import { formatBRL } from "@/lib/constants";
import {
  messageToCompany, messageToProfessional, whatsappLink,
} from "@/lib/whatsapp";

export type Role = "PROFESSIONAL" | "COMPANY";

export type EnrichedMatch = {
  id: string;
  status: "PENDING" | "MUTUAL_MATCH" | "DECLINED" | "EXPIRED";
  initiatedBy: "COMPANY" | "PROFESSIONAL";
  waitingForMe: boolean;
  createdAt: string;
  subject: string | null;
  packagePrice: number | null;
  campaignBudget: number | null;
  initialMessage: string | null;
  contextChips: string[];
  other: { name: string; avatar: string | null; subtitle: string; href: string | null };
  whatsapp: string | null;
  hasActiveContract: boolean;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const CONTEXT_LABELS: Record<string, (v: string) => string> = {
  budget: (v) => `Orçamento até ${formatBRL(Number(v))}`,
  niche: (v) => `Nicho: ${v}`,
  uf: (v) => `UF: ${v}`,
  city: (v) => `Cidade: ${v}`,
  pole: (v) => `Polo: ${v}`,
  modality: (v) => `Modalidade: ${({ REMOTE: "Remoto", ONSITE: "Presencial", HYBRID: "Híbrido" } as any)[v] ?? v}`,
};

function chipsFrom(ctx: Record<string, string> | null): string[] {
  if (!ctx) return [];
  return Object.entries(ctx).filter(([k, v]) => v && CONTEXT_LABELS[k]).map(([k, v]) => CONTEXT_LABELS[k](String(v)));
}

/** Carrega os matches do usuário já enriquecidos (contraparte, contexto e link seguro do WhatsApp). */
export async function loadMatches(
  supabase: SupabaseClient,
  role: Role,
  me: { id: string; displayName: string },
): Promise<EnrichedMatch[]> {
  const col = role === "PROFESSIONAL" ? "professional_id" : "company_id";
  const { data: rows } = await supabase
    .from("matches")
    .select(`id,status,initiated_by,company_interested,professional_interested,initial_message,search_context_json,
      created_at,company_id,professional_id,
      company_profiles(company_name,trade_name,logo_url,sector_niche,city,state_uf),
      service_packages(title,price),
      campaigns(title,budget_per_professional)`)
    .eq(col, me.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const matches = (rows ?? []) as any[];
  if (!matches.length) return [];

  // contraparte (profissional) via view pública — nunca a tabela base
  const profIds = [...new Set(matches.map((m) => m.professional_id))];
  const profMap = new Map<string, any>();
  if (role === "COMPANY") {
    const { data: profs } = await supabase
      .from("public_professional_profiles")
      .select("id,username,full_name,avatar_url,city,state_uf,category_names")
      .in("id", profIds);
    profs?.forEach((p) => profMap.set(p.id, p));
  }

  const { data: contracts } = await supabase
    .from("contracts").select("match_id").in("match_id", matches.map((m) => m.id)).in("status", ["ACTIVE", "DELIVERED"]);
  const active = new Set((contracts ?? []).map((c) => c.match_id));

  // WhatsApp só pela função segura (retorna NULL fora do MUTUAL_MATCH ou para terceiros)
  const phones = await Promise.all(
    matches.map(async (m) => {
      if (m.status !== "MUTUAL_MATCH") return null;
      const { data } = await supabase.rpc("get_match_whatsapp", { p_match_id: m.id });
      return (data as string | null) ?? null;
    }),
  );

  return matches.map((m, i) => {
    const comp = m.company_profiles;
    const prof = profMap.get(m.professional_id);
    const companyName = comp?.trade_name || comp?.company_name || "Empresa";
    const profName = prof?.full_name ?? "Profissional";
    const subject = m.service_packages?.title ?? m.campaigns?.title ?? null;

    const other =
      role === "PROFESSIONAL"
        ? { name: companyName, avatar: comp?.logo_url ?? null, subtitle: `${comp?.sector_niche ?? ""} · ${comp?.city ?? ""}/${comp?.state_uf ?? ""}`, href: null }
        : { name: profName, avatar: prof?.avatar_url ?? null, subtitle: `${(prof?.category_names ?? []).join(" | ")} · ${prof?.city ?? ""}/${prof?.state_uf ?? ""}`, href: prof ? `/c/${prof.username}` : null };

    const msg =
      role === "COMPANY"
        ? messageToProfessional({ professionalName: profName, companyName, subject })
        : messageToCompany({ professionalName: me.displayName, companyName, subject });

    const myInterested = role === "PROFESSIONAL" ? m.professional_interested : m.company_interested;
    return {
      id: m.id,
      status: m.status,
      initiatedBy: m.initiated_by,
      waitingForMe: m.status === "PENDING" && !myInterested,
      createdAt: m.created_at,
      subject,
      packagePrice: m.service_packages?.price != null ? Number(m.service_packages.price) : null,
      campaignBudget: m.campaigns?.budget_per_professional != null ? Number(m.campaigns.budget_per_professional) : null,
      initialMessage: m.initial_message,
      contextChips: chipsFrom(m.search_context_json),
      other,
      whatsapp: whatsappLink(phones[i], msg),
      hasActiveContract: active.has(m.id),
    } satisfies EnrichedMatch;
  });
}

export type ProposalRow = {
  id: string; matchId: string; senderIsMe: boolean; scope: string; amount: number; days: number;
  status: "SENT" | "ACCEPTED" | "DECLINED" | "COUNTER_OFFER"; createdAt: string; otherName: string; subject: string | null;
};
export type ContractRow = {
  id: string; matchId: string; title: string; amount: number; status: "ACTIVE" | "DELIVERED" | "COMPLETED" | "DISPUTED" | "CANCELLED";
  deliveryLink: string | null; deliveryNotes: string | null; rating: number | null; review: string | null;
  createdAt: string; completedAt: string | null; otherName: string;
};

export async function loadDeals(
  supabase: SupabaseClient,
  role: Role,
  me: { id: string; userId: string; displayName: string },
) {
  const matches = await loadMatches(supabase, role, me);
  const confirmed = matches.filter((m) => m.status === "MUTUAL_MATCH");
  const byId = new Map(matches.map((m) => [m.id, m]));
  const ids = confirmed.map((m) => m.id);

  const col = role === "PROFESSIONAL" ? "professional_id" : "company_id";
  const [{ data: props }, { data: conts }] = await Promise.all([
    ids.length
      ? supabase.from("proposals").select("id,match_id,sender_user_id,scope_description,proposed_amount,delivery_days,status,created_at")
          .in("match_id", ids).order("created_at", { ascending: false }).limit(60)
      : Promise.resolve({ data: [] as any[] }),
    supabase.from("contracts")
      .select("id,match_id,title,agreed_amount,status,delivery_link,delivery_notes,company_rating,company_review,created_at,completed_at")
      .eq(col, me.id).order("created_at", { ascending: false }).limit(60),
  ]);

  const proposals: ProposalRow[] = (props ?? []).map((p: any) => ({
    id: p.id, matchId: p.match_id, senderIsMe: p.sender_user_id === me.userId, scope: p.scope_description,
    amount: Number(p.proposed_amount), days: p.delivery_days, status: p.status, createdAt: p.created_at,
    otherName: byId.get(p.match_id)?.other.name ?? "", subject: byId.get(p.match_id)?.subject ?? null,
  }));
  const contracts: ContractRow[] = (conts ?? []).map((c: any) => ({
    id: c.id, matchId: c.match_id, title: c.title, amount: Number(c.agreed_amount), status: c.status,
    deliveryLink: c.delivery_link, deliveryNotes: c.delivery_notes, rating: c.company_rating, review: c.company_review,
    createdAt: c.created_at, completedAt: c.completed_at, otherName: byId.get(c.match_id)?.other.name ?? "",
  }));

  return { confirmed: confirmed.filter((m) => !m.hasActiveContract), proposals, contracts };
}
