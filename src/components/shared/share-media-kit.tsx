"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Copia o link do Mídia Kit ou abre o WhatsApp com ele pronto para enviar. */
export function ShareMediaKit({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);
  const url = () => `${window.location.origin}/c/${username}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copie o link do seu Mídia Kit:", url());
    }
  }

  function whatsapp() {
    const text = `Esse é o meu Mídia Kit no Creators da Amazônia, com portfólio, serviços e avaliações: ${url()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" onClick={copy}>
        {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        {copied ? "Link copiado!" : "Copiar link"}
      </Button>
      <Button type="button" size="sm" onClick={whatsapp} className="bg-green-600 text-white hover:bg-green-700">
        <Share2 className="size-4" aria-hidden="true" />
        Enviar no WhatsApp
      </Button>
    </div>
  );
}
