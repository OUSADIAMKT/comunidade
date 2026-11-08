"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  Compass,
  CreditCard,
  FileSignature,
  GraduationCap,
  Handshake,
  Heart,
  Image as ImageIcon,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  Package,
  Search,
  Sparkles,
  Star,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";

/** Ícones por chave (string) — o layout é Server Component e não pode passar componentes. */
const ICONS = {
  home: LayoutDashboard,
  profile: UserRound,
  portfolio: ImageIcon,
  services: Package,
  opportunities: Briefcase,
  matches: Sparkles,
  contracts: FileSignature,
  reviews: Star,
  plan: CreditCard,
  school: GraduationCap,
  community: MessagesSquare,
  search: Search,
  explore: Compass,
  hires: Handshake,
  favorites: Heart,
  company: Building2,
  verified: BadgeCheck,
} satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof ICONS;
export type IconNavItem = { href: string; label: string; icon: IconKey; mobile?: boolean; short?: string };

function Badge({ n, className = "" }: { n?: number; className?: string }) {
  if (!n) return null;
  return (
    <span
      className={`grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[0.65rem] font-bold leading-5 text-white ${className}`}
      aria-label={`${n} pendente${n > 1 ? "s" : ""}`}
    >
      {n > 9 ? "9+" : n}
    </span>
  );
}

/**
 * Navegação dos painéis.
 * Desktop (lg+): grade de 2 colunas fixa à esquerda.
 * Celular: barra fixa no rodapé com os itens `mobile` + botão "Mais" que abre a lista completa.
 * `badges`: contadores por href (ex.: matches aguardando resposta).
 */
export function SidebarNav({
  items,
  label,
  badges = {},
}: {
  items: IconNavItem[];
  label: string;
  badges?: Record<string, number>;
}) {
  const pathname = usePathname();
  // O menu "Mais" guarda a rota em que foi aberto: ao navegar, fecha sozinho
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (v: boolean) => setOpenAt(v ? pathname : null);

  const isActive = (href: string) => {
    if (pathname === href) return true;
    // A raiz do painel só fica ativa na rota exata; os demais itens (inclusive /escola
    // e /comunidade) também valem para as subpáginas.
    if (href === "/profissional" || href === "/empresa") return false;
    return pathname.startsWith(`${href}/`);
  };

  const primary = items.filter((i) => i.mobile).slice(0, 4);
  const rest = items.filter((i) => !primary.includes(i));
  const restActive = rest.some((i) => isActive(i.href));
  const restBadges = rest.reduce((sum, i) => sum + (badges[i.href] ?? 0), 0);

  return (
    <>
      {/* Desktop */}
      <nav
        aria-label={label}
        className="hidden lg:sticky lg:top-20 lg:m-4 lg:mr-0 lg:grid lg:w-60 lg:shrink-0 lg:grid-cols-2 lg:gap-2 lg:self-start lg:rounded-2xl lg:p-3 lg:shadow-lg"
        style={{ background: "var(--panel-deep)" }}
      >
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                "relative flex flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-center text-[0.72rem] font-semibold leading-tight transition-all " +
                (active
                  ? "bg-amarelo text-[#1a1405] shadow-md"
                  : "text-white/80 hover:-translate-y-0.5 hover:bg-white/15 hover:text-white")
              }
            >
              <Icon className="size-7" strokeWidth={active ? 2.4 : 1.9} aria-hidden />
              <span>{item.label}</span>
              <Badge n={badges[item.href]} className="absolute right-2 top-2" />
            </Link>
          );
        })}
      </nav>

      {/* Celular: lista completa do "Mais" */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Todas as seções">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Fechar menu" onClick={() => setOpen(false)} />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl"
            style={{ background: "var(--panel-deep)" }}
          >
            <div className="mb-3 flex items-center justify-between text-white">
              <span className="font-semibold">Todas as seções</span>
              <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-lg hover:bg-white/15" aria-label="Fechar">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <ul className="grid grid-cols-3 gap-2">
              {items.map((item) => {
                const active = isActive(item.href);
                const Icon = ICONS[item.icon];
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={
                        "relative flex h-full flex-col items-center justify-center gap-1.5 rounded-xl px-1 py-3 text-center text-[0.72rem] font-semibold leading-tight " +
                        (active ? "bg-amarelo text-[#1a1405]" : "text-white/85 hover:bg-white/15")
                      }
                    >
                      <Icon className="size-6" aria-hidden />
                      <span>{item.label}</span>
                      <Badge n={badges[item.href]} className="absolute right-1.5 top-1.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Celular: barra inferior fixa */}
      <nav
        aria-label={label}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.25)] lg:hidden"
        style={{ background: "var(--panel-deep)" }}
      >
        {primary.map((item) => {
          const active = isActive(item.href);
          const Icon = ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={"relative flex flex-col items-center gap-1 py-2.5 text-[0.68rem] font-semibold " + (active ? "text-amarelo" : "text-white/75")}
            >
              <Icon className="size-6" strokeWidth={active ? 2.4 : 1.9} aria-hidden />
              <span>{item.short ?? item.label}</span>
              <Badge n={badges[item.href]} className="absolute left-1/2 top-1 ml-2" />
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          className={"relative flex flex-col items-center gap-1 py-2.5 text-[0.68rem] font-semibold " + (restActive ? "text-amarelo" : "text-white/75")}
        >
          <Menu className="size-6" aria-hidden />
          <span>Mais</span>
          <Badge n={restBadges} className="absolute left-1/2 top-1 ml-2" />
        </button>
      </nav>
    </>
  );
}
