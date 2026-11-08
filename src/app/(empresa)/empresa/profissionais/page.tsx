import { EmptyState } from "@/components/shared/empty-state";
import { requireCompany } from "@/lib/company";
import { rankCandidates, type Candidate, type SearchFilters, type WorkModality } from "@/lib/matching-engine";
import { SearchForm, type RawFilters } from "@/components/match/search-form";
import { ProfessionalCard } from "@/components/match/professional-card";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODS = ["REMOTE", "ONSITE", "HYBRID"];

export default async function ProfissionaisPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, company } = await requireCompany();

  const raw: RawFilters = {
    category: first(sp.category), uf: first(sp.uf), city: first(sp.city), pole: first(sp.pole),
    niche: first(sp.niche), budget: first(sp.budget), modality: first(sp.modality),
  };
  const { data: categories } = await supabase
    .from("categories").select("id,name").eq("is_active", true).order("display_order");

  const valid = !!raw.category && UUID_RE.test(raw.category);
  const filters: SearchFilters | null = valid
    ? {
        categoryId: raw.category!,
        uf: raw.uf || undefined,
        city: raw.city?.trim() || undefined,
        pole: raw.pole || undefined,
        niche: raw.niche || undefined,
        budget: Number(raw.budget) > 0 ? Number(raw.budget) : undefined,
        modality: MODS.includes(raw.modality ?? "") ? (raw.modality as WorkModality) : undefined,
      }
    : null;

  let results: ReturnType<typeof rankCandidates<Candidate & { row: any }>> = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  const favSet = new Set<string>();
  const sentSet = new Set<string>();

  if (filters) {
    const { data: rows } = await supabase
      .from("public_professional_profiles")
      .select("*")
      .contains("category_ids", [filters.categoryId])
      .eq("is_available", true)
      .limit(300);
    const list = rows ?? [];
    const ids = list.map((r) => r.id);

    if (ids.length) {
      const [{ data: pkgs }, { data: favs }, { data: sent }] = await Promise.all([
        supabase.from("service_packages").select("professional_id,price")
          .eq("is_active", true).eq("category_id", filters.categoryId).in("professional_id", ids),
        supabase.from("company_favorites").select("professional_id").eq("company_id", company.id).in("professional_id", ids),
        supabase.from("matches").select("professional_id").eq("company_id", company.id)
          .is("campaign_id", null).is("service_package_id", null).in("status", ["PENDING", "MUTUAL_MATCH"]).in("professional_id", ids),
      ]);
      favs?.forEach((f) => favSet.add(f.professional_id));
      sent?.forEach((m) => sentSet.add(m.professional_id));
      const pricesBy = new Map<string, number[]>();
      pkgs?.forEach((p) => pricesBy.set(p.professional_id, [...(pricesBy.get(p.professional_id) ?? []), Number(p.price)]));

      const candidates = list.map((r) => ({
        id: r.id,
        categoryIds: r.category_ids ?? [],
        primaryCategoryId: r.primary_category_id,
        niches: r.niches ?? [],
        startingPrice: Number(r.starting_price ?? 0),
        stateUf: r.state_uf,
        city: r.city,
        pole: r.amazon_territory_pole,
        workModality: r.work_modality as WorkModality,
        isPro: !!r.is_pro,
        ratingAvg: Number(r.rating_avg ?? 0),
        packagePrices: pricesBy.get(r.id) ?? [],
        row: r,
      }));
      results = rankCandidates(candidates, filters).slice(0, 60);
    }
  }

  const ctx: Record<string, string> = Object.fromEntries(Object.entries(raw).filter(([, v]) => v));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Encontrar profissionais</h1>
      <SearchForm categories={categories ?? []} values={raw} />

      {!filters ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Escolha uma categoria para ver os talentos mais compatíveis.
        </p>
      ) : results.length === 0 ? (
        <EmptyState
          title="Nenhum profissional com esses filtros"
          text="Tente ampliar o orçamento ou remover a cidade. Se precisar de alguém agora, publique uma oportunidade: os creators vêm até você."
          cta={{ href: "/empresa/oportunidades/nova", label: "Publicar oportunidade" }}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">{results.length} talento(s), ordenados por compatibilidade.</p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
              <ProfessionalCard
                key={r.candidate.id}
                p={r.candidate.row}
                score={r.score}
                reasons={r.reasons}
                price={r.effectivePrice}
                favorited={favSet.has(r.candidate.id)}
                interestSent={sentSet.has(r.candidate.id)}
                filters={ctx}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
