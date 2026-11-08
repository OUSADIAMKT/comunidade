import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

export type ChecklistItem = { label: string; done: boolean; href: string };

/** Os 6 itens obrigatórios do score (mesma regra de recompute_profile_score): o que falta para aparecer para as marcas. */
export function ProfileChecklist({ items }: { items: ChecklistItem[] }) {
  const missing = items.filter((i) => !i.done).length;
  if (missing === 0) return null;
  return (
    <section aria-label="O que falta no seu perfil" className="space-y-3 rounded-xl border border-amarelo/50 bg-amarelo/5 p-4">
      <div>
        <h2 className="font-semibold">
          Falta{missing > 1 ? "m" : ""} {missing} {missing > 1 ? "itens" : "item"} para você aparecer para as marcas
        </h2>
        <p className="text-sm text-muted-foreground">
          Com tudo completo você entra na vitrine, publica pacotes e se candidata às oportunidades.
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.label}>
            {i.done ? (
              <span className="flex items-center gap-2 text-sm text-muted-foreground line-through">
                <CheckCircle2 className="size-4 text-floresta" aria-hidden="true" />
                {i.label}
                <span className="sr-only">(feito)</span>
              </span>
            ) : (
              <Link href={i.href} className="flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline">
                <Circle className="size-4 text-amarelo" aria-hidden="true" />
                {i.label}
                <span className="sr-only">(pendente)</span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
