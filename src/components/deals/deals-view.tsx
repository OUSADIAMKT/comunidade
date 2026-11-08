import { formatBRL } from "@/lib/constants";
import type { ContractRow, EnrichedMatch, ProposalRow, Role } from "@/lib/deals";
import { ContractCard, ProposalCard, ProposalForm } from "./deal-forms";

export function DealsView({
  role, confirmed, proposals, contracts, openMatchId,
}: {
  role: Role;
  confirmed: EnrichedMatch[];
  proposals: ProposalRow[];
  contracts: ContractRow[];
  openMatchId?: string;
}) {
  const incoming = proposals.filter((p) => !p.senderIsMe && p.status === "SENT");
  const others = proposals.filter((p) => !(!p.senderIsMe && p.status === "SENT"));
  const activeContracts = contracts.filter((c) => c.status === "ACTIVE" || c.status === "DELIVERED");
  const pastContracts = contracts.filter((c) => !(c.status === "ACTIVE" || c.status === "DELIVERED"));

  return (
    <div className="space-y-10">
      {incoming.length > 0 && (
        <section className="space-y-3" aria-label="Propostas recebidas">
          <h2 className="font-semibold">Propostas para você responder ({incoming.length})</h2>
          <ul className="space-y-3">{incoming.map((p) => <ProposalCard key={p.id} p={p} />)}</ul>
        </section>
      )}

      <section className="space-y-3" aria-label="Contratos em andamento">
        <h2 className="font-semibold">Contratos em andamento ({activeContracts.length})</h2>
        {activeContracts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum contrato em andamento. Quando uma proposta for aceita, ele aparece aqui.</p>
        ) : (
          <ul className="space-y-3">{activeContracts.map((c) => <ContractCard key={c.id} c={c} role={role} />)}</ul>
        )}
      </section>

      <section className="space-y-3" aria-label="Enviar proposta">
        <h2 className="font-semibold">Enviar proposta a um match</h2>
        {confirmed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem matches confirmados livres para uma nova proposta.</p>
        ) : (
          <ul className="space-y-2">
            {confirmed.map((m) => (
              <li key={m.id} className="rounded-xl border">
                <details open={openMatchId === m.id} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 [&::-webkit-details-marker]:hidden">
                    <span>
                      <strong>{m.other.name}</strong>
                      {m.subject && <span className="text-sm text-muted-foreground"> · {m.subject}</span>}
                      {(m.packagePrice ?? m.campaignBudget) ? (
                        <span className="text-sm text-muted-foreground"> · {formatBRL(m.packagePrice ?? m.campaignBudget)}</span>
                      ) : null}
                    </span>
                    <span aria-hidden className="transition-transform group-open:rotate-180">▾</span>
                  </summary>
                  <div className="border-t p-3">
                    <ProposalForm
                      matchId={m.id}
                      defaults={{
                        scope: m.subject ?? "",
                        amount: m.packagePrice ?? (m.campaignBudget && m.campaignBudget > 0 ? m.campaignBudget : 0),
                        days: 7,
                      }}
                    />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      {others.length > 0 && (
        <section className="space-y-3" aria-label="Histórico de propostas">
          <h2 className="font-semibold">Histórico de propostas</h2>
          <ul className="space-y-3">{others.map((p) => <ProposalCard key={p.id} p={p} />)}</ul>
        </section>
      )}

      {pastContracts.length > 0 && (
        <section className="space-y-3" aria-label="Contratos encerrados">
          <h2 className="font-semibold">Contratos encerrados</h2>
          <ul className="space-y-3">{pastContracts.map((c) => <ContractCard key={c.id} c={c} role={role} />)}</ul>
        </section>
      )}
    </div>
  );
}
