import Link from "next/link";
import { Lock, MessageCircle, Pin, Sprout } from "lucide-react";
import { AuthorBadge, timeAgo, type Author } from "./forum-ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function TopicList({ topics, authors, categoryNames }: { topics: any[]; authors: Map<string, Author>; categoryNames?: Map<string, string> }) {
  if (topics.length === 0) {
    return (
      <div className="surface flex flex-col items-center gap-2 border-dashed p-10 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-floresta/12 text-floresta" aria-hidden="true">
          <Sprout className="size-6" />
        </span>
        <p className="font-display font-bold">Silêncio na mata</p>
        <p className="text-sm text-muted-foreground">Plante o primeiro tópico.</p>
      </div>
    );
  }
  return (
    <ul className="surface divide-y divide-border overflow-hidden">
      {topics.map((t) => (
        <li key={t.id}>
          <Link href={`/comunidade/t/${t.id}`} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-foreground/5">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="flex items-center gap-1.5 font-medium">
                {t.is_pinned && <Pin className="size-3.5 shrink-0 text-amarelo" aria-label="Fixado" />}
                {t.is_locked && <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label="Trancado" />}
                <span className="truncate">{t.title}</span>
              </p>
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <AuthorBadge a={authors.get(t.author_id)} />
                <span>· {timeAgo(t.created_at)}</span>
                {categoryNames?.get(t.category_id) && <span className="hidden sm:inline">· {categoryNames.get(t.category_id)}</span>}
                {t.is_hidden && <span className="text-destructive">· oculto por denúncias</span>}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground" aria-label={`${t.reply_count} respostas`}>
              <MessageCircle className="size-4" aria-hidden="true" /> {t.reply_count}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
