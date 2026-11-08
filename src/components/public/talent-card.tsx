import Link from "next/link";
import { BadgeCheck, Crown, MapPin, Star } from "lucide-react";
import { formatBRL } from "@/lib/constants";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function TalentCard({ p, packageTitle, price }: { p: any; packageTitle?: string; price?: number | null }) {
  const shown = price ?? (Number(p.starting_price) > 0 ? Number(p.starting_price) : null);
  return (
    <li
      className={
        "group surface surface-hover relative flex flex-col gap-3 p-4 " +
        (p.is_pro ? "!border-amarelo/50" : "")
      }
    >
      <div className="flex items-start gap-3">
        {p.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.avatar_url} alt="" loading="lazy" className="size-14 rounded-2xl object-cover ring-2 ring-amarelo/30" />
        ) : (
          <div className="grid size-14 place-items-center rounded-2xl bg-secondary font-display text-xl font-bold text-amarelo ring-2 ring-amarelo/20" aria-hidden>
            {String(p.full_name ?? "?").trim().charAt(0).toUpperCase()}
          </div>
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
        {p.is_pro && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amarelo px-2 py-0.5 font-mono text-[0.65rem] font-bold uppercase tracking-wider text-[#1a1405]">
            <Crown className="size-3" aria-hidden="true" /> PRO
          </span>
        )}
      </div>
      {packageTitle && <p className="rounded-lg bg-muted p-2 text-sm">{packageTitle}</p>}
      {p.headline && !packageTitle && <p className="line-clamp-2 text-sm text-foreground/90">{p.headline}</p>}
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-amarelo">
          {shown ? `${packageTitle ? "" : "A partir de "}${formatBRL(shown)}` : "Sob consulta"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Star className="size-4 fill-amarelo text-amarelo" aria-hidden="true" />
          {Number(p.rating_avg).toFixed(1)} <span className="text-xs text-muted-foreground">({p.reviews_count})</span>
        </span>
      </div>
      <div className="mt-auto flex gap-2">
        <Link
          href={`/c/${p.username}`}
          className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-border text-sm font-medium transition-colors hover:border-floresta hover:text-floresta"
        >
          Ver Mídia Kit
        </Link>
        <Link
          href={`/entrar?next=${encodeURIComponent(`/c/${p.username}`)}`}
          className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(255,198,26,0.6)]"
        >
          {packageTitle ? "Solicitar" : "Tenho interesse"}
        </Link>
      </div>
    </li>
  );
}
