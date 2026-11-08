import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UUID_RE, youtubeEmbed } from "@/lib/escola";
import { LessonControls } from "./lesson-controls";

export default async function AulaPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const { slug, lessonId } = await params;
  if (!UUID_RE.test(lessonId)) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: course } = await supabase.from("courses").select("id,slug,title,access_level").eq("slug", slug).eq("status", "PUBLISHED").maybeSingle();
  if (!course || course.access_level !== "FREE") notFound();

  const [{ data: lessons }, { data: progress }] = await Promise.all([
    supabase.from("lessons").select("id,title,description,youtube_id,position").eq("course_id", course.id).order("position"),
    supabase.from("lesson_progress").select("lesson_id").eq("user_id", user!.id),
  ]);
  const list = lessons ?? [];
  const idx = list.findIndex((l) => l.id === lessonId);
  if (idx < 0) notFound();
  const lesson = list[idx];
  const done = new Set((progress ?? []).map((p) => p.lesson_id));
  const nextLesson = list[idx + 1];
  const prevLesson = list[idx - 1];

  return (
    <div className="space-y-4">
      <Link href={`/escola/${course.slug}`} className="text-sm text-muted-foreground hover:underline">← {course.title}</Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">{lesson.title}</h1>
          <div className="aspect-video overflow-hidden rounded-xl bg-black">
            <iframe
              src={youtubeEmbed(lesson.youtube_id)}
              title={lesson.title}
              className="size-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          {lesson.description && <p className="whitespace-pre-line text-sm">{lesson.description}</p>}
          <LessonControls
            lessonId={lesson.id}
            done={done.has(lesson.id)}
            isLast={!nextLesson}
            nextHref={nextLesson ? `/escola/${course.slug}/aula/${nextLesson.id}` : `/escola/${course.slug}`}
            prevHref={prevLesson ? `/escola/${course.slug}/aula/${prevLesson.id}` : null}
          />
        </div>

        <aside aria-label="Lista de aulas" className="h-fit rounded-xl border p-3">
          <p className="mb-2 text-sm font-medium">Aulas</p>
          <ol className="space-y-1">
            {list.map((l, i) => (
              <li key={l.id}>
                <Link href={`/escola/${course.slug}/aula/${l.id}`} aria-current={l.id === lessonId ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted ${l.id === lessonId ? "bg-muted font-medium" : ""}`}>
                  <span aria-hidden className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${done.has(l.id) ? "border-floresta bg-floresta text-[#06150e]" : ""}`}>
                    {done.has(l.id) ? "✓" : i + 1}
                  </span>
                  <span className="truncate">{l.title}</span>
                </Link>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
