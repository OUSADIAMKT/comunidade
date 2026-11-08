import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExamForm } from "./exam-form";

type Question = { id: string; prompt: string; options: string[] };

export default async function ProvaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: course } = await supabase.from("courses").select("id,slug,title,access_level,pass_score").eq("slug", slug).eq("status", "PUBLISHED").maybeSingle();
  if (!course || course.access_level !== "FREE") notFound();

  const { data: cert } = await supabase.from("certificates").select("code").eq("user_id", user!.id).eq("course_id", course.id).maybeSingle();
  const { data, error } = await supabase.rpc("get_exam_questions", { p_course: course.id });

  const back = <Link href={`/escola/${course.slug}`} className="text-sm text-muted-foreground hover:underline">← {course.title}</Link>;

  if (error || !data) {
    const m = error?.message ?? "";
    return (
      <div className="space-y-3">
        {back}
        <h1 className="text-xl font-semibold">Prova</h1>
        <p className="rounded-xl border p-4 text-sm">
          {m.includes("LESSONS_INCOMPLETE") ? "Conclua todas as aulas do curso para liberar a prova."
            : m.includes("NO_EXAM") ? "Este curso ainda não tem prova cadastrada."
            : "Não foi possível carregar a prova agora."}
        </p>
        {cert && <Link href={`/certificado/${cert.code}`} className="text-sm underline">Ver meu certificado</Link>}
      </div>
    );
  }

  const exam = data as { pass_score: number; questions: Question[] };
  return (
    <div className="space-y-4">
      {back}
      <div>
        <h1 className="text-xl font-semibold">Prova — {course.title}</h1>
        <p className="text-sm text-muted-foreground">
          {exam.questions.length} questão(ões). Você precisa acertar pelo menos {exam.pass_score}% para receber o certificado.
          {cert && <> Você já tem certificado deste curso: <Link href={`/certificado/${cert.code}`} className="underline">ver</Link>.</>}
        </p>
      </div>
      <ExamForm courseId={course.id} courseSlug={course.slug} questions={exam.questions} />
    </div>
  );
}
