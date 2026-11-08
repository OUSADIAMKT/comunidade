"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteCampaign, setCampaignStatus } from "../actions";

type Status = "DRAFT" | "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export function CampaignActions({ id, status }: { id: string; status: Status }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError("");
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Erro.");
      router.refresh();
    });
  }
  const set = (s: Status) => run(() => setCampaignStatus(id, s));

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" && <Button size="sm" disabled={pending} onClick={() => set("OPEN")}>Publicar</Button>}
        {status === "OPEN" && (
          <>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => set("IN_PROGRESS")}>Fechar vagas (em andamento)</Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => set("DRAFT")}>Despublicar</Button>
          </>
        )}
        {status === "IN_PROGRESS" && <Button size="sm" variant="outline" disabled={pending} onClick={() => set("COMPLETED")}>Marcar concluída</Button>}
        {(status === "DRAFT" || status === "OPEN" || status === "IN_PROGRESS") && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => confirm("Cancelar esta oportunidade?") && set("CANCELLED")}>Cancelar</Button>
        )}
        {status === "DRAFT" && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => confirm("Excluir este rascunho?") && run(() => deleteCampaign(id))}>Excluir</Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
