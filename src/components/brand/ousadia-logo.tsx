import Image from "next/image";

/**
 * Símbolo oficial da Ousadia Marketing, levando à home do site principal.
 * Por padrão a Ousadia fica sempre à ESQUERDA, antes da logo da Creators.
 *  - tom="escuro": para fundo escuro (anel creme + triângulo amarelo). Padrão.
 *  - tom="claro": para fundo claro (anel roxo + triângulo amarelo).
 */
export function OusadiaLogo({
  className = "h-8",
  tom = "escuro",
}: {
  className?: string;
  tom?: "escuro" | "claro";
}) {
  return (
    <a
      href="https://ousadiamarketing.com.br"
      aria-label="Ousadia Marketing, página inicial"
      className="inline-flex shrink-0 items-center"
    >
      <Image
        src={`/img/marcas/ousadia-simbolo-${tom}.png`}
        alt="Ousadia Marketing"
        width={542}
        height={467}
        sizes="64px"
        className={`w-auto object-contain ${className}`}
      />
    </a>
  );
}
