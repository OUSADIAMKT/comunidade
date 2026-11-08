"use server";

import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";

export async function requestUpgrade(planSlug: string): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const { error } = await supabase.rpc("request_upgrade", { p_plan_slug: planSlug });
  if (error) return { ok: false, error: "Não foi possível enviar o pedido agora." };
  return { ok: true, message: "Pedido enviado! Nossa equipe vai ativar seu plano em breve." };
}
