"use server";

import { createClient } from "@/lib/supabase/server";
import { MIN_ACCOUNT_AGE, UFS, UNDERAGE_MESSAGE, USERNAME_RE, ageFromISODate, onlyDigits } from "@/lib/constants";

export type OnboardingInput = {
  username: string;
  headline: string;
  categoryIds: string[];
  primaryCategoryId: string;
  state_uf: string;
  city: string;
  amazon_territory_pole: string;
  work_modality: "REMOTE" | "ONSITE" | "HYBRID";
  phone: string;
  birth_date: string;
  bio: string;
  niches: string[];
  starting_price: number;
};

export async function completeOnboarding(input: OnboardingInput): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const username = input.username.trim().toLowerCase();
  if (!USERNAME_RE.test(username)) return { ok: false, error: "Usuário: 3 a 30 caracteres (letras minúsculas, números e _)." };
  if (!input.categoryIds.length) return { ok: false, error: "Escolha pelo menos uma categoria." };
  if (!input.categoryIds.includes(input.primaryCategoryId)) return { ok: false, error: "Marque uma categoria principal." };
  if (!(UFS as readonly string[]).includes(input.state_uf) || !input.city.trim()) return { ok: false, error: "Informe UF e cidade." };
  const phone = onlyDigits(input.phone);
  if (phone.length < 10 || phone.length > 13) return { ok: false, error: "WhatsApp inválido. Use DDD + número." };
  const age = ageFromISODate(input.birth_date);
  if (age === null) return { ok: false, error: "Informe a data de nascimento do titular da conta." };
  if (age < MIN_ACCOUNT_AGE) return { ok: false, error: UNDERAGE_MESSAGE };
  if (!(input.starting_price >= 0)) return { ok: false, error: "Preço inicial inválido." };

  const { data: existing } = await supabase.from("professional_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (existing) return { ok: true };

  const { error: uErr } = await supabase
    .from("users")
    .update({ phone_whatsapp: phone, is_professional: true })
    .eq("id", user.id);
  if (uErr) return { ok: false, error: "Não foi possível salvar o WhatsApp." };

  const { data: prof, error: pErr } = await supabase
    .from("professional_profiles")
    .insert({
      user_id: user.id,
      username,
      headline: input.headline.trim() || null,
      bio: input.bio.trim() || null,
      state_uf: input.state_uf,
      city: input.city.trim(),
      amazon_territory_pole: input.amazon_territory_pole || null,
      work_modality: input.work_modality,
      niches: input.niches,
      starting_price: input.starting_price,
    })
    .select("id")
    .single();
  if (pErr || !prof) {
    return { ok: false, error: pErr?.code === "23505" ? "Este @usuário já está em uso." : "Não foi possível criar o perfil." };
  }

  const { error: bErr } = await supabase.from("professional_private_data").upsert({
    professional_id: prof.id,
    user_id: user.id,
    birth_date: input.birth_date,
    updated_at: new Date().toISOString(),
  });
  if (bErr) return { ok: false, error: "Perfil criado, mas falhou ao salvar a data de nascimento." };

  const { error: cErr } = await supabase.from("professional_categories").insert(
    input.categoryIds.map((category_id) => ({
      professional_id: prof.id,
      category_id,
      is_primary: category_id === input.primaryCategoryId,
    })),
  );
  if (cErr) return { ok: false, error: "Perfil criado, mas falhou ao salvar as categorias." };

  await supabase.from("users").update({ active_context: "PROFESSIONAL" }).eq("id", user.id);
  return { ok: true };
}
