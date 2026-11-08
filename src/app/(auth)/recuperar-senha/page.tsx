"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/layout/auth-shell";
import { createClient } from "@/lib/supabase/client";

const LABEL = "font-mono text-[0.7rem] uppercase tracking-[0.14em]";

export default function RecuperarSenhaPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/nova-senha`,
    });
    setLoading(false);
    // Limite de envios do Supabase: única falha que vale mostrar. Nos demais casos a resposta é
    // sempre a mesma, para não revelar se o e-mail tem conta.
    if (error && error.status === 429) {
      setError("Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.");
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell
      headline={<>Acontece com todo mundo. <span className="text-amarelo">Bora recuperar</span> o acesso.</>}
      perks={["Enviamos um link seguro para o seu e-mail", "O link vale por pouco tempo", "Depois é só criar uma senha nova"]}
    >
      <p className="eyebrow mb-2">Esqueci minha senha</p>
      <h2 className="headline-section !text-3xl">Recuperar acesso</h2>

      {sent ? (
        <div className="mt-6 space-y-4" role="status">
          <p className="text-sm">
            Se existir uma conta com esse e-mail, você vai receber um link para criar uma senha nova. Confira também a
            caixa de spam.
          </p>
          <Link href="/entrar" className="text-sm font-semibold text-amarelo underline underline-offset-4">
            Voltar para o login
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className={LABEL}>E-mail da conta</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" className="h-11 bg-foreground/5" />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" className="btn-cta btn-cta-primary h-12 w-full hover:bg-primary" disabled={loading}>
            {loading ? "Enviando..." : "Enviar link de recuperação"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Lembrou?{" "}
            <Link href="/entrar" className="font-semibold text-amarelo underline underline-offset-4">Entrar</Link>
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Criou a conta com o Google? Não precisa de senha: use &ldquo;Continuar com Google&rdquo; no login.
          </p>
        </form>
      )}
    </AuthShell>
  );
}
