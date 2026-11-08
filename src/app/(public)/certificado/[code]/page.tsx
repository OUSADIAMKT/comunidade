import type { Metadata } from "next";
import { Mark } from "@/components/brand/logo";
import { KeneRule } from "@/components/brand/kene";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Certificado", robots: { index: false } };

type Cert = { holder_name: string; course_title: string; course_hours: number | null; score: number | null; issued_at: string; code: string };

export default async function CertificadoPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("verify_certificate", { p_code: code.slice(0, 40) });
  const cert = data as Cert | null;

  if (!cert) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Certificado não encontrado</h1>
        <p className="mt-2 text-muted-foreground">Confira o código digitado: <strong>{code}</strong>.</p>
      </main>
    );
  }

  const date = new Date(cert.issued_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <p className="rounded-lg bg-floresta/10 p-3 text-center text-sm text-floresta print:hidden" role="status">
        Certificado autêntico, emitido pelo Creators da Amazônia.
      </p>

      <section
        aria-label="Certificado"
        className="relative overflow-hidden border-8 border-double border-[#176d49] bg-[#fff1d6] p-8 text-center text-[#0a1f15] sm:p-12 print:border-4"
      >
        <KeneRule motif="iso" height={20} opacity={0.5} className="mb-6 text-[#176d49]" />
        <div className="flex justify-center"><Mark size={52} /></div>
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.3em] text-[#3d5a4a]">Creators da Amazônia · Escola</p>
        <h1 className="mt-4 text-4xl font-bold text-[#0a1f15]">Certificado de Conclusão</h1>
        <p className="mt-8 text-[#3d5a4a]">Certificamos que</p>
        <p className="mt-2 font-display text-3xl font-bold text-[#0a1f15]">{cert.holder_name}</p>
        <p className="mt-6 text-[#3d5a4a]">concluiu com aproveitamento o curso</p>
        <p className="mt-2 font-display text-2xl font-bold text-[#176d49]">{cert.course_title}</p>
        <p className="mt-4 text-[#3d5a4a]">
          {cert.course_hours ? `com carga horária de ${Number(cert.course_hours)} hora(s)` : ""}
          {cert.score != null ? `${cert.course_hours ? ", " : ""}obtendo nota ${cert.score}% na avaliação final.` : "."}
        </p>
        <p className="mt-8 text-sm text-[#3d5a4a]">Emitido em {date}</p>
        <p className="mt-6 text-xs text-[#3d5a4a]">
          Código de verificação: <strong className="font-mono text-[#0a1f15]">{cert.code}</strong>
          <br />
          Verifique em /certificado/{cert.code}
        </p>
        <KeneRule motif="iso" height={20} opacity={0.5} className="mt-8 text-[#176d49]" />
      </section>

      <div className="text-center print:hidden"><PrintButton /></div>
    </main>
  );
}
