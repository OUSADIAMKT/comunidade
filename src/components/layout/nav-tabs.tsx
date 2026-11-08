"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

/** Abas de navegação com item ativo. Itens de raiz (ex.: /empresa) só ficam ativos na rota exata. */
export function NavTabs({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => {
    if (pathname === href) return true;
    const depth = href.split("/").filter(Boolean).length;
    return depth > 1 && pathname.startsWith(`${href}/`);
  };

  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto px-4 py-2 sm:px-6">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
              (active
                ? "bg-amarelo text-[#1a1405]"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
