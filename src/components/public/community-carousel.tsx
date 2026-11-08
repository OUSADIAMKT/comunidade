"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CommunitySlide = {
  src: string;
  alt: string;
  /** Legenda curta mostrada sobre a foto. */
  caption: string;
  /** object-position da foto (padrão: centro). */
  position?: string;
};

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const m = window.matchMedia(REDUCED);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/** Quantas miniaturas aparecem abaixo da foto (as próximas da fila). */
const THUMBS = 5;

/**
 * Carrossel de fotos da comunidade, no formato de stories: barras de progresso
 * no topo, troca automática com fade e zoom lento, pausa no hover/foco e
 * miniaturas das próximas fotos. Com movimento reduzido, não avança sozinho.
 */
export function CommunityCarousel({ slides, interval = 5000 }: { slides: CommunitySlide[]; interval?: number }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);
  const total = slides.length;
  const auto = !paused && !reduced && total > 1;

  const go = useCallback((i: number) => setIndex(((i % total) + total) % total), [total]);

  useEffect(() => {
    if (!auto) return;
    const t = window.setTimeout(() => setIndex((v) => (v + 1) % total), interval);
    return () => window.clearTimeout(t);
  }, [auto, index, interval, total]);

  const upcoming = Array.from({ length: Math.min(THUMBS, total - 1) }, (_, k) => (index + 1 + k) % total);

  return (
    <div
      role="region"
      aria-roledescription="carrossel"
      aria-label="Fotos da comunidade Creators da Amazônia"
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      {/* Foto principal */}
      <div className="relative aspect-square overflow-hidden rounded-[2rem] border-4 border-white bg-[#241044] shadow-[0_30px_60px_-30px_rgba(42,38,35,0.55)]">
        {slides.map((s, i) => {
          const active = i === index;
          return (
            <div
              key={s.src}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${total}: ${s.caption}`}
              aria-hidden={!active}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${active ? "opacity-100" : "opacity-0"}`}
            >
              <Image
                src={s.src}
                alt={s.alt}
                fill
                preload={i === 0}
                sizes="(max-width: 1024px) 92vw, 520px"
                className={`object-cover transition-transform ease-linear ${
                  active && !reduced ? "scale-[1.07] duration-[6000ms]" : "scale-100 duration-700"
                }`}
                style={{ objectPosition: s.position ?? "50% 50%" }}
              />
            </div>
          );
        })}

        {/* Barras de progresso (estilo stories) */}
        <div className="absolute inset-x-4 top-4 z-10 flex gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.src}
              type="button"
              onClick={() => go(i)}
              aria-label={`Ver foto ${i + 1}: ${s.caption}`}
              aria-current={i === index ? "true" : undefined}
              className="group/bar relative h-4 flex-1 cursor-pointer"
            >
              <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-white/35 transition-colors group-hover/bar:bg-white/55">
                <span
                  key={i === index ? `on-${index}` : "off"}
                  className="story-bar absolute inset-y-0 left-0 rounded-full bg-white"
                  style={{
                    width: i < index ? "100%" : i === index && (reduced || total === 1) ? "100%" : "0%",
                    animationDuration: `${interval}ms`,
                    animationPlayState: auto ? "running" : "paused",
                    animationName: i === index && !reduced ? "story-fill" : "none",
                  }}
                />
              </span>
            </button>
          ))}
        </div>

        {/* Legenda */}
        <div className="on-dark pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-5 pb-5 pt-16 text-white">
          <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.18em] text-amarelo">
            Comunidade · {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
          </p>
          <p className="mt-1 max-w-[85%] font-display text-lg font-bold leading-snug" aria-live={auto ? "off" : "polite"}>
            {slides[index].caption}
          </p>
        </div>

        {/* Setas */}
        <div className="absolute bottom-5 right-4 z-20 flex gap-2">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Foto anterior"
            className="grid size-9 place-items-center rounded-full bg-white/90 text-[#1a1405] shadow-lg transition hover:bg-amarelo focus-visible:outline-2 focus-visible:outline-amarelo"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Próxima foto"
            className="grid size-9 place-items-center rounded-full bg-white/90 text-[#1a1405] shadow-lg transition hover:bg-amarelo focus-visible:outline-2 focus-visible:outline-amarelo"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Próximas fotos */}
      {upcoming.length > 0 && (
        <ul className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${upcoming.length}, minmax(0, 1fr))` }}>
          {upcoming.map((i) => (
            <li key={slides[i].src}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Ver foto ${i + 1}: ${slides[i].caption}`}
                className="group/thumb relative block aspect-[4/3] w-full overflow-hidden rounded-xl border-2 border-white shadow-md transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--roxo-deep)]"
              >
                <Image
                  src={slides[i].src}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover transition-transform duration-500 group-hover/thumb:scale-110"
                  style={{ objectPosition: slides[i].position ?? "50% 50%" }}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
