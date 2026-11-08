import { requireCompany } from "@/lib/company";
import { CampaignForm } from "../campaign-form";

export default async function NovaOportunidadePage() {
  const { supabase } = await requireCompany();
  const { data: categories } = await supabase
    .from("categories").select("id,name").eq("is_active", true).order("display_order");
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Publicar oportunidade</h1>
      <CampaignForm categories={categories ?? []} />
    </div>
  );
}
