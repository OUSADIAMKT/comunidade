import Link from "next/link";
import { Bell } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoleSwitcher } from "@/components/shared/role-switcher";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { ConsentGate } from "@/components/shared/consent-gate";
import { ActivateRoleCard } from "@/components/shared/activate-role";
import { Logo } from "@/components/brand/logo";
import { KeneRule } from "@/components/brand/kene";
import { NavTabs } from "@/components/layout/nav-tabs";
import { SidebarNav, type IconNavItem } from "@/components/layout/sidebar-nav";
import { CONTEXT_HOME, CONTEXT_LABEL, type Context } from "@/lib/roles";
import { PANEL_THEMES, type NavItem } from "@/lib/panel-nav";

export type { NavItem };

/** Tela centralizada (conta suspensa, aceite pendente, papel a ativar) com saída sempre visível. */
function CenterScreen({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6">
      <Logo />
      {children}
      <SignOutButton />
    </main>
  );
}

export async function PanelShell({
  context,
  nav = [],
  children,
}: {
  context: Context;
  nav?: NavItem[];
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name,is_professional,is_company,is_admin,status,active_context,terms_accepted_at")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/entrar");

  // Painel de admin: quem não é admin volta para o próprio painel (nunca para o login, que causaria loop)
  if (context === "ADMIN" && !profile.is_admin) {
    redirect(profile.is_company && !profile.is_professional ? CONTEXT_HOME.COMPANY : CONTEXT_HOME.PROFESSIONAL);
  }

  if (context !== "ADMIN" && profile.status !== "ACTIVE") {
    return (
      <CenterScreen>
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-semibold">
            {profile.status === "SUSPENDED" ? "Conta suspensa" : "Conta em análise"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {profile.status === "SUSPENDED"
              ? "Sua conta foi suspensa pela moderação. Se acredita que foi um engano, fale com a equipe do Creators da Amazônia."
              : "Sua conta está aguardando aprovação da moderação. Você será liberado em breve."}
          </p>
        </div>
      </CenterScreen>
    );
  }

  if (context !== "ADMIN" && !profile.is_admin && !profile.terms_accepted_at) {
    return (
      <CenterScreen>
        <ConsentGate />
      </CenterScreen>
    );
  }

  // Logado, mas sem este papel: oferece ativar em vez de mandar para o login
  if (context === "PROFESSIONAL" && !profile.is_professional) {
    return (
      <CenterScreen>
        <ActivateRoleCard role="PROFESSIONAL" homeHref={profile.is_company ? CONTEXT_HOME.COMPANY : "/"} />
      </CenterScreen>
    );
  }
  if (context === "COMPANY" && !profile.is_company) {
    return (
      <CenterScreen>
        <ActivateRoleCard role="COMPANY" homeHref={profile.is_professional ? CONTEXT_HOME.PROFESSIONAL : "/"} />
      </CenterScreen>
    );
  }

  // Contadores: notificações não lidas (sino) e matches aguardando a MINHA resposta (menu)
  const matchesHref = context === "PROFESSIONAL" ? "/profissional/matches" : "/empresa/matches";
  const [{ count: unread }, pendingForMe] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
    (async () => {
      if (context === "ADMIN") return 0;
      const isProf = context === "PROFESSIONAL";
      const { data: me } = await supabase
        .from(isProf ? "professional_profiles" : "company_profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!me) return 0;
      const { count } = await supabase.from("matches").select("id", { count: "exact", head: true })
        .eq(isProf ? "professional_id" : "company_id", me.id).eq("status", "PENDING")
        .eq(isProf ? "professional_interested" : "company_interested", false);
      return count ?? 0;
    })(),
  ]);
  const badges: Record<string, number> = context === "ADMIN" ? {} : { [matchesHref]: pendingForMe };

  const theme = PANEL_THEMES[context];
  const iconNav = nav.filter((i): i is IconNavItem => !!i.icon);
  const useSidebar = iconNav.length > 0 && iconNav.length === nav.length;
  const addRole =
    context === "PROFESSIONAL" && !profile.is_company
      ? { href: CONTEXT_HOME.COMPANY, label: "+ Empresa", title: "Também quero contratar: ativar perfil de empresa" }
      : context === "COMPANY" && !profile.is_professional
        ? { href: CONTEXT_HOME.PROFESSIONAL, label: "+ Creator", title: "Também sou creator: ativar perfil profissional" }
        : null;

  return (
    <div
      className="min-h-screen"
      style={{ background: theme.bg, ["--panel-deep" as string]: theme.deep }}
    >
      <header
        className="sticky top-0 z-40 backdrop-blur-md"
        style={{ background: `color-mix(in srgb, ${theme.bg} 88%, transparent)` }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo compact size={30} />
            <span
              className="rounded-full px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-white"
              style={{ background: theme.deep }}
            >
              {CONTEXT_LABEL[context]}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{profile.full_name}</span>
            <Link
              href={CONTEXT_HOME[context]}
              className="relative grid size-9 place-items-center rounded-lg hover:bg-foreground/5"
              aria-label={unread ? `${unread} notificação(ões) não lida(s)` : "Notificações"}
              title="Notificações"
            >
              <Bell className="size-5" aria-hidden="true" />
              {!!unread && (
                <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[0.65rem] font-bold leading-5 text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <RoleSwitcher userId={user.id} current={context} roles={profile} />
            {addRole && (
              <Link
                href={addRole.href}
                title={addRole.title}
                className="rounded-lg border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              >
                {addRole.label}
              </Link>
            )}
            <SignOutButton />
          </div>
        </div>
        {!useSidebar && nav.length > 0 && <NavTabs items={nav} label="Navegação do painel" />}
        {!useSidebar && <KeneRule motif="pushu" height={8} opacity={0.2} className="text-amarelo" />}
      </header>
      <div className="lg:flex lg:items-start">
        {useSidebar && <SidebarNav items={iconNav} label="Navegação do painel" badges={badges} />}
        <main className={`mx-auto w-full min-w-0 max-w-5xl flex-1 p-4 sm:p-6 ${useSidebar ? "pb-28 lg:pb-6" : ""}`}>{children}</main>
      </div>
    </div>
  );
}
