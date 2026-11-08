"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { respondMatch } from "@/app/actions/deals";

export function RespondButtons({ matchId, acceptLabel }: { matchId: string; acceptLabel: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function respond(accept: boolean) {
    setError("");
    startTransition(async () => {
      const res = await respondMatch(matchId, accept);
      if (!res.ok) setError(res.error ?? "Erro.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => respond(true)}>{acceptLabel}</Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => respond(false)}>Recusar</Button>
      </div>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
