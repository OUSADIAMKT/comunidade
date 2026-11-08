import { requireProfessional } from "@/lib/professional";
import { ProfileForm } from "./profile-form";

export default async function PerfilPage() {
  const { supabase, user, profile } = await requireProfessional();

  const [{ data: me }, { data: priv }, { data: categories }, { data: mine }] = await Promise.all([
    supabase.from("users").select("full_name,avatar_url,phone_whatsapp").eq("id", user.id).single(),
    supabase.from("professional_private_data").select("pix_key,cpf_cnpj,birth_date").eq("professional_id", profile.id).maybeSingle(),
    supabase.from("categories").select("id,name").eq("is_active", true).order("display_order"),
    supabase.from("professional_categories").select("category_id,is_primary,experience_years").eq("professional_id", profile.id),
  ]);

  return (
    <ProfileForm
      userId={user.id}
      score={profile.profile_completion_score}
      categories={categories ?? []}
      mine={mine ?? []}
      profile={profile}
      me={{ full_name: me?.full_name ?? "", avatar_url: me?.avatar_url ?? "", phone: me?.phone_whatsapp ?? "" }}
      priv={{ pix_key: priv?.pix_key ?? "", cpf_cnpj: priv?.cpf_cnpj ?? "", birth_date: priv?.birth_date ?? "" }}
    />
  );
}
