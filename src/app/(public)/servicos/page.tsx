import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/brand/section-heading";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/shared/select";
import { TalentCard } from "@/components/public/talent-card";

export const metadata: Metadata = {
  title: "Serviços",
  description: "Pacotes prontos de vídeo, design, social media, tráfego e mais — com preço e prazo definidos.",
};

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ServicosPublicPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const category = first(sp.category);
  const min = Number(first(sp.min));
  const max = Number(first(sp.max));

  const supabase = await createClient();
  let query = supabase.from("service_packages")
    .select("id,professional_id,title,price,delivery_days,revisions_included")
    .eq("is_active", true).order("price").limit(90);
  if (UUID_RE.test(category)) query = query.eq("category_id", category);
  if (min > 0) query = query.gte("price", min);
  if (max > 0) query = query.lte("price", max);

  const [{ data: pkgs }, { data: categories }] = await Promise.all([
    query,
    supabase.from("categories").select("id,name").eq("is_active", true).order("display_order"),
  ]);
  const ids = [...new Set((pkgs ?? []).map((p) => p.professional_id))];
  const { data: profs } = ids.length
    ? await supabase.from("public_professional_profiles").select("*").in("id", ids)
    : { data: [] };
  const byId = new Map((profs ?? []).map((p) => [p.id, p]));
  const visible = (pkgs ?? []).filter((p) => byId.has(p.professional_id));

  return (
    <main className="container-site space-y-8 py-10">
      <SectionHeading as="h1" eyebrow="Pacotes prontos" title="Serviços" lead="Pacotes fechados: você sabe o que recebe, quanto custa e em quantos dias." />

      <form method="get" className="surface grid gap-3 p-4 sm:grid-cols-4">
        <Field label="Categoria" htmlFor="category">
          <NativeSelect id="category" name="category" defaultValue={category}>
            <option value="">Todas</option>
            {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Preço mínimo (R$)" htmlFor="min"><Input id="min" name="min" type="number" min={0} defaultValue={first(sp.min)} placeholder="150" /></Field>
        <Field label="Preço máximo (R$)" htmlFor="max"><Input id="max" name="max" type="number" min={0} defaultValue={first(sp.max)} placeholder="500" /></Field>
        <div className="flex items-end"><Button type="submit">Filtrar</Button></div>
      </form>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">Nenhum pacote encontrado com esses filtros.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((pk) => (
            <TalentCard
              key={pk.id}
              p={byId.get(pk.professional_id)}
              price={Number(pk.price)}
              packageTitle={`${pk.title} · ${pk.delivery_days} dias · ${pk.revisions_included} revisão(ões)`}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
