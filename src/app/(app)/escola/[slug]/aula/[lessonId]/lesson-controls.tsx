"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setLessonDone } from "@/app/actions/escola";

export function LessonControls({
  lessonId, done, isLast, nextHref, prevHref,
}: { lessonId: string; done: boolean; isLast: boolean; nextHref: string; prevHref: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function complete(goNext: boolean) {
    setError("");
    startTransition(async () => {
      const res = await setLessonDone(lessonId, true);
      if (!res.ok) return setError(res.error ?? "Erro.");
      if (goNext) router.push(nextHref);
      else router.refresh();
    });
  }
  function undo() {
    setError("");
    startTransition(async () => {
      const res = await setLessonDone(lessonId, false);
      if (!res.ok) return setError(res.error ?? "Erro.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {prevHref && <Link href={prevHref} className="inline-flex h-8 items-center rounded-lg border px-3 text-sm hover:bg-muted">← Anterior</Link>}
        {done ? (
          <>
            <span className="text-sm text-floresta">✓ Aula concluída</span>
            <Button size="sm" variant="ghost" disabled={pending} onClick={undo}>Desmarcar</Button>
            <Link href={nextHref} className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
              {isLast ? "Voltar ao curso" : "Próxima aula →"}
            </Link>
          </>
        ) : (
          <Button size="sm" disabled={pending} onClick={() => complete(true)}>
            {pending ? "Salvando..." : isLast ? "Concluir aula e voltar ao curso" : "Concluir e ir para a próxima →"}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
