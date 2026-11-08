export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const AMAZON_POLES = [
  "Metropolitana de Belém",
  "Xingu / Transamazônica",
  "Tapajós",
  "Baixo Amazonas",
  "Marajó",
  "Carajás",
  "Manaus e Entorno",
  "Alto Solimões",
  "Rondônia / Acre",
  "Amapá / Guianas",
] as const;

export const NICHES = [
  "Beleza", "Bioeconomia", "Cosméticos", "Gastronomia", "Turismo", "Moda",
  "Tecnologia", "Saúde e Bem-estar", "Educação", "Comércio Local", "Indústria",
  "Agro", "Imobiliário", "Eventos", "Pets", "Fitness",
] as const;

export const WORK_MODALITIES = {
  REMOTE: "Remoto",
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
} as const;

export type WorkModality = keyof typeof WORK_MODALITIES;

export const MIN_SCORE_TO_PUBLISH = 80;
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

export function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

export function formatBRL(v: number | string | null | undefined) {
  return Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function isHttpUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Idade mínima do titular da conta. Menores não se cadastram: o pai, mãe ou responsável legal faz o cadastro. */
export const MIN_ACCOUNT_AGE = 18;

/** `iso` é uma data AAAA-MM-DD. Retorna a idade completa hoje, ou null se a data for inválida. */
export function ageFromISODate(iso: string, now = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const born = new Date(Date.UTC(y, mo - 1, d));
  if (born.getUTCFullYear() !== y || born.getUTCMonth() !== mo - 1 || born.getUTCDate() !== d) return null;
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() + 1 < mo || (now.getUTCMonth() + 1 === mo && now.getUTCDate() < d)) age -= 1;
  return age >= 0 ? age : null;
}

export const UNDERAGE_MESSAGE =
  "Menores de 18 anos não podem criar conta. O pai, a mãe ou o responsável legal deve fazer o cadastro e responde pela conta.";
