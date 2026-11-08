import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CONTEXT_HOME, CONTEXT_LABEL, type Context } from "@/lib/roles";
import { Logo } from "@/components/brand/logo";
import { KeneRule } from "@/components/brand/kene";
import { NavTabs } from "@/components/layout/nav-tabs";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { SidebarNav, type IconNavItem } from "@/components/layout/sidebar-nav";
import { COMPANY_NAV, PANEL_THEMES, PROFESSIONAL_NAV } from "@/lib/panel-nav";

/** Casca compartilhada da Escola e da Comunidade: vale para profissionais, empresas e admins. */
async function Shell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: me } = await supabase
    .from("users").select("full_name,active_context,status,is_admin,terms_accepted_at").eq("id", user.id).single();
  const context = (me?.active_context ?? "PROFESSIONAL") as Context;
  const home = CONTEXT_HOME[context];
  // Conta suspensa/em análise ou sem aceite: o painel mostra a tela certa (nunca o login, que causaria loop)
  if (me?.status !== "ACTIVE" || (!me?.is_admin && !me?.terms_accepted_at)) redirect(home);

  // Profissional e empresa veem o mesmo menu lateral (e as mesmas cores) do próprio painel;
  // admin segue com as abas simples.
  const panelNav = context === "PROFESSIONAL" ? PROFESSIONAL_NAV : context === "COMPANY" ? COMPANY_NAV : null;
  const theme = PANEL_THEMES[context];

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
            {panelNav && (
              <span
                className="rounded-full px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-white"
                style={{ background: theme.deep }}
              >
                {CONTEXT_LABEL[context]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
          {!panelNav && (
            <NavTabs
              label="Navegação"
              items={[
                { href: "/escola", label: "Escola" },
                { href: "/comunidade", label: "Comunidade" },
                { href: home, label: "← Meu painel" },
              ]}
            />
          )}
            <SignOutButton />
          </div>
        </div>
        {!panelNav && <KeneRule motif="pushu" height={8} opacity={0.2} className="text-amarelo" />}
      </header>
      <div className="lg:flex lg:items-start">
        {panelNav && <SidebarNav items={panelNav as IconNavItem[]} label="Navegação do painel" />}
        <main className={`mx-auto w-full min-w-0 max-w-5xl flex-1 p-4 sm:p-6 ${panelNav ? "pb-28 lg:pb-6" : ""}`}>{children}</main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Carregando...</div>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
