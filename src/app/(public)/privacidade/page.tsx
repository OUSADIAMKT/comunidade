import type { Metadata } from "next";
import Link from "next/link";
import {
  Ban,
  Eye,
  FileText,
  Lock,
  Mail,
  MessageCircle,
  ShieldCheck,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "@/components/brand/section-heading";
import { KeneBullet, SectionDivider } from "@/components/brand/kene";

export const metadata: Metadata = {
  title: "Privacidade e LGPD",
  description:
    "Como a Creators da Amazônia coleta, usa e protege seus dados pessoais, e como você exerce seus direitos pela LGPD (Lei 13.709/2018).",
  alternates: { canonical: "/privacidade" },
};

const UPDATED_AT = "8 de novembro de 2026";
const PRIVACY_EMAIL = "contato@ousadiamarketing.com.br";
const COMPANY = {
  name: "Ousadia Marketing Creators da Amazônia Ltda.",
  cnpj: "59.259.789/0001-42",
  address: "Rua Coronel José Porfírio, 1651, Centro, Altamira, PA, CEP 68371-030",
};

const PROMISES: { Icon: LucideIcon; title: string; text: string }[] = [
  { Icon: Ban, title: "Não vendemos seus dados", text: "Dado pessoal não é produto. Nunca vendemos nem alugamos sua informação." },
  { Icon: Eye, title: "Você vê o que é público", text: "Só o que você preenche no perfil vai para a vitrine. Dados de pagamento ficam fora dela." },
  { Icon: MessageCircle, title: "Contato só após o match", text: "Seu WhatsApp só é liberado quando empresa e talento aceitam um ao outro." },
  { Icon: UserRoundCheck, title: "Você manda nos seus dados", text: "Acesse, corrija, leve embora ou apague quando quiser. Sem burocracia." },
];

const TOC = [
  { id: "quem-somos", label: "Quem somos" },
  { id: "dados", label: "Quais dados coletamos" },
  { id: "finalidades", label: "Para que usamos" },
  { id: "compartilhamento", label: "Com quem compartilhamos" },
  { id: "direitos", label: "Seus direitos" },
  { id: "seguranca", label: "Segurança e retenção" },
  { id: "menores", label: "Menores de idade" },
  { id: "cookies", label: "Cookies" },
  { id: "contato", label: "Fale com a gente" },
  { id: "alteracoes", label: "Mudanças nesta política" },
];

const DATA_TABLE: { group: string; items: string; why: string; basis: string; visible: string }[] = [
  {
    group: "Conta",
    items: "Nome, e-mail, senha (criptografada) ou login com Google, foto de perfil, aceite dos termos.",
    why: "Criar e proteger sua conta.",
    basis: "Execução de contrato",
    visible: "Nome e foto, se você os usar no perfil",
  },
  {
    group: "Perfil do talento",
    items: "@usuário, cidade, especialidades, bio, redes sociais, portfólio, pacotes de serviço, avaliações recebidas.",
    why: "Exibir você na vitrine e permitir que empresas encontrem seu trabalho.",
    basis: "Execução de contrato",
    visible: "Sim, na vitrine pública",
  },
  {
    group: "Perfil da empresa",
    items: "Nome da empresa, CNPJ, segmento, cidade, campanhas e briefings publicados.",
    why: "Publicar demandas e dar match com talentos.",
    basis: "Execução de contrato",
    visible: "Campanhas publicadas",
  },
  {
    group: "Contato",
    items: "Número de WhatsApp.",
    why: "Conectar talento e empresa depois que os dois aceitam o match.",
    basis: "Execução de contrato e consentimento",
    visible: "Só para o outro lado do match",
  },
  {
    group: "Recebimento",
    items: "CPF ou CNPJ, chave Pix e data de nascimento.",
    why: "Confirmar a maioridade do titular e viabilizar cobranças e pagamentos combinados.",
    basis: "Execução de contrato e obrigação legal",
    visible: "Nunca. Ficam em área protegida, lida só por você e pela administração",
  },
  {
    group: "Escola e comunidade",
    items: "Progresso nas aulas, resultado de provas, certificados, tópicos e respostas no fórum.",
    why: "Registrar sua formação, emitir certificado e manter a comunidade.",
    basis: "Execução de contrato e legítimo interesse",
    visible: "Fórum e certificado (por código de verificação)",
  },
  {
    group: "Uso da plataforma",
    items: "Registros de acesso, interações, notificações e denúncias.",
    why: "Manter a segurança, prevenir fraudes e moderar abusos.",
    basis: "Legítimo interesse e obrigação legal",
    visible: "Não",
  },
];

const RIGHTS = [
  "Confirmar que tratamos seus dados e acessar uma cópia deles.",
  "Corrigir dados incompletos, inexatos ou desatualizados.",
  "Pedir anonimização, bloqueio ou eliminação de dados desnecessários ou tratados fora da lei.",
  "Levar seus dados para outro serviço (portabilidade).",
  "Saber com quais entidades públicas e privadas compartilhamos seus dados.",
  "Eliminar os dados tratados com base no seu consentimento.",
  "Ser informado sobre a possibilidade de não consentir e sobre as consequências.",
  "Revogar o consentimento a qualquer momento, sem custo.",
  "Reclamar à Autoridade Nacional de Proteção de Dados (ANPD).",
];

function Block({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <p className="eyebrow flex items-center gap-2.5">
        <KeneBullet mark="losango" size={11} />
        {eyebrow}
      </p>
      <h2 className="font-display text-2xl font-bold sm:text-3xl">{title}</h2>
      <div className="space-y-4 leading-relaxed text-muted-foreground [&_strong]:text-foreground">{children}</div>
    </section>
  );
}

export default function PrivacidadePage() {
  return (
    <main>
      {/* Abertura: promessa em linguagem simples, antes de qualquer texto legal */}
      <section className="tone-verde">
        <div className="container-site section-padding space-y-10">
          <div className="space-y-5">
            <SectionHeading
              as="h1"
              eyebrow="Privacidade e LGPD"
              title="Seus dados são seus. A gente só cuida deles."
              lead="Explicamos em português claro o que coletamos, por que coletamos e como você controla cada informação, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018)."
            />
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted-foreground">
              Atualizada em {UPDATED_AT}
            </p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROMISES.map(({ Icon, title, text }) => (
              <li key={title} className="surface space-y-2 p-5">
                <Icon aria-hidden className="size-6 text-[color:var(--tone-deep)]" />
                <h2 className="font-display text-lg font-bold">{title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <SectionDivider motif="iso" height={22} opacity={0.35} className="text-amarelo" />

      <div className="tone-marfim">
        <div className="container-site section-padding grid gap-12 lg:grid-cols-[15rem_1fr]">
          <nav aria-label="Nesta página" className="print:hidden lg:sticky lg:top-24 lg:self-start">
            <p className="eyebrow mb-3">Nesta página</p>
            <ol className="space-y-2 border-l border-border pl-4 text-sm">
              {TOC.map((t, i) => (
                <li key={t.id}>
                  <a className="text-muted-foreground transition-colors hover:text-foreground" href={`#${t.id}`}>
                    <span className="mr-2 font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
                    {t.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="max-w-3xl space-y-14">
            <Block id="quem-somos" eyebrow="01" title="Quem somos">
              <p>
                A <strong>Creators da Amazônia</strong> é uma plataforma de comunidade, formação, certificação e match
                entre talentos criativos da Amazônia e empresas. É uma iniciativa da{" "}
                <a
                  className="font-semibold text-[color:var(--tone-deep)] underline underline-offset-4"
                  href="https://ousadiamarketing.com.br"
                  target="_blank"
                  rel="noreferrer"
                >
                  Ousadia Marketing
                </a>
                , que atua como <strong>controladora</strong> dos dados pessoais tratados aqui: ela decide como e por
                que seus dados são usados.
              </p>
              <dl className="surface grid gap-3 p-5 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
                <dt className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-foreground">Razão social</dt>
                <dd>{COMPANY.name}</dd>
                <dt className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-foreground">CNPJ</dt>
                <dd>{COMPANY.cnpj}</dd>
                <dt className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-foreground">Sede</dt>
                <dd>{COMPANY.address}</dd>
              </dl>
              <p>
                Esta política vale para quem visita o site, cria conta como talento ou empresa, faz aulas, participa
                da comunidade ou contrata pela plataforma.
              </p>
            </Block>

            <Block id="dados" eyebrow="02" title="Quais dados coletamos">
              <p>
                Coletamos o mínimo necessário para a plataforma funcionar. A tabela mostra cada tipo de dado, o motivo,
                a base legal e se ele fica visível para outras pessoas.
              </p>
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
                  <caption className="sr-only">Dados pessoais tratados, finalidade, base legal e visibilidade</caption>
                  <thead className="bg-[color:var(--ink-void)] font-mono text-[0.68rem] uppercase tracking-[0.14em] text-foreground">
                    <tr>
                      <th scope="col" className="p-3">Tipo</th>
                      <th scope="col" className="p-3">O que é</th>
                      <th scope="col" className="p-3">Para quê</th>
                      <th scope="col" className="p-3">Base legal</th>
                      <th scope="col" className="p-3">Quem vê</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border align-top">
                    {DATA_TABLE.map((r) => (
                      <tr key={r.group}>
                        <th scope="row" className="p-3 font-semibold text-foreground">{r.group}</th>
                        <td className="p-3">{r.items}</td>
                        <td className="p-3">{r.why}</td>
                        <td className="p-3">{r.basis}</td>
                        <td className="p-3">{r.visible}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                <strong>Não coletamos</strong> dados de cartão de crédito: hoje os pagamentos são combinados diretamente
                entre as partes ou confirmados manualmente por Pix.
              </p>
            </Block>

            <Block id="finalidades" eyebrow="03" title="Para que usamos seus dados">
              <ul className="space-y-2">
                {[
                  "Criar e manter sua conta e perfil.",
                  "Sugerir talentos e oportunidades compatíveis (match) e liberar o contato somente após o aceite dos dois lados.",
                  "Emitir certificados, selos e avaliações.",
                  "Moderar perfis e conteúdos para manter um ambiente seguro e evitar fraudes.",
                  "Enviar avisos sobre a sua conta, matches, propostas e contratações.",
                  "Cumprir obrigações legais e defender direitos em processos.",
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <KeneBullet mark="losango" size={10} className="mt-2 shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <p>
                Só usamos seus dados para essas finalidades. Se um novo uso surgir, avisamos antes e, quando a lei
                exigir, pedimos o seu consentimento.
              </p>
            </Block>

            <Block id="compartilhamento" eyebrow="04" title="Com quem compartilhamos">
              <p>
                Compartilhamos dados apenas quando necessário, e nunca para venda. Alguns desses provedores podem
                armazenar dados fora do Brasil, com as garantias previstas na LGPD.
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Outros usuários:</strong> o que você publica no perfil é público. O WhatsApp é revelado
                  somente à outra parte do match.
                </li>
                <li>
                  <strong>Hostinger:</strong> hospedagem do site. Processa os acessos para que as páginas cheguem até
                  você.
                </li>
                <li>
                  <strong>Supabase:</strong> banco de dados, autenticação e armazenamento de arquivos da plataforma.
                  Trata seus dados apenas para nos prestar esse serviço.
                </li>
                <li>
                  <strong>Google:</strong> somente se você escolher entrar com a conta Google. Recebemos seu nome,
                  e-mail e foto para criar a conta.
                </li>
                <li>
                  <strong>WhatsApp:</strong> quando você decide conversar, o número liberado pelo match abre uma conversa
                  no aplicativo, que segue a política própria do WhatsApp.
                </li>
                <li>
                  <strong>Autoridades:</strong> quando houver obrigação legal ou ordem judicial.
                </li>
              </ul>
            </Block>

            <Block id="direitos" eyebrow="05" title="Seus direitos">
              <p>
                O artigo 18 da LGPD garante a você, titular dos dados, os direitos abaixo. Você pode exercê-los quando
                quiser, gratuitamente.
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {RIGHTS.map((r) => (
                  <li key={r} className="surface flex gap-3 p-4 text-sm">
                    <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-[color:var(--tone-deep)]" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <p>
                <strong>Como pedir:</strong> use o canal da seção{" "}
                <a className="font-semibold text-[color:var(--tone-deep)] underline underline-offset-4" href="#contato">
                  Fale com a gente
                </a>
                . Podemos pedir uma confirmação de identidade para proteger você contra pedidos de terceiros. Respondemos
                em até 15 dias, prazo previsto na LGPD para a declaração completa.
              </p>
            </Block>

            <Block id="seguranca" eyebrow="06" title="Segurança e retenção">
              <div className="surface flex gap-4 p-5">
                <Lock aria-hidden className="mt-1 size-5 shrink-0 text-[color:var(--tone-deep)]" />
                <p>
                  Usamos conexão criptografada (HTTPS), senhas protegidas, controle de acesso por perfil e uma área
                  separada e restrita para CPF/CNPJ, chave Pix e data de nascimento. Somente você e a administração
                  autorizada acessam esses dados.
                </p>
              </div>
              <p>
                Guardamos seus dados enquanto sua conta existir e pelo tempo necessário para cumprir obrigações legais ou
                exercer direitos. Ao excluir a conta, apagamos ou anonimizamos os dados, salvo os que a lei nos obriga a
                manter.
              </p>
              <p>
                Se ocorrer um incidente de segurança que possa causar risco relevante a você, comunicaremos você e a
                ANPD nos termos da lei.
              </p>
            </Block>

            <Block id="menores" eyebrow="07" title="Menores de idade">
              <p>
                <strong>Menores de 18 anos não criam conta.</strong> Quando o talento for menor, o pai, a mãe ou o
                responsável legal faz o cadastro, é o titular da conta e responde por ela, inclusive pela autorização do
                uso de imagem e voz do menor. Pedimos a declaração de maioridade e a data de nascimento do titular da
                conta. Se identificarmos um cadastro em desacordo, podemos suspendê-lo.
              </p>
            </Block>

            <Block id="cookies" eyebrow="08" title="Cookies">
              <p>
                Usamos apenas <strong>cookies essenciais</strong>, necessários para manter você conectado e a sessão
                segura. Não usamos cookies de publicidade nem rastreamos você em outros sites. Se isso mudar, pediremos
                seu consentimento antes.
              </p>
            </Block>

            <Block id="contato" eyebrow="09" title="Fale com a gente">
              <div className="surface surface-glow space-y-4 p-6">
                <div className="flex items-center gap-3">
                  <FileText aria-hidden className="size-5 text-[color:var(--tone-deep)]" />
                  <p className="font-display text-lg font-bold text-foreground">Encarregado de dados (DPO)</p>
                </div>
                <p>
                  Para exercer seus direitos, tirar dúvidas ou fazer uma reclamação sobre privacidade, fale com o
                  encarregado pelo tratamento de dados pessoais.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a className="btn-cta btn-cta-primary" href={`mailto:${PRIVACY_EMAIL}?subject=Solicita%C3%A7%C3%A3o%20LGPD`}>
                    <Mail aria-hidden className="size-4" />
                    {PRIVACY_EMAIL}
                  </a>
                </div>
              </div>
              <p>
                Se não ficar satisfeito com a nossa resposta, você pode apresentar reclamação à{" "}
                <a
                  className="font-semibold text-[color:var(--tone-deep)] underline underline-offset-4"
                  href="https://www.gov.br/anpd"
                  target="_blank"
                  rel="noreferrer"
                >
                  Autoridade Nacional de Proteção de Dados (ANPD)
                </a>
                .
              </p>
            </Block>

            <Block id="alteracoes" eyebrow="10" title="Mudanças nesta política">
              <p>
                Podemos atualizar esta política para refletir mudanças na plataforma ou na lei. A data no topo da página
                mostra a última revisão e, em mudanças relevantes, avisaremos você por e-mail ou dentro da plataforma.
                Veja também os{" "}
                <Link className="font-semibold text-[color:var(--tone-deep)] underline underline-offset-4" href="/cadastro">
                  termos aceitos no cadastro
                </Link>
                .
              </p>
            </Block>
          </article>
        </div>
      </div>
    </main>
  );
}
