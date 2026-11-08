"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/shared/select";
import type { FormState } from "@/lib/form-state";
import { createTopic } from "@/app/actions/forum";

const initial: FormState = { ok: false };

export function NewTopicForm({ categories, preselected }: { categories: { id: string; name: string }[]; preselected: string }) {
  const [state, action, pending] = useActionState(createTopic, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Categoria" htmlFor="category_id">
        <NativeSelect id="category_id" name="category_id" defaultValue={preselected}>
          <option value="">Selecione...</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </NativeSelect>
      </Field>
      <Field label="Título" htmlFor="title" hint="De 5 a 140 caracteres. Seja específico para receber boas respostas.">
        <Input id="title" name="title" maxLength={140} />
      </Field>
      <Field label="Conteúdo" htmlFor="body">
        <Textarea id="body" name="body" rows={8} maxLength={8000} />
      </Field>
      {state.error && <p className="text-sm text-destructive" role="alert">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Publicando..." : "Publicar tópico"}</Button>
    </form>
  );
}
