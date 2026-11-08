import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionButton, ErrorBanner, Pill } from "@/components/admin/admin-ui";
import { resolveReported, saveForumCategory } from "./actions";

type SP = Record<string, string | string[] | undefined>;
const RET = "/admin/comunidade";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function AdminComunidadePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const supabase = await createClient();

  const [{ data: reports }, { data: cats }] = await Promise.all([
    supabase.from("forum_reports")
      .select("id,reason,created_at,topic_id,post_id,forum_topics(id,title,body,is_hidden),forum_posts(id,body,is_hidden,topic_id)")
      .eq("status", "OPEN").order("created_at", { ascending: false }).limit(200),
    supabase.from("forum_categories").select("*").order("position"),
  ]);

  // agrupa as denúncias por conteúdo
  type Group = { kind: "topic" | "post"; id: string; ref: any; reasons: string[]; topicId: string };
  const groups = new Map<string, Group>();
  for (const r of (reports ?? []) as any[]) {
    const kind: "topic" | "post" = r.topic_id ? "topic" : "post";
    const id: string = r.topic_id ?? r.post_id;
    const ref = kind === "topic" ? r.forum_topics : r.forum_posts;
    const g: Group = groups.get(id) ?? { kind, id, ref, reasons: [], topicId: kind === "topic" ? id : r.forum_posts?.topic_id };
    g.reasons.push(r.reason);
    groups.set(id, g);
  }
  const list = [...groups.values()].sort((a, b) => b.reasons.length - a.reasons.length);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Comunidade</h1>
        <p className="text-sm text-muted-foreground">Moderação depois de publicar. Com 3 denúncias de pessoas diferentes o conteúdo é ocultado automaticamente e aparece aqui para revisão.</p>
      </div>
      <ErrorBanner sp={sp} />

      <section className="space-y-3" aria-label="Denúncias abertas">
        <h2 className="font-semibold">Denúncias abertas ({list.length})</h2>
        {list.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma denúncia pendente.</p>
        ) : (
          <ul className="space-y-3">
            {list.map((g) => (
              <li key={g.id} className="space-y-2 rounded-xl border p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="warn">{g.kind === "topic" ? "Tópico" : "Resposta"}</Pill>
                  <Pill tone="bad">{g.reasons.length} denúncia(s)</Pill>
                  {g.ref?.is_hidden && <Pill>oculto</Pill>}
                  {g.topicId && <Link href={`/comunidade/t/${g.topicId}`} target="_blank" className="text-xs underline">Abrir ↗</Link>}
                </div>
                {g.ref ? (
                  <p className="rounded-lg bg-muted p-3">
                    {g.kind === "topic" && <strong className="block">{g.ref.title}</strong>}
                    <span className="line-clamp-4 whitespace-pre-line">{g.ref.body}</span>
                  </p>
                ) : <p className="text-muted-foreground">Conteúdo já removido.</p>}
                <ul className="list-inside list-disc text-xs text-muted-foreground">
                  {g.reasons.slice(0, 5).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <ActionButton action={resolveReported} ret={RET} fields={{ kind: g.kind, id: g.id, action: "restore" }}>Restaurar (descartar denúncias)</ActionButton>
                  <ActionButton action={resolveReported} ret={RET} fields={{ kind: g.kind, id: g.id, action: "hide" }}>Manter oculto</ActionButton>
                  <ActionButton action={resolveReported} ret={RET} fields={{ kind: g.kind, id: g.id, action: "delete" }} variant="ghost">Apagar</ActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3" aria-label="Categorias do fórum">
        <h2 className="font-semibold">Categorias do fórum</h2>
        <ul className="space-y-2">
          {(cats ?? []).map((c) => (
            <li key={c.id} className={`rounded-xl border p-3 ${c.is_active ? "" : "opacity-60"}`}>
              <form action={saveForumCategory} className="grid gap-2 sm:grid-cols-6">
                <input type="hidden" name="return" value={RET} />
                <input type="hidden" name="id" value={c.id} />
                <Input name="position" type="number" defaultValue={c.position} aria-label="Ordem" className="sm:col-span-1" />
                <Input name="name" defaultValue={c.name} aria-label="Nome" className="sm:col-span-2" />
                <Input name="description" defaultValue={c.description ?? ""} aria-label="Descrição" className="sm:col-span-3" />
                <div className="flex flex-wrap items-center gap-2 sm:col-span-6">
                  <Button type="submit" size="sm" variant="outline" name="is_active" value="true">Salvar{c.is_active ? "" : " e ativar"}</Button>
                  {c.is_active && <Button type="submit" size="sm" variant="ghost" name="is_active" value="false">Desativar</Button>}
                  <span className="text-xs text-muted-foreground">/{c.slug}</span>
                </div>
              </form>
            </li>
          ))}
        </ul>
        <form action={saveForumCategory} className="grid gap-2 rounded-xl border border-dashed p-3 sm:grid-cols-6">
          <input type="hidden" name="return" value={RET} />
          <p className="text-sm font-medium sm:col-span-6">+ Nova categoria</p>
          <Input name="position" type="number" defaultValue={(cats?.length ?? 0) + 1} aria-label="Ordem" className="sm:col-span-1" />
          <Input name="name" placeholder="Nome" aria-label="Nome" className="sm:col-span-2" />
          <Input name="description" placeholder="Descrição" aria-label="Descrição" className="sm:col-span-3" />
          <div className="sm:col-span-6"><Button type="submit" size="sm">Criar categoria</Button></div>
        </form>
      </section>
    </div>
  );
}
