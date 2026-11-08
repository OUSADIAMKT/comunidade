import { Star, Building2 } from "lucide-react";

export type ReviewItem = {
  id: string;
  rating: number;
  review: string | null;
  company_name: string | null;
  company_logo_url?: string | null;
  completed_at: string | null;
};

export function Stars({ value, className = "size-4" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${className} ${n <= value ? "fill-amarelo text-amarelo" : "text-muted-foreground/40"}`} aria-hidden="true" />
      ))}
    </span>
  );
}

/** Resumo: nota média grande + barras por estrela. */
export function RatingSummary({ avg, count, reviews }: { avg: number; count: number; reviews: ReviewItem[] }) {
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => r.rating === s).length }));
  const max = Math.max(1, ...dist.map((d) => d.n));
  return (
    <div className="surface flex flex-wrap items-center gap-6 p-5">
      <div className="text-center">
        <p className="font-display text-5xl font-bold leading-none text-amarelo">{count > 0 ? avg.toFixed(1) : "—"}</p>
        <div className="mt-2"><Stars value={Math.round(avg)} /></div>
        <p className="mt-1 text-xs text-muted-foreground">{count} avaliação(ões)</p>
      </div>
      <ul className="min-w-48 flex-1 space-y-1.5" aria-label="Distribuição das notas">
        {dist.map((d) => (
          <li key={d.s} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-3 text-right">{d.s}</span>
            <Star className="size-3 fill-amarelo text-amarelo" aria-hidden="true" />
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/5">
              <span className="block h-full rounded-full bg-amarelo" style={{ width: `${(d.n / max) * 100}%` }} />
            </span>
            <span className="w-5">{d.n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReviewList({ reviews }: { reviews: ReviewItem[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {reviews.map((r) => (
        <li key={r.id} className="surface space-y-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <Stars value={r.rating} />
            {r.completed_at && (
              <time className="text-xs text-muted-foreground" dateTime={r.completed_at}>
                {new Date(r.completed_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
              </time>
            )}
          </div>
          {r.review ? (
            <p className="whitespace-pre-line text-sm">“{r.review}”</p>
          ) : (
            <p className="text-sm italic text-muted-foreground">Avaliou sem comentário.</p>
          )}
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            {r.company_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.company_logo_url} alt="" className="size-5 rounded-full object-cover" />
            ) : (
              <Building2 className="size-4" aria-hidden="true" />
            )}
            <span className="truncate">{r.company_name ?? "Empresa"}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
