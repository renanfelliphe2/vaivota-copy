# Maratona Tech Tivit: implantação passo a passo

O código do MVP está pronto (ver [`MVP-MaratonaTechTivit.md`](../MVP-MaratonaTechTivit.md), seção 10). Falta o que só você pode fazer: criar as contas, comprar o domínio e **preencher as variáveis de ambiente**. Este guia leva do zero ao evento no ar. Tempo: cerca de 1 hora de trabalho, mais a espera do DNS.

Ordem sugerida: **A** (banco) → **B** (rodar local, opcional) → **C** (deploy) → **D** (domínio) → **E** (e-mail) → **F** (Google) → **G** (primeiro acesso) → **H** (ensaio) → **I** (véspera).

---

## A. Supabase (banco e imagens)

1. Crie um projeto em [supabase.com](https://supabase.com) (região **South America (São Paulo)**). Guarde a senha do banco.
2. **Project Settings > Database > Connection string**:
   - **Transaction pooler** (porta 6543) → `DATABASE_URL` (é a conexão da aplicação na Vercel).
   - **Session pooler** (porta 5432) → `DIRECT_URL` (só para migrar e fazer backup). Prefira o *Session pooler* à "Direct connection" (`db.xxxx.supabase.co`): esta última só tem IPv6 no plano gratuito e falha em muitas redes.
3. **Project Settings > API**: copie a **Project URL** (`SUPABASE_URL`) e a chave **service_role** (`SUPABASE_SERVICE_ROLE_KEY`). Essa chave **nunca** vai ao navegador nem a um repositório.
4. O bucket de imagens (`candidatos`) é criado pelo seed (passo G). Se preferir criar à mão: **Storage > New bucket**, nome `candidatos`, **público**, limite 2 MB, tipos `image/png, image/jpeg, image/webp`.
5. **Plano:** o projeto gratuito é **pausado por inatividade** (7 dias). Acesse o painel nos dias anteriores ao evento, ou use o plano Pro. Veja também a cota de e-mail do Resend (passo E).

## B. Rodar na sua máquina (opcional, mas recomendado antes de implantar)

Não precisa de Supabase: há um PostgreSQL embutido.

```bash
pnpm install
pnpm db:local          # sobe um PostgreSQL local, aplica a migração e o seed; deixe rodando
```

Em outro terminal, crie `.env.local` (copie de `.env.example`) com o que o `db:local` imprimiu:

```
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/vaivota
DIRECT_URL=postgres://postgres:postgres@127.0.0.1:54329/vaivota
BETTER_AUTH_SECRET=<qualquer texto com 32+ caracteres>
APP_URL=http://localhost:3000
EMAIL_PROVIDER=console    # o código do e-mail aparece no terminal do servidor
```

```bash
pnpm db:promover-admin seu@email.com   # cria o convite de admin
pnpm dev                               # http://localhost:3000/e/maratona-tech-tivit
```

Crie a conta com **esse e-mail** (o código chega no terminal do `pnpm dev`): você já entra como admin. Sem `GOOGLE_CLIENT_ID`, o botão do Google some; sem `SUPABASE_*`, as imagens vão para `public/uploads`.

## C. Deploy na Vercel

1. Importe o repositório na [Vercel](https://vercel.com). Framework: Next.js (detectado). O comando de build já é `prisma generate && next build` (está no `package.json`).
2. **Settings > Environment Variables**: cadastre as variáveis de [`.env.example`](../.env.example) para **Production** (e **Preview**, se for usar):

| Variável | Valor |
|---|---|
| `DATABASE_URL` | pooler do Supabase (porta 6543) |
| `DIRECT_URL` | conexão direta ou session pooler (porta 5432) |
| `APP_URL` | o endereço final, ex.: `https://votacao.seudominio.space` |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `EVENTO_PADRAO_SLUG` | `maratona-tech-tivit` (a raiz do site leva ao evento) |
| `RESEND_API_KEY`, `EMAIL_FROM` | passo E |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | passo F |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | passo A (a `SUPABASE_URL` precisa existir no **build**) |
| `TRUSTED_ORIGINS` | opcional: o endereço `*.vercel.app`, se for usá-lo ao lado do domínio próprio |
| `NEXT_PUBLIC_MODULOS_FESTIVAL` | **não definir** (ou `false`): júri, totem e apresentação ficam fora |
| `NEXT_PUBLIC_DEV_TOOLBAR` | **não definir**: a toolbar do protótipo nem entra no build |

3. **Migração e seed** (uma vez, da sua máquina, apontando para o Supabase): coloque `DATABASE_URL` e `DIRECT_URL` do Supabase no `.env.local` e rode:

```bash
pnpm db:migrar     # prisma migrate deploy: cria as tabelas, as constraints (CHECK) e o que o Prisma não expressa
pnpm db:seed       # cria o evento maratona-tech-tivit (rascunho), o tema escuro, os campos Equipe/Tecnologias e o bucket
```

Ao aplicar as migrações, o evento publicado com o slug antigo é renomeado para `maratona-tech-tivit`; os endereços antigos redirecionam para o novo. Atualize `EVENTO_PADRAO_SLUG` e `SEED_SLUG` nas variáveis da Vercel para `maratona-tech-tivit` antes de fazer o deploy. O seed **nunca desfaz** o que já existe: pode rodar de novo. Janela da votação: por padrão 19/10/2026 08h–22h (-03:00). Mude pela tela **Configuração > Geral** (o dia e a hora exatos ainda são uma pendência do evento) ou com `SEED_JANELA_INICIO` / `SEED_JANELA_FIM` antes do primeiro seed.

4. **Região das funções:** em Settings > Functions, escolha a região mais próxima do banco (**São Paulo, `gru1`**, se o Supabase for em São Paulo). Cada voto faz poucas consultas ao banco; região diferente soma latência em cada uma.
5. Faça o deploy e abra `/e/maratona-tech-tivit`: deve aparecer o evento, com o tema escuro e "Em breve".

## D. Domínio `.space`

1. Compre o domínio (pela Vercel, o DNS já fica com ela; em outro registrador, aponte os servidores de nome para a Vercel ou crie os registros que ela pedir).
2. Vercel > Settings > Domains: adicione `votacao.seudominio.space` (ou o domínio raiz). Atualize `APP_URL` para esse endereço e **faça um novo deploy**.
3. O endereço `*.vercel.app` serve para o site e para o Google, mas **não** para o Resend (não dá para editar o DNS dele).

## E. E-mail (Resend)

1. Crie a conta no [Resend](https://resend.com) e **adicione o domínio** usando um subdomínio, por exemplo `mail.seudominio.space`.
2. Crie os registros **SPF e DKIM** que o Resend mostrar (com o DNS na Vercel, a integração do Resend faz sozinha). Aguarde **Verified**: de minutos a horas.
3. Crie uma API key. `RESEND_API_KEY` = a chave; `EMAIL_FROM` = `Maratona Tech Tivit <votacao@mail.seudominio.space>`.
4. **Teste a entrega** criando conta com e-mails Gmail, Outlook e Hotmail; confira que o código chega na caixa de entrada (não no spam).
5. **Cota:** o plano gratuito do Resend tem limite diário baixo (100 e-mails/dia na data deste guia). Cada cadastro por e-mail e senha envia 1 código (mais 1 por recuperação de senha). Quem entra pelo **Google** não usa o Resend. Dimensione pelo número esperado de cadastros e contrate o plano pago se passar do limite.
6. **Plano B** (só se o domínio não verificar a tempo): SMTP de um Gmail dedicado ao evento, com **senha de app** (cerca de 500 destinatários por dia). Na Vercel: `EMAIL_PROVIDER=smtp`, `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASS` e `EMAIL_FROM` com o próprio Gmail. Só a função de envio muda; nada mais.

## F. Login com Google

1. [Google Cloud Console](https://console.cloud.google.com) > crie um projeto > **APIs e serviços > Tela de permissão OAuth** (tipo Externo; escopos básicos: e-mail e perfil).
2. **Credenciais > Criar credenciais > ID do cliente OAuth > Aplicativo da Web**:
   - Origem JavaScript autorizada: o valor de `APP_URL` (e o `*.vercel.app`, se usar).
   - URI de redirecionamento autorizado: `APP_URL/api/auth/callback/google` (um por endereço usado).
3. **Publique o app** (status "Em produção"). Em modo de teste o Google só aceita os usuários cadastrados; com escopos básicos não precisa de verificação.
4. Cadastre `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` na Vercel e faça novo deploy.

## G. Primeiro acesso e cadastro dos projetos

1. **Admins:** `pnpm db:promover-admin email1@exemplo.com` (e os demais). Quem já tem conta vira admin na hora; quem ainda não tem recebe um **convite**: ao criar a conta (ou entrar pelo Google) com **esse e-mail**, a pessoa já entra como admin. Antes de o evento ser ativado, **só e-mails convidados** conseguem criar conta.
2. Entre como admin em `/e/maratona-tech-tivit` e abra **Configuração**:
   - **Itens** (os projetos): cadastre os 8, com título, descrição, equipe, tecnologias e **imagem** (PNG, JPG ou WebP, até 2 MB). Marque **Colocar na votação** em cada um (sem imagem o projeto só fica em rascunho).
   - **Geral**: confira o nome e a **janela** (informativa: a urna não abre nem fecha sozinha).
   - **Tema** e **Placar** já vêm do seed (tema escuro; placar 100/0/0).
3. **Operação**: quando o **checklist** estiver todo verde (pelo menos 2 projetos publicados, pesos 100%, janela válida), use **Ativar evento**. Depois, no horário, **Abrir urna**.

## H. Ensaio (obrigatório antes do evento)

1. **Ensaio de ponta a ponta no celular**: criar conta, confirmar o código, votar, ver o painel, encerrar, ver o resultado, exportar o CSV e o relatório.
2. **Backup** antes de abrir a urna e depois de encerrar: `pnpm db:backup --rotulo antes-da-urna` (precisa do `pg_dump` instalado). O Supabase também tem backup diário (Database > Backups).
3. **Teste de carga** (com o [k6](https://k6.io)): contra um banco de **teste**, não o do evento. `pnpm db:carga-preparar --usuarios 500`, depois `k6 run -e BASE_URL=https://seu-teste -e VUS=500 tests/carga/votar.js`, e `pnpm db:carga-conferir` (confere: nenhum voto duplicado ou perdido). Ajuste o número de usuários ao pico esperado.
4. **Limpar o ensaio** antes do evento: `pnpm db:limpar-ensaio --confirmar` (apaga votos, resultados, auditoria e as contas de teste; mantém o evento, o tema, os admins e os projetos; volta o evento a rascunho). Sem `--confirmar` só mostra o que apagaria. Alternativa: recriar o evento limpo.

## I. Véspera (domingo, 18/10)

- **Congele o código**: só correções críticas daqui em diante.
- Confira: domínio no ar, e-mail chegando em Gmail/Outlook/Hotmail, Google funcionando, `NEXT_PUBLIC_DEV_TOOLBAR` e `NEXT_PUBLIC_MODULOS_FESTIVAL` **sem** valor `true`, projeto do Supabase ativo, admins entrando.
- Leia o [roteiro do dia](MARATONA-TECH-TIVIT-DIA-DO-EVENTO.md).

---

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| "Estamos com um problema temporário" ao abrir o site | `DATABASE_URL` errada, projeto do Supabase pausado ou migração não aplicada |
| O código do e-mail não chega | Domínio ainda não verificado no Resend, `EMAIL_FROM` fora do domínio verificado, cota esgotada, ou foi para o spam |
| Google: "redirect_uri_mismatch" | A URI `APP_URL/api/auth/callback/google` não está cadastrada, ou `APP_URL` difere do endereço aberto |
| Login recusado com "origem inválida" | O endereço acessado não está em `APP_URL` nem em `TRUSTED_ORIGINS` |
| Imagem não aparece | `SUPABASE_URL` ausente no build (redeploy), ou o bucket não é público |
| O botão do Google não aparece | `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` não definidos |
| `pnpm db:migrar` falha por conexão | Use o **Session pooler** (5432) em `DIRECT_URL`, não o transaction pooler (6543) nem a conexão direta (IPv6) |
