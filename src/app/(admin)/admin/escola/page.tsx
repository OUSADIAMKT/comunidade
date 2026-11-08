import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/shared/select";
import { ErrorBanner, Pill } from "@/components/admin/admin-ui";
import { saveCourse } from "./actions";

type SP = Record<string, string | string[] | undefined>;

export default async function AdminEscolaPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: courses }, { data: lessons }, { data: questions }, { data: certs }] = await Promise.all([
    supabase.from("courses").select("id,slug,title,access_level,status,estimated_hours,display_order").order("display_order").order("created_at", { ascending: false }),
    supabase.from("lessons").select("course_id"),
    supabase.from("exam_questions").select("course_id"),
    supabase.from("certificates").select("course_id"),
  ]);
  const count = (rows: { course_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.course_id === id).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Escola</h1>
        <p className="text-sm text-muted-foreground">
          Cursos <strong>grátis</strong> usam aulas em vídeo do YouTube (não listado) com prova e certificado. Cursos <strong>PRO</strong> ficam no HeroSpark: todos veem o curso, só quem tem plano pago recebe o link.
        </p>
      </div>
      <ErrorBanner sp={sp} />

      <details className="rounded-xl border">
        <summary className="cursor-pointer p-3 font-medium">+ Novo curso</summary>
        <form action={saveCourse} className="grid gap-3 border-t p-3 sm:grid-cols-2">
          <input type="hidden" name="return" value="/admin/escola" />
          <label className="text-sm sm:col-span-2">Título<Input name="title" required /></label>
          <label className="text-sm">Acesso
            <NativeSelect name="access_level" defaultValue="FREE">
              <option value="FREE">Grátis (aulas no YouTube + prova)</option>
              <option value="PRO">PRO (HeroSpark)</option>
            </NativeSelect>
          </label>
          <label className="text-sm">Link do HeroSpark (só PRO)<Input name="external_url" type="url" placeholder="https://" /></label>
          <label className="text-sm">Status
            <NativeSelect name="status" defaultValue="DRAFT"><option value="DRAFT">Rascunho</option><option value="PUBLISHED">Publicado</option></NativeSelect>
          </label>
          <div className="flex items-end"><Button type="submit">Criar curso</Button></div>
        </form>
      </details>

      <ul className="divide-y rounded-xl border">
        {(courses ?? []).length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhum curso cadastrado.</li>}
        {(courses ?? []).map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div>
              <Link href={`/admin/escola/${c.id}`} className="font-medium underline-offset-2 hover:underline">{c.title}</Link>
              <p className="text-xs text-muted-foreground">
                /{c.slug}
                {c.access_level === "FREE" && ` · ${count(lessons, c.id)} aula(s) · ${count(questions, c.id)} pergunta(s) · ${count(certs, c.id)} certificado(s)`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Pill tone={c.access_level === "PRO" ? "warn" : "ok"}>{c.access_level === "PRO" ? "PRO" : "Grátis"}</Pill>
              <Pill tone={c.status === "PUBLISHED" ? "ok" : "muted"}>{c.status === "PUBLISHED" ? "Publicado" : "Rascunho"}</Pill>
              <Link href={`/admin/escola/${c.id}`} className="underline">Editar</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
