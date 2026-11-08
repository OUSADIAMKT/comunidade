/**
 * Motor determinístico de compatibilidade (SPEC §5.1) — sem IA, funções puras.
 *
 * Pontos por critério:
 *   +40 categoria: a categoria buscada é a PRINCIPAL do profissional ou ele tem pacote ativo nela
 *   +25 preço:     preço efetivo <= orçamento informado
 *   +20 local:     mesma UF *e* mesma cidade
 *   +15 nicho:     interseção entre os nichos do profissional e o nicho buscado
 *
 * Só entram no cálculo os critérios que a empresa preencheu: o score é
 * pontos / pontos possíveis * 100, então quem busca só por categoria não vê todo
 * mundo "travado" em 40. Empate técnico: destaque (assinatura legada com perfil em destaque) primeiro, depois melhor nota.
 */

export type WorkModality = "REMOTE" | "ONSITE" | "HYBRID";

export type SearchFilters = {
  categoryId: string;
  uf?: string;
  city?: string;
  pole?: string;
  niche?: string;
  budget?: number;
  modality?: WorkModality;
};

export type Candidate = {
  id: string;
  categoryIds: string[];
  primaryCategoryId: string | null;
  niches: string[];
  startingPrice: number;
  stateUf: string;
  city: string;
  pole: string | null;
  workModality: WorkModality;
  isPro: boolean;
  ratingAvg: number;
  /** preços dos pacotes ATIVOS do profissional na categoria buscada */
  packagePrices: number[];
};

export type ScoreReason = "category" | "price" | "location" | "niche";

export type Scored<T extends Candidate> = {
  candidate: T;
  score: number;
  reasons: ScoreReason[];
  /** menor preço que a empresa pagaria (pacote ou "a partir de") */
  effectivePrice: number | null;
};

export const POINTS = { category: 40, price: 25, location: 20, niche: 15 } as const;

const norm = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

export function effectivePrice(c: Candidate): number | null {
  const prices = [...c.packagePrices, ...(c.startingPrice > 0 ? [c.startingPrice] : [])].filter((p) => p > 0);
  return prices.length ? Math.min(...prices) : null;
}

export function sameLocation(c: Candidate, f: SearchFilters) {
  return !!f.uf && !!f.city && c.stateUf === f.uf && norm(c.city) === norm(f.city);
}

/** Filtros eliminatórios: categoria obrigatória e, se presencial, mesma cidade. */
export function passesHardFilters(c: Candidate, f: SearchFilters): boolean {
  if (!c.categoryIds.includes(f.categoryId)) return false;
  if (f.modality === "ONSITE") return c.workModality !== "REMOTE" && sameLocation(c, f);
  if (f.modality === "REMOTE") return c.workModality !== "ONSITE";
  return true;
}

export function scoreCandidate<T extends Candidate>(c: T, f: SearchFilters): Scored<T> {
  let points = 0;
  let possible = POINTS.category;
  const reasons: ScoreReason[] = [];
  const price = effectivePrice(c);

  if (c.primaryCategoryId === f.categoryId || c.packagePrices.length > 0) {
    points += POINTS.category;
    reasons.push("category");
  }

  if (f.budget && f.budget > 0) {
    possible += POINTS.price;
    if (price !== null && price <= f.budget) {
      points += POINTS.price;
      reasons.push("price");
    }
  }

  if (f.uf && f.city) {
    possible += POINTS.location;
    if (sameLocation(c, f)) {
      points += POINTS.location;
      reasons.push("location");
    }
  }

  if (f.niche) {
    possible += POINTS.niche;
    if (c.niches.some((n) => norm(n) === norm(f.niche))) {
      points += POINTS.niche;
      reasons.push("niche");
    }
  }

  return { candidate: c, score: Math.round((points / possible) * 100), reasons, effectivePrice: price };
}

export function rankCandidates<T extends Candidate>(candidates: T[], f: SearchFilters): Scored<T>[] {
  return candidates
    .filter((c) => passesHardFilters(c, f))
    .map((c) => scoreCandidate(c, f))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.candidate.isPro) - Number(a.candidate.isPro) ||
        b.candidate.ratingAvg - a.candidate.ratingAvg,
    );
}

export const REASON_LABEL: Record<ScoreReason, string> = {
  category: "Categoria",
  price: "Cabe no orçamento",
  location: "Mesma cidade",
  niche: "Nicho",
};
