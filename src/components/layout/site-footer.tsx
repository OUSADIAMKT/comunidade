import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SectionDivider } from "@/components/brand/kene";

const COLUMNS = [
  {
    title: "Plataforma",
    links: [
      { href: "/#como-funciona", label: "Como funciona" },
      { href: "/talentos", label: "Ver talentos" },
      { href: "/servicos", label: "Serviços" },
      { href: "/#duvidas", label: "Perguntas frequentes" },
    ],
  },
  {
    title: "Comece agora",
    links: [
      { href: "/cadastro?perfil=empresa", label: "Contratar talentos" },
      { href: "/cadastro?perfil=talento", label: "Criar perfil de talento" },
      { href: "/entrar", label: "Entrar" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="tone-noite relative overflow-hidden print:hidden">
      <SectionDivider motif="iso" height={22} opacity={0.35} className="text-[color:var(--tone-deep)]" />
      <div className="container-site grid gap-10 pb-12 pt-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
        <div className="space-y-4 sm:col-span-2 lg:col-span-1">
          <Logo />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            O marketplace que conecta empresas a creators, social medias e especialistas em IA da Amazônia.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="space-y-3 text-sm">
            <p className="eyebrow">{col.title}</p>
            <ul className="space-y-2.5 text-muted-foreground">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link className="transition-colors hover:text-foreground" href={l.href}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="space-y-3 text-sm">
          <p className="eyebrow">Uma iniciativa</p>
          <p className="leading-relaxed text-muted-foreground">
            da{" "}
            <a
              className="font-semibold text-amarelo underline underline-offset-4"
              href="https://ousadiamarketing.com.br"
              target="_blank"
              rel="noreferrer"
            >
              Ousadia Marketing
            </a>
            , a primeira agência-escola de marketing do Norte do Brasil.
          </p>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container-site flex flex-wrap items-center justify-between gap-2 py-4 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
          <span>
            © Creators da Amazônia · Feito na Amazônia ·{" "}
            <Link className="underline underline-offset-4 transition-colors hover:text-foreground" href="/privacidade">
              Privacidade e LGPD
            </Link>
          </span>
          <span>Grafismos inspirados em padrões de povos indígenas da Amazônia</span>
        </div>
      </div>
    </footer>
  );
}
