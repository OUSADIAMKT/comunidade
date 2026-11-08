import { Star } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActionButton, ErrorBanner, Pill, first } from "@/components/admin/admin-ui";
import { CAMPAIGN_STATUS_LABEL, COMPENSATION_LABEL } from "@/lib/company";
import { formatBRL } from "@/lib/constants";
import { closeCampaign, setCampaignFeatured, setPackageActive } from "../actions";

type SP = Record<string, string | string[] | undefined>;

export default async function CampanhasPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const tab = first(sp.aba) === "pacotes" ? "pacotes" : "campanhas";
  const ret = `/admin/campanhas?aba=${tab}`;
  const supabase = await createClient();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Campanhas e pacotes</h1>
      <ErrorBanner sp={sp} />
      <nav className="flex gap-1 border-b" aria-label="Abas">
        {[["campanhas", "Oportunidades"], ["pacotes", "Pacotes"]].map(([k, l]) => (
          <Link key={k} href={`/admin/campanhas?aba=${k}`} aria-current={tab === k ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === k ? "border-primary font-medium" : "border-transparent text-muted-foreground"}`}>{l}</Link>
        ))}
      </nav>
      {tab === "campanhas" ? <Campaigns supabase={supabase} ret={ret} /> : <Packages supabase={supabase} ret={ret} />}
    </div>
  );
}

type Sb = Awaited<ReturnType<typeof createClient>>;

async function Campaigns({ supabase, ret }: { supabase: Sb; ret: string }) {
  const { data } = await supabase
    .from("campaigns")
    .select("id,title,status,is_featured,compensation_type,budget_per_professional,slots_total,slots_filled,created_at,categories(name),company_profiles(company_name,trade_name)")
    .order("created_at", { ascending: false }).limit(80);
  return (
    <ul className="divide-y rounded-xl border">
      {(data ?? []).length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhuma oportunidade publicada.</li>}
      {(data ?? []).map((c) => {
        const comp = c.company_profiles as unknown as { company_name: string; trade_name: string | null } | null;
        const open = c.status === "OPEN" || c.status === "DRAFT" || c.status === "IN_PROGRESS";
        return (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div>
              <p className="font-medium">{c.is_featured && <Star className="mr-1 inline size-4 fill-amarelo text-amarelo" aria-label="Destaque" />}{c.title}</p>
              <p className="text-xs text-muted-foreground">
                {comp?.trade_name || comp?.company_name} · {(c.categories as unknown as { name: string } | null)?.name} ·{" "}
                {COMPENSATION_LABEL[c.compensation_type as keyof typeof COMPENSATION_LABEL]}
                {Number(c.budget_per_professional) > 0 && ` ${formatBRL(c.budget_per_professional)}`} · {c.slots_filled}/{c.slots_total} vagas
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={c.status === "OPEN" ? "ok" : c.status === "CANCELLED" ? "bad" : "muted"}>
                {CAMPAIGN_STATUS_LABEL[c.status as keyof typeof CAMPAIGN_STATUS_LABEL]}
              </Pill>
              <ActionButton action={setCampaignFeatured} ret={ret} fields={{ id: c.id, value: String(!c.is_featured) }}>
                {c.is_featured ? "Tirar destaque" : "Destacar"}
              </ActionButton>
              {open && <ActionButton action={closeCampaign} ret={ret} fields={{ id: c.id }} variant="ghost">Encerrar</ActionButton>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

async function Packages({ supabase, ret }: { supabase: Sb; ret: string }) {
  const { data } = await supabase
    .from("service_packages")
    .select("id,title,price,delivery_days,is_active,categories(name),professional_profiles(username)")
    .order("created_at", { ascending: false }).limit(80);
  return (
    <ul className="divide-y rounded-xl border">
      {(data ?? []).length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhum pacote cadastrado.</li>}
      {(data ?? []).map((p) => {
        const prof = p.professional_profiles as unknown as { username: string } | null;
        return (
          <li key={p.id} className={`flex flex-wrap items-center justify-between gap-2 p-3 text-sm ${p.is_active ? "" : "opacity-60"}`}>
            <div>
              <p className="font-medium">{p.title}</p>
              <p className="text-xs text-muted-foreground">
                {prof ? <Link href={`/c/${prof.username}`} target="_blank" className="underline">@{prof.username}</Link> : "—"} ·{" "}
                {(p.categories as unknown as { name: string } | null)?.name} · {formatBRL(p.price)} · {p.delivery_days} dias
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Pill tone={p.is_active ? "ok" : "bad"}>{p.is_active ? "Ativo" : "Inativo"}</Pill>
              <ActionButton action={setPackageActive} ret={ret} fields={{ id: p.id, value: String(!p.is_active) }}>
                {p.is_active ? "Desativar" : "Reativar"}
              </ActionButton>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
