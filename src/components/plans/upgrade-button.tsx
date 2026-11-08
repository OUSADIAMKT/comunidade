"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { requestUpgrade } from "@/app/actions/plans";

export function UpgradeButton({ planSlug, planName }: { planSlug: string; planName: string }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="space-y-1">
      <Button disabled={pending || !!msg} onClick={() => {
        setError("");
        startTransition(async () => {
          const res = await requestUpgrade(planSlug);
          if (res.ok) setMsg(res.message ?? "Pedido enviado!"); else setError(res.error ?? "Erro.");
        });
      }}>
        {pending ? "Enviando..." : `Quero o ${planName}`}
      </Button>
      {msg && <p className="text-sm text-floresta" role="status">{msg}</p>}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
