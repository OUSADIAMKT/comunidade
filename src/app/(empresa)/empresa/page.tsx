import Link from "next/link";
import { getCompanyPlan, requireCompany, startOfMonthISO } from "@/lib/company";
import { SearchForm } from "@/components/match/search-form";
import { NotificationsPanel } from "@/components/shared/notifications-panel";
import { MissingWhatsappBanner } from "@/components/shared/missing-whatsapp-banner";
import { PageHeader, StatCard } from "@/components/brand/section-heading";

export default async function Page() {
  const { supabase, user, company } = await requireCompany();
  const plan = await getCompanyPlan(supabase, user.id);

  const [{ data: categories }, { count: open }, { count: interests }, { count: favs }] = await Promise.all([
    supabase.from("categories").select("id,name").eq("is_active", true).order("display_order"),
    supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("company_id", company.id).eq("status", "OPEN"),
    supabase.from("matches").select("id", { count: "exact", head: true })
      .eq("company_id", company.id).eq("initiated_by", "COMPANY").gte("created_at", startOfMonthISO()),
    supabase.from("company_favorites").select("id", { count: "exact", head: true }).eq("company_id", company.id),
  ]);
  const lim = (n: number) => (n >= 999 ? "∞" : n);

  return (
    <div className="space-y-6">
      <PageHeader
        title={<>Olá, <span className="text-amarelo">{company.trade_name || company.company_name}</span></>}
        description="Encontre talentos e publique oportunidades."
        actions={
          <Link href="/empresa/oportunidades/nova" className="btn-cta btn-cta-primary !min-h-0 !px-4 !py-2.5 !text-xs">
            + Publicar oportunidade
          </Link>
        }
      />

      <MissingWhatsappBanner supabase={supabase} userId={user.id} />
      <NotificationsPanel supabase={supabase} userId={user.id} />
      <SearchForm categories={categories ?? []} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Campanhas abertas" value={open ?? 0} suffix={`/ ${lim(plan.active_campaigns_limit)}`} />
        <StatCard label="Interesses este mês" value={interests ?? 0} suffix={`/ ${lim(plan.monthly_matches_limit)}`} />
        <StatCard label="Favoritos" value={favs ?? 0} />
      </div>
      <p className="text-xs text-muted-foreground">Plano: {plan.name}</p>
    </div>
  );
}
