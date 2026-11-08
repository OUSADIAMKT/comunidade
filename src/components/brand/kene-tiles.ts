/**
 * Kené — grafismos vetorizados a partir da prancha de referência usada no site
 * da Ousadia Marketing (padrões shipibo-conibo, Amazônia peruana). Mesmo kit,
 * compartilhado entre as duas marcas.
 *
 * ATENÇÃO — origem cultural: são padrões de um povo indígena específico. Antes
 * do lançamento, vale registrar a origem em uma página "Sobre os grafismos" e
 * validar o uso comercial com representantes do povo ou com especialistas.
 *
 * Cada motivo é um LADRILHO que casa consigo mesmo nas bordas: o traço que sai
 * pela direita entra de novo pela esquerda. Por isso alguns caminhos começam em
 * coordenada negativa ou passam da largura — a parte que sobra é recortada e
 * completada pelo ladrilho vizinho.
 *
 * Por que string e não JSX: o mesmo desenho é usado como `mask-image` (faixas
 * que repetem) e como marcador. Manter a geometria em um lugar só evita que as
 * duas versões saiam de sincronia.
 *
 * O `#fff` do traço é irrelevante no resultado — a máscara só lê o canal alfa,
 * e a cor visível vem de `background-color: currentColor` (ver `.kene` no
 * globals.css). Branco, e não preto, porque se algum motor tratar a máscara
 * como luminância o desenho continua aparecendo em vez de sumir.
 */

export type KeneMotif = "iso" | "ronoa" | "shahuu" | "pushu" | "faba" | "yapa";
export type KeneMark = "quadrado" | "losango" | "triangulo";

type Tile = {
  /** Largura do ladrilho, em unidades do viewBox. */
  w: number;
  /** Altura do ladrilho. */
  h: number;
  /** Corpo do SVG — sem metadados, sem `id`, sem estilo embutido. */
  body: string;
};

/** Tira as quebras de linha: o corpo fica legível aqui e compacto na data URI. */
const c = (s: string) => s.replace(/\s*\n\s*/g, "");

export const KENE: Record<KeneMotif, Tile> = {
  /** Fig. 1 · `Iso puti` — cotovelo de macaco-aranha. Triângulos encaixados. */
  iso: {
    w: 40,
    h: 32,
    body: c(`
      <g fill='none' stroke='#fff' stroke-width='2.4'>
        <path d='M0 2.2h40M0 29.8h40'/>
      </g>
      <g fill='none' stroke='#fff' stroke-width='2.2'>
        <path d='M3 27.6L20 7L37 27.6'/>
        <path d='M10 27.6L20 15L30 27.6'/>
        <path d='M-9 4.4L0 21L9 4.4'/>
        <path d='M31 4.4L40 21L49 4.4'/>
      </g>
    `),
  },

  /** Fig. 2 · `Ahuafuda` / `Ronohua cudu` — borboleta ou sucuri. Losango + X. */
  ronoa: {
    w: 48,
    h: 32,
    body: c(`
      <g fill='none' stroke='#fff' stroke-width='2.4'>
        <path d='M0 2.2h48M0 29.8h48'/>
      </g>
      <g fill='none' stroke='#fff' stroke-width='2.2'>
        <path d='M24 6.5L34 16L24 25.5L14 16Z'/>
        <path d='M-5 6.5L5 25.5M-5 25.5L5 6.5'/>
        <path d='M43 6.5L53 25.5M43 25.5L53 6.5'/>
      </g>
      <g fill='none' stroke='#fff' stroke-width='2'>
        <path d='M24 12L28 16L24 20L20 16Z'/>
      </g>
      <g fill='#fff'>
        <circle cx='24' cy='16' r='1.5'/>
        <path d='M6.5 4.4h6L9.5 9.8Z'/>
        <path d='M6.5 27.6h6L9.5 22.2Z'/>
        <path d='M35.5 4.4h6L38.5 9.8Z'/>
        <path d='M35.5 27.6h6L38.5 22.2Z'/>
      </g>
    `),
  },

  /** Fig. 3 · `Shahuu pushaca` — casco de jabuti. Quadrados concêntricos. */
  shahuu: {
    w: 30,
    h: 30,
    body: c(`
      <g fill='none' stroke='#fff' stroke-width='2.4'>
        <path d='M0 2.2h30M0 27.8h30M1.2 2.2v25.6'/>
      </g>
      <g fill='none' stroke='#fff' stroke-width='2.2'>
        <path d='M7 8h16v14H7Z'/>
      </g>
      <g fill='#fff'>
        <path d='M13 13.5h4v3h-4Z'/>
      </g>
    `),
  },

  /** Fig. 4 · `Pushu futoro` — telhado de casa. Chevrons encaixados. */
  pushu: {
    w: 32,
    h: 24,
    body: c(`
      <g fill='none' stroke='#fff' stroke-width='2.4'>
        <path d='M0 2.2h32M0 21.8h32'/>
      </g>
      <g fill='none' stroke='#fff' stroke-width='2.2'>
        <path d='M0 19.6L8 5.5L16 19.6L24 5.5L32 19.6'/>
      </g>
      <g fill='none' stroke='#fff' stroke-width='2'>
        <path d='M3.6 19.6L8 11.8L12.4 19.6M19.6 5.5L24 13.3L28.4 5.5'/>
      </g>
    `),
  },

  /** Fig. 5 · `Faba ida` — rabo de jacaré. Triângulo cheio, linha e ponto. */
  faba: {
    w: 24,
    h: 18,
    body: c(`
      <g fill='#fff'>
        <path d='M3 11.2L12 1.2L21 11.2Z'/>
        <circle cx='0' cy='16.4' r='1.3'/>
        <circle cx='24' cy='16.4' r='1.3'/>
      </g>
      <g fill='none' stroke='#fff' stroke-width='1.8'>
        <path d='M0 13.6h24'/>
      </g>
    `),
  },

  /**
   * Fig. 6 · `Yapa pishi` — escama de cará. Treliça de losangos.
   * Único que repete nos dois eixos: os cantos do ladrilho completam o losango
   * do vizinho, então a malha fecha sem emenda visível.
   */
  yapa: {
    w: 24,
    h: 24,
    body: c(`
      <g fill='none' stroke='#fff' stroke-width='2'>
        <path d='M12 0L24 12L12 24L0 12Z'/>
      </g>
    `),
  },
};

/**
 * Versões avulsas para marcador de lista. Os ladrilhos acima carregam as réguas
 * da faixa (as duas linhas horizontais), que num bullet de 10px viram sujeira —
 * aqui o desenho é só a figura, centrada e sem régua.
 */
export const KENE_MARKS: Record<KeneMark, Tile> = {
  /** Casco de jabuti reduzido ao quadrado concêntrico (fig. 3). */
  quadrado: {
    w: 16,
    h: 16,
    body: c(`
      <g fill='none' stroke='#fff' stroke-width='2'>
        <path d='M1.5 1.5h13v13h-13Z'/>
      </g>
      <g fill='#fff'><path d='M6 6h4v4H6Z'/></g>
    `),
  },
  /** Losango da sucuri (fig. 2). */
  losango: {
    w: 16,
    h: 16,
    body: c(`
      <g fill='none' stroke='#fff' stroke-width='2'>
        <path d='M8 1L15 8L8 15L1 8Z'/>
      </g>
      <g fill='#fff'><circle cx='8' cy='8' r='1.8'/></g>
    `),
  },
  /** Triângulo cheio do rabo de jacaré (fig. 5). */
  triangulo: {
    w: 16,
    h: 14,
    body: c(`<g fill='#fff'><path d='M1 13L8 1L15 13Z'/></g>`),
  },
};

function toUrl(t: Tile): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${t.w}' height='${t.h}' ` +
    `viewBox='0 0 ${t.w} ${t.h}'>${t.body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Estilo de máscara de um motivo. O `-webkit-` cobre Safari < 15.4. */
export function keneMask(motif: KeneMotif) {
  const url = toUrl(KENE[motif]);
  return { maskImage: url, WebkitMaskImage: url } as const;
}

/** Idem, para os marcadores avulsos. */
export function keneMarkMask(mark: KeneMark) {
  const url = toUrl(KENE_MARKS[mark]);
  return { maskImage: url, WebkitMaskImage: url } as const;
}

/** Proporção do ladrilho — usada pra dar largura certa a um marcador. */
export function keneMarkRatio(mark: KeneMark) {
  const t = KENE_MARKS[mark];
  return t.w / t.h;
}
