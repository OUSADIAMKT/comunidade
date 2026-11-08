import Link from "next/link";
import { MessageSquareHeart } from "lucide-react";
import { requireProfessional } from "@/lib/professional";
import { loadDeals } from "@/lib/deals";
import { RatingSummary, ReviewList, type ReviewItem } from "@/components/reviews/reviews";

export default async function AvaliacoesPage() {
  const { supabase, user, profile } = await requireProfessional();
  const { data: me } = await supabase.from("users").select("full_name").eq("id", user.id).single();
  const { contracts } = await loadDeals(supabase, "PROFESSIONAL", { id: profile.id, userId: user.id, displayName: me?.full_name ?? "" });

  const reviews: ReviewItem[] = contracts
    .filter((c) => c.status === "COMPLETED" && c.rating)
    .map((c) => ({ id: c.id, rating: c.rating!, review: c.review?.trim() || null, company_name: c.otherName, completed_at: c.completedAt }));

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-amarelo/12 text-amarelo" aria-hidden="true">
          <MessageSquareHeart className="size-6" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold">Minhas avaliações</h1>
          <p className="text-sm text-muted-foreground">O que as empresas disseram depois de contratar você.</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="surface flex flex-col items-center gap-2 border-dashed p-10 text-center">
          <p className="font-display font-bold">Nenhuma avaliação ainda</p>
          <p className="text-sm text-muted-foreground">Elas aparecem aqui quando uma empresa conclui um contrato com você.</p>
          <Link href="/profissional/oportunidades" className="mt-2 text-sm text-amarelo underline">Ver oportunidades</Link>
        </div>
      ) : (
        <>
          <RatingSummary avg={avg} count={reviews.length} reviews={reviews} />
          <ReviewList reviews={reviews} />
          {profile.username && (
            <p className="text-sm text-muted-foreground">
              As avaliações também aparecem no seu <Link href={`/c/${profile.username}`} className="underline">Mídia Kit público</Link>.
            </p>
          )}
        </>
      )}
    </div>
  );
}
