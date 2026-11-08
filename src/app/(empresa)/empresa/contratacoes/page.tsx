import { requireCompany } from "@/lib/company";
import { loadDeals } from "@/lib/deals";
import { DealsView } from "@/components/deals/deals-view";

type SP = Record<string, string | string[] | undefined>;

export default async function ContratacoesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, user, company } = await requireCompany();
  const deals = await loadDeals(supabase, "COMPANY", {
    id: company.id, userId: user.id, displayName: company.trade_name || company.company_name,
  });
  const match = Array.isArray(sp.match) ? sp.match[0] : sp.match;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Contratações</h1>
        <p className="text-sm text-muted-foreground">Responda propostas, acompanhe entregas, aprove e avalie os profissionais.</p>
      </div>
      <DealsView role="COMPANY" {...deals} openMatchId={match} />
    </div>
  );
}
