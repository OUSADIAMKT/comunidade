import { CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClaimButton } from "./claim-button";

export default async function CursoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: course } = await supabase.from("courses").select("*").eq("slug", slug).eq("status", "PUBLISHED").maybeSingle();
  if (!course) notFound();
  const isPro = course.access_level === "PRO";

  const [{ data: lessons }, { data: progress }, { data: cert }, { data: me }, { data: externalUrl }] = await Promise.all([
    supabase.from("lessons").select("id,title,duration_minutes,position").eq("course_id", course.id).order("position"),
    supabase.from("lesson_progress").select("lesson_id").eq("user_id", user!.id),
    supabase.from("certificates").select("code").eq("user_id", user!.id).eq("course_id", course.id).maybeSingle(),
    supabase.from("users").select("active_context").eq("id", user!.id).single(),
    isPro ? supabase.rpc("get_course_external_url", { p_course: course.id }) : Promise.resolve({ data: null }),
  ]);
  const { data: hasExam } = isPro ? { data: false } : await supabase.rpc("course_has_exam", { p_course: course.id });

  const done = new Set((progress ?? []).map((p) => p.lesson_id));
  const list = lessons ?? [];
  const doneCount = list.filter((l) => done.has(l.id)).length;
  const allDone = list.length > 0 && doneCount === list.length;
  const next = list.find((l) => !done.has(l.id)) ?? list[0];
  const planHref = me?.active_context === "COMPANY" ? "/empresa/plano" : "/profissional/plano";

  return (
    <div className="space-y-6">
      <Link href="/escola" className="text-sm text-muted-foreground hover:underline">← Escola</Link>
      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${isPro ? "bg-amarelo text-[#1a1405]" : "bg-floresta text-[#06150e]"}`}>
            {isPro ? "Curso PRO" : "Curso grátis"}
          </span>
          <h1 className="text-3xl font-bold">{course.title}</h1>
          <p className="text-sm text-muted-foreground">
            {course.level} · {Number(course.estimated_hours)}h{course.instructor_name && ` · com ${course.instructor_name}`}
          </p>
          {course.description && <p className="whitespace-pre-line">{course.description}</p>}
        </div>
        {course.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.cover_url} alt="" className="aspect-video w-full rounded-xl object-cover" />
        )}
      </div>

      {isPro ? (
        <section className="space-y-3 rounded-xl border p-6" aria-label="Acesso ao curso PRO">
          {externalUrl ? (
            <>
              <h2 className="text-lg font-semibold"><CheckCircle2 className="mr-2 inline size-5 text-floresta" aria-hidden="true" />Você tem acesso a este curso</h2>
              <p className="text-sm text-muted-foreground">Este curso fica na plataforma HeroSpark. Clique para abrir em uma nova aba.</p>
              <a href={externalUrl} target="_blank" rel="noreferrer noopener"
                className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground">
                Acessar no HeroSpark ↗
              </a>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold"><Lock className="mr-2 inline size-5 text-amarelo" aria-hidden="true" />Conteúdo premium</h2>
              <p className="text-sm text-muted-foreground">
                Este curso faz parte do conteúdo premium da Ousadia, liberado para empresas com plano Premium. É creator e quer fazer este curso? Fale com a nossa equipe.
              </p>
              <Link href={planHref} className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground">Ver planos</Link>
            </>
          )}
        </section>
      ) : (
        <>
          <section className="space-y-3 rounded-xl border p-4" aria-label="Aulas">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Aulas ({doneCount}/{list.length})</h2>
              {next && (
                <Link href={`/escola/${course.slug}/aula/${next.id}`} className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
                  {doneCount === 0 ? "Começar o curso" : allDone ? "Rever aulas" : "Continuar"}
                </Link>
              )}
            </div>
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">As aulas deste curso estão sendo preparadas.</p>
            ) : (
              <ol className="divide-y">
                {list.map((l, i) => (
                  <li key={l.id}>
                    <Link href={`/escola/${course.slug}/aula/${l.id}`} className="flex items-center gap-3 py-2 text-sm hover:underline">
                      <span aria-hidden className={`flex size-6 items-center justify-center rounded-full border text-xs ${done.has(l.id) ? "border-floresta bg-floresta text-[#06150e]" : ""}`}>
                        {done.has(l.id) ? "✓" : i + 1}
                      </span>
                      <span className="flex-1">{l.title}</span>
                      {l.duration_minutes > 0 && <span className="text-xs text-muted-foreground">{l.duration_minutes} min</span>}
                      <span className="sr-only">{done.has(l.id) ? "concluída" : "pendente"}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="space-y-2 rounded-xl border p-4" aria-label={hasExam ? "Prova e certificado" : "Certificado"}>
            <h2 className="font-semibold">{hasExam ? "Prova e certificado" : "Certificado"}</h2>
            {cert ? (
              <>
                <p className="text-sm">{hasExam ? "Parabéns! Você já foi aprovado neste curso." : "Parabéns! Você concluiu este curso."}</p>
                <Link href={`/certificado/${cert.code}`} className="text-sm underline">Ver meu certificado</Link>
              </>
            ) : !hasExam ? (
              allDone ? (
                <>
                  <p className="text-sm text-muted-foreground">Você concluiu todas as aulas. Seu certificado está liberado.</p>
                  <ClaimButton courseId={course.id} />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Conclua todas as aulas para receber o certificado.</p>
              )
            ) : allDone ? (
              <>
                <p className="text-sm text-muted-foreground">Você concluiu todas as aulas. Acerte pelo menos {course.pass_score}% da prova para receber o certificado.</p>
                <Link href={`/escola/${course.slug}/prova`} className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">Fazer a prova</Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Conclua todas as aulas para liberar a prova. Aprovação com {course.pass_score}% ou mais gera o certificado.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
