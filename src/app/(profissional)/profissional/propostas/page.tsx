import { requireProfessional } from "@/lib/professional";
import { loadDeals } from "@/lib/deals";
import { DealsView } from "@/components/deals/deals-view";

type SP = Record<string, string | string[] | undefined>;

export default async function PropostasPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireProfessional();
  const { data: me } = await supabase.from("users").select("full_name").eq("id", user.id).single();
  const deals = await loadDeals(supabase, "PROFESSIONAL", { id: profile.id, userId: user.id, displayName: me?.full_name ?? "" });
  const match = Array.isArray(sp.match) ? sp.match[0] : sp.match;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Propostas e contratações</h1>
        <p className="text-sm text-muted-foreground">Negocie o escopo, registre o serviço fechado, envie a entrega e receba a avaliação.</p>
      </div>
      <DealsView role="PROFESSIONAL" {...deals} openMatchId={match} />
    </div>
  );
}
