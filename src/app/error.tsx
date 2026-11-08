"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-5 p-6 text-center">
      <p className="eyebrow">Algo deu errado</p>
      <h1 className="text-2xl font-semibold">Não conseguimos carregar esta tela</h1>
      <p className="text-sm text-muted-foreground">
        Pode ter sido uma falha de conexão. Tente de novo; se continuar, volte ao início e entre outra vez.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => retry()}>Tentar de novo</Button>
        <Link href="/" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-foreground/5">Ir para o início</Link>
      </div>
    </main>
  );
}
