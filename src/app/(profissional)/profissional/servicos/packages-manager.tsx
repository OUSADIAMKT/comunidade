"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/shared/select";
import { formatBRL } from "@/lib/constants";
import { deletePackage, savePackage, setPackageActive, type FormState } from "../actions";

type Pkg = {
  id: string; title: string; description: string; deliverables_summary: string | null;
  price: number | string; delivery_days: number; revisions_included: number; is_active: boolean; category_id: string;
};
type Cat = { id: string; name: string };
const initial: FormState = { ok: false };

function PackageForm({ pkg, categories, onDone }: { pkg?: Pkg; categories: Cat[]; onDone: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(savePackage, initial);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);

  return (
    <form action={action} className="space-y-3 rounded-xl border bg-card p-4" noValidate>
      {pkg && <input type="hidden" name="id" value={pkg.id} />}
      <h3 className="font-medium">{pkg ? "Editar pacote" : "Novo pacote"}</h3>
      <Field label="Título" htmlFor={`title-${pkg?.id ?? "new"}`} hint='Ex: "1 Vídeo UGC de Produto" ou "5 Artes para Instagram"'>
        <Input id={`title-${pkg?.id ?? "new"}`} name="title" defaultValue={pkg?.title} />
      </Field>
      <Field label="Categoria" htmlFor={`cat-${pkg?.id ?? "new"}`}>
        <NativeSelect id={`cat-${pkg?.id ?? "new"}`} name="category_id" defaultValue={pkg?.category_id ?? categories[0]?.id}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </NativeSelect>
      </Field>
      <Field label="O que está incluso" htmlFor={`desc-${pkg?.id ?? "new"}`}>
        <Textarea id={`desc-${pkg?.id ?? "new"}`} name="description" rows={3} defaultValue={pkg?.description} />
      </Field>
      <Field label="Entregáveis (resumo)" htmlFor={`deliv-${pkg?.id ?? "new"}`} hint="Ex: Vídeo vertical 9:16 até 60s editado + bruto">
        <Input id={`deliv-${pkg?.id ?? "new"}`} name="deliverables_summary" defaultValue={pkg?.deliverables_summary ?? ""} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Valor fixo (R$)" htmlFor={`price-${pkg?.id ?? "new"}`}>
          <Input id={`price-${pkg?.id ?? "new"}`} name="price" type="number" min={1} step="0.01" defaultValue={pkg ? Number(pkg.price) : 250} />
        </Field>
        <Field label="Prazo (dias)" htmlFor={`days-${pkg?.id ?? "new"}`}>
          <Input id={`days-${pkg?.id ?? "new"}`} name="delivery_days" type="number" min={1} defaultValue={pkg?.delivery_days ?? 5} />
        </Field>
        <Field label="Revisões incluídas" htmlFor={`rev-${pkg?.id ?? "new"}`}>
          <Input id={`rev-${pkg?.id ?? "new"}`} name="revisions_included" type="number" min={0} defaultValue={pkg?.revisions_included ?? 1} />
        </Field>
      </div>
      {state.error && <p className="text-sm text-destructive" role="alert">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar pacote"}</Button>
        <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
      </div>
    </form>
  );
}

export function PackagesManager({
  packages, categories, limitReached,
}: { packages: Pkg[]; categories: Cat[]; limitReached: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [error, setError] = useState("");
  const close = () => setEditing(null);
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "";

  function run(fn: () => Promise<FormState>) {
    setError("");
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Erro.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {editing === "new" ? (
        <PackageForm categories={categories} onDone={close} />
      ) : (
        <Button onClick={() => setEditing("new")} disabled={categories.length === 0}>+ Novo pacote</Button>
      )}
      {limitReached && (
        <p className="text-sm text-muted-foreground">Limite de pacotes ativos atingido. Desative um pacote para poder ativar outro.</p>
      )}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      {packages.length === 0 && editing !== "new" ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum pacote ainda. Crie o primeiro, como &quot;1 Vídeo UGC de Produto — R$ 250&quot;.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {packages.map((p) =>
            editing === p.id ? (
              <li key={p.id} className="sm:col-span-2"><PackageForm pkg={p} categories={categories} onDone={close} /></li>
            ) : (
              <li key={p.id} className={`space-y-2 rounded-xl border p-4 ${p.is_active ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{p.title}</p>
                  <span className="whitespace-nowrap text-lg font-bold">{formatBRL(p.price)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{catName(p.category_id)} · {p.delivery_days} dias · {p.revisions_included} revisão(ões)</p>
                <p className="text-sm">{p.description}</p>
                {p.deliverables_summary && <p className="text-xs text-muted-foreground">Entrega: {p.deliverables_summary}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditing(p.id)}>Editar</Button>
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setPackageActive(p.id, !p.is_active))}>
                    {p.is_active ? "Desativar" : "Ativar"}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => confirm("Excluir este pacote?") && run(() => deletePackage(p.id))}>Excluir</Button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
