import Link from "next/link";

/** Estado vazio com próximo passo: diz o que fazer em vez de só "nada por aqui". */
export function EmptyState({
  title,
  text,
  cta,
}: {
  title: string;
  text?: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
      <p className="font-semibold">{title}</p>
      {text && <p className="max-w-md text-sm text-muted-foreground">{text}</p>}
      {cta && (
        <Link href={cta.href} className="btn-cta btn-cta-primary mt-2 !min-h-0 !px-4 !py-2.5 !text-xs">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
