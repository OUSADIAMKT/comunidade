"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { done, requireAdmin, slugify, str } from "@/lib/admin-guard";
import { UUID_RE, parseYouTubeId } from "@/lib/escola";
import { isHttpUrl } from "@/lib/constants";

const intOr = (v: string, d: number) => (Number.isFinite(Number(v)) && v !== "" ? Math.floor(Number(v)) : d);

export async function saveCourse(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, "id");
  const title = str(fd, "title");
  const access = str(fd, "access_level") === "PRO" ? "PRO" : "FREE";
  const status = str(fd, "status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const cover = str(fd, "cover_url");
  const external = str(fd, "external_url");
  const passScore = intOr(str(fd, "pass_score"), 70);

  if (title.length < 3) return done(fd, "Informe o título do curso.");
  if (cover && !isHttpUrl(cover)) return done(fd, "A URL da capa é inválida.");
  if (passScore < 1 || passScore > 100) return done(fd, "A nota mínima deve ficar entre 1 e 100.");
  if (access === "PRO" && status === "PUBLISHED" && !external && !id) return done(fd, "Curso PRO precisa do link do HeroSpark.");
  if (external && !isHttpUrl(external)) return done(fd, "O link do HeroSpark é inválido.");

  const payload = {
    title,
    description: str(fd, "description") || null,
    cover_url: cover || null,
    access_level: access,
    level: str(fd, "level") || "Iniciante",
    estimated_hours: Math.max(0, Number(str(fd, "estimated_hours").replace(",", ".")) || 1),
    instructor_name: str(fd, "instructor_name") || null,
    status,
    display_order: intOr(str(fd, "display_order"), 0),
    pass_score: passScore,
    updated_at: new Date().toISOString(),
  };

  let courseId = id;
  if (id) {
    if (!UUID_RE.test(id)) return done(fd, "Curso inválido.");
    const { error } = await supabase.from("courses").update(payload).eq("id", id);
    if (error) return done(fd, "Não foi possível salvar o curso.");
  } else {
    const slug = slugify(str(fd, "slug") || title);
    const { data, error } = await supabase.from("courses").insert({ ...payload, slug }).select("id").single();
    if (error || !data) return done(fd, error?.code === "23505" ? "Já existe um curso com esse endereço (slug)." : "Não foi possível criar o curso.");
    courseId = data.id;
  }

  if (access === "PRO") {
    if (external) {
      const { error } = await supabase.from("course_private_links").upsert({ course_id: courseId, external_url: external });
      if (error) return done(fd, "Curso salvo, mas o link do HeroSpark falhou.");
    }
  } else {
    await supabase.from("course_private_links").delete().eq("course_id", courseId);
  }

  revalidatePath("/escola", "layout");
  if (!id) redirect(`/admin/escola/${courseId}`);
  done(fd);
}

export async function deleteCourse(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, "id");
  if (!UUID_RE.test(id)) return done(fd, "Curso inválido.");
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) return done(fd, "Não foi possível excluir o curso.");
  revalidatePath("/escola", "layout");
  redirect("/admin/escola");
}

export async function saveLesson(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, "id");
  const courseId = str(fd, "course_id");
  const title = str(fd, "title");
  const yt = parseYouTubeId(str(fd, "youtube"));
  if (!UUID_RE.test(courseId)) return done(fd, "Curso inválido.");
  if (title.length < 2) return done(fd, "Informe o título da aula.");
  if (!yt) return done(fd, "Link do YouTube inválido. Cole o link do vídeo (pode ser não listado).");

  const payload = {
    title,
    description: str(fd, "description") || null,
    youtube_id: yt,
    position: intOr(str(fd, "position"), 0),
    duration_minutes: Math.max(0, intOr(str(fd, "duration_minutes"), 0)),
  };
  const res = id && UUID_RE.test(id)
    ? await supabase.from("lessons").update(payload).eq("id", id)
    : await supabase.from("lessons").insert({ ...payload, course_id: courseId });
  if (res.error) return done(fd, "Não foi possível salvar a aula.");
  revalidatePath("/escola", "layout");
  done(fd);
}

export async function deleteLesson(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, "id");
  if (!UUID_RE.test(id)) return done(fd, "Aula inválida.");
  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) return done(fd, "Não foi possível excluir a aula.");
  revalidatePath("/escola", "layout");
  done(fd);
}

export async function saveQuestion(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, "id");
  const courseId = str(fd, "course_id");
  const prompt = str(fd, "prompt");
  // mantém só as preenchidas, lembrando em que posição original cada uma estava
  const filled = [1, 2, 3, 4, 5, 6]
    .map((n) => ({ text: str(fd, `option_${n}`), slot: n - 1 }))
    .filter((o) => o.text);
  const options = filled.map((o) => o.text);
  const selectedSlot = intOr(str(fd, "correct_index"), 0);
  const correct = filled.findIndex((o) => o.slot === selectedSlot);
  if (!UUID_RE.test(courseId)) return done(fd, "Curso inválido.");
  if (prompt.length < 3) return done(fd, "Escreva o enunciado da pergunta.");
  if (options.length < 2) return done(fd, "Informe pelo menos 2 alternativas.");
  if (correct < 0) return done(fd, "Marque como correta uma das alternativas preenchidas.");

  const payload = { prompt, options, correct_index: correct, position: intOr(str(fd, "position"), 0) };
  const res = id && UUID_RE.test(id)
    ? await supabase.from("exam_questions").update(payload).eq("id", id)
    : await supabase.from("exam_questions").insert({ ...payload, course_id: courseId });
  if (res.error) return done(fd, "Não foi possível salvar a pergunta.");
  done(fd);
}

export async function deleteQuestion(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, "id");
  if (!UUID_RE.test(id)) return done(fd, "Pergunta inválida.");
  const { error } = await supabase.from("exam_questions").delete().eq("id", id);
  if (error) return done(fd, "Não foi possível excluir a pergunta.");
  done(fd);
}
