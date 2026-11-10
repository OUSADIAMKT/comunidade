import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Building2,
  Check,
  FileCheck2,
  Handshake,
  MessageCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CommunityCarousel, type CommunitySlide } from "@/components/public/community-carousel";
import { KeneBullet, KeneField, SectionDivider } from "@/components/brand/kene";
import { TerritoriosMap } from "@/components/brand/territorios-map";
import { SectionHeading } from "@/components/brand/section-heading";
import { CategoryBadge } from "@/components/brand/category-icon";
import { TalentCard } from "@/components/public/talent-card";
import { EcossistemaLosango } from "@/components/public/ecossistema-losango";
import { MIN_SCORE_TO_PUBLISH, formatBRL } from "@/lib/constants";

/* Destinos de cadastro: cada público entra com o tipo de conta já marcado. */
const SIGNUP_EMPRESA = "/cadastro?perfil=empresa";
const SIGNUP_TALENTO = "/cadastro?perfil=talento";

/** Mínimo de perfis públicos para a vitrine aparecer: com menos, ela parece vazia. */
const SHOWCASE_MIN = 3;

const STEPS = [
  {
    n: "1",
    title: "Busque ou publique",
    text: "Filtre talentos por especialidade, cidade, nicho e orçamento, ou publique sua demanda e receba candidaturas.",
    key: false,
  },
  {
    n: "2",
    title: "Dê match",
    text: "A empresa demonstra interesse e o talento aceita. Só então o WhatsApp é liberado para os dois. Nada de spam.",
    key: true,
  },
  {
    n: "3",
    title: "Combine, entregue e avalie",
    text: "Escopo, prazo e valor ficam registrados antes de começar. Cada entrega vira avaliação e portfólio no perfil.",
    key: false,
  },
];

const GUARANTEES = [
  { Icon: ShieldCheck, title: "Perfis moderados", text: "A equipe revisa os perfis antes de irem para a vitrine." },
  { Icon: Handshake, title: "Aceite dos dois lados", text: "O contato só abre quando empresa e talento dizem sim." },
  { Icon: FileCheck2, title: "Combinado registrado", text: "Escopo, prazo e valor ficam claros antes do trabalho." },
  { Icon: Wallet, title: "Pagamento direto", text: "A empresa paga o talento diretamente, sem atravessador." },
];

/** Texto editorial e foto das especialidades (pelo slug). O banco fornece id e nome. */
const SPECIALTIES: Record<
  string,
  {
    tag: string;
    motif: "iso" | "ronoa" | "shahuu";
    pitch: string;
    points: string[];
    photo: string;
    alt: string;
    position: string;
    /** Especialista que representa a categoria (nome exibido sobre a foto). */
    specialist?: string;
  }
> = {
  "ugc-creator": {
    tag: "Porta de entrada",
    motif: "iso",
    pitch:
      "Vídeos curtos gravados por gente real, no formato nativo das redes. É o conteúdo que mais converte em anúncio e o caminho mais rápido para começar como creator.",
    points: ["Vídeos nativos e depoimentos reais", "Demonstrações de produto", "Criativos prontos para anúncios"],
    photo: "/img/fotos/juh-araujo-ugc.webp",
    alt: "Juh Araujo, especialista em UGC, sorrindo com o celular na mão",
    position: "50% 30%",
    specialist: "Juh Araujo",
  },
  "social-media-eventos": {
    tag: "Do feed ao palco",
    motif: "ronoa",
    pitch:
      "Cobertura de eventos e gestão de redes feitas com o celular: bastidores em tempo real, editados e publicados na hora.",
    points: ["Fotos, vídeos e stories ao vivo", "Edição e publicação no ato", "Gestão contínua das redes da marca"],
    photo: "/img/fotos/thascila-social-eventos.webp",
    alt: "Thascila Lawanda, especialista em social media de eventos, segurando o celular",
    position: "50% 22%",
    specialist: "Thascila Lawanda",
  },
  "ferramenteiro-ia": {
    tag: "O multiprofissional",
    motif: "shahuu",
    pitch:
      "Quem domina as ferramentas de IA entrega artes, textos, páginas e automações: o que antes pedia designer, copywriter e gestor de tráfego.",
    points: ["Artes, textos e páginas com IA", "Automações e agentes de atendimento", "Mais entregas, com custo menor"],
    photo: "/img/fotos/aula-ia.webp",
    alt: "Instrutor explicando criação de conteúdo com inteligência artificial",
    position: "60% 40%",
  },
};

/** Marcas e instituições atendidas pela Ousadia Marketing (logos brancos, para fundo escuro). */
const BRANDS = [
  { file: "sicredi", name: "Sicredi" },
  { file: "biorama", name: "Biorama" },
  { file: "bere-xikrin", name: "Bere Xikrin" },
  { file: "creax", name: "Creax" },
  { file: "gem-tv-pa", name: "GEM TV Pará" },
  { file: "jornada-amazonia", name: "Jornada Amazônia" },
  { file: "certi", name: "Certi" },
  { file: "rio-xingu-pousada-lodge", name: "Rio Xingu Pousada Lodge" },
  { file: "viver-de-amazonia", name: "Viver de Amazônia" },
  { file: "world-creativity-day", name: "World Creativity Day" },
  { file: "sindicato-produtores-rurais-altamira", name: "Sindicato dos Produtores Rurais de Altamira" },
];

/* ---------------------------- Planos ---------------------------- */
type Plan = {
  slug: string;
  name: string;
  target_role: "PROFESSIONAL" | "COMPANY";
  price_monthly: number;
  monthly_applications_limit: number;
  active_campaigns_limit: number;
  monthly_matches_limit: number;
  featured_profile: boolean;
};

const isUnlimited = (n: number) => n >= 999;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function planPerks(p: Plan): string[] {
  if (p.target_role === "COMPANY") {
    const c = p.active_campaigns_limit;
    const m = p.monthly_matches_limit;
    return [
      isUnlimited(c) ? "Demandas ativas ilimitadas" : `${c} ${plural(c, "demanda ativa", "demandas ativas")}`,
      isUnlimited(m) ? "Matches ilimitados" : `Até ${m} matches por mês`,
      ...(p.featured_profile ? ["Empresa em destaque"] : []),
    ];
  }
  const a = p.monthly_applications_limit;
  return [
    isUnlimited(a) ? "Candidaturas ilimitadas" : `Até ${a} candidaturas por mês`,
    ...(p.featured_profile ? ["Perfil em destaque na vitrine"] : []),
  ];
}

const planName = (p: Plan) => p.name.replace(/^(Empresa|Profissional)\s+/i, "");
const planPrice = (p: Plan) => (Number(p.price_monthly) > 0 ? formatBRL(p.price_monthly) : "Grátis");
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const joinPt = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;

/* ============================================================== */

export default async function Home() {
  const supabase = await createClient();
  const [{ data: categories }, { data: talents, count: proCount }, { count: companyCount }, { data: planRows }] =
    await Promise.all([
      supabase.from("categories").select("id,slug,name,description").eq("is_active", true).order("display_order"),
      supabase
        .from("public_professional_profiles")
        .select("*", { count: "exact" })
        .gte("profile_completion_score", MIN_SCORE_TO_PUBLISH)
        .order("is_pro", { ascending: false })
        .order("rating_avg", { ascending: false })
        .limit(6),
      supabase.from("company_profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("subscription_plans")
        .select(
          "slug,name,target_role,price_monthly,monthly_applications_limit,active_campaigns_limit,monthly_matches_limit,featured_profile",
        )
        .eq("is_active", true)
        .order("price_monthly"),
    ]);

  const plans = (planRows ?? []) as Plan[];
  const companyPlans = plans.filter((p) => p.target_role === "COMPANY");
  const talentPlans = plans.filter((p) => p.target_role === "PROFESSIONAL");
  const companyFree = companyPlans.find((p) => Number(p.price_monthly) === 0);
  const companyPaid = companyPlans.filter((p) => Number(p.price_monthly) > 0);
  const talentFree = talentPlans.find((p) => Number(p.price_monthly) === 0);

  const showcase = (talents ?? []).length >= SHOWCASE_MIN ? talents! : [];
  const showCounts = (proCount ?? 0) >= 10 && (companyCount ?? 0) >= 3;

  const FAQ_EMPRESAS = [
    {
      q: "Quanto custa para a empresa?",
      a:
        companyFree || companyPaid.length
          ? [
              "Criar conta é grátis e não pede cartão de crédito.",
              companyFree && `O plano gratuito inclui ${joinPt(planPerks(companyFree).map(lowerFirst))}.`,
              ...companyPaid.map(
                (p) => `O plano ${planName(p)} custa ${planPrice(p)} por mês, com ${joinPt(planPerks(p).map(lowerFirst))}.`,
              ),
            ]
              .filter(Boolean)
              .join(" ")
          : "Criar conta é grátis e não pede cartão de crédito. Os planos pagos são opcionais e ficam no seu painel.",
    },
    {
      q: "Como a empresa contrata?",
      a: "Você busca talentos por especialidade, cidade e nicho, ou publica uma demanda e recebe candidaturas. Quando o talento aceita o seu interesse, o WhatsApp é liberado para os dois e vocês combinam escopo, prazo e valor antes de começar.",
    },
    {
      q: "Quem paga o talento, e como?",
      a: "O pagamento é feito direto da empresa para o talento. Valor, prazo, escopo e forma de pagamento ficam combinados entre os dois antes do trabalho começar.",
    },
    {
      q: "Como sei que o talento entrega?",
      a: "Cada perfil mostra portfólio, especialidades e avaliações de quem já contratou. Os perfis passam por moderação da equipe e, em breve, o Selo Creators vai certificar tecnicamente quem entrega com qualidade.",
    },
    {
      q: "Vocês indicam profissionais para mim?",
      a: "Em breve. A curadoria sob demanda e os squads vão indicar profissionais já avaliados e coordenar entregas com mais de uma frente.",
    },
  ];

  const FAQ_TALENTOS = [
    {
      q: "É de graça entrar?",
      a: `Sim. Criar conta, montar perfil e portfólio, fazer as trilhas introdutórias da Escola e participar da comunidade não custa nada${
        talentFree && !isUnlimited(talentFree.monthly_applications_limit)
          ? `. No plano gratuito você se candidata a até ${talentFree.monthly_applications_limit} demandas por mês.`
          : "."
      }`,
    },
    {
      q: "Preciso ter seguidores ou experiência?",
      a: "Não. O que conta é o que você entrega e mostra no portfólio. Quem está começando entra pela Escola e monta o primeiro portfólio por lá.",
    },
    {
      q: "Preciso largar meu emprego CLT?",
      a: "Não. Você escolhe quais demandas aceitar e quanto tempo dedica. A ideia é somar renda com o que você já sabe fazer.",
    },
    {
      q: "Menor de idade pode participar?",
      a: "Menores de 18 anos não criam conta. O pai, a mãe ou o responsável legal faz o cadastro e responde pela conta e pelos combinados.",
    },
    {
      q: "Posso usar o trabalho que fiz no meu portfólio?",
      a: "Sim, salvo quando a empresa pedir confidencialidade. Isso fica claro na demanda antes do seu aceite.",
    },
    {
      q: "O que é o Selo Creators?",
      a: "É a certificação de quem passou por uma avaliação técnica (desafio prático ou análise de portfólio) feita por uma banca. Dá destaque na vitrine, prioridade nas indicações e desconto nas imersões. A taxa de avaliação é paga no envio da prova. O Selo abre quando as primeiras empresas estiverem contratando, para que quem se certificar já encontre demanda.",
    },
    {
      q: "Como funcionam as aulas ao vivo?",
      a: "São para quem tem o Selo, opcionais, e custam R$ 9,90 por mês. A programação será divulgada quando o Selo abrir.",
    },
  ];

  return (
    <main>
      {/* ---------- HERO ---------- */}
      <section className="tone-roxo hero-mesh relative overflow-hidden">
        <div className="container-site relative grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:py-24">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <p className="eyebrow mb-5 flex items-center gap-2.5">
              <KeneBullet mark="triangulo" size={11} />
              Marketplace de talentos criativos da Amazônia
            </p>
            <h1 className="headline-hero !text-[clamp(2.25rem,5vw,4rem)]">
              A Amazônia tem voz. <span className="text-[color:var(--roxo-deep)]">Agora tem match.</span>
            </h1>
            <p className="text-lead mt-6 max-w-xl !text-lg">
              Empresas encontram creators, social medias e especialistas em IA da região, com tudo combinado antes de
              começar. Talentos transformam o que já fazem com o celular em renda e portfólio.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={SIGNUP_EMPRESA} className="btn-cta btn-cta-primary">
                Quero contratar talentos <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href={SIGNUP_TALENTO} className="btn-cta btn-cta-outline">
                Quero ser contratado
              </Link>
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {["Cadastro grátis", "Sem cartão de crédito", "Contato só com match"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="size-4 text-[color:var(--roxo-deep)]" strokeWidth={2.5} aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>

            {showCounts && (
              <p className="mt-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <KeneBullet mark="losango" size={10} className="text-floresta" />
                {proCount} talentos · {companyCount} empresas na plataforma
              </p>
            )}
          </div>

          <HeroPhotos />
        </div>
      </section>

      {/* ---------- QUEM ESTÁ POR TRÁS (logos) ---------- */}
      <section className="tone-noite noite-marrom relative overflow-hidden py-9 sm:py-11" aria-labelledby="ousadia-title">
        <KeneField motif="ronoa" scale={84} opacity={0.08} className="text-marfim" />
        <div className="container-site relative mb-7 text-center">
          <p className="eyebrow mb-2">Uma iniciativa da Ousadia Marketing</p>
          <h2
            id="ousadia-title"
            className="mx-auto max-w-2xl font-sans text-sm font-medium leading-relaxed text-muted-foreground sm:text-base"
          >
            A agência-escola por trás da plataforma já atendeu marcas e instituições como:
          </h2>
        </div>
        <div className="marquee relative">
          <ul className="marquee-track">
            {[...BRANDS, ...BRANDS].map((b, i) => (
              <li key={`${b.file}-${i}`} className="shrink-0" aria-hidden={i >= BRANDS.length ? true : undefined}>
                <Image
                  src={`/img/marcas/${b.file}.webp`}
                  alt={i >= BRANDS.length ? "" : b.name}
                  width={240}
                  height={64}
                  className="h-10 w-auto max-w-[11rem] object-contain opacity-75 transition-opacity hover:opacity-100 sm:h-12"
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- COMO FUNCIONA (com o celular do match) ---------- */}
      <section id="como-funciona" className="tone-marfim relative overflow-hidden" aria-label="Como funciona">
        <div className="container-site section-padding relative">
          <div className="grid items-center gap-14 lg:grid-cols-[1fr_auto] lg:gap-20">
            <div>
              <SectionHeading
                eyebrow="Como funciona"
                title="Do primeiro contato à entrega, em três passos."
                lead="Sem intermediário e sem mensagem perdida: o WhatsApp só é liberado quando os dois lados dizem sim."
              />
              <ol className="mt-10 space-y-4">
                {STEPS.map((s, i) => (
                  <li
                    key={s.n}
                    className={`surface reveal flex items-start gap-4 p-5 ${
                      s.key ? "!border-amarelo shadow-[0_24px_60px_-30px_rgba(201,146,0,0.55)]" : ""
                    }`}
                    style={{ ["--d" as string]: `${i * 0.08}s` }}
                  >
                    <span className="diamond diamond-solid shrink-0 text-amarelo">
                      <span className="font-display font-bold text-[#1a1405]">{s.n}</span>
                    </span>
                    <div>
                      <h3 className="flex flex-wrap items-center gap-2 text-lg font-bold">
                        {s.title}
                        {s.key && (
                          <span className="rounded-full bg-amarelo px-2.5 py-0.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[#1a1405]">
                            O momento-chave
                          </span>
                        )}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <MatchPhone />
          </div>

          <ul className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {GUARANTEES.map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-3 bg-[color:var(--tone-card)] p-5">
                <Icon className="mt-0.5 size-5 shrink-0 text-[color:var(--verde)]" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- ESPECIALIDADES ---------- */}
      <section id="especialidades" className="tone-noite relative overflow-hidden" aria-label="Especialidades">
        <KeneField motif="iso" scale={104} opacity={0.07} className="text-amarelo" />
        <div className="container-site section-padding relative">
          <SectionHeading
            eyebrow="Especialidades"
            title="As três frentes que mais movem a comunicação hoje."
            lead="Começamos com foco no que as empresas mais contratam e no que dá para aprender e fazer com um celular na mão."
          />
          <ul className="mt-12 grid gap-6 lg:grid-cols-3">
            {(categories ?? []).map((c, i) => {
              const info = SPECIALTIES[c.slug];
              const tone = (["amarelo", "floresta", "rio"] as const)[i % 3];
              return (
                <li key={c.id} className="reveal" style={{ ["--d" as string]: `${i * 0.08}s` }}>
                  <Link
                    href={`/talentos?category=${c.id}`}
                    className="group surface surface-hover relative flex h-full flex-col overflow-hidden"
                  >
                    {info && (
                      <div className="photo-zoom relative aspect-[16/10] w-full">
                        <Image
                          src={info.photo}
                          alt={info.alt}
                          fill
                          sizes="(max-width: 1024px) 100vw, 380px"
                          className="object-cover"
                          style={{ objectPosition: info.position }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" aria-hidden="true" />
                        <span className="absolute bottom-3 left-4 rounded-full bg-amarelo px-3 py-1 font-mono text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#1a1405]">
                          {info.tag}
                        </span>
                        {info.specialist && (
                          <span className="absolute bottom-3 right-4 text-right leading-tight text-white drop-shadow">
                            <span className="block font-mono text-[0.6rem] uppercase tracking-[0.14em] text-white/80">Especialista</span>
                            <span className="block font-display text-sm font-bold">{info.specialist}</span>
                          </span>
                        )}
                      </div>
                    )}
                    <div className="relative flex flex-1 flex-col gap-4 p-6 sm:p-7">
                      <KeneField motif={info?.motif ?? "iso"} scale={72} opacity={0.04} className="text-foreground" />
                      <div className="relative flex min-h-14 items-center gap-4">
                        <CategoryBadge slug={c.slug} tone={tone} />
                        <h3 className="font-display text-[1.4rem] font-bold leading-tight">{c.name}</h3>
                      </div>
                      <p className="relative text-sm leading-relaxed text-muted-foreground">{info?.pitch ?? c.description}</p>
                      {info && (
                        <ul className="relative mt-1 space-y-2 text-sm">
                          {info.points.map((p) => (
                            <li key={p} className="flex items-start gap-2.5">
                              <KeneBullet mark="losango" size={10} className="mt-1.5 shrink-0 text-[color:var(--tone-deep)]" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      )}
                      <span className="relative mt-auto flex items-center gap-2 pt-3 font-mono text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--tone-deep)]">
                        Ver talentos <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ---------- VITRINE (só aparece com perfis suficientes) ---------- */}
      {showcase.length > 0 && (
        <section className="tone-marfim relative overflow-hidden" aria-label="Talentos em destaque">
          <div className="container-site section-padding relative">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading eyebrow="Vitrine" title="Quem já está criando por aqui." />
              <Link href="/talentos" className="btn-cta btn-cta-outline">
                Ver todos os talentos <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {showcase.map((p) => (
                <TalentCard key={p.id} p={p} />
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ---------- DOIS LADOS + PLANOS ---------- */}
      <section className="tone-azul relative overflow-hidden" aria-label="Para empresas e para talentos">
        <SectionDivider motif="faba" height={14} opacity={0.55} fade={false} className="absolute inset-x-0 top-0 !py-0 text-[color:var(--tone-deep)]" />
        <div className="container-site section-padding relative">
          <SectionHeading
            eyebrow="Para quem é"
            title="Os dois lados ganham com o match."
            lead="Quem precisa de conteúdo encontra quem sabe fazer. Quem sabe fazer encontra quem paga por isso."
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <SideCard
              id="empresas"
              Icon={Building2}
              eyebrow="Para empresas"
              title="Conteúdo com sotaque local, sem complicação."
              text="Influência local não é só alcance: é confiança. Um creator da região apresenta o seu produto para quem de fato compra de você."
              points={[
                "Busque por especialidade, cidade, nicho e orçamento",
                "Publique demandas com escopo, prazo e valor claros",
                "Contato liberado só quando os dois lados aceitam",
                "Avalie as entregas e monte seu time de confiança",
              ]}
              plans={companyPlans}
              note="Em breve: curadoria sob demanda e squads para entregas com mais de uma frente."
              cta={{ href: SIGNUP_EMPRESA, label: "Começar grátis como empresa", primary: true }}
            />
            <SideCard
              id="talentos"
              Icon={Sparkles}
              eyebrow="Para talentos"
              title="Seu talento já vale dinheiro. Falta alguém ver."
              text="Trabalha CLT, estuda ou está começando agora? Você não precisa largar nada: escolhe as demandas que quer aceitar e soma renda com o que já sabe fazer."
              points={[
                "Monte perfil e portfólio, mesmo começando do zero",
                "Aprenda de graça nas trilhas da Escola",
                "Candidate-se a demandas ou receba o interesse das empresas",
                "Cada entrega vira avaliação e portfólio",
              ]}
              plans={talentPlans}
              note="Sem seguidores e sem experiência? O que conta é o que você entrega."
              cta={{ href: SIGNUP_TALENTO, label: "Criar meu perfil grátis", primary: false }}
            />
          </div>
        </div>
      </section>

      {/* ---------- MANIFESTO + TERRITÓRIOS ---------- */}
      <section className="tone-noite noite-azul relative overflow-hidden" aria-label="Territórios">
        <KeneField motif="ronoa" scale={96} opacity={0.08} className="text-[color:var(--rio-soft)]" />
        <div className="container-site section-padding relative">
          <SectionHeading
            eyebrow="Feito na Amazônia"
            title="A Amazônia não é cenário. É quem conta a história."
            lead="Por muito tempo contaram a nossa história de fora. Aqui quem cria é daqui, quem contrata é daqui e quem cresce também: em dez polos, do Marajó ao Alto Solimões, com alcance para o Brasil inteiro."
          />
          <div className="mt-12">
            <TerritoriosMap />
          </div>
        </div>
      </section>

      {/* ---------- JORNADA DO TALENTO ---------- */}
      <section id="jornada" className="tone-verde relative overflow-hidden" aria-label="Jornada do talento">
        <SectionDivider motif="faba" height={14} opacity={0.55} fade={false} className="absolute inset-x-0 top-0 !py-0 text-[color:var(--tone-deep)]" />
        <div className="container-site section-padding relative">
          <SectionHeading
            eyebrow="Jornada do talento"
            title="Comece de graça. Cresça provando o que sabe."
            lead="Três níveis para quem está começando e para quem já entrega. Você avança pela qualidade do seu trabalho."
          />
          <ol className="mt-12 grid gap-6 lg:grid-cols-3">
            {LEVELS.map((l, i) => (
              <li
                key={l.name}
                className={`surface reveal relative flex flex-col gap-4 p-6 sm:p-7 ${
                  l.available ? "!border-[color:var(--tone-deep)] shadow-[0_30px_70px_-40px_var(--tone-deep)]" : ""
                }`}
                style={{ ["--d" as string]: `${i * 0.08}s` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--tone-deep)]">{l.level}</p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-mono text-[0.62rem] font-bold uppercase tracking-[0.14em] ${
                      l.available ? "bg-[color:var(--tone-deep)] text-white" : "bg-amarelo text-[#1a1405]"
                    }`}
                  >
                    {l.available ? "Disponível" : "Em breve"}
                  </span>
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold">{l.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{l.text}</p>
                </div>
                <ul className="space-y-2 text-sm">
                  {l.items.map((t) => (
                    <li key={t} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-[color:var(--tone-deep)]" strokeWidth={2.5} aria-hidden="true" />
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto space-y-4 pt-2">
                  <dl className="space-y-1.5 border-t border-border pt-4 text-sm">
                    {l.prices.map(([k, v]) => (
                      <div key={k} className="flex items-baseline justify-between gap-3">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="text-right font-semibold">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {l.available ? (
                    <Link href={SIGNUP_TALENTO} className="btn-cta btn-cta-primary w-full">
                      Criar meu perfil grátis <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  ) : (
                    <p className="text-xs leading-relaxed text-muted-foreground">{l.note}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- ECOSSISTEMA ---------- */}
      <EcossistemaLosango
        fotos={{
          agencia: "/img/fotos/equipe-evento.webp",
          escola: "/img/comunidade/turma-certificados.webp",
          comunidade: "/img/comunidade/encontro-criadores.webp",
        }}
        links={{
          agencia: "https://ousadiamarketing.com.br/agencia",
          escola: "https://ousadiamarketing.com.br/escola",
          comunidade: SIGNUP_TALENTO,
        }}
        externos={{ agencia: true, escola: true }}
      />

      {/* ---------- FAQ ---------- */}
      <section id="duvidas" className="tone-noite noite-marrom relative overflow-hidden" aria-label="Perguntas frequentes">
        <KeneField motif="ronoa" scale={88} opacity={0.06} className="text-marfim" />
        <div className="container-site section-padding relative">
          <SectionHeading eyebrow="Perguntas frequentes" title="Tudo o que perguntam antes de entrar." align="center" />
          <div className="mx-auto mt-12 grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-8">
            <FaqGroup Icon={Building2} title="Para empresas" items={FAQ_EMPRESAS} />
            <FaqGroup Icon={Sparkles} title="Para talentos" items={FAQ_TALENTOS} />
          </div>
        </div>
      </section>

      {/* ---------- CTA FINAL ---------- */}
      <section className="tone-roxo hero-mesh relative overflow-hidden" aria-labelledby="cta-final-title">
        <div className="container-site section-padding relative">
          <div className="surface surface-glow relative grid overflow-hidden lg:grid-cols-[1.3fr_0.7fr]">
            <div className="relative px-6 py-12 sm:px-12 sm:py-16">
              <p className="eyebrow mb-3">Comece agora</p>
              <h2 id="cta-final-title" className="headline-section max-w-xl">
                Seu próximo creator ou cliente está a um match daqui.
              </h2>
              <p className="text-lead mt-4 max-w-xl">
                Criar conta é grátis para empresas e talentos, leva poucos minutos e não pede cartão de crédito.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href={SIGNUP_EMPRESA} className="btn-cta btn-cta-primary whitespace-nowrap">
                  Quero contratar talentos <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link href={SIGNUP_TALENTO} className="btn-cta btn-cta-outline whitespace-nowrap">
                  Quero ser contratado
                </Link>
              </div>
            </div>
            <div className="photo-zoom relative min-h-64 lg:min-h-full">
              <Image
                src="/img/fotos/selfie-rio.webp"
                alt="Grupo sorrindo em uma selfie à beira do rio, na Amazônia"
                fill
                sizes="(max-width: 1024px) 100vw, 480px"
                className="object-cover"
                style={{ objectPosition: "50% 40%" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- BARRA DE AÇÃO (celular) ---------- */}
      <div className="mobile-cta border-t border-border bg-ink-deep/95 px-4 py-3 shadow-[0_-12px_30px_-18px_rgba(42,38,35,0.35)] backdrop-blur-md sm:hidden">
        <div className="grid grid-cols-2 gap-2">
          <Link href={SIGNUP_EMPRESA} className="btn-cta btn-cta-primary !min-h-11 !px-3 !py-2 !text-[0.7rem]">
            Contratar
          </Link>
          <Link href={SIGNUP_TALENTO} className="btn-cta btn-cta-outline !min-h-11 !px-3 !py-2 !text-[0.7rem]">
            Ser contratado
          </Link>
        </div>
      </div>
    </main>
  );
}

/* ---------------------------- Níveis ---------------------------- */
const LEVELS: {
  level: string;
  name: string;
  available: boolean;
  text: string;
  items: string[];
  prices: [string, string][];
  note?: string;
}[] = [
  {
    level: "Nível 1",
    name: "Comunidade",
    available: true,
    text: "Tudo o que você precisa para começar e conquistar os primeiros trabalhos.",
    items: [
      "Perfil público e portfólio",
      "Trilhas introdutórias na Escola",
      "Fórum e networking com outros creators",
      "Candidaturas às demandas das empresas",
    ],
    prices: [["Valor", "Grátis"]],
  },
  {
    level: "Nível 2",
    name: "Selo Creators",
    available: false,
    text: "A certificação que diz: esse aqui entrega. Aprovação por desafio prático ou análise de portfólio, avaliada por uma banca.",
    items: [
      "Perfil verificado e destaque na vitrine",
      "Prioridade nas indicações para empresas",
      "Feedback da banca e reenvio se não passar",
      "Desconto nas imersões presenciais",
    ],
    prices: [
      ["Avaliação", "Taxa única no envio"],
      ["Aulas ao vivo (opcional)", "R$ 9,90/mês"],
    ],
    note: "Abre quando as primeiras empresas estiverem contratando, para que quem se certificar já encontre demanda. Crie sua conta para acompanhar.",
  },
  {
    level: "Nível 3",
    name: "Aceleração",
    available: false,
    text: "Para quem já tem o Selo ou passa por seleção e quer dar o próximo salto.",
    items: [
      "Imersões presenciais de campo",
      "Laboratórios técnicos avançados",
      "Bancas de portfólio",
      "Condições especiais para quem tem o Selo",
    ],
    prices: [["Valor", "Por edição"]],
    note: "Cada imersão tem preço e vagas próprios, informados na inscrição.",
  },
];

/* ------------------------- Componentes -------------------------- */

function SideCard({
  id,
  Icon,
  eyebrow,
  title,
  text,
  points,
  plans,
  note,
  cta,
}: {
  id: string;
  Icon: typeof Building2;
  eyebrow: string;
  title: string;
  text: string;
  points: string[];
  plans: Plan[];
  note: string;
  cta: { href: string; label: string; primary: boolean };
}) {
  return (
    <article id={id} className="surface reveal flex flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amarelo text-[#1a1405]">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <p className="eyebrow">{eyebrow}</p>
      </div>
      <div>
        <h3 className="font-display text-2xl font-bold sm:text-[1.7rem]">{title}</h3>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">{text}</p>
      </div>
      <ul className="space-y-2.5 text-sm">
        {points.map((t) => (
          <li key={t} className="flex items-start gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-[color:var(--tone-deep)]" strokeWidth={2.5} aria-hidden="true" />
            {t}
          </li>
        ))}
      </ul>

      {plans.length > 0 && (
        <div className={`grid gap-3 ${plans.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {plans.map((p) => {
            const paid = Number(p.price_monthly) > 0;
            return (
              <div
                key={p.slug}
                className={`rounded-xl border p-4 ${
                  paid ? "border-[color:var(--tone-deep)]/50 bg-[color:var(--tone-deep)]/[0.06]" : "border-border bg-white/50"
                }`}
              >
                <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[color:var(--tone-deep)]">
                  Plano {planName(p)}
                </p>
                <p className="mt-1 font-display text-2xl font-bold">
                  {planPrice(p)}
                  {paid && <span className="ml-1 font-sans text-sm font-normal text-muted-foreground">/mês</span>}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {planPerks(p).map((perk) => (
                    <li key={perk}>{perk}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-sm text-muted-foreground">{note}</p>
      <Link href={cta.href} className={`btn-cta ${cta.primary ? "btn-cta-primary" : "btn-cta-outline"} mt-auto self-start`}>
        {cta.label} <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

function FaqGroup({ Icon, title, items }: { Icon: typeof Building2; title: string; items: { q: string; a: string }[] }) {
  return (
    <div>
      <h3 className="mb-4 flex items-center gap-2.5 font-display text-lg font-bold">
        <span className="grid size-8 place-items-center rounded-lg bg-amarelo text-[#1a1405]">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        {title}
      </h3>
      <div className="space-y-2.5">
        {items.map((f) => (
          <details key={f.q} className="faq-item surface px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
              {f.q}
              <Plus className="faq-icon size-5 shrink-0 text-[color:var(--tone-deep)] transition-transform duration-200" aria-hidden="true" />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

/** Fotos reais de turmas, coberturas e encontros da comunidade (carrossel do hero). */
const COMMUNITY_SLIDES: CommunitySlide[] = [
  {
    src: "/img/comunidade/turma-certificados.webp",
    alt: "Turma da Ousadia segurando os certificados de conclusão, com a equipe sentada à frente",
    caption: "Turma de Social Media no dia dos certificados",
    position: "50% 40%",
  },
  {
    src: "/img/comunidade/aluna-cobertura-flix.webp",
    alt: "Aluna da Ousadia com a câmera na mão, cobrindo a FLIX",
    caption: "Aluna em campo, cobrindo a FLIX",
    position: "50% 35%",
  },
  {
    src: "/img/comunidade/turma-estudio.webp",
    alt: "Turma grande reunida no estúdio da Ousadia, diante do fundo verde",
    caption: "Turma reunida no estúdio",
    position: "50% 45%",
  },
  {
    src: "/img/comunidade/oficina-fotografia-rio.webp",
    alt: "Oficina de fotografia com jovens e adultos à sombra de uma árvore, na beira do rio",
    caption: "Oficina de fotografia na beira do rio",
    position: "50% 50%",
  },
  {
    src: "/img/comunidade/alunas-social-media.webp",
    alt: "Cinco alunas sorrindo lado a lado na sala da Ousadia",
    caption: "Alunas da turma de Social Media",
    position: "50% 30%",
  },
  {
    src: "/img/fotos/equipe-evento.webp",
    alt: "Equipe da Ousadia Marketing sorrindo durante a cobertura de um evento",
    caption: "Equipe na cobertura de um evento",
    position: "40% 30%",
  },
  {
    src: "/img/comunidade/encontro-criadores.webp",
    alt: "Encontro da comunidade de criadores de conteúdo, com dezenas de pessoas sorrindo",
    caption: "Encontro da comunidade de criadores",
    position: "50% 70%",
  },
  {
    src: "/img/comunidade/campo-cobertura.webp",
    alt: "Alunos de camisa da Ousadia em selfie durante uma atividade de campo de cobertura de evento",
    caption: "Alunos em atividade de campo",
    position: "50% 40%",
  },
  {
    src: "/img/fotos/selfie-rio.webp",
    alt: "Grupo de colete salva-vidas em selfie na cobertura da Rota Igarapé Ambé, na beira do rio",
    caption: "Cobertura da Rota Igarapé Ambé",
    position: "50% 45%",
  },
  {
    src: "/img/comunidade/turma-social-media-2025.webp",
    alt: "Turma de Social Media de 2025 reunida na sala de aula",
    caption: "Turma de Social Media de 2025",
    position: "50% 45%",
  },
];

/** Carrossel da comunidade com o cartão de match flutuando ao lado. */
function HeroPhotos() {
  return (
    <div className="relative mx-auto w-full max-w-md sm:max-w-lg lg:max-w-none">
      <CommunityCarousel slides={COMMUNITY_SLIDES} />
      <div
        className="surface float-y pointer-events-none absolute -bottom-5 -left-10 z-20 hidden items-center gap-2.5 whitespace-nowrap !bg-white px-3.5 py-2.5 shadow-xl lg:flex"
        aria-hidden="true"
      >
        <span className="grid size-8 place-items-center rounded-full bg-floresta/20">
          <BadgeCheck className="size-4 text-floresta" />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold">Match confirmado</span>
          <span className="block text-[0.7rem] text-muted-foreground">WhatsApp liberado para os dois</span>
        </span>
      </div>
    </div>
  );
}

/* ---------- Celular do "Como funciona": a fila do match, em laço ---------- */

function MatchPhone() {
  return (
    <div className="relative mx-auto w-[17.5rem] sm:w-[19rem]" aria-hidden="true">
      <span className="surface float-y absolute -left-14 top-24 z-20 hidden items-center gap-2 !bg-white px-3 py-2 text-xs font-semibold shadow-lg sm:flex">
        <ShieldCheck className="size-4 text-floresta" /> Perfil verificado
      </span>
      <span className="surface float-y-slow absolute -right-14 bottom-24 z-20 hidden items-center gap-2 !bg-white px-3 py-2 text-xs font-semibold shadow-lg sm:flex">
        <Star className="size-4 fill-amarelo text-amarelo" /> Avaliação 5,0
      </span>

      <div className="relative rounded-[2.6rem] border-[10px] border-black/85 bg-[#10061f] p-3 shadow-[0_40px_90px_-30px_rgba(36,16,68,0.65)]">
        <span className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
        <div className="on-dark flex h-[31rem] flex-col gap-3 overflow-hidden rounded-[1.8rem] bg-gradient-to-b from-[#1b0e36] to-[#0e0620] px-3 pb-3 pt-9">
          <div className="flex items-center justify-between px-1">
            <span className="font-display text-lg font-bold">Matches</span>
            <span className="relative grid size-8 place-items-center rounded-full bg-white/10">
              <Bell className="size-4" />
              <span className="absolute right-1 top-1 size-2 rounded-full bg-amarelo" />
            </span>
          </div>

          <div className="notif flex items-center gap-3 rounded-2xl bg-white/10 p-3" style={{ ["--d" as string]: "0s" }}>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rio/30 text-rio-soft">
              <Building2 className="size-5" />
            </span>
            <span className="text-xs leading-snug">
              <b className="block text-sm">Uma empresa quer falar com você</b>
              <span className="text-muted-foreground">Procura UGC Creator em Altamira</span>
            </span>
          </div>

          <div className="notif flex items-center gap-3 rounded-2xl bg-white/10 p-3" style={{ ["--d" as string]: "1.6s" }}>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-floresta/30 text-floresta">
              <Check className="size-5" />
            </span>
            <span className="text-xs leading-snug">
              <b className="block text-sm">Você aceitou</b>
              <span className="text-muted-foreground">Agora é com os dois lados</span>
            </span>
          </div>

          <div className="notif mt-auto rounded-3xl bg-amarelo p-4 text-center text-[#1a1405]" style={{ ["--d" as string]: "3.2s" }}>
            <Handshake className="mx-auto size-9" />
            <p className="mt-1 font-display text-2xl font-bold leading-none">É um match!</p>
            <p className="mt-1 text-xs font-medium">Empresa e talento se escolheram</p>
            <span className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#06150e] py-2 text-xs font-bold uppercase tracking-wider text-floresta">
              <MessageCircle className="size-4" /> Abrir WhatsApp
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
