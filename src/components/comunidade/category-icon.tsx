import { Bot, Coins, Compass, Leaf, Sprout, TreeDeciduous, Waves, type LucideIcon } from "lucide-react";

/** Cada categoria do fórum ganha um elemento da floresta e uma frase curta. */
const THEME: Record<string, { icon: LucideIcon; tag: string; tone: string }> = {
  "apresente-se": { icon: Sprout, tag: "Semente", tone: "text-floresta bg-floresta/12" },
  duvidas: { icon: Compass, tag: "Trilha", tone: "text-rio bg-rio/12" },
  "dicas-boas-praticas": { icon: TreeDeciduous, tag: "Copa", tone: "text-floresta bg-floresta/12" },
  "mercado-precos": { icon: Coins, tag: "Colheita", tone: "text-amarelo bg-amarelo/12" },
  "ferramentas-ia": { icon: Bot, tag: "Clareira", tone: "text-rio bg-rio/12" },
  "networking-amazonia": { icon: Waves, tag: "Rio", tone: "text-rio bg-rio/12" },
};

export function categoryTheme(slug: string) {
  return THEME[slug] ?? { icon: Leaf, tag: "Floresta", tone: "text-floresta bg-floresta/12" };
}

export function CategoryIcon({ slug, size = "md" }: { slug: string; size?: "md" | "lg" }) {
  const { icon: Icon, tone } = categoryTheme(slug);
  const box = size === "lg" ? "size-14 rounded-2xl" : "size-11 rounded-xl";
  return (
    <span className={`grid shrink-0 place-items-center ${box} ${tone}`} aria-hidden="true">
      <Icon className={size === "lg" ? "size-7" : "size-5"} />
    </span>
  );
}
