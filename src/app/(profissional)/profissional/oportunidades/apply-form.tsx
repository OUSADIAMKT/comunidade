"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/shared/select";
import { applyToCampaign } from "@/app/actions/deals";

export function ApplyForm({ campaignId, disabled, budget }: { campaignId: string; disabled: boolean; budget: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [pitch, setPitch] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function send() {
    setError("");
    startTransition(async () => {
      const res = await applyToCampaign({ campaignId, pitch, value: value ? Number(value) : null });
      if (!res.ok) return setError(res.error ?? "Erro.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={disabled || pending} onClick={send}>{pending ? "Enviando..." : "Candidatar-me em 1 clique"}</Button>
        <Button size="sm" variant="ghost" disabled={disabled} onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Ocultar pitch" : "+ Pitch e valor (opcional)"}
        </Button>
      </div>
      {open && (
        <div className="space-y-2 rounded-lg bg-muted p-3">
          <Field label="Mensagem para a empresa" htmlFor={`pitch-${campaignId}`}>
            <Textarea id={`pitch-${campaignId}`} rows={3} maxLength={1000} value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="Por que você é o profissional ideal?" />
          </Field>
          <Field label="Valor proposto (R$)" htmlFor={`val-${campaignId}`} hint={budget > 0 ? `A empresa indicou R$ ${budget.toFixed(2)} por profissional.` : undefined}>
            <Input id={`val-${campaignId}`} type="number" min={0} step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
        </div>
      )}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
