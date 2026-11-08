import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/constants";
import { Pill } from "@/components/admin/admin-ui";
import { PageHeader, StatCard } from "@/components/brand/section-heading";

type Metrics = Record<string, number | string>;

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <StatCard label={label} value={value}>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </StatCard>
  );
}

export default async function AdminPage() {
  const supabase = await createClient();
  const [{ data }, { data: recent }] = await Promise.all([
    supabase.rpc("admin_metrics"),
    supabase.from("users").select("id,full_name,email,is_professional,is_company,status,created_at").order("created_at", { ascending: false }).limit(8),
  ]);
  const m = (data ?? {}) as Metrics;
  const n = (k: string) => Number(m[k] ?? 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Métricas globais" description="Visão consolidada da plataforma." />

      {(n("pending_moderation") > 0 || n("suspended") > 0) && (
        <p className="rounded-lg border border-amarelo/50 bg-amarelo/10 p-3 text-sm text-amarelo">
          {n("pending_moderation") > 0 && <>{n("pending_moderation")} conta(s) aguardando moderação. </>}
          {n("suspended") > 0 && <>{n("suspended")} conta(s) suspensa(s).</>}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Profissionais" value={n("professionals")} sub={`${n("users")} usuários no total`} />
        <Stat label="Empresas" value={n("companies")} />
        <Stat label="Campanhas abertas" value={n("open_campaigns")} sub={`${n("active_packages")} pacotes ativos na vitrine`} />
        <Stat label="Matches mútuos" value={n("mutual_matches")} sub={`${n("pending_matches")} interesses pendentes`} />
        <Stat label="Contratos" value={n("contracts_total")} sub={`${n("contracts_active")} em andamento · ${n("contracts_completed")} concluídos`} />
        <Stat label="GMV (volume contratado)" value={formatBRL(n("gmv_completed"))} sub={`+ ${formatBRL(n("gmv_active"))} em andamento · pago fora da plataforma`} />
        <Stat label="Assinaturas pagas ativas" value={n("paid_subscriptions")} />
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">Últimos cadastros</h2>
        <ul className="surface divide-y divide-border overflow-hidden">
          {(recent ?? []).map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span><strong>{u.full_name}</strong> <span className="text-muted-foreground">{u.email}</span></span>
              <span className="flex gap-1">
                {u.is_professional && <Pill>Profissional</Pill>}
                {u.is_company && <Pill>Empresa</Pill>}
                <Pill tone={u.status === "ACTIVE" ? "ok" : u.status === "SUSPENDED" ? "bad" : "warn"}>{u.status}</Pill>
                <time className="text-xs text-muted-foreground" dateTime={u.created_at}>{new Date(u.created_at).toLocaleDateString("pt-BR")}</time>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
