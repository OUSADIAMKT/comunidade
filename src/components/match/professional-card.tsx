import { BadgeCheck, Check, Crown, MapPin, Star } from "lucide-react";
import { REASON_LABEL, type ScoreReason } from "@/lib/matching-engine";
import { formatBRL } from "@/lib/constants";
import { FavoriteButton, InterestButton } from "./action-buttons";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function ProfessionalCard({
  p,
  score,
  reasons,
  price,
  favorited,
  interestSent,
  filters,
  packageId,
  packageTitle,
}: {
  p: any;
  score?: number;
  reasons?: ScoreReason[];
  price: number | null;
  favorited: boolean;
  interestSent: boolean;
  filters?: Record<string, string>;
  packageId?: string;
  packageTitle?: string;
}) {
  return (
    <li className={"surface flex flex-col gap-3 p-4 " + (p.is_pro ? "!border-amarelo/50" : "")}>
      <div className="flex items-start gap-3">
        {p.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.avatar_url} alt="" className="size-14 rounded-2xl object-cover ring-2 ring-amarelo/30" />
        ) : (
          <div className="grid size-14 place-items-center rounded-2xl bg-secondary font-display text-xl font-bold text-amarelo ring-2 ring-amarelo/20" aria-hidden>{String(p.full_name ?? "?").trim().charAt(0).toUpperCase()}</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate font-display text-base font-bold">
            <span className="truncate">{p.full_name}</span>
            {p.is_verified && <BadgeCheck className="size-4 shrink-0 text-floresta" aria-label="Verificado" />}
          </p>
          <p className="truncate text-xs text-muted-foreground">{(p.category_names ?? []).join(" | ")}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0 text-rio" aria-hidden="true" />
            <span className="truncate">
              {p.city} — {p.state_uf}
              {p.amazon_territory_pole ? ` · ${p.amazon_territory_pole}` : ""}
            </span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {score !== undefined && (
            <span className="rounded-full bg-floresta px-2 py-0.5 font-mono text-[0.65rem] font-bold uppercase tracking-wider text-[#06150e]" title="Compatibilidade com a sua busca">
              {score}% match
            </span>
          )}
          {p.is_pro && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amarelo px-2 py-0.5 font-mono text-[0.65rem] font-bold uppercase tracking-wider text-[#1a1405]">
              <Crown className="size-3" aria-hidden="true" /> PRO
            </span>
          )}
        </div>
      </div>

      {packageTitle && <p className="rounded-lg bg-muted p-2 text-sm">{packageTitle}</p>}
      {(p.niches ?? []).length > 0 && (
        <p className="text-xs text-muted-foreground">{(p.niches as string[]).slice(0, 4).join(" · ")}</p>
      )}
      {reasons && reasons.length > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-floresta">
          <Check className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          {reasons.map((r) => REASON_LABEL[r]).join(" · ")}
        </p>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-amarelo">{price ? `${packageTitle ? "" : "A partir de "}${formatBRL(price)}` : "Sob consulta"}</span>
        <span className="inline-flex items-center gap-1">
          <Star className="size-4 fill-amarelo text-amarelo" aria-hidden="true" />
          {Number(p.rating_avg).toFixed(1)}
        </span>
      </div>

      <div className="mt-auto flex flex-wrap items-start gap-2">
        <a
          href={`/c/${p.username}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-7 items-center rounded-lg border px-2.5 text-[0.8rem] font-medium hover:bg-muted"
        >
          Ver Portfólio
        </a>
        <InterestButton
          professionalId={p.id}
          packageId={packageId}
          filters={filters}
          label={packageId ? "Solicitar Contratação" : "Tenho Interesse"}
          sent={interestSent}
        />
        <FavoriteButton professionalId={p.id} initial={favorited} />
      </div>
    </li>
  );
}
