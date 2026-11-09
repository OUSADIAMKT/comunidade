import Image from "next/image";

/** Logo oficial da Ousadia Marketing (fundo escuro), levando à home do site principal. */
export function OusadiaLogo({ className = "h-7" }: { className?: string }) {
  return (
    <a
      href="https://ousadiamarketing.com.br"
      aria-label="Ousadia Marketing, página inicial"
      className="inline-flex shrink-0 items-center"
    >
      <Image
        src="/img/marcas/ousadia-horizontal.png"
        alt="Ousadia Marketing"
        width={2388}
        height={568}
        sizes="160px"
        className={`w-auto object-contain ${className}`}
      />
    </a>
  );
}
