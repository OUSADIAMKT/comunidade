"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "@/components/shared/google-button";
import { AuthShell } from "@/components/layout/auth-shell";
import { createClient } from "@/lib/supabase/client";
import { CONTEXT_HOME } from "@/lib/roles";

type Role = "PROFESSIONAL" | "COMPANY";

const ROLES: Record<Role, { label: string; hint: string; icon: typeof Clapperboard; perks: string[] }> = {
  PROFESSIONAL: {
    label: "Sou Profissional",
    hint: "Creator, social media, editor…",
    icon: Clapperboard,
    perks: [
      "Perfil e mídia kit públicos, com a sua cara",
      "Pacotes de serviço com preço e prazo definidos",
      "Candidatura em 1 clique nas oportunidades",
    ],
  },
  COMPANY: {
    label: "Sou Empresa",
    hint: "Marca, agência, negócio local…",
    icon: Building2,
    perks: [
      "Encontre talentos da Amazônia por categoria e cidade",
      "Publique campanhas e receba candidaturas",
      "WhatsApp liberado quando há match dos dois lados",
    ],
  },
};

const LABEL = "font-mono text-[0.7rem] uppercase tracking-[0.14em]";

/** `?perfil=empresa` ou `?perfil=talento` (links da home) já chega com o tipo de conta escolhido. */
function roleFromParam(v: string | null): Role {
  return v === "empresa" ? "COMPANY" : "PROFESSIONAL";
}

function CadastroWithParams() {
  const params = useSearchParams();
  return <CadastroForm initialRole={roleFromParam(params.get("perfil"))} />;
}

export default function CadastroPage() {
  // O fallback é o próprio formulário (perfil padrão), então a página pré-renderiza inteira.
  return (
    <Suspense fallback={<CadastroForm initialRole="PROFESSIONAL" />}>
      <CadastroWithParams />
    </Suspense>
  );
}

function CadastroForm({ initialRole }: { initialRole: Role }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(initialRole);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [terms, setTerms] = useState(false);
  const [adult, setAdult] = useState(false);
  const consented = terms && adult;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    if (!terms) {
      setError("Aceite a Política de Privacidade para continuar.");
      setLoading(false);
      return;
    }
    if (!adult) {
      setError("Confirme que você tem 18 anos ou mais. Menores não se cadastram: o responsável legal faz o cadastro.");
      setLoading(false);
      return;
    }
    const acceptedAt = new Date().toISOString();
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: String(form.get("email")),
      password: String(form.get("password")),
      options: {
        data: { full_name: String(form.get("full_name")), initial_role: role, adult_declaration_at: acceptedAt, terms_accepted_at: acceptedAt, privacy_accepted_at: acceptedAt },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.session) {
      router.replace(CONTEXT_HOME[role]);
      router.refresh();
    } else {
      setInfo("Enviamos um link de confirmação para o seu e-mail.");
      setLoading(false);
    }
  }

  return (
    <AuthShell
      perksKey={role}
      perks={ROLES[role].perks}
      headline={
        <>
          Talento da Amazônia <span className="text-amarelo">conectado</span> a quem precisa dele.
        </>
      }
    >
      <p className="eyebrow mb-2">Crie sua conta</p>
      <h2 className="headline-section !text-3xl">Bora entrar pra comunidade?</h2>

      <div className="mt-6 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Tipo de conta">
        {(Object.keys(ROLES) as Role[]).map((r) => {
          const Icon = ROLES[r].icon;
          return (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={role === r}
              onClick={() => setRole(r)}
              className="role-card flex flex-col items-start gap-2 p-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Icon className={role === r ? "size-5 text-amarelo" : "size-5 text-muted-foreground"} aria-hidden="true" />
              <span className="font-display text-[0.95rem] font-bold leading-tight">{ROLES[r].label}</span>
              <span className="text-xs leading-snug text-muted-foreground">{ROLES[r].hint}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 space-y-3">
        <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 size-4" />
          <span>
            Li e aceito a{" "}
            <a href="/privacidade" target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">
              Política de Privacidade (LGPD)
            </a>
            .
          </span>
        </label>

        <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-1 size-4" />
          <span>
            Tenho 18 anos ou mais. Se o talento for menor de idade, sou o pai, a mãe ou o responsável legal, faço este
            cadastro e respondo pela conta.
          </span>
        </label>
      </div>

      <div className="mt-4 space-y-1.5">
        <GoogleButton initialRole={role} consent={consented} disabled={!consented} className="h-11 bg-foreground/5 text-sm font-semibold" />
        {!consented && <p className="text-center text-xs text-muted-foreground">Marque as duas caixas acima para continuar.</p>}
      </div>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-[0.7rem] tracking-[0.2em] text-muted-foreground">OU COM E-MAIL</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="full_name" className={LABEL}>Nome completo</Label>
          <Input id="full_name" name="full_name" required autoComplete="name" className="h-11 bg-foreground/5" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className={LABEL}>E-mail</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" className="h-11 bg-foreground/5" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className={LABEL}>Senha</Label>
          <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="h-11 bg-foreground/5" />
          <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
        </div>

        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        {info && <p className="text-sm text-floresta" role="status">{info}</p>}

        <Button type="submit" className="btn-cta btn-cta-primary h-12 w-full gap-2 hover:bg-primary" disabled={loading}>
          {loading ? "Criando..." : "Criar conta"}
          {!loading && <ArrowRight className="size-4" aria-hidden="true" />}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-amarelo underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
