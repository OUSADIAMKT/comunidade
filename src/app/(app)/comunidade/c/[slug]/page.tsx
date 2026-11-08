import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadAuthors } from "@/components/comunidade/forum-ui";
import { TopicList } from "@/components/comunidade/topic-list";

export default async function CategoriaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: cat } = await supabase.from("forum_categories").select("id,slug,name,description").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!cat) notFound();

  const { data: topics } = await supabase.from("forum_topics")
    .select("id,category_id,author_id,title,is_pinned,is_locked,is_hidden,reply_count,created_at")
    .eq("category_id", cat.id).order("is_pinned", { ascending: false }).order("last_activity_at", { ascending: false }).limit(60);
  const authors = await loadAuthors(supabase, (topics ?? []).map((t) => t.author_id));

  return (
    <div className="space-y-4">
      <Link href="/comunidade" className="text-sm text-muted-foreground hover:underline">← Comunidade</Link>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{cat.name}</h1>
          <p className="text-sm text-muted-foreground">{cat.description}</p>
        </div>
        <Link href={`/comunidade/novo?categoria=${cat.slug}`} className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">+ Novo tópico</Link>
      </div>
      <TopicList topics={topics ?? []} authors={authors} />
    </div>
  );
}
