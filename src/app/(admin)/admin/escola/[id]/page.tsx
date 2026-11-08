import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/shared/select";
import { ErrorBanner, Pill } from "@/components/admin/admin-ui";
import { COURSE_LEVELS, UUID_RE } from "@/lib/escola";
import { deleteCourse, deleteLesson, deleteQuestion, saveCourse, saveLesson, saveQuestion } from "../actions";

type SP = Record<string, string | string[] | undefined>;

export default async function AdminCursoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();

  const { data: course } = await supabase.from("courses").select("*").eq("id", id).maybeSingle();
  if (!course) notFound();
  const [{ data: link }, { data: lessons }, { data: questions }] = await Promise.all([
    supabase.from("course_private_links").select("external_url").eq("course_id", id).maybeSingle(),
    supabase.from("lessons").select("*").eq("course_id", id).order("position"),
    supabase.from("exam_questions").select("*").eq("course_id", id).order("position"),
  ]);
  const ret = `/admin/escola/${id}`;
  const isFree = course.access_level === "FREE";

  return (
    <div className="space-y-8">
      <Link href="/admin/escola" className="text-sm text-muted-foreground hover:underline">← Cursos</Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{course.title}</h1>
        <Pill tone={course.access_level === "PRO" ? "warn" : "ok"}>{course.access_level === "PRO" ? "PRO" : "Grátis"}</Pill>
        <Pill tone={course.status === "PUBLISHED" ? "ok" : "muted"}>{course.status === "PUBLISHED" ? "Publicado" : "Rascunho"}</Pill>
        {course.status === "PUBLISHED" && <Link href={`/escola/${course.slug}`} target="_blank" className="text-sm underline">Ver como aluno ↗</Link>}
      </div>
      <ErrorBanner sp={sp} />

      <section className="space-y-3" aria-label="Dados do curso">
        <h2 className="font-semibold">Dados do curso</h2>
        <form action={saveCourse} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="return" value={ret} />
          <input type="hidden" name="id" value={id} />
          <label className="text-sm sm:col-span-2">Título<Input name="title" defaultValue={course.title} /></label>
          <label className="text-sm sm:col-span-2">Descrição<Textarea name="description" rows={4} defaultValue={course.description ?? ""} /></label>
          <label className="text-sm sm:col-span-2">URL da capa (imagem)<Input name="cover_url" type="url" defaultValue={course.cover_url ?? ""} placeholder="https://" /></label>
          <label className="text-sm">Acesso
            <NativeSelect name="access_level" defaultValue={course.access_level}>
              <option value="FREE">Grátis (aulas no YouTube + prova)</option>
              <option value="PRO">PRO (HeroSpark)</option>
            </NativeSelect>
          </label>
          <label className="text-sm">Status
            <NativeSelect name="status" defaultValue={course.status}><option value="DRAFT">Rascunho</option><option value="PUBLISHED">Publicado</option></NativeSelect>
          </label>
          <label className="text-sm sm:col-span-2">Link do HeroSpark (cursos PRO — nunca aparece para quem não tem plano)
            <Input name="external_url" type="url" defaultValue={link?.external_url ?? ""} placeholder="https://" />
          </label>
          <label className="text-sm">Nível
            <NativeSelect name="level" defaultValue={course.level ?? "Iniciante"}>{COURSE_LEVELS.map((l) => <option key={l}>{l}</option>)}</NativeSelect>
          </label>
          <label className="text-sm">Carga horária (h)<Input name="estimated_hours" type="number" step="0.5" min={0} defaultValue={Number(course.estimated_hours)} /></label>
          <label className="text-sm">Instrutor(a)<Input name="instructor_name" defaultValue={course.instructor_name ?? ""} /></label>
          <label className="text-sm">Ordem na lista<Input name="display_order" type="number" defaultValue={course.display_order} /></label>
          <label className="text-sm">Nota mínima na prova (%)<Input name="pass_score" type="number" min={1} max={100} defaultValue={course.pass_score} /></label>
          <div className="flex items-end gap-2 sm:col-span-2">
            <Button type="submit">Salvar curso</Button>
          </div>
        </form>
        <form action={deleteCourse}>
          <input type="hidden" name="return" value={ret} />
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="ghost" size="sm">Excluir curso (apaga aulas, perguntas e certificados)</Button>
        </form>
      </section>

      {isFree && (
        <>
          <section className="space-y-3" aria-label="Aulas">
            <h2 className="font-semibold">Aulas ({lessons?.length ?? 0})</h2>
            <ul className="space-y-2">
              {(lessons ?? []).map((l) => (
                <li key={l.id} className="rounded-xl border p-3">
                  <form action={saveLesson} className="grid gap-2 sm:grid-cols-6">
                    <input type="hidden" name="return" value={ret} />
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="course_id" value={id} />
                    <Input name="position" type="number" defaultValue={l.position} aria-label="Ordem" className="sm:col-span-1" />
                    <Input name="title" defaultValue={l.title} aria-label="Título" className="sm:col-span-3" />
                    <Input name="duration_minutes" type="number" min={0} defaultValue={l.duration_minutes} aria-label="Minutos" className="sm:col-span-1" />
                    <Input name="youtube" defaultValue={`https://youtu.be/${l.youtube_id}`} aria-label="Link do YouTube" className="sm:col-span-3" />
                    <Input name="description" defaultValue={l.description ?? ""} placeholder="Descrição (opcional)" aria-label="Descrição" className="sm:col-span-3" />
                    <div className="flex gap-2 sm:col-span-6">
                      <Button type="submit" size="sm" variant="outline">Salvar aula</Button>
                    </div>
                  </form>
                  <form action={deleteLesson} className="mt-1">
                    <input type="hidden" name="return" value={ret} />
                    <input type="hidden" name="id" value={l.id} />
                    <Button type="submit" size="sm" variant="ghost">Excluir</Button>
                  </form>
                </li>
              ))}
            </ul>
            <form action={saveLesson} className="grid gap-2 rounded-xl border border-dashed p-3 sm:grid-cols-6">
              <input type="hidden" name="return" value={ret} />
              <input type="hidden" name="course_id" value={id} />
              <p className="text-sm font-medium sm:col-span-6">+ Nova aula</p>
              <Input name="position" type="number" defaultValue={(lessons?.length ?? 0) + 1} aria-label="Ordem" className="sm:col-span-1" />
              <Input name="title" placeholder="Título da aula" aria-label="Título" className="sm:col-span-3" />
              <Input name="duration_minutes" type="number" min={0} placeholder="min" aria-label="Minutos" className="sm:col-span-1" />
              <Input name="youtube" placeholder="Link do YouTube (não listado)" aria-label="Link do YouTube" className="sm:col-span-3" />
              <Input name="description" placeholder="Descrição (opcional)" aria-label="Descrição" className="sm:col-span-3" />
              <div className="sm:col-span-6"><Button type="submit" size="sm">Adicionar aula</Button></div>
            </form>
          </section>

          <section className="space-y-3" aria-label="Prova">
            <div>
              <h2 className="font-semibold">Prova ({questions?.length ?? 0} pergunta(s))</h2>
              <p className="text-xs text-muted-foreground">O aluno só vê a prova depois de concluir todas as aulas, e o gabarito nunca é enviado ao navegador. Aprovação com {course.pass_score}% ou mais gera o certificado.</p>
            </div>
            <ul className="space-y-2">
              {(questions ?? []).map((q) => {
                const opts = q.options as string[];
                return (
                  <li key={q.id} className="rounded-xl border p-3">
                    <QuestionForm ret={ret} courseId={id} q={{ id: q.id, prompt: q.prompt, options: opts, correct: q.correct_index, position: q.position }} />
                    <form action={deleteQuestion} className="mt-1">
                      <input type="hidden" name="return" value={ret} />
                      <input type="hidden" name="id" value={q.id} />
                      <Button type="submit" size="sm" variant="ghost">Excluir</Button>
                    </form>
                  </li>
                );
              })}
            </ul>
            <div className="rounded-xl border border-dashed p-3">
              <p className="mb-2 text-sm font-medium">+ Nova pergunta</p>
              <QuestionForm ret={ret} courseId={id} q={{ id: "", prompt: "", options: [], correct: 0, position: (questions?.length ?? 0) + 1 }} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function QuestionForm({ ret, courseId, q }: { ret: string; courseId: string; q: { id: string; prompt: string; options: string[]; correct: number; position: number } }) {
  return (
    <form action={saveQuestion} className="grid gap-2">
      <input type="hidden" name="return" value={ret} />
      <input type="hidden" name="course_id" value={courseId} />
      {q.id && <input type="hidden" name="id" value={q.id} />}
      <div className="grid gap-2 sm:grid-cols-6">
        <Input name="position" type="number" defaultValue={q.position} aria-label="Ordem" className="sm:col-span-1" />
        <Input name="prompt" defaultValue={q.prompt} placeholder="Enunciado da pergunta" aria-label="Enunciado" className="sm:col-span-5" />
      </div>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="radio" name="correct_index" value={i} defaultChecked={q.correct === i} aria-label={`Alternativa ${i + 1} é a correta`} />
          <Input name={`option_${i + 1}`} defaultValue={q.options[i] ?? ""} placeholder={`Alternativa ${i + 1}${i >= 2 ? " (opcional)" : ""}`} aria-label={`Alternativa ${i + 1}`} />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Marque o círculo da alternativa correta.</p>
      <div><Button type="submit" size="sm" variant="outline">{q.id ? "Salvar pergunta" : "Adicionar pergunta"}</Button></div>
    </form>
  );
}
