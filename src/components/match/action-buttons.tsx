"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { expressInterest, toggleFavorite } from "@/app/(empresa)/empresa/actions";

export function InterestButton({
  professionalId,
  packageId,
  filters,
  label = "Tenho Interesse",
  sent = false,
}: {
  professionalId: string;
  packageId?: string;
  filters?: Record<string, string>;
  label?: string;
  sent?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(sent);
  const [error, setError] = useState("");

  function click() {
    setError("");
    startTransition(async () => {
      const res = await expressInterest({ professionalId, packageId, filters });
      if (res.ok) {
        setDone(true);
        router.refresh();
      } else setError(res.error ?? "Erro.");
    });
  }

  return (
    <div className="space-y-1">
      <Button size="sm" onClick={click} disabled={pending || done}>
        {done ? "Interesse enviado ✓" : pending ? "Enviando..." : label}
      </Button>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}

export function FavoriteButton({ professionalId, initial }: { professionalId: string; initial: boolean }) {
  const [fav, setFav] = useState(initial);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <span className="inline-flex flex-col items-center">
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        aria-pressed={fav}
        aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        onClick={() =>
          startTransition(async () => {
            setError("");
            const res = await toggleFavorite(professionalId);
            if (res.ok) setFav(!!res.favorited);
            else setError(res.error ?? "Não foi possível favoritar.");
          })
        }
      >
        {fav ? "★" : "☆"}
      </Button>
      {error && <span className="max-w-40 text-center text-[0.7rem] text-destructive" role="alert">{error}</span>}
    </span>
  );
}
