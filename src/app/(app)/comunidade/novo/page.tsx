import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewTopicForm } from "./new-topic-form";

type SP = Record<string, string | string[] | undefined>;

export default async function NovoTopicoPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const slug = Array.isArray(sp.categoria) ? sp.categoria[0] : sp.categoria;
  const supabase = await createClient();
  const { data: cats } = await supabase.from("forum_categories").select("id,slug,name").eq("is_active", true).order("position");
  const preselected = (cats ?? []).find((c) => c.slug === slug)?.id ?? "";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/comunidade" className="text-sm text-muted-foreground hover:underline">← Comunidade</Link>
      <h1 className="text-2xl font-bold">Novo tópico</h1>
      <NewTopicForm categories={cats ?? []} preselected={preselected} />
    </div>
  );
}
