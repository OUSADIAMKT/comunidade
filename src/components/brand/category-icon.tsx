import { Bot, Clapperboard, Smartphone, Sparkles } from "lucide-react";

const cls = "size-5";

/** Ícone de cada especialidade (pelo `slug`). Elementos criados uma vez, fora do render. */
const BY_SLUG: Record<string, React.ReactNode> = {
  "ugc-creator": <Clapperboard className={cls} />,
  "social-media-eventos": <Smartphone className={cls} />,
  "ferramenteiro-ia": <Bot className={cls} />,
};
const FALLBACK = <Sparkles className={cls} />;

/**
 * Marcador em losango com o ícone da categoria. Fica dentro de um elemento com
 * a classe `group` para reagir ao hover do cartão.
 */
export function CategoryBadge({
  slug,
  tone = "amarelo",
}: {
  slug?: string | null;
  tone?: "amarelo" | "floresta" | "rio";
}) {
  const color = tone === "floresta" ? "text-floresta" : tone === "rio" ? "text-rio" : "text-amarelo";
  return (
    <span className={`diamond ${color}`} aria-hidden="true">
      {(slug && BY_SLUG[slug]) || FALLBACK}
    </span>
  );
}
