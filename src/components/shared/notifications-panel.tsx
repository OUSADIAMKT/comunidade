import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MarkReadButton } from "./mark-read-button";

export async function NotificationsPanel({ supabase, userId }: { supabase: SupabaseClient; userId: string }) {
  const { data } = await supabase
    .from("notifications")
    .select("id,title,body,action_url,created_at")
    .eq("user_id", userId)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(6);
  if (!data?.length) return null;

  return (
    <section aria-label="Notificações" className="space-y-2 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Notificações ({data.length})</h2>
        <MarkReadButton />
      </div>
      <ul className="space-y-2">
        {data.map((n) => (
          <li key={n.id} className="text-sm">
            <strong>{n.title}</strong> — <span className="text-muted-foreground">{n.body}</span>{" "}
            {n.action_url && <Link href={n.action_url} className="underline">Abrir</Link>}
          </li>
        ))}
      </ul>
    </section>
  );
}
