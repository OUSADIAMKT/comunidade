import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function CertificadosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from("certificates")
    .select("id,code,course_title,course_hours,score,issued_at").eq("user_id", user!.id).order("issued_at", { ascending: false });

  return (
    <div className="space-y-4">
      <Link href="/escola" className="text-sm text-muted-foreground hover:underline">← Escola</Link>
      <h1 className="text-2xl font-bold">Meus certificados</h1>
      {(data ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Você ainda não tem certificados. Conclua um curso e passe na prova para receber o primeiro!
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data!.map((c) => (
            <li key={c.id} className="space-y-1 rounded-xl border p-4">
              <GraduationCap className="size-6 text-amarelo" aria-hidden="true" />
              <p className="font-semibold">{c.course_title}</p>
              <p className="text-xs text-muted-foreground">
                {Number(c.course_hours)}h{c.score != null ? ` · nota ${c.score}%` : ""} · emitido em {new Date(c.issued_at).toLocaleDateString("pt-BR")}
              </p>
              <Link href={`/certificado/${c.code}`} className="text-sm underline">Ver e imprimir</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
