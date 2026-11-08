import Link from "next/link";
import { getProfessionalPlan, limitLabel, requireProfessional } from "@/lib/professional";
import { MIN_SCORE_TO_PUBLISH } from "@/lib/constants";
import { NotificationsPanel } from "@/components/shared/notifications-panel";
import { ProfileChecklist } from "@/components/shared/profile-checklist";
import { ShareMediaKit } from "@/components/shared/share-media-kit";
import { PageHeader, StatCard } from "@/components/brand/section-heading";

export default async function Page() {
  const { supabase, user, profile } = await requireProfessional();
  const plan = await getProfessionalPlan(supabase, user.id);

  const [{ count: pkgs }, { count: items }, { count: cats }, { data: me }] = await Promise.all([
    supabase.from("service_packages").select("id", { count: "exact", head: true }).eq("professional_id", profile.id).eq("is_active", true),
    supabase.from("portfolio_items").select("id", { count: "exact", head: true }).eq("professional_id", profile.id),
    supabase.from("professional_categories").select("category_id", { count: "exact", head: true }).eq("professional_id", profile.id),
    supabase.from("users").select("avatar_url,phone_whatsapp").eq("id", user.id).single(),
  ]);
  const score = profile.profile_completion_score as number;
  const perfil = "/profissional/perfil";
  const checklist = [
    { label: "Foto de perfil", done: !!me?.avatar_url, href: perfil },
    { label: "Bio contando quem você é", done: !!profile.bio?.trim(), href: perfil },
    { label: "Pelo menos 1 especialidade", done: (cats ?? 0) > 0, href: perfil },
    { label: "Cidade e UF", done: !!profile.city && !!profile.state_uf, href: perfil },
    { label: "WhatsApp", done: !!me?.phone_whatsapp, href: perfil },
    { label: "1 trabalho no portfólio", done: (items ?? 0) > 0, href: "/profissional/portfolio" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={<>Olá, <span className="text-amarelo">@{profile.username}</span></>} description="Seu painel de profissional na Creators da Amazônia." />
      <ProfileChecklist items={checklist} />
      <NotificationsPanel supabase={supabase} userId={user.id} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Perfil completo" value={`${score}%`}>
          {score < MIN_SCORE_TO_PUBLISH && <Link href={perfil} className="font-medium text-amarelo underline underline-offset-4">Completar agora</Link>}
        </StatCard>
        <StatCard label="Pacotes ativos" value={pkgs ?? 0} suffix={`/ ${limitLabel(plan.max_packages_limit)}`} />
        <StatCard label="Itens no portfólio" value={items ?? 0} />
      </div>
      <section aria-label="Seu Mídia Kit" className="space-y-3 rounded-xl border p-4">
        <p className="text-sm">
          Seu Mídia Kit público:{" "}
          <Link className="font-medium text-amarelo underline underline-offset-4" href={`/c/${profile.username}`}>/c/{profile.username}</Link>
          <span className="block text-xs text-muted-foreground">Mande para as marcas e coloque na bio do Instagram.</span>
        </p>
        <ShareMediaKit username={profile.username} />
      </section>
    </div>
  );
}
