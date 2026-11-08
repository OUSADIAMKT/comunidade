import { BadgeCheck, MapPin, Star } from "lucide-react";
import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WORK_MODALITIES, formatBRL } from "@/lib/constants";
import { InterestButton } from "@/components/match/action-buttons";
import { RatingSummary, ReviewList, type ReviewItem } from "@/components/reviews/reviews";

const NETWORKS = [
  { key: "instagram", label: "Instagram", url: (h: string) => `https://instagram.com/${h}` },
  { key: "tiktok", label: "TikTok", url: (h: string) => `https://tiktok.com/@${h}` },
  { key: "youtube", label: "YouTube", url: (h: string) => `https://youtube.com/@${h}` },
  { key: "pinterest", label: "Pinterest", url: (h: string) => `https://pinterest.com/${h}` },
] as const;

function compact(n: number) {
  return new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(n);
}

/** Prévia do link no WhatsApp/Instagram/LinkedIn: nome, especialidades, cidade e foto do creator. */
export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("public_professional_profiles")
    .select("username,full_name,headline,bio,city,state_uf,avatar_url,category_names")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!p) return { title: "Perfil não encontrado" };

  const specialties = (p.category_names ?? []).join(" · ");
  const title = specialties ? `${p.full_name} — ${specialties}` : p.full_name;
  const description = (
    p.headline || p.bio || `Creator em ${p.city} — ${p.state_uf}. Veja portfólio, serviços e avaliações.`
  ).slice(0, 180);
  const images = p.avatar_url ? [{ url: p.avatar_url, alt: p.full_name }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: `/c/${p.username}` },
    openGraph: { type: "profile", title, description, url: `/c/${p.username}`, images, siteName: "Creators da Amazônia", locale: "pt_BR" },
    twitter: { card: images ? "summary_large_image" : "summary", title, description, images: images?.map((i) => i.url) },
  };
}

async function MediaKit({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();

  // Só a view pública: nunca a tabela base (que tem dados do dono)
  const { data: p } = await supabase
    .from("public_professional_profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!p) notFound();

  const [{ data: cats }, { data: packages }, { data: portfolio }, { data: reviews }] = await Promise.all([
    supabase.from("professional_categories").select("is_primary,categories(name)").eq("professional_id", p.id).order("is_primary", { ascending: false }),
    supabase.from("service_packages")
      .select("id,title,description,deliverables_summary,price,delivery_days,revisions_included")
      .eq("professional_id", p.id).eq("is_active", true).order("price"),
    supabase.from("portfolio_items")
      .select("id,title,brand_name,description,media_type,media_url,is_featured")
      .eq("professional_id", p.id).order("is_featured", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("public_professional_reviews")
      .select("id,rating,review,company_name,company_logo_url,completed_at")
      .eq("professional_id", p.id).order("completed_at", { ascending: false }).limit(50),
  ]);
  const reviewList = (reviews ?? []) as ReviewItem[];

  // Quem está vendo: empresa logada demonstra interesse aqui mesmo; o dono vê o atalho de edição
  const { data: { user } } = await supabase.auth.getUser();
  let viewer: "anon" | "owner" | "company" | "other" = "anon";
  const openMatches = new Set<string>(); // "perfil" ou id do pacote com match pendente/confirmado
  if (user) {
    const [{ data: comp }, { data: own }] = await Promise.all([
      supabase.from("company_profiles").select("id").eq("user_id", user.id).maybeSingle(),
      supabase.from("professional_profiles").select("id").eq("user_id", user.id).eq("id", p.id).maybeSingle(),
    ]);
    viewer = own ? "owner" : comp ? "company" : "other";
    if (comp && !own) {
      const { data: ms } = await supabase.from("matches").select("service_package_id")
        .eq("company_id", comp.id).eq("professional_id", p.id).in("status", ["PENDING", "MUTUAL_MATCH"]);
      (ms ?? []).forEach((m) => openMatches.add(m.service_package_id ?? "perfil"));
    }
  }
  const loginHref = `/entrar?next=/c/${p.username}`;
  // Logado sem perfil de empresa: /empresa oferece ativar o perfil de empresa
  const contactHref = viewer === "anon" ? loginHref : "/empresa";

  const categoryNames = (cats ?? [])
    .map((c) => (c.categories as unknown as { name: string } | null)?.name)
    .filter(Boolean) as string[];
  const socials = NETWORKS.filter((n) => p[`${n.key}_handle`]);

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        {p.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.avatar_url} alt={p.full_name} className="size-28 rounded-full object-cover" />
        ) : (
          <div className="size-28 rounded-full bg-muted" aria-hidden />
        )}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">
            {p.full_name} {p.is_verified && <BadgeCheck className="inline size-5 text-rio" aria-label="Verificado" />}
          </h1>
          {p.headline && <p>{p.headline}</p>}
          <p className="text-sm text-muted-foreground">
            <MapPin className="mr-1 inline size-4" aria-hidden="true" />{p.city} — {p.state_uf}
            {p.amazon_territory_pole ? ` · ${p.amazon_territory_pole}` : ""} · {WORK_MODALITIES[p.work_modality as keyof typeof WORK_MODALITIES]}
          </p>
          <p className="text-sm">
            <Star className="mr-1 inline size-4 fill-amarelo text-amarelo" aria-hidden="true" />{Number(p.rating_avg).toFixed(1)} ({p.reviews_count}) ·{" "}
            <span className={p.is_available ? "text-floresta" : "text-muted-foreground"}>
              {p.is_available ? "Disponível" : "Indisponível no momento"}
            </span>
          </p>
        </div>
        <div className="sm:ml-auto">
          {viewer === "owner" ? (
            <Link href="/profissional/perfil" className="inline-block rounded-lg border px-4 py-2 text-sm font-medium">
              Editar meu perfil
            </Link>
          ) : viewer === "company" ? (
            <InterestButton professionalId={p.id} sent={openMatches.has("perfil")} />
          ) : (
            <Link href={contactHref} className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Tenho interesse
            </Link>
          )}
          {Number(p.starting_price) > 0 && <p className="mt-1 text-center text-xs text-muted-foreground">A partir de {formatBRL(p.starting_price)}</p>}
        </div>
      </header>

      <section aria-label="Categorias e nichos" className="flex flex-wrap gap-2">
        {categoryNames.map((n) => <span key={n} className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">{n}</span>)}
        {(p.niches ?? []).map((n: string) => <span key={n} className="rounded-full border px-3 py-1 text-xs">{n}</span>)}
      </section>

      {p.bio && <section><h2 className="mb-2 text-lg font-semibold">Sobre</h2><p className="whitespace-pre-line text-sm">{p.bio}</p></section>}

      {socials.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Redes sociais</h2>
          <ul className="flex flex-wrap gap-3">
            {socials.map((n) => (
              <li key={n.key}>
                <a href={n.url(p[`${n.key}_handle`])} target="_blank" rel="noreferrer noopener" className="block rounded-lg border px-4 py-2 text-sm hover:bg-muted">
                  <strong>{n.label}</strong> @{p[`${n.key}_handle`]}
                  {p[`${n.key}_followers`] > 0 && <span className="block text-xs text-muted-foreground">{compact(p[`${n.key}_followers`])} seguidores</span>}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(packages ?? []).length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Serviços</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {packages!.map((s) => (
              <li key={s.id} className="space-y-1 rounded-xl border p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{s.title}</p>
                  <span className="whitespace-nowrap font-bold">{formatBRL(s.price)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{s.delivery_days} dias · {s.revisions_included} revisão(ões)</p>
                <p className="text-sm">{s.description}</p>
                {s.deliverables_summary && <p className="text-xs text-muted-foreground">Entrega: {s.deliverables_summary}</p>}
                {viewer === "company" ? (
                  <div className="pt-1">
                    <InterestButton professionalId={p.id} packageId={s.id} label="Solicitar contratação" sent={openMatches.has(s.id)} />
                  </div>
                ) : viewer !== "owner" && (
                  <Link href={contactHref} className="inline-block pt-1 text-sm underline">Solicitar contratação</Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(portfolio ?? []).length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Portfólio</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portfolio!.map((it) => (
              <li key={it.id} className="overflow-hidden rounded-xl border">
                <div className="aspect-video bg-muted">
                  {it.media_type === "IMAGE" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.media_url} alt={it.title} loading="lazy" className="size-full object-cover" />
                  )}
                  {it.media_type === "VIDEO" && <video src={it.media_url} controls preload="none" className="size-full object-cover" />}
                  {it.media_type === "EXTERNAL_LINK" && (
                    <a href={it.media_url} target="_blank" rel="noreferrer noopener" className="flex size-full items-center justify-center text-sm underline">Ver trabalho ↗</a>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium">{it.is_featured && "★ "}{it.title}</p>
                  {it.brand_name && <p className="text-xs text-muted-foreground">{it.brand_name}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {reviewList.length > 0 && (
        <section aria-label="Avaliações" className="space-y-3">
          <h2 className="text-lg font-semibold">Avaliações de quem contratou</h2>
          <RatingSummary avg={Number(p.rating_avg)} count={reviewList.length} reviews={reviewList} />
          <ReviewList reviews={reviewList.filter((r) => r.review).concat(reviewList.filter((r) => !r.review)).slice(0, 12)} />
        </section>
      )}

      <footer className="border-t pt-4 text-center text-xs text-muted-foreground">
        Mídia Kit · Creators da Amazônia. O contato por WhatsApp é liberado após o match.
      </footer>
    </main>
  );
}

export default function Page({ params }: { params: Promise<{ username: string }> }) {
  return (
    <Suspense fallback={<main className="p-6">Carregando...</main>}>
      <MediaKit params={params} />
    </Suspense>
  );
}
