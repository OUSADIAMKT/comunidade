import { EmptyState } from "@/components/shared/empty-state";
import { Hourglass } from "lucide-react";
import Link from "next/link";
import { formatBRL } from "@/lib/constants";
import type { EnrichedMatch, Role } from "@/lib/deals";
import { RespondButtons } from "./respond-buttons";

export const TABS = [
  { key: "pendentes", label: "Interesses" },
  { key: "confirmados", label: "Matches confirmados" },
  { key: "encerrados", label: "Encerrados" },
] as const;
export type TabKey = (typeof TABS)[number]["key"];

export function splitMatches(all: EnrichedMatch[]) {
  return {
    pendentes: all.filter((m) => m.status === "PENDING"),
    confirmados: all.filter((m) => m.status === "MUTUAL_MATCH"),
    encerrados: all.filter((m) => m.status === "DECLINED" || m.status === "EXPIRED"),
  } satisfies Record<TabKey, EnrichedMatch[]>;
}

export function MatchTabs({ base, active, counts }: { base: string; active: TabKey; counts: Record<TabKey, number> }) {
  return (
    <nav aria-label="Abas de matches" className="flex gap-1 border-b">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`${base}?aba=${t.key}`}
          aria-current={active === t.key ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm ${active === t.key ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          {t.label} ({counts[t.key]})
        </Link>
      ))}
    </nav>
  );
}

export function MatchList({ matches, role, proposalsHref }: { matches: EnrichedMatch[]; role: Role; proposalsHref: string }) {
  if (matches.length === 0) {
    return role === "COMPANY" ? (
      <EmptyState
        title="Nenhum match por aqui ainda"
        text="Encontre creators pela especialidade e pela cidade e clique em “Tenho interesse”. Quando o creator aceitar, o WhatsApp dos dois é liberado."
        cta={{ href: "/empresa/profissionais", label: "Buscar talentos agora" }}
      />
    ) : (
      <EmptyState
        title="Nenhum match por aqui ainda"
        text="Candidate-se às oportunidades abertas e mantenha o perfil completo: é assim que as marcas te encontram."
        cta={{ href: "/profissional/oportunidades", label: "Ver oportunidades abertas" }}
      />
    );
  }
  return (
    <ul className="space-y-3">
      {matches.map((m) => (
        <li key={m.id} className="space-y-3 rounded-xl border p-4">
          <div className="flex items-start gap-3">
            {m.other.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.other.avatar} alt="" className="size-12 rounded-full object-cover" />
            ) : (
              <div className="size-12 rounded-full bg-muted" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {m.other.href ? <a href={m.other.href} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">{m.other.name}</a> : m.other.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">{m.other.subtitle}</p>
            </div>
            <time className="text-xs text-muted-foreground" dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleDateString("pt-BR")}</time>
          </div>

          {(m.subject || m.packagePrice || m.campaignBudget || m.contextChips.length > 0) && (
            <div className="space-y-1 rounded-lg bg-muted p-3 text-sm">
              {m.subject && <p><span className="text-muted-foreground">{m.packagePrice ? "Pacote" : "Oportunidade"}:</span> <strong>{m.subject}</strong></p>}
              {m.packagePrice != null && <p>Valor do pacote: {formatBRL(m.packagePrice)}</p>}
              {m.campaignBudget != null && m.campaignBudget > 0 && <p>Orçamento: {formatBRL(m.campaignBudget)} por profissional</p>}
              {m.contextChips.length > 0 && (
                <p className="flex flex-wrap gap-1">
                  {m.contextChips.map((c) => <span key={c} className="rounded-full border bg-background px-2 py-0.5 text-xs">{c}</span>)}
                </p>
              )}
              {m.initialMessage && <p className="italic text-muted-foreground">&ldquo;{m.initialMessage}&rdquo;</p>}
            </div>
          )}

          {m.status === "PENDING" && (m.waitingForMe ? (
            <RespondButtons matchId={m.id} acceptLabel={role === "PROFESSIONAL" ? "Aceitar Match" : "Aceitar contato"} />
          ) : (
            <p className="text-sm text-muted-foreground"><Hourglass className="mr-1 inline size-4" aria-hidden="true" />Aguardando {role === "PROFESSIONAL" ? "a empresa" : "o profissional"} responder.</p>
          ))}

          {m.status === "MUTUAL_MATCH" && (
            <div className="flex flex-wrap items-center gap-2">
              {m.whatsapp ? (
                <a
                  href={m.whatsapp}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex h-8 items-center rounded-lg bg-green-600 px-3 text-sm font-medium text-white hover:bg-green-700"
                >
                  Conversar no WhatsApp
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">O outro lado ainda não cadastrou WhatsApp.</span>
              )}
              {m.hasActiveContract ? (
                <Link href={proposalsHref} className="text-sm underline">Ver contrato em andamento</Link>
              ) : (
                <Link href={`${proposalsHref}?match=${m.id}`} className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted">
                  Ver / Enviar proposta
                </Link>
              )}
            </div>
          )}

          {(m.status === "DECLINED" || m.status === "EXPIRED") && (
            <p className="text-sm text-muted-foreground">{m.status === "DECLINED" ? "Interesse recusado." : "Expirado."}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
