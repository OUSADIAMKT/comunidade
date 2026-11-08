import { requireProfessional } from "@/lib/professional";
import { getCurrentPlan, startOfMonthISO } from "@/lib/plans";
import { PlanView } from "@/components/plans/plan-view";

export default async function PlanoPage() {
  const { supabase, user, profile } = await requireProfessional();
  const [{ plans, current, renewsAt }, { count: apps }, { count: pkgs }] = await Promise.all([
    getCurrentPlan(supabase, user.id, "PROFESSIONAL"),
    supabase.from("applications").select("id", { count: "exact", head: true })
      .eq("professional_id", profile.id).gte("created_at", startOfMonthISO()),
    supabase.from("service_packages").select("id", { count: "exact", head: true })
      .eq("professional_id", profile.id).eq("is_active", true),
  ]);
  return (
    <PlanView
      plans={plans}
      current={current}
      renewsAt={renewsAt}
      usage={[
        { label: "Candidaturas neste mês", used: apps ?? 0, limit: current.monthly_applications_limit, hint: "Renovam no dia 1º de cada mês." },
        { label: "Pacotes de serviço ativos", used: pkgs ?? 0, limit: current.max_packages_limit },
      ]}
    />
  );
}
