import { Lock, Pin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/escola";
import { AuthorBadge, loadAuthors, timeAgo } from "@/components/comunidade/forum-ui";
import { ContentActions, AdminTopicControls } from "./topic-actions";
import { ReplyForm } from "./reply-form";

export default async function TopicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: topic } = await supabase.from("forum_topics").select("*").eq("id", id).maybeSingle();
  if (!topic) notFound();

  const [{ data: posts }, { data: cat }, { data: me }, { data: topicLikes }] = await Promise.all([
    supabase.from("forum_posts").select("*").eq("topic_id", id).order("created_at").limit(300),
    supabase.from("forum_categories").select("slug,name").eq("id", topic.category_id).single(),
    supabase.from("users").select("is_admin").eq("id", user!.id).single(),
    supabase.from("forum_likes").select("user_id").eq("topic_id", id),
  ]);
  const list = posts ?? [];
  const postIds = list.map((p) => p.id);
  const { data: postLikes } = postIds.length
    ? await supabase.from("forum_likes").select("user_id,post_id").in("post_id", postIds)
    : { data: [] as { user_id: string; post_id: string }[] };
  const authors = await loadAuthors(supabase, [topic.author_id, ...list.map((p) => p.author_id)]);

  const likeInfo = (rows: { user_id: string }[] | null) => ({ count: rows?.length ?? 0, mine: !!rows?.some((r) => r.user_id === user!.id) });
  const isAdmin = !!me?.is_admin;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/comunidade/c/${cat?.slug}`} className="text-sm text-muted-foreground hover:underline">← {cat?.name}</Link>

      <article className="space-y-3 rounded-xl border p-5">
        {topic.is_hidden && (
          <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive" role="status">
            Este tópico foi ocultado por denúncias e está em revisão. Só você e a moderação o veem.
          </p>
        )}
        <h1 className="text-2xl font-bold">{topic.is_pinned && <Pin className="mr-1 inline size-5 text-amarelo" aria-label="Fixado" />}{topic.is_locked && <Lock className="mr-1 inline size-5" aria-label="Trancado" />}{topic.title}</h1>
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <AuthorBadge a={authors.get(topic.author_id)} /> <span>· {timeAgo(topic.created_at)}</span>
        </p>
        <p className="whitespace-pre-line break-words">{topic.body}</p>
        <ContentActions kind="topic" id={topic.id} isMine={topic.author_id === user!.id} like={likeInfo(topicLikes)} />
        {isAdmin && <AdminTopicControls id={topic.id} pinned={topic.is_pinned} locked={topic.is_locked} hidden={topic.is_hidden} />}
      </article>

      <section className="space-y-3" aria-label="Respostas">
        <h2 className="font-semibold">{list.filter((p) => !p.is_hidden).length} resposta(s)</h2>
        {list.map((p) => (
          <div key={p.id} className="space-y-2 rounded-xl border p-4">
            {p.is_hidden && <p className="text-xs text-destructive">Oculta por denúncias (em revisão).</p>}
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <AuthorBadge a={authors.get(p.author_id)} /> <span>· {timeAgo(p.created_at)}</span>
            </p>
            <p className="whitespace-pre-line break-words text-sm">{p.body}</p>
            <ContentActions kind="post" id={p.id} isMine={p.author_id === user!.id}
              like={likeInfo((postLikes ?? []).filter((l) => l.post_id === p.id))} />
          </div>
        ))}
      </section>

      {topic.is_locked && !isAdmin ? (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground"><Lock className="mr-1 inline size-4" aria-hidden="true" />Este tópico foi trancado e não aceita novas respostas.</p>
      ) : topic.is_hidden ? null : (
        <ReplyForm topicId={topic.id} />
      )}
    </div>
  );
}
