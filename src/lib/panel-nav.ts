import type { IconKey } from "@/components/layout/sidebar-nav";
import type { Context } from "@/lib/roles";

/** `mobile`: aparece na barra inferior do celular (até 4 itens; o resto fica em "Mais"). `short`: rótulo curto para essa barra. */
export type NavItem = { href: string; label: string; icon?: IconKey; mobile?: boolean; short?: string };

/** Menus dos painéis — compartilhados com a Escola/Comunidade, que ficam fora do PanelShell. */
export const PROFESSIONAL_NAV: NavItem[] = [
  { href: "/profissional", label: "Visão geral", icon: "home", mobile: true, short: "Início" },
  { href: "/profissional/perfil", label: "Meu perfil", icon: "profile", mobile: true, short: "Perfil" },
  { href: "/profissional/portfolio", label: "Portfólio", icon: "portfolio" },
  { href: "/profissional/servicos", label: "Meus serviços", icon: "services" },
  { href: "/profissional/oportunidades", label: "Oportunidades", icon: "opportunities", mobile: true, short: "Vagas" },
  { href: "/profissional/matches", label: "Matches", icon: "matches", mobile: true },
  { href: "/profissional/propostas", label: "Propostas e contratos", icon: "contracts" },
  { href: "/profissional/avaliacoes", label: "Avaliações", icon: "reviews" },
  { href: "/profissional/plano", label: "Meu plano", icon: "plan" },
  { href: "/escola", label: "Escola", icon: "school" },
  { href: "/comunidade", label: "Comunidade", icon: "community" },
];

export const COMPANY_NAV: NavItem[] = [
  { href: "/empresa", label: "Visão geral", icon: "home", mobile: true, short: "Início" },
  { href: "/empresa/profissionais", label: "Encontrar profissionais", icon: "search", mobile: true, short: "Buscar" },
  { href: "/empresa/servicos", label: "Explorar serviços", icon: "explore" },
  { href: "/empresa/oportunidades", label: "Oportunidades", icon: "opportunities", mobile: true, short: "Vagas" },
  { href: "/empresa/matches", label: "Matches", icon: "matches", mobile: true },
  { href: "/empresa/contratacoes", label: "Contratações", icon: "hires" },
  { href: "/empresa/favoritos", label: "Favoritos", icon: "favorites" },
  { href: "/escola", label: "Escola", icon: "school" },
  { href: "/comunidade", label: "Comunidade", icon: "community" },
  { href: "/empresa/plano", label: "Meu plano", icon: "plan" },
  { href: "/empresa/perfil", label: "Perfil da empresa", icon: "company" },
];

/** Cor de fundo e cor do menu por painel: roxo = profissional, azul-rio = empresa. */
export const PANEL_THEMES: Record<Context, { bg: string; deep: string }> = {
  PROFESSIONAL: { bg: "var(--roxo-bg)", deep: "var(--roxo-deep)" },
  COMPANY: { bg: "var(--azul-bg)", deep: "var(--azul-deep)" },
  ADMIN: { bg: "var(--ink-deep)", deep: "var(--noite-bg)" },
};
