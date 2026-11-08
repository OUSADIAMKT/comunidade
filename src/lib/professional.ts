import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** Usuário logado + perfil profissional (se existir). Redireciona para /entrar sem sessão. */
export async function getSessionProfessional() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: profile } = await supabase
    .from("professional_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return { supabase, user, profile };
}

/** Igual a getSessionProfessional, mas manda para o onboarding se ainda não há perfil. */
export async function requireProfessional() {
  const ctx = await getSessionProfessional();
  if (!ctx.profile) redirect("/onboarding");
  return { ...ctx, profile: ctx.profile };
}

/** Limites do plano ativo do profissional (fallback: prof-free). */
export async function getProfessionalPlan(supabase: SupabaseClient, userId: string) {
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("status,current_period_end,subscription_plans(slug,name,target_role,price_monthly,max_packages_limit,monthly_applications_limit)")
    .eq("user_id", userId)
    .in("status", ["ACTIVE", "TRIAL"])
    .gt("current_period_end", new Date().toISOString());

  type Plan = {
    slug: string; name: string; target_role: string; price_monthly: number;
    max_packages_limit: number; monthly_applications_limit: number;
  };
  const plans = (subs ?? [])
    .map((s) => s.subscription_plans as unknown as Plan | null)
    .filter((p): p is Plan => !!p && p.target_role === "PROFESSIONAL")
    .sort((a, b) => Number(b.price_monthly) - Number(a.price_monthly));
  if (plans[0]) return plans[0];

  const { data: free } = await supabase
    .from("subscription_plans")
    .select("slug,name,target_role,price_monthly,max_packages_limit,monthly_applications_limit")
    .eq("slug", "prof-free")
    .single();
  return (free ?? {
    slug: "prof-free", name: "Profissional Gratuito", target_role: "PROFESSIONAL",
    price_monthly: 0, max_packages_limit: 2, monthly_applications_limit: 5,
  }) as Plan;
}

export function limitLabel(n: number) {
  return n >= 999 ? "ilimitado" : String(n);
}
