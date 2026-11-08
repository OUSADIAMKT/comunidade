"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/layout/auth-shell";
import { createClient } from "@/lib/supabase/client";
import { CONTEXT_HOME, type Context } from "@/lib/roles";

const LABEL = "font-mono text-[0.7rem] uppercase tracking-[0.14em]";

/** Chega aqui pelo link do e-mail de recuperação (já com sessão, via /auth/callback). O proxy exige login. */
export default function NovaSenhaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (password !== String(fd.get("confirm") ?? "")) return setError("As duas senhas não são iguais.");

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error || !data.user) {
      setLoading(false);
      setError(
        error?.code === "same_password"
          ? "A senha nova precisa ser diferente da anterior."
          : "Não foi possível trocar a senha. Peça um novo link de recuperação.",
      );
      return;
    }
    const { data: me } = await supabase.from("users").select("active_context").eq("id", data.user.id).single();
    router.replace(CONTEXT_HOME[(me?.active_context ?? "PROFESSIONAL") as Context]);
    router.refresh();
  }

  return (
    <AuthShell
      headline={<>Senha nova, <span className="text-amarelo">acesso de volta</span>.</>}
      perks={["Use pelo menos 8 caracteres", "Misture letras, números e símbolos", "Não reaproveite a senha de outros sites"]}
    >
      <p className="eyebrow mb-2">Quase lá</p>
      <h2 className="headline-section !text-3xl">Criar senha nova</h2>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password" className={LABEL}>Senha nova</Label>
          <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="h-11 bg-foreground/5" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm" className={LABEL}>Repita a senha</Label>
          <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className="h-11 bg-foreground/5" />
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" className="btn-cta btn-cta-primary h-12 w-full hover:bg-primary" disabled={loading}>
          {loading ? "Salvando..." : "Salvar senha nova"}
        </Button>
      </form>
    </AuthShell>
  );
}
