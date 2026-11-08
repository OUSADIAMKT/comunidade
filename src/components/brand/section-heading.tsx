import { KeneBullet, KeneRule } from "./kene";

/** Título de seção: marcador kené + eyebrow mono + título, com régua grafada. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2";
}) {
  const center = align === "center";
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <p className={`eyebrow mb-3 flex items-center gap-2.5 ${center ? "justify-center" : ""}`}>
          <KeneBullet mark="losango" size={11} />
          {eyebrow}
        </p>
      )}
      <Tag className="headline-section">{title}</Tag>
      {lead && <p className="text-lead mt-4">{lead}</p>}
      <KeneRule motif="pushu" height={9} opacity={0.35} className={`mt-5 w-28 text-amarelo ${center ? "mx-auto" : ""}`} />
    </div>
  );
}

/** Cabeçalho de página de painel (título + descrição + ações). */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      <KeneRule motif="pushu" height={9} opacity={0.35} className="mt-4 w-24 text-amarelo" />
    </div>
  );
}

/** Cartão de número do painel (substitui `rounded-xl border p-4` das métricas). */
export function StatCard({
  label,
  value,
  suffix,
  children,
}: {
  label: string;
  value: React.ReactNode;
  suffix?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="surface relative overflow-hidden p-5">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-4xl font-bold text-foreground">
        {value}
        {suffix && <span className="ml-1 text-base font-normal text-muted-foreground">{suffix}</span>}
      </p>
      {children && <div className="mt-1 text-sm">{children}</div>}
      <span aria-hidden className="pointer-events-none absolute -right-3 -top-3 size-14 rotate-45 rounded-lg border border-amarelo/25" />
    </div>
  );
}
