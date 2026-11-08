import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionButton, ErrorBanner, Pill } from "@/components/admin/admin-ui";
import { formatBRL } from "@/lib/constants";
import { saveCategory, saveService, setCategoryActive, setServiceActive } from "../actions";

type SP = Record<string, string | string[] | undefined>;
const RET = "/admin/categorias";

export default async function CategoriasPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: cats }, { data: services }] = await Promise.all([
    supabase.from("categories").select("*").order("display_order"),
    supabase.from("services").select("id,category_id,name,suggested_min_price,is_active").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Categorias e serviços sugeridos</h1>
        <p className="text-sm text-muted-foreground">Categorias desativadas somem das buscas e do cadastro, mas o histórico é preservado.</p>
      </div>
      <ErrorBanner sp={sp} />

      <details className="rounded-xl border">
        <summary className="cursor-pointer p-3 font-medium">+ Nova categoria</summary>
        <form action={saveCategory} className="grid gap-3 border-t p-3 sm:grid-cols-2">
          <input type="hidden" name="return" value={RET} />
          <label className="text-sm">Nome<Input name="name" required /></label>
          <label className="text-sm">Slug (opcional)<Input name="slug" placeholder="gerado do nome" /></label>
          <label className="text-sm sm:col-span-2">Descrição<Input name="description" /></label>
          <label className="text-sm">Ícone (Lucide)<Input name="icon_name" placeholder="Video" /></label>
          <label className="text-sm">Ordem<Input name="display_order" type="number" defaultValue={(cats?.length ?? 0) + 1} /></label>
          <div className="sm:col-span-2"><Button type="submit">Criar categoria</Button></div>
        </form>
      </details>

      <ul className="space-y-3">
        {(cats ?? []).map((c) => {
          const list = (services ?? []).filter((s) => s.category_id === c.id);
          return (
            <li key={c.id} className={`rounded-xl border ${c.is_active ? "" : "opacity-60"}`}>
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-3">
                  <span><strong>{c.name}</strong> <span className="text-xs text-muted-foreground">/{c.slug} · ordem {c.display_order} · {list.length} serviço(s)</span></span>
                  <Pill tone={c.is_active ? "ok" : "bad"}>{c.is_active ? "Ativa" : "Inativa"}</Pill>
                </summary>
                <div className="space-y-4 border-t p-3">
                  <form action={saveCategory} className="grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="return" value={RET} />
                    <input type="hidden" name="id" value={c.id} />
                    <label className="text-sm">Nome<Input name="name" defaultValue={c.name} /></label>
                    <label className="text-sm">Ordem<Input name="display_order" type="number" defaultValue={c.display_order} /></label>
                    <label className="text-sm sm:col-span-2">Descrição<Input name="description" defaultValue={c.description ?? ""} /></label>
                    <label className="text-sm">Ícone<Input name="icon_name" defaultValue={c.icon_name ?? ""} /></label>
                    <div className="flex items-end gap-2">
                      <Button type="submit" size="sm">Salvar</Button>
                    </div>
                  </form>
                  <ActionButton action={setCategoryActive} ret={RET} fields={{ id: c.id, value: String(!c.is_active) }}>
                    {c.is_active ? "Desativar categoria" : "Ativar categoria"}
                  </ActionButton>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Serviços sugeridos</h3>
                    <ul className="space-y-2">
                      {list.map((s) => (
                        <li key={s.id} className={`flex flex-wrap items-center gap-2 text-sm ${s.is_active ? "" : "opacity-60"}`}>
                          <form action={saveService} className="flex flex-wrap items-center gap-2">
                            <input type="hidden" name="return" value={RET} />
                            <input type="hidden" name="id" value={s.id} />
                            <Input name="name" defaultValue={s.name} aria-label="Nome do serviço" className="h-7 w-56" />
                            <Input name="suggested_min_price" type="number" min={0} step="0.01" defaultValue={Number(s.suggested_min_price)} aria-label="Preço mínimo sugerido" className="h-7 w-28" />
                            <Button type="submit" size="sm" variant="outline">Salvar</Button>
                          </form>
                          <span className="text-xs text-muted-foreground">{formatBRL(s.suggested_min_price)}</span>
                          <ActionButton action={setServiceActive} ret={RET} fields={{ id: s.id, value: String(!s.is_active) }} variant="ghost">
                            {s.is_active ? "Desativar" : "Ativar"}
                          </ActionButton>
                        </li>
                      ))}
                    </ul>
                    <form action={saveService} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="return" value={RET} />
                      <input type="hidden" name="category_id" value={c.id} />
                      <Input name="name" placeholder="Novo serviço (ex: Vídeo UGC 30s)" aria-label="Nome do novo serviço" className="h-7 w-64" />
                      <Input name="suggested_min_price" type="number" min={0} step="0.01" placeholder="Preço mín." aria-label="Preço mínimo sugerido" className="h-7 w-28" />
                      <Button type="submit" size="sm">+ Adicionar serviço</Button>
                    </form>
                  </div>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
