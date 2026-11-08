"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptTerms } from "@/app/actions/account";
import type { FormState } from "@/lib/form-state";

const initial: FormState = { ok: false };

/** Pede o aceite da Política de Privacidade e a declaração de 18+ a quem entrou sem passar por eles (ex.: Google). */
export function ConsentGate() {
  const router = useRouter();
  const [state, action, pending] = useActionState(acceptTerms, initial);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={action} className="surface mx-auto w-full max-w-md space-y-4 p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Antes de continuar</h1>
        <p className="text-sm text-muted-foreground">Precisamos do seu aceite para liberar a sua conta.</p>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <input type="checkbox" name="terms" className="mt-1 size-4" />
        <span>
          Li e aceito a{" "}
          <a href="/privacidade" target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">
            Política de Privacidade (LGPD)
          </a>
          .
        </span>
      </label>

      <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <input type="checkbox" name="adult" className="mt-1 size-4" />
        <span>
          Tenho 18 anos ou mais. Se o talento for menor de idade, sou o pai, a mãe ou o responsável legal, faço este
          cadastro e respondo pela conta.
        </span>
      </label>

      {state.error && <p className="text-sm text-destructive" role="alert">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending || state.ok}>
        {pending || state.ok ? "Salvando..." : "Aceitar e continuar"}
      </Button>
    </form>
  );
}
