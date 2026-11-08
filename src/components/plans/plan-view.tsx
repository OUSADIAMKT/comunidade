import { formatBRL } from "@/lib/constants";
import { fmtLimit, type PlanRow } from "@/lib/plans";
import { UpgradeButton } from "./upgrade-button";

export type Usage = { label: string; used: number; limit: number; hint?: string };

function UsageBar({ u }: { u: Usage }) {
  const unlimited = u.limit >= 999;
  const pct = unlimited ? Math.min(100, u.used * 4) : u.limit === 0 ? 100 : Math.min(100, Math.round((u.used / u.limit) * 100));
  const full = !unlimited && u.used >= u.limit;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{u.label}</span>
        <span className={full ? "font-medium text-destructive" : ""}>{u.used} / {unlimited ? "∞" : u.limit}</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-muted" role="progressbar" aria-label={u.label}
        aria-valuenow={u.used} aria-valuemin={0} aria-valuemax={unlimited ? undefined : u.limit}>
        <div className={`h-full ${full ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
      {u.hint && <p className="text-xs text-muted-foreground">{u.hint}</p>}
    </div>
  );
}

function features(p: PlanRow): string[] {
  if (p.target_role === "PROFESSIONAL") {
    return [
      `${fmtLimit(p.monthly_applications_limit)} candidaturas por mês`,
      `${fmtLimit(p.max_packages_limit)} pacotes de serviço ativos`,
      p.featured_profile ? "Selo PRO e destaque no topo das buscas" : "Perfil e Mídia Kit públicos",
      p.featured_profile ? "Prioridade no desempate do match" : "Match com empresas",
    ];
  }
  return [
    `${fmtLimit(p.active_campaigns_limit)} ${p.active_campaigns_limit === 1 ? "campanha aberta" : "campanhas abertas"} por vez`,
    `${fmtLimit(p.monthly_matches_limit)} interesses (matches) por mês`,
    p.featured_profile ? "Pastas de favoritos ilimitadas" : "Busca de talentos liberada",
    p.featured_profile ? "Empresa em destaque para os profissionais" : "Favoritos e propostas",
  ];
}

export function PlanView({
  current, plans, renewsAt, usage,
}: { current: PlanRow; plans: PlanRow[]; renewsAt: string | null; usage: Usage[] }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Meu plano</h1>
        <p className="text-sm text-muted-foreground">
          Você está no plano <strong>{current.name}</strong>
          {renewsAt && <> · vigente até {new Date(renewsAt).toLocaleDateString("pt-BR")}</>}.
        </p>
      </div>

      <section aria-label="Consumo das cotas" className="space-y-4 rounded-xl border p-4">
        <h2 className="font-semibold">Consumo do mês</h2>
        {usage.map((u) => <UsageBar key={u.label} u={u} />)}
      </section>

      <section aria-label="Comparar planos" className="space-y-3">
        <h2 className="font-semibold">Comparar planos</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {plans.map((p) => {
            const isCurrent = p.id === current.id;
            return (
              <li key={p.id} className={`flex flex-col gap-3 rounded-xl border p-5 ${isCurrent ? "border-primary ring-1 ring-primary" : ""}`}>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                  {isCurrent && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">Seu plano</span>}
                </div>
                <p className="text-3xl font-bold">
                  {Number(p.price_monthly) === 0 ? "Grátis" : formatBRL(p.price_monthly)}
                  {Number(p.price_monthly) > 0 && <span className="text-sm font-normal text-muted-foreground">/mês</span>}
                </p>
                <ul className="flex-1 space-y-1 text-sm">
                  {features(p).map((f) => <li key={f}>✓ {f}</li>)}
                </ul>
                {!isCurrent && Number(p.price_monthly) > Number(current.price_monthly) && <UpgradeButton planSlug={p.slug} planName={p.name} />}
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground">
          O pagamento online ainda não está disponível: o pedido de upgrade avisa nossa equipe, que ativa o plano manualmente.
        </p>
      </section>
    </div>
  );
}
