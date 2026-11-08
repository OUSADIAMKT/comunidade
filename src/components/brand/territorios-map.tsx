import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AMAZON_POLES } from "@/lib/constants";
import { UF_PATHS } from "./brasil-paths";

/**
 * Posição aproximada de cada polo (longitude, latitude), na mesma ordem de
 * `AMAZON_POLES`. Cada polo é um território, não uma cidade: o alfinete marca a
 * cidade de referência do território.
 */
const POLE_POINTS: Record<(typeof AMAZON_POLES)[number], { lon: number; lat: number; ref: string }> = {
  "Metropolitana de Belém": { lon: -48.5, lat: -1.45, ref: "Belém" },
  "Xingu / Transamazônica": { lon: -52.21, lat: -3.2, ref: "Altamira" },
  Tapajós: { lon: -55.98, lat: -4.28, ref: "Itaituba" },
  "Baixo Amazonas": { lon: -54.71, lat: -2.44, ref: "Santarém" },
  Marajó: { lon: -50.3, lat: -0.95, ref: "Ilha do Marajó" },
  Carajás: { lon: -49.9, lat: -6.07, ref: "Parauapebas" },
  "Manaus e Entorno": { lon: -60.02, lat: -3.12, ref: "Manaus" },
  "Alto Solimões": { lon: -69.94, lat: -4.25, ref: "Tabatinga" },
  "Rondônia / Acre": { lon: -65.6, lat: -9.4, ref: "Porto Velho · Rio Branco" },
  "Amapá / Guianas": { lon: -51.07, lat: 0.03, ref: "Macapá" },
};

/** Estados do Norte (destacados) e vizinhos da Amazônia Legal (meio-tom). */
const NORTE = new Set(["11", "12", "13", "14", "15", "16"]);
const LEGAL = new Set(["17", "21", "51"]);

/**
 * Mapa da Amazônia com os 10 polos numerados. Desenho feito a partir da malha
 * oficial de UFs do IBGE. Roda no servidor, sem JavaScript. A legenda numerada
 * fica ao lado, no HTML, para leitores de tela e para o celular.
 */
export function TerritoriosMap() {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <figure className="relative [mask-image:radial-gradient(ellipse_75%_80%_at_42%_38%,#000_55%,transparent_100%)]">
        <svg
          viewBox="-75 -6.8 35 27"
          className="h-auto w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
          role="img"
          aria-label="Mapa da região Norte do Brasil com os dez polos territoriais da Amazônia numerados"
        >
          <g transform="scale(0.0001,-0.0001)">
            {Object.entries(UF_PATHS).map(([id, d]) => {
              const norte = NORTE.has(id);
              const legal = LEGAL.has(id);
              return (
                <path
                  key={id}
                  d={d}
                  vectorEffect="non-scaling-stroke"
                  fill={norte ? "rgba(88,211,236,0.28)" : legal ? "rgba(255,241,214,0.12)" : "rgba(255,241,214,0.05)"}
                  stroke={norte ? "rgba(88,211,236,0.9)" : "rgba(255,241,214,0.28)"}
                  strokeWidth={norte ? 1.4 : 0.8}
                />
              );
            })}
          </g>

          {AMAZON_POLES.map((polo, i) => {
            const p = POLE_POINTS[polo];
            return (
              <g key={polo} transform={`translate(${p.lon} ${-p.lat})`}>
                <title>{`${i + 1}. ${polo} (${p.ref})`}</title>
                <circle r={0.62} fill="#ffc61a" stroke="#1d1530" strokeWidth={0.12} />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={0.74}
                  fontWeight={700}
                  fill="#1a1405"
                  style={{ fontFamily: "var(--font-chakra), sans-serif" }}
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </figure>

      <ol className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {AMAZON_POLES.map((polo, i) => (
          <li key={polo}>
            <Link
              href={`/talentos?polo=${encodeURIComponent(polo)}`}
              className="group surface surface-hover flex h-full items-center gap-3 !rounded-xl px-3.5 py-2.5"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amarelo font-display text-sm font-bold text-[#1a1405]">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-sm font-semibold">{polo}</span>
                <span className="block text-xs text-muted-foreground">{POLE_POINTS[polo].ref}</span>
              </span>
              <ArrowRight
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-amarelo"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
