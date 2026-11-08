import { getSessionCompany } from "@/lib/company";
import { CompanyForm } from "./company-form";

export default async function PerfilEmpresaPage() {
  const { supabase, user, company } = await getSessionCompany();
  const { data: me } = await supabase.from("users").select("phone_whatsapp").eq("id", user.id).single();
  return <CompanyForm userId={user.id} company={company} phone={me?.phone_whatsapp ?? ""} />;
}
