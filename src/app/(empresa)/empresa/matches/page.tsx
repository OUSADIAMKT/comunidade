import { requireCompany } from "@/lib/company";
import { loadMatches } from "@/lib/deals";
import { MissingWhatsappBanner } from "@/components/shared/missing-whatsapp-banner";
import { MatchList, MatchTabs, splitMatches, type TabKey } from "@/components/match/match-list";

type SP = Record<string, string | string[] | undefined>;

export default async function MatchesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, user, company } = await requireCompany();

  const all = await loadMatches(supabase, "COMPANY", { id: company.id, displayName: company.trade_name || company.company_name });
  const groups = splitMatches(all);
  const raw = Array.isArray(sp.aba) ? sp.aba[0] : sp.aba;
  const tab: TabKey = raw === "confirmados" || raw === "encerrados" ? raw : "pendentes";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Meus matches</h1>
      <MissingWhatsappBanner supabase={supabase} userId={user.id} />
      <MatchTabs
        base="/empresa/matches"
        active={tab}
        counts={{ pendentes: groups.pendentes.length, confirmados: groups.confirmados.length, encerrados: groups.encerrados.length }}
      />
      <MatchList matches={groups[tab]} role="COMPANY" proposalsHref="/empresa/contratacoes" />
    </div>
  );
}
