import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActionButton, ErrorBanner, Pill, SearchBox, first, safeQ } from "@/components/admin/admin-ui";
import { setUserStatus, setVerified } from "../actions";

type SP = Record<string, string | string[] | undefined>;
const TABS = [
  { key: "usuarios", label: "Usuários" },
  { key: "profissionais", label: "Profissionais" },
  { key: "empresas", label: "Empresas" },
] as const;

export default async function ModeracaoPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const raw = first(sp.aba);
  const tab = (TABS.find((t) => t.key === raw)?.key ?? "usuarios") as (typeof TABS)[number]["key"];
  const q = safeQ(first(sp.q));
  const supabase = await createClient();
  const ret = `/admin/moderacao?aba=${tab}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Moderação</h1>
      <ErrorBanner sp={sp} />
      <nav className="flex gap-1 border-b" aria-label="Abas da moderação">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/moderacao?aba=${t.key}`} aria-current={tab === t.key ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === t.key ? "border-primary font-medium" : "border-transparent text-muted-foreground"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      <SearchBox q={q} extra={{ aba: tab }} />
      {tab === "usuarios" && <Users supabase={supabase} q={q} ret={ret} />}
      {tab === "profissionais" && <Professionals supabase={supabase} q={q} ret={ret} />}
      {tab === "empresas" && <Companies supabase={supabase} q={q} ret={ret} />}
    </div>
  );
}

type Sb = Awaited<ReturnType<typeof createClient>>;

async function Users({ supabase, q, ret }: { supabase: Sb; q: string; ret: string }) {
  let query = supabase.from("users").select("id,full_name,email,is_professional,is_company,is_admin,status,created_at")
    .order("created_at", { ascending: false }).limit(60);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  const { data } = await query;
  return (
    <ul className="divide-y rounded-xl border">
      {(data ?? []).length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhum usuário.</li>}
      {(data ?? []).map((u) => (
        <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
          <div>
            <p className="font-medium">{u.full_name} {u.is_admin && <Pill tone="warn">admin</Pill>}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {u.is_professional && <Pill>Profissional</Pill>}
            {u.is_company && <Pill>Empresa</Pill>}
            <Pill tone={u.status === "ACTIVE" ? "ok" : u.status === "SUSPENDED" ? "bad" : "warn"}>{u.status}</Pill>
            {u.status !== "ACTIVE" && <ActionButton action={setUserStatus} ret={ret} fields={{ id: u.id, status: "ACTIVE" }} variant="default">Aprovar / reativar</ActionButton>}
            {u.status !== "SUSPENDED" && !u.is_admin && <ActionButton action={setUserStatus} ret={ret} fields={{ id: u.id, status: "SUSPENDED" }}>Suspender</ActionButton>}
          </div>
        </li>
      ))}
    </ul>
  );
}

async function Professionals({ supabase, q, ret }: { supabase: Sb; q: string; ret: string }) {
  const { data } = await supabase
    .from("professional_profiles")
    .select("id,username,city,state_uf,is_verified,is_public,profile_completion_score,rating_avg,reviews_count,users!inner(full_name,email,status)")
    .order("created_at", { ascending: false }).limit(q ? 500 : 60);
  // a busca combina colunas de duas tabelas (username + nome/e-mail), então filtra aqui
  const rows = (data ?? []).filter((p) => {
    if (!q) return true;
    const u = p.users as unknown as { full_name: string; email: string };
    return `${p.username} ${u.full_name} ${u.email}`.toLowerCase().includes(q.toLowerCase());
  }).slice(0, 60);
  return (
    <ul className="divide-y rounded-xl border">
      {rows.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhum profissional.</li>}
      {rows.map((p) => {
        const u = p.users as unknown as { full_name: string; email: string; status: string };
        return (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div>
              <p className="font-medium">
                <Link href={`/c/${p.username}`} target="_blank" className="underline-offset-2 hover:underline">{u.full_name}</Link> {p.is_verified && <BadgeCheck className="inline size-4 text-rio" aria-label="Verificado" />}
              </p>
              <p className="text-xs text-muted-foreground">@{p.username} · {p.city}/{p.state_uf} · perfil {p.profile_completion_score}% · ★ {Number(p.rating_avg).toFixed(1)} ({p.reviews_count})</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!p.is_public && <Pill tone="warn">oculto</Pill>}
              <Pill tone={u.status === "ACTIVE" ? "ok" : "bad"}>{u.status}</Pill>
              <ActionButton action={setVerified} ret={ret} fields={{ kind: "professional", id: p.id, value: String(!p.is_verified) }}>
                {p.is_verified ? "Remover selo" : "Verificar"}
              </ActionButton>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

async function Companies({ supabase, q, ret }: { supabase: Sb; q: string; ret: string }) {
  let query = supabase
    .from("company_profiles")
    .select("id,company_name,trade_name,cnpj,city,state_uf,sector_niche,is_verified,users!inner(email,status)")
    .order("created_at", { ascending: false }).limit(60);
  if (q) query = query.or(`company_name.ilike.%${q}%,trade_name.ilike.%${q}%`);
  const { data } = await query;
  return (
    <ul className="divide-y rounded-xl border">
      {(data ?? []).length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhuma empresa.</li>}
      {(data ?? []).map((c) => {
        const u = c.users as unknown as { email: string; status: string };
        return (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div>
              <p className="font-medium">{c.trade_name || c.company_name} {c.is_verified && <BadgeCheck className="inline size-4 text-rio" aria-label="Verificado" />}</p>
              <p className="text-xs text-muted-foreground">{c.sector_niche} · {c.city}/{c.state_uf} · {u.email}{c.cnpj ? ` · CNPJ ${c.cnpj}` : ""}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={u.status === "ACTIVE" ? "ok" : "bad"}>{u.status}</Pill>
              <ActionButton action={setVerified} ret={ret} fields={{ kind: "company", id: c.id, value: String(!c.is_verified) }}>
                {c.is_verified ? "Remover selo" : "Verificar"}
              </ActionButton>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
