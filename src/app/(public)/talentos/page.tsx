import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/brand/section-heading";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/shared/select";
import { AMAZON_POLES, MIN_SCORE_TO_PUBLISH, NICHES, UFS } from "@/lib/constants";
import { TalentCard } from "@/components/public/talent-card";

export const metadata: Metadata = {
  title: "Talentos",
  description: "Encontre UGC creators, social medias de eventos e ferramenteiros de IA na Amazônia e em todo o Brasil.",
};

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE = 12;

export default async function TalentosPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const category = first(sp.category);
  const uf = first(sp.uf);
  const niche = first(sp.niche);
  const polo = (AMAZON_POLES as readonly string[]).includes(first(sp.polo)) ? first(sp.polo) : "";
  const q = first(sp.q).replace(/[%,()*]/g, " ").trim().slice(0, 60);
  const page = Math.max(1, Math.floor(Number(first(sp.p))) || 1);

  const supabase = await createClient();
  // Vitrine pública só com perfis completos (foto, bio, especialidade, cidade, WhatsApp e portfólio)
  let query = supabase.from("public_professional_profiles").select("*", { count: "exact" })
    .gte("profile_completion_score", MIN_SCORE_TO_PUBLISH)
    .order("is_pro", { ascending: false }).order("rating_avg", { ascending: false }).order("reviews_count", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (UUID_RE.test(category)) query = query.contains("category_ids", [category]);
  if ((UFS as readonly string[]).includes(uf)) query = query.eq("state_uf", uf);
  if ((NICHES as readonly string[]).includes(niche)) query = query.contains("niches", [niche]);
  if (polo) query = query.eq("amazon_territory_pole", polo);
  if (q) query = query.ilike("full_name", `%${q}%`);

  const [{ data, count }, { data: categories }] = await Promise.all([
    query,
    supabase.from("categories").select("id,name").eq("is_active", true).order("display_order"),
  ]);
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (p: number) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (uf) params.set("uf", uf);
    if (niche) params.set("niche", niche);
    if (polo) params.set("polo", polo);
    if (q) params.set("q", q);
    params.set("p", String(p));
    return `/talentos?${params}`;
  };

  return (
    <main className="container-site space-y-8 py-10">
      <SectionHeading as="h1" eyebrow="Quem cria na Amazônia" title="Talentos" lead="Creators com perfil completo: portfólio, especialidades e avaliações de quem já contratou." />

      <form method="get" className="surface grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <Field label="Nome" htmlFor="q"><Input id="q" name="q" defaultValue={q} placeholder="Buscar por nome" /></Field>
        <Field label="Categoria" htmlFor="category">
          <NativeSelect id="category" name="category" defaultValue={category}>
            <option value="">Todas</option>
            {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="UF" htmlFor="uf">
          <NativeSelect id="uf" name="uf" defaultValue={uf}>
            <option value="">Todas</option>
            {UFS.map((u) => <option key={u}>{u}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Nicho" htmlFor="niche">
          <NativeSelect id="niche" name="niche" defaultValue={niche}>
            <option value="">Todos</option>
            {NICHES.map((n) => <option key={n}>{n}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Polo" htmlFor="polo">
          <NativeSelect id="polo" name="polo" defaultValue={polo}>
            <option value="">Todos</option>
            {AMAZON_POLES.map((p) => <option key={p}>{p}</option>)}
          </NativeSelect>
        </Field>
        <div className="flex items-end"><Button type="submit">Filtrar</Button></div>
      </form>

      {(data ?? []).length === 0 ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          {category || uf || niche || polo || q ? (
            <p>Nenhum talento encontrado. Tente remover algum filtro.</p>
          ) : (
            <>
              <p>Os primeiros creators estão completando os perfis. Em breve eles aparecem aqui.</p>
              <p className="text-sm">
                É creator?{" "}
                <Link href="/cadastro" className="font-semibold text-amarelo underline underline-offset-4">Crie seu perfil grátis</Link>
                {" "}e seja um dos primeiros da vitrine.
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">{total} talento(s)</p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data!.map((p) => <TalentCard key={p.id} p={p} />)}
          </ul>
          {pages > 1 && (
            <nav aria-label="Paginação" className="flex items-center justify-center gap-3 text-sm">
              {page > 1 ? <Link href={link(page - 1)} className="underline">← Anterior</Link> : <span className="text-muted-foreground">← Anterior</span>}
              <span>Página {page} de {pages}</span>
              {page < pages ? <Link href={link(page + 1)} className="underline">Próxima →</Link> : <span className="text-muted-foreground">Próxima →</span>}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
