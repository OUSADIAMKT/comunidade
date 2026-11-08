import Link from "next/link";
import { notFound } from "next/navigation";
import { CAMPAIGN_STATUS_LABEL, requireCompany } from "@/lib/company";
import { formatBRL } from "@/lib/constants";
import { CampaignForm } from "../campaign-form";
import { CampaignActions } from "../campaign-actions";
import { ApplicationActions } from "./application-actions";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const APP_STATUS = { PENDING: "Nova", SHORTLISTED: "Lista curta", APPROVED: "Aprovada", REJECTED: "Recusada" } as const;
const ORDER = { SHORTLISTED: 0, PENDING: 1, APPROVED: 2, REJECTED: 3 } as const;

export default async function OportunidadePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const { supabase, company } = await requireCompany();

  const { data: campaign } = await supabase
    .from("campaigns").select("*").eq("id", id).eq("company_id", company.id).maybeSingle();
  if (!campaign) notFound();

  const [{ data: categories }, { data: apps }] = await Promise.all([
    supabase.from("categories").select("id,name").eq("is_active", true).order("display_order"),
    supabase.from("applications").select("id,professional_id,pitch_message,proposed_value,status,created_at")
      .eq("campaign_id", id).order("created_at", { ascending: false }),
  ]);

  const profIds = (apps ?? []).map((a) => a.professional_id);
  const { data: profs } = profIds.length
    ? await supabase.from("public_professional_profiles")
        .select("id,username,full_name,avatar_url,city,state_uf,category_names,rating_avg,reviews_count,starting_price,is_pro")
        .in("id", profIds)
    : { data: [] };
  const byId = new Map((profs ?? []).map((p) => [p.id, p]));
  const sorted = [...(apps ?? [])].sort(
    (a, b) => ORDER[a.status as keyof typeof ORDER] - ORDER[b.status as keyof typeof ORDER],
  );
  const full = campaign.slots_filled >= campaign.slots_total;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{campaign.title}</h1>
        <span className="rounded-full border px-2 py-0.5 text-xs">
          {CAMPAIGN_STATUS_LABEL[campaign.status as keyof typeof CAMPAIGN_STATUS_LABEL]} · {campaign.slots_filled}/{campaign.slots_total} vagas
        </span>
      </div>
      <CampaignActions id={campaign.id} status={campaign.status} />

      <section className="space-y-3" aria-label="Triagem de candidatos">
        <h2 className="font-semibold">Candidaturas ({apps?.length ?? 0})</h2>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma candidatura ainda.</p>
        ) : (
          <ul className="space-y-3">
            {sorted.map((a) => {
              const p = byId.get(a.professional_id);
              return (
                <li key={a.id} className="space-y-2 rounded-xl border p-4">
                  <div className="flex items-start gap-3">
                    {p?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar_url} alt="" className="size-12 rounded-full object-cover" />
                    ) : (
                      <div className="size-12 rounded-full bg-muted" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {p ? <a href={`/c/${p.username}`} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">{p.full_name}</a> : "Profissional"}
                        {p?.is_pro && <span className="ml-2 rounded-full border border-amarelo/50 px-1.5 py-0.5 text-xs text-amarelo">PRO</span>}
                      </p>
                      {p && (
                        <p className="text-xs text-muted-foreground">
                          {(p.category_names ?? []).join(" | ")} · {p.city}/{p.state_uf} · ★ {Number(p.rating_avg).toFixed(1)} ({p.reviews_count})
                        </p>
                      )}
                    </div>
                    <span className="rounded-full border px-2 py-0.5 text-xs">{APP_STATUS[a.status as keyof typeof APP_STATUS]}</span>
                  </div>
                  {a.proposed_value && <p className="text-sm">Valor proposto: <strong>{formatBRL(a.proposed_value)}</strong></p>}
                  {a.pitch_message && <p className="rounded-lg bg-muted p-3 text-sm">{a.pitch_message}</p>}
                  <ApplicationActions id={a.id} status={a.status} full={full} />
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Ao aprovar, o match é confirmado na hora e o WhatsApp é liberado em{" "}
          <Link href="/empresa/matches?aba=confirmados" className="underline">Matches</Link>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Editar oportunidade</h2>
        <CampaignForm categories={categories ?? []} campaign={campaign} />
      </section>
    </div>
  );
}
