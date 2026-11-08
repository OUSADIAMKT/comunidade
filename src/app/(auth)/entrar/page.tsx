"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/layout/auth-shell";
import { GoogleButton } from "@/components/shared/google-button";
import { createClient } from "@/lib/supabase/client";
import { CONTEXT_HOME, type Context } from "@/lib/roles";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : undefined;
  const erro = params.get("erro");
  const [error, setError] = useState(
    erro === "link"
      ? "Esse link expirou ou já foi usado. Peça um novo em “Esqueci minha senha”."
      : erro ? "Não foi possível entrar com o Google." : "",
  );
  const [loading, setLoading] = useState(false);

  // Já logado (ex.: voltou pelo link "Tenho interesse" do Mídia Kit): segue direto para o destino
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase.from("users").select("active_context").eq("id", user.id).single();
      router.replace(next ?? CONTEXT_HOME[(profile?.active_context ?? "PROFESSIONAL") as Context]);
    });
  }, [next, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error || !data.user) {
      setError("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase
      .from("users").select("active_context").eq("id", data.user.id).single();
    router.replace(next ?? CONTEXT_HOME[(profile?.active_context ?? "PROFESSIONAL") as Context]);
    router.refresh();
  }

  return (
    <>
      <p className="eyebrow mb-2">Que bom te ver</p>
      <h2 className="headline-section !text-3xl">Entrar na comunidade</h2>

      <div className="mt-6">
        <GoogleButton next={next} className="h-11 bg-foreground/5 text-sm font-semibold" />
      </div>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-[0.7rem] tracking-[0.2em] text-muted-foreground">OU COM E-MAIL</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="font-mono text-[0.7rem] uppercase tracking-[0.14em]">E-mail</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" className="h-11 bg-foreground/5" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password" className="font-mono text-[0.7rem] uppercase tracking-[0.14em]">Senha</Label>
            <Link href="/recuperar-senha" className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
              Esqueci minha senha
            </Link>
          </div>
          <Input id="password" name="password" type="password" required autoComplete="current-password" className="h-11 bg-foreground/5" />
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" className="btn-cta btn-cta-primary h-12 w-full gap-2 hover:bg-primary" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
          {!loading && <ArrowRight className="size-4" aria-hidden="true" />}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-amarelo underline underline-offset-4">
          Cadastre-se
        </Link>
      </p>
    </>
  );
}

export default function EntrarPage() {
  return (
    <AuthShell
      headline={
        <>
          A sua criatividade <span className="text-amarelo">tem endereço</span> na Amazônia.
        </>
      }
      perks={[
        "Acompanhe matches, propostas e contratos num só lugar",
        "Escola e comunidade para crescer junto com a região",
        "Notificações quando alguém se interessa pelo seu trabalho",
      ]}
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
