# MVP Semana Tech — Planner de implementação real

**Projeto:** VaiVota · **Criado em:** 14/10/2026 · **Atualizado em:** 15/10/2026 (implementado: ver seção 10) · **Evento:** Semana Tech (≈ 19/10/2026, daqui a 5 dias; dia e hora exatos a confirmar)
**Base:** protótipo da Fase 1 (Etapas 0 a 9) + `docs/FRONTEIRA-DADOS.md` + `DocumentDesign.md` (v1.2)

---

## 1. Objetivo

Trocar o protótipo (dados em memória) por um sistema **funcional com dados reais**, só com o necessário para a Semana Tech.

> **Único objetivo do evento: apurar os votos do público de 8 projetos.**

O júri da Semana Tech é feito por **outro sistema**. Não há votação infantil, telão nem modo apresentação.

O **MVP Ver e Fazer Filmes** (novembro) será praticamente a versão final do produto e reaproveita tudo o que for feito aqui. Nada do que entra neste MVP deve ser descartado depois.

## 2. Escopo

### 2.1 Entra

| Bloco | O que entra |
|---|---|
| Fundação | Supabase PostgreSQL, Prisma, migração, seed, deploy na Vercel, variáveis de ambiente |
| Domínio e e-mail | Domínio próprio `.space` (a comprar), ligado à Vercel e verificado no **Resend** (subdomínio `mail.`) para enviar os códigos |
| Autenticação | Better Auth: **e-mail e senha** + **Google**. Código por e-mail (Resend) para verificar o e-mail e recuperar a senha. Rate limiting no servidor |
| Evento público | Landing `/e/semana-tech` com tema, rótulos e candidatos vindos do banco |
| Votação popular | Voto único garantido no banco, voto sem vínculo com o usuário, ordem embaralhada por usuário, estados da urna, recibo aleatório. **Pode votar em si mesmo** |
| Candidatos (admin) | Cadastro, edição, publicar/despublicar, ordenar e remover, com **upload de imagem** (Supabase Storage) |
| Operação (admin) | Ativar evento, abrir urna, encerrar urna (**sempre manual**), concluir evento |
| Apuração | `apurar` no servidor, 100% público, resultado oficial congelado na transação do encerramento |
| Dashboard **completa** | Aba Operação ao vivo + aba Resultado, exportação CSV (sem e-mails), relatório imprimível, listagem de auditoria, evento concluído em somente leitura |

### 2.2 Sai (fica para o Festival ou depois)

| Item | Observação |
|---|---|
| Votação do júri | Convites, avaliação, `VotoJuri`, histórico: `convites.ts`, `avaliacaoJuri.ts`, `configJuri.ts`, rota `/avaliar` e `/convite`. Feito por outro sistema |
| Votação infantil e totem | `totem.ts`, rota `/totem`, pareamento |
| Modo apresentação | `apresentacao.ts`, `/admin/apresentar` e `/palco`, trailer, revelação. Não há telão |
| Parcial por projeto durante a votação | **Nunca exposta.** Resolve o P4 das decisões pendentes (sem parcial) |
| Encerramento automático | `encerramentoAutomatico = false`; a urna só fecha pelo admin |
| Dev toolbar, `/dev/ui`, `sessao.entrarComo`, relógio simulado, cenários | Build do evento com `NEXT_PUBLIC_DEV_TOOLBAR=false` |
| Desempate | Não há regra. Se houver empate, as posições são compartilhadas (comportamento do domínio) |
| Config. de Geral, Placar e Tema por tela | Seed (ver ST7, opcional) |

### 2.3 Decisões deste MVP

1. Só o voto do público conta; peso 100/0/0, `moduloJuri = false`, `moduloInfantil = false`.
2. 8 projetos, cadastrados pelo admin com upload de imagem.
3. `bloquearVotoProprio = false`: não é preciso vincular usuários a candidatos.
4. Login por e-mail (Resend) **e** Google: os dois são obrigatórios.
5. Sem parcial por projeto, sem encerramento automático, sem telão, sem empate.
6. Dashboard completa (não a versão simples).
7. Domínio próprio **`.space`**, a comprar (14/10). O domínio `vercel.app` serve para o site e para o Google, mas **não** para o Resend (não dá para editar o DNS dele).
8. O e-mail é verificado no cadastro (não pode ser dispensado: sem isso, contas falsas permitiriam votos repetidos). O Resend só é usado por quem se cadastra com e-mail e senha; quem entra pelo Google não o usa.
9. **Plano B de e-mail** (só se o domínio não ficar verificado a tempo): SMTP de um Gmail dedicado ao evento (senha de app, cerca de 500 destinatários por dia), trocando apenas a função de envio do Better Auth. O remetente de teste `onboarding@resend.dev` **não** serve: só entrega para o dono da conta.

> **Correção importante sobre o login.** Em chats anteriores o login foi descrito como "sem senha". O código atual do projeto (`servicos/auth.ts`, README e `docs/DIVERGENCIAS-SCHEMA.md`) é **e-mail e senha**, com código por e-mail só para verificar o e-mail e recuperar a senha, mais Google. Este planner segue o código. Se a intenção for voltar ao login sem senha, avise antes da ST1.

## 3. Arquitetura da troca

O protótipo já isola o ponto de troca: `src/servicos/*` devolve `Resultado<T>` com as mesmas assinaturas e `src/store/seletores/*` lê o estado público. **`src/dominio/**` e `src/lib/**` não mudam** (apuração, travas, situação, exportação, auditoria).

Regra geral: a assinatura de cada serviço é mantida. Por dentro, passa a ser uma *server action* ou rota que valida a sessão e grava no Postgres. As regras comuns (revalidar, `NAO_AUTORIZADO` para não admin, `exigirAdmin`) continuam valendo.

| Serviço | Destino | Observação |
|---|---|---|
| `entrar`, `registrar`, `entrarComGoogle`, `confirmarCodigo`, `reenviarCodigo`, `solicitarRecuperacao`, `redefinirSenha`, `garantirParticipacao` | Better Auth + participação | `garantirParticipacao` cria `Participacao` `PUBLICO` (o voto nunca cria participação). `resgatarConvite` sai |
| `sair` | Better Auth | `sessao.entrarComo` sai (toolbar) |
| `votarPopular`, `consultarEstadoVoto` | Transação no Postgres | `votarJuri` sai |
| `ativarEvento`, `abrirUrna`, `encerrarUrna`, `concluirEvento` | Transação + `congelarResultado` | Encerrar e congelar na mesma transação |
| `criarCandidato`, `salvarCandidato`, `alterarPublicacao`, `reordenarCandidato`, `removerCandidato` | Prisma + Storage | Upload via servidor; `desqualificarCandidato` e `salvarCamposExtras` são opcionais (ST7) |
| `obterOperacao`, `obterResultado`, `listarAuditoria` | Consultas agregadas | `obterVotosJuri` sai. Cálculo e filtro no servidor |
| `prepararExportacao`, `registrarRelatorioGerado` | Servidor, auditado | Só os CSVs aplicáveis (sem jurados nem infantil) |

**Leitura pública** (evento, tema, candidatos publicados, situação, minha participação): server components ou rotas que entregam dados já filtrados. O cliente nunca recebe `votos`, `auditoria` nem e-mails de terceiros (tabela 5.11 do `FRONTEIRA-DADOS.md`).

**Dashboard ao vivo:** polling a cada 5–10 s com cache curto (reaproveitar `useConsulta`). Sem websockets.

## 4. Banco de dados

- **Provider:** o `schema.prisma` ainda declara `mysql` e tipos `@db.*` de MySQL. Converter para `postgresql` (F-11). `Char(36)` vira `String @db.Uuid` ou `String`; `Text` e `Json` passam a nativos.
- **Conexão:** usar o *pooler* do Supabase na `DATABASE_URL` (Vercel é serverless) e a conexão direta só para migração.
- **Tabelas do Better Auth:** `user`, `session`, `account`, `verification` (mais `rateLimit` se o limite ficar no banco). Decidir na ST1 como ligar `user` do Better Auth a `Usuario` (recomendação: mapear `user` para `usuario`; `emailVerified` booleano do Better Auth passa a alimentar `emailVerificadoEm`).
- **Constraints na migração (SQL):**
  - `ConfigPlacar`: pesos `>= 0` e soma `= 100`.
  - `Candidato`: `NOT publicado OR imagem_url IS NOT NULL` (invariante 8).
  - `Voto`: FK composta `(eventoId, candidatoId)`; `hashRecibo` único.
  - `ResultadoOficial`: `@@unique([eventoId, versao])`.
- **Voto único:** `UPDATE participacao SET votou = true WHERE id = ? AND votou = false`; se afetar 0 linhas, `JA_VOTOU`. O `INSERT` do `Voto` e esse `UPDATE` ficam **na mesma transação**. `hashRecibo` é aleatório de 32 bytes (C20).
- **Sigilo:** `Voto` sem usuário; `Participacao` sem nenhum horário (já é o schema).
- **Imagens:** bucket público para leitura no Supabase Storage; escrita só pelo servidor (chave de serviço nunca vai ao cliente). Aceitar PNG, JPG e WebP até 2 MB, validando tipo e tamanho **no servidor**. **Remover SVG do upload em produção** (risco de script embutido). Configurar o domínio do Storage em `next.config` para as imagens remotas (o protótipo só aceitava `public/`).
- **Seed/script (idempotente):** evento `semana-tech` (`estado = RASCUNHO`, `estadoUrna = NAO_INICIADA`, `encerramentoAutomatico = false`, `bloquearVotoProprio = false`, módulos desligados), tema escuro com Space Grotesk e rótulos Projeto/Projetos, campos extras `equipe` e `tecnologias`, `ConfigPlacar` 100/0/0, `metodoIdentificacao = GOOGLE_OU_EMAIL`. Script `promover-admin <e-mail>` cria ou promove a participação `ADMIN`.

## 5. Etapas

Prefixo **ST** (Semana Tech) para não colidir com as Etapas 0–9 da Fase 1.

### ST0 — Fundação
**Entrega:** compra e ligação do domínio `.space`; projeto no ar (Vercel) ligado ao Supabase; schema convertido e migrado; seed e script de admin rodando; variáveis de ambiente; build sem toolbar.
**Aceite:**
- [ ] `/e/semana-tech` abre em produção com o tema do evento, lendo do banco.
- [ ] Migração aplicada com os CHECKs.
- [ ] Domínio `.space` comprado e ligado ao projeto na Vercel.
- [ ] Domínio verificado no Resend (SPF/DKIM) e envio de teste recebido em Gmail, Outlook e Hotmail.
- [ ] Credencial do Google criada com o endereço do evento (origem e redirecionamento) e app publicado (fora do modo de teste).

### ST1 — Autenticação, sessão e participação
**Entrega:** Better Auth com e-mail e senha, Google e plugin de código por e-mail (verificação e recuperação), enviado pelo Resend (plano B: SMTP do Gmail). Guardas de rota por papel. Rate limiting no servidor (login, registro, código, voto) com bloqueio de 5 recusas seguidas.
**Aceite:**
- [ ] Registro → código por e-mail → sessão com e-mail verificado.
- [ ] Login com Google cria usuário e participação `PUBLICO`.
- [ ] Recuperação de senha funciona de ponta a ponta.
- [ ] Admin de seed acessa `/e/semana-tech/admin`; público recebe `NAO_AUTORIZADO`.
- [ ] Nenhuma tela, CSV ou auditoria mostra e-mail de terceiros.

### ST2 — Leitura pública, candidatos e upload
**Entrega:** seletores públicos reais; CRUD de candidatos com upload; ordem de exibição.
**Aceite:**
- [ ] Admin cadastra os 8 projetos com imagem; sem imagem, o projeto só fica em rascunho.
- [ ] Imagem aparece na lista e no detalhe, inclusive no celular.
- [ ] Arquivo inválido (tipo ou tamanho) é recusado no servidor.

### ST3 — Votação popular
**Entrega:** `votarPopular` e `consultarEstadoVoto` reais, ordem embaralhada por usuário, estados da urna, tratamento de falha de rede (reenvio só após `consultarEstadoVoto`).
**Aceite:**
- [ ] Segundo voto é impedido, **inclusive com requisições simultâneas** (teste automatizado).
- [ ] Com a urna não iniciada ou encerrada, não vota nem por link direto.
- [ ] Não existe vínculo entre usuário e projeto escolhido (conferir no banco).
- [ ] Votar em si mesmo é permitido.
- [ ] A ordem dos cards varia entre usuários.

### ST4 — Operação e resultado oficial
**Entrega:** ativar, abrir, encerrar e concluir; `apurar` e `congelarResultado` na mesma transação do encerramento; checklist de ativação adaptado (mínimo 2 projetos publicados, pesos 100%, janela válida; a janela é informativa, não fecha a urna).
**Aceite:**
- [ ] Depois que a urna abre, a lista de projetos e os pesos ficam travados.
- [ ] Encerrar gera a versão 1 do resultado oficial.
- [ ] O resultado oficial confere com `COUNT` de votos por projeto no banco.
- [ ] Evento concluído abre em somente leitura.

### ST5 — Dashboard completa
**Entrega:**
- Aba **Operação ao vivo:** total de votos, participantes (inscritos × votaram), votos por minuto, série no tempo, status da urna. **Sem votos por projeto** durante a votação.
- Aba **Resultado** (só após o encerramento): ranking, gráficos, pontuação final.
- Exportação **CSV** (vários arquivos, sem e-mails, auditada) e **relatório imprimível**.
- Listagem de **auditoria** do evento.

**Aceite:**
- [ ] Durante a votação não aparece contagem por projeto, nem pela API (conferir a resposta de rede).
- [ ] Total do dashboard = linhas de `voto` = soma do resultado.
- [ ] CSVs sem `@`; cada exportação gera auditoria.
- [ ] Relatório só existe com resultado oficial.

### ST6 — Endurecimento e ensaio
**Entrega:** teste de carga simples (k6) no endpoint de voto; Sentry; ensaio completo com dados reais; roteiro do dia; backup.
**Aceite:**
- [ ] Teste de carga com o pico esperado (N a definir, ver pendência) sem erros nem voto duplicado.
- [ ] Ensaio de ponta a ponta no celular: registrar, verificar, votar, encerrar, apurar, exportar.
- [ ] Backup (`pg_dump`) antes de abrir a urna e depois de encerrar.
- [ ] Dados do ensaio removidos antes do evento (ou evento recriado limpo).
- [ ] Roteiro do dia e plano de contingência escritos (internet, e-mail fora do ar, urna).

### ST7 — Opcional (só se sobrar tempo)
Telas de Geral, Placar e Tema ligadas ao banco; `desqualificarCandidato`; `salvarCamposExtras`. Para o evento, tudo isso é seed.

## 6. Cronograma sugerido

| Dia | Foco |
|---|---|
| Qua 14/10 (hoje) | ST0: comprar o domínio, verificar no Resend, criar a credencial do Google |
| Qui 15/10 | ST1 e início da ST2 |
| Sex 16/10 | Fim da ST2 e ST3 |
| Sáb 17/10 | ST4 e ST5 |
| Dom 18/10 | ST6: ensaio, carga, backup, congelar o código |
| Seg 19/10 | Evento |

**Ordem de corte se o tempo apertar** (do primeiro a cortar): ST7 → relatório imprimível → listagem de auditoria → gráfico da série. **Não cortar:** autenticação, voto, operação, apuração, dashboard (Operação ao vivo + Resultado) e exportação CSV.

## 7. Riscos e bloqueios

| Risco | Mitigação |
|---|---|
| **Resend sem domínio verificado** só envia para o dono da conta | Comprar o `.space` hoje e verificar o subdomínio `mail.` (SPF/DKIM); o DNS pode levar de minutos a horas. Plano B: SMTP do Gmail (decisão 9) |
| E-mails caindo no spam | Testar o envio em Gmail, Outlook e Hotmail na ST0; mensagem curta e remetente com o nome do evento |
| **Google OAuth em modo de teste** limita a usuários de teste | Publicar o app (escopos básicos não exigem verificação) e cadastrar a URI de redirecionamento da Vercel |
| Pico de votos após a abertura | Transação curta, pooler do Supabase, teste de carga, polling com cache curto |
| Contas falsas e abuso | Rate limiting, voto único no banco, e-mail verificado |
| Projeto Supabase gratuito pausado por inatividade | Conferir o plano e acessar o projeto nos dias anteriores |
| Código instável na véspera | Congelar o código no domingo; só correções críticas |
| Organizador que também quer votar | Admin não vota (`PAPEL_INVALIDO`); quem quiser votar usa outra conta |

## 8. Pendências [Usuário]

1. Dia e hora exatos da Semana Tech (E3).
2. Número esperado de votantes e pico (A6), para dimensionar o teste de carga e conferir o limite de e-mails do plano B.
3. Nome do `.space` e onde será registrado (pela Vercel facilita: o DNS já fica com ela e o Resend adiciona os registros pela integração).
4. Quem serão os admins (e-mails) e se o sistema do júri precisa de algum dado do VaiVota.
5. Título, descrição, equipe, tecnologias e imagem de cada um dos 8 projetos.
6. Textos finais (E30) e aviso de privacidade (E29), mesmo que simples.

## 9. Depois da Semana Tech

Reabrir júri por critério, voto infantil e totem, modo apresentação, telas de configuração completas e as pendências de `docs/DECISOES-PENDENTES.md`, no MVP Ver e Fazer Filmes.

## 10. Status da implementação (15/10/2026)

O código das etapas **ST0 a ST7** está implementado e verificado por testes e por uma fumaça ponta a ponta em build de produção contra PostgreSQL real. **Falta só o que depende de contas e configuração suas** (domínio, Resend, Google, Supabase, variáveis de ambiente): passo a passo em [`docs/SEMANA-TECH-IMPLANTACAO.md`](docs/SEMANA-TECH-IMPLANTACAO.md); dia do evento e contingência em [`docs/SEMANA-TECH-DIA-DO-EVENTO.md`](docs/SEMANA-TECH-DIA-DO-EVENTO.md).

### Como foi verificado

- `pnpm test`: 299 testes unitários (domínio, lib, estado real, cliente do servidor).
- `pnpm test:integracao`: testes do servidor contra um **PostgreSQL de verdade** com a migração aplicada: voto único com 10 requisições simultâneas da mesma pessoa, 200 pessoas votando ao mesmo tempo, **votos e encerramento ao mesmo tempo** (o resultado congelado é exatamente o que está no banco), cadastro por código, bloqueio de senha, recuperação, convite de admin, operação completa (ativar, abrir, travas, encerrar, versão 1, desqualificar gera a 2, concluir), painel sem contagem por projeto, CSV sem e-mail, segurança de origem e de imagem.
- Fumaça ponta a ponta no **build de produção** (`next start`): cadastro pelo código do e-mail, upload de imagem, publicar, ativar, abrir, votar, painel, encerrar, resultado, CSV, relatório, auditoria, 404 das rotas do Festival e portas do Better Auth fechadas.
- Carga local: 400 pessoas votando em 18 s, nenhum erro, p95 do voto de 25 ms, sem voto duplicado ou perdido (`pnpm db:carga-conferir`). **Não substitui** o teste com o k6 no ambiente de teste real (passo H da implantação).
- `pnpm lint`, `pnpm typecheck` e `pnpm build` limpos.

### Critérios de aceite

Marcado = verificado como acima. Desmarcado = depende de você ou de conferência no navegador (**nenhuma tela foi aberta num navegador nesta máquina**: confira os fluxos de tela no celular durante o ensaio).

**ST0:** [x] migração aplicada com os CHECKs · [ ] `/e/semana-tech` em produção (verificado em build de produção local; falta o deploy) · [ ] domínio `.space` comprado e ligado à Vercel · [ ] domínio verificado no Resend e envio testado em Gmail, Outlook e Hotmail · [ ] credencial do Google criada e app publicado
**ST1:** [x] registro → código → sessão com e-mail verificado · [ ] login com Google (implementado, mas **não exercitado**: exige as credenciais) · [x] recuperação de senha de ponta a ponta · [x] admin de seed acessa o painel; público recebe `NAO_AUTORIZADO` · [x] nenhuma tela, CSV ou auditoria mostra e-mail de terceiros
**ST2:** [x] cadastro dos projetos com imagem; sem imagem só rascunho (inclusive pelo CHECK do banco) · [ ] imagem na lista e no detalhe, inclusive no celular (conferir na tela) · [x] arquivo inválido recusado no servidor
**ST3:** [x] segundo voto impedido, inclusive simultâneo (teste automatizado) · [x] urna não iniciada ou encerrada não vota nem por link direto · [x] sem vínculo entre usuário e projeto (colunas das tabelas conferidas) · [x] pode votar em si mesmo · [x] a ordem dos cards varia entre usuários (`ordenarParaVotacao`, semente por usuário e evento)
**ST4:** [x] lista de projetos e pesos travados com a urna aberta · [x] encerrar gera a versão 1 · [x] resultado oficial confere com o `COUNT` do banco · [x] evento concluído em somente leitura
**ST5:** [x] nenhuma contagem por projeto durante a votação, nem na resposta de rede · [x] total do painel = linhas de `voto` = soma do resultado · [x] CSVs sem `@` e cada exportação audita · [x] relatório só com resultado oficial
**ST6:** [x] script de carga (k6) e conferência de integridade · [x] Sentry (liga só com DSN) · [x] backup (`pg_dump`) e limpeza do ensaio por script · [x] roteiro do dia e contingência escritos · [ ] teste de carga no pico esperado, no ambiente de teste (precisa do k6) · [ ] ensaio de ponta a ponta no celular · [ ] backups feitos antes e depois no evento real
**ST7:** [x] telas de Geral, Placar e Tema ligadas ao banco · [x] `desqualificarCandidato` · [x] `salvarCamposExtras`

### Decisões tomadas na implementação (revise)

1. **Cadastro antes de ativar o evento:** só e-mail com **convite de admin** (`pnpm db:promover-admin`) cria conta; é como o primeiro admin entra para poder ativar. O público espera a ativação. Quem entra pelo Google ou já tem conta não é afetado.
2. **Criar conta não abre sessão:** só o código confirmado abre (evita contas falsas com e-mail alheio).
3. **Portas do Better Auth fechadas:** `/api/auth/*` só expõe sessão, sair e Google. Cadastro, login por e-mail e códigos passam pelos serviços do projeto, que têm bloqueio por e-mail (5 senhas = 60 s; 5 códigos errados invalidam o código), limite de envio de código (30 s por e-mail e 8 por hora) e auditoria.
4. **Limites por IP muito generosos** (milhares por minuto): o público divide o mesmo Wi-Fi. **O voto não grava nada por usuário no banco** (nem contador de limite): o limite do voto é só em memória; o sigilo vale também para o `rate_limit`.
5. **Encerramento automático recusado** (`encerramentoAutomatico` só pode ser falso): não existe rotina que feche a urna sozinha; a janela é só informativa.
6. **Sessão em cache de 5 min no cookie** só na leitura do estado público (polling); toda ação sensível (voto, admin) confere a sessão no banco.
7. **A urna abrir/fechar chega ao público por polling** (10 s para quem espera, 30 s para quem já votou ou administra, 60 s com a urna encerrada; poupa chamadas da Vercel), sem websocket.
8. **SVG removido** do upload (nenhum lugar do sistema aceita SVG enviado); logo por upload é do Festival.
9. **Sem rotina de anonimização** dos dados pessoais (ficou para o MVP do Festival); o doc do dia explica.
10. **`EVENTO_PADRAO_SLUG`**: com ele definido, `/` leva ao evento (a landing da plataforma menciona recursos do Festival).
11. **Revisão independente do backend feita e corrigida:** pré-sequestro de conta (um segundo cadastro não substitui a conta que tem código vivo; `promover-admin` apaga conta com e-mail nunca confirmado), bloqueio de senha atômico (conta a tentativa antes de verificar), `rate_limit` não é mais apagado pelo Better Auth (ele usa memória), redirecionamento aberto por `?de=` com TAB/quebra de linha, trava do evento relida dentro da transação nas ações de candidato, participação do público só com o evento ativo, variações do mesmo Gmail contam como uma conta, validação de `BETTER_AUTH_SECRET`/`APP_URL`/`EMAIL_PROVIDER` em produção. **Risco aceito e documentado:** o sigilo do voto vale para a aplicação, não contra quem tem leitura direta do banco; e-mails de outros provedores podem ser criados em quantidade.
12. **O Resend gratuito tem cota diária baixa**: dimensione pelos cadastros esperados (quem entra pelo Google não usa e-mail).

## Anexo A — Domínio, Resend e Google (passo a passo)

1. **Comprar o `.space`** (pela Vercel, se ela vender; ou em outro registrador e apontar o DNS).
2. **Ligar o domínio ao projeto** na Vercel (ex.: `votacao.seudominio.space`).
3. **Adicionar o domínio no Resend** (use o subdomínio `mail.seudominio.space` para os e-mails) e criar os registros SPF e DKIM que ele mostrar. Com o DNS na Vercel, a integração do Resend faz isso sozinha.
4. **Esperar a verificação** e testar o envio (Gmail, Outlook, Hotmail).
5. **Google Cloud:** criar a credencial OAuth, cadastrar a origem e a URL de redirecionamento do domínio final e **publicar o app** (modo de teste só aceita usuários cadastrados).
6. **Variáveis de ambiente** na Vercel: URL do banco (pooler), URL direta para migração, chave do Resend, ID e segredo do Google, segredo do Better Auth, URL base do site e chaves do Supabase Storage.

## Anexo B — Registro das decisões (14/10/2026)

| Decisão | Origem |
|---|---|
| MVP Semana Tech = só o necessário; MVP Festival = praticamente a versão final | Dono do produto |
| Júri fora (outro sistema); infantil fora; telão e modo apresentação fora | Dono do produto |
| Único objetivo: apurar os votos do público; 8 projetos; pode votar em si mesmo | Dono do produto |
| Login por e-mail (Resend) e Google, os dois obrigatórios | Dono do produto |
| Sem parcial por projeto; sem encerramento automático; sem empate | Dono do produto |
| Dashboard completa (não simples) | Dono do produto |
| Imagens com upload e cadastro de candidatos pelo admin (banco real, "faz tudo") | Dono do produto |
| Domínio `.space` a comprar | Dono do produto |
| Login é e-mail e senha (não "sem senha"), conforme o código atual | Correção do planner |
