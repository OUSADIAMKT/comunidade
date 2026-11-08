/**
 * Componentes de grafismo kené. Todos são decorativos (`aria-hidden`) e não
 * levam JavaScript — renderizam no servidor e sobrevivem ao export estático.
 *
 * A cor vem sempre de `currentColor`, então quem chama tinge com `text-amarelo`,
 * `text-rio`, `style={{ color }}` ou herança. Ver `.kene` no globals.css.
 */
import type { CSSProperties } from "react";
import {
  keneMarkMask,
  keneMarkRatio,
  keneMask,
  type KeneMark,
  type KeneMotif,
} from "./kene-tiles";

type Base = { className?: string; style?: CSSProperties };

/**
 * Faixa horizontal que repete o motivo. É a peça base — divisor, régua e
 * moldura são só ela com outros ajustes.
 *
 * `height` manda no tamanho do desenho: o ladrilho escala pela altura e a
 * largura sai da proporção, então a faixa nunca estica nem gera scroll lateral.
 */
export function KeneStrip({
  motif = "iso",
  height = 22,
  className = "",
  style,
}: Base & { motif?: KeneMotif; height?: number | string }) {
  return (
    <div
      aria-hidden
      className={`kene kene-x ${className}`}
      style={{ height, ...keneMask(motif), ...style }}
    />
  );
}

/**
 * Divisor de seção: a faixa com respiro em cima e embaixo e as pontas
 * dissolvendo no fundo, pra não virar uma barra atravessada na página.
 *
 * O esmaecimento é uma máscara de gradiente no elemento de fora, e não uma
 * segunda camada na mesma máscara: `mask-composite` ainda varia entre motores,
 * e duas máscaras aninhadas dão o mesmo resultado sem depender dele.
 */
export function SectionDivider({
  motif = "faba",
  height = 15,
  opacity = 0.4,
  fade = true,
  className = "",
  style,
}: Base & {
  motif?: KeneMotif;
  height?: number;
  opacity?: number;
  fade?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={`kene-divider ${className}`}
      style={{ opacity, ...style }}
    >
      <div className={fade ? "kene-fade" : undefined}>
        <KeneStrip motif={motif} height={height} />
      </div>
    </div>
  );
}

/**
 * Régua decorativa — troca um `border-t` por traço grafado. Fica rente, sem
 * respiro próprio: o espaçamento é de quem chama, igual a uma borda.
 */
export function KeneRule({
  motif = "pushu",
  height = 11,
  opacity = 0.3,
  className = "",
  style,
}: Base & { motif?: KeneMotif; height?: number; opacity?: number }) {
  return (
    <KeneStrip
      motif={motif}
      height={height}
      className={className}
      style={{ opacity, ...style }}
    />
  );
}

/**
 * Marcador de lista. `size` é a altura; a largura acompanha a proporção do
 * desenho, então o triângulo não sai achatado ao lado do quadrado.
 */
export function KeneBullet({
  mark = "quadrado",
  size = 10,
  className = "",
  style,
}: Base & { mark?: KeneMark; size?: number }) {
  return (
    <span
      aria-hidden
      className={`kene kene-one shrink-0 ${className}`}
      style={{
        height: size,
        width: size * keneMarkRatio(mark),
        ...keneMarkMask(mark),
        ...style,
      }}
    />
  );
}

/**
 * Fundo grafado de grande formato. Preenche o elemento posicionado mais próximo,
 * então a seção precisa de `relative overflow-hidden` — sem o overflow, a malha
 * vaza e cria scroll lateral no celular.
 *
 * `opacity` fica baixo de propósito: é textura de fundo, não desenho.
 */
export function KeneField({
  motif = "yapa",
  scale = 88,
  opacity = 0.05,
  className = "",
  style,
}: Base & { motif?: KeneMotif; scale?: number; opacity?: number }) {
  const size = `${scale}px auto`;
  return (
    <div
      aria-hidden
      className={`kene kene-tile pointer-events-none absolute inset-0 ${className}`}
      style={{
        opacity,
        maskSize: size,
        WebkitMaskSize: size,
        ...keneMask(motif),
        ...style,
      }}
    />
  );
}
