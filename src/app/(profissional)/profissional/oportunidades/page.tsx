import { EmptyState } from "@/components/shared/empty-state";
import { BadgeCheck, Star } from "lucide-react";
import Link from "next/link";
import { requireProfessional, getProfessionalPlan, limitLabel } from "@/lib/professional";
import { COMPENSATION_LABEL, startOfMonthISO } from "@/lib/company";
import { MIN_SCORE_TO_PUBLISH, UFS, WORK_MODALITIES, formatBRL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/shared/select";
import { ApplyForm } from "./apply-form";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const APP_STATUS = {
  PENDING: "Candidatura enviada", SHORTLISTED: "Na lista curta", APPROVED: "Aprovada! Veja em Matches", REJECTED: "Não selecionada",
} as const;

export default async function OportunidadesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireProfessional();

  const category = first(sp.category);
  const uf = first(sp.uf);
  const comp = first(sp.comp);
  const modality = first(sp.modality);
  const minBudget = Number(first(sp.min));
  const q = first(sp.q).replace(/[%,()*]/g, " ").trim().slice(0, 60);

  let query = supabase
    .from("campaigns")
    .select(`id,title,briefing_description,deliverables_expected,compensation_type,budget_per_professional,barter_description,
      slots_total,slots_filled,is_featured,work_modality,target_state_uf,target_city,target_niches,deadline_days,category_id,created_at,
      categories(name), company_profiles(company_name,trade_name,logo_url,city,state_uf,is_verified)`)
    .eq("status", "OPEN")
    .order("created_at", { ascending: false })
    .limit(80);
  if (UUID_RE.test(category)) query = query.eq("category_id", category);
  if (uf) query = query.eq("target_state_uf", uf);
  if (["PAID", "BARTER", "HYBRID"].includes(comp)) query = query.eq("compensation_type", comp);
  if (["REMOTE", "ONSITE", "HYBRID"].includes(modality)) query = query.eq("work_modality", modality);
  if (minBudget > 0) query = query.gte("budget_per_professional", minBudget);
  if (q) query = query.ilike("title", `%${q}%`);

  const [plan, { data: campaigns }, { data: categories }, { data: mine }, { data: myApps }, { count: usedThisMonth }] = await Promise.all([
    getProfessionalPlan(supabase, user.id),
    query,
    supabase.from("categories").select("id,name").eq("is_active", true).order("display_order"),
    supabase.from("professional_categories").select("category_id").eq("professional_id", profile.id),
    supabase.from("applications").select("campaign_id,status").eq("professional_id", profile.id),
    supabase.from("applications").select("id", { count: "exact", head: true })
      .eq("professional_id", profile.id).gte("created_at", startOfMonthISO()),
  ]);

  const myCats = new Set((mine ?? []).map((m) => m.category_id));
  const appBy = new Map((myApps ?? []).map((a) => [a.campaign_id, a.status as keyof typeof APP_STATUS]));
  const used = usedThisMonth ?? 0;
  const limit = plan.monthly_applications_limit;
  const quotaLeft = used < limit;
  const profileOk = profile.profile_completion_score >= MIN_SCORE_TO_PUBLISH;

  // compatíveis primeiro
  const list = [...(campaigns ?? [])].sort(
    (a, b) =>
      Number(b.is_featured) - Number(a.is_featured) ||
      Number(myCats.has(b.category_id)) - Number(myCats.has(a.category_id)),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Oportunidades</h1>
          <p className="text-sm text-muted-foreground">Campanhas abertas por empresas. Candidate-se em 1 clique.</p>
        </div>
        <p className="text-sm">
          Candidaturas no mês: <strong>{used}</strong> de <strong>{limitLabel(limit)}</strong>{" "}
          <span className="text-muted-foreground">({plan.name})</span>
        </p>
      </div>

      {!profileOk && (
        <p className="rounded-lg border border-amarelo/50 bg-amarelo/10 p-3 text-sm text-amarelo" role="status">
          Seu perfil está em {profile.profile_completion_score}%. Chegue a {MIN_SCORE_TO_PUBLISH}% em{" "}
          <Link href="/profissional/perfil" className="underline">Meu perfil</Link> para se candidatar.
        </p>
      )}
      {profileOk && !quotaLeft && (
        <p className="rounded-lg border border-amarelo/50 bg-amarelo/10 p-3 text-sm text-amarelo" role="status">
          Você usou todas as candidaturas do mês. Elas renovam no dia 1º do próximo mês.
        </p>
      )}

      <form method="get" className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="Buscar" htmlFor="q"><Input id="q" name="q" defaultValue={q} placeholder="título..." /></Field>
        <Field label="Categoria" htmlFor="category">
          <NativeSelect id="category" name="category" defaultValue={category}>
            <option value="">Todas</option>
            {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="UF" htmlFor="uf">
          <NativeSelect id="uf" name="uf" defaultValue={uf}>
            <option value="">Qualquer</option>
            {UFS.map((u) => <option key={u}>{u}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Remuneração" htmlFor="comp">
          <NativeSelect id="comp" name="comp" defaultValue={comp}>
            <option value="">Todas</option>
            <option value="PAID">Cachê pago</option>
            <option value="BARTER">Permuta</option>
            <option value="HYBRID">Híbrido</option>
          </NativeSelect>
        </Field>
        <Field label="Modalidade" htmlFor="modality">
          <NativeSelect id="modality" name="modality" defaultValue={modality}>
            <option value="">Todas</option>
            {Object.entries(WORK_MODALITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Orçamento mín. (R$)" htmlFor="min"><Input id="min" name="min" type="number" min={0} defaultValue={first(sp.min)} /></Field>
        <div className="sm:col-span-3 lg:col-span-6"><Button type="submit">Filtrar</Button></div>
      </form>

      {list.length === 0 ? (
        <EmptyState
          title="Nenhuma oportunidade aberta com esses filtros"
          text="Novas vagas chegam toda semana. Enquanto isso, deixe seus pacotes no ar: as marcas também contratam direto pela vitrine."
          cta={{ href: "/profissional/servicos", label: "Ver meus pacotes" }}
        />
      ) : (
        <ul className="space-y-4">
          {list.map((c) => {
            const company = c.company_profiles as unknown as { company_name: string; trade_name: string | null; logo_url: string | null; city: string; state_uf: string; is_verified: boolean } | null;
            const status = appBy.get(c.id);
            const full = c.slots_filled >= c.slots_total;
            return (
              <li key={c.id} className="space-y-3 rounded-xl border p-4">
                <div className="flex items-start gap-3">
                  {company?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={company.logo_url} alt="" className="size-12 rounded-lg object-cover" />
                  ) : (
                    <div className="size-12 rounded-lg bg-muted" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{c.is_featured && <Star className="mr-1 inline size-4 fill-amarelo text-amarelo" aria-label="Destaque" />}{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {company?.trade_name || company?.company_name} {company?.is_verified && <BadgeCheck className="inline size-4 text-rio" aria-label="Verificado" />} · {company?.city}/{company?.state_uf}
                    </p>
                  </div>
                  {myCats.has(c.category_id) && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">Compatível com você</span>}
                </div>
                <p className="text-sm">{c.briefing_description}</p>
                <p className="text-sm"><span className="text-muted-foreground">Entregáveis:</span> {c.deliverables_expected}</p>
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{(c.categories as unknown as { name: string } | null)?.name}</span>
                  <span>{COMPENSATION_LABEL[c.compensation_type as keyof typeof COMPENSATION_LABEL]}{Number(c.budget_per_professional) > 0 && ` · ${formatBRL(c.budget_per_professional)}`}</span>
                  {c.barter_description && <span>Permuta: {c.barter_description}</span>}
                  <span>{WORK_MODALITIES[c.work_modality as keyof typeof WORK_MODALITIES]}{c.target_state_uf && ` · ${c.target_city ? `${c.target_city}/` : ""}${c.target_state_uf}`}</span>
                  <span>{c.slots_total - c.slots_filled} vaga(s) · {c.deadline_days} dias</span>
                </p>
                {status ? (
                  <p className="text-sm font-medium">{APP_STATUS[status]}</p>
                ) : full ? (
                  <p className="text-sm text-muted-foreground">Vagas preenchidas.</p>
                ) : (
                  <ApplyForm campaignId={c.id} disabled={!profileOk || !quotaLeft} budget={Number(c.budget_per_professional)} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
