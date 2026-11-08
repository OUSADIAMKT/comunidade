import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CONTEXT_HOME, type Context } from "@/lib/roles";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const role = searchParams.get("role");
  const consent = searchParams.get("consent") === "1";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.redirect(`${origin}/entrar?erro=oauth`);

      // Cadastro via Google: aplica o papel e o aceite marcados em /cadastro se a conta acabou de ser criada
      const justCreated = Date.now() - new Date(user.created_at).getTime() < 2 * 60 * 1000;
      if (justCreated) {
        const patch: Record<string, unknown> = {};
        if (role === "PROFESSIONAL" || role === "COMPANY") {
          patch.is_professional = role === "PROFESSIONAL";
          patch.is_company = role === "COMPANY";
          patch.active_context = role;
        }
        if (consent) {
          const now = new Date().toISOString();
          patch.terms_accepted_at = now;
          patch.privacy_accepted_at = now;
          await supabase.auth.updateUser({ data: { adult_declaration_at: now, terms_accepted_at: now, privacy_accepted_at: now } });
        }
        if (Object.keys(patch).length) await supabase.from("users").update(patch).eq("id", user.id);
      }

      if (next) return NextResponse.redirect(`${origin}${next}`);
      const { data: profile } = await supabase
        .from("users").select("active_context").eq("id", user.id).single();
      const ctx = (profile?.active_context ?? "PROFESSIONAL") as Context;
      return NextResponse.redirect(`${origin}${CONTEXT_HOME[ctx]}`);
    }
  }
  // Link de e-mail (recuperação/confirmação) expirado ou já usado
  if (next === "/nova-senha" || searchParams.get("error_code") === "otp_expired") {
    return NextResponse.redirect(`${origin}/entrar?erro=link`);
  }
  return NextResponse.redirect(`${origin}/entrar?erro=oauth`);
}
