"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/shared/select";
import { createClient } from "@/lib/supabase/client";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { addPortfolioItem, deletePortfolioItem, toggleFeatured } from "../actions";

type Item = {
  id: string; title: string; brand_name: string | null; description: string | null;
  media_type: "VIDEO" | "IMAGE" | "EXTERNAL_LINK"; media_url: string; is_featured: boolean; category_id: string | null;
};

export function PortfolioManager({
  userId, items, categories,
}: { userId: string; items: Item[]; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"file" | "link">("file");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const base = {
      title: String(fd.get("title") ?? ""),
      brand_name: String(fd.get("brand_name") ?? ""),
      description: String(fd.get("description") ?? ""),
      category_id: String(fd.get("category_id") ?? ""),
    };
    if (!base.title.trim()) return setError("Dê um título ao trabalho.");

    setBusy(true);
    try {
      let media_type: Item["media_type"] = "EXTERNAL_LINK";
      let media_url = String(fd.get("link") ?? "").trim();

      if (mode === "file") {
        const file = fd.get("file") as File | null;
        if (!file || !file.size) return setError("Escolha uma imagem ou vídeo.");
        if (file.size > MAX_UPLOAD_BYTES) return setError("Arquivo acima de 50 MB. Use a opção de link para vídeos maiores.");
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return setError("Envie uma imagem ou um vídeo.");
        media_type = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
        const supabase = createClient();
        const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${userId}/portfolio/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
        if (upErr) return setError("Falha no envio do arquivo.");
        media_url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      } else if (!media_url) {
        return setError("Cole o link do trabalho (Instagram, YouTube, Drive...).");
      }

      const res = await addPortfolioItem({ ...base, media_type, media_url });
      if (!res.ok) return setError(res.error ?? "Erro ao salvar.");
      formEl.reset();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function remove(id: string) {
    if (!confirm("Remover este item do portfólio?")) return;
    startTransition(async () => {
      const res = await deletePortfolioItem(id);
      if (!res.ok) setError(res.error ?? "Erro ao remover.");
      router.refresh();
    });
  }

  function feature(id: string, value: boolean) {
    startTransition(async () => {
      await toggleFeatured(id, value);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Meu portfólio</h1>
        <p className="text-sm text-muted-foreground">Vídeos, fotos e cases que aparecem no seu Mídia Kit. Pelo menos 1 item é obrigatório para publicar pacotes.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border p-4">
        <h2 className="font-medium">Adicionar trabalho</h2>
        <div className="flex gap-2" role="radiogroup" aria-label="Origem da mídia">
          <Button type="button" size="sm" role="radio" aria-checked={mode === "file"} variant={mode === "file" ? "default" : "outline"} onClick={() => setMode("file")}>Enviar arquivo</Button>
          <Button type="button" size="sm" role="radio" aria-checked={mode === "link"} variant={mode === "link" ? "default" : "outline"} onClick={() => setMode("link")}>Colar link</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Título" htmlFor="title"><Input id="title" name="title" /></Field>
          <Field label="Marca / cliente (opcional)" htmlFor="brand_name"><Input id="brand_name" name="brand_name" /></Field>
        </div>
        {mode === "file" ? (
          <Field label="Imagem ou vídeo (até 50 MB)" htmlFor="file"><Input id="file" name="file" type="file" accept="image/*,video/*" /></Field>
        ) : (
          <Field label="Link do trabalho" htmlFor="link"><Input id="link" name="link" type="url" placeholder="https://" /></Field>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Categoria (opcional)" htmlFor="category_id">
            <NativeSelect id="category_id" name="category_id" defaultValue="">
              <option value="">—</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </NativeSelect>
          </Field>
        </div>
        <Field label="Descrição (opcional)" htmlFor="description"><Textarea id="description" name="description" rows={2} /></Field>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? "Enviando..." : "Adicionar ao portfólio"}</Button>
      </form>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Seu portfólio está vazio. Adicione o primeiro trabalho acima.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <li key={it.id} className="overflow-hidden rounded-xl border">
              <div className="aspect-video bg-muted">
                {it.media_type === "IMAGE" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.media_url} alt={it.title} className="size-full object-cover" />
                )}
                {it.media_type === "VIDEO" && <video src={it.media_url} controls preload="metadata" className="size-full object-cover" />}
                {it.media_type === "EXTERNAL_LINK" && (
                  <a href={it.media_url} target="_blank" rel="noreferrer" className="flex size-full items-center justify-center p-4 text-center text-sm underline">Abrir link ↗</a>
                )}
              </div>
              <div className="space-y-2 p-3">
                <p className="font-medium">{it.title}</p>
                {it.brand_name && <p className="text-xs text-muted-foreground">{it.brand_name}</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => feature(it.id, !it.is_featured)} aria-pressed={it.is_featured}>
                    {it.is_featured ? "★ Destaque" : "☆ Destacar"}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => remove(it.id)}>Remover</Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
