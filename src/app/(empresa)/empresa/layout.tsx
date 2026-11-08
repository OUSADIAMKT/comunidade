import { Suspense } from "react";
import { PanelShell } from "@/components/shared/panel-shell";
import { COMPANY_NAV } from "@/lib/panel-nav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <PanelShell context="COMPANY" nav={COMPANY_NAV}>{children}</PanelShell>
    </Suspense>
  );
}
