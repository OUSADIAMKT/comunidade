import { GraduationCap, Lock } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function EscolaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: courses }, { data: lessons }, { data: progress }, { data: certs }, { data: paid }] = await Promise.all([
    supabase.from("courses").select("id,slug,title,description,cover_url,access_level,level,estimated_hours,instructor_name")
      .eq("status", "PUBLISHED").order("display_order").order("created_at", { ascending: false }),
    supabase.from("lessons").select("id,course_id"),
    supabase.from("lesson_progress").select("lesson_id").eq("user_id", user!.id),
    supabase.from("certificates").select("course_id").eq("user_id", user!.id),
    supabase.rpc("has_paid_plan", { p_user: user!.id }),
  ]);

  const doneSet = new Set((progress ?? []).map((p) => p.lesson_id));
  const certSet = new Set((certs ?? []).map((c) => c.course_id));
  const byCourse = new Map<string, string[]>();
  (lessons ?? []).forEach((l) => byCourse.set(l.course_id, [...(byCourse.get(l.course_id) ?? []), l.id]));
  const hasPlan = paid === true;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Escola</h1>
          <p className="text-sm text-muted-foreground">Cursos da Ousadia para crescer na economia criativa. Conclua, faça a prova e receba seu certificado.</p>
        </div>
        <Link href="/escola/certificados" className="text-sm underline"><GraduationCap className="mr-1 inline size-4" aria-hidden="true" />Meus certificados ({certSet.size})</Link>
      </div>

      {(courses ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Os primeiros cursos estão chegando. Volte em breve!</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses!.map((c) => {
            const ids = byCourse.get(c.id) ?? [];
            const done = ids.filter((id) => doneSet.has(id)).length;
            const pct = ids.length ? Math.round((done / ids.length) * 100) : 0;
            const isPro = c.access_level === "PRO";
            return (
              <li key={c.id} className="flex flex-col overflow-hidden rounded-xl border">
                <Link href={`/escola/${c.slug}`} className="block">
                  <div className="relative aspect-video bg-muted">
                    {c.cover_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.cover_url} alt="" loading="lazy" className="size-full object-cover" />
                    )}
                    <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${isPro ? "bg-amarelo text-[#1a1405]" : "bg-floresta text-[#06150e]"}`}>
                      {isPro ? (hasPlan ? "PRO" : <><Lock className="mr-1 inline size-3" aria-hidden="true" />PRO</>) : "Grátis"}
                    </span>
                    {certSet.has(c.id) && <span className="absolute right-2 top-2 rounded-full bg-background px-2 py-0.5 text-xs"><GraduationCap className="mr-1 inline size-3" aria-hidden="true" />Certificado</span>}
                  </div>
                </Link>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <Link href={`/escola/${c.slug}`} className="font-semibold hover:underline">{c.title}</Link>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.level} · {Number(c.estimated_hours)}h{!isPro && ` · ${ids.length} aula(s)`}{c.instructor_name && ` · ${c.instructor_name}`}
                  </p>
                  {!isPro && ids.length > 0 && (
                    <div className="mt-auto space-y-1">
                      <div className="h-1.5 overflow-hidden rounded bg-muted" role="progressbar" aria-label="Progresso" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground">{pct === 0 ? "Não iniciado" : pct === 100 ? "Aulas concluídas" : `${pct}% concluído`}</p>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
