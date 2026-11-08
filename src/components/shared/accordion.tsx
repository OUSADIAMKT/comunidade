/** Acordeão acessível baseado em <details>. Os campos continuam no DOM (e no FormData) quando fechado. */
export function Accordion({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
        <span>
          {title}
          {hint && <span className="ml-2 text-xs font-normal text-muted-foreground">{hint}</span>}
        </span>
        <span aria-hidden className="transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="space-y-4 border-t px-4 py-4">{children}</div>
    </details>
  );
}
