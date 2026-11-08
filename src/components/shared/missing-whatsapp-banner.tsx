import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Empresas cadastradas antes do campo obrigatório: sem WhatsApp, o profissional não consegue chamá-las após o match. */
export async function MissingWhatsappBanner({ supabase, userId }: { supabase: SupabaseClient; userId: string }) {
  const { data } = await supabase.from("users").select("phone_whatsapp").eq("id", userId).single();
  if (data?.phone_whatsapp) return null;
  return (
    <p role="alert" className="rounded-xl border border-amarelo/60 bg-amarelo/10 p-4 text-sm">
      <strong>Falta o WhatsApp da empresa.</strong> Sem ele, os profissionais com quem você deu match não conseguem te
      chamar.{" "}
      <Link href="/empresa/perfil" className="font-semibold underline underline-offset-4">Cadastrar agora</Link>
    </p>
  );
}
