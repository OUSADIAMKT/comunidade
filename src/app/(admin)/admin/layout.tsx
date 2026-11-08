import { Suspense } from "react";
import { PanelShell, type NavItem } from "@/components/shared/panel-shell";

const NAV: NavItem[] = [
  { href: "/admin", label: "Métricas" },
  { href: "/admin/moderacao", label: "Moderação" },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/campanhas", label: "Campanhas e pacotes" },
  { href: "/admin/escola", label: "Escola" },
  { href: "/admin/comunidade", label: "Comunidade" },
  { href: "/admin/assinaturas", label: "Assinaturas" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <PanelShell context="ADMIN" nav={NAV}>{children}</PanelShell>
    </Suspense>
  );
}
