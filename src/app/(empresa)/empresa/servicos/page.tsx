import { requireCompany } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/shared/select";
import { ProfessionalCard } from "@/components/match/professional-card";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ServicosPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, company } = await requireCompany();

  const category = first(sp.category);
  const min = Number(first(sp.min));
  const max = Number(first(sp.max));

  const { data: categories } = await supabase
    .from("categories").select("id,name").eq("is_active", true).order("display_order");

  let q = supabase
    .from("service_packages")
    .select("id,professional_id,category_id,title,price,delivery_days,revisions_included")
    .eq("is_active", true)
    .order("price")
    .limit(120);
  if (UUID_RE.test(category)) q = q.eq("category_id", category);
  if (min > 0) q = q.gte("price", min);
  if (max > 0) q = q.lte("price", max);
  const { data: pkgs } = await q;

  const profIds = [...new Set((pkgs ?? []).map((p) => p.professional_id))];
  const [{ data: profs }, { data: favs }, { data: sent }] = profIds.length
    ? await Promise.all([
        supabase.from("public_professional_profiles").select("*").in("id", profIds),
        supabase.from("company_favorites").select("professional_id").eq("company_id", company.id).in("professional_id", profIds),
        supabase.from("matches").select("service_package_id").eq("company_id", company.id)
          .not("service_package_id", "is", null).in("status", ["PENDING", "MUTUAL_MATCH"]),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const byId = new Map((profs ?? []).map((p) => [p.id, p]));
  const favSet = new Set((favs ?? []).map((f) => f.professional_id));
  const sentSet = new Set((sent ?? []).map((m) => m.service_package_id));
  // pacotes de perfis não-públicos somem (a view só devolve perfis públicos e ativos)
  const visible = (pkgs ?? []).filter((p) => byId.has(p.professional_id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Explorar serviços</h1>
        <p className="text-sm text-muted-foreground">Pacotes prontos com preço e prazo fechados.</p>
      </div>

      <form method="get" className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-4">
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
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum pacote encontrado com esses filtros.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((pk) => (
            <ProfessionalCard
              key={pk.id}
              p={byId.get(pk.professional_id)}
              price={Number(pk.price)}
              packageId={pk.id}
              packageTitle={`${pk.title} · ${pk.delivery_days} dias · ${pk.revisions_included} revisão(ões)`}
              favorited={favSet.has(pk.professional_id)}
              interestSent={sentSet.has(pk.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
