"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "cn";

export function GoogleButton({
  initialRole,
  next,
  consent,
  disabled,
  className,
}: {
  initialRole?: "PROFESSIONAL" | "COMPANY";
  next?: string;
  /** Aceites de privacidade e 18+ já marcados na tela (vão ao callback para serem gravados). */
  consent?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  async function signIn() {
    const supabase = createClient();
    const params = new URLSearchParams();
    if (next) params.set("next", next);
    if (initialRole) params.set("role", initialRole);
    if (consent) params.set("consent", "1");
    const qs = params.size ? `?${params}` : "";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback${qs}`,
      },
    });
  }
  return (
    <Button type="button" variant="outline" className={cn("w-full", className)} onClick={signIn} disabled={disabled}>
      Continuar com Google
    </Button>
  );
}

