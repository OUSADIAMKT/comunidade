import { Check } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { RiverArt } from "@/components/brand/river-art";
import { KeneField } from "@/components/brand/kene";

/**
 * Casca das telas de entrada (cadastro, login): painel de marca à esquerda
 * (some abaixo de lg) e o formulário à direita.
 */
export function AuthShell({
  headline,
  perks,
  perksKey,
  children,
}: {
  headline: React.ReactNode;
  perks: string[];
  perksKey?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="brand-panel hidden flex-col justify-between overflow-hidden p-12 lg:flex xl:p-16">
        <KeneField motif="yapa" scale={96} opacity={0.045} className="-z-10 text-foreground" />
        <Logo />

        <div className="max-w-xl space-y-8">
          <p className="eyebrow">Marketplace de talentos criativos</p>
          <h1 className="headline-hero !text-5xl xl:!text-6xl">{headline}</h1>
          <ul className="space-y-3" aria-live="polite" key={perksKey}>
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-base text-muted-foreground">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-amarelo text-[#1a1405]">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground">
          FEITO NA AMAZÔNIA · POR UM MARKETING MAIOR
        </p>
        <RiverArt className="-z-10" />
      </aside>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="surface surface-glow w-full max-w-md p-6 sm:p-8">
          <div className="mb-6 lg:hidden">
            <Logo compact size={28} />
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
