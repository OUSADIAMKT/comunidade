"use client";
import { Star } from "lucide-react";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setApplicationStatus } from "@/app/actions/deals";

type Status = "PENDING" | "SHORTLISTED" | "APPROVED" | "REJECTED";

export function ApplicationActions({ id, status, full }: { id: string; status: Status; full: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function set(s: "SHORTLISTED" | "APPROVED" | "REJECTED") {
    setError("");
    startTransition(async () => {
      const res = await setApplicationStatus(id, s);
      if (!res.ok) setError(res.error ?? "Erro.");
      router.refresh();
    });
  }

  if (status === "APPROVED") {
    return <p className="text-sm font-medium text-floresta">✓ Aprovado — match confirmado e WhatsApp liberado em Matches.</p>;
  }
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        {status !== "SHORTLISTED" && <Button size="sm" variant="outline" disabled={pending} onClick={() => set("SHORTLISTED")}><Star className="mr-1 size-4" aria-hidden="true" />Lista curta</Button>}
        <Button size="sm" disabled={pending || full} onClick={() => set("APPROVED")}>Aprovar</Button>
        {status !== "REJECTED" && <Button size="sm" variant="ghost" disabled={pending} onClick={() => set("REJECTED")}>Recusar</Button>}
      </div>
      {full && <p className="text-xs text-muted-foreground">Todas as vagas já foram preenchidas.</p>}
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
