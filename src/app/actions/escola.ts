"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/escola";

export type ExamResult = {
  ok: boolean; error?: string;
  score?: number; passed?: boolean; passScore?: number; correct?: number; total?: number; certificateCode?: string | null;
};

export async function setLessonDone(lessonId: string, done: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!UUID_RE.test(lessonId)) return { ok: false, error: "Aula inválida." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const res = done
    ? await supabase.from("lesson_progress").upsert({ user_id: user.id, lesson_id: lessonId }, { onConflict: "user_id,lesson_id", ignoreDuplicates: true })
    : await supabase.from("lesson_progress").delete().eq("user_id", user.id).eq("lesson_id", lessonId);
  if (res.error) return { ok: false, error: "Não foi possível salvar seu progresso." };
  revalidatePath("/escola", "layout");
  return { ok: true };
}

export async function submitExam(courseId: string, answers: Record<string, number>): Promise<ExamResult> {
  if (!UUID_RE.test(courseId)) return { ok: false, error: "Curso inválido." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const { data, error } = await supabase.rpc("submit_exam", { p_course: courseId, p_answers: answers });
  if (error) {
    const m = error.message;
    return {
      ok: false,
      error: m.includes("EXAM_COOLDOWN") ? "Aguarde 5 minutos para tentar de novo. Aproveite para rever as aulas!"
        : m.includes("LESSONS_INCOMPLETE") ? "Conclua todas as aulas antes de fazer a prova."
        : "Não foi possível corrigir a prova agora.",
    };
  }
  revalidatePath("/escola", "layout");
  const r = data as { score: number; passed: boolean; pass_score: number; correct: number; total: number; certificate_code: string | null };
  return { ok: true, score: r.score, passed: r.passed, passScore: r.pass_score, correct: r.correct, total: r.total, certificateCode: r.certificate_code };
}

export async function claimCertificate(courseId: string): Promise<{ ok: boolean; error?: string; code?: string }> {
  if (!UUID_RE.test(courseId)) return { ok: false, error: "Curso inválido." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const { data, error } = await supabase.rpc("claim_certificate", { p_course: courseId });
  if (error) {
    const m = error.message;
    return {
      ok: false,
      error: m.includes("LESSONS_INCOMPLETE") ? "Conclua todas as aulas para receber o certificado."
        : m.includes("EXAM_REQUIRED") ? "Este curso tem prova. Faça a prova para receber o certificado."
        : "Não foi possível emitir o certificado agora.",
    };
  }
  revalidatePath("/escola", "layout");
  return { ok: true, code: (data as { certificate_code: string }).certificate_code };
}
