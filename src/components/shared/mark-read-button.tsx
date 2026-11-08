"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markNotificationsRead } from "@/app/actions/deals";

export function MarkReadButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button size="sm" variant="ghost" disabled={pending}
      onClick={() => startTransition(async () => { await markNotificationsRead(); router.refresh(); })}>
      Marcar como lidas
    </Button>
  );
}
