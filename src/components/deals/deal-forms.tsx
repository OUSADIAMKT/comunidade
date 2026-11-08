"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/shared/select";
import { formatBRL } from "@/lib/constants";
import type { ContractRow, ProposalRow } from "@/lib/deals";
import {
  cancelContract, completeContract, counterProposal, deliverContract,
  reopenContract, respondProposal, sendProposal,
} from "@/app/actions/deals";

type Result = { ok: boolean; error?: string; message?: string };

function useRun() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  function run(fn: () => Promise<Result>, onOk?: () => void) {
    setError("");
    setMessage("");
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Erro.");
      else {
        setMessage(res.message ?? "");
        onOk?.();
      }
      router.refresh();
    });
  }
  return { pending, error, message, run };
}

const Feedback = ({ error, message }: { error: string; message: string }) => (
  <div aria-live="polite">
    {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    {message && <p className="text-sm text-floresta">{message}</p>}
  </div>
);

/* ─────────── Nova proposta (ou contraproposta) ─────────── */
export function ProposalForm({
  matchId, proposalId, defaults, submitLabel = "Enviar proposta", onDone,
}: {
  matchId: string;
  proposalId?: string; // preenchido => contraproposta
  defaults: { scope: string; amount: number; days: number };
  submitLabel?: string;
  onDone?: () => void;
}) {
  const { pending, error, message, run } = useRun();
  const [scope, setScope] = useState(defaults.scope);
  const [amount, setAmount] = useState(String(defaults.amount || ""));
  const [days, setDays] = useState(String(defaults.days || 7));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { scope, amount: Number(amount), days: Number(days) };
    run(() => (proposalId ? counterProposal({ proposalId, ...payload }) : sendProposal({ matchId, ...payload })), onDone);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Escopo do serviço" htmlFor={`scope-${proposalId ?? matchId}`}>
        <Textarea id={`scope-${proposalId ?? matchId}`} rows={3} value={scope} onChange={(e) => setScope(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)" htmlFor={`amount-${proposalId ?? matchId}`}>
          <Input id={`amount-${proposalId ?? matchId}`} type="number" min={1} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Prazo (dias)" htmlFor={`days-${proposalId ?? matchId}`}>
          <Input id={`days-${proposalId ?? matchId}`} type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
        </Field>
      </div>
      <Feedback error={error} message={message} />
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Enviando..." : submitLabel}</Button>
    </form>
  );
}

/* ─────────── Cartão de proposta ─────────── */
const PROPOSAL_STATUS = {
  SENT: "Aguardando resposta", ACCEPTED: "Aceita", DECLINED: "Recusada", COUNTER_OFFER: "Contraproposta enviada",
} as const;

export function ProposalCard({ p }: { p: ProposalRow }) {
  const { pending, error, message, run } = useRun();
  const [countering, setCountering] = useState(false);
  const incoming = !p.senderIsMe && p.status === "SENT";

  return (
    <li className="space-y-2 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{p.senderIsMe ? "Você enviou para" : "Proposta de"} {p.otherName}</p>
          {p.subject && <p className="text-xs text-muted-foreground">{p.subject}</p>}
        </div>
        <div className="text-right">
          <p className="font-bold">{formatBRL(p.amount)}</p>
          <p className="text-xs text-muted-foreground">{p.days} dias</p>
        </div>
      </div>
      <p className="whitespace-pre-line text-sm">{p.scope}</p>
      <p className="text-xs text-muted-foreground">{PROPOSAL_STATUS[p.status]} · {new Date(p.createdAt).toLocaleDateString("pt-BR")}</p>

      {incoming && !countering && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={pending} onClick={() => run(() => respondProposal(p.id, "ACCEPTED"))}>Aceitar e contratar</Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setCountering(true)}>Contraproposta</Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => respondProposal(p.id, "DECLINED"))}>Recusar</Button>
        </div>
      )}
      {incoming && countering && (
        <div className="rounded-lg border bg-muted p-3">
          <ProposalForm matchId={p.matchId} proposalId={p.id} submitLabel="Enviar contraproposta"
            defaults={{ scope: p.scope, amount: p.amount, days: p.days }} onDone={() => setCountering(false)} />
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setCountering(false)}>Cancelar</Button>
        </div>
      )}
      <Feedback error={error} message={message} />
    </li>
  );
}

/* ─────────── Cartão de contrato ─────────── */
const CONTRACT_STATUS = {
  ACTIVE: "Em andamento", DELIVERED: "Entrega enviada", COMPLETED: "Concluído", DISPUTED: "Em disputa", CANCELLED: "Cancelado",
} as const;

function Stars({ value }: { value: number }) {
  return <span aria-label={`${value} de 5 estrelas`} className="text-amarelo">{"★".repeat(value)}{"☆".repeat(5 - value)}</span>;
}

export function ContractCard({ c, role }: { c: ContractRow; role: "PROFESSIONAL" | "COMPANY" }) {
  const { pending, error, message, run } = useRun();
  const [link, setLink] = useState(c.deliveryLink ?? "");
  const [notes, setNotes] = useState(c.deliveryNotes ?? "");
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const open = c.status === "ACTIVE" || c.status === "DELIVERED";

  return (
    <li className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{c.title}</p>
          <p className="text-xs text-muted-foreground">{role === "COMPANY" ? "Profissional" : "Empresa"}: {c.otherName}</p>
        </div>
        <div className="text-right">
          <p className="font-bold">{formatBRL(c.amount)}</p>
          <span className="rounded-full border px-2 py-0.5 text-xs">{CONTRACT_STATUS[c.status]}</span>
        </div>
      </div>

      {c.deliveryLink && (
        <p className="text-sm">
          Entrega: <a href={c.deliveryLink} target="_blank" rel="noreferrer noopener" className="underline break-all">{c.deliveryLink}</a>
          {c.deliveryNotes && <span className="block text-muted-foreground">{c.deliveryNotes}</span>}
        </p>
      )}

      {c.status === "COMPLETED" && c.rating && (
        <p className="text-sm">
          <Stars value={c.rating} /> {c.review && <span className="text-muted-foreground">— {c.review}</span>}
        </p>
      )}

      {/* Profissional: registra a entrega */}
      {role === "PROFESSIONAL" && open && (
        <div className="space-y-2 rounded-lg bg-muted p-3">
          <Field label={c.status === "DELIVERED" ? "Atualizar link da entrega" : "Link da entrega (Drive, Dropbox, YouTube...)"} htmlFor={`link-${c.id}`}>
            <Input id={`link-${c.id}`} type="url" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
          </Field>
          <Field label="Observações (opcional)" htmlFor={`notes-${c.id}`}>
            <Textarea id={`notes-${c.id}`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <Button size="sm" disabled={pending} onClick={() => run(() => deliverContract({ contractId: c.id, link, notes }))}>
            {c.status === "DELIVERED" ? "Reenviar entrega" : "Enviar entrega"}
          </Button>
        </div>
      )}
      {role === "PROFESSIONAL" && c.status === "ACTIVE" && c.deliveryLink && (
        <p className="text-xs text-amarelo">A empresa pediu ajustes. Atualize a entrega e reenvie.</p>
      )}

      {/* Empresa: aprova + avalia */}
      {role === "COMPANY" && c.status === "DELIVERED" && (
        <div className="space-y-2 rounded-lg bg-muted p-3">
          <fieldset>
            <legend className="text-sm font-medium">Avalie o profissional</legend>
            <div className="flex gap-1" role="radiogroup" aria-label="Nota de 1 a 5 estrelas">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
                  onClick={() => setRating(n)}
                  className={`text-2xl leading-none ${n <= rating ? "text-amarelo" : "text-muted-foreground"}`}
                >
                  ★
                </button>
              ))}
            </div>
          </fieldset>
          <Field label="Comentário (opcional)" htmlFor={`review-${c.id}`}>
            <Textarea id={`review-${c.id}`} rows={2} value={review} onChange={(e) => setReview(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={pending || rating === 0} onClick={() => run(() => completeContract({ contractId: c.id, rating, review }))}>
              Aprovar entrega e concluir
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => reopenContract(c.id))}>Pedir ajustes</Button>
          </div>
        </div>
      )}

      {open && (
        <Button size="sm" variant="ghost" disabled={pending}
          onClick={() => confirm("Cancelar este contrato?") && run(() => cancelContract(c.id))}>Cancelar contrato</Button>
      )}
      <Feedback error={error} message={message} />
    </li>
  );
}
