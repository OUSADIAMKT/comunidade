import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Building2 } from "lucide-react";
import { OnboardingWizard } from "./wizard";
import { Button } from "@/components/ui/button";
import { ConsentGate } from "@/components/shared/consent-gate";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { activateRole } from "@/app/actions/account";
import { Logo } from "@/components/brand/logo";
import { KeneField } from "@/components/brand/kene";
import { RiverArt } from "@/components/brand/river-art";

async function Content() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: me } = await supabase
    .from("users").select("full_name,phone_whatsapp,is_professional,is_company,is_admin,terms_accepted_at").eq("id", user.id).single();
  // Conta só de empresa: o cadastro da empresa é o /empresa/perfil
  if (me && !me.is_professional && me.is_company) redirect("/empresa");
  // Entrou pelo Google sem passar pelos aceites do cadastro
  if (me && !me.is_admin && !me.terms_accepted_at) return <ConsentGate />;

  const { data: existing } = await supabase
    .from("professional_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (existing) redirect("/profissional");

  const { data: categories } = await supabase
    .from("categories").select("id,name,description").eq("is_active", true).order("display_order");

  return (
    <>
      {/* Quem entrou pelo Google sem escolher o tipo de conta vira profissional por padrão: saída para empresas */}
      {!me?.is_company && (
      <form action={activateRole} className="surface flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
        <input type="hidden" name="role" value="COMPANY" />
        <input type="hidden" name="exclusive" value="1" />
        <span className="flex items-center gap-2">
          <Building2 className="size-5 text-amarelo" aria-hidden="true" />
          <span>É uma <strong>empresa ou marca</strong> buscando talentos?</span>
        </span>
        <Button type="submit" size="sm" variant="outline">Cadastrar minha empresa</Button>
      </form>
      )}
      <OnboardingWizard
        categories={categories ?? []}
        defaultName={me?.full_name ?? ""}
        defaultPhone={me?.phone_whatsapp ?? ""}
      />
      <div className="flex justify-center">
        <SignOutButton />
      </div>
    </>
  );
}

export default function OnboardingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <KeneField motif="yapa" scale={96} opacity={0.035} className="text-foreground" />
      <RiverArt />
      <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-4 py-10">
        <Logo />
        <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}>
          <Content />
        </Suspense>
      </div>
    </main>
  );
}
