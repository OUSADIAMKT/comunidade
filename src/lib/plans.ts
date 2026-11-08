import type { SupabaseClient } from "@supabase/supabase-js";
import { startOfMonthISO } from "@/lib/company";

export type PlanRow = {
  id: string; slug: string; name: string; target_role: "PROFESSIONAL" | "COMPANY"; price_monthly: number;
  monthly_applications_limit: number; active_campaigns_limit: number; max_packages_limit: number;
  monthly_matches_limit: number; featured_profile: boolean;
};

const COLS = "id,slug,name,target_role,price_monthly,monthly_applications_limit,active_campaigns_limit,max_packages_limit,monthly_matches_limit,featured_profile";

/** Planos ativos do tipo de conta, do mais barato ao mais caro. */
export async function listPlans(supabase: SupabaseClient, role: PlanRow["target_role"]): Promise<PlanRow[]> {
  const { data } = await supabase
    .from("subscription_plans").select(COLS).eq("target_role", role).eq("is_active", true).order("price_monthly");
  return (data ?? []) as PlanRow[];
}

/** Plano vigente (assinatura ativa de maior valor) ou o gratuito. */
export async function getCurrentPlan(supabase: SupabaseClient, userId: string, role: PlanRow["target_role"]) {
  const plans = await listPlans(supabase, role);
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("plan_id,current_period_end,status")
    .eq("user_id", userId)
    .in("status", ["ACTIVE", "TRIAL"])
    .gt("current_period_end", new Date().toISOString());
  const active = (subs ?? [])
    .map((s) => ({ plan: plans.find((p) => p.id === s.plan_id), end: s.current_period_end as string }))
    .filter((x): x is { plan: PlanRow; end: string } => !!x.plan)
    .sort((a, b) => Number(b.plan.price_monthly) - Number(a.plan.price_monthly))[0];
  const current = active?.plan ?? plans[0];
  return { plans, current, renewsAt: active?.end ?? null };
}

export { startOfMonthISO };

export function fmtLimit(n: number) {
  return n >= 999 ? "Ilimitados" : String(n);
}
