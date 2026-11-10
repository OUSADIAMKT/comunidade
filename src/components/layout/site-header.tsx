import Link from "next/link";
import { Menu } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { OusadiaLogo } from "@/components/brand/ousadia-logo";
import { KeneRule } from "@/components/brand/kene";

/** Âncoras da home: aparecem a partir de lg, quando há espaço. */
const ANCHORS = [
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#empresas", label: "Para empresas" },
  { href: "/#talentos", label: "Para talentos" },
];

const LINKS = [{ href: "/talentos", label: "Ver talentos" }];

const LINK_CLASS =
  "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground";

/** Cabeçalho do site público. O menu móvel usa <details>: funciona sem JavaScript. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-[#1d0c39] text-[#f4efe6] [--border:rgba(244,239,230,0.16)] [--foreground:#f4efe6] [--muted-foreground:#c4bbdc] print:hidden">
      <div className="container-site flex items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-3">
          <OusadiaLogo className="h-8 sm:h-9" />
          <span className="h-6 w-px bg-border" aria-hidden="true" />
          <Logo compact size={34} />
        </div>

        <nav aria-label="Principal" className="hidden items-center gap-0.5 sm:flex">
          {ANCHORS.map((l) => (
            <Link key={l.href} href={l.href} className={`${LINK_CLASS} hidden lg:inline-flex`}>
              {l.label}
            </Link>
          ))}
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={LINK_CLASS}>
              {l.label}
            </Link>
          ))}
          <span className="mx-1.5 hidden h-5 w-px bg-border lg:block" aria-hidden="true" />
          <Link href="/entrar" className={LINK_CLASS}>
            Entrar
          </Link>
          <Link href="/cadastro" className="btn-cta btn-cta-primary ml-2 !min-h-0 !px-4 !py-2 !text-xs">
            Criar conta grátis
          </Link>
        </nav>

        <details className="relative sm:hidden">
          <summary
            className="grid size-10 cursor-pointer list-none place-items-center rounded-lg border border-border [&::-webkit-details-marker]:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" aria-hidden="true" />
          </summary>
          <div className="surface absolute right-0 mt-2 flex w-64 flex-col gap-1 p-2 text-[#2a2623] shadow-xl [--border:rgba(42,38,35,0.12)] [--foreground:#2a2623] [--muted-foreground:#5f5850]">
            {[...ANCHORS, ...LINKS, { href: "/servicos", label: "Serviços" }].map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2.5 text-sm hover:bg-foreground/5">
                {l.label}
              </Link>
            ))}
            <span className="my-1 h-px bg-border" aria-hidden="true" />
            <Link href="/entrar" className="rounded-lg px-3 py-2.5 text-sm hover:bg-foreground/5">
              Entrar
            </Link>
            <Link href="/cadastro" className="btn-cta btn-cta-primary !min-h-0 !py-2.5 !text-xs">
              Criar conta grátis
            </Link>
          </div>
        </details>
      </div>
      <KeneRule motif="pushu" height={8} opacity={0.22} className="text-amarelo" />
    </header>
  );
}
