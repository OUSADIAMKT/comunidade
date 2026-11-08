import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function getSessionCompany() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: company } = await supabase
    .from("company_profiles").select("*").eq("user_id", user.id).maybeSingle();
  return { supabase, user, company };
}

/** Sem perfil de empresa -> manda completar o cadastro. */
export async function requireCompany() {
  const ctx = await getSessionCompany();
  if (!ctx.company) redirect("/empresa/perfil");
  return { ...ctx, company: ctx.company };
}

type CompanyPlan = {
  slug: string; name: string; price_monthly: number;
  active_campaigns_limit: number; monthly_matches_limit: number;
};

export async function getCompanyPlan(supabase: SupabaseClient, userId: string): Promise<CompanyPlan> {
  const cols = "slug,name,target_role,price_monthly,active_campaigns_limit,monthly_matches_limit";
  const { data: subs } = await supabase
    .from("subscriptions")
    .select(`status,subscription_plans(${cols})`)
    .eq("user_id", userId)
    .in("status", ["ACTIVE", "TRIAL"])
    .gt("current_period_end", new Date().toISOString());

  const plans = (subs ?? [])
    .map((s) => s.subscription_plans as unknown as (CompanyPlan & { target_role: string }) | null)
    .filter((p): p is CompanyPlan & { target_role: string } => !!p && p.target_role === "COMPANY")
    .sort((a, b) => Number(b.price_monthly) - Number(a.price_monthly));
  if (plans[0]) return plans[0];

  const { data: free } = await supabase.from("subscription_plans").select(cols).eq("slug", "company-free").single();
  return (free ?? {
    slug: "company-free", name: "Empresa Gratuita", price_monthly: 0,
    active_campaigns_limit: 1, monthly_matches_limit: 5,
  }) as CompanyPlan;
}

export const COMPENSATION_LABEL = {
  PAID: "Cachê pago", BARTER: "Permuta", HYBRID: "Híbrido", COMMISSION: "Comissão",
} as const;

export const CAMPAIGN_STATUS_LABEL = {
  DRAFT: "Rascunho", OPEN: "Aberta", IN_PROGRESS: "Em andamento", COMPLETED: "Concluída", CANCELLED: "Cancelada",
} as const;

export function startOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}
