/**
 * Símbolo minimalista da Ousadia Marketing (fundo escuro), levando à home do
 * site principal. Fica sempre à ESQUERDA, antes da logo da Creators.
 */
export function OusadiaLogo({ className = "h-8" }: { className?: string }) {
  return (
    <a
      href="https://ousadiamarketing.com.br"
      aria-label="Ousadia Marketing, página inicial"
      className="inline-flex shrink-0 items-center"
    >
      {/* SVG: <img> direto, sem o otimizador do next/image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/marcas/ousadia-minimalista-escuro.svg"
        alt="Ousadia Marketing"
        width={884}
        height={774}
        className={`w-auto object-contain ${className}`}
      />
    </a>
  );
}
