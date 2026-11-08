import Link from "next/link";

/** Símbolo: losango (dois lados que se encontram) cortado por uma linha de rio. */
export function Mark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" className="shrink-0">
      <rect x="20" y="1.5" width="26" height="26" rx="4" transform="rotate(45 20 1.5)" fill="#ffc61a" />
      <path
        d="M7 22c4-5 8 5 13 0s9 5 13 0"
        stroke="#0a1f15"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Marca completa: símbolo + "CREATORS / DA AMAZÔNIA". `compact` = uma linha só. */
export function Logo({
  href = "/",
  compact = false,
  size = 40,
  className = "",
}: {
  href?: string;
  compact?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <Link href={href} className={`inline-flex items-center gap-3 ${className}`} aria-label="Creators da Amazônia, página inicial">
      <Mark size={size} />
      {compact ? (
        <span className="font-display text-base font-bold tracking-wide">
          CREATORS <span className="text-floresta">DA AMAZÔNIA</span>
        </span>
      ) : (
        <span className="leading-none">
          <span className="block font-display text-xl font-bold tracking-wide">CREATORS</span>
          <span className="block pt-1 font-mono text-[0.65rem] tracking-[0.3em] text-floresta">DA AMAZÔNIA</span>
        </span>
      )}
    </Link>
  );
}
