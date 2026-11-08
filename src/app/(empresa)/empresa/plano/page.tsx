import { requireCompany } from "@/lib/company";
import { getCurrentPlan, startOfMonthISO } from "@/lib/plans";
import { PlanView } from "@/components/plans/plan-view";

export default async function PlanoPage() {
  const { supabase, user, company } = await requireCompany();
  const [{ plans, current, renewsAt }, { count: open }, { count: interests }] = await Promise.all([
    getCurrentPlan(supabase, user.id, "COMPANY"),
    supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("company_id", company.id).eq("status", "OPEN"),
    supabase.from("matches").select("id", { count: "exact", head: true })
      .eq("company_id", company.id).eq("initiated_by", "COMPANY").gte("created_at", startOfMonthISO()),
  ]);
  return (
    <PlanView
      plans={plans}
      current={current}
      renewsAt={renewsAt}
      usage={[
        { label: "Campanhas abertas agora", used: open ?? 0, limit: current.active_campaigns_limit },
        { label: "Interesses enviados neste mês", used: interests ?? 0, limit: current.monthly_matches_limit, hint: "Renovam no dia 1º de cada mês." },
      ]}
    />
  );
}
