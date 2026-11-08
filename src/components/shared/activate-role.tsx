import { Building2, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { activateRole } from "@/app/actions/account";

const COPY = {
  COMPANY: {
    icon: Building2,
    title: "Ativar perfil de empresa",
    text: "Com o perfil de empresa você busca talentos, publica oportunidades e recebe candidaturas. Sua conta de creator continua igual.",
    cta: "Criar perfil de empresa",
  },
  PROFESSIONAL: {
    icon: Clapperboard,
    title: "Ativar perfil de creator",
    text: "Com o perfil de creator você monta seu Mídia Kit, cria pacotes de serviço e se candidata às oportunidades. Sua conta de empresa continua igual.",
    cta: "Criar perfil de creator",
  },
} as const;

/** Tela mostrada a quem está logado e abriu o painel de um papel que ainda não tem. */
export function ActivateRoleCard({ role, homeHref }: { role: "PROFESSIONAL" | "COMPANY"; homeHref: string }) {
  const c = COPY[role];
  const Icon = c.icon;
  return (
    <form action={activateRole} className="surface mx-auto w-full max-w-md space-y-4 p-6 text-center">
      <input type="hidden" name="role" value={role} />
      <Icon className="mx-auto size-10 text-amarelo" aria-hidden="true" />
      <h1 className="text-xl font-semibold">{c.title}</h1>
      <p className="text-sm text-muted-foreground">{c.text}</p>
      <div className="flex flex-col gap-2">
        <Button type="submit">{c.cta}</Button>
        <a href={homeHref} className="text-sm text-muted-foreground underline underline-offset-4">Voltar ao meu painel</a>
      </div>
    </form>
  );
}
