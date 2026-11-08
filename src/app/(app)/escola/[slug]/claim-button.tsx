"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { claimCertificate } from "@/app/actions/escola";

export function ClaimButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="space-y-1">
      <Button
        disabled={pending}
        onClick={() => {
          setError("");
          startTransition(async () => {
            const res = await claimCertificate(courseId);
            if (res.ok && res.code) router.push(`/certificado/${res.code}`);
            else setError(res.error ?? "Erro.");
          });
        }}
      >
        <Award className="size-4" aria-hidden="true" /> {pending ? "Emitindo..." : "Emitir meu certificado"}
      </Button>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
