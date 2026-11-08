"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await createClient().auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <Button type="button" size="sm" variant="ghost" onClick={signOut} disabled={pending} className={className}>
      <LogOut className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">{pending ? "Saindo..." : "Sair"}</span>
      <span className="sr-only sm:hidden">Sair</span>
    </Button>
  );
}
