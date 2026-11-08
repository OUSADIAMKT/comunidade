import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1">
        <Suspense fallback={<p className="p-6 text-muted-foreground">Carregando...</p>}>{children}</Suspense>
      </div>
      <SiteFooter />
    </div>
  );
}
