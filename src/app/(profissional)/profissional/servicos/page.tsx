import Link from "next/link";
import { getProfessionalPlan, limitLabel, requireProfessional } from "@/lib/professional";
import { MIN_SCORE_TO_PUBLISH } from "@/lib/constants";
import { PackagesManager } from "./packages-manager";

export default async function ServicosPage() {
  const { supabase, user, profile } = await requireProfessional();

  const [plan, { data: packages }, { data: mine }] = await Promise.all([
    getProfessionalPlan(supabase, user.id),
    supabase
      .from("service_packages")
      .select("id,title,description,deliverables_summary,price,delivery_days,revisions_included,is_active,category_id")
      .eq("professional_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("professional_categories")
      .select("category_id,categories(id,name)")
      .eq("professional_id", profile.id),
  ]);

  const categories = (mine ?? [])
    .map((m) => m.categories as unknown as { id: string; name: string } | null)
    .filter((c): c is { id: string; name: string } => !!c);

  const activeCount = (packages ?? []).filter((p) => p.is_active).length;
  const blocked = profile.profile_completion_score < MIN_SCORE_TO_PUBLISH;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Meus serviços</h1>
          <p className="text-sm text-muted-foreground">Pacotes fechados com escopo, prazo e preço — a empresa contrata direto.</p>
        </div>
        <p className="text-sm">
          Pacotes ativos: <strong>{activeCount}</strong> de <strong>{limitLabel(plan.max_packages_limit)}</strong>{" "}
          <span className="text-muted-foreground">({plan.name})</span>
        </p>
      </div>
      {blocked && (
        <p className="rounded-lg border border-amarelo/50 bg-amarelo/10 p-3 text-sm text-amarelo" role="status">
          Seu perfil está em {profile.profile_completion_score}%. Chegue a {MIN_SCORE_TO_PUBLISH}% em{" "}
          <Link href="/profissional/perfil" className="underline">Meu perfil</Link> para ativar pacotes na vitrine.
        </p>
      )}
      <PackagesManager
        packages={packages ?? []}
        categories={categories}
        limitReached={activeCount >= plan.max_packages_limit}
      />
    </div>
  );
}
