/* eslint-disable @typescript-eslint/no-explicit-any */
export type Author = { id: string; display_name: string; avatar_url: string | null; username: string | null; is_admin: boolean; is_company_only: boolean; is_paid: boolean };

export async function loadAuthors(supabase: any, ids: string[]): Promise<Map<string, Author>> {
  const uniq = [...new Set(ids)];
  if (!uniq.length) return new Map();
  const { data } = await supabase.from("forum_authors").select("*").in("id", uniq);
  return new Map(((data ?? []) as Author[]).map((a) => [a.id, a]));
}

export function AuthorBadge({ a }: { a: Author | undefined }) {
  if (!a) return <span className="text-sm text-muted-foreground">Usuário</span>;
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      {a.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.avatar_url} alt="" className="size-6 rounded-full object-cover" />
      ) : (
        <span className="size-6 rounded-full bg-muted" aria-hidden />
      )}
      <strong>{a.display_name}</strong>
      {a.is_admin && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">Equipe</span>}
      {!a.is_admin && a.is_paid && <span className="rounded-full border border-amarelo/50 px-1.5 py-0.5 text-[10px] text-amarelo">PRO</span>}
      {a.is_company_only && <span className="rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">Empresa</span>}
    </span>
  );
}

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "agora há pouco";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return d < 30 ? `há ${d} dia(s)` : new Date(iso).toLocaleDateString("pt-BR");
}
