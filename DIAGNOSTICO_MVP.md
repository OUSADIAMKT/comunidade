# DIAGNÓSTICO MVP — Creators da Amazônia

> Auditoria pré-deploy de 08/11/2026. Compara o código (`src/`, `supabase/`) com o `SPEC.md` v3.0.
> Nenhum código de funcionalidade foi alterado nesta auditoria.

## ✅ Status das correções (08/11/2026, após a auditoria)

**Lote 1 — bloqueadores: feito.** Botão Sair em todos os painéis, na Escola e na Comunidade · "Esqueci minha senha" (`/recuperar-senha` → e-mail → `/nova-senha`) · WhatsApp obrigatório no perfil da empresa + aviso para as empresas já cadastradas sem ele · onboarding com saída "Cadastrar minha empresa" · painel sem o papel mostra "Ativar perfil" (sem loop para o login) · atalho "+ Empresa / + Creator" no cabeçalho · `/entrar` redireciona quem já está logado · "Tenho interesse" e "Solicitar contratação" do Mídia Kit funcionam direto para a empresa logada · Google só libera com os aceites de privacidade e 18+ marcados; quem entrou sem aceite vê a tela de aceite · migration `0010` (bloqueio de DELETE em candidaturas, tipos permitidos no bucket `media`, aceite só gravado quando real) · `FULL_SETUP.sql` gerado de novo.

**Lote 3 — melhorias rápidas: feito.** Prévia do Mídia Kit no WhatsApp/Instagram (`generateMetadata` + `metadataBase`) · checklist "falta pouco" no painel do creator · botões "Copiar link" e "Enviar no WhatsApp" do Mídia Kit · sino com notificações não lidas e contador de matches aguardando resposta · barra inferior fixa no celular (4 atalhos + "Mais") · `/talentos` e a landing só mostram perfis com score ≥ 80 · estados vazios com botão de próximo passo · textos de "PRO" e "verificados" removidos · páginas 404 e de erro em português · erro visível no botão de favoritar · aviso de que a foto enviada só vale depois de Salvar.

**Verificado:** `tsc`, `eslint` e `build` limpos; servidor de produção testado nas rotas públicas, no 404, nos redirecionamentos e nas tags Open Graph. **Não testado:** os fluxos logados (exigem contas reais). Rode o roteiro da Seção 6.

**Pendente:**
- **Rodar a `0010` no Supabase** (SQL Editor, conteúdo de `supabase/migrations/0010_hardening_pre_lancamento.sql`). Sem ela, o código funciona, mas as brechas R1 e R2 continuam abertas.
- Lote 2 (configuração externa, Seção 5).
- Lote 4 (decisões: Selo, Termos de Uso, renovação do Premium).
- Novo achado: perfis antigos continuam ligados a categorias desativadas pela 0008 (ex.: "Estrategista de Marketing" aparece no Mídia Kit e na prévia do link). A view `public_professional_profiles` não filtra `categories.is_active`.

## 0. Resultado das verificações automáticas

| Verificação | Resultado |
| :--- | :--- |
| `npx tsc --noEmit` | ✅ 0 erros |
| `npx eslint .` | ✅ 0 erros, 0 avisos |
| `npm run build` (Next 16.4.5) | ✅ Compilou. 50 páginas geradas, Proxy (middleware) ativo |
| `FULL_SETUP.sql` vs `migrations/0001–0009` + `seed.sql` | ✅ Em sincronia (conferido trecho a trecho) |
| Testes automatizados | ⚠️ Não existem (sem script `test`, sem Playwright/Vitest) |
| Links internos (`href`, `redirect`, `router.push`) | ✅ Todos apontam para rotas existentes |

**Limite desta auditoria:** foi estática (leitura de código + build). Nada foi executado contra um Supabase real. "✅ 100% Funcional" abaixo significa que a rota está ligada às tabelas reais, sem mock, e que o fluxo está completo no código. Não significa que foi testada ponta a ponta. Antes do lançamento, rode o roteiro manual da Seção 6.

---

## 1. Matriz de Completude vs. SPEC.md

Legenda: ✅ 100% funcional (Supabase real) · ⚠️ Parcial / com ressalva · ❌ Quebrado ou ausente

### Sprint 1 — Auth, Onboarding e Multi-papel

| Rota / Módulo | Status | Observação |
| :--- | :---: | :--- |
| `/cadastro` (e-mail + Google, seletor Profissional/Empresa) | ⚠️ | E-mail/senha completo. **O botão Google pula os checkboxes de LGPD e de 18+**: a conta é criada e o trigger `handle_new_user` grava `terms_accepted_at = NOW()` sem aceite real |
| `/entrar` | ⚠️ | Funciona. **Não há "Esqueci minha senha"** (nenhum `resetPasswordForEmail` no código). Usuário já logado não é redirecionado |
| `/auth/callback` | ✅ | Troca o code, aplica o papel escolhido no cadastro Google (janela de 2 min), valida `next` contra open redirect |
| `/onboarding` (wizard 3 passos) | ⚠️ | Só existe o wizard de **Profissional**. Empresa é mandada para `/empresa/perfil` (funciona, mas o comentário no código ainda diz "chega na Sprint 3") |
| `RoleSwitcher` | ⚠️ | Alterna entre papéis existentes. **Não há como adicionar o segundo papel**: um profissional não consegue virar empresa (o `PanelShell` exige `is_company` antes de abrir `/empresa/perfil`, que é onde o flag é ligado) |
| **Logout** | ❌ | **Não existe botão "Sair" em lugar nenhum** (nenhum `signOut()` no código) |
| Proxy de rotas protegidas | ✅ | `src/proxy.ts` protege `/profissional`, `/empresa`, `/admin`, `/onboarding`, `/escola`, `/comunidade` |

### Sprint 2 — Painel Profissional, Pacotes 20Pila e Mídia Kit

| Rota | Status | Observação |
| :--- | :---: | :--- |
| `/profissional` (visão geral) | ✅ | Score, pacotes ativos/limite, portfólio, notificações não lidas |
| `/profissional/perfil` | ✅ | Acordeões, categorias N:N, preview lateral, CPF/Pix em `professional_private_data`. A foto sobe ao Storage na hora, mas só é gravada no perfil ao clicar **Salvar** (se a pessoa sair antes, perde a foto) |
| `/profissional/portfolio` | ✅ | Upload ao bucket `media`, validação de 50 MB e de tipo no cliente, preview após salvar. Sem preview antes do envio e sem barra de progresso |
| `/profissional/servicos` (CRUD 20Pila) | ✅ | Trava de score ≥ 80 e de cota no banco (trigger). A mensagem de limite ainda manda "fazer upgrade para o PRO", plano desativado na 0009 |
| `/profissional/plano` | ⚠️ | Mostra só "Profissional Gratuito" (PRO desativado). **O Nível 2 / Selo da v3.0 não existe** (ver Sprint 5) |
| `/profissional/avaliacoes` | ✅ | Lê a view `public_professional_reviews` |
| `/c/[username]` (Mídia Kit público) | ⚠️ | Dados reais via view segura. **O botão "Tenho interesse" leva a `/entrar?next=/c/...`, e quem já está logado volta para a mesma página: loop sem saída.** Sem `generateMetadata`, então o link compartilhado no WhatsApp/Instagram não mostra foto nem nome |
| `/talentos` | ⚠️ | Funciona com filtros e paginação. O texto diz "Profissionais **verificados**" e "ordenados por destaque **PRO**", mas nenhum dos dois existe hoje. Lista também perfis incompletos (sem foto, sem portfólio) |
| `/servicos` (vitrine pública) | ✅ | Lê os pacotes ativos |
| `/` (landing) | ✅ | Estática, sem números inventados |
| `/privacidade` | ✅ | Política LGPD completa |
| `/termos` (Termos de Uso) | ❌ | Não existe. Há só a minuta em `docs/minuta-termos-match.md`, marcada "não publicar sem revisão jurídica" |
| `/certificado/[code]` | ✅ | Verificação pública via RPC `verify_certificate` |

### Sprint 3 — Painel Empresa

| Rota | Status | Observação |
| :--- | :---: | :--- |
| `/empresa` (dashboard + "O que você procura?") | ✅ | Contadores de cota reais |
| `/empresa/perfil` | ⚠️ | Cria/edita o perfil e liga `is_company`. **Não pede WhatsApp** (ver bloqueador nº 2) |
| `/empresa/profissionais` (busca + motor de match) | ✅ | `lib/matching-engine.ts` implementa 40/25/20/15, filtros eliminatórios ONSITE/REMOTE, desempate por PRO e nota |
| `/empresa/servicos` | ✅ | "Solicitar contratação" cria match vinculado ao pacote |
| `/empresa/oportunidades` + `/nova` + `/[id]` | ✅ | CRUD, rascunho/publicar, triagem com shortlist/aprovar/rejeitar |
| `/empresa/favoritos` | ✅ | Pastas funcionando. O botão ☆ do card falha em silêncio (sem mensagem de erro) |
| `/empresa/plano` | ⚠️ | Upgrade é um pedido manual ao admin. A assinatura vence em 30 dias e **não há renovação**: o Premium cai sozinho sem aviso |

### Sprint 4 — Motor de Match, WhatsApp, Propostas e Contratos

| Módulo | Status | Observação |
| :--- | :---: | :--- |
| Candidatura 1 clique (`/profissional/oportunidades`) | ✅ | Cota mensal, score ≥ 80, vagas e prazo validados no banco |
| Match bidirecional (`/profissional/matches`, `/empresa/matches`) | ✅ | Triggers `guard_match_insert/update` impedem auto-aprovação. Abas Interesses / Confirmados / Encerrados |
| Desbloqueio do WhatsApp | ⚠️ | O RPC `get_match_whatsapp` só devolve o número em `MUTUAL_MATCH`, correto. **Mas só funciona no sentido empresa → profissional**: a empresa nunca cadastra WhatsApp, então o profissional vê "O outro lado ainda não cadastrou WhatsApp" |
| Propostas e contraproposta | ✅ | Contraproposta gera **duas** notificações para a mesma pessoa ("Nova proposta" + "Contraproposta recebida") |
| Contratos (entrega, ajuste, conclusão com estrelas) | ✅ | Máquina de estados no banco. A nota média é recalculada por trigger |
| Notificações | ⚠️ | Gravadas por trigger, mas **só aparecem no card da página inicial do painel**. Não há sino/badge no cabeçalho nem aviso por e-mail. Quem não abre o painel não fica sabendo do match |

### Sprint 5 — Monetização e Painel Admin

| Rota | Status | Observação |
| :--- | :---: | :--- |
| `/admin` (métricas, GMV) | ✅ | RPC `admin_metrics` com checagem de admin |
| `/admin/moderacao` | ✅ | Suspender também cancela campanhas e desativa pacotes |
| `/admin/categorias` | ✅ | CRUD de categorias e serviços |
| `/admin/campanhas` | ✅ | Destaque, encerrar campanha, desativar pacote |
| `/admin/assinaturas` | ✅ | Troca manual de plano via RPC |
| `/admin/escola`, `/admin/comunidade` | ✅ | Fora do escopo MVP do SPEC (Fase 2), mas implementados |
| **v3.0 — Certificação / Selo (Nível 2), taxa única, janela de reenvio** | ❌ | SPEC §1.5 item 8 marca como MVP. Não há tabela `certification_requests`, `payments`, nem telas `/profissional/certificacao` ou `/admin/certificacoes`. O "Selo" hoje é só o booleano `is_verified`, ligado à mão pelo admin |
| **v3.0 — Curadoria B2B, squads, garantia de substituição** | ❌ | SPEC §1.5 item 8b marca como MVP. Só existe como texto "Em breve" na landing |
| **v3.0 — Confidencialidade de demanda / autonomia de portfólio** | ❌ | Campo `confidential` e trigger de portfólio (delta 7.1 itens 9–10) não existem |

> **Decisão pendente:** os itens v3.0 de certificação e curadoria são ❌ pelo SPEC, mas são produto novo, não bug. Se o lançamento é do **marketplace** (Níveis 1 e matches), dá para sair sem eles e manter o "Em breve". Se a promessa de lançamento inclui o Selo pago, isso é o maior bloco de trabalho pendente.

### Extras já entregues (Fase 2 antecipada)
`/escola` (cursos, aulas YouTube, prova, certificado), `/comunidade` (fórum com denúncia e auto-ocultação). Ambos ligados ao Supabase real.

---

## 2. Auditoria de Banco de Dados, RLS e Triggers

### 2.1 Migrations e `FULL_SETUP.sql`
- ✅ `0001` a `0009` em ordem numérica, sem buracos. `FULL_SETUP.sql` é gerado por `npm run db:bundle`, roda numa transação única (`BEGIN … COMMIT`) e está idêntico às migrations + seed.
- ✅ **Ordem segura em banco novo:** `0008` e `0009` são migrations de dados (UPDATE/DELETE) e rodam sem efeito sobre tabelas vazias. O `seed.sql` vem por último e já insere o estado final (3 categorias, `prof-pro` com `is_active = FALSE`).
- ⚠️ **`FULL_SETUP.sql` só serve para projeto novo e vazio.** Em um banco que já tem a `0001`, ele quebra no primeiro `CREATE TYPE`. Se o projeto de produção já existe, rode só as migrations pendentes.
- ⚠️ Arquivos soltos `UPDATE_0007_*.sql`, `UPDATE_0008_*.sql`, `UPDATE_ESCOLA_COMUNIDADE.sql`, `SEED_CURSO_*.sql` ficam fora do bundle. Não conferi se são idênticos às migrations equivalentes. Risco de alguém rodar o arquivo errado: mova para `supabase/legacy/` ou apague.
- ℹ️ A `0008` termina com um `SELECT` de conferência. Inofensivo no SQL Editor.

### 2.2 Colunas que mudaram de lugar
- ✅ CPF, data de nascimento, Pix e `bank_info` saíram de `professional_profiles` na `0002` e foram para `professional_private_data`. **Todo o front-end já lê e grava na tabela nova** (`profissional/perfil/page.tsx`, `profissional/actions.ts`, `onboarding/actions.ts`).
- ✅ Vitrine, Mídia Kit, busca da empresa e lista de matches leem **somente** a view `public_professional_profiles`. A tabela base só é lida pelo próprio dono ou pelo admin.
- ✅ `phone_whatsapp` fica em `users` e só sai para a outra parte via RPC `get_match_whatsapp`.
- ⚠️ A Seção 2 do `SPEC.md` (SQL baseline) ainda mostra `cpf_cnpj`/`pix_key` em `professional_profiles`. O próprio SPEC avisa que está desatualizada, mas quem ler só aquela seção vai se confundir.

### 2.3 Brechas de RLS e de cotas

| # | Severidade | Brecha | Onde | Impacto |
| :-: | :---: | :--- | :--- | :--- |
| R1 | 🟠 Média | **Profissional pode apagar as próprias candidaturas** (policy `FOR ALL` em `applications`, sem trigger bloqueando DELETE). A cota mensal conta linhas existentes, então apagar libera cota | `0001` policy "Profissional vê/cria suas candidaturas" + `guard_application_insert` | Burla do limite de 5 candidaturas/mês do plano gratuito, via API com o próprio token |
| R2 | 🟠 Média | **Bucket `media` sem lista de tipos permitidos** (`allowed_mime_types` nulo). A checagem de imagem/vídeo é só no navegador | `0002` `INSERT INTO storage.buckets` | Qualquer usuário logado pode hospedar qualquer arquivo de até 50 MB no domínio público do Storage |
| R3 | 🟡 Baixa | `company_profiles` legível por **qualquer usuário autenticado**, inclusive `cnpj` | `0001` "Empresas visíveis para autenticados" | CNPJ é dado público, mas a lista completa de empresas pode ser raspada por qualquer cadastro |
| R4 | 🟡 Baixa | RPC `has_paid_plan(uuid)` executável por `anon` para qualquer UUID | `0006` | Revela se um usuário paga plano |
| R5 | 🟡 Baixa | View `forum_authors` expõe `is_admin` e `is_paid` de todos os usuários ativos | `0006` | Quem é admin fica visível para qualquer logado |
| R6 | 🟡 Baixa | Assinatura `prof-pro` antiga e vigente: os triggers de cota ainda dão limite 999 (não checam `is_active` do plano), mas a tela mostra "Gratuito" | `enforce_package_rules`, `guard_application_insert` | Inconsistência visual, sem risco de segurança |

**O que está bem protegido (verificado):**
- ✅ WhatsApp **não vaza antes do `MUTUAL_MATCH`**: `users` só é legível pelo dono/admin, e o RPC confere status e parte.
- ✅ CPF e Pix: `professional_private_data` só dono + admin.
- ✅ Ninguém se auto-promove: `protect_user_privileged_columns` congela `is_admin` e `status`. `guard_professional_columns` congela `is_verified`, nota e score.
- ✅ Match: o cliente não consegue inserir `MUTUAL_MATCH` nem `whatsapp_unlocked`. O banco decide.
- ✅ Contratos só nascem de proposta aceita. Propostas e contratos não podem ser apagados pelo cliente.
- ✅ Cotas de empresa (1 campanha aberta, 5 interesses/mês) e de pacotes (2 ativos) impostas por trigger, não só na tela.
- ✅ Conta suspensa não cria nada (policies `RESTRICTIVE` de INSERT).
- ✅ Gabarito das provas inacessível (só via RPC que não devolve `correct_index`).
- ℹ️ Views `public_professional_profiles` e `public_professional_reviews` rodam com privilégio do dono (bypass de RLS) **de propósito** e expõem só colunas seguras. O linter do Supabase vai marcá-las como "Security Definer View": é esperado.

---

## 3. Pontos cegos de fluxo (UX e casos de borda)

### 3.1 Primeiro login com Google
| Cenário | O que acontece | Funciona? |
| :--- | :--- | :---: |
| Profissional clica Google em `/cadastro` | Conta criada como PROFESSIONAL → `/profissional` → sem perfil → `/onboarding` | ✅ |
| Empresa clica Google em `/cadastro` (com "Sou Empresa" marcado) | Callback troca os flags para COMPANY → `/empresa` → sem perfil → `/empresa/perfil` | ✅ |
| **Empresa clica Google em `/entrar`** (sem passar pelo cadastro) | O trigger cria como **PROFESSIONAL** (padrão) → cai no wizard de profissional, que não tem opção "sou empresa" | ❌ Beco sem saída |
| Empresa já logada abre `/c/[username]` e clica "Tenho interesse" | Vai para `/entrar`, que não detecta a sessão; após logar de novo, volta para a mesma página | ❌ Loop |
| Usuário logado acessa painel de papel que não tem (ex.: profissional abre `/empresa`) | `PanelShell` faz `redirect("/entrar")` com a sessão ativa | ❌ Beco sem saída |
| Google em qualquer tela | Pula o aceite da Política de Privacidade e a declaração de 18+ | ⚠️ Risco LGPD/ECA (a decisão 7.3.3 do SPEC exige a declaração) |
| E-mail com confirmação | `emailRedirectTo` → `/auth/callback` → painel do papel | ✅ (depende do SMTP, ver Seção 5) |

### 3.2 Como virar administrador
Não há tela para isso, e está certo assim: o trigger impede que alguém se promova pelo app. Comando (rode no **SQL Editor** do Supabase, **depois** de criar sua conta pelo site):

```sql
UPDATE public.users
   SET is_admin = TRUE,
       active_context = 'ADMIN'
 WHERE email = 'ousadiamkt@gmail.com';

-- conferência
SELECT id, email, is_admin, is_professional, is_company, active_context, status
  FROM public.users WHERE email = 'ousadiamkt@gmail.com';
```
O SQL Editor roda sem `auth.uid()`, então o trigger `protect_user_privileged_columns` deixa passar. Depois é só abrir `/admin`. Se a conta também for profissional ou empresa, o `RoleSwitcher` mostra as três opções.

### 3.3 Botões e formulários
- ❌ **Sem logout** em nenhum painel.
- ❌ **Sem recuperação de senha.** Quem esquecer a senha só volta pelo Google ou pedindo ao suporte.
- ⚠️ `FavoriteButton` (☆ no card de talento): erro silencioso.
- ⚠️ Foto de perfil: sobe na hora, mas só grava ao clicar Salvar, sem aviso.
- ⚠️ Mensagens de erro citam o plano "PRO", que não está mais à venda (`packageError`, texto do `/talentos`, cartão de plano).
- ✅ Nenhum `onClick` vazio, `href="#"`, `TODO` ou dado mock encontrado. Os formulários principais têm estado de carregamento ("Enviando...", "Salvando...") e mensagens de erro/sucesso com `role="alert"`/`role="status"`.

### 3.4 Upload no Storage (`media`)
- ✅ Limite de 50 MB checado no cliente e no bucket (`file_size_limit = 52428800`).
- ✅ Tipo checado no cliente (`image/*`, `video/*`). Avatar e logo aceitam só imagem.
- ✅ Caminho `userId/...` com policy de pasta própria. A remoção do item apaga o arquivo.
- ⚠️ Sem checagem de tipo no servidor (brecha R2).
- ⚠️ Sem compressão de imagem: avatar de 15 MB de celular sobe inteiro e pesa no Mídia Kit.
- ⚠️ Sem preview antes do envio nem barra de progresso. Vídeo grande em 4G parece travado.
- ℹ️ O plano Free do Supabase limita arquivos a 50 MB por projeto. No Pro, o limite do bucket passa a valer.

---

## 4. Responsividade mobile-first e identidade visual

| Item | Situação |
| :--- | :--- |
| Menu dos painéis Profissional/Empresa (`SidebarNav`) | ⚠️ Abaixo de `lg` vira uma **faixa horizontal rolável** de 11 ícones (~84 px cada). Não quebra em 375 px, mas só ~4 itens aparecem e nada indica que dá para rolar. Não há drawer/hambúrguer |
| Menu do Admin (`NavTabs`) | ⚠️ Mesma faixa rolável, 7 abas |
| Cabeçalho do painel | ✅ `flex-wrap`, o nome some no celular e o `RoleSwitcher` cabe |
| Site público (`SiteHeader`) | ✅ Tem menu hambúrguer (`<details>`, funciona sem JS) |
| Grades de cards | ✅ `sm:grid-cols-2 lg:grid-cols-3` |
| Tabelas | ✅ Só na `/privacidade`, com `overflow-x-auto` |
| Tema e identidade | ✅ Cores por painel (roxo = profissional, azul-rio = empresa), grafismos Kene, tipografia própria. Os componentes shadcn/ui (`button`, `card`, `input`, `select`, `badge`) são usados de forma consistente |
| Estados vazios | ⚠️ Existem (25 ocorrências), mas são genéricos ("Nada por aqui ainda.") e quase nenhum tem botão de próximo passo |

**Recomendação mobile:** trocar a faixa rolável por uma barra inferior fixa com 4–5 atalhos (Início, Oportunidades, Matches, Perfil, "Mais") ou por um drawer. Para os primeiros 500 creators, que vão usar quase só celular, é a melhoria visual de maior retorno.

---

## 5. Checklist de produção (Vercel + Hostinger + Supabase)

### 5.1 Variáveis de ambiente (Vercel → Settings → Environment Variables, em Production **e** Preview)
| Variável | Obrigatória | Valor |
| :--- | :---: | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | ✅ | Chave publishable/anon do projeto |

Não há `SERVICE_ROLE_KEY` no código, e é bom que continue assim. Os redirects usam `window.location.origin`, então não é preciso `SITE_URL`.

### 5.2 Domínio (Hostinger → DNS)
1. Vercel → Project → Domains → adicionar `comunidade.ousadiamarketing.com.br`.
2. Hostinger → DNS Zone de `ousadiamarketing.com.br` → registro **CNAME** `comunidade` apontando para o valor que a Vercel mostrar (normalmente `cname.vercel-dns.com`). Apague qualquer registro A/CNAME antigo de `comunidade`.
3. Esperar o certificado SSL ficar "Valid" na Vercel.

### 5.3 Supabase Auth (Dashboard → Authentication → URL Configuration)
- **Site URL:** `https://comunidade.ousadiamarketing.com.br`
- **Redirect URLs** (adicionar todas):
  - `https://comunidade.ousadiamarketing.com.br/auth/callback`
  - `https://comunidade.ousadiamarketing.com.br/**`
  - `https://*-<seu-time>.vercel.app/**` (previews)
  - `http://localhost:3000/**` (desenvolvimento)

**Provedor Google** (Authentication → Providers → Google):
- Client ID e Secret do Google Cloud Console.
- No Google Cloud: *Authorized redirect URI* = `https://<project-ref>.supabase.co/auth/v1/callback`; *Authorized JavaScript origins* = `https://comunidade.ousadiamarketing.com.br`.
- Tela de consentimento **publicada** (fora do modo "Testing", que só aceita 100 testadores), com nome, logo e link `https://comunidade.ousadiamarketing.com.br/privacidade`.

**E-mail (bloqueador de lançamento):**
- O SMTP padrão do Supabase envia poucos e-mails por hora e serve só para testes. Com 500 cadastros, as confirmações vão parar de chegar. Configure **SMTP próprio** (Authentication → Emails → SMTP Settings): Resend, Brevo ou o e-mail da Hostinger.
- Traduza os templates (Confirm signup, Reset password, Magic link) para português.
- Senha mínima: o cadastro exige 8 caracteres. Deixe o mesmo valor em Authentication → Policies.

### 5.4 Storage (bucket `media`)
- O bucket é criado pela migration `0002` (público, 50 MB). Confira em Storage → Buckets.
- **Defina os tipos permitidos** (bucket → Edit → Allowed MIME types): `image/jpeg, image/png, image/webp, image/gif, video/mp4, video/quicktime, video/webm`. Fecha a brecha R2.
- **CORS:** o Supabase Storage não tem configuração manual de CORS. A API aceita qualquer origem e a proteção é feita pelo JWT + policies de pasta (`(storage.foldername(name))[1] = auth.uid()`), que já existem.

### 5.5 SQL pós-deploy
**Projeto Supabase novo e vazio:**
1. SQL Editor → colar todo o `supabase/FULL_SETUP.sql` → Run (uma vez só).
2. (Opcional) `SEED_CURSO_CANVA.sql` e `SEED_CURSO_CAPTACAO.sql` para já ter cursos na Escola.
3. Criar sua conta pelo site → rodar o `UPDATE` da Seção 3.2.

**Projeto que já existe:** NÃO rode o `FULL_SETUP.sql`. Rode só as migrations que faltam (provavelmente `0008` e `0009`).

**Conferência final:**
```sql
SELECT slug, name, is_active FROM public.categories ORDER BY display_order;  -- 3 ativas
SELECT slug, is_active, price_monthly FROM public.subscription_plans;         -- prof-pro inativo
SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'media';
SELECT email, is_admin FROM public.users WHERE is_admin;                       -- sua conta
```

### 5.6 Outros
- Vercel → Settings → General → Node.js 20 ou superior.
- `/termos` não existe: os links de aceite apontam só para `/privacidade`.
- Sem `metadataBase` no `layout.tsx`: imagens Open Graph relativas não resolvem.
- Sem `sitemap.ts` / `robots.ts`: `/talentos` e os Mídia Kits não serão indexados direito.
- Sem `not-found.tsx` / `error.tsx` personalizados: erros caem na tela padrão do Next em inglês.

---

## 6. Top 5 correções críticas (bloqueadores de lançamento)

1. **Sessão completa: logout + "Esqueci minha senha".** Botão "Sair" no cabeçalho do `PanelShell` e do `(app)/layout` (`supabase.auth.signOut()` + `router.replace("/")`). Link em `/entrar` para `/recuperar-senha` (`resetPasswordForEmail` com `redirectTo` para `/auth/callback?next=/nova-senha`) e uma página `/nova-senha` com `updateUser({ password })`. Hoje quem esquece a senha fica preso e ninguém consegue trocar de conta num celular compartilhado.

2. **WhatsApp da empresa.** Campo obrigatório "WhatsApp com DDD" em `/empresa/perfil` gravando em `users.phone_whatsapp` (mesma validação de 10–13 dígitos do onboarding). Sem isso o match é de mão única: o creator nunca consegue chamar a marca, só esperar.

3. **Becos sem saída de papel e de login.**
   - `PanelShell`: em vez de `redirect("/entrar")` para quem está logado sem o papel, mandar para uma tela "Ativar perfil de Empresa/Profissional" (liga o flag e segue para `/empresa/perfil` ou `/onboarding`).
   - `/onboarding`: primeiro passo "Você é Profissional ou Empresa?" para quem chegou pelo Google em `/entrar`.
   - `/entrar`: se já há sessão, redirecionar para `next` ou para o painel.
   - `/c/[username]`: se quem visita é empresa logada, mostrar o `InterestButton` de verdade. Se não está logado, `/cadastro?perfil=empresa&next=/c/...`.

4. **Consentimento LGPD/18+ no Google.** Bloquear o botão Google até os dois checkboxes de `/cadastro` estarem marcados (mover os checkboxes para cima dele), passar `adult=1&terms=1` no callback e gravar `terms_accepted_at`/`privacy_accepted_at` só nesse caso. No `/onboarding`, exigir os dois aceites se estiverem vazios. Ajustar `handle_new_user` para **não** preencher `terms_accepted_at` quando o metadado não vier.

5. **Fechar as brechas R1 e R2.**
   - Migration `0010`: trigger `BEFORE DELETE ON applications` que bloqueia o cliente (reusar `block_client_delete`) ou contar a cota numa tabela de log. Em seguida, `npm run db:bundle`.
   - `UPDATE storage.buckets SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm'] WHERE id = 'media';` na mesma migration.

> **Fora da lista por ser configuração, mas é bloqueador:** SMTP próprio no Supabase (Seção 5.3). Sem ele os e-mails de confirmação param de chegar já nos primeiros dias.
>
> **Roteiro manual antes de abrir:** (a) cadastro e-mail profissional → onboarding → foto + 1 portfólio → score 80 → criar pacote; (b) cadastro Google empresa → perfil → buscar → "Tenho interesse"; (c) profissional aceita → os **dois** lados veem o botão WhatsApp; (d) proposta → aceite → entrega → conclusão com 5 estrelas → nota aparece no Mídia Kit; (e) campanha → candidatura → aprovação → match automático; (f) admin suspende o profissional → pacotes somem da vitrine. Faça tudo num celular de 375 px.

---

## 7. Top 5 melhorias rápidas de alto impacto (quick wins)

1. **Prévia bonita do Mídia Kit no WhatsApp/Instagram.** `generateMetadata` em `/c/[username]` com `title` = nome + especialidades, `description` = headline/bio e `openGraph.images` = avatar, mais `metadataBase` no layout raiz. Cada creator que compartilhar o próprio link vira divulgação da plataforma. (~15 min)

2. **Checklist "falta pouco para aparecer para as marcas".** No `/profissional`, listar os 6 itens obrigatórios do score (foto, bio, categoria, cidade, WhatsApp, portfólio) com ✓/✗ e link direto para cada um. O banco já calcula isso. Hoje só aparece "Perfil 53%". É o que leva o creator de cadastrado para publicado. (~20 min)

3. **Badge de não lidas no menu.** Contar `notifications` não lidas e `matches` pendentes no `PanelShell` e mostrar um contador vermelho no ícone "Matches" e no cabeçalho. Hoje o aviso de match só aparece se a pessoa abrir a página inicial do painel. (~20 min)

4. **Vitrine só com perfis prontos + botão "Compartilhar meu Mídia Kit".** Em `/talentos`, `/servicos` e na landing, filtrar `profile_completion_score >= 80` (ou `avatar_url IS NOT NULL`) para a empresa não ver cards vazios. No painel do creator, botão que copia o link e abre `wa.me/?text=` com o Mídia Kit. (~20 min)

5. **Estados vazios com próximo passo + revisão dos textos herdados.** Trocar "Nada por aqui ainda." por mensagens com botão (empresa sem matches → "Buscar talentos agora"; creator sem matches → "Ver oportunidades abertas"; sem pacotes → "Criar meu primeiro pacote"). Na mesma passada, tirar "verificados" e "destaque PRO" de `/talentos` e o "faça upgrade para o PRO" das mensagens de erro. Promessa que o produto não cumpre derruba a confiança das primeiras empresas. (~20 min)
