import { EmptyState } from "@/components/shared/empty-state";
import { Folder } from "lucide-react";
import { requireCompany } from "@/lib/company";
import { FavoriteRow } from "./favorite-row";

export default async function FavoritosPage() {
  const { supabase, company } = await requireCompany();

  const { data: favs } = await supabase
    .from("company_favorites")
    .select("id,professional_id,folder_name")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  const ids = (favs ?? []).map((f) => f.professional_id);
  const { data: profs } = ids.length
    ? await supabase.from("public_professional_profiles")
        .select("id,username,full_name,avatar_url,headline,city,state_uf,starting_price,category_names")
        .in("id", ids)
    : { data: [] };
  const byId = new Map((profs ?? []).map((p) => [p.id, p]));

  const folders = new Map<string, typeof favs>();
  (favs ?? []).forEach((f) => {
    if (!byId.has(f.professional_id)) return; // perfil deixou de ser público
    folders.set(f.folder_name, [...(folders.get(f.folder_name) ?? []), f]);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Favoritos</h1>
        <p className="text-sm text-muted-foreground">Use a ★ nos cartões para salvar talentos e organize em pastas.</p>
      </div>
      {folders.size === 0 ? (
        <EmptyState
          title="Nenhum favorito ainda"
          text="Toque na estrela ☆ no card de um creator para guardá-lo aqui e organizar em pastas."
          cta={{ href: "/empresa/profissionais", label: "Buscar talentos" }}
        />
      ) : (
        [...folders.entries()].map(([folder, items]) => (
          <section key={folder} aria-label={`Pasta ${folder}`} className="space-y-2">
            <h2 className="font-medium"><Folder className="mr-1 inline size-4 text-amarelo" aria-hidden="true" />{folder} <span className="text-sm font-normal text-muted-foreground">({items!.length})</span></h2>
            <ul className="space-y-2">
              {items!.map((f) => (
                <FavoriteRow key={f.id} id={f.id} folder={folder} folders={[...folders.keys()]} p={byId.get(f.professional_id)} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
