import { requireProfessional } from "@/lib/professional";
import { PortfolioManager } from "./portfolio-manager";

export default async function PortfolioPage() {
  const { supabase, user, profile } = await requireProfessional();

  const [{ data: items }, { data: mine }] = await Promise.all([
    supabase
      .from("portfolio_items")
      .select("id,title,brand_name,description,media_type,media_url,is_featured,category_id")
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

  return <PortfolioManager userId={user.id} items={items ?? []} categories={categories} />;
}
