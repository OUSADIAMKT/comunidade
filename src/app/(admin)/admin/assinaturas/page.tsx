import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/shared/select";
import { ErrorBanner, Pill, SearchBox, first, safeQ } from "@/components/admin/admin-ui";
import { formatBRL } from "@/lib/constants";
import { setUserPlan } from "../actions";

type SP = Record<string, string | string[] | undefined>;
type Plan = { id: string; slug: string; name: string; target_role: "PROFESSIONAL" | "COMPANY"; price_monthly: number };

export default async function AssinaturasPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = safeQ(first(sp.q));
  const supabase = await createClient();
  const ret = `/admin/assinaturas${q ? `?q=${encodeURIComponent(q)}` : ""}`;

  let usersQ = supabase.from("users").select("id,full_name,email,is_professional,is_company")
    .or("is_professional.eq.true,is_company.eq.true").order("created_at", { ascending: false }).limit(60);
  if (q) usersQ = usersQ.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  const [{ data: users }, { data: plans }] = await Promise.all([
    usersQ,
    supabase.from("subscription_plans").select("id,slug,name,target_role,price_monthly").eq("is_active", true).order("price_monthly"),
  ]);
  const ids = (users ?? []).map((u) => u.id);
  const { data: subs } = ids.length
    ? await supabase.from("subscriptions").select("user_id,plan_id,current_period_end")
        .in("user_id", ids).in("status", ["ACTIVE", "TRIAL"]).gt("current_period_end", new Date().toISOString())
    : { data: [] };

  const planList = (plans ?? []) as Plan[];
  const planOf = (userId: string, role: Plan["target_role"]) => {
    const mine = (subs ?? [])
      .filter((s) => s.user_id === userId)
      .map((s) => ({ plan: planList.find((p) => p.id === s.plan_id), end: s.current_period_end as string }))
      .filter((x): x is { plan: Plan; end: string } => !!x.plan && x.plan.target_role === role)
      .sort((a, b) => Number(b.plan.price_monthly) - Number(a.plan.price_monthly))[0];
    return mine ?? { plan: planList.find((p) => p.target_role === role && Number(p.price_monthly) === 0)!, end: null };
  };

  const PlanForm = ({ userId, role }: { userId: string; role: Plan["target_role"] }) => {
    const cur = planOf(userId, role);
    const options = planList.filter((p) => p.target_role === role);
    return (
      <form action={setUserPlan} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="return" value={ret} />
        <input type="hidden" name="id" value={userId} />
        <span className="text-xs text-muted-foreground">{role === "PROFESSIONAL" ? "Profissional" : "Empresa"}:</span>
        <NativeSelect name="plan" defaultValue={cur.plan?.slug} aria-label={`Plano ${role === "PROFESSIONAL" ? "profissional" : "da empresa"}`} className="w-auto">
          {options.map((p) => <option key={p.slug} value={p.slug}>{p.name} — {Number(p.price_monthly) ? formatBRL(p.price_monthly) : "grátis"}</option>)}
        </NativeSelect>
        <Button type="submit" size="sm" variant="outline">Aplicar</Button>
        {cur.end && <Pill tone="ok">até {new Date(cur.end).toLocaleDateString("pt-BR")}</Pill>}
      </form>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Assinaturas</h1>
        <p className="text-sm text-muted-foreground">Troca manual de plano (30 dias a partir de agora). Voltar para o gratuito encerra a assinatura vigente.</p>
      </div>
      <ErrorBanner sp={sp} />
      <SearchBox q={q} />
      <ul className="divide-y rounded-xl border">
        {(users ?? []).length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhum usuário.</li>}
        {(users ?? []).map((u) => (
          <li key={u.id} className="space-y-2 p-3 text-sm">
            <p><strong>{u.full_name}</strong> <span className="text-muted-foreground">{u.email}</span></p>
            {u.is_professional && <PlanForm userId={u.id} role="PROFESSIONAL" />}
            {u.is_company && <PlanForm userId={u.id} role="COMPANY" />}
          </li>
        ))}
      </ul>
    </div>
  );
}
