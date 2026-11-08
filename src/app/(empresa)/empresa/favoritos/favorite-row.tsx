"use client";
import { Folder } from "lucide-react";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/lib/constants";
import { moveFavorite, removeFavorite } from "../actions";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function FavoriteRow({ id, folder, folders, p }: { id: string; folder: string; folders: string[]; p: any }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [moving, setMoving] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function move(target: string) {
    setError("");
    startTransition(async () => {
      const res = await moveFavorite(id, target);
      if (!res.ok) return setError(res.error ?? "Erro.");
      setMoving(false);
      setName("");
      router.refresh();
    });
  }

  return (
    <li className="space-y-2 rounded-xl border p-3">
      <div className="flex flex-wrap items-center gap-3">
        {p.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.avatar_url} alt="" className="size-10 rounded-full object-cover" />
        ) : (
          <div className="size-10 rounded-full bg-muted" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{p.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {(p.category_names ?? []).join(" | ")} · {p.city}/{p.state_uf}
            {Number(p.starting_price) > 0 && ` · a partir de ${formatBRL(p.starting_price)}`}
          </p>
        </div>
        <a href={`/c/${p.username}`} target="_blank" rel="noreferrer" className="text-sm underline">Portfólio</a>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setMoving(!moving)}>Mover</Button>
        <Button size="sm" variant="ghost" disabled={pending}
          onClick={() => startTransition(async () => { await removeFavorite(id); router.refresh(); })}>Remover</Button>
      </div>
      {moving && (
        <div className="flex flex-wrap items-center gap-2">
          {folders.filter((f) => f !== folder).map((f) => (
            <Button key={f} size="sm" variant="outline" disabled={pending} onClick={() => move(f)}><Folder className="mr-1 size-4" aria-hidden="true" />{f}</Button>
          ))}
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova pasta" aria-label="Nome da nova pasta" className="h-7 w-40" />
          <Button size="sm" disabled={pending || !name.trim()} onClick={() => move(name)}>Criar e mover</Button>
        </div>
      )}
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </li>
  );
}
