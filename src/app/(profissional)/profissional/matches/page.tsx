import { requireProfessional } from "@/lib/professional";
import { loadMatches } from "@/lib/deals";
import { MatchList, MatchTabs, splitMatches, type TabKey } from "@/components/match/match-list";

type SP = Record<string, string | string[] | undefined>;

export default async function MatchesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireProfessional();
  const { data: me } = await supabase.from("users").select("full_name").eq("id", user.id).single();

  const all = await loadMatches(supabase, "PROFESSIONAL", { id: profile.id, displayName: me?.full_name ?? "" });
  const groups = splitMatches(all);
  const raw = Array.isArray(sp.aba) ? sp.aba[0] : sp.aba;
  const tab: TabKey = raw === "confirmados" || raw === "encerrados" ? raw : "pendentes";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Meus matches</h1>
      <MatchTabs
        base="/profissional/matches"
        active={tab}
        counts={{ pendentes: groups.pendentes.length, confirmados: groups.confirmados.length, encerrados: groups.encerrados.length }}
      />
      <MatchList matches={groups[tab]} role="PROFESSIONAL" proposalsHref="/profissional/propostas" />
    </div>
  );
}
