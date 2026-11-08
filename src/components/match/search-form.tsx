import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/shared/select";
import { AMAZON_POLES, NICHES, UFS, WORK_MODALITIES } from "@/lib/constants";

export type RawFilters = {
  category?: string; uf?: string; city?: string; pole?: string; niche?: string; budget?: string; modality?: string;
};

/** Assistente "O que você está procurando?" — formulário GET (a busca vive na URL). */
export function SearchForm({
  categories,
  values = {},
  action = "/empresa/profissionais",
}: {
  categories: { id: string; name: string }[];
  values?: RawFilters;
  action?: string;
}) {
  return (
    <form action={action} method="get" className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">O que você está procurando?</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Categoria profissional" htmlFor="category">
          <NativeSelect id="category" name="category" defaultValue={values.category ?? ""} required>
            <option value="">Selecione...</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Orçamento máximo (R$)" htmlFor="budget">
          <Input id="budget" name="budget" type="number" min={0} step="1" defaultValue={values.budget ?? ""} placeholder="Ex: 500" />
        </Field>
        <Field label="Nicho" htmlFor="niche">
          <NativeSelect id="niche" name="niche" defaultValue={values.niche ?? ""}>
            <option value="">Qualquer</option>
            {NICHES.map((n) => <option key={n}>{n}</option>)}
          </NativeSelect>
        </Field>
        <Field label="UF" htmlFor="uf">
          <NativeSelect id="uf" name="uf" defaultValue={values.uf ?? ""}>
            <option value="">Qualquer</option>
            {UFS.map((u) => <option key={u}>{u}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Cidade" htmlFor="city">
          <Input id="city" name="city" defaultValue={values.city ?? ""} placeholder="Ex: Altamira" />
        </Field>
        <Field label="Polo amazônico" htmlFor="pole">
          <NativeSelect id="pole" name="pole" defaultValue={values.pole ?? ""}>
            <option value="">Qualquer</option>
            {AMAZON_POLES.map((p) => <option key={p}>{p}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Modalidade" htmlFor="modality">
          <NativeSelect id="modality" name="modality" defaultValue={values.modality ?? ""}>
            <option value="">Qualquer</option>
            {Object.entries(WORK_MODALITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </NativeSelect>
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">Para a pontuação de localização, informe UF e cidade. Presencial só mostra quem atende na sua cidade.</p>
      <Button type="submit">Buscar talentos</Button>
    </form>
  );
}
