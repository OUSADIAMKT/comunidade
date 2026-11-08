/**
 * Motivos visuais "Ousadia Amazônia" — natureza + grafismo indígena.
 * SVGs de traço único (usam currentColor) para tingir via `text-*` ou style color.
 * Decorativos: sempre aria-hidden.
 */
import type { CSSProperties } from "react";

type MotifProps = { className?: string; style?: CSSProperties };

/** Folha (nervuras centrais + laterais) */
export function Leaf({ className = "", style }: MotifProps) {
  return (
    <svg viewBox="0 0 100 130" className={className} style={style} aria-hidden fill="none">
      <path
        d="M50 4C22 30 12 78 50 126C88 78 78 30 50 4Z"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path d="M50 14V120" stroke="currentColor" strokeWidth="3" />
      <path d="M50 40C40 44 32 44 24 40M50 40c10 4 18 4 26 0M50 66c-11 5-20 5-30 0m30 0c11 5 20 5 30 0M50 92c-9 4-17 4-24 0m24 0c9 4 17 4 24 0"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Remo amazônico (cabo em T + pá em folha) */
export function Paddle({ className = "", style }: MotifProps) {
  return (
    <svg viewBox="0 0 60 220" className={className} style={style} aria-hidden fill="none">
      <path d="M18 10h24M30 10v92" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M30 100C10 118 8 168 30 208C52 168 50 118 30 100Z"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path d="M30 112v88" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

/** Canoa (vista lateral, pontas erguidas) */
export function Canoe({ className = "", style }: MotifProps) {
  return (
    <svg viewBox="0 0 200 70" className={className} style={style} aria-hidden fill="none">
      <path
        d="M6 20C14 46 44 60 100 60C156 60 186 46 194 20C160 40 128 46 100 46C72 46 40 40 6 20Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M40 34v14M70 40v14M100 42v14M130 40v14M160 34v14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Árvore amazônica estilizada */
export function Tree({ className = "", style }: MotifProps) {
  return (
    <svg viewBox="0 0 120 140" className={className} style={style} aria-hidden fill="none">
      <path d="M60 138V70" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M60 92c-14-6-24-16-28-30M60 78c14-6 22-16 26-28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M60 8c-20 0-34 14-34 32 0 6 2 11 5 15-6 4-10 11-10 19 0 14 12 24 27 24h24c15 0 27-10 27-24 0-8-4-15-10-19 3-4 5-9 5-15 0-18-14-32-34-32Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Linhas do rio (correntes fluviais) */
export function RiverLines({ className = "", style }: MotifProps) {
  return (
    <svg viewBox="0 0 400 120" className={className} style={style} aria-hidden fill="none" preserveAspectRatio="none">
      {[10, 34, 58, 82, 106].map((y, i) => (
        <path
          key={y}
          d={`M-10 ${y} C60 ${y - 12}, 120 ${y + 12}, 200 ${y} S340 ${y - 12}, 410 ${y}`}
          stroke="currentColor"
          strokeWidth={i % 2 ? 2 : 3}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

/**
 * Grafismo indígena — losangos encadeados (padrão de cestaria).
 * Fundo de seção sutil; cor via prop.
 */
export function GrafismoDiamonds({
  className = "",
  color = "#ffffff",
  style,
}: MotifProps & { color?: string }) {
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'>` +
      `<g fill='none' stroke='${color}' stroke-width='1.5'>` +
      `<path d='M24 4 44 24 24 44 4 24Z'/><path d='M24 14 34 24 24 34 14 24Z'/>` +
      `</g></svg>`
  );
  return (
    <div
      aria-hidden
      className={className}
      style={{
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundRepeat: "repeat",
        backgroundSize: "48px 48px",
        ...style,
      }}
    />
  );
}
