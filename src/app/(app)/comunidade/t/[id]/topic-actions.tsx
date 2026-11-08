"use client";
import { ThumbsUp } from "lucide-react";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteOwn, reportContent, setTopicFlag, toggleLike } from "@/app/actions/forum";

export function ContentActions({
  kind, id, isMine, like,
}: { kind: "topic" | "post"; id: string; isMine: boolean; like: { count: number; mine: boolean } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [liked, setLiked] = useState(like.mine);
  const [count, setCount] = useState(like.count);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const target = kind === "topic" ? { topicId: id } : { postId: id };

  function like_() {
    startTransition(async () => {
      const res = await toggleLike(target);
      if (res.ok) {
        setLiked(!!res.liked);
        setCount((c) => c + (res.liked ? 1 : -1));
      } else setError(res.error ?? "Erro.");
    });
  }
  function report() {
    setError("");
    startTransition(async () => {
      const res = await reportContent({ ...target, reason });
      if (!res.ok) return setError(res.error ?? "Erro.");
      setMsg(res.message ?? "Denúncia enviada.");
      setReporting(false);
    });
  }
  function remove() {
    if (!confirm(kind === "topic" ? "Apagar este tópico e todas as respostas?" : "Apagar esta resposta?")) return;
    startTransition(async () => {
      const res = await deleteOwn(kind, id);
      if (!res.ok) return setError(res.error ?? "Erro.");
      if (res.redirectTo) router.push(res.redirectTo);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={liked ? "default" : "outline"} aria-pressed={liked} disabled={pending} onClick={like_}>
          <ThumbsUp className="mr-1 inline size-4" aria-hidden="true" />Útil {count > 0 && `(${count})`}
        </Button>
        {isMine ? (
          <Button size="sm" variant="ghost" disabled={pending} onClick={remove}>Apagar</Button>
        ) : (
          <Button size="sm" variant="ghost" disabled={pending || !!msg} onClick={() => setReporting(!reporting)}>Denunciar</Button>
        )}
      </div>
      {reporting && (
        <div className="flex flex-wrap items-center gap-2">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (spam, ofensa, golpe...)" maxLength={500}
            aria-label="Motivo da denúncia" className="h-8 min-w-60 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm" />
          <Button size="sm" disabled={pending || reason.trim().length < 3} onClick={report}>Enviar denúncia</Button>
        </div>
      )}
      {msg && <p className="text-xs text-floresta" role="status">{msg}</p>}
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}

export function AdminTopicControls({ id, pinned, locked, hidden }: { id: string; pinned: boolean; locked: boolean; hidden: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const set = (field: "is_pinned" | "is_locked" | "is_hidden", value: boolean) =>
    startTransition(async () => { await setTopicFlag(id, field, value); router.refresh(); });
  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-3" aria-label="Moderação">
      <span className="text-xs text-muted-foreground">Moderação:</span>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => set("is_pinned", !pinned)}>{pinned ? "Desafixar" : "Fixar"}</Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => set("is_locked", !locked)}>{locked ? "Destrancar" : "Trancar"}</Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => set("is_hidden", !hidden)}>{hidden ? "Reexibir" : "Ocultar"}</Button>
    </div>
  );
}
