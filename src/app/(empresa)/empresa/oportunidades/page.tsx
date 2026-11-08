import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";
import { CAMPAIGN_STATUS_LABEL, COMPENSATION_LABEL, getCompanyPlan, requireCompany } from "@/lib/company";
import { formatBRL } from "@/lib/constants";
import { CampaignActions } from "./campaign-actions";

export default async function OportunidadesPage() {
  const { supabase, user, company } = await requireCompany();
  const [plan, { data: campaigns }] = await Promise.all([
    getCompanyPlan(supabase, user.id),
    supabase.from("campaigns")
      .select("id,title,status,compensation_type,budget_per_professional,slots_total,slots_filled,created_at,categories(name)")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),
  ]);
  const open = (campaigns ?? []).filter((c) => c.status === "OPEN").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Minhas oportunidades</h1>
          <p className="text-sm text-muted-foreground">
            Abertas: {open} de {plan.active_campaigns_limit >= 999 ? "ilimitadas" : plan.active_campaigns_limit} ({plan.name})
          </p>
        </div>
        <Link href="/empresa/oportunidades/nova" className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
          + Nova oportunidade
        </Link>
      </div>

      {(campaigns ?? []).length === 0 ? (
        <EmptyState
          title="Você ainda não publicou nenhuma oportunidade"
          text="Descreva o que precisa, o valor e o prazo. Os creators compatíveis se candidatam com 1 clique."
          cta={{ href: "/empresa/oportunidades/nova", label: "Publicar a primeira oportunidade" }}
        />
      ) : (
        <ul className="space-y-3">
          {campaigns!.map((c) => (
            <li key={c.id} className="space-y-2 rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/empresa/oportunidades/${c.id}`} className="font-semibold underline-offset-2 hover:underline">{c.title}</Link>
                  <p className="text-xs text-muted-foreground">
                    {(c.categories as unknown as { name: string } | null)?.name} · {COMPENSATION_LABEL[c.compensation_type as keyof typeof COMPENSATION_LABEL]}
                    {Number(c.budget_per_professional) > 0 && ` · ${formatBRL(c.budget_per_professional)}/profissional`} · {c.slots_filled}/{c.slots_total} vagas
                  </p>
                </div>
                <span className="rounded-full border px-2 py-0.5 text-xs">{CAMPAIGN_STATUS_LABEL[c.status as keyof typeof CAMPAIGN_STATUS_LABEL]}</span>
              </div>
              <CampaignActions id={c.id} status={c.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
