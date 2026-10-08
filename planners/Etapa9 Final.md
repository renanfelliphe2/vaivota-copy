# VaiVota — Fase 1 · Etapa 9: Fechamento do protótipo

> **Rotas:** nenhuma tela nova. Audita todas as rotas da Fase 1 e acrescenta só `not-found` global e `error`
> **Depende de:** Etapas 0 a 8 concluídas (todas as telas existem e o store reage entre elas)
> **Alimenta:** trilha de produção (Prisma + Supabase; rev. 4, A2/A3: não existe BD fake). O resultado desta etapa é a **linha de base aprovada** (tag `fase1-prototipo`) e a documentação da fronteira que a trilha de produção vai substituir
> **Fontes:** as Etapas 0 a 8 finais (seções 3, 4, matrizes de verificação e 10), `Etapa9 Fechamento.md` antigo, Contexto (itens E9-1 a E9-16, T6, T13, T16, F12, A14 a A17) e `package.json`, e `DocumentDesign.md` v1.1 (raiz do repositório; §7.6 para a configuração do evento, que substitui o inexistente `ConfiguracaoEvento.md`). O `schema.prisma` não faz parte do pacote desta etapa: a conferência mock × schema (CP7) é feita contra o arquivo do repositório
> **Status:** versão final consolidada, **revisão 2** (completa: a rev. 1 terminava na Matriz X). Substitui `Etapa9 Fechamento.md`. **Revisão 3 (07/10/2026):** aplica as decisões do documento de pendências (itens B1, B2, C1, C2, C12, C20, C21, C22, D8, D12, D19, E4, E25, E26, E27, E28, E34, A1, A3–A9, F-1 a F-9). **Revisão 4 (07/10/2026):** A1, A2/A3/A4 ("Fase 2 (BD fake)"/"Fase 3" → trilha de produção, Prisma + Supabase; `BLOQUEIA_FASE2` com nova definição), A5 (sem senha: sai `recuperar-senha`; `verificar-email` = tela de código), A6–A9, A7 (totem por planner próprio), E21 (sem votos do júri no telão), E27 (dispositivos-alvo resolvidos), E28, E29, F-1 a F-12 (aplicados).

---

## 1. Objetivo

Fechar a Fase 1 com um protótipo **coeso, demonstrável e pronto para a trilha de produção** (Prisma + Supabase, rev. 4, A2/A3). Esta etapa não cria telas nem funcionalidades: ela verifica o conjunto, corrige o que estiver fora do contrato, costura o que nenhuma etapa testou sozinha e documenta a fronteira de dados que a trilha de produção vai trocar.

Esta etapa precisa garantir:
- **Todo caminho entre telas existe** e respeita papel e fase do evento (matrizes A e B), sem beco sem saída, sem papel vendo o que não deve e sem link para rota que não existe.
- **A integração foi testada.** As Etapas 1 a 8 fecharam cada uma a sua matriz; a matriz de integração (X) cobre o que atravessa etapas: convite gerado na 6 e resgatado na 3, voto da 5 aparecendo no painel da 7, desqualificação da 6 reiniciando o telão da 8, tema editado na 6 refletido em todas as telas.
- **Utilizável de 360 px ao telão 4K**, com acessibilidade básica (teclado, foco, rótulos, contraste, movimento reduzido) nas duas identidades.
- **Um produto só:** tema, textos, componentes e formatos pt-BR consistentes; nenhuma cor de marca, texto de estado ou dado de domínio fora do lugar.
- **O fake é explícito e rastreável:** serviços, seletores, divergências do schema, cenários e ações de auditoria ficam documentados para quem vier depois.
- **Demonstrável:** um roteiro de cerca de 10 minutos que roda em **build de produção**, dentro de **uma instância** (D18 da Etapa 0).

## 2. Escopo

**Dentro**
- Conferência do contrato do conjunto contra o código real (inventário, errata registradas pelas Etapas 5 a 8, nomes, cenários, ações de auditoria).
- Auditoria de rotas, guarda de acesso, redirecionamentos, botão voltar, títulos e landmarks; `not-found` e `error` globais.
- Matrizes A (rotas × papel), B (telas × fase) e X (integração), e a regressão obrigatória das matrizes das Etapas 1 a 8.
- Responsividade, acessibilidade básica e consistência de tema, texto e componentes, com buscas de fronteira (`grep`) em todo o `src/`.
- Validação de latência e falha simuladas em todas as rotas.
- Documentação em `docs/`: fronteira de dados, divergências mock × schema, catálogo (cenários, auditoria, erros, invariantes), matriz de rotas, roteiro de demonstração, checklist final, registro de achados e decisões pendentes.
- Build de produção (`next build` e `next start`), README final, demonstração com e sem a toolbar, tag da linha de base.

**Fora (e onde fica)**
- **Telas e funcionalidades novas.** Qualquer ideia vira item de backlog em `docs/ACHADOS.md` (D1).
- **Totem** (`/totem`, `/totem/parear`, pareamento, quiosque com PIN, voto infantil, gestão de dispositivos, `CodigoPareamento`): fora desta etapa; **entra com o planner Totem** (rev. 4, A7, a escrever); até lá, `Dispositivo` e `VotoInfantil` são dados seed. `ConviteAdmin` e tela de convite de admin: depois; admins adicionais por seed (rev. 4, A9).
- Persistência, autenticação real (Better Auth), rate limiting real, envio de e-mail (Resend), upload real de mídia: trilha de produção (Prisma + Supabase, rev. 4, A2–A5).
- Mudança de regra de negócio ou de schema: as divergências só são **registradas** (CP7).
- Desempenho e teste de carga (dependem do backend real).
- Auditoria formal WCAG e testes automáticos de tela: a verificação das telas é manual, por `verificarInvariantes`, pelos autotestes e pelas matrizes. As funções puras de `src/dominio/**` e `src/lib/**` já têm testes Vitest (D19 da Etapa 0, rev. 3), que esta etapa só roda (`pnpm test`).
- `global-error.tsx` (D4).

---

## 3. Contrato com as outras etapas

### 3.1 O que esta etapa recebe

**Notação das matrizes.** As Etapas 4 e 7 usam ambas `V1…` e a Etapa 2 usa `E1…`, que colide com a notação de etapa. Aqui cada linha é citada como **`N/ID`**, com `N` a etapa dona: `2/E5`, `4/V12`, `5/W3`, `6/C7`, `7/V12`, `8/AP9`.

| Item | Dono |
|---|---|
| Tipos, `Resultado<T>`, `CodigoErro`, `ModoFalha`, store, relógio, `transicoes`, tema, `RotaGuard`/`resolverAcesso`/`AcessoRestrito`/`AdminShell`, componentes de UI, `SkipLink`, `LiveRegion`, `useConsulta`, mecanismo de cenários e toolbar, `verificarInvariantes` (I1 a I7) | Etapa 0 |
| `resolverSituacaoEvento` e a grade tema × situação (16 células) | Etapa 1 |
| `resolverVisaoEvento`, `lib/textosEstado.ts`, `EventoShell`, matriz `2/E1` a `2/E18` | Etapa 2 |
| `servicos/auth.ts`, `resolverDestinoAcesso`, `MenuUsuario`, `CampoCodigoConvite`, grade de fluxos | Etapa 3 |
| `resolverEstadoVotar`, lista, cartão, detalhe, ordem por semente, `VOTO_PROPRIO`, matriz `4/V1` a `4/V25` | Etapa 4 |
| `servicos/votacao.ts`, `dominio/aplicarVoto.ts`, `ui.votacao`, `resolverPassoVotar`, seção Votação da toolbar, matriz `5/W1` a `5/W28` | Etapa 5 |
| `dominio/travas.ts`, `lib/csv.ts`, `dominio/convites.ts`, `servicos/operacao.ts`, checklist de ativação, auditoria de configuração, cenários de rascunho e de estado, matriz `6/C1` a `6/C36` | Etapa 6 |
| `apurar`, `congelarResultado`, `gerarVolume`, `mocks/cenarios/resultado.ts`, `dominio/auditoria.ts` (catálogo de exibição), exportação, relatório, I8, `conferirApuracao`, matriz `7/V1` a `7/V40` | Etapa 7 |
| `dominio/apresentacao/`, `servicos/apresentacao.ts`, `ui.apresentacao`, `dev.simularTrailerFalha`, três cenários do Festival, autotestes `conferirRoteiro`/`conferirMotor`/`conferirFixturesFestival`, matriz `8/AP1` a `8/AP45` | Etapa 8 |
| Errata mínimas registradas: `5/D16` e `5/P7`, `6/P15`, `7/P15`, `8/P12`. **Já incorporadas na Etapa 0 rev. 2** (Anexo C dela); o CP1 desta etapa confere no código que estão lá | Etapas 5 a 8 |
| Pendências da seção 10 de cada etapa (as marcadas **[Usuário]**, as resolvidas na rev. 3 e na rev. 4 e as "fase com banco", hoje "trilha de produção") | Etapas 0 a 8 (CP9 consolida) |

### 3.2 O que esta etapa entrega

| Item | Consumidor |
|---|---|
| `src/app/not-found.tsx` e `src/app/error.tsx` (D4) | todas as rotas |
| Correções mínimas no código das Etapas 0 a 8, listadas em `docs/ACHADOS.md` | a etapa dona de cada uma |
| `docs/MATRIZ-ROTAS.md` (matrizes A e B com o resultado real e o mapa de entradas e saídas) | Trilha de produção (regressão de acesso) |
| `docs/FRONTEIRA-DADOS.md` (contrato dos serviços, leituras por seletor, exposição de dados no cliente e pontos de entrada da trilha de produção) | Trilha de produção |
| `docs/DIVERGENCIAS-SCHEMA.md` (mock × schema, invariantes × constraints; banco decidido: Supabase PostgreSQL, rev. 4, A4 — a conversão do schema MySQL é da trilha de produção) | Trilha de produção |
| `docs/CATALOGO.md` (21 cenários listados por nome, D10; 21 ações de auditoria, 26 códigos de erro, 8 invariantes, autotestes, toolbar) | Trilha de produção |
| `docs/ROTEIRO-DEMO.md` e README final da Fase 1 | Demonstração, Semana Tech e trilha de produção |
| `docs/CHECKLIST-FASE1.md`, `docs/ACHADOS.md` e `docs/DECISOES-PENDENTES.md` | aprovação e backlog |
| Tag `fase1-prototipo` e `VaiVota-E9-CP9.zip` (final da Etapa 9 e da Fase 1) | Trilha de produção |

**Acréscimos ao contrato do conjunto** (para registrar na seção 10 do Contexto)
- `ui`, `dev`, `CodigoErro`, ações de auditoria, invariantes, controles da toolbar e cenários: **nenhum novo**. Esta etapa só consolida e valida (inventário na seção 5.10).
- Qualquer divergência de **nome** achada no CP1 se resolve ajustando o planner da etapa dona, não criando nome novo (Anexo A da Etapa 0).

---

## 4. Decisões

Só as decisões **novas** desta etapa. As do conjunto vivem na Etapa 0.

| # | Decisão | Motivo |
|---|---|---|
| D1 | **Esta etapa verifica e corrige; não constrói.** Todo achado vira uma linha em `docs/ACHADOS.md`, com uma de três classes: `BLOQUEIA_FASE2` (corrigir aqui, no código da etapa dona, com o menor diff possível), `PODE_ESPERAR` (backlog) ou `DECISAO` (depende do dono do produto). Ideia nova ou ajuste de gosto é sempre `PODE_ESPERAR`. Corrigir um módulo obriga a reexecutar a matriz inteira da etapa dona (D3). A definição de `BLOQUEIA_FASE2` está na seção 5.1 (o nome se mantém; desde a rev. 4, A2, significa "bloqueia a troca do mock pelo banco real (trilha de produção)"). | Sem esta fronteira o fechamento vira uma Etapa 10. |
| D2 | **A fronteira de dados tem dois pontos de troca.** (a) `servicos/`: tudo o que viria do servidor; **não existe `repo.ts`** (D3 da Etapa 0, E9-1). (b) Os **seletores** sobre o `banco`, que servem o estado público do cliente (evento, tema, candidatos, sessão) e hoje leem as tabelas inteiras. `FRONTEIRA-DADOS.md` documenta os dois, mais o que é função pura reaproveitável (`dominio/`, `lib/`). | A Etapa 0 deixou dois caminhos de leitura (D3). A trilha de produção não pode descobrir o segundo só depois de trocar o primeiro, e o mock expõe ao cliente dados que o servidor real não deve expor (5.11). |
| D3 | **Regressão em camadas.** As matrizes A, B e X desta etapa são executadas **por inteiro**. As matrizes das Etapas 1 a 8 (cerca de 215 casos, todos já executados no fechamento de cada etapa) rodam só no **subconjunto obrigatório** da seção 5.5, escolhido por sensibilidade à integração. Mexer em módulo de uma etapa obriga a rodar a matriz inteira dela. | Repetir tudo não acharia nada novo; não repetir nada deixaria passar regressão entre etapas. |
| D4 | **Páginas globais: só `not-found.tsx` e `error.tsx` em `src/app/`.** Não existe `e/[slug]/not-found.tsx` (slug inexistente é do `GateEvento` → `EventoNaoEncontrado`, D14 da Etapa 0; E9-11). Não há `global-error.tsx`: ele só cobre falha do próprio layout raiz, que já cai na tela padrão do Next, e exigiria uma casca sem tema nem tokens. As duas páginas herdam o `TemaEvento` do layout raiz e não leem sessão. | Evita duas telas de "não encontrado" para o mesmo caso e uma terceira sem tema. |
| D5 | **A matriz A usa as telas reais, não as do planner antigo** (E9-9, E9-10). Jurado e admin em `/convite` recebem os **avisos** da Etapa 3, não "redirecionar" nem "bloquear"; admin em `/votar` vê "Administradores não votam" (D12 da Etapa 4); Hugo é admin **só do Festival**; Davi (sem participação) em rota de admin vê `AcessoRestrito`, não o login. | O planner antigo foi escrito antes das Etapas 3 e 4. |
| D6 | **Concluir o evento não redireciona** (P17 da Etapa 6). A Configuração fica em leitura com o `Alerta` e o `Link` para o painel, como a Etapa 6 entregou e validou (`6/C35`). O planner antigo mandava ir ao dashboard. | A confirmação por digitação já é o ponto sem volta; um redirecionamento tira a pessoa da tela em que o efeito (travas em leitura) aparece, e a navegação já foi validada. Confirmado pelo dono do produto (rev. 3, E26). |
| D7 | **Meta de acessibilidade:** Lighthouse Accessibility **≥ 90** e axe com **zero violações `critical` e `serious`**, nas rotas de produto (lista em 5.8), medidas com a toolbar **oculta**. Violação `moderate` e `minor` é registrada. Sem auditoria formal WCAG. | `serious` é onde o axe classifica contraste, e a D15 da Etapa 0 já proíbe texto abaixo de 4,5:1. `/dev/ui`, a toolbar e o palco (que não é página navegável) ficam fora da medição; o palco é conferido à mão. |
| D8 | **"Celular" na demonstração é a mesma instância** (E9-7, D18 da Etapa 0). Duas formas: (a) modo dispositivo do navegador (390 px) **na mesma aba**; (b) a demonstração inteira rodando **no aparelho** (outra instância, com o próprio estado). Nunca votar no celular e esperar ver o voto no painel do notebook. | Sem backend não há estado compartilhado. O ato 2 do roteiro confirma, no ensaio, que alternar o modo dispositivo não recarrega a página. |
| D9 | **Toolbar na demonstração (rev. 3, E4):** a variável `NEXT_PUBLIC_DEV_TOOLBAR` é embutida **na hora do build**, então "com e sem toolbar" são **dois builds**. O **build para o público é SEM toolbar** (build 2): roteiro mínimo (login pelos formulários, votar, painel, encerrar, resultado, apresentar) sobre o seed da Semana Tech. O build **com** toolbar (build 1) serve **só para ensaio** e para o roteiro completo (cenários e "Entrar como"), nunca diante do público. | E9-4. A Etapa 0 manteve a toolbar no build de produção (padrão `true`); o dono do produto decidiu que o público não a vê (E4). Sem toolbar não há como forçar estado nem reabrir urna (CP8, C21). |
| D10 | **Cenários finais: 21, e consolidar é verificar** (rev. 3, D12: contagem refeita por `grep` nas tabelas das Etapas 0 a 8). Lista: `PADRAO` (E0); `SEM_ENCERRAMENTO_AUTOMATICO` (E1); `SEM_CANDIDATOS` (E2); `SOMENTE_GOOGLE`, `SOMENTE_EMAIL` (E3); `MUITOS_CANDIDATOS`, `VOTO_PROPRIO_PERMITIDO` (E4); `RASCUNHO_INCOMPLETO`, `RASCUNHO_PRONTO`, `URNA_ENCERRADA`, `EVENTO_CONCLUIDO` (E6); `FESTIVAL_ENCERRADO`, `RESULTADO_PADRAO`, `RESULTADO_EMPATE_RESOLVIDO`, `RESULTADO_EMPATE_PERSISTENTE`, `RESULTADO_CO_VENCEDORES`, `RESULTADO_SEM_INFANTIL`, `RESULTADO_DOIS_CANDIDATOS` (E7); `FESTIVAL_EMPATE_RESOLVIDO`, `FESTIVAL_EMPATE_PERSISTENTE`, `FESTIVAL_CO_VENCEDORES` (E8). Os 20 da tabela 5.8 da Etapa 0 e da lista da rev. 3, mais `VOTO_PROPRIO_PERMITIDO`, que a Etapa 4 registra (grupo `DADOS`) e as Etapas 5 e 6 usam. Cada cenário aplica, reaplica sem erro e deixa as invariantes e os autotestes vazios (CP1). A demonstração usa só `PADRAO` e `FESTIVAL_EMPATE_RESOLVIDO`; reservas: `RESULTADO_PADRAO`, `FESTIVAL_ENCERRADO` e `SEM_ENCERRAMENTO_AUTOMATICO`. Nenhum cenário é criado aqui. | O planner antigo mandava criar `cenarios.ts` com os cenários nomeados; o registro já existe e cada etapa registrou os seus (E9-8). |
| D11 | **Nenhuma dependência nova, nem de desenvolvimento.** `vitest` é permitido porque já foi aprovado na Etapa 0 como dependência de desenvolvimento (D19 dela, rev. 3); esta etapa só roda `pnpm test`. Lighthouse e o painel de acessibilidade do navegador vêm do Chrome; axe DevTools é extensão do navegador; as buscas são `grep` e *scripts* descartáveis (não commitados) para achar arquivos sem uso. | Seção 3.3 da Etapa 0: dependências aprovadas são só `lucide-react`, `qrcode.react` e `vitest` (dev). |
| D12 | **A documentação vive no repositório** (`docs/`) e é versionada com a tag. O **Contexto** (arquivo de planejamento) fica fora do repositório e é atualizado no CP9 com o que esta etapa acrescenta. | A trilha de produção começa de uma tag; os planners não acompanham o código. |

## 5. Modelo e regras

### 5.1 Achados: classes e formato

Todo desvio encontrado em qualquer checkpoint entra em `docs/ACHADOS.md`, uma linha por achado:

| Campo | Conteúdo |
|---|---|
| ID | `A-001`, `A-002`… |
| CP | Checkpoint em que apareceu |
| Onde | Rota, arquivo ou linha de matriz (`N/ID`) |
| O que acontece / O que era esperado | Em uma frase cada, com a referência (matriz, decisão ou critério) |
| Classe | `BLOQUEIA_FASE2`, `PODE_ESPERAR` ou `DECISAO` |
| Etapa dona | Onde a correção entra |
| Status | `ABERTO`, `CORRIGIDO` (com o CP) ou `BACKLOG` |

**`BLOQUEIA_FASE2`** (nome mantido; rev. 4, A2: "bloqueia a troca do mock pelo banco real (trilha de produção)") é, e só é:
- violação de uma invariante (I1 a I8) ou de um autoteste depois de uma ação;
- vazamento de sigilo: voto, escolha identificada, código de convite ou e-mail de outra pessoa em tela, DOM, CSV, relatório, auditoria ou console; voto por candidato visível com a flag desligada; qualquer "quem votou em quem" no palco (rev. 4, E21: as categorias mostram só o vencedor);
- papel vendo o que não deve (matriz A) ou serviço de admin sem validar o admin do evento;
- `lint`, `typecheck`, `test` ou `build` quebrados; erro ou aviso de hidratação no console;
- dado de domínio, hex de marca ou texto de estado fixos fora de `src/mocks/seed/`, `globals.css` e `components/dev/`;
- leitura de tabela sigilosa ou import de `@/mocks` fora do que a D4 da Etapa 0 permite;
- perda de estado ao navegar por `Link`, tela travada ou `error.tsx` acionado por latência ou falha simulada;
- ação de uma etapa que a demonstração precisa e não funciona em `next start`.

O resto (acabamento visual, texto que poderia ser melhor, ajuste de gosto, ideia nova) é `PODE_ESPERAR`. O que depende de resposta do dono do produto é `DECISAO` e vai para a seção 10.

### 5.2 Matriz A: rotas × papel

Executada no CP2, nos dois eventos e nos dois temas. O resultado real de cada célula é registrado em `MATRIZ-ROTAS.md`; qualquer diferença do esperado é achado (bug ou decisão a registrar).

Papéis (usuários seed): **Deslogado**; **Davi** (logado, e-mail não verificado — cadastro iniciado, código nunca confirmado, forçado pela toolbar —, sem participação); **Ana** (público, não votou); **Bruno** (jurado); **Carla** (admin do evento); **Hugo** na Semana Tech (admin **de outro** evento: usuário comum aqui, D13 da Etapa 0 e D5 da Etapa 2).

Legenda: **VER** tela normal · **LOGIN** vai para `/e/{slug}?de={rota}` · **VERIF** vai para `/e/{slug}/verificar-email` (tela de código, rev. 4, A5) · **RESTRITO** `AcessoRestrito` sem nenhum dado da tela · **REDIR** redireciona (destino indicado) · **AVISO** tela informativa, sem formulário nem ação.

| Rota | Deslogado | Davi | Ana | Bruno | Carla | Hugo (Semana Tech) |
|---|---|---|---|---|---|---|
| `/` | VER | VER | VER | VER | VER | VER |
| `/e/[slug]` | VER (painel de acesso) | VER (ação `VERIFICAR_EMAIL`) | VER (`VOTAR`) | VER (`VOTAR_JURADO`) | VER (`PAINEL_ADMIN`) | VER (`VOTAR`, usuário comum) |
| `/e/[slug]/verificar-email` (tela de código) | LOGIN; com login pendente (`ui.loginPendente`, depois de "Enviar código"): VER | VER | REDIR (já verificado) | REDIR | REDIR | REDIR |
| `/e/[slug]/convite` | LOGIN | VERIF | VER (formulário de código) | AVISO \"Você já é jurado\" | AVISO \"Contas administrativas não resgatam convite\" | VER (formulário, usuário comum) |
| `/e/[slug]/votar` | LOGIN | VERIF | VER (lista) | VER (lista, sem contagens) | AVISO \"Administradores não votam\" | VER (lista, usuário comum) |
| `/e/[slug]/admin` | LOGIN | RESTRITO | RESTRITO | RESTRITO | VER | RESTRITO |
| `/e/[slug]/admin/configuracao` | LOGIN | RESTRITO | RESTRITO | RESTRITO | VER | RESTRITO |
| `/e/[slug]/admin/relatorio` | LOGIN | RESTRITO | RESTRITO | RESTRITO | VER (só com resultado oficial; senão, explicação) | RESTRITO |
| `/e/[slug]/admin/apresentar` | LOGIN | RESTRITO | RESTRITO | RESTRITO | VER | RESTRITO |
| `/dev/ui` | VER com a flag da toolbar ligada; **404** com ela desligada (todos os papéis) | | | | | |
| Rota inexistente (`/xyz`, `/e/semana-tech/xyz`) | `not-found` global (todos os papéis) | | | | | |
| `/e/inexistente` e qualquer subrota | `EventoNaoEncontrado` do gate (todos os papéis) | | | | | |

Notas da matriz:
- **Hugo no Festival** é admin: VER em todas as rotas de admin. **Carla** é admin nos dois eventos.
- **Sem senha (rev. 4, A5):** a rota `/e/[slug]/recuperar-senha` não existe mais (cai no `not-found` global, como `/e/semana-tech/xyz`). Login e registro levam à tela de código (`verificar-email`); no protótipo o código é `123456`.
- **`/totem` e `/totem/parear`:** fora desta matriz; entram com o planner Totem (rev. 4, A7).
- **Eva** (público que já votou): `/convite` mostra o bloqueio explicativo, sem formulário (`JA_VOTOU_COMO_PUBLICO`), e `/votar` mostra \"já votou\", sem dizer em quem.
- Em `/convite`, módulo júri desligado, urna encerrada ou evento concluído mostram tela informativa **sem formulário** para qualquer papel (5.4 da Etapa 3).
- Fora da tabela, mas conferido no CP2: slug com urna em qualquer fase não muda o que a matriz diz; só o **conteúdo** da tela muda (matriz B).

### 5.3 Matriz B: telas × fase

Executada no CP3, nos dois eventos e nos dois temas. A fase vem de `resolverFaseConfig` (Etapa 6); a situação, de `resolverSituacaoEvento` (Etapa 1). Combinações que só a toolbar produz seguem a precedência `CONCLUIDO` > `RASCUNHO` > urna (T13) e estão em `X11`.

| Tela | `RASCUNHO` | `ATIVO_NAO_INICIADA` | `URNA_ABERTA` | `URNA_ENCERRADA` | `CONCLUIDO` |
|---|---|---|---|---|---|
| Landing `/` | \"Evento em preparação\"; CTA \"Em breve\" **desabilitado**; sem prévia e sem \"Sou jurado\" | \"A votação abre em…\" ou \"Aguardando a abertura pela organização\"; CTA \"Criar conta\" | \"Votação aberta\" (com reta final e tempo esgotado conforme o relógio); CTA \"Quero votar\" | \"Votação encerrada\"; sem CTA | \"Evento concluído\"; sem CTA |
| Evento `/e/[slug]` | Não admin: `INDISPONIVEL` (casca mínima). Admin: página normal, banner \"Rascunho\" e `PAINEL_ADMIN` | `NAO_INICIADA`: \"Abre em\"; entrar e criar conta permitidos (D7 da Etapa 2); sem botão de voto | `ABERTA` (ou `SEM_CANDIDATOS`): botão conforme papel; \"Encerra em\" | `ENCERRADA`: sem botão de voto; agradecimento a quem votou | `CONCLUIDO` |
| Convite `/convite` | Registrar o real (a Etapa 3 não define) | Formulário de código | Formulário de código | AVISO sem formulário | AVISO sem formulário |
| Votar `/votar` | `INDISPONIVEL`; admin: \"Administradores não votam\" | `NAO_INICIADA`, sem lista nem por link direto | `LISTA`, `JA_VOTOU`, `JURI_DESLIGADO` ou `SEM_CANDIDATOS` conforme papel; **continua votável** em `TEMPO_ESGOTADO` | `ENCERRADA` | `CONCLUIDO` |
| Dashboard `/admin` | Só o estado vazio \"O evento ainda não foi ativado\" + link para a Configuração; Resultado e exportações desabilitados | Zeros com texto explicativo; só exportações de **operação** | Operação completa, polling de 5 s; Resultado desabilitado; só exportações de operação | Operação estática e **Resultado habilitado**; todas as exportações; relatório | Somente leitura (banner); exportar continua permitido e auditado |
| Configuração | Livre (desqualificar indisponível); \"Ativar evento\" com checklist | Livre, **exceto o slug**; \"Abrir urna\" com checklist | Candidatos, pesos, identificação e início da janela **travados**; fim só se estende; \"Encerrar urna\" com confirmação forte | Quase tudo travado; \"Concluir evento\" digitando o nome | Leitura total |
| Apresentação (palco) | `PRE_VOTACAO` (\"Em breve\") | `PRE_VOTACAO` (contagem ou \"Aguardando a abertura…\") | `AO_VIVO`: cards, QR Code, temporizador, total; **sem votos por candidato** | `ENCERRADA_AGUARDANDO` → `REVELACAO` → `FINAL_ESTATICO` | `FINAL_ESTATICO`, sem cerimônia (sem resultado: `SEM_RESULTADO`) |

O **ensaio** da Etapa 8 ignora a fase e roda em qualquer uma. Com `TEMPO_ESGOTADO` (urna aberta além de `janelaFim`, auto-encerramento desligado) cada tela mostra o aviso e **votar continua permitido** (`X12`).

### 5.4 Matriz X: integração

Todos os testes são feitos **na mesma aba** (D18 da Etapa 0), navegando por `Link` e trocando de sessão pela toolbar (\"Entrar como\"). `verificarInvariantes` e os autotestes ficam vazios **depois de cada linha**; o `InspetorEstado` confere `banco`, `resultados` e `auditoria`. Salvo indicação, o evento é a Semana Tech no `PADRAO`.

**Navegação e acesso (CP2)**

| # | Integração | Como provocar | Esperado |
|---|---|---|---|
| X1 | Entrada e saída de cada rota | Percorrer o mapa de `MATRIZ-ROTAS.md` (rota → como se chega → como se sai) | Nenhuma rota exige digitar URL para entrar ou sair, **inclusive voltar à landing** a partir do evento e do painel; a falta de um caminho é achado |
| X2 | `?de=` seguro | Deslogado em `/e/semana-tech/votar`, entrar como Ana; repetir com `?de=//exemplo.com` e `?de=https://exemplo.com` | Ana volta a `/votar`; os dois valores externos são ignorados e o destino vem de `resolverDestinoAcesso`; nunca sai do site |
| X3 | Sair em rota protegida | Ana em `/votar` → \"Sair\"; Carla em `/admin` → \"Sair\" pela toolbar | Vai ao login com `?de=`, sem a lista piscar (`4/V25`) e sem dado do painel na tela |
| X4 | Botão voltar | `/votar`: lista → detalhe → fechar; lista → revisão → sucesso → voltar. Configuração: trocar `?secao=`. Painel: trocar `?aba=` | Nunca reabre a confirmação nem duplica voto; o detalhe fecha; seção e aba voltam; sem entrada duplicada na pilha |
| X5 | Slug renomeado | `RASCUNHO_PRONTO`, mudar o slug na Geral (`6/C7`) | Cabeçalho do painel, \"Voltar ao evento\", CTA da landing e `?de=` usam o slug novo; o antigo mostra `EventoNaoEncontrado`; `dev.slugPadrao` acompanha; a sessão se mantém |
| X6 | Rota inexistente e erro | `/xyz`, `/e/semana-tech/xyz`, `/e/inexistente/admin`; erro de renderização temporário (não commitado) em uma rota | `not-found` global com tema e ação clara de retorno; gate com `EventoNaoEncontrado`; `error.tsx` com \"Tentar de novo\" que funciona e sem detalhe técnico na tela |
| X7 | Títulos e landmarks | Percorrer as rotas da 5.6 | `<title>` distinto por rota, um `h1`, `<main id="conteudo">`, \"Pular para o conteúdo\" leva ao `main` |

**Estado e fluxo (CP3)**

| # | Integração | Como provocar | Esperado |
|---|---|---|---|
| X8 | Sigilo com a urna aberta | `PADRAO`, parcial desligado: percorrer **todas** as rotas como Ana, Bruno e Carla, olhando o DOM; depois ligar \"Mostrar parcial por candidato\" e desligar | Nenhum voto por candidato em lugar nenhum (nem Operação, palco ao vivo ou relatório). Com a flag ligada aparece **só** na Operação (com o alerta de espelhamento) e no palco ao vivo; desligada, o número sai do DOM (`7/V7`, `7/V16`, `8/AP6`, `8/AP7`) |
| X9 | Mesmos números | Ana vota, \"Adicionar votos agora\" (50), encerrar; comparar Operação, Resultado, CSV, relatório e palco final; Configuração × Operação nos convites | Os mesmos totais nos cinco lugares; convites iguais na Configuração e no painel (`7/V14`, `7/V38`) |
| X10 | Voto reflete no painel | Ana vota; Carla abre a Operação (e, em outra volta, deixa o painel aberto enquanto o voto entra) | Popular +1 e \"votaram\" +1, sem recarregar; auditoria sem a escolha (`7/V8`) |
| X11 | Combinações que só a toolbar cria | Concluído + urna aberta; Rascunho + urna encerrada; Rascunho + urna aberta. Percorrer landing, evento, votar, painel, Configuração e palco como Carla e como Ana | Precedência `CONCLUIDO` > `RASCUNHO` > urna; aviso \"Combinação criada pela toolbar…\" onde previsto; nenhum erro no console; palco em `SEM_RESULTADO` quando não há versão |
| X12 | Tempo esgotado em todas as telas | `SEM_ENCERRAMENTO_AUTOMATICO` + \"Fim da janela\"; depois, na Geral, estender o fim em 1 h | Landing, evento, votar, painel, Configuração e palco mostram \"Tempo esgotado\" e o aviso; **Ana ainda vota**; a urna não encerra sozinha; depois de estender, todos os avisos somem (`2/E17`, `4/V17`, `5/W20`, `6/C11`, `7/V17`, `8/AP10`) |
| X13 | Três caminhos para encerrar | Encerrar pela toolbar, pela Operação da Configuração e deixando o relógio fechar (auto-encerramento ligado) | Cada caminho gera **uma** versão 1 (`ENCERRAMENTO`) e **uma** auditoria `URNA_ENCERRADA`; painel, Resultado e palco reagem sem recarregar (`7/V18`) |
| X14 | Urna encerra durante o voto | `URNA_ENCERRA` na confirmação de Ana | Tela `ENCERRADA` com o alerta; 0 voto novo; resultado v1 congelado; Resultado do painel habilitado (`5/W8`, `7/V18`) |
| X15 | Desqualificar depois de encerrar | `RESULTADO_PADRAO`: abrir a revelação real no palco; na Configuração desqualificar o 1º colocado | Versão 2 (`DESQUALIFICACAO`); Resultado mostra o item \"Fora da disputa\" e o histórico de versões; o palco volta a \"Votação encerrada\" e a sala avisa que o resultado mudou; CSV e relatório na v2; `/votar` segue `ENCERRADA` (`6/C20`, `7/V26`, `8/AP33`) |
| X16 | Convite de ponta a ponta | Carla gera 1 convite e copia; \"Sair\"; registrar usuário novo como jurado com o código; votar; alterar o voto; Carla volta à Operação | Convite `USADO` com o nome (nunca e-mail); +1 jurado e +1 jurado que votou; histórico com 2 entradas; auditoria `CONVITES_GERADOS`, `CONVITE_RESGATADO`, `VOTO_JURI_REGISTRADO` e `VOTO_JURI_ALTERADO`, sem código nem escolha; os números batem na Configuração e na Operação (`6/C25`, `5/W15`, `5/W16`) |
| X17 | Módulos em cadeia | Toolbar: desligar o júri na Semana Tech; religar. Desligar e religar o infantil no Festival | Júri desligado: \"Sou jurado\" some, `/convite` informativo, Bruno em `JURI_DESLIGADO`, Placar zera e trava o peso, painel sem jurados nem convites, palco sem categoria do júri, CSV sem `jurados`. Religar mantém o peso em 0 (D5 da Etapa 0). Infantil: o mesmo para totens e categoria infantil (`6/C28`, `7/V6`) |
| X18 | Tema editado na Configuração | Mudar primária, fonte e rótulos (salvar); abrir landing, evento, login, `/votar`, painel e relatório | Cores, fonte e rótulos mudam em todas as telas sem recarregar; contraste ≥ 4,5:1 nos textos; nenhum texto fixo com artigo errado para o novo rótulo (`6/C32`) |
| X19 | Duas identidades sem recarregar | Com cada tela aberta (landing, evento, votar, Configuração, painel, sala), trocar o evento na toolbar | Tema, rótulos e logo trocam na hora; Semana Tech sem logo mostra o nome em texto; Festival mostra o logo (`4/V24`) |
| X20 | Troca de sessão não herda estado | Ana escolhe um item e vira Bruno (\"Entrar como\"); Carla abre a revelação e vira Ana | Bruno vê a lista sem seleção (`5/W22`); Ana vê `AcessoRestrito` e nenhum dado do palco; Carla de volta não vê estado de outra pessoa |
| X21 | Bloqueio de código | 5 códigos errados em `/convite`; relógio +15 min | Campo bloqueado por 60 s e liberado depois; 5 `TENTATIVA_CODIGO_INVALIDA` e 1 `BLOQUEIO_RATE_LIMIT`; o resumo da auditoria do painel soma 1 bloqueio (`7/V15`) |
| X22 | Auditoria completa | Depois de F1 a F3 (5.12): listar `banco.auditoria` e a lista do painel | Toda `acao` tem rótulo no catálogo (nenhuma cai em `OUTRAS`); cada transição aparece **uma vez**; nenhum `detalhes` com escolha de voto popular ou infantil, código de convite ou e-mail |
| X23 | Exportar e imprimir | Depois do fluxo completo: baixar os seis CSV e imprimir o relatório | Números iguais ao painel; nenhum `@`; `EXPORTACAO_CSV` por arquivo e `RELATORIO_GERADO` uma vez (`7/V29` a `7/V35`) |
| X24 | Evento concluído | Fluxo F3 até \"Concluir\" | Landing sem CTA; evento e votar `CONCLUIDO`; Configuração em leitura sem navegar (D6); painel em leitura com exportações; palco em `FINAL_ESTATICO` sem \"Refazer\"; o admin ainda consegue entrar (D7 da Etapa 3) |
| X25 | F5 e nova aba | Depois de qualquer fluxo, F5 e uma aba nova | Volta ao seed: sessão deslogada, relógio em `T0`, voto de Ana desfeito; sem erro; o roteiro de demonstração avisa isso (D18) |

**Falhas e latência (CP7)**

| # | Integração | Como provocar | Esperado |
|---|---|---|---|
| X26 | Latência 1500 ms | Toolbar: latência 1500; percorrer todas as rotas e as ações (votar, salvar, gerar convites, encerrar, exportar) | Carregamento visível (`Carregando`, esqueleto ou `aria-busy`), botões desabilitados durante o envio, **nenhum duplo envio**, nada trava |
| X27 | Erro de rede persistente | Toolbar: erro de rede; percorrer as mesmas rotas | Leituras mantêm o último dado bom com aviso; formulários mantêm o rascunho; o voto verifica antes de reenviar (`5/W11`); o palco avisa só no HUD; **nenhum `error.tsx`**; ao desligar, tudo se recupera |
| X28 | Falha pontual | Cada `ModoFalha` no próximo envio, nos serviços que o consomem | Só os serviços marcados na tabela de `FRONTEIRA-DADOS.md` consomem a falha; serviços de leitura nunca a consomem (`7/V34`) |
| X29 | Fronteira de dados | Inserir um `import "@/mocks/..."` temporário em um componente e rodar o lint | O lint falha; remover o import |

### 5.5 Regressão obrigatória das Etapas 1 a 8 (subconjunto, D3)

Rodada no CP9, **depois** de todas as correções. O critério de escolha foi a sensibilidade à integração: o que atravessa sessão, relógio, resultado ou tema. As linhas que a matriz X já cobre aparecem aqui só quando valem rodar sozinhas.

| Etapa | Casos obrigatórios | Por quê |
|---|---|---|
| 1 | Todas as situações da seção 5.1 (a grade tema × situação, 16 células) | Mudança de tema ou de relógio quebra primeiro a landing |
| 2 | `2/E1`, `2/E4`, `2/E5`, `2/E8`, `2/E10`, `2/E13`, `2/E17`, `2/E18` | Estados do evento por papel; a base da matriz A |
| 3 | Matriz de erros (5.6) inteira e os fluxos de acesso e resgate | Todo guarda de rota depende deles |
| 4 | `4/V3`, `4/V4`, `4/V12`, `4/V17`, `4/V21`, `4/V24`, `4/V25` | Lista de votação sob troca de sessão, tema e urna |
| 5 | `5/W1`, `5/W4`, `5/W8`, `5/W9`, `5/W11`, `5/W15`, `5/W16`, `5/W22`, `5/W26`, `5/W27` | Voto, falhas, sigilo e reset |
| 6 | `6/C1`, `6/C4`, `6/C7`, `6/C11`, `6/C19`, `6/C20`, `6/C22`, `6/C25`, `6/C32`, `6/C35` | Tudo o que a Configuração muda e as outras telas leem |
| 7 | `7/V4`, `7/V7`, `7/V8`, `7/V16`, `7/V18`, `7/V26`, `7/V29`, `7/V31`, `7/V38`, `7/V39` | Números, sigilo, congelamento e exportação |
| 8 | `8/AP1`, `8/AP12`, `8/AP15`, `8/AP33`, `8/AP37`, `8/AP40`, `8/AP41`, `8/AP42`, `8/AP44` | Palco reagindo ao resto, ensaio sem efeito colateral e auditoria |

Se um achado do CP1 a CP8 foi corrigido **dentro** do código de uma etapa, a matriz **inteira** dela roda de novo (D3), além deste subconjunto.

### 5.6 Rotas auditadas

| Rota | Tela (etapa) | Medida em Lighthouse e axe |
|---|---|---|
| `/` | Landing (1) | Sim |
| `/e/[slug]` | Evento, entrada e criar conta (2 e 3) | Sim |
| `/e/[slug]/verificar-email` | Tela de código do login e do registro, código `123456` no protótipo (3; rev. 4, A5) | Sim |
| `/e/[slug]/convite` | Resgate de convite (3) | Sim |
| `/e/[slug]/votar` | Lista, detalhe e voto (4 e 5) | Sim |
| `/e/[slug]/admin` | Dashboard (7) | Sim |
| `/e/[slug]/admin/configuracao` | Configuração (6) | Sim |
| `/e/[slug]/admin/relatorio` | Relatório (7) | Sim |
| `/e/[slug]/admin/apresentar` | Sala de controle (8) | Sim (o palco, não) |
| `/dev/ui` | Galeria de componentes (0) | Não |
| `not-found` e `error` globais | Esta etapa | Sim (`not-found` por `/xyz`) |

**Em todas:** `<title>` próprio e distinto, um `h1`, `<main id="conteudo">` e "Pular para o conteúdo" levando ao `main` (regra da Etapa 0). O padrão esperado de título é `{tela} · {nome do evento}`; o CP2 registra o título real de cada rota e só é achado quando **duas rotas têm o mesmo título** ou quando falta título.

### 5.7 Responsividade

| Perfil | Largura | Onde importa |
|---|---|---|
| Celular pequeno | 360 px | Evento, login, convite, votação |
| Celular grande | 414 px | Votação e evento |
| Tablet | 768 px | Dashboard e Configuração (navegação de seções e abas) |
| Notebook | 1280 px | Configuração, Dashboard, Relatório |
| Telão | 1920×1080 e 3840×2160 (16:9) | Palco da Apresentação |

**Equipamentos do dia (rev. 4, E27):** **Semana Tech** — telão, celulares e computadores (o voto também acontece em computador, então a votação é conferida também em 1280 px); **Festival** — telão, celulares e totens (o totem entra com o planner Totem, A7).

Verificações em cada rota e largura, nos **dois eventos**: sem rolagem horizontal da **página** (tabelas largas rolam no próprio contêiner, regra da Etapa 0); sem texto cortado; alvos de toque de pelo menos 44 px; votação em 360 px sem zoom e com o botão de confirmar sempre alcançável; paisagem no celular sem esconder ação essencial; logos e nomes longos de evento sem quebrar o layout; palco sem rolagem e sem depender de hover (a Etapa 8 já exige 1080p, 4K e 800×450, `8/AP44`; aqui se confere na demonstração real).

### 5.8 Acessibilidade e consistência de uso

- **Meta (D7):** Lighthouse Accessibility ≥ 90 e axe com zero violações `critical` e `serious`, nas rotas medidas da 5.6, **nos dois eventos** e com a toolbar **oculta** (`?toolbar=0`). Anotar `moderate` e `minor`.
- **Só teclado:** votar como público e como jurado; configurar candidato; gerar convite; encerrar a urna com a confirmação forte; exportar CSV; operar a revelação pelo teclado do palco (`8/AP36`). Ordem de foco lógica, diálogos com foco preso e retorno do foco, `Esc` fecha.
- **Foco visível** nos dois temas; **rótulos** em todo campo; botões só com ícone com `aria-label`; imagem de candidato com `alt` do título.
- **Estado nunca só por cor ou animação:** selos (Publicado, Revogado, Aberta, Fora da disputa…) sempre com ícone e texto.
- **Movimento reduzido** (`prefers-reduced-motion`): UI e palco sem animação essencial; a revelação segue funcionando estática (`8/AP43`).
- **Leitor de tela** (NVDA ou VoiceOver, se houver): votar e configurar candidato. O que não puder ser testado vira linha em `ACHADOS.md` como `PODE_ESPERAR`.
- **Fora da medição (D7):** `/dev/ui`, a toolbar e o palco. O palco é conferido à mão (legibilidade, teclado, tela cheia).

### 5.9 Buscas de fronteira e consistência

Rodadas em `src/` no CP6 (e repetidas no CP9). Todas por `grep`, sem dependência nova (D11). Cada resultado fora do esperado é achado.

| Busca | Esperado fora de... |
|---|---|
| `#[0-9a-fA-F]{3,8}`, `rgb(`, `hsl(`, classes de cor soltas (`bg-[#`, `text-[#`) | Só em `src/mocks/seed/`, `globals.css` (tokens do tema e `--qr-*`) e `components/dev/` |
| `import ... "@/mocks` | Só em `store`, `servicos` e `mocks` (lint da Etapa 0 já barra; conferir o `eslint.config`) |
| Leitura direta de `banco.votos`, `votosJuri`, `historicoVotosJuri`, `votosInfantis`, `resultados` | Só `store/seletores/**` e `servicos/**` (D4 da Etapa 0) |
| `Date.now`, `performance.now`, `new Date(` sem argumento | Só `store/relogio.ts` (e o contador de tiques do ensaio, que não usa relógio real) |
| `localStorage`, `sessionStorage`, `indexedDB`, `fetch(`, `XMLHttpRequest` | Nenhum (protótipo sem persistência nem rede; a exceção é o iframe de trailer da Etapa 8) |
| `console.log`, `console.info`, `debugger` | Nenhum (`registrarLog` imprime com o prefixo `[mock:log]`) |
| `TODO`, `FIXME`, `Lorem`, `placeholder` em texto visível | Nenhum |
| Literais de rótulo fixo (`"filme"`, `"candidato"`, `"categoria"`) em componentes | Nenhum: vêm do tema ou de `textosEstado.ts` |
| Textos em inglês visíveis (`Loading`, `Error`, `Submit`, `Cancel`) | Nenhum |
| `dangerouslySetInnerHTML` | Nenhum |
| `repo.ts` | Não existe (D3 da Etapa 0 e D2 desta) |
| Exportações sem uso | Script descartável (D11); só remover o que for certeza |
| Datas, números e porcentagens sem `formatarDataHora`, `formatar.ts` ou locale `pt-BR` | Nenhum |

### 5.10 Inventário do conjunto (CP1 confere; CP7 documenta em `CATALOGO.md`)

| Item | Quantidade | De onde vem |
|---|---|---|
| Cenários registrados | **21** (conferido por `grep` na rev. 3, D12; lista na D10) | Etapa 0 `PADRAO` (1); Etapa 1 `SEM_ENCERRAMENTO_AUTOMATICO` (1); Etapa 2 `SEM_CANDIDATOS` (1); Etapa 3 `SOMENTE_GOOGLE` e `SOMENTE_EMAIL` (2); Etapa 4 `MUITOS_CANDIDATOS` e `VOTO_PROPRIO_PERMITIDO` (2); Etapa 6 `RASCUNHO_INCOMPLETO`, `RASCUNHO_PRONTO`, `URNA_ENCERRADA` e `EVENTO_CONCLUIDO` (4); Etapa 7 `FESTIVAL_ENCERRADO` e seis `RESULTADO_*` (7); Etapa 8 `FESTIVAL_EMPATE_RESOLVIDO`, `FESTIVAL_EMPATE_PERSISTENTE` e `FESTIVAL_CO_VENCEDORES` (3) |
| Ações de auditoria (`AcaoAuditoria`) | **21** | 7 (Etapas 0 e 3) + 2 (Etapa 5) + 6 (Etapa 6) + 2 (Etapa 7) + 4 (Etapa 8); lista única no Anexo C e na seção 5.1 da Etapa 0 |
| `CodigoErro` | **26** | 25 da Etapa 0 + `VOTO_PROPRIO` (Etapa 4) |
| `ModoFalha` | 6 valores (`NENHUMA` e 5 modos) | Etapa 0 define; Etapa 5 interpreta |
| Invariantes | **8** (I1 a I8) | I1 a I7 na Etapa 0 (a I7 passa a valer na Etapa 7); I8 na Etapa 7 |
| Autotestes | `verificarInvariantes`, `conferirApuracao`, `conferirRoteiro`, `conferirMotor`, `conferirFixturesFestival` | Etapas 0, 7 e 8 |
| Testes Vitest (`*.test.ts`) | Os de `src/dominio/**` e `src/lib/**` criados pelas Etapas 0 a 8 (D19 da Etapa 0, rev. 3), rodados por `pnpm test` | Etapas 0 a 8 |
| Campos de `ui` | `palcoAtivo`, `apresentacao` (Etapa 8), `votacao` (Etapa 5), campos de cooldown e verificação, `loginPendente` e `bloqueioLoginCodigo` (Etapa 3; rev. 4, A5) | Etapa 0 define o tipo; as demais estendem |
| Campos de `dev` | Todos os da seção 5.1 da Etapa 0, incluindo `vinculosVoto` (chave `usuarioId:eventoId`) e `simularTrailerFalha` | Etapas 0 e 8 |
| Dependências | `lucide-react` e `qrcode.react` (versões fixadas); `vitest` só como dependência de desenvolvimento | Etapas 0 e 8 |

Qualquer número que não bata é **achado de nome** (resolve-se ajustando o planner da etapa dona, 3.2) e o `CATALOGO.md` registra o número real.

### 5.11 Dados expostos ao cliente que o servidor real não pode expor

O protótipo guarda o `banco` inteiro no navegador. Isto é o que a trilha de produção (Prisma + Supabase, rev. 4, A2/A3) precisa tratar, e o CP7 confirma cada linha no código:

| Dado | Onde está hoje | O que a trilha de produção faz |
|---|---|---|
| `votos` e `votosInfantis` | `banco`, sem usuário (sigilo espelhado, D4 da Etapa 0) | Só o servidor lê; o cliente nunca recebe a lista |
| `votosJuri` e `historicoVotosJuri` | `banco`, ligados à participação | O admin do evento lê a escolha identificada (aba Resultado e `jurados.csv`, com auditoria da exportação); o jurado lê só o próprio; ninguém mais (rev. 3, C1) |
| `Participacao` (com `criadoEm`) | `banco`, criada por `garantirParticipacao`, login ou registro, **nunca** junto com o voto (rev. 3, C2) | Não deixar o instante da participação revelar o instante do voto: `criadoEm` removido (F-1, **já aplicado no schema** na rev. 4) |
| `dev.vinculosVoto` | `dev` | **Não existe em produção** (só serve ao "Resetar meu voto") |
| `ui.bloqueioCodigo` (tentativas e bloqueio do código de convite) e `ui.bloqueioLoginCodigo` (código de login, rev. 4, A5) | `ui`, no cliente | O bloqueio de tentativas é responsabilidade do **servidor** em produção; o cliente só exibe o que o servidor devolve (rev. 3, D8; parâmetros no planner de produção, A3) |
| `hashRecibo` do voto | `hashMock("recibo:{eventoId}:{sequencia}")` (Etapa 5), derivado da sequência | Em produção é **aleatório (32 bytes)**, nunca derivado de sequência, id ou instante (rev. 3, C20) |
| `ConviteJurado.hashCodigo` e o código legível | Hash no `banco`; código só no resultado de `gerarConvites` | Hash no servidor; código nunca volta depois da criação |
| `Usuario` (e-mail; sem senha nem `senhaHash`, rev. 4, A5/F-8) | `banco` | Cliente recebe só o próprio perfil e o nome de quem o admin pode ver; conta, sessão e código de login ficam nas tabelas do Better Auth |
| Código de login (`123456` no protótipo) | Constante no mock, mostrada na tela de código | Código de uso único enviado por e-mail (Resend), validado no servidor (Better Auth) |
| `resultados` (versões) | `banco`, lidos por `servicos/` | Servidor entrega só o oficial, só com a urna encerrada |
| `auditoria` | `banco` | Só admin do evento; nunca com escolha de voto popular ou infantil, código ou e-mail |
| Contagens por candidato durante a votação | Calculadas em `servicos/dashboard.ts` e filtradas pela flag de parcial | Cálculo e filtro no servidor |
| Estado público (evento, tema, candidatos, sessão) | Seletores lendo tabelas inteiras | Substituir pelos seletores sobre dados já filtrados (ponto (b) da D2) |

### 5.12 Fluxos de ponta a ponta (F1 a F3)

Executados no CP3, **na mesma aba**, na Semana Tech, com `verificarInvariantes` vazia ao fim de cada passo. Não há passo manual além da toolbar.

| Fluxo | Passos |
|---|---|
| **F1 Público** | Landing → evento → criar conta (nome + e-mail, sem senha) → tela de código (`123456`, rev. 4, A5) → `/votar` → escolher → revisar → confirmar → sucesso → tentar votar de novo (`JA_VOTOU`, sem dizer em quem) → "Resetar meu voto" na toolbar → votar de novo |
| **F2 Jurado** | Carla na Configuração gera 1 convite e copia o código → "Sair" → registrar usuário novo como jurado com o código → tela de código de login (`123456`) → `/votar` sem contagens → votar → alterar o voto → urna encerra e o voto do jurado fica bloqueado (`/votar` em `ENCERRADA`) |
| **F3 Admin** | `RASCUNHO_INCOMPLETO` → completar o checklist → ativar → abrir a urna → acompanhar na Operação → encerrar com confirmação → ver o Resultado → exportar e imprimir → apresentar (revelação) → concluir digitando o nome do evento |

### 5.13 Roteiro de demonstração (cerca de 10 minutos)

Roda em **build de produção** (`next start`), numa instância só (D8), com a toolbar (build 1, D9): é o roteiro completo, **só para ensaio**. Diante do público usa-se o build **sem** toolbar (build 2, rev. 3, E4) e o roteiro mínimo da D9. Cenário inicial `PADRAO`; para o Festival, `FESTIVAL_EMPATE_RESOLVIDO`.

| Ato | O que mostra | Tempo |
|---|---|---|
| 1 | Landing e evento no tema da Semana Tech | 1 min |
| 2 | Votar em 390 px (modo dispositivo, **mesma aba**, sem recarregar) e a tela de sucesso | 2 min |
| 3 | Jurado: convite gerado na Configuração, resgate, voto e alteração | 2 min |
| 4 | Configuração: mudar tema e pesos do placar; ver o efeito nas outras telas | 1 min |
| 5 | Dashboard: Operação com votos entrando, encerrar a urna, Resultado | 1 min |
| 6 | Trocar para o Festival na toolbar (outro tema, logo e rótulos) | 30 s |
| 7 | Apresentação: sala de controle, ensaio rápido e a revelação real com o desempate | 2 min 30 s |

O roteiro registra: login e registro **sem senha**, por código (`123456` no protótipo, informado na tela; rev. 4, A5) ou Google; não há recuperação de senha; F5 reinicia tudo (D18 da Etapa 0); como voltar ao início (`Resetar mock` na toolbar); os atalhos do palco (a lista que a sala de controle mostra, incluindo `F` para tela cheia e `Shift+E` para a emergência); e a **contingência** (se algo travar, resetar o mock e recomeçar do ato em que parou, aplicando o cenário certo). A toolbar fica recolhida ou oculta nos momentos de público.

---

## 6. Estrutura de arquivos

Esta etapa **não cria** componentes, serviços nem tipos. Só estes arquivos:

```
src/app/
  not-found.tsx                   # 404 global com tema: h1, <main id="conteudo">, Link "Voltar ao início"
  error.tsx                       # componente cliente: "Tentar de novo" (reset), sem detalhe técnico na tela
docs/
  ACHADOS.md                      # registro da seção 5.1 (começa vazio e vai sendo preenchido)
  CATALOGO.md                     # 21 cenários (por nome, D10), 21 ações, 26 códigos, 8 invariantes, autotestes, toolbar
  CHECKLIST-FASE1.md              # seção 9, preenchida
  DECISOES-PENDENTES.md           # seção 10 de todas as etapas, consolidada
  DIVERGENCIAS-SCHEMA.md          # mock × schema, invariantes × constraints; conversão para Supabase PostgreSQL = trilha de produção
  FRONTEIRA-DADOS.md              # dois pontos de troca (D2), tabela de falhas por serviço, seção 5.11
  MATRIZ-ROTAS.md                 # matrizes A e B com o resultado real e o mapa de entradas e saídas
  ROTEIRO-DEMO.md                 # seção 5.13 detalhada
README.md                         # reescrito para a Fase 1: o que é, como rodar (pnpm), como demonstrar
```

Arquivos de outras etapas **só mudam** por achado `BLOQUEIA_FASE2` registrado em `ACHADOS.md`, com o menor diff possível. Nunca se cria nome novo (Anexo A da Etapa 0).

---

## 7. Checkpoints

Regras de entrega, convenções de código e dependências aprovadas são as da seção 3.3 da Etapa 0 e **não se repetem**. Cada checkpoint termina com `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` sem erros (D19 da Etapa 0, rev. 3), com `ACHADOS.md` atualizado e só avança depois da validação. A ordem vai do mais estrutural ao mais fino: conferir o contrato, garantir que dá para ir de qualquer lugar a qualquer lugar, conferir estados e fluxos, depois layout, acessibilidade, consistência, fronteira de dados, build e demonstração, e só então fechar.

### CP1 — Conferência do conjunto (sem tela)

**Objetivo:** o código real bate com o contrato das Etapas 0 a 8.

**Tarefas**
- [ ] Criar `docs/ACHADOS.md` com o cabeçalho da seção 5.1.
- [ ] Conferir o inventário da seção 5.10 contra o código (contagens, nomes, donos). Divergência de **nome** se resolve no planner da etapa dona, nunca criando nome novo.
- [ ] Conferir que as **errata** `5/D16`, `6/P15`, `7/P15` e `8/P12` estão no código: chave `usuarioId:eventoId` em `dev.vinculosVoto`, `simularFalha({ consumirPontual: false })`, `OrigemEncerramento`, `AcaoAuditoria` com as 21 ações, assinatura final de `congelarResultado`, `data-print="ocultar"`, `Abas` controlada com aba desabilitada, `criarEstadoNucleo`, `EstadoUi.apresentacao`, `dev.simularTrailerFalha` e `--qr-*`. Faltou algum → achado `BLOQUEIA_FASE2`.
- [ ] Conferir `pnpm-lock.yaml` e a ausência de `package-lock.json`; conferir que as únicas dependências novas são `lucide-react` e `qrcode.react` com versão fixada, mais `vitest` (versão fixada) só em `devDependencies`, e que o script `test` é `vitest run`.
- [ ] Rodar `pnpm test`: todos os testes Vitest de `src/dominio/**` e `src/lib/**` das Etapas 0 a 8 passam (inclusive `apurar` com as fixtures da Etapa 7 e `montarRoteiro` com o empate triplo da Etapa 8).
- [ ] Aplicar cada um dos 21 cenários, reaplicar sem erro e rodar `verificarInvariantes`, `conferirApuracao`, `conferirRoteiro`, `conferirMotor` e `conferirFixturesFestival`: todas vazias.
- [ ] Conferir que o catálogo de exibição da auditoria (Etapa 7) tem rótulo para as 21 ações (nenhuma cai em `OUTRAS`).
- [ ] Conferir que cada módulo tem um único dono (seção 3.2 da Etapa 0).

**Fica fake:** nada novo.

**Pronto quando:** o inventário bate (ou o achado está registrado), os 21 cenários passam e todos os autotestes voltam vazios.

**Entrega:** `VaiVota-E9-CP1.zip`

### CP2 — Navegação, acesso e páginas globais

**Objetivo:** nenhum link quebrado, nenhum beco sem saída, nenhum papel vendo o que não deve.

**Tarefas**
- [ ] `not-found.tsx` e `error.tsx` conforme a D4 (herdam o `TemaEvento`, não leem sessão).
- [ ] Executar a **matriz A** (5.2) por inteiro, nos dois eventos e nos dois temas, e registrar o resultado real em `docs/MATRIZ-ROTAS.md`, com o mapa rota → como se chega → como se sai.
- [ ] Executar `X1` a `X7`.
- [ ] Conferir a 5.6: título distinto por rota, um `h1`, `<main id="conteudo">` e o `SkipLink`.

**Fica fake:** nada novo.

**Pronto quando:** a matriz A está preenchida sem desvios abertos, nenhuma tela exige digitar URL para sair, `X1` a `X7` passam e `/xyz` e `error` aparecem com tema.

**Entrega:** `VaiVota-E9-CP2.zip`

### CP3 — Estados, fluxos e integração

**Objetivo:** todas as telas se comportam de forma coerente com a fase do evento, e os números batem entre elas.

**Tarefas**
- [ ] Executar a **matriz B** (5.3) por inteiro, nos dois eventos e nos dois temas, e registrar em `MATRIZ-ROTAS.md`. Preencher a célula "Convite × `RASCUNHO`" com o comportamento real.
- [ ] Executar `X8` a `X25`.
- [ ] Rodar **F1, F2 e F3** (5.12) de ponta a ponta.
- [ ] Revisar mensagens e textos de estado: tom único, português, sem inglês perdido nem placeholder.

**Fica fake:** nada novo.

**Pronto quando:** a matriz B está sem desvios abertos, `X8` a `X25` passam, os três fluxos rodam sem passo manual além da toolbar e os mesmos números aparecem iguais em todas as telas que os mostram.

**Entrega:** `VaiVota-E9-CP3.zip`

### CP4 — Responsividade

**Objetivo:** as telas funcionam nas larguras-alvo, com prioridade para o celular.

**Tarefas**
- [ ] Percorrer cada rota da 5.6 nas larguras da 5.7, nos dois eventos, e registrar falhas.
- [ ] Conferir votação em 360 px, Configuração e Dashboard em 768 px, palco em 1080p e 4K em tela cheia (sem mouse).
- [ ] Alternar o tema em cada largura (logo e nome longos).

**Fica fake:** nada novo.

**Pronto quando:** não há rolagem horizontal involuntária entre 360 e 1920 px, as ações principais cabem e são tocáveis em 360 px e o palco é legível em 1080p e 4K.

**Entrega:** `VaiVota-E9-CP4.zip`

### CP5 — Acessibilidade

**Objetivo:** cumprir a meta da D7.

**Tarefas**
- [ ] Lighthouse e axe nas rotas medidas da 5.6, nos dois eventos, com a toolbar oculta; corrigir `critical` e `serious`; anotar `moderate` e `minor`.
- [ ] Percorrer só com teclado os fluxos da 5.8; conferir foco preso e retornado nos diálogos.
- [ ] Conferir movimento reduzido, estado nunca só por cor e `alt` das imagens.
- [ ] Leitor de tela nos fluxos votar e configurar candidato (se houver).

**Fica fake:** nada novo.

**Pronto quando:** Lighthouse ≥ 90 e axe sem `critical` nem `serious` nas rotas medidas, todos os fluxos principais se concluem só com teclado e nenhum estado depende só de cor.

**Entrega:** `VaiVota-E9-CP5.zip`

### CP6 — Consistência de tema, texto e componentes

**Objetivo:** o protótipo parece um produto único e o white-label se sustenta nas duas identidades.

**Tarefas**
- [ ] Rodar todas as buscas da 5.9 e corrigir (ou registrar) cada resultado.
- [ ] Alternar Semana Tech e Festival em todas as rotas: logo faltando, cor residual, rótulo fixo.
- [ ] Conferir componentes repetidos (botões, cartões, selos, diálogos de confirmação, toasts, estados vazios, esqueletos): todos vêm da Etapa 0.
- [ ] Conferir formatos pt-BR (data, vírgula decimal, fuso do evento) e `metadata` por rota.

**Fica fake:** nada novo.

**Pronto quando:** as buscas da 5.9 voltam como esperado, trocar o tema na toolbar muda **todas** as telas e não há componente duplicado.

**Entrega:** `VaiVota-E9-CP6.zip`

### CP7 — Fronteira de dados, falhas e documentação técnica

**Objetivo:** a trilha de produção consegue trocar a implementação sem descobrir surpresas.

**Tarefas**
- [ ] Executar `X26` a `X29` (latência, erro de rede, falha pontual, fronteira).
- [ ] Escrever `docs/FRONTEIRA-DADOS.md`: contrato de cada serviço (nome, parâmetros, retorno, `CodigoErro`, tela consumidora, se consome a falha pontual), os dois pontos de troca (D2), o que é função pura reaproveitável e a tabela da 5.11 confirmada no código, incluindo, em seção própria "Produção", que `hashRecibo` é aleatório de 32 bytes, nunca derivado de sequência (rev. 3, C20), e que o bloqueio de tentativas (`ui.bloqueioCodigo`) passa a ser do servidor (rev. 3, D8).
- [ ] Escrever `docs/DIVERGENCIAS-SCHEMA.md`: campos do mock sem schema e do schema sem mock (inclui `CodigoPareamento`, que entra com o planner Totem, A7, e `ConviteAdmin`, para depois, A9), invariantes × constraints (FKs compostas e CHECK dos pesos). **Só registra**, não altera. Registra obrigatoriamente que **já foram aplicados no schema na rev. 4** (logo o protótipo e o schema voltam a coincidir nesses pontos): `Participacao.criadoEm` removido, porque a participação nunca nasce com o voto (C2, F-1); pesos `Int` com CHECK de soma 100 (C12, F-4); `Evento.local` e `Evento.linkSobre` (E34, F-5; deixam de ser `// mock-only`); `Usuario.senhaHash` removido, método de login nas tabelas do Better Auth, que entram na trilha de produção (C22, A5, F-8); `ConfigPlacar.exibirVotosJuriNoTelao` removido (E21, F-10). Registra também que o banco está decidido (Supabase PostgreSQL, A4) e que a **conversão do schema (provider e tipos MySQL) para PostgreSQL é tarefa da trilha de produção** (F-11).
- [ ] Escrever `docs/CATALOGO.md` com o inventário da 5.10 já conferido no CP1.
- [ ] Conferir que os ids e a forma do seed são plausíveis como linhas de banco (sem objeto aninhado que o relacional não represente).

**Fica fake:** nada novo.

**Pronto quando:** `X26` a `X29` passam, nenhuma tela entra em `error.tsx` por latência ou falha simulada e os três documentos cobrem todos os serviços, cenários, ações e códigos.

**Entrega:** `VaiVota-E9-CP7.zip`

### CP8 — Build de produção e demonstração

**Objetivo:** a demonstração roda no build de produção.

**Tarefas**
- [ ] `pnpm build` e `pnpm start`; repetir o roteiro (5.13) nesse modo, **com** a toolbar (build 1, só ensaio) e o roteiro mínimo **sem** ela (build 2, o do público, D9 e E4).
- [ ] **Build sem toolbar (rev. 3, C21):** conferir que o build 2 não expõe `forcarEstadoUrna` (nem outro caminho para reabrir a urna ou forçar estado): nenhum controle na tela, nenhuma rota `/dev/ui` (404) e nenhuma chamada a `forcarEstadoUrna` alcançável fora de `components/dev/`.
- [ ] Escrever `docs/ROTEIRO-DEMO.md` e o `README.md` final (como rodar com `pnpm`, o que o protótipo é e não é, F5 reinicia tudo).
- [ ] Ensaiar o roteiro em Chrome desktop, Safari iOS, Chrome Android e, se possível, no telão real ou em monitor 16:9; no celular, seguindo a D8. Conferir também os equipamentos do dia (rev. 4, E27): Semana Tech — telão, celulares e **computadores** (votar num computador, em Chrome, Edge e Firefox desktop); Festival — telão, celulares e totens (o totem é conferido no planner Totem, A7).
- [ ] Conferir que alternar o modo dispositivo do navegador não recarrega a página (ato 2).

**Fica fake:** nada novo.

**Pronto quando:** o roteiro roda de ponta a ponta em `next start`, com e sem toolbar, em desktop e celular; o build sem toolbar não permite reabrir a urna nem forçar estado (C21).

**Entrega:** `VaiVota-E9-CP8.zip`

### CP9 — Revisão e fechamento

**Objetivo:** aprovar a linha de base e entregar à trilha de produção de onde partir.

**Tarefas**
- [ ] Rodar a **regressão obrigatória** da 5.5 (e a matriz inteira das etapas em que houve correção, D3) e repetir as buscas da 5.9.
- [ ] Fechar `ACHADOS.md`: nenhum `BLOQUEIA_FASE2` aberto; os `PODE_ESPERAR` viram backlog; os `DECISAO` vão para `DECISOES-PENDENTES.md`.
- [ ] Consolidar em `docs/DECISOES-PENDENTES.md` a seção 10 de todas as etapas (pendências **[Usuário]**, as resolvidas na rev. 3 e na rev. 4 e as marcadas "fase com banco", hoje "trilha de produção"), o bloco "Fora da Fase 1" (A1, A3–A9, com as decisões da rev. 4) e as **mudanças em fontes fora dos planners, F-1 a F-12, todas aprovadas e aplicadas na rev. 4** (registro, não mais "aguardando aprovação"): F-1 schema `Participacao.criadoEm`; F-2 Base `Jurado.md` §12 e `VotoInfantil.md` §12 (trava total); F-3 DD §7.6 e §8.1 (desqualificado, imagem obrigatória, redistribuição de peso); F-4 schema pesos `Int` com CHECK; F-5 schema `Evento.local`/`linkSobre`; F-6 Base `Dashboard.md`; F-7 DD §13 (4 fases: Demonstração, Semana Tech, Festival, Final); F-8 `Login.md` (sem senha, Better Auth) e schema sem `senhaHash`; F-9 DD §3.3 (CPF e SMS/OTP descartados; voto por critério vira requisito do Festival); F-10 remoção de `exibirVotosJuriNoTelao`; F-11 DD §5.3 (stack decidida) e comentário no schema; F-12 DD §3.2/§3.3/§10.4 (voto infantil na demonstração, admins por seed, controladora VaiVota). Pendências que continuam: E22, E30, texto do aviso de privacidade (E29), número de votantes e pico (A6), detalhes do voto por critério (A8) e data exata da Semana Tech (E3).
- [ ] Preencher `docs/CHECKLIST-FASE1.md` (seção 9) com ✔ ou ✘ e responsável.
- [ ] Atualizar o Contexto (seções 2, 4 e 10) com o que esta etapa registrou e marcar a Fase 1 como concluída.
- [ ] Marcar a tag `fase1-prototipo` e gerar o zip final.

**Pronto quando:** `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` limpos, regressão sem falha, `DECISOES-PENDENTES.md` com F-1 a F-12 registradas como aplicadas (rev. 4) e as pendências restantes listadas, checklist sem item `BLOQUEIA_FASE2` e a tag criada. O dono do produto aprova o protótipo para iniciar a trilha de produção.

**Entrega:** `VaiVota-E9-CP9.zip` (final da Etapa 9 e da Fase 1)

---

## 8. O que fica fake

Nada novo. O fake desta etapa é só ficar **explícito e rastreável**:

| Item | Tratamento |
|---|---|
| Dados e votos | `src/mocks/seed/` e `banco` em memória; sem persistência (F5 volta ao seed) |
| Serviços | Assíncronos, com latência e falhas simuladas, em `servicos/`; contrato em `FRONTEIRA-DADOS.md` |
| E-mail, código de login, Google | Telas simuladas, sem envio nem rede; código fixo `123456` (rev. 4, A5; não existe senha nem recuperação de senha) |
| Relógio | Simulado (`T0`), controlado pela toolbar |
| Upload de logo e imagens | `blob:` local e `placeholder:<n>` |
| Toolbar | Existe só no build de ensaio (build 1); o build do público não a tem (D9, E4), por variável embutida **no build** |
| "Celular" | Modo dispositivo do navegador na mesma instância (D8) |

## 9. Critérios de aceitação

**Contrato e rotas**
- [ ] Inventário da 5.10 conferido; errata das Etapas 5 a 8 presentes no código; 21 cenários passam e os cinco autotestes voltam vazios.
- [ ] Matriz A (5.2) e matriz B (5.3) preenchidas, sem desvio aberto, nos dois eventos e nos dois temas.
- [ ] `not-found` e `error` globais com tema; nenhuma rota exige digitar URL.

**Comportamento**
- [ ] Matriz X (X1 a X29) passa; F1 a F3 rodam sem passo manual além da toolbar.
- [ ] Nenhuma tela mostra voto por candidato com a urna aberta e a flag desligada; os mesmos números aparecem em todas as telas.
- [ ] Latência 1500 ms e erro de rede não levam a `error.tsx`, travamento nem duplo envio.

**Tema, responsividade e acessibilidade**
- [ ] As buscas da 5.9 voltam como esperado e a troca de evento muda todas as telas.
- [ ] Utilizável de 360 px a 1920 px; palco legível em 1080p e 4K.
- [ ] Lighthouse ≥ 90 e axe sem `critical` nem `serious` nas rotas medidas; fluxos principais só com teclado; movimento reduzido respeitado.

**Qualidade e fechamento**
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` limpos; console sem erro nem aviso de hidratação.
- [ ] `FRONTEIRA-DADOS.md`, `DIVERGENCIAS-SCHEMA.md`, `CATALOGO.md`, `MATRIZ-ROTAS.md`, `ROTEIRO-DEMO.md`, `CHECKLIST-FASE1.md`, `ACHADOS.md` e `DECISOES-PENDENTES.md` existem e estão completos.
- [ ] Roteiro de demonstração roda em `next start`, com e sem toolbar; o build do público (sem toolbar) não expõe `forcarEstadoUrna` (C21).
- [ ] Nenhum `BLOQUEIA_FASE2` aberto; tag `fase1-prototipo` criada; Contexto atualizado.

## 10. Pendências

- **Toolbar na demonstração (D9):** **Resolvida (rev. 3, E4):** build para o público **sem** toolbar (build 2); build com toolbar só para ensaio e roteiro completo.
- **Concluir o evento não redireciona (D6):** **Resolvida (rev. 3, E26): confirmado.**
- **"Powered by VaiVota" no telão (A16):** **Resolvida (rev. 3, E25): confirmado** — discreto e só no final estático (já previsto na Etapa 8, D21).
- **Navegadores e dispositivos-alvo:** **Resolvida (rev. 4, E27):** equipamentos do dia — **Semana Tech:** telão, celulares e computadores (o voto também acontece em computador); **Festival:** telão, celulares e totens. Navegadores de teste: Chrome desktop, Safari iOS e Chrome Android, mais Edge e Firefox desktop (computadores da Semana Tech); o telão real é alvo (conferir no ensaio). O totem é conferido no planner Totem (A7).
- **Meta de acessibilidade (D7):** **Resolvida (rev. 3, E28; reconfirmada na rev. 4): confirmado** — Lighthouse ≥ 90 e axe sem `critical` e `serious`.
- **Totem, `CodigoPareamento` e `ConviteAdmin`:** **Resolvida (rev. 4, A7 e A9):** o totem (pareamento, quiosque com PIN, voto infantil, gestão de dispositivos) entra com o planner Totem (a escrever), também na demonstração; até lá, `Dispositivo` e `VotoInfantil` são dados seed. Admins adicionais por seed; a tela de convite de admin fica para depois.
- **Aviso de privacidade (rev. 4, E29):** a controladora dos dados é a **VaiVota**; o aviso é da plataforma (texto único, link no registro e no rodapé); `Evento.avisoPrivacidadeUrl` é opcional e complementar. Texto pendente (rascunho a partir do DD §10.4). **[Usuário]**
- **Pendências herdadas das Etapas 0 a 8** (as **[Usuário]** que continuam após a rev. 4: direção visual do palco (E22), catálogo único de textos (E30), texto do aviso de privacidade (E29), número de votantes e pico (A6), detalhes do voto por critério do júri (A8) e dia e horário exatos da Semana Tech (E3)): o CP9 as reúne em `DECISOES-PENDENTES.md`, junto com as resolvidas na rev. 3 e na rev. 4 (E1, E2, E21, E27, E28 e outras) e as antigas "fase com banco" (hoje trilha de produção).
- **`DocumentDesign.md` e `ConfiguracaoEvento.md`:** **Resolvida (rev. 3, B1 e B2):** o `DocumentDesign.md` v1.1 existe na raiz e as premissas "(a confirmar no DD)" foram fechadas nas etapas donas (ou viraram **[Usuário]**, no caso de textos); `ConfiguracaoEvento.md` não existe e toda referência passa a ser DD §7.6.
- **Mudanças em fontes fora dos planners:** **Resolvida (rev. 4, F-1 a F-12):** aprovadas e **aplicadas** no schema, no `DocumentDesign.md` e em `planners/Base/*`. O CP9 as registra em `DECISOES-PENDENTES.md` como aplicadas, e `DIVERGENCIAS-SCHEMA.md` registra as de schema (F-1, F-4, F-5, F-8, F-10) como já coincidentes com o protótipo.
- **Fase 2 (BD fake):** **Resolvida (rev. 4, A2/A3): não existe BD fake.** Depois do protótipo vem a **trilha de produção** (Prisma + Supabase; planner "Trilha de Produção", a escrever). **Banco:** **Resolvida (rev. 4, A4):** Supabase (PostgreSQL); a conversão do schema MySQL é tarefa da trilha de produção (registrado em `DIVERGENCIAS-SCHEMA.md`).

**Fora da Fase 1 — exige planner próprio ou decisão do dono do produto** (registro da rev. 3, com as decisões da rev. 4; nenhuma etapa da Fase 1 implementa)
- **A1:** **Decidido (rev. 4):** a Semana Tech (semana de 18/10/2026) é **uso real** (sistema funcional, dados reais). Antes dela há uma **demonstração** para o Festival (09/10/2026), com telas e dados mock no tema do Festival. A reestruturação futura em 4 fases (Demonstração, Semana Tech, Festival, Final) substituirá a numeração Fase 1/2/3.
- **A3:** **Decidido (rev. 4):** sem BD fake. Planner "Trilha de Produção" (a escrever): banco, migrações, seed real; autenticação; troca dos serviços de voto; troca dos serviços de configuração/dashboard/resultado; rate limiting, logs e deploy.
- **A4:** **Decidido (rev. 4):** Supabase (PostgreSQL).
- **A5:** **Decidido (rev. 4):** Better Auth (Google + código por e-mail, **sem senha**), Vercel, Resend, rate limiting no PostgreSQL ou Upstash Redis, Sentry + logs da Vercel; Prisma como ORM.
- **A6:** **Decidido (rev. 4):** planner "Endurecimento" (a escrever): carga com k6, alertas Sentry, backup e teste de restauração, roteiro do dia, ensaio do telão. Pendente: número esperado de votantes e pico. **[Usuário]**
- **A7:** **Decidido (rev. 4):** totem e voto infantil (pareamento, quiosque com PIN, voto infantil, gestão de dispositivos) fazem parte do protótipo (aparecem na demonstração) e do produto; planner próprio "Totem" (a escrever, mock e depois real).
- **A8:** **Decidido (rev. 4):** júri com **voto simples na Semana Tech** e **voto por critério no Festival** (Direção, Roteiro, Fotografia e Som — PDF §3.3; modelo previsto `Criterio` e `NotaJuri`). Pendente: escala da nota, peso por critério, como a nota vira placar do júri e desempate por critério. **[Usuário]**
- **A9:** **Decidido (rev. 4):** CPF nunca; SMS/OTP descartado (código por e-mail no lugar); admins adicionais por seed (tela de convite de admin fica para depois).
