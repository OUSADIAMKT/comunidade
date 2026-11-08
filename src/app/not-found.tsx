import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 p-6 text-center">
      <Logo />
      <p className="eyebrow">Erro 404</p>
      <h1 className="text-2xl font-semibold">Essa página não existe (ou mudou de endereço)</h1>
      <p className="text-sm text-muted-foreground">
        Confira o link. Se for o Mídia Kit de alguém, pode ser que a pessoa tenha trocado o @usuário ou deixado o
        perfil privado.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-cta btn-cta-primary !min-h-0 !px-4 !py-2.5 !text-xs">Ir para o início</Link>
        <Link href="/talentos" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-foreground/5">Ver talentos</Link>
      </div>
    </main>
  );
}
