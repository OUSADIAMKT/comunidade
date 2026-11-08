import { Button } from "@/components/ui/button";

type SP = Record<string, string | string[] | undefined>;
export const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
export const safeQ = (v: string) => v.replace(/[%,()*]/g, " ").trim().slice(0, 60);

export function ErrorBanner({ sp }: { sp: SP }) {
  const e = first(sp.erro);
  return e ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{e}</p> : null;
}

/** Botão de ação em formulário (Server Action) com campos ocultos. */
export function ActionButton({
  action, fields, children, ret, variant = "outline",
}: {
  action: (fd: FormData) => Promise<void>;
  fields: Record<string, string>;
  children: React.ReactNode;
  ret: string;
  variant?: "outline" | "default" | "ghost" | "destructive";
}) {
  return (
    <form action={action} className="inline">
      <input type="hidden" name="return" value={ret} />
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <Button type="submit" size="sm" variant={variant}>{children}</Button>
    </form>
  );
}

export function Pill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "ok" | "warn" | "bad" }) {
  const tones = {
    muted: "border text-muted-foreground", ok: "bg-floresta/15 text-floresta", warn: "bg-amarelo/15 text-amarelo", bad: "bg-destructive/15 text-destructive",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs ${tones[tone]}`}>{children}</span>;
}

export function SearchBox({ q, extra }: { q: string; extra?: Record<string, string> }) {
  return (
    <form method="get" className="flex gap-2">
      {Object.entries(extra ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input name="q" defaultValue={q} placeholder="Buscar..." aria-label="Buscar"
        className="h-8 w-full max-w-xs rounded-lg border border-input bg-transparent px-2.5 text-sm" />
      <Button type="submit" size="sm">Buscar</Button>
    </form>
  );
}
