import Link from "next/link";
import { MessageCircle, Plus, Trees } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadAuthors } from "@/components/comunidade/forum-ui";
import { TopicList } from "@/components/comunidade/topic-list";
import { CategoryIcon, categoryTheme } from "@/components/comunidade/category-icon";
import { KeneRule } from "@/components/brand/kene";

export default async function ComunidadePage() {
  const supabase = await createClient();
  const [{ data: cats }, { data: topics }] = await Promise.all([
    supabase.from("forum_categories").select("id,slug,name,description").eq("is_active", true).order("position"),
    supabase.from("forum_topics").select("id,category_id,author_id,title,is_pinned,is_locked,is_hidden,reply_count,last_activity_at,created_at")
      .order("last_activity_at", { ascending: false }).limit(60),
  ]);
  const all = topics ?? [];
  const recent = all.slice(0, 15);
  const authors = await loadAuthors(supabase, recent.map((t) => t.author_id));
  const counts = new Map<string, number>();
  all.forEach((t) => counts.set(t.category_id, (counts.get(t.category_id) ?? 0) + 1));
  const names = new Map((cats ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-floresta/12 text-floresta" aria-hidden="true">
            <Trees className="size-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight">Comunidade</h1>
            <p className="text-sm text-muted-foreground">A floresta conversa.</p>
          </div>
        </div>
        <Link
          href="/comunidade/novo"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(255,198,26,0.6)]"
        >
          <Plus className="size-4" aria-hidden="true" /> Novo tópico
        </Link>
      </header>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3" aria-label="Categorias">
        {(cats ?? []).map((c) => {
          const n = counts.get(c.id) ?? 0;
          return (
            <li key={c.id}>
              <Link
                href={`/comunidade/c/${c.slug}`}
                title={c.description ?? undefined}
                className="surface surface-hover group flex h-full flex-col items-start gap-4 p-4"
              >
                <div className="flex w-full items-start justify-between">
                  <CategoryIcon slug={c.slug} size="lg" />
                  <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                    <MessageCircle className="size-3" aria-hidden="true" /> {n}
                    <span className="sr-only"> tópico(s) recentes</span>
                  </span>
                </div>
                <div>
                  <p className="font-display text-base font-bold leading-tight">{c.name}</p>
                  <p className="mt-0.5 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                    {categoryTheme(c.slug).tag}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <section className="space-y-3" aria-label="Tópicos recentes">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">Na clareira agora</h2>
          <KeneRule motif="pushu" height={6} opacity={0.15} className="flex-1 text-amarelo" />
        </div>
        <TopicList topics={recent} authors={authors} categoryNames={names} />
      </section>
    </div>
  );
}
