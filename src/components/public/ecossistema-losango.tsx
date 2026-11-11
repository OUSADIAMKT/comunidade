"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Ecossistema em alvo concêntrico: Agência no centro, Escola ao redor e
 * Comunidade por fora. As abas (ou o clique no alvo) mudam a camada
 * marcada pelo avatar "Você" e o cartão ao lado.
 *
 * Componente independente: o mesmo arquivo vive em ousadiamarketing.com.br e em
 * creators (comunidade). Só mudam as fotos e os links, passados por props.
 */

type Camada = "agencia" | "escola" | "comunidade";

export type EcossistemaLosangoProps = {
  fotos: Record<Camada, string>;
  links: Record<Camada, string>;
  /** Links que saem do site (abrem em nova aba). */
  externos?: Partial<Record<Camada, boolean>>;
};

const AM = "#ffc61a";
const VD = "#23b26f";
const AZ = "#18a5c9";

const DADOS: Record<
  Camada,
  {
    aba: string;
    cor: string;
    r: number;
    rotulo: string;
    titulo: string;
    itens: string[];
    depois: string;
    cta: string;
    alt: string;
  }
> = {
  agencia: {
    aba: "Sou marca",
    cor: AM,
    r: 0,
    rotulo: "Você está na Agência",
    titulo: "Pra quem precisa vender mais e comunicar melhor.",
    itens: ["Diagnóstico da marca", "Estratégia e campanhas", "Conteúdo e eventos", "Squad de creators da região"],
    depois:
      "Com a campanha no ar, os cases viram aula na Escola e o seu squad vem da Comunidade, com creators já avaliados.",
    cta: "Solicitar proposta",
    alt: "Equipe da Ousadia Marketing sorrindo em um evento",
  },
  escola: {
    aba: "Quero aprender",
    cor: VD,
    r: 110,
    rotulo: "Você está na Escola",
    titulo: "Pra quem tá começando, se profissionalizando ou quer acelerar.",
    itens: ["Social Media Ousado", "UGC Creator", "Destrave", "IA para Iniciantes"],
    depois:
      "Com projeto real na mão, você entra na vitrine da Comunidade, pode tirar o Selo Creators e ser chamado pros squads da Agência.",
    cta: "Ver cursos",
    alt: "Turma da Escola Ousadia segurando os certificados",
  },
  comunidade: {
    aba: "Quero crescer junto",
    cor: AZ,
    r: 162,
    rotulo: "Você está na Comunidade",
    titulo: "Pra quem quer ser creator e transformar talento em renda.",
    itens: ["Cadastro grátis, sem cartão", "Perfil e portfólio na vitrine", "Match com empresas da região", "Selo Creators"],
    depois:
      "Cada entrega vira avaliação e portfólio. Quem se destaca é chamado pros squads da Agência e vira case nas aulas da Escola.",
    cta: "Criar perfil grátis",
    alt: "Encontro da comunidade de creators da Amazônia",
  },
};

const ORDEM: Camada[] = ["agencia", "escola", "comunidade"];

/** Raio de cada anel, de fora pra dentro (viewBox 400, centro 200). */
const ANEIS: { id: Camada; r: number; fundo: string; nome: string; fonte: number; texto: string }[] = [
  { id: "comunidade", r: 190, fundo: "#1d4f78", nome: "COMUNIDADE", fonte: 13, texto: "#cfeeff" },
  { id: "escola", r: 135, fundo: "#1f8f5a", nome: "ESCOLA", fonte: 12, texto: "#10061f" },
  { id: "agencia", r: 85, fundo: "#53318f", nome: "AGÊNCIA", fonte: 10, texto: AM },
];

function Destino({ href, externo, className, children }: { href: string; externo?: boolean; className: string; children: React.ReactNode }) {
  return externo ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function EcossistemaLosango({ fotos, links, externos = {} }: EcossistemaLosangoProps) {
  const [ativa, setAtiva] = useState<Camada>("escola");
  const d = DADOS[ativa];

  return (
    <section
      id="ecossistema"
      className="relative scroll-mt-20 overflow-hidden"
      style={{
        background:
          "radial-gradient(60% 50% at 85% 15%, rgba(255,198,26,0.10), transparent 70%), radial-gradient(55% 45% at 10% 90%, rgba(24,165,201,0.14), transparent 70%), linear-gradient(180deg, #1d0c39 0%, #140a26 100%)",
      }}
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
        <p className="mb-4 font-mono text-[0.7rem] font-bold uppercase tracking-[0.2em]" style={{ color: AM }}>
          O ecossistema
        </p>
        <h2 className="max-w-2xl font-display text-3xl font-bold leading-[1.1] text-white sm:text-4xl lg:text-[2.6rem]">
          Onde você está agora? <span style={{ color: AM }}>A gente mostra o próximo passo.</span>
        </h2>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-[#c9bfe0] sm:text-base">
          Agência, Escola e Comunidade são três camadas de um mesmo desenho. Escolha o seu ponto de partida.
        </p>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1fr_minmax(0,28rem)] lg:gap-14">
          {/* Alvo */}
          <svg
            viewBox="0 0 400 400"
            role="img"
            aria-label="Alvo concêntrico: Agência no centro, Escola ao redor e Comunidade por fora. O avatar marca onde você está."
            className="mx-auto h-auto w-full max-w-[26rem] overflow-visible lg:max-w-[30rem]"
          >
            <defs>
              {/* Arcos no meio de cada anel (média dos raios), por cima, da esquerda pra direita.
                  A Agência é um disco inteiro: o arco dela usa 40 como raio interno pra
                  deixar o centro livre pro avatar. */}
              {ANEIS.map((a, i) => {
                const m = (a.r + (ANEIS[i + 1]?.r ?? 40)) / 2;
                return <path key={a.id} id={`eco-arco-${a.id}`} d={`M ${200 - m} 200 A ${m} ${m} 0 0 1 ${200 + m} 200`} fill="none" />;
              })}
            </defs>

            {ANEIS.map((a) => (
              <circle
                key={a.id}
                cx={200}
                cy={200}
                r={a.r}
                fill={a.fundo}
                stroke={ativa === a.id ? "#fff" : "#10061f"}
                strokeWidth={ativa === a.id ? 4 : 3}
                className="cursor-pointer transition-opacity hover:opacity-90"
                onClick={() => setAtiva(a.id)}
              />
            ))}
            <g className="font-mono" fontWeight={700} letterSpacing={2} pointerEvents="none">
              {ANEIS.map((a) => (
                <text key={a.id} fontSize={a.fonte} fill={a.texto} dominantBaseline="central">
                  <textPath href={`#eco-arco-${a.id}`} startOffset="50%" textAnchor="middle">
                    {a.nome}
                  </textPath>
                </text>
              ))}
            </g>

            {/* Marcador "Você": avatar no meio da faixa ativa (no centro, quando é a Agência) */}
            <g
              style={{ transform: `translate(${200 + d.r}px, 200px)`, transition: "transform 0.5s cubic-bezier(.4,0,.2,1)" }}
              pointerEvents="none"
            >
              <circle r={17} fill={AM} stroke="#10061f" strokeWidth={3} />
              <circle cy={-6} r={5} fill="#10061f" />
              <path d="M -9 10 a 9 8 0 0 1 18 0 z" fill="#10061f" />
              <g transform="translate(0 -34)">
                <rect x={-22} y={-10} width={44} height={20} rx={10} fill="#10061f" />
                <text y={0.5} textAnchor="middle" dominantBaseline="central" className="font-mono" fontSize={9.5} fontWeight={700} letterSpacing={1.5} fill="#fff">
                  VOCÊ
                </text>
              </g>
            </g>
          </svg>

          {/* Abas + cartão */}
          <div>
            <div role="tablist" aria-label="Seu ponto de partida" className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
              {ORDEM.map((id) => {
                const on = ativa === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`eco-aba-${id}`}
                    aria-selected={on}
                    aria-controls="eco-painel"
                    onClick={() => setAtiva(id)}
                    className="rounded-lg px-2 py-2.5 text-center text-xs font-semibold leading-tight transition-colors sm:text-[0.8rem]"
                    style={on ? { background: DADOS[id].cor, color: "#0b1a12" } : { color: "#e6e0f0" }}
                  >
                    {DADOS[id].aba}
                  </button>
                );
              })}
            </div>

            <div
              id="eco-painel"
              role="tabpanel"
              aria-labelledby={`eco-aba-${ativa}`}
              className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#170b2b]"
            >
              <div className="relative aspect-[16/8] w-full">
                <Image key={ativa} src={fotos[ativa]} alt={d.alt} fill sizes="(min-width: 1024px) 28rem, 100vw" className="object-cover" />
              </div>
              <div className="p-5 sm:p-6">
                <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.18em]" style={{ color: d.cor }}>
                  {d.rotulo}
                </p>
                <h3 className="mt-2 font-display text-xl font-bold leading-snug text-white">{d.titulo}</h3>
                <ul className="mt-4 space-y-2 text-sm text-[#e6e0f0]">
                  {d.itens.map((t) => (
                    <li key={t} className="flex items-center gap-3">
                      <span aria-hidden className="size-2 shrink-0" style={{ background: d.cor }} />
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 rounded-lg border border-dashed border-white/25 p-3.5">
                  <p className="font-mono text-[0.6rem] font-bold uppercase tracking-[0.18em] text-white">E depois?</p>
                  <p className="mt-1.5 text-[0.82rem] leading-relaxed text-[#c9bfe0]">{d.depois}</p>
                </div>
                <Destino
                  href={links[ativa]}
                  externo={externos[ativa]}
                  className="mt-5 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider transition-transform hover:translate-x-1"
                >
                  <span style={{ color: d.cor }}>{d.cta}</span>
                  <ArrowRight size={14} aria-hidden style={{ color: d.cor }} />
                </Destino>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
