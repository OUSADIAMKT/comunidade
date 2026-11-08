"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/shared/select";
import { NICHES, UFS, WORK_MODALITIES } from "@/lib/constants";
import type { FormState } from "@/lib/form-state";
import { saveCampaign } from "../actions";

/* eslint-disable @typescript-eslint/no-explicit-any */
const initial: FormState = { ok: false };

export function CampaignForm({ categories, campaign }: { categories: { id: string; name: string }[]; campaign?: any }) {
  const [state, action, pending] = useActionState(saveCampaign, initial);
  const [comp, setComp] = useState<string>(campaign?.compensation_type ?? "PAID");
  const [niches, setNiches] = useState<string[]>(campaign?.target_niches ?? []);
  const canEditStatus = !campaign || campaign.status === "DRAFT" || campaign.status === "OPEN";

  return (
    <form action={action} noValidate className="max-w-2xl space-y-4">
      {campaign && <input type="hidden" name="id" value={campaign.id} />}
      <Field label="Título" htmlFor="title"><Input id="title" name="title" defaultValue={campaign?.title} placeholder="Ex: Buscamos 5 creators UGC para lançamento" /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Categoria buscada" htmlFor="category_id">
          <NativeSelect id="category_id" name="category_id" defaultValue={campaign?.category_id ?? ""}>
            <option value="">Selecione...</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Quantidade de vagas" htmlFor="slots_total">
          <Input id="slots_total" name="slots_total" type="number" min={1} defaultValue={campaign?.slots_total ?? 1} />
        </Field>
      </div>
      <Field label="Briefing" htmlFor="briefing_description"><Textarea id="briefing_description" name="briefing_description" rows={4} defaultValue={campaign?.briefing_description} /></Field>
      <Field label="Entregáveis esperados" htmlFor="deliverables_expected" hint="Ex: 3 vídeos UGC + 1 sequência de stories">
        <Textarea id="deliverables_expected" name="deliverables_expected" rows={2} defaultValue={campaign?.deliverables_expected} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Remuneração" htmlFor="compensation_type">
          <NativeSelect id="compensation_type" name="compensation_type" value={comp} onChange={(e) => setComp(e.target.value)}>
            <option value="PAID">Cachê pago</option>
            <option value="BARTER">Permuta</option>
            <option value="HYBRID">Híbrido (cachê + permuta)</option>
          </NativeSelect>
        </Field>
        {comp !== "BARTER" && (
          <Field label="Orçamento por profissional (R$)" htmlFor="budget_per_professional">
            <Input id="budget_per_professional" name="budget_per_professional" type="number" min={0} step="0.01" defaultValue={campaign?.budget_per_professional ?? ""} />
          </Field>
        )}
      </div>
      {comp !== "PAID" && (
        <Field label="O que será oferecido na permuta" htmlFor="barter_description">
          <Textarea id="barter_description" name="barter_description" rows={2} defaultValue={campaign?.barter_description ?? ""} />
        </Field>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Modalidade" htmlFor="work_modality">
          <NativeSelect id="work_modality" name="work_modality" defaultValue={campaign?.work_modality ?? "REMOTE"}>
            {Object.entries(WORK_MODALITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </NativeSelect>
        </Field>
        <Field label="UF (opcional)" htmlFor="target_state_uf">
          <NativeSelect id="target_state_uf" name="target_state_uf" defaultValue={campaign?.target_state_uf ?? ""}>
            <option value="">Qualquer</option>
            {UFS.map((u) => <option key={u}>{u}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Cidade (opcional)" htmlFor="target_city"><Input id="target_city" name="target_city" defaultValue={campaign?.target_city ?? ""} /></Field>
        <Field label="Prazo (dias)" htmlFor="deadline_days"><Input id="deadline_days" name="deadline_days" type="number" min={1} defaultValue={campaign?.deadline_days ?? 7} /></Field>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Nichos desejados</legend>
        <div className="flex flex-wrap gap-2">
          {NICHES.map((n) => {
            const on = niches.includes(n);
            return (
              <label key={n} className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : ""}`}>
                <input type="checkbox" name="target_niches" value={n} checked={on} className="sr-only"
                  onChange={() => setNiches(on ? niches.filter((x) => x !== n) : [...niches, n])} />
                {n}
              </label>
            );
          })}
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-destructive" role="alert">{state.error}</p>}
      <div className="flex flex-wrap gap-2">
        {canEditStatus ? (
          <>
            <Button type="submit" name="intent" value="publish" disabled={pending}>{campaign?.status === "OPEN" ? "Salvar (mantém aberta)" : "Publicar oportunidade"}</Button>
            {campaign?.status !== "OPEN" && <Button type="submit" name="intent" value="draft" variant="outline" disabled={pending}>Salvar rascunho</Button>}
          </>
        ) : (
          <Button type="submit" name="intent" value="publish" disabled={pending}>Salvar alterações</Button>
        )}
      </div>
    </form>
  );
}
