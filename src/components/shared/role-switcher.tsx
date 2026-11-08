"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { CONTEXT_HOME, CONTEXT_LABEL, type Context } from "@/lib/roles";

type Props = {
  userId: string;
  current: Context;
  roles: { is_professional: boolean; is_company: boolean; is_admin: boolean };
};

export function RoleSwitcher({ userId, current, roles }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const available: Context[] = [
    ...(roles.is_professional ? (["PROFESSIONAL"] as const) : []),
    ...(roles.is_company ? (["COMPANY"] as const) : []),
    ...(roles.is_admin ? (["ADMIN"] as const) : []),
  ];

  async function switchTo(ctx: Context) {
    if (ctx === current) return;
    setPending(true);
    const supabase = createClient();
    await supabase.from("users").update({ active_context: ctx }).eq("id", userId);
    router.push(CONTEXT_HOME[ctx]);
    router.refresh();
    setPending(false);
  }

  if (available.length < 2) return null;

  return (
    <div className="inline-flex gap-1 rounded-lg border p-1" role="group" aria-label="Alternar papel">
      {available.map((ctx) => (
        <Button
          key={ctx}
          size="sm"
          variant={ctx === current ? "default" : "ghost"}
          disabled={pending}
          aria-pressed={ctx === current}
          onClick={() => switchTo(ctx)}
        >
          {CONTEXT_LABEL[ctx]}
        </Button>
      ))}
    </div>
  );
}
