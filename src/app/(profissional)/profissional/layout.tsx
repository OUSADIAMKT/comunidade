import { Suspense } from "react";
import { PanelShell } from "@/components/shared/panel-shell";
import { PROFESSIONAL_NAV } from "@/lib/panel-nav";
import { requireProfessional } from "@/lib/professional";

async function Gate({ children }: { children: React.ReactNode }) {
  await requireProfessional(); // sem perfil -> /onboarding
  return <>{children}</>;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <PanelShell context="PROFESSIONAL" nav={PROFESSIONAL_NAV}>
        <Gate>{children}</Gate>
      </PanelShell>
    </Suspense>
  );
}
