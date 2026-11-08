"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/form-state";
import { createPost } from "@/app/actions/forum";

const initial: FormState = { ok: false };

export function ReplyForm({ topicId }: { topicId: string }) {
  const [state, action, pending] = useActionState(createPost, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-2 rounded-xl border p-4" noValidate>
      <input type="hidden" name="topic_id" value={topicId} />
      <label htmlFor="reply-body" className="text-sm font-medium">Sua resposta</label>
      <Textarea id="reply-body" name="body" rows={4} maxLength={8000} placeholder="Contribua com a conversa..." />
      <div aria-live="polite" className="min-h-5 text-sm">
        {state.error && <p className="text-destructive" role="alert">{state.error}</p>}
        {state.ok && <p className="text-floresta">{state.message}</p>}
      </div>
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Publicando..." : "Responder"}</Button>
    </form>
  );
}
