# VaiVota — Contexto da mesclagem dos planners da Fase 1

> **Para que serve:** substitui o histórico da conversa, os arquivos de negócio (`Login.md`, `Jurado.md`, `VotoInfantil.md`, `ModoApresentacao.md`, `Dashboard.md`), o `schema.prisma` e o `package.json` na continuação do trabalho em outra sessão ou conta.
> **Gerado em:** 02/10/2026. **Atualizado em:** 07/10/2026 (rev. 4).
> **Estado:** os dez planners finais existem (Etapas 0 a 9). A rev. 2 completou a Etapa 9, trocou o gerenciador de pacotes para `pnpm` e incorporou na Etapa 0 as errata pedidas pelas Etapas 5 a 8 (Anexo C da Etapa 0). A **rev. 3** aplicou nos planners as decisões do **documento de pendências** (seção 11). **As seções 5 e 6 são histórico da mesclagem:** todos os itens delas já foram resolvidos nos planners finais.
> **IDs:** os planners citam dois conjuntos de IDs. `A1` a `A19` (seção 7 deste arquivo) são as decisões em aberto da mesclagem. Os IDs da rev. 3 (`A1` a `A9`, `B1` a `B4`, `C1` a `C22`, `D1` a `D19`, `E1` a `E34`) são do documento de pendências e aparecem sempre como "rev. 3, <ID>" (seção 11).
> **Idioma:** tudo em português do Brasil, como os planners.

---

## 0. Como usar este arquivo na próxima sessão

**Situação:** o planejamento da Fase 1 está concluído (`Etapa0 Final.md` a `Etapa9 Final.md`). O próximo trabalho é **implementar**, etapa por etapa e checkpoint por checkpoint.

**O usuário envia:**
1. Este arquivo.
2. O planner da etapa em andamento (`EtapaN Final.md`) e, sempre, `Etapa0 Final.md`, que é **o contrato do conjunto** (a seção 4 deste arquivo é só um resumo dele).
3. O código atual do repositório (ou o último zip `VaiVota-E{n}-CP{m}.zip`).

**O que Claude deve fazer ao receber:**
1. Ler a seção 2 (estado) e a seção 10 (registro) deste arquivo.
2. Ler `Etapa0 Final.md` e o planner da etapa; começar pelo **CP1 da etapa** (nas Etapas 5 a 9, o CP1 confere o contrato contra o código).
3. Implementar **um checkpoint por vez**, validar com `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` (D19 rev. 3: Vitest só para `dominio/` e `lib/`), entregar o **zip cumulativo** e esperar a validação antes de avançar.
4. Ao terminar cada etapa, registrar na seção 10 o que ela acrescentou ao contrato (campos de `ui` e `dev`, cenários, `CodigoErro`, ações de auditoria) e qualquer divergência de nome achada no código. **Divergência de nome se resolve ajustando o planner, não criando nome novo.**

**Cuidados:**
- O `DocumentDesign.md` (v1.1) **está na raiz do repositório** e é fonte dos planners desde a rev. 3 (B1): as marcas "(a confirmar no DD)" foram fechadas contra ele ou viraram decisão. `ConfiguracaoEvento.md` **não existe**: a configuração do evento está no DD §7.6 (B2). `src/app/page.tsx`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs` e `postcss.config.mjs` existem no repositório (B3).
- As mudanças em fontes fora dos planners (schema, DD, `planners/Base`) pedidas nas rev. 3 e 4 (F-1 a F-12) **foram aprovadas e aplicadas na rev. 4** (seção 12.3). O `DocumentDesign.md` está na versão 1.2.
- Itens da seção 7 marcados **[Usuário]** dependem de decisão do dono do produto; cada planner os repete na sua seção 10 e a Etapa 9 os consolida em `docs/DECISOES-PENDENTES.md`.
- **Gerenciador de pacotes: `pnpm`** (D20, rev. 2). O planejamento anterior dizia `npm` por engano.

---

## 1. A demanda e o histórico resumido

### 1.1 O projeto

**VaiVota** é uma plataforma white-label para mediar votações em eventos (primeiros clientes: **Semana Tech** e **9º Festival Ver e Fazer Filmes**, Cataguases/MG). O princípio do produto é **configurável, não customizável**: layout fixo, identidade por evento (tema, rótulos, textos).

Fases do projeto:
- **Fase 1:** interface padrão (protótipo navegável, sem banco, tudo em memória, F5 volta ao seed).
- **Fase 2:** ~~BD fake~~ — **eliminada na rev. 4 (A3)**: o protótipo passa direto para a trilha de produção.
- **Fase 3 → trilha de produção:** Prisma + **Supabase (PostgreSQL)**, decidido na rev. 4 (A4). A numeração Fase 1/2/3 será substituída pela reestruturação em 4 fases (seção 12).

### 1.2 Etapas da Fase 1 (escopo definido pelo usuário)

| Etapa | Escopo | Rotas |
|---|---|---|
| 0 Fundação | Setup, tokens de tema (CSS variables), componentes base, dados seed, store e dev toolbar | — (rotas stub de tudo) |
| 1 Landing | Converter a landing atual (cores fixas do Festival) para usar o tema | `/` |
| 2 Evento | Entrada do evento com tema e todos os estados da urna | `/e/[slug]` |
| 3 Login e Registro | Login, registro com switch Jurado e código, resgate de convite | dentro de `/e/[slug]` e `/e/[slug]/convite` |
| 4 Candidato | Lista e detalhe do candidato | `/e/[slug]/votar` (parte 1) |
| 5 Votos | Seleção, revisão, confirmação, sucesso, "já votou" e erros | `/e/[slug]/votar` (parte 2) |
| 6 Configuração | Seções do MVP: Geral, Candidatos (CRUD), Júri (convites), Placar, Tema e Operação | `/e/[slug]/admin/configuracao` |
| 7 Dashboard | Abas Operação e Resultado, gráficos fake e botões de exportação | `/e/[slug]/admin` |
| 8 Apresentação | Fases do telão, revelação, empates, QR Code, temporizador e modo ensaio | `/e/[slug]/admin/apresentar` |
| 9 Fechamento | Responsividade, acessibilidade básica, navegação entre telas e checklist final | — |

### 1.3 O que aconteceu na conversa

1. O usuário pediu para verificar se os 10 planners (zip `PlannersFase1Antigos.zip`) descreviam corretamente cada etapa.
2. **Diagnóstico:** cada planner cobre a sua etapa, mas **não são consistentes entre si**. Foram escritos contra um contrato provisório da Etapa 0 que depois mudou, e ninguém os reconciliou.
3. **Mesclagem em andamento:** a Etapa 0 foi reescrita como **contrato do conjunto** (`Etapa0 Final.md`, com Anexo A = modelo de planner e Anexo B = lista do que cada etapa seguinte precisa absorver). As Etapas 1, 2 e 3 já foram reescritas contra ela. **Faltam 4 a 9.**
4. **Pedido atual:** documentar as inconsistências entre os planners pendentes (com base nos arquivos de negócio, no schema e no `package.json`) e resumir cada arquivo, **sem atualizar os planners ainda**, para continuar em outra conta sem reenviar tudo.

### 1.4 Ambiente (do `package.json`)

- Nome atual `verefazerfilmes-project` (a Etapa 0 manda renomear para `vaivota`).
- Next **16.3.5** (App Router; em Next 16, `params` é `Promise`), React **19.2.8**, TypeScript 5, Tailwind 4 (`@tailwindcss/postcss`), ESLint 9 + `eslint-config-next` 16.3.5.
- **`babel-plugin-react-compiler` 1.0.0 está presente** (React Compiler ativo): sem `setState` síncrono em efeito e sem ler `ref.current` durante a renderização.
- Scripts: `dev`, `build`, `start`, `lint` (`eslint`). **Não há `typecheck`** (a Etapa 0 acrescenta `tsc --noEmit`). Testes: Vitest como dependência de desenvolvimento, só para `dominio/` e `lib/` (D19 da Etapa 0, rev. 3); a Etapa 0 cria o script `test`.
- Não há `lucide-react` nem `qrcode.react` (aprovadas: a primeira na Etapa 0, a segunda na Etapa 8). O `package.json` não define o campo `packageManager`; o projeto usa **`pnpm`** (D20, rev. 2), e o CP1 da Etapa 0 confere o lockfile.

---

## 2. Estado da mesclagem

### 2.1 Tabela

| Etapa | Antigo (`PlannersFase1Antigos.zip`) | Final | Status |
|---|---|---|---|
| 0 Fundação | `Etapa0 Fundacao.md` | `Etapa0 Final.md` (rev. 2, 69 KB) | **Pronta** (9 CPs). Contrato + Anexos A, B e C (errata incorporadas) |
| 1 Landing | `Etapa1 LandingPage.md` | `Etapa1 Final.md` | **Pronta** (7 CPs) |
| 2 Evento | `Etapa2 Evento.md` | `Etapa2 Final.md` | **Pronta** (6 CPs) |
| 3 Login e Registro | `Etapa3 LoginRegistro.md` | `Etapa3 Final.md` | **Pronta** (7 CPs) |
| 4 Candidato | `Etapa4 Candidato.md` | `Etapa4 Final.md` | **Pronta** (6 CPs) |
| 5 Votos | `Etapa5 Votos.md` | `Etapa5 Final.md` | **Pronta** (6 CPs) |
| 6 Configuração | `Etapa6 Configuracao.md` | `Etapa6 Final.md` | **Pronta** (9 CPs) |
| 7 Dashboard | `Etapa7 Dashboard.md` | `Etapa7 Final.md` | **Pronta** (9 CPs) |
| 8 Apresentação | `Etapa8 Apresentacao.md` | `Etapa8 Final.md` | **Pronta** (10 CPs) |
| 9 Fechamento | `Etapa9 Fechamento.md` | `Etapa9 Final.md` (rev. 2, completa) | **Pronta** (9 CPs). A rev. 1 terminava na Matriz X |

**Implementação:** nenhuma etapa implementada até esta data (nenhum zip `VaiVota-E{n}-CP{m}` registrado). Ordem de implementação: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9.

### 2.2 Ordem recomendada de mesclagem (histórico: concluída)

**4 e 5 juntas (ou 4 seguida de 5), depois 6, 7, 8 e 9.** Motivos:
- 4 e 5 dividem a gate de `/votar` e a seleção. Decidir a fronteira entre elas de uma vez evita retrabalho.
- 7 antes de 8: a Etapa 7 é dona da apuração (`apurar`, `congelarResultado`) e do seed de volume; a 8 só consome.
- 6 antes de 7: a 7 reutiliza `travas.ts` e `lib/csv.ts` da 6.
- 9 por último: consolida cenários, auditoria de rotas e documentação.

### 2.3 Dependências "para frente" (uma etapa precisa de algo implementado depois) (histórico: cada uma já tem ponto de extensão e etapa dona nos Finals)

Em cada caso, a etapa anterior deve declarar o ponto de extensão e **adiar a validação** para a etapa dona.

| Etapa | Precisa de | Dono | Tratamento sugerido |
|---|---|---|---|
| 4 (CP5) | "Seu voto atual" do jurado exige `consultarEstadoVoto` | 5 | Mover o item para a 5, ou a 4 declarar o slot e a 5 preencher |
| 6 (desqualificar após encerrar) | Nova versão `DESQUALIFICACAO` do resultado | 7 (`apurar`) | A 6 chama o ponto de extensão `congelarResultado`; o efeito só é validável na 7 |
| 6 (Operação: "mostra quantos votos há" ao encerrar) | Totais do evento | 7 (serviços de dashboard) | Remover o número do diálogo, ou a 7 expor um serviço mínimo desde o CP1 |
| 6 (convites: "mesmos números do Dashboard") | Aba Operação | 7 | Aceite cruzado só na 7 |
| 6 (`PreviaTema` com aba "Telão") | Cena do palco | 8 | Prévia simplificada na 6 |
| 8 (cenários `RESULTADO_*` e ensaio) | Gerador do seed de volume e `apurar` | 7 | A 8 depende do módulo de fixtures definido na 7 |

---

## 3. Resumo dos arquivos de negócio

### 3.1 `Login.md` — Funcionalidade 1: Login, Registro e Votação Popular

- **Objetivo:** a pessoa entra no evento (URL/QR Code), cria conta ou entra, vê os candidatos e registra **um único voto popular**, de forma segura, sigilosa e com tema do evento.
- **Decisões:**
  - Usuário **global** + **Participação por evento** com papel (`publico` | `jurado`).
  - Login com Google e e-mail verificado.
  - Voto único por restrição `(usuário, evento)` gravada **na mesma transação** do voto.
  - Sigilo: `Participacao` (quem votou) e `Voto` (em quem) sem vínculo; **horário só em `Voto`**.
  - Voto confirmado é imutável.
  - Ordem dos cards **embaralhada por usuário, estável na sessão**.
  - "Concluir Evento" encerra a votação; o papel de jurado fica como histórico.
- **Fluxo (8 passos):** entrada `/e/{slug}` → login/registro (switch Público/Jurado; só Público nesta funcionalidade) → cria/recupera participação → checagem de estado (não iniciada: informativa com contagem; encerrada: sem botão; já votou; aberta e não votou: segue) → lista → seleção e revisão ("Você está votando em X", pode trocar) → confirmação (grava `Voto` e `votou` na mesma transação) → sucesso (resultado só quando a organização liberar).
- **Regras:** urna só aceita voto aberta; um voto válido por usuário/evento; imutável; rejeitados não contam; candidatos não publicados não aparecem; encerrar bloqueia na hora, inclusive quem está na confirmação; só e-mail verificado vota.
- **Concorrência:** idempotente (duplo clique); queda de rede consulta o estado real antes de nova tentativa; urna fecha durante a confirmação: transação rejeita com mensagem clara; link direto com urna fechada: o servidor valida; sem candidatos publicados: tela informativa; erros genéricos ao usuário, detalhe no log técnico.
- **Segurança:** validação no servidor; rate limiting em login, registro e voto; login sem senha (Google ou código por e-mail, rev. 4); auditoria **sem ligar usuário à escolha**.
- **Pendências:** candidato-participante votar em si mesmo; política de verificação por evento; biblioteca de autenticação e banco; textos finais das telas de estado.

### 3.2 `Jurado.md` — Funcionalidade 2: Votação do Júri

- **Objetivo:** jurados convidados votam em **um** candidato por fluxo quase igual ao popular, com **apuração separada** combinada ao popular por fórmula configurável. O voto é **identificado para o admin** e **alterável até o fim da urna**.
- **Convites:**
  - Código individual de uso único, gerado em lote (n códigos), rótulo opcional.
  - Cópia/CSV; **só o hash** é guardado (legível aparece uma vez).
  - Formato curto sem caracteres ambíguos; validade configurável; revogação com substituto; rate limiting; auditoria (geração, resgate, revogação, tentativas inválidas).
- **Modelo:** `ConviteJurado`, `VotoJuri` (com vínculo à participação; único `(participação, evento)`), `HistoricoVotoJuri` (candidato anterior, novo, horário), `ConfigPlacar` (pesos, desempate, exibir votos do júri no telão).
- **Fluxo:** registro com switch Jurado + código, ou "Tenho um código de convite" logado → validação (existe, é deste evento, disponível, dentro da validade; **bloqueia quem já votou como público**) → participação `jurado` criada ou promovida → mesma lista embaralhada, **sem contagens** → confirmação grava/substitui o voto e registra histórico → sucesso informa o voto atual e que pode alterar até o encerramento.
- **Fórmula:** `pontuação(c) = peso_popular × (votos_pop_c ÷ total_pop) + peso_juri × (votos_juri_c ÷ total_juri)`. Cada lado é normalizado antes do peso. Pesos por evento, somam 100%.
- **Desempate:** critério configurado (maior votação do júri **ou** do público); se persistir, sinaliza empate ao admin sem decidir sozinho.
- **Regras:** só com urna aberta; um voto por participação; jurado não vota na apuração popular (papel único por evento); após Concluir Evento nada muda; revogado/expirado não resgata; resgate concluído não é desfeito.
- **Segurança:** jurado só acessa a tela de voto; validação no servidor; votos identificados só para o admin; "transparente no telão" (desligado por padrão) só na revelação.
- **Pendências:** pesos padrão (ex.: 70/30) e **se podem mudar depois que a urna abrir**; validade padrão dos códigos; impedimentos por conflito (futuro); notas por critério (futuro); jurado ver o próprio voto após o fim.

### 3.3 `VotoInfantil.md` — Funcionalidade 3: Votação Infantil

- **Escopo da Fase 1:** o módulo é do **Festival, depois da Semana Tech**. **Totem e `/totem` ficam fora da Fase 1**; `Dispositivo` e `VotoInfantil` existem só como dados de leitura para o dashboard.
- **Objetivo:** crianças votam em **totens/tablets dedicados**, sem login e sem dado pessoal. Gera o placar **"Escolha das Crianças"** e entra na fórmula com **peso infantil configurável**.
- **Decisões:** pesos de público, júri e infantil por evento (somam 100%); **sem controle técnico contra duplicidade** (mediador adulto + pesos); totem é **dispositivo pareado**, não usuário; guarda candidato, horário e **dispositivo**; modo quiosque com confirmação em duas etapas e retorno automático; módulo opcional por evento.
- **Pareamento:** admin gera código curto de uso único com validade → tablet digita → recebe token de longa duração (só o hash no banco). Admin lista, pausa, revoga e renomeia; PIN de saída do quiosque.
- **Regras:** só vota com urna aberta e dispositivo `ativo`; um toque confirmado = um voto, sem edição; voto de dispositivo pausado/revogado é **rejeitado e não conta**; Concluir Evento bloqueia todos os totens; nenhum dado da criança.
- **Evento sem infantil:** módulo desligado, peso 0, nenhum totem.
- **Pendências:** peso infantil padrão e **travar pesos ao abrir a urna (recomendado: travar, com alteração auditada)**; tempos de retorno/inatividade; textos e ilustrações; futuro: fila offline, intervalo mínimo, limite por totem, alertas.

### 3.4 `ModoApresentacao.md` — Funcionalidade 4: Modo Apresentação (Telão)

- **Objetivo:** tela cinematográfica **só para o admin**: durante a votação mostra andamento e QR Code; após o encerramento conduz a **revelação** (animações, categorias, pódio, empates).
- **Execução:** **local**, sem sincronização entre telas nem controle remoto. Sem "Ver Apresentação" para outros usuários.
- **Fases do botão Apresentar:** antes da votação → votação aberta (cards, **QR Code**, **temporizador pela hora do servidor**, **total geral**, mensagens de abertura e "reta final") → encerrada aguardando → revelação → resultado final estático. **Sem votos por candidato ao vivo por padrão.**
- **Revelação:** trailer → "queridinho do público" (popular) → "preferido das crianças" (infantil) → "escolha dos jurados" (júri) → **pódio 3º→1º com a pontuação final** → classificação completa (opcional, desligada por padrão). Categorias sem módulo são puladas; rótulos configuráveis; categorias mostram a quantidade de votos; menos de 3 candidatos mostra os que existirem.
- **Empates:** no ranking, aplica o desempate configurado (animação lado a lado, critério na tela, vencedor destacado); se persistir, **posição compartilhada** ("1º lugar — empate"), sem decidir. Em categoria, desempata pela **pontuação final**; se persistir, **co-vencedores**.
- **Trailer:** link YouTube/Vimeo, com **fallback gerado** no navegador (nome, logo, data, identidade; opção de incluir candidatos) após tempo limite; "pular" sempre.
- **Operação:** tela cheia, atalhos de teclado, sem elementos de interface no telão; avanço automático ou manual; aviso sobre espelhamento (recomenda **estender** a tela); **modo ensaio** com dados simulados; **botão de emergência** para o resultado estático; pré-carregamento; 16:9 em 1080p/4K; respeita `prefers-reduced-motion`.
- **Resultado congelado:** gerado no **encerramento da urna** (`ResultadoOficial`: pesos, placares por grupo, pontuação final, posições, categorias, empates, critério). Telão e exportação leem a mesma fonte. **Correção só por ação auditada, gerando novo registro.**
- **`ConfigApresentacao`:** link do trailer, usar trailer gerado, incluir candidatos no trailer, classificação completa, modo de avanço, rótulos das categorias, **mostrar votos por candidato ao vivo (padrão: não)**, limiar da reta final.
- **Segurança:** resultado só ao admin autenticado, validado no servidor; antes da revelação o servidor só entrega estado ao vivo.
- **Pendências:** modo de avanço padrão; durações; direção visual; tela pública de resultado (futuro); trilha sonora (futuro).

### 3.5 `Dashboard.md` — Funcionalidade 5: Dashboard e Exportação

- **Objetivo:** o admin **acompanha a operação** durante a votação e **guarda/exporta** os dados depois.
- **Abas:** **Operação** (ao vivo) e **Resultado** (**somente após o encerramento**).
- **Operação:** estado da urna e tempo restante; total de votos por grupo (popular, júri, infantil); **votos por minuto** e pico; participantes cadastrados e que votaram, por papel; **jurados: quem votou e quem não**; **totens**: estado, último uso, votos por dispositivo; **códigos de jurado**: disponíveis, usados, revogados; resumo de auditoria. **Sem votos por candidato** (a tela pode estar espelhada no telão); a opção "mostrar parcial por candidato" liga por evento.
- **Resultado:** o resultado oficial congelado (mesma fonte do telão), categorias, linha do tempo, dados do evento, **classificação completa visível ao admin**.
- **Exportação:** CSV em vários arquivos (`resumo_evento`, `resultado_candidatos`, `votos_por_minuto`, `jurados`, `dispositivos`, `auditoria`) + relatório imprimível (PDF pelo navegador). Durante a votação só os de **operação**. **Sem e-mails.** Voto identificado do júri só ao admin, com exportação **auditada**. Cada exportação é auditada.
- **Acesso:** só o admin **do evento**; jurados, público e totens não acessam. Evento concluído: somente leitura com exportações.
- **Desempenho:** consultas agregadas com cache curto; polling a cada poucos segundos; sem WebSocket.
- **Retenção:** o modelo deve permitir manter, anonimizar ou excluir dados pessoais por evento; política na configuração (fora da Fase 1).
- **Pendências:** política de retenção; formato exato dos CSV (separador, codificação, cabeçalhos); layout do relatório; super admin (`ConfiguracaoEvento.md`, não fornecido).

### 3.6 `schema.prisma` (MySQL, baseado no DD v1.1; banco decidido: Supabase PostgreSQL, conversão na trilha de produção)

**Convenções:** `@@map` snake_case; entidades de domínio com UUID `Char(36)`; tabelas de alto volume e append-only (`Voto`, `HistoricoVotoJuri`, `VotoInfantil`, `Auditoria`) com `Int autoincrement`; **votos e históricos nunca são apagados** (`onDelete: Restrict`; dados pessoais se anonimizam); **FKs compostas `(id, eventoId)`** garantem que voto aponta para candidato/participação/dispositivo do **mesmo evento**; o CHECK de pesos somando 100 fica na migration (não no Prisma).

**Enums:** `EstadoEvento` (RASCUNHO, ATIVO, CONCLUIDO); `EstadoUrna` (NAO_INICIADA, ABERTA, ENCERRADA); `MetodoIdentificacao` (GOOGLE_OU_EMAIL, SOMENTE_GOOGLE, SOMENTE_EMAIL); `PapelParticipacao` (PUBLICO, JURADO, **ADMIN**); `EstadoConvite` (DISPONIVEL, USADO, REVOGADO; **sem EXPIRADO**); `EstadoConviteAdmin`; `EstadoDispositivo` (ATIVO, PAUSADO, REVOGADO); `EstadoCodigoPareamento`; `RegraDesempate` (JURI, PUBLICO); `ModoAvanco` (AUTOMATICO, MANUAL).

| Modelo | Pontos-chave |
|---|---|
| `Usuario` | nome, e-mail único, `emailVerificadoEm`, `anonimizadoEm?`; sem senha (rev. 4, F-8) |
| `Evento` | `slug` único; `estado`, `estadoUrna`; `janelaInicio/Fim`; `encerramentoAutomatico` (padrão true); `metodoIdentificacao`; `moduloJuri`, `moduloInfantil`; **`bloquearVotoProprio` (padrão true)**; `avisoPrivacidadeUrl`; **`prazoAnonimizacaoDias` (90)**; `urnaAbertaEm`, `urnaEncerradaEm`, `concluidoEm`; `fusoHorario`; `local?`, `linkSobre?` (rev. 4, F-5) |
| `Tema` (1:1) | `nomeExibicao`, `logoUrl`, `capaUrl`, `corPrimaria/Secundaria/Fundo/Texto`, `fonte`, **`rotuloCandidato` e `rotuloCandidatos`**, `textosEstado` (Json) |
| `ConfigPlacar` (1:1) | `pesoPopular` (100), `pesoJuri` (0), `pesoInfantil` (0), todos `Int` (rev. 4, F-4), `regraDesempate` (JURI); **sem `exibirVotosJuriNoTelao`** (removido na rev. 4, F-10) |
| `ConfigApresentacao` (1:1) | `trailerUrl`, `usarTrailerGerado`, `incluirCandidatosTrailer`, `classificacaoCompleta`, `modoAvanco`, três `rotuloCategoria*`, **`parcialAoVivo`**, `limiarRetaFinalSegundos` (300). **Não tem campo de duração/tempo limite do trailer** |
| `CampoCandidato` | `chave`, `rotulo`, `ordem`; único `(eventoId, chave)` |
| `Candidato` | `titulo`, `descricao`, `imagemUrl`, `publicado`, **`desqualificado`** (sai do ranking, votos ficam), `ordem`, `camposExtras` (Json por `chave`), `usuarioVinculadoId?`; único `(id, eventoId)` |
| `Participacao` | `papel`, `votou`; **sem horário**; único `(usuarioId, eventoId)` e `(id, eventoId)` |
| `Voto` | **sem usuário**; `candidatoId`, `hashRecibo` único (64), `criadoEm` |
| `ConviteJurado` | `hashCodigo`, `rotulo`, `validadeAte?`, `estado`, `participacaoId?` único, `resgatadoEm`; único `(eventoId, hashCodigo)` |
| `VotoJuri` | `participacaoId`, `candidatoId`, `atualizadoEm`; único `(participacaoId, eventoId)` |
| `HistoricoVotoJuri` | `candidatoAnteriorId` **opcional**, `candidatoNovoId`, `criadoEm` |
| `Dispositivo` | `hashToken`, `hashPin?`, `estado`, `ultimoUsoEm` |
| `CodigoPareamento`, `ConviteAdmin` | `CodigoPareamento` entra com o planner Totem (rev. 4, A7); `ConviteAdmin` fica para depois (admins por seed, A9) |
| `VotoInfantil` | `candidatoId`, `dispositivoId`, `criadoEm`; sem dado da criança |
| `ResultadoOficial` | **`versao` (único por evento)**, **`motivo`** (ex.: ENCERRAMENTO, DESQUALIFICACAO, CORRECAO), `pesoPopular/Juri/Infantil` (`Int`), `dados` (Json), `calculadoPorId?`, `calculadoEm` |
| `Auditoria` | `acao`, `entidade`, `entidadeId`, `detalhes` (Json), `atorUsuarioId?`, `atorDispositivoId?`, `ipHash`, `criadoEm`; **nunca guarda a escolha de voto popular/infantil** |

---

## 4. Resumo do contrato consolidado (Etapas 0 a 3 finais)

> Resumo. **A fonte de verdade é o `Etapa0 Final.md`.** Se houver divergência, vale o Final.

### 4.1 Donos dos módulos compartilhados

| Módulo | Dono |
|---|---|
| Tipos de domínio, `Resultado<T>`, `CodigoErro`, mensagens | Etapa 0 (cada etapa pode acrescentar códigos) |
| Store, relógio, `transicoes` (`ativarEvento`, `abrirUrna`, `encerrarUrna`, `concluirEvento`) | Etapa 0 |
| Tema: tokens, contraste, fontes, `TemaEvento` | Etapa 0 |
| `lib/aleatorio.ts`, `codigos.ts`, `hash.ts`, `formatar.ts`, `tempo.ts` | Etapa 0 |
| `resolverAcesso`, `RotaGuard`, `AcessoRestrito`, `AdminShell` mínimo | Etapa 0 |
| `Dialogo`, `DialogoConfirmacao`, `Toast`, `Abas`, `ContagemRegressiva`, `SkipLink`, `LiveRegion`, `ImagemCandidato`, `LogoEvento` | Etapa 0 |
| `useConsulta` (polling com pausa), `registrarAuditoria` | Etapa 0 |
| Registro de cenários (mecanismo e `PADRAO`) | Etapa 0 (cada etapa registra os seus) |
| `resolverSituacaoEvento` (8 situações) | Etapa 1 |
| `EventoShell`, `resolverVisaoEvento`, `lib/textosEstado.ts`, `RodapeEvento`, cenário `SEM_CANDIDATOS` | Etapa 2 |
| `servicos/auth.ts`, `resolverDestinoAcesso`, `MenuUsuario`, `CampoCodigoConvite`, cenários `SOMENTE_*` | Etapa 3 |
| **`resolverEstadoVotar`**, lista, cartão, detalhe, ordem por semente, cenário `MUITOS_CANDIDATOS` | **Etapa 4** |
| **Seleção**, revisão, envio (`votarPopular`, `votarJuri`, `consultarEstadoVoto`), telas "já votou" e de erro | **Etapa 5** |
| CRUD de candidatos, convites, placar, formulário de tema, Operação, `travas.ts`, `lib/csv.ts` | **Etapa 6** |
| **Apuração** (`apurar`, `congelarResultado`), seed de volume, dashboard, exportação, relatório | **Etapa 7** |
| `montarRoteiro`, motor da revelação, palco, trailer, QR Code, ensaio | **Etapa 8** |

### 4.2 Decisões D1 a D21 (Etapa 0)

| # | Resumo |
|---|---|
| D1 | Estado único em memória no layout raiz, store externo com `useSyncExternalStore`, criado por montagem (sem singleton de módulo) |
| D2 | Quatro blocos: `banco` (espelha o schema), `sessao`, `ui` (transitório), `dev`. **Relógio é store à parte** |
| D3 | Leitura: **seletores** (estado público do cliente) ou **serviços** lidos com `useConsulta` (dados "de servidor"). Escrita só por serviços. **`servicos/` é a fronteira de dados; não existe `repo.ts`** |
| D4 | Sigilo espelhado. Telas **nunca** leem `votos`, `votosJuri`, `historicoVotosJuri`, `votosInfantis`, `resultados`: só `store/seletores/**` e `servicos/**`. Exceção: `dev.vinculosVoto` (só para "Resetar meu voto") |
| D5 | Todo serviço: `Promise<Resultado<T>>`, latência global (`dev.latenciaMs`, padrão 400 ms), falha simulável. Rejeição nunca muta o `banco` |
| D6 | Relógio simulado e determinístico, começa em `T0 = 2026-10-22T14:00:00-03:00`; seeds com datas absolutas; `getServerSnapshot` = `T0` |
| D7 | **Abertura da urna é sempre manual.** Encerramento é automático se `encerramentoAutomatico` e `agora ≥ janelaFim`; desligado, a urna segue `ABERTA` e as telas mostram "Tempo esgotado, aguardando a organização" |
| D8 | Transições em um único módulo (`store/transicoes.ts`). **Encerrar a urna sempre chama `congelarResultado` e audita** |
| D9 | **Resultado oficial versionado** (`ENCERRAMENTO`, `DESQUALIFICACAO`, `CORRECAO`); telão, dashboard e exportação leem a **maior `versao`**. "Refazer revelação" refaz a cerimônia, não o resultado |
| D10 | Tipos espelham o schema com enums em MAIÚSCULAS. Só `Evento.local` e `Evento.linkSobre` são mock-only |
| D11 | `banco` normalizado por tabela; `EventoAtivo` é visão composta memoizada no hook; chave de busca é `id` (slug pode ser renomeado) |
| D12 | Convites guardam só o hash (`hashMock`, não criptográfico, 64 hex) |
| D13 | Sessão por usuário; papel por participação no evento. **`ADMIN` é por evento e não vota** (a confirmar no DD) |
| D14 | Validade do slug resolvida **no cliente** (`GateEvento`); **sem `notFound()` de servidor para slug**; metadata via `servicos/metadados.ts` |
| D15 | Tema por tokens `--tema-*`, sem dark mode automático. **Nenhum texto abaixo de 4,5:1.** Texto sobre cor de marca é derivado; **não existe `corSobrePrimaria`**. Festival: texto escuro sobre o laranja (≈5,3:1) e verde ajustado como texto |
| D16 | `imagemUrl`: `placeholder:<n>` (desenhado com tokens), caminho em `public/`, `blob:` ou `null`. Sem imagens remotas |
| D17 | Toolbar extensível, age sobre o **evento ativo** e pode forçar combinações que o fluxo real não permitiria |
| D18 | **Instância única.** Sem sincronização entre abas, janelas ou dispositivos; nova aba/F5 volta ao seed. Roteiros de teste e demo cabem em **uma aba** |
| D19 | Vitest (dev) para `dominio/` e `lib/` (rev. 3), mais `verificarInvariantes` e checklist manual para telas |
| D20 | Gerenciador de pacotes **`pnpm`** (`pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm add <pacote>@<versão fixada>`); lockfile `pnpm-lock.yaml` |
| D21 | Guarda de acesso central desde a Etapa 0 (`resolverAcesso` + `RotaGuard`; volta de login por `?de=<rota interna>`) |

### 4.3 Convenções do conjunto (Etapa 0, seção 3.3)

- **Estrutura de todo planner (Anexo A):** cabeçalho (Rotas, Depende de, Alimenta, Fontes, Status) → 1 Objetivo → 2 Escopo (Dentro/Fora) → 3 Contrato (3.1 recebe, 3.2 entrega) → 4 Decisões (só as novas, D1, D2...) → 5 Modelo e regras → 6 Estrutura de arquivos → 7 Checkpoints (`CP1`, `CP2`...; último = "Revisão e fechamento") → 8 O que fica fake → 9 Critérios de aceitação → 10 Pendências. Seção sem conteúdo fica com "Não se aplica".
- **Cada CP termina com** `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` sem erros; entrega em **zip cumulativo** `VaiVota-E{n}-CP{m}.zip` (sem `node_modules` nem `.next`); só avança depois da validação. Cada CP registra o que foi feito, o que ficou fake e como validar.
- **Código:** domínio, componentes, rotas e textos em português; enums em MAIÚSCULAS idênticos ao schema; componentes `PascalCase.tsx`, módulos `camelCase.ts`; datas ISO 8601 com offset; formatação sempre via `lib/formatar.ts` e `lib/tempo.ts`; rota interna só com `next/link` ou `useRouter`; **nenhum hex de marca fora de `src/mocks/seed/`, `globals.css` e `components/dev/`**.
- **Dependências aprovadas:** `lucide-react` (E0), `qrcode.react` (E8) e `vitest` (E0, só desenvolvimento; rev. 3). Gráficos em SVG próprio (E7). Qualquer outra exige decisão registrada.
- **Regra de nomes:** nomes de arquivos, hooks, serviços, tokens, enums e seeds vêm da Etapa 0. **Divergência se resolve ajustando o planner, não criando nome novo.**
- **Cabeçalho dos finais:** `Status: versão final consolidada. Substitui EtapaN X.md.`

### 4.4 Tipos e serviços-chave

- `Resultado<T> = { ok: true; dados: T } | { ok: false; erro: { codigo; mensagem; detalhe? } }`.
- **`CodigoErro`:** `VALIDACAO`, `NAO_ENCONTRADO`, `NAO_AUTORIZADO`, `CONFLITO`, `REDE`, `ERRO_INTERNO`; `CREDENCIAIS_INVALIDAS`, `EMAIL_NAO_VERIFICADO`, `CADASTRO_NAO_CONCLUIDO`; `CODIGO_INVALIDO`, `CODIGO_USADO`, `CODIGO_REVOGADO`, `CODIGO_EXPIRADO`, `LIMITE_TENTATIVAS`, `JA_VOTOU_COMO_PUBLICO`, `JA_E_JURADO`; `EVENTO_INDISPONIVEL`, `EVENTO_CONCLUIDO`, `URNA_NAO_ABERTA`, `URNA_ENCERRADA`, `RESULTADO_INDISPONIVEL`, `TRAVADO`; `JA_VOTOU`, `PAPEL_INVALIDO`, `CANDIDATO_INDISPONIVEL`. **Não existe código para voto em si mesmo.**
- **`ModoFalha`:** `NENHUMA`, `REDE_NAO_GRAVOU`, `REDE_GRAVOU`, `URNA_ENCERRA`, `JA_VOTOU_OUTRA_SESSAO`, `ERRO_INTERNO`. Os três últimos (exceto `ERRO_INTERNO`) e `REDE_GRAVOU` são interpretados pelos serviços de voto (Etapa 5). `dev.falhaProxima` é pontual.
- **Regras dos serviços:** `async`; começam com `atraso()` e `simularFalha()`; validam **antes** de mutar; releem `store.getState()` após cada `await`; mensagens genéricas via `servicos/mensagens.ts`; detalhe só no console (`[mock:log]`); ação auditável chama `registrarAuditoria`; **nunca** registra a escolha de voto popular/infantil.
- **`ResultadoOficial`:** campos do schema + `dados: DadosResultado` = `{ criterioDesempate, totais, placares, ranking, categorias, empates }` por `Grupo = "POPULAR" | "JURI" | "INFANTIL"`; `empates[]` = `{ posicoes, candidatoIds, criterioAplicado, resolvido, vencedorId? }`; `categorias[]` = `{ grupo, vencedores, desempatadoPorPontuacao }`. `congelarResultado` é **stub** em `dominio/resultado.ts` até a Etapa 7.
- **`useSessao()`:** `{ logado, usuario, emailVerificado, participacao, papel, jaVotou }`.
- **`useAgora()`:** ms do instante simulado; ações do relógio: `avancar`, `irPara`, `pausar`, `retomar`, `reiniciar`. `Date.now()` só em `relogio.ts`.
- **`resolverVisaoEvento` (Etapa 2):** devolve `variante` (`NAO_INICIADA`, `ABERTA`, `ENCERRADA`, `CONCLUIDO`, `SEM_CANDIDATOS`, `INDISPONIVEL`), `situacao` (Etapa 1), `acao` (`ENTRAR_OU_CRIAR`, `VERIFICAR_EMAIL`, `VOTAR`, `VOTAR_JURADO`, `ALTERAR_VOTO_JURADO`, `VER_CONFIRMACAO`, `PAINEL_ADMIN`, `NENHUMA`), `bannerRascunho`, `mostrarCodigoConvite`, `avisoJuriDesligado`, `seloVoto`, `agradecer`. Jurado com módulo júri desligado fica **sem botão de voto** (D6 da Etapa 2).
- **`resolverSituacaoEvento` (Etapa 1)**, precedência: `CONCLUIDO` > `EM_PREPARACAO` (rascunho) > `ENCERRADA` > `TEMPO_ESGOTADO` > `RETA_FINAL` > `ABERTA` > `ABERTURA_PENDENTE` > `NAO_INICIADA`. Em `TEMPO_ESGOTADO` o CTA "Quero votar" **continua visível**.
- **Textos de estado:** `lib/textosEstado.ts` (`textoDoEstado(chave, tema, contexto)`) com chaves `NAO_INICIADA`, `ABERTA`, `JA_VOTOU`, `JURADO_JA_VOTOU`, `SUCESSO`, `ENCERRADA`, `CONCLUIDO`, `SEM_CANDIDATOS`, `INDISPONIVEL`; override em `tema.textosEstado`; **sem artigo nem adjetivo que concorde com o rótulo** (D10 da Etapa 2).
- **Etapa 3:** `servicos/auth.ts` (`entrar`, `entrarComGoogle`, `registrar`, `confirmarCodigo`, `reenviarCodigo`, `resgatarConvite`, `garantirParticipacao` (rev. 3); sem senha nem recuperação (rev. 4)); `resolverDestinoAcesso`; entrar/registrar **cria a participação** do evento (D2); admin de outro evento que entra vira `PUBLICO` ali; senha = qualquer uma com 8+ caracteres, **o e-mail define a conta**; bloqueio de 5 códigos recusados por 60 s no relógio simulado (um só contador); auditoria `CONVITE_RESGATADO`, `TENTATIVA_CODIGO_INVALIDA`, `BLOQUEIO_RATE_LIMIT`; `EstadoUi` ganha `bloqueioCodigo` e `reenvioVerificacaoAteMs`.

### 4.5 Seeds do núcleo

**Eventos**

| | Semana Tech | 9º Festival Ver e Fazer Filmes |
|---|---|---|
| `id` / `slug` | `evt-semana-tech` / `semana-tech` | `evt-ver-e-fazer-filmes` / `ver-e-fazer-filmes` |
| Estado / urna | `ATIVO` / `ABERTA` (`urnaAbertaEm` 13h) | `ATIVO` / `NAO_INICIADA` |
| Janela | 22/10/2026 13h–17h | 25/11/2026 10h a 28/11/2026 20h |
| Módulos | Júri sim, infantil não | Júri e infantil sim |
| Pesos | 70 / 30 / 0, desempate `JURI` | 50 / 30 / 20, desempate `JURI` |
| Tema | **Escuro**, Space Grotesk, sem logo; rótulos Projeto/Projetos | **Claro**, primária `#F15A29`, secundária `#8DC63F`, Inter, logo `.webp`; rótulos Curta/Curtas |
| Campos extras | `equipe`, `tecnologias` | `direcao`, `duracao` |
| `textosEstado` | ausente (testa o fallback) | próprios |
| `ConfigApresentacao` | sem `trailerUrl`; rótulos "Favorito da comunidade", "Escolha da banca" | `trailerUrl` válido (placeholder); rótulos padrão |

`bloquearVotoProprio = true` nos dois. `T0` fica 1 h dentro da janela da Semana Tech (faltam 3 h) e ~34 dias antes do Festival.

**Candidatos** (`cand-st-01..10`, `cand-fv-01..08`)

| | Semana Tech | Festival |
|---|---|---|
| Votáveis | **8** (01–08) | **6** (01–06) |
| Rascunho | 09 | 07 |
| Desqualificado (`publicado: true`) | 10 | 08 |
| Sem imagem | 03 | 04 |
| Título > 100 caracteres | 06 | 05 |
| Descrição de uma linha | 07 | 06 |
| Vinculado a Gabi | 08 | 03 |
| Campo extra sem valor | 02 | 02 |

**Usuários** (login por código `123456`, rev. 4; sufixo `@demo.com`)

| Usuário | E-mail | Participações |
|---|---|---|
| Ana Souza | `publico@` | Semana Tech `PUBLICO`, verificada, não votou |
| Bruno Lima | `jurado@` | Semana Tech `JURADO` (convite `H4TR-9WNB`), não votou |
| Carla Mendes | `admin@` | `ADMIN` **nos dois** eventos |
| Davi Rocha | `naoverificado@` | nenhuma; e-mail não verificado |
| Eva Santos | `votou@` | Semana Tech `PUBLICO`, **já votou** (1 `Voto`) |
| Fábio Nunes | `jurado.votou@` | Semana Tech `JURADO` (convite `F3WJ-8RNK`), com `VotoJuri` e **1 entrada de histórico** |
| Gabi Torres | `equipe@` | Semana Tech `PUBLICO`; candidata vinculada nos dois eventos |
| Hugo Pires | `admin.festival@` | Festival `ADMIN` |

**Convites** (alfabeto `23456789ABCDEFGHJKMNPQRSTUVWXYZ`, formato `XXXX-XXXX`): Semana Tech `K7M3-QX9P` (disponível), `H4TR-9WNB` (usado, Bruno), `F3WJ-8RNK` (usado, Fábio), `P8CD-2VXF` (revogado), `M6ZQ-4KTA` (disponível mas **expirado**); Festival `R5HN-7DCW`, `T9VB-3JXG` (disponíveis). "Expirado" é **derivado** (`DISPONIVEL` com `validadeAte < agora`).

**Dispositivos (Festival, só leitura):** Totem Hall (`ATIVO`), Totem Pátio (`PAUSADO`), Totem Oficinas (`REVOGADO`), sem votos até um cenário de volume.

**Votos do núcleo:** 1 `Voto` (Eva, registrado em `dev.vinculosVoto`) e 1 `VotoJuri` (Fábio) na Semana Tech.

**Metas do seed de volume** (Etapa 7, **sobre** o núcleo, sem alterar ids nem fatos): 520 participações (511 públicas + 9 jurados); 412 votos populares (= participações `PUBLICO` com `votou`), entre `urnaAbertaEm` e `T0`, pico por volta de 2/3 do período; 9 jurados (7 votaram: Fábio + 6; 2 pendentes: Bruno + 1); **12 convites: 9 usados, 1 revogado, 1 disponível, 1 expirado**; ~25 entradas de auditoria; infantil só no Festival: 138 votos em 3 totens; um empate resolvido (2º e 3º) e um que persiste (ex.: 6º) via cenários da Etapa 8.

### 4.6 Invariantes (`verificarInvariantes`)

Vazia no estado inicial e **depois de cada ação da toolbar e de cada serviço**:
1. Slugs únicos; uma participação por `(usuarioId, eventoId)`.
2. **Pesos configurados somam 100 por evento; módulo desligado tem peso 0** (≠ `pesosEfetivos` do resultado, rev. 3 C3).
3. Nº de `Voto` do evento = nº de participações `PUBLICO` com `votou = true`.
4. Nº de `VotoJuri` = nº de participações `JURADO` com `votou = true`, e **cada `VotoJuri` tem ao menos 1 entrada de histórico**.
5. Todo voto aponta para candidato do **mesmo evento**.
6. Convite `USADO` tem `participacaoId` de uma participação `JURADO` do mesmo evento.
7. `resultados` com `versao` única e sequencial; urna `ENCERRADA` tem ao menos uma (checado a partir da Etapa 7).

### 4.7 Cenários registrados (mecanismo `mocks/cenarios.ts`, tipo `Cenario`, `aplicar` pura)

`PADRAO` (E0); `SEM_ENCERRAMENTO_AUTOMATICO` (E1); `SEM_CANDIDATOS` (E2); `SOMENTE_GOOGLE`, `SOMENTE_EMAIL` (E3); `MUITOS_CANDIDATOS` — 24 (E4); `RASCUNHO_INCOMPLETO`, `RASCUNHO_PRONTO`, `URNA_ENCERRADA`, `EVENTO_CONCLUIDO` (E6); `FESTIVAL_ENCERRADO` — volume infantil (E7); `RESULTADO_PADRAO`, `RESULTADO_EMPATE_RESOLVIDO`, `RESULTADO_EMPATE_PERSISTENTE`, `RESULTADO_CO_VENCEDORES`, `RESULTADO_SEM_INFANTIL`, `RESULTADO_DOIS_CANDIDATOS` (E8). A Etapa 9 só consolida e valida.

### 4.8 Dev toolbar

Controles do núcleo: evento (`dev.slugPadrao`), estado do evento, urna, "Entrar como" (8 usuários), e-mail verificado liga/desliga, módulos (`alternarModulo`: ao desligar zera o peso e redistribui; ao ligar o peso fica 0), relógio (+15 min, +1 h, "Reta final", "Fim da janela", pausar/retomar, voltar a `T0`), latência (0/400/1500), erro de rede, **falha no próximo envio** (`ModoFalha`), cenários, resetar mock, inspetor (JSON + invariantes). **Seções de etapa** por registro: Votação (E5), Dashboard (E7), Apresentação (E8).

**Visibilidade:** `NEXT_PUBLIC_DEV_TOOLBAR` (padrão `true`, inclusive em build de produção). `toolbarModo`: `AUTO` (visível, **exceto** com `ui.palcoAtivo`), `OCULTA` (`?toolbar=0`), `FORCADA`. **`Alt+D`** alterna: visível → `OCULTA`; oculta → `FORCADA` (visível mesmo no palco). Com a variável em `false`, a toolbar não existe.

### 4.9 `ui` e `dev` — campos e donos

| Campo | Dono |
|---|---|
| `ui.palcoAtivo` | E0 (E8 liga) |
| `ui.apresentacao` (`chave`, `modoSala`, `cenarioEnsaioId`, `modoAvancoLocal`, `revelacao`) | E8 (tipo definido na E8; campo declarado na E0 rev. 2) |
| `ui.votacao` (com `chave = usuarioId:eventoId`) | E5 |
| `ui.dashboard.resultadoVisivel` (`string \| null`, chave `eventoId:versao`) | E7 (rev. 3, C17) |
| `ui.bloqueioCodigo`, `ui.reenvioVerificacaoAteMs` | E3 |
| `dev.slugPadrao`, `latenciaMs`, `simularErroRede`, `falhaProxima`, `simularVotosEntrando` (lógica na E7, usada por 7 e 8), `toolbarModo`, `toolbarRecolhida`, `vinculosVoto` (chave `usuarioId:eventoId`, rev. 2) | E0 |
| `dev.simularTrailerFalha` | E0 (declarado na rev. 2) / E8 (usa) |
| Seleção do candidato, passo do fluxo de voto, estado de confirmação | E5, em `ui.votacao` |
| Progresso da revelação, modo de avanço local | E8, em `ui.apresentacao` (`revelacao`, `modoAvancoLocal`) |

### 4.10 Estrutura de pastas e rotas (Etapa 0)

```
src/app/
  layout.tsx, globals.css, page.tsx (landing), dev/ui/page.tsx
  e/[slug]/
    layout.tsx                    # servidor; GateEvento (cliente)
    (participante)/ layout.tsx (EventoShell), page.tsx, convite/, verificar-email/ (tela de código, rev. 4), votar/
    admin/
      (painel)/ layout.tsx (RotaGuard ADMIN + AdminShell), page.tsx (dashboard),
                configuracao/page.tsx, relatorio/page.tsx
      apresentar/page.tsx         # fora do AdminShell; RotaGuard próprio
src/components/{ui, a11y, evento, candidato, nav, dev}
src/dominio/{tipos, acesso, candidatos, placar, resultado, invariantes, situacaoEvento, visaoEvento, destinoAcesso}.ts
src/mocks/{seed/, criarEstadoInicial.ts, cenarios.ts}
src/store/{criarStore, relogio, AppProvider, transicoes, acoes}, seletores/
src/servicos/{resultado, mensagens, sessao, metadados, auth}.ts
src/lib/{tema, contraste, fontes, tempo, formatar, aleatorio, codigos, hash, useConsulta, textosEstado, validarAcesso}.ts
```

Lint: `no-restricted-imports` bloqueia `@/mocks/*` em `src/app/**`, `src/components/**` e `src/lib/**`.

### 4.11 Anexo B da Etapa 0 (lista de ajustes por etapa)

A Etapa 0 Final já traz, para cada etapa 4 a 9, uma lista de ajustes. Ela é o **piso** da mesclagem; a seção 6 deste arquivo **acrescenta** o que o Anexo B não cobre (marcado "**novo**").

---

## 5. Resumo dos planners antigos pendentes (4 a 9) (histórico)

> Os planners antigos 4 a 9 já foram mesclados nos Finals. Esta seção fica só como registro de origem.

### 5.1 Etapa 4 — Candidato (antigo)

- **Rota:** `/e/[slug]/votar`, parte 1. Depende de 0, 2, 3; alimenta a 5.
- **Decisões:** D1 detalhe em `<dialog>` controlado por `?candidato=<id>`; D2 seleção visual nasce aqui; D3 não publicado e desqualificado não aparecem; D4 ordem por semente `usuarioId + eventoId`; D5 nenhuma contagem de votos; D6 candidato vinculado ao usuário mostra selo "Você faz parte deste projeto" e não pode ser selecionado.
- **CPs:** 1 dados/seletores/ordem embaralhada (seed ≥6 por evento, cenário "Sem candidatos"/"Muitos (24)", `lib/embaralhar.ts`, placeholders em `public/mock/`); 2 guarda da rota (`GuardaVotacao`, `resolverEstadoVotar`, 8 passos); 3 lista e cartão (`ListaCandidatos`, `CartaoCandidato`, `ImagemCandidato`, `BarraSelecao`, `selecionadoId`); 4 detalhe (bottom sheet no celular, anterior/próximo na ordem do usuário); 5 papéis, bordas e cenários (jurado com "Seu voto atual", aviso de voto identificado); 6 fechamento.
- **Matriz §5:** urna × papel × `votou` × candidatos votáveis; admin "fora do escopo, definir na Etapa 0".

### 5.2 Etapa 5 — Votos (antigo)

- **Rota:** `/e/[slug]/votar`, parte 2, com `?passo=lista|revisao|sucesso`. Depende de 0, 2, 3, 4.
- **Pontos centrais:** `banco` + `sessaoUi`; `votarPopular`, `votarJuri`, `consultarEstadoVoto`; `ResultadoVoto { ok, atualizado }` e `MotivoRejeicao` (8 motivos); latência 600–900 ms; falhas **só no próximo envio** (6 modos); gate de 8 linhas; "já votou" sem dizer em quem; jurado altera até o fim da urna com `historicoVotoJuri`; "Resetar meu voto" e contador de depuração só na toolbar; pnpm.
- **CPs:** 1 contratos/seed/simulação; 2 gate e telas de estado; 3 seleção (radio, `BarraSelecao`, "Votar neste {rótulo}" vai direto à revisão); 4 revisão e confirmação (proteção contra duplo clique); 5 sucesso e erros (6 modos de falha); 6 jurado (aviso de identificação, "Alterar voto", "Esse já é o seu voto"); 7 fechamento.
- **Pendências:** comprovante/hash do voto (assumido **não** exibir); jurado ver o próprio voto após o fim (assumido não); aviso de identificação (banner, não checkbox); candidato votar em si mesmo ("sem efeito na Fase 1").

### 5.3 Etapa 6 — Configuração (antigo)

- **Rota:** `/e/[slug]/admin/configuracao` com `?secao=geral|candidatos|juri|placar|tema|operacao`. Depende de 0, 2, 3; alimenta 7 e 8.
- **Fora (por seed):** Módulos, Votação (janela avançada), Infantil, Apresentação, Privacidade, admins adicionais, super admin, upload real.
- **Matriz de travas** (`travas.ts`, colunas: Rascunho, Urna aberta, Urna encerrada, Evento concluído): slug trava com urna aberta; candidatos adicionar/remover/despublicar **travado** com urna aberta; desqualificar é "ação excepcional" com urna aberta/encerrada; pesos, desempate e "exibir votos do júri" **travados** com urna aberta; tema **livre** mesmo com urna aberta; concluído = leitura.
- **CPs:** 1 shell/navegação/guarda (`ConfigShell`, `SecaoNav`, `BannerTrava`, `travas.ts`); 2 Geral; 3 Candidatos lista; 4 Candidatos formulário, campos extras, remoção, desqualificar; 5 Júri convites (`codigos.ts`, CSV UTF-8 com BOM separador `;`, teto de 50, códigos visíveis uma vez); 6 Placar (sliders, soma 100%, desempate, exemplo numérico); 7 Tema (contraste 4,5:1, prévia com abas Login/Votação/Telão, presets); 8 Operação (checklist de ativação, ativar/abrir/encerrar/concluir, `DialogoConfirmacao`).
- **Checklist de ativação:** ≥2 candidatos publicados; pesos somam 100% nos módulos ligados; janela válida; júri ligado → convites gerados; tema com contraste aprovado (todos bloqueiam); infantil ligado → "totem pareado" e "trailer testado" (**avisos**).
- **Cenários de seed (§8):** rascunho incompleto (1 candidato, **pesos 50/30**, sem convites), rascunho pronto, urna aberta, urna encerrada, concluído, Festival.

### 5.4 Etapa 7 — Dashboard (antigo)

- **Rotas:** `/e/[slug]/admin` (abas Operação e Resultado) e `/e/[slug]/admin/relatorio` (proposta; não consta no mapa do DD).
- **Pontos centrais:** `calcularResultado` + `congelarResultado` em `mocks/resultado.ts`, disparado ao encerrar a urna; `contagens` no store com incremento a cada voto da Etapa 5; "Simular votos entrando" (+N a cada 3 s); `usePolling(…, 5000)`; gráficos em SVG próprio; polling pausa com aba oculta; acesso só do admin do evento.
- **Estados do painel:** Não iniciada / Aberta / Encerrada / Concluído (**sem linha de Rascunho**) × aba Operação, aba Resultado, exportações.
- **Seed sugerido:** 8 candidatos, 520/412/9/7/2/138, "12 códigos: 9 usados, 1 revogado, **2 disponíveis**", série de **90 min com pico no minuto 55**, ~25 de auditoria, um empate resolvido (2º/3º) e um persistente (6º). `admin@demo.com` admin **só do evento ativo**.
- **CPs ("Checkpoint 1..7"):** 1 contrato de dados, resultado e casca; 2 Operação (KPIs); 3 Operação (votos/min, jurados pendentes, totens, códigos, auditoria, parcial); 4 Resultado (classificação, empates, categorias, votos do júri); 5 CSV (6 arquivos, `;`, BOM, vírgula decimal; confirmação antes de `jurados.csv`); 6 relatório imprimível; 7 estados transversais e fechamento.
- **Pendências:** gráficos SVG × Recharts; formato CSV; rota do relatório; admin multi-evento; parcial por candidato; "baixar tudo" em zip; retenção.

### 5.5 Etapa 8 — Apresentação (antigo)

- **Rota:** `/e/[slug]/admin/apresentar`, fora do menu (route group), em tela própria. Depende de 0, 2, 4, 6, 7.
- **Separação:** `apurar()` (pura) → `montarRoteiro()` + reducer do motor (sem JSX) → cenas (só desenham).
- **Pontos centrais:** palco 1920×1080 escalado; fases por urna × `resultadoRevelado`; ensaio não grava e tem selo; cenário do resultado real na toolbar; `obterEstadoAoVivo()` × `obterResultadoOficial()`; `useRelogioServidor` com deslocamento; `qrcode.react`; atalhos (`Espaço`, `→/Enter`, `←`, `T`, `F`, `Shift+E`, `Q`, `?`); sair da tela cheia **pausa**; roteiro da sala lista só nomes das cenas; pnpm; regra do React Compiler para timers.
- **Apuração (§8):** `pontuação(c) = Σ peso_grupo × votos_c ÷ total_grupo`; grupo desligado peso 0; **grupo com total 0 contribui 0**; **invariante "soma das pontuações = soma dos pesos"**; arredondar em 6 casas antes de comparar; ranking com posição compartilhada (1º, 1º, 3º); categorias desempatam por pontuação, senão co-vencedores. Tipo `ResultadoOficial` com `geradoEm`, `pesos` e `Grupo`/critério em minúsculas.
- **6 cenários:** padrão; empate no pódio resolvido; empate persistente **no 1º lugar**; co-vencedores; sem infantil; só 2 candidatos.
- **CPs:** 1 apuração/resultado/motor (sem tela); 2 rota/guarda/sala de controle; 3 palco e fases; 4 trailer; 5 categorias e controles; 6 pódio, classificação e final estático; 7 empates; 8 ensaio e emergência; 9 fechamento.
- **Pendências:** teclas; durações; modo de avanço; fim do trailer por API; direção visual; pódio com >3 nomes; persistência do progresso; `qrcode.react`.

### 5.6 Etapa 9 — Fechamento (antigo)

- **Natureza:** não cria telas. Auditoria de rotas, responsividade, acessibilidade, consistência de tema, fronteira de dados, roteiro de demo e checklist final.
- **Estrutura nova:** `not-found.tsx`, `error.tsx`, **`e/[slug]/not-found.tsx`**, `nav/RotaGuard.tsx`, `a11y/SkipLink.tsx`, `a11y/LiveRegion.tsx`, `mocks/cenarios.ts`, **`mocks/repo.ts`**, `docs/ROTEIRO-DEMO.md`, `MATRIZ-ROTAS.md`, `CHECKLIST-FASE1.md`, `FRONTEIRA-DADOS.md`.
- **Matrizes:** 6.1 rotas × papel (7 rotas); 6.2 telas × estado da urna (inclui **"Apresentação: ensaio apenas"** em rascunho, não iniciada e aberta); 6.3 larguras 360/414/768/1280/1920×1080/3840×2160.
- **CPs:** 1 navegação e guarda; 2 estados globais e 3 fluxos ponta a ponta; 3 responsividade; 4 acessibilidade (Lighthouse ≥ 90, axe sem críticos, "modo escuro do sistema, se mantido"); 5 consistência visual; 6 fronteira de dados (`repo.ts`, latência/falha simuladas, divergências mock × schema, MySQL × Postgres); 7 roteiro de demo, build de produção (`next start`), tag `fase1-prototipo`.
- **Roteiro de demo:** landing → evento (Semana Tech) → **votar no celular** → jurado → configuração → dashboard → **trocar para o Festival** → apresentação.
- **Fora:** `/totem` e `/totem/parear`; teste de carga.

---

## 6. Registro de inconsistências e conflitos (histórico)

> Todos os itens foram resolvidos nos planners finais. A coluna "Resolução" descreve o que se decidiu; em caso de dúvida, vale o planner final.

### 6.1 Legenda

- **Situação:** **R** = já resolvido pelo contrato (Etapa 0 Final ou Etapas 1–3), só falta reescrever o planner; **P** = parcialmente resolvido; **A** = em aberto (precisa decisão, ver seção 7).
- **Origem:** "Anexo B" = já listado no Anexo B da Etapa 0; **novo** = achado nesta análise.
- **Fonte:** onde o conflito se comprova (planner antigo, arquivo de negócio ou schema).

### 6.2 Mapa de renomeação (antigo → contrato)

| Antigo | Contrato |
|---|---|
| Enums minúsculos/snake: `rascunho\|ativo\|concluido`, `nao_iniciada\|aberta\|encerrada`, `publico\|jurado\|admin`, `popular\|juri\|infantil`, `juri\|publico` | MAIÚSCULAS do schema: `RASCUNHO`…, `NAO_INICIADA`…, `PUBLICO`…, `Grupo` `POPULAR\|JURI\|INFANTIL`, `RegraDesempate` `JURI\|PUBLICO` |
| `evento.modulos{juri,infantil}`, `estadoEvento`, janela início/fim | `moduloJuri`, `moduloInfantil`, `estado`, `janelaInicio`, `janelaFim` |
| `tema.logo`, `paleta`, `rotulos` | `logoUrl`, `corPrimaria/Secundaria/Fundo/Texto`, `rotuloCandidato` + `rotuloCandidatos` |
| `candidato.imagem` | `imagemUrl` |
| Convite: `código`, `hashFake`, `validade`, `resgatado por/em`, estado `expirado` | `hashCodigo`, `validadeAte`, `participacaoId`, `resgatadoEm`; expirado é derivado |
| `auditoria[]` `{tipo, ator, horário, detalhe}` | `banco.auditoria` `{acao, entidade, entidadeId, detalhes, atorUsuarioId, criadoEm}` |
| `contagens`, `exportacoesRegistradas`, `resultadoOficial` no store | Tudo deriva dos votos; exportação é `Auditoria`; `resultados[]` versionado (maior `versao`) |
| `ResultadoVoto { ok, motivo }` / `MotivoRejeicao` | `Resultado<T>` + `CodigoErro`: `urna_nao_aberta`→`URNA_NAO_ABERTA`, `urna_encerrada`→`URNA_ENCERRADA`, `ja_votou`→`JA_VOTOU`, `papel_invalido`→`PAPEL_INVALIDO`, `email_nao_verificado`→`EMAIL_NAO_VERIFICADO`, `candidato_indisponivel`→`CANDIDATO_INDISPONIVEL`, `rede`→`REDE`, `erro_interno`→`ERRO_INTERNO` |
| Modos de falha da Etapa 5 (Normal, Rede não gravou, Rede gravou, Urna encerra, Já votou outra sessão, Erro interno) | `ModoFalha` `NENHUMA`, `REDE_NAO_GRAVOU`, `REDE_GRAVOU`, `URNA_ENCERRA`, `JA_VOTOU_OUTRA_SESSAO`, `ERRO_INTERNO` (1 a 1) |
| `useRelogioServidor`, "deslocamento do relógio" | `useAgora()` + `avancar`/`irPara` |
| `usePolling(consulta, 5000)` | `useConsulta(consulta, { intervaloMs })` |
| `dashboard.queries.ts`, `*.actions.ts`, `repo.ts` | `servicos/*.ts` (ex.: `servicos/dashboard.ts`, `servicos/votacao.ts`) |
| `src/lib/embaralhar.ts`, `criarGeradorComSemente` | `lib/aleatorio.ts`, `criarGerador`, `embaralharComSemente`, `hashDeTexto` |
| `sessaoUi`, `selecionadoId` (E4) / `selecaoId` (E5) | bloco `ui` (um nome único a definir) |
| `src/mocks/seletores/*` | `src/store/seletores/*` |
| `src/features/*`, `components/votar`, `components/dashboard` | `components/*` por domínio e `dominio/*` para regras puras |
| `pnpm lint`, `pnpm build` | `pnpm lint`, `pnpm typecheck`, `pnpm build` (D20, rev. 2: `pnpm` se mantém; entra o `typecheck`) |
| `ImagemCandidato` em `components/votar` | `components/candidato/ImagemCandidato` (E0) |
| `lib/contraste.ts`, `lib/codigos.ts`, `lib/csv.ts` (E6) | `contraste.ts` e `codigos.ts` são da E0; `csv.ts` é da E6 e a E7 só reutiliza |
| `AcessoNegado` (E7), `ConfigShell` (E6), guardas por tela (E4, E6, E7, E8) | `RotaGuard` + `AcessoRestrito` + `AdminShell` (E0) |
| "Cenário de candidatos" na toolbar (E4) | Cenários registrados (`SEM_CANDIDATOS`, `MUITOS_CANDIDATOS`) |
| `placeholders em public/mock/` | `imagemUrl: "placeholder:<n>"` (D16) |

### 6.3 Conflitos transversais (mais de uma etapa)

| ID | Etapas | Conflito | Sit. | Origem | Ação na mescla |
|---|---|---|---|---|---|
| T1 | 4, 5, 6, 7, 8, 9 | Enums em minúsculas/snake (ver 6.2) contra D10 | R | **novo** | Converter todos os tipos, textos de matriz e exemplos |
| T2 | 6, 7 | Nomes de campos do store divergem do schema (ver 6.2) | R | Anexo B (parcial) | Reescrever contra `dominio/tipos.ts` |
| T3 | 4, 5, 6, 7, 8 | Store `Context + useReducer` em `/e/[slug]`; `sessaoUi`; seleção no store | R | Anexo B | Usar store externo da E0 e `ui` |
| T4 | 4–9 | Pastas e rotas próprias (`features/`, `mocks/*.actions`, `mocks/seletores`, `repo.ts`, `votar` fora de `(participante)`, `_components` dentro da rota) | R | Anexo B (parcial) | Seguir a estrutura da seção 4.10; `votar` em `(participante)` |
| T5 | 4, 5, 8 | Validação só com `tsc`/`lint`/`build` sem `typecheck` | R | Anexo B | `pnpm lint`, `pnpm typecheck`, `pnpm build` (o `pnpm` das Etapas 5 e 8 estava certo; a rev. 1 da Etapa 0 o trocava por `npm` por engano) |
| T6 | 4–9 | Fora do modelo do Anexo A: sem 3.1/3.2, sem "O que fica fake" (4, 7), CPs chamados "Checkpoint N" (7), **sem `Entrega: zip` por CP** (4, 6, 7, 9), "regras de entrega" repetidas (5, 8) | R | **novo** | Reescrever no modelo; remover regras repetidas |
| T7 | 5, 7, 8 | Retorno de serviços fora de `Resultado<T>`: `ResultadoVoto`, `{ erro: "nao_autorizado" }`, consultas sem formato; latência 600–900 ms em vez da global | R | Anexo B | Mapa da seção 6.2; latência global |
| T8 | 7, 8 | `usePolling`, `useRelogioServidor`. **Novo:** o ensaio da E8 usa "relógio comprimido"; se usar o relógio global, o tique da E0 pode fechar a urna e alterar o estado real | P | **novo** | Ensaio com relógio **local** do palco, sem tocar o store |
| T9 | 4, 6, 7, 8, 9 | Componentes duplicados: `ImagemCandidato`, `Dialogo` próprio (E4), `DialogoConfirmacao` (E6), `AcessoNegado` (E7), `ConfigShell` (E6) × `AdminShell` (E0, E7), `RotaGuard`/`SkipLink`/`LiveRegion` (E9), `contraste.ts`/`codigos.ts` (E6), `csv.ts` duas vezes (E6, E7) | R | Anexo B (parcial) | Remover entregas duplicadas; `AdminShell` só ganha abas e banner |
| T10 | 4, 5 | **Gênero e artigo nos textos** (D10 da E2): "Escolher este candidato", "Votar neste {rótulo}", "Você faz parte deste projeto", "Os candidatos ainda não foram publicados", "Você escolheu X" | R | **novo** | Textos neutros via `textoDoEstado`; chaves novas em `TextosEstado` |
| T11 | 4, 5, 7, 8 | Seeds próprios: ≥6 candidatos + casos de borda (E4), usuários próprios (E5), "8 candidatos, os mesmos das Etapas 4 e 5" (E7), fixtures por cenário (E8) | R | Anexo B (parcial) | Usar o seed da E0 (8 votáveis na Semana Tech, 6 no Festival) |
| T12 | 5, 7, 6, 8 | **Sem catálogo de `acao` de auditoria.** A E5 diz "sem auditoria real", mas a E7 resume "alterações de voto do júri" e `Jurado.md` §10 exige auditar alterações | A | **novo** | Definir catálogo único (seção 7, A12) e fazer `votarJuri` registrar |
| T13 | 6, 7, 8, 9 | **Estados incoerentes forçados pela toolbar** (D17): ex. `CONCLUIDO` + urna `ABERTA`, `RASCUNHO` + `ENCERRADA`. As etapas 6–9 assumem combinações coerentes | P | **novo** | Aplicar a precedência da E1 (`CONCLUIDO` > `RASCUNHO` > urna) em cada tela e documentar o comportamento |
| T14 | 4, 5, 6, 7, 8 | **`TEMPO_ESGOTADO`** (urna `ABERTA` além de `janelaFim`, com encerramento automático desligado): E4/E5 não dizem se ainda se pode votar; E8 repete "encerra sozinho" (a E0 já faz isso no tique) | A | **novo** | Votar continua permitido (D7); mostrar aviso; remover o auto-encerramento da E8 |
| T15 | 4, 5, 6, 7, 8 | **Desqualificado:** regra espalhada. A E4 só o filtra, a E6 o cria, E7/E8 o ignoram no ranking. **Base de normalização** do grupo (total inclui ou exclui votos do desqualificado?) não definida | A | **novo** | Decisão A4; documentar em `apurar` |
| T16 | 4–9 | Citações do DD (`DocumentDesign.md`) não verificáveis | A | **novo** | Manter "(a confirmar no DD)" onde o DD é a única fonte |
| T17 | 5, 7, 8 | **Toolbar com controles duplicados:** a E0 já tem "Falha no próximo envio", "Entrar como", "E-mail verificado" e `simularVotosEntrando`; E5, E7 e E8 recriam. "Parcial por candidato" aparece em E7 e E8 | P | Anexo B (parcial) | Seções de etapa só com o que é novo; **um só campo** `ConfigApresentacao.parcialAoVivo` |
| T18 | 6, 7, 8 | `ui` cresce sem dono nomeado (seleção, passo, progresso da revelação, `resultadoRevelado`) | A | **novo** | Definir os campos na etapa dona e registrar na seção 4.9 |

### 6.4 Por etapa

#### Etapa 4 — Candidato

| ID | Conflito | Sit. | Origem | Ação na mescla |
|---|---|---|---|---|
| E4-1 | **Seleção e `BarraSelecao`** nascem aqui (D2, CP3) e na E5 CP3 com semântica diferente (`aria-pressed` × radio; `selecionadoId` × `selecaoId`; "Escolher" × "Votar neste") | R | Anexo B | Seleção vai para a E5; a E4 entrega lista, cartão, detalhe, ordem e a gate **até a lista** |
| E4-2 | **Gate duplicada com a E5** (8 passos × 8 linhas, assinaturas diferentes: `resolverEstadoVotar(estado)` × `(sessao, evento, candidatos, participacao)`). A E0 dá a função à E4 | P | Anexo B (parcial) | A E4 define o contrato único; a E5 consome |
| E4-3 | **A gate não compõe `resolverVisaoEvento`** (D1 da E2 manda compor). Faltam: evento `CONCLUIDO`, `RASCUNHO`, `INDISPONIVEL`, jurado com módulo júri desligado, `TEMPO_ESGOTADO` | A | **novo** | Definir como `resolverEstadoVotar` usa `situacao`/`variante` e quais telas de estado existem |
| E4-4 | **Passos 2 e 3 da gate** (sem login, e-mail não verificado) já são do `RotaGuard` (`LOGADO`, `EMAIL_VERIFICADO`, redireciona com `?de=`) | R | **novo** | Remover da gate; ela começa depois do `RotaGuard` |
| E4-5 | `notFound()` no servidor para slug inexistente | R | Anexo B | Gate de cliente da E0 (D14) |
| E4-6 | Rota `votar/page.tsx` fora de `(participante)` | R | Anexo B | `(participante)/votar/page.tsx` |
| E4-7 | `lib/embaralhar.ts` e `criarGeradorComSemente` | R | Anexo B | `lib/aleatorio.ts` |
| E4-8 | Seletores em `src/mocks/seletores`: o lint proíbe importar `@/mocks` em componentes | R | **novo** | `store/seletores/candidatos.ts` |
| E4-9 | Seed ≥6 por evento, placeholders `public/mock/*`, cenários "Sem candidatos"/"Muitos (24)" na toolbar | R | Anexo B | Seed da E0 (8/6), D16, cenário registrado `MUITOS_CANDIDATOS` |
| E4-10 | **"Seu voto atual" do jurado (CP5)** exige ler o `VotoJuri` por serviço (`consultarEstadoVoto`, E5). A E0 já traz o Fábio no seed | A | **novo** | Mover para a E5 (preferível) |
| E4-11 | Aviso "Seu voto é identificado para a organização" aparece na E4 (CP5) e de novo na revisão da E5 (CP6) | A | **novo** | Um só dono (a E5) |
| E4-12 | **Candidato vinculado (D6):** a E4 bloqueia sem consultar `evento.bloquearVotoProprio`; a E5 diz "sem efeito na Fase 1, o mock não liga candidato a participante", mas o seed liga Gabi a `cand-st-08` e `cand-fv-03` | A | **novo** | Decisão A5 (flag, código de erro e quem valida no serviço) |
| E4-13 | "Admin acessando `/votar`" deixado em aberto | R | Anexo B | "Administradores não votam" (D13) |
| E4-14 | Ordem por semente `usuarioId + eventoId`, "estável **até no F5**": F5 volta ao seed e à sessão deslogada | P | **novo** | Estável **por usuário**, não "após F5" |

#### Etapa 5 — Votos

| ID | Conflito | Sit. | Origem | Ação na mescla |
|---|---|---|---|---|
| E5-1 | Mesmos conflitos E4-1 e E4-2 (do lado da E5) | R/P | Anexo B | Ver E4 |
| E5-2 | Gate com sem sessão/e-mail não verificado/admin como linhas 1–3 | R | **novo** | `RotaGuard` cobre 1 e 3; admin vira tela "Administradores não votam" |
| E5-3 | **Premissas desatualizadas:** Context + `useReducer`, `sessaoUi`, `ResultadoVoto`, `MotivoRejeicao`, latência 600–900 ms, `features/votar`, pnpm | R | Anexo B | Ver 6.2 |
| E5-4 | **Toolbar da E5** recria "participação sem voto/já votou" e "e-mail verificado". A E0 já tem "Entrar como", e-mail verificado e "Falha no próximo envio" | P | **novo** | Só "Resetar meu voto" (via `dev.vinculosVoto`) e o inspetor |
| E5-5 | **Histórico do jurado só na alteração** (A→B = 1 entrada). A **invariante 4** exige ≥1 entrada por `VotoJuri`, o seed do Fábio tem 1 entrada e o schema deixa `candidatoAnteriorId` opcional | A | **novo** | O **primeiro voto** também cria entrada (anterior `null`). Corrigir a validação do CP6 (A→B = 2 entradas) |
| E5-6 | **Invariante 3 e `vinculosVoto`:** `votarPopular` deve gravar `Voto`, `Participacao.votou` e `dev.vinculosVoto` de forma atômica, senão "Resetar meu voto" e o invariante quebram | A | **novo** | Documentar no contrato do serviço |
| E5-7 | "Recarregar `/votar` depois do sucesso cai em 'Você já votou'": **F5 volta ao seed**, então Ana volta a "não votou". Só vale a navegação interna | A | **novo** | Reescrever o critério para navegação por `Link`/botão voltar |
| E5-8 | "Já votou em outra sessão" e "votar em outra aba" supõem estado compartilhado | R | Anexo B (parcial) | Manter só como falha simulada (`JA_VOTOU_OUTRA_SESSAO`) |
| E5-9 | **Voto em si mesmo** "sem efeito". O schema (`bloquearVotoProprio`) e o seed exigem o bloqueio. `CodigoErro` não tem código | A | **novo** | Decisão A5 |
| E5-10 | Auditoria: "sem auditoria real", mas `Jurado.md` §10 e a E7 precisam das alterações do júri | A | **novo** | T12 |
| E5-11 | `useConsulta` para `consultarEstadoVoto`; contador de depuração "votos no banco" **leria `votos` em tela** (D4 proíbe) | P | Anexo B (parcial) | Contador vira o `InspetorEstado` da toolbar |
| E5-12 | Tela de sucesso e "já votou": textos fixos ("Voto registrado/atualizado"), sem `textoDoEstado` (`SUCESSO`, `JA_VOTOU`, `JURADO_JA_VOTOU`) | A | **novo** | Usar a E2; "Votar neste {rótulo}" fere D10 (T10) |
| E5-13 | **`URNA_ENCERRA`** muda a urna no envio: precisa passar por `transicoes.encerrarUrna` (que congela o resultado, E7) | A | **novo** | Citar D8 no serviço |
| E5-14 | `?passo=` na URL convive com `?candidato=` da E4 | A | **novo** | Definir os dois parâmetros e a ordem de precedência |
| E5-15 | Admin só no CP2; jurado com **módulo júri desligado** não tratado (D6 da E2) | A | **novo** | Incluir na gate |
| E5-16 | Estado `PUBLICO` com e-mail verificado **sem participação** (papel `null`) | P | **novo** | Tratar como público (D4 da E2) e definir a criação no primeiro acesso a `/votar` (P8 da E3) |

#### Etapa 6 — Configuração

| ID | Conflito | Sit. | Origem | Ação na mescla |
|---|---|---|---|---|
| E6-1 | **Contraste** "limiar 4,5:1 adotado como padrão" e `lib/contraste.ts` próprio; formulário de tema; preset Festival "reproduz o visual atual" | R | Anexo B | `contraste.ts` da E0; sem `corSobrePrimaria`; texto×fundo < 4,5:1 bloqueia, primária/secundária×fundo < 3:1 avisa; preset = tema do seed com as exceções da D15 |
| E6-2 | `lib/codigos.ts` e `lib/csv.ts` | R | Anexo B | `codigos.ts` é da E0; `csv.ts` é da E6 |
| E6-3 | Convite com `código`/`hashFake` no estado | R | Anexo B | Só `hashCodigo`; código visível uma vez no diálogo |
| E6-4 | **Ordem dos candidatos** "igual na votação" (CP3) | R | Anexo B | A votação embaralha por usuário; critério vira dashboard, telão e lista do admin |
| E6-5 | Aceite "votar em **outra aba** (mesma sessão)" (CP8) | R | Anexo B | "Na mesma aba" |
| E6-6 | `auditoria[]` e **auditoria duplicada:** `transicoes` (E0) já audita `EVENTO_ATIVADO`, `URNA_ABERTA`, `URNA_ENCERRADA`, `EVENTO_CONCLUIDO`; a E6 diz "cada ação grava auditoria" | P | Anexo B (parcial) | Não registrar de novo nas ações de estado |
| E6-7 | Cenários da §8 (rascunho incompleto etc.) **sem checkpoint** que os implemente | R | Anexo B | Virar cenários registrados da E6 |
| E6-8 | **"Rascunho incompleto" com pesos 50/30** viola a **invariante 2** (soma 100, sempre). A toolbar exige invariantes vazias depois de cada ação | A | **novo** | Decisão A10 (cenário sem violar o invariante) |
| E6-9 | **Matriz de travas sem coluna "Ativo + urna não iniciada".** A E9 (6.2) assume "Livre" | A | **novo** | Acrescentar a coluna (A6) |
| E6-10 | **Slug renomeado × `dev.slugPadrao`:** D11 permite renomear (a chave é `id`), mas `slugPadrao` guarda a **string** do slug; ao renomear o evento padrão, a landing e o fallback de `useEventoAtivo` apontam para um slug que não existe | A | **novo** | O serviço de salvar o Geral atualiza `dev.slugPadrao` (A9) |
| E6-11 | `GuardaPapel`/`ConfigShell` próprios (CP1) e chips de estado no cabeçalho | P | Anexo B (parcial) | `RotaGuard` do layout `(painel)` e `AdminShell` |
| E6-12 | **Pesos "Travado" após abrir a urna** × `VotoInfantil.md` §12 ("travar ao abrir, **com alteração auditada**") e `Jurado.md` §12 | A | **novo** | Decisão A2 |
| E6-13 | Checklist exige "totem pareado" (infantil) e "trailer testado": não há UI nem campo (`Dispositivo` só leitura; `ConfigApresentacao` por seed) | R | Anexo B | Derivar do seed, só **avisos** |
| E6-14 | Desqualificar "resultado recalculado como novo registro" | R | Anexo B (parcial) | Nova versão `DESQUALIFICACAO` (D9); efeito só validável na E7 (seção 2.3) |
| E6-15 | Fontes "4 a 6 pré-aprovadas" | P | **novo** | A E0 traz 3 provisórias (Inter, Poppins, Space Grotesk) |
| E6-16 | `PreviaTema` com "CSS variables escopadas" e aba **Telão** | P | **novo** | Usar `lib/tema.ts` (`calcularTokens`) escopado; Telão simplificado (seção 2.3) |
| E6-17 | Campos extras: remover/renomear `CampoCandidato` com valores já preenchidos em `camposExtras` (chave por `chave`) | A | **novo** | Definir regra para `chave` (imutável após criar?) |
| E6-18 | **`bloquearVotoProprio`, `metodoIdentificacao` e `prazoAnonimizacaoDias`** existem no schema e não têm tela na E6 (P4 da E3 espera a configuração do método aqui) | A | **novo** | Decidir se entram na seção Geral ou ficam por seed |
| E6-19 | Concluir leva ao dashboard em leitura (E9 CP1) e "digitar o nome do evento" no diálogo | P | **novo** | Alinhar com `DialogoConfirmacao` da E0 (confirmação por digitação já existe) |

#### Etapa 7 — Dashboard

| ID | Conflito | Sit. | Origem | Ação na mescla |
|---|---|---|---|---|
| E7-1 | **Dois donos do resultado:** `calcularResultado`/`congelarResultado` (E7) × `apurar`/`ResultadoOficial` (E8). Forma de empate diferente (`empate: true` × `empates[]` com `resolvido`) | R | Anexo B | **E7 é dona**; absorver o §8 da E8 (tolerância, grupo total 0, posições compartilhadas, categorias) e o tipo da E0 |
| E7-2 | Contagens incrementais no store (`contagens`) | R | Anexo B | Tudo deriva de `votos`/`votosJuri`/`votosInfantis` |
| E7-3 | Gatilho do congelamento só cita toolbar e botão da E6; esquece o relógio | R | Anexo B | Sempre `transicoes.encerrarUrna` (D8) |
| E7-4 | "Nunca recalculado" × desqualificar após encerrar | R | Anexo B | Nova versão (D9) |
| E7-5 | `usePolling`, `dashboard.queries.ts`, `mocks/*` | R | Anexo B | `servicos/dashboard.ts` + `useConsulta` |
| E7-6 | `AdminShell`, `AcessoNegado`, guard próprio | R | Anexo B | `AdminShell`/`RotaGuard`/`AcessoRestrito` da E0; só acrescenta abas e banner |
| E7-7 | `lib/csv.ts` recriado | R | Anexo B | Reutilizar o da E6 |
| E7-8 | Números de convites "2 disponíveis" e 12/9/1 | R | Anexo B | 12 = 9 usados + 1 revogado + 1 disponível + 1 expirado |
| E7-9 | Admin "só do evento ativo" | R | Anexo B | Carla nos dois; Hugo só no Festival (acesso negado entre eventos) |
| E7-10 | **Série de 90 min com pico no minuto 55**, mas `urnaAbertaEm` é 13h e `T0` é 14h: só existem **60 min** de dados | A | **novo** | Ajustar para 60 min (pico por volta de 2/3 do período) |
| E7-11 | **"Simular votos entrando"** (+N a cada 3 s) incrementa votos sem criar participações; viola a **invariante 3** | A | **novo** | Cada voto simulado cria usuário e participação `PUBLICO` com `votou` |
| E7-12 | **Estados do painel sem linha de Rascunho** (a E9 diz "Operação vazia") | A | **novo** | Acrescentar (e aplicar T13) |
| E7-13 | **Base de normalização** com candidato desqualificado e **grupo ativo sem votos** | A | **novo** | T15 e A3 |
| E7-14 | "Parcial por candidato" como chave da toolbar e opção por evento; o schema tem **`ConfigApresentacao.parcialAoVivo`** (usada também na E8) | R | Anexo B | Uma só flag |
| E7-15 | **Resultado visível ao admin logo após o encerramento** (`Dashboard.md` §5) × cerimônia no telão (`ModoApresentacao.md` §10: "nada de resultado antes da revelação") com tela possivelmente espelhada | A | **novo** | Aviso na aba Resultado ou decisão A17 |
| E7-16 | Seed de volume e **cenários da E8** (`RESULTADO_*`) devem respeitar as invariantes 3 e 4 | A | **novo** | O gerador do volume é reutilizável pela E8 (seção 2.3) |
| E7-17 | Empate persistente "ex.: 6º" (E7) × "empate persistente no 1º lugar" (cenário 3 da E8). Festival tem **6** votáveis: "6º" é o último lugar | A | **novo** | Unificar os cenários |
| E7-18 | Totens `PAUSADO` e `REVOGADO` com votos no seed de volume: `VotoInfantil.md` §9 diz que voto de dispositivo pausado/revogado "é rejeitado e não conta" (**antes** da pausa o voto vale) | A | **novo** | Decidir se o seed conta os votos históricos desses totens |
| E7-19 | `relatorio` está **dentro** de `(painel)` (E0), então herda o `AdminShell`; a impressão precisa escondê-lo | P | **novo** | CSS de impressão oculta o shell |
| E7-20 | `Dashboard.md` lista 3 estados de código (disponível, usado, revogado); a E7 acrescenta "expirados" | R | **novo** | Expirado é derivado (consistente com o schema) |

#### Etapa 8 — Apresentação

| ID | Conflito | Sit. | Origem | Ação na mescla |
|---|---|---|---|---|
| E8-1 | **Toolbar oculta no palco** (E0 antiga) × validação "pela toolbar" | R | Anexo B | `Alt+D` → `FORCADA` (E0 §5.9); reescrever a validação |
| E8-2 | `Alt+D` é atalho do navegador (foco na barra de endereço no Chrome/Edge/Firefox do Windows e Linux); não se sabe se a página consegue sobrescrever | A | **novo** | Validar no CP6 da E0 ou prever tecla alternativa (A14) |
| E8-3 | Apuração e `ResultadoOficial` próprios; `Grupo` e critério em minúsculas; `geradoEm`/`pesos` | R | Anexo B | Consumir os da E7; `calculadoEm`, `pesoPopular/Juri/Infantil` |
| E8-4 | 6 cenários e fixtures próprias (independentes dos votos da E5) | R | Anexo B (parcial) | Cenários registrados; **fixtures puras** compartilhadas entre o ensaio (local) e o cenário (altera estado). **Novo:** respeitar invariantes 3 e 4 |
| E8-5 | `useRelogioServidor`, pnpm, rota `(painel)` "move" | R | Anexo B | `useAgora`; `pnpm` mantido (rev. 2); `apresentar` já está fora de `(painel)` |
| E8-6 | **Invariante "soma das pontuações = soma dos pesos"** falha quando um grupo ligado tem total 0 (caso que o próprio planner permite) | A | **novo** | Decisão A3 |
| E8-7 | **"Refazer revelação"** diz refazer só a cerimônia; `resultadoRevelado` não existe em `Banco` nem em `EstadoUi` | A | **novo** | Campo em `ui`; e se surgir **nova versão** do resultado, a revelação reinicia? (A13) |
| E8-8 | **Rótulos de categoria "vêm do tema"**, mas estão em `ConfigApresentacao` (`rotuloCategoria*`) | A | **novo** | Fonte correta: `configApresentacao` |
| E8-9 | **Duração/tempo limite do trailer** "configurada no seed": o schema **não tem esse campo** | A | **novo** | Constante em `duracoes.ts` ou campo mock-only (A18) |
| E8-10 | **Modo de avanço** na sala de controle × `ConfigApresentacao.modoAvanco` | A | **novo** | Valor inicial do schema, override local em `ui` |
| E8-11 | "Tempo zerado: encerra sozinho" no palco | R | **novo** | Já feito pelo tique do relógio (E0); o palco só reage |
| E8-12 | Fases só por urna; **sem linha para evento `RASCUNHO` ou `CONCLUIDO`** | A | **novo** | A8 e T13 |
| E8-13 | **D18 (instância única):** o roteiro de espelhamento/extensão de tela só funciona **na mesma janela**; abrir o palco em outra aba reinicia o seed | A | **novo** | A15; avisar na sala de controle |
| E8-14 | `qrcode.react` e URL do QR | P | **novo** | Montar a URL com `window.location.origin` + slug atual (cliente) |
| E8-15 | "Pódio inclui todos com posição ≤ 3" (pode ter >3 nomes) × `ModoApresentacao.md` §5 (só trata "menos de 3") | A | `ModoApresentacao.md` | Manter como extensão, registrar pendência |
| E8-16 | Desqualificação após encerrar gera nova versão: a revelação já feita fica **desatualizada** | A | **novo** | A13 |
| E8-17 | Candidatos do palco/trailer: só votáveis, ordem por `ordem` (sem embaralhar) | P | Anexo B (parcial) | Declarar |
| E8-18 | `Dashboard` e `ModoApresentacao` leem a **maior `versao`** (D9); a E8 diz "gerado uma vez ao encerrar" | R | Anexo B | Reescrever |

#### Etapa 9 — Fechamento

| ID | Conflito | Sit. | Origem | Ação na mescla |
|---|---|---|---|---|
| E9-1 | `repo.ts` como fronteira de dados | R | Anexo B | A fronteira é `servicos/`; `FRONTEIRA-DADOS.md` documenta os serviços |
| E9-2 | `RotaGuard`, `SkipLink`, `LiveRegion` como entregas | R | Anexo B | Já existem (E0); só auditar |
| E9-3 | Matriz 6.2: "Apresentação: ensaio apenas" em rascunho, não iniciada e aberta | R | Anexo B | Fases reais de pré-votação e ao vivo |
| E9-4 | Toolbar "não aparece no build de produção" × roteiro em `next start` com cenários | R | Anexo B | Controlada por flag |
| E9-5 | "Modo escuro do sistema, se mantido" | R | Anexo B | Removido (D15) |
| E9-6 | Rotas auditadas sem `verificar-email`, `recuperar-senha`, `relatorio` | R | Anexo B | Incluir (e `/dev/ui`) |
| E9-7 | Roteiro "votar no celular → dashboard" | R | Anexo B | "Celular" é viewport/emulação, na **mesma instância** |
| E9-8 | `cenarios.ts` "consolidando as Etapas 2, 6, 7 e 8" | R | Anexo B (parcial) | Consolidar também 1, 3 e 4 (seção 4.7) |
| E9-9 | **Matriz 6.1** descreve `/convite` para jurado como "Redirecionar" e para admin como "Bloquear"; a E3 mostra **avisos** ("Você já é jurado", "Contas administrativas não resgatam convite") | A | **novo** | Alinhar às telas da E3 |
| E9-10 | Matriz 6.1 `/votar` admin "Bloquear ou só visualizar" | R | Anexo B | "Administradores não votam" (D13) |
| E9-11 | **`e/[slug]/not-found.tsx`** (evento inexistente) × D14 (gate de cliente, sem `notFound()` de slug) | A | **novo** | Manter só `not-found.tsx` global e `error.tsx`; `EventoNaoEncontrado` é da E0 |
| E9-12 | **Latência e falha simuladas** como tarefa do CP6 | R | **novo** | Já entregues (D5); só validar |
| E9-13 | "powered by VaiVota" **no telão** | A | **novo** | O telão não o prevê em nenhum outro planner (A16) |
| E9-14 | Matriz 6.2 "Configuração: Livre em Não iniciada" | A | **novo** | Depende de E6-9 |
| E9-15 | Lighthouse ≥ 90 "em todas as rotas" inclui stubs, `/dev/ui` e o palco | A | **novo** | Delimitar as rotas medidas |
| E9-16 | Meta "Lighthouse ≥ 90" × contraste do Festival (texto branco sobre laranja ≈ 3,4:1) | R | Anexo B | Resolvido por D15 |

### 6.5 Planners × arquivos de negócio, e conflitos entre as próprias fontes

| ID | Onde | Conflito | Sit. | Ação |
|---|---|---|---|---|
| F1 | `VotoInfantil.md` §12, `Jurado.md` §12 × E6 | Pesos: as fontes recomendam **travar ao abrir a urna com alteração auditada**; a E6 trava totalmente | A | A2 |
| F2 | `Dashboard.md` §4 × `ModoApresentacao.md` §4 e §9 | "Parcial por candidato" é opção do dashboard; "mostrar votos por candidato ao vivo" é de `ConfigApresentacao`. No schema é **uma só** (`parcialAoVivo`) | R | E7 e E8 usam a mesma flag |
| F3 | `Dashboard.md` §5 × `ModoApresentacao.md` §10 | Resultado ao admin logo após o encerramento × "nada de resultado antes da revelação" | A | A17 |
| F4 | `Jurado.md` §5, schema, E5 | Histórico do júri: schema permite `candidatoAnteriorId` nulo; a E5 só registra alterações | A | A11 |
| F5 | `Jurado.md` §7 × `ModoApresentacao.md` §6 | Desempate: "maior nota do júri/público" no ranking final; "pontuação final" nas categorias | R | `DadosResultado` já separa `criterioAplicado` e `desempatadoPorPontuacao` |
| F6 | `Jurado.md` §7, E8 §8 | Fórmula normaliza por grupo; com **total 0** a divisão é indefinida. Pendência do DD ("grupo ativo sem nenhum voto") | A | A3 |
| F7 | `VotoInfantil.md` §9 | Voto de totem pausado/revogado "não conta": refere-se a votos rejeitados depois da pausa | A | E7-18 |
| F8 | `Login.md` §10, schema | Voto em si mesmo: pendência no DD; o schema traz `bloquearVotoProprio = true` e `Candidato.usuarioVinculadoId` | A | A5 |
| F9 | `Login.md` §8, `Jurado.md` §10 | Rate limiting também em **login e voto** (não só em código de convite) | A | A12: simular só o bloqueio de código (E3) ou ampliar |
| F10 | `ModoApresentacao.md` §7 | Trailer: tempo limite e duração sem campo no schema | A | E8-9 |
| F11 | `Dashboard.md` §7 | Retenção de dados pessoais: o schema tem `prazoAnonimizacaoDias` e `Usuario.anonimizadoEm`; a Fase 1 não tem tela | R | Fora da Fase 1 (E7 pendência 7) |
| F12 | schema (`CodigoPareamento`, `ConviteAdmin`) | Existem no schema, **fora da Fase 1** | R | Declarar nas Pendências da E9 (divergências mock × schema) |

---

## 7. Decisões em aberto

**[Usuário]** exige decisão do dono do produto. **[Mescla]** Claude propõe e registra como D novo no planner. As propostas abaixo **não foram decididas pelo usuário**.

| ID | Tema | Quem | Proposta |
|---|---|---|---|
| A1 | Marca do Festival: texto escuro sobre `#F15A29` ou escurecer a primária | [Usuário] | Já pendente na E0, E1 e E2. Padrão assumido: texto escuro |
| A2 | Pesos e desempate **após abrir a urna**: travados (E6) ou "travar com alteração auditada" (fontes) | [Usuário] | Fase 1: manter trava total e registrar a pendência, com a ação auditada como evolução |
| A3 | Grupo ligado sem votos (total 0) na fórmula | [Usuário] | Contribui 0; invariante vira "soma = soma dos pesos dos grupos com total > 0"; aviso na Operação |
| A4 | Votos de candidato desqualificado na base de normalização | [Usuário] | Excluir da base de normalização do ranking; manter na contagem bruta |
| A5 | Voto em si mesmo | [Mescla] | Respeitar `bloquearVotoProprio` do evento (padrão `true`); novo `CodigoErro` `VOTO_PROPRIO` validado no serviço e no cartão (cartão desabilitado); sem tela de configuração na E6 |
| A6 | Matriz de travas: coluna "Ativo + urna não iniciada" | [Mescla] | Igual à de rascunho, exceto slug |
| A7 | `TEMPO_ESGOTADO` em `/votar` | [Mescla] | Continua votável (D7), com aviso |
| A8 | Palco em `RASCUNHO` e `CONCLUIDO` | [Mescla] | Rascunho: pré-votação; concluído: final estático |
| A9 | Renomear slug do evento padrão | [Mescla] | O serviço que salva o Geral atualiza `dev.slugPadrao` (sem errata na E0) |
| A10 | Cenário `RASCUNHO_INCOMPLETO` e invariante 2 | [Mescla] | Pesos continuam somando 100; o "incompleto" vem de 1 candidato, sem convites e janela inválida |
| A11 | Histórico inicial do voto do júri | [Mescla] | Primeiro voto cria entrada (anterior `null`) |
| A12 | Catálogo de `acao` da auditoria | [Mescla] | Lista única no contrato (ver 7.1); rate limit simulado só no código de convite |
| A13 | `resultadoRevelado` e nova versão do resultado | [Mescla] | Campo em `ui`; nova versão reinicia a revelação |
| A14 | `Alt+D` × atalho do navegador | [Mescla] | Validar; se falhar, tecla alternativa na toolbar (errata mínima na E0) |
| A15 | Palco na mesma janela (D18) | [Mescla] | Aviso na sala de controle |
| A16 | "Powered by VaiVota" no telão | [Usuário] | Discreto, só no final estático |
| A17 | Spoiler na aba Resultado do dashboard | [Usuário] | Aviso fixo "Resultado: não exibir em tela espelhada antes da revelação" |
| A18 | Duração/tempo limite do trailer | [Mescla] | Constantes em `duracoes.ts`, sem campo novo |
| A19 | Votos de totens pausados/revogados no seed de volume | [Mescla] | Contam (votos históricos) |

**Situação na rev. 3** (detalhes na seção 11). Os itens [Usuário] desta tabela foram decididos assim:

| ID | Decisão |
|---|---|
| A1 | Continua pendente (rev. 3, E1) |
| A2 | Trava total no MVP; alteração auditada é evolução (rev. 3, C4) |
| A3 | **Mudou:** o peso do grupo sem votos é redistribuído proporcionalmente entre os grupos com votos (rev. 3, C3) |
| A4 | Confirmado: desqualificados fora da base de normalização (rev. 3, C3) |
| A15 | Mantido no protótipo; palco em janela própria na fase com banco (rev. 3, E19) |
| A16 | Confirmado (rev. 3, E25) |
| A17 | **Mudou:** números da aba Resultado ocultos até "Mostrar resultado" (rev. 3, C17) |

### 7.1 Ações de auditoria já definidas e sugeridas

- **Já definidas (E0 e E3):** `EVENTO_ATIVADO`, `URNA_ABERTA`, `URNA_ENCERRADA` (com `origem`), `EVENTO_CONCLUIDO`, `CONVITE_RESGATADO`, `TENTATIVA_CODIGO_INVALIDA`, `BLOQUEIO_RATE_LIMIT`.
- **A definir (sugestão):** `VOTO_JURI_ALTERADO` (E5), `CONVITES_GERADOS`, `CONVITE_REVOGADO`, `CANDIDATO_DESQUALIFICADO`, `CANDIDATO_EDITADO_COM_URNA_ABERTA`, `TEMA_ALTERADO`, `CONFIG_ALTERADA` (E6), `EXPORTACAO_CSV`, `RELATORIO_GERADO` (E7), `REVELACAO_INICIADA`, `REVELACAO_REFEITA`, `EMERGENCIA_ACIONADA` (E8, só modo real).

### 7.2 Notas sobre o contrato (Etapa 0 Final) que viraram errata

A Etapa 0 **rev. 2** incorporou as errata mínimas pedidas pelas Etapas 5 a 8 (lista completa e com os pontos de edição no **Anexo C** dela). Resumo:
1. `dev.vinculosVoto` com chave `usuarioId:eventoId` (E5). `simularFalha({ consumirPontual })` (E5 e E7). `OrigemEncerramento = MANUAL | AUTOMATICO | TOOLBAR | FALHA_SIMULADA` (E5 e E6).
2. `AcaoAuditoria`: união única com as **21** ações (E6, E7 e E8); `registrarAuditoria` com `criadoEm` opcional (E7). `aplicarVotoPopular` e `aplicarVotoJuri` **não** são da Etapa 0: são da Etapa 5 e já recebem o instante em `agoraMs`.
3. `congelarResultado(estado, eventoId, motivo, opcoes?)` com a assinatura final; `calculadoPorId` aceita `null` (E6 e E7).
4. `TemaEvento` com `tema` por prop (precedência sobre o hook); `LogoEvento` e `ImagemCandidato` aceitando `blob:` (E6).
5. `data-print="ocultar"` em `AdminShell`, `DevToolbar`, `SkipLink` e contêiner do `Toast`; `Abas` controlada e com aba desabilitada com dica; `criarEstadoNucleo` separado de `criarEstadoInicial` (E7).
6. `EstadoUi.apresentacao`, `EstadoDev.simularTrailerFalha`, zeragem de `ui.apresentacao` em `resetarMock`, `aplicarCenario` e `forcarEstadoUrna` para trás, e `--qr-claro`/`--qr-escuro` em `globals.css` (E8). O catálogo de exibição da auditoria (E7) ganha os quatro rótulos e `qrcode.react` é instalado **no CP1 da Etapa 8**.
7. `CodigoErro` ganhou `VOTO_PROPRIO` na **Etapa 4** (total: 26).
8. Pendentes, sem errata: `dev.slugPadrao` guarda string de slug (E6-10); `Alt+D` pode colidir com o navegador (validar no CP6 da Etapa 0; a Etapa 8 já não depende dele); invariante 2 não admite pesos incompletos em rascunho (E6-8).

**Nomes escolhidos na rev. 2** porque as etapas pediam o recurso sem fixar o nome: o parâmetro `consumirPontual` e os valores `MANUAL` e `TOOLBAR`. Se o código tiver outro nome, ajusta-se nele **e** no Anexo C.

---

## 8. Itens que o Anexo B já cobre (não repetir a análise)

O Anexo B da Etapa 0 Final descreve, para cada etapa, os ajustes de: premissas (store, tokens, pastas), seeds, `Resultado<T>`, donos da apuração, seleção na E5, `repo.ts` na E9, matriz 6.2 da E9, toolbar no palco, "outra aba", ordem dos candidatos, convites por `hashCodigo`, flags de parcial, números de convites e Hugo. A mescla deve **aplicar o Anexo B por completo** e depois os itens **novos** da seção 6.

---

## 9. Protocolo de mesclagem (como foi feito nas Etapas 1 a 3)

1. **Ler** o planner antigo, o Anexo B (item da etapa) e a seção 6 deste arquivo.
2. **Cabeçalho:** Rotas, Depende de, Alimenta, Fontes, Status ("versão final consolidada. Substitui `EtapaN X.md`").
3. **Seção 3** como duas tabelas (3.1 recebe, 3.2 entrega), sempre com o dono. A etapa **só entrega** o que a seção 3.2 da Etapa 0 lhe atribui.
4. **Seção 4:** só decisões **novas** da etapa (D1, D2...), com motivo. As do conjunto vivem na Etapa 0.
5. **Seção 5:** matrizes de estado, tipos e regras. Textos de estado via `textoDoEstado` e rótulos do tema.
6. **CPs:** `CP1`..., com Objetivo, Tarefas (checklist), **Fica fake**, **Pronto quando**, **Entrega:** `VaiVota-E{n}-CP{m}.zip`. Último CP: "Revisão e fechamento", com `grep`s de fronteira (nenhum hex de marca, nenhum `<a href>` interno, nenhum acesso a `votos`/`votosJuri`/`historicoVotosJuri`/`votosInfantis`/`resultados` fora de `store/seletores/**` e `servicos/**`) e matriz de verificação.
7. **Critérios de validação testáveis sem framework:** conferência manual por toolbar e `verificarInvariantes` (D19).
8. Cada planner registra o que acrescenta ao contrato: `ui`, cenários, `CodigoErro`, ações de auditoria, toolbar.
9. **Entrega ao usuário:** o `EtapaN Final.md` + este arquivo atualizado.

**Preferência de trabalho do usuário (implementação):** entregas em checkpoints, com zips cumulativos e validação (build/lint) antes de avançar. É o que os planners já descrevem.

---

## 10. Registro de progresso

| Data | O que foi feito |
|---|---|
| 02/10/2026 | Etapas 0 a 3 finais prontas (conversa anterior). Este arquivo de contexto gerado, com resumo das fontes, do contrato, dos planners 4–9 e o registro de inconsistências. **Nenhum planner das Etapas 4 a 9 foi alterado.** |
| 02/10 a 03/10/2026 | Etapas 4 a 8 finais escritas, mais a Etapa 9 final **truncada** (terminava na Matriz X). |
| 07/10/2026 | **Revisão 2.** (1) Etapa 9 completada: seções 5.5 a 5.13 (regressão obrigatória, rotas, responsividade, acessibilidade, buscas de fronteira, inventário, dados expostos, fluxos F1 a F3, roteiro de demonstração), 6 a 10, com 9 CPs. (2) Gerenciador de pacotes **`pnpm`** (D20) em todos os planners. (3) Errata das Etapas 5 a 8 incorporadas na Etapa 0 (Anexo C); os CP1 dessas etapas agora **conferem** em vez de aplicar; ajustadas as pendências P7 (E5), P15 (E6 e E7) e P12 (E8). (4) Nome do override do modo de avanço padronizado em `ui.apresentacao.modoAvancoLocal` (E8). (5) Contexto atualizado (estado, D20, 4.9, 7.2). **Nenhuma etapa implementada ainda.** |
| 07/10/2026 | **Revisão 3.** Aplicadas nos dez planners as decisões do documento de pendências (seção 11): `DocumentDesign.md` reconhecido como fonte; sigilo da participação (C2); fórmula com redistribuição de peso (C3); imagem obrigatória para publicar (C5); método de identificação por seed (C6); mensagem única de código (C8); `DadosResultado` com `pontosPorGrupo`, `desqualificados` e `pesosEfetivos` (D16); Vitest para `dominio/` e `lib/` (D19); demais correções técnicas (D1 a D17). Mudanças em schema, DD e `Base` listadas (F-1 a F-9), **não aplicadas**. **Nenhuma etapa implementada ainda.** |
| 07/10/2026 | **Revisão 4.** Respostas do dono do produto às pendências finais (seção 12): Semana Tech é uso real; sem BD fake (trilha de produção com Supabase PostgreSQL); stack decidida (Better Auth sem senha, Vercel, Resend, Sentry); totem entra no protótipo; júri por critério no Festival; votos individuais do júri nunca no telão; F-1 a F-12 aplicados no schema, DD (v1.2) e `planners/Base`. **Nenhuma etapa implementada ainda.** |
| _(próxima sessão)_ | Reestruturar os planners em documentos de requisitos e nas 4 fases (Demonstração, Semana Tech, Festival, Final); depois, implementar |

---

## 11. Revisão 3: decisões do documento de pendências

Documento de origem: "VaiVota — Pendências e inconsistências dos planners" (07/10/2026), com 88 itens. O dono do produto mandou aplicar a sugestão recomendada de cada item. Os planners citam estas decisões como "rev. 3, <ID>".

### 11.1 Decisões que mudaram o contrato

| ID | Decisão | Etapas |
|---|---|---|
| B1 | `DocumentDesign.md` v1.1 é fonte; marcas "(a confirmar no DD)" fechadas ou convertidas | todas |
| C1 | O admin do evento lê a escolha identificada do jurado; o jurado lê só a própria | 9 |
| C2 | A participação nunca nasce junto com o voto: `garantirParticipacao(eventoId)` (Etapa 3) ao entrar no evento; `votar*` e `aplicarVoto*` não criam participação (ausente → `NAO_AUTORIZADO`); o seed de volume cria participações antes dos votos | 3, 4, 5, 7 |
| C3 | Desqualificados fora da base; grupo ligado sem votos tem o peso redistribuído (`pesoEfetivo[g] = peso[g] × 100 ÷ soma dos pesos com base > 0`) | 6, 7, 8 |
| C5 | Imagem obrigatória para colocar na votação; o caso "sem imagem" do seed passa para os rascunhos `cand-st-09` e `cand-fv-07` | 0, 1, 4, 6 |
| C6 | Método de identificação sai da tela Geral (por seed) | 3, 6 |
| C8 | Mensagem única para código recusado; o motivo vai só para a auditoria | 3 |
| C13 | Fuso guardado como id IANA; deslocamento calculado com `Intl` | 6 |
| C14 | Baixar o CSV de convites registra `EXPORTACAO_CSV` | 6 |
| C15, C17, C18 | Votos do júri atrás de "Mostrar votos do júri"; números do Resultado ocultos até "Mostrar resultado"; jurados por rótulo, com "Mostrar nomes" | 7 |
| C19 | O clique em "Apresentar" libera tela cheia e áudio | 8 |
| D1, D2 | `?de=` mantido na verificação de e-mail; a página `/verificar-email` redireciona quem já verificou | 0, 3 |
| D3 | Link de convite só com e-mail verificado | 2 |
| D5, D6, D7 | Serviços de conta globais (quem devolve `destino` recebe `eventoId`); registrar jurado checa a urna; `entrar` acha contas criadas na sessão | 3 |
| D9 | Remover candidato também consulta `historicoVotosJuri`; invariante 5 cobre o histórico | 0, 6 |
| D15 | `SimuladorVotos` montado uma vez, no `GateEvento` | 0, 7, 8 |
| D16 | `DadosResultado` ganha `pontosPorGrupo` (por item do ranking), `desqualificados` e `pesosEfetivos` | 0, 7, 8 |
| D19 | Vitest (dev) para `dominio/` e `lib/`; fechamento de CP com `pnpm test` | todas |
| E4 | Build público sem toolbar | 9 |
| E8 | Sucesso do público sem o nome do candidato | 5 |
| E10 | Caixa de ciência do voto identificado no primeiro voto do jurado | 5 |
| E24 | Empate de 3 ou mais coberto por teste Vitest | 7, 8 |
| E32 | Módulo júri travado quando há convite `USADO` | 2, 6 |

Correções pontuais sem mudança de regra: B2, B3, C10, C11, C16, C20, C21, D4, D8, D10 a D14, D17. **D12 foi corrigido na aplicação:** o total certo é **21 cenários** (o documento de pendências contou 20 por omitir `VOTO_PROPRIO_PERMITIDO`, da Etapa 4); o que faltava era a tabela da Etapa 0 listar esse e os três `FESTIVAL_*` da Etapa 8.

Nomes criados na rev. 3 (fixos daqui em diante): `garantirParticipacao` (E3), estado `ACESSO_PENDENTE` da gate de `/votar` (E4), validação "4a" de `votar*` (E5), `registrarExportacaoConvites` (E6), ação de trava `MODULO_JURI_DESLIGAR` e parâmetro `conviteUsado` (E6, com ajuste em `alternarModulo` da E0), `pesoRedistribuido` em `resumirApuracao` (E7), `ui.dashboard.resultadoVisivel` (E7), caso AP45 (E8). Padrões confirmados como estavam: C4, C7 (depende de A5), C9, C12, E5, E7, E9, E11 a E17, E23, E25, E26, E28, E29, E33. Para a fase com banco: E18, E19, E20, E31.

### 11.2 Continua em aberto (situação atualizada na seção 12)

- **Escopo (fora da Fase 1, exige planner próprio ou decisão):** A1 (Semana Tech: uso real ou demonstração), A2 (vocabulário de fases), A3 (trilha de produção), A4 (banco), A5 (stack: auth, hospedagem, e-mail, rate limit, monitoramento), A6 (Endurecimento: carga, logs, backup, roteiro do dia), A7 (totem), A8 (aceite do voto simples do júri), A9 (CPF, SMS/OTP, admins adicionais).
- **[Usuário]:** E1 (marca do Festival), E2 (fontes), E3 (datas da Semana Tech), E21 (durações), E22 (direção visual), E27 (equipamentos-alvo), E30 (textos finais), texto do aviso de privacidade.

### 11.3 Mudanças em fontes fora dos planners (aprovadas e aplicadas na rev. 4, seção 12.3)

| ID | Arquivo | Mudança |
|---|---|---|
| F-1 | `schema.prisma` | `Participacao.criadoEm` removido ou só com a data (C2) |
| F-2 | `Base/Jurado.md` §12, `Base/VotoInfantil.md` §12 | Trava total dos pesos no MVP (C4) |
| F-3 | `DocumentDesign.md` §7.6 e §8.1 | Desqualificado sai da votação e do ranking; imagem obrigatória para publicar; base sem desqualificados e redistribuição de peso (C3, C5, C10) |
| F-4 | `schema.prisma` | Pesos `Int` com CHECK de soma 100 (C12) |
| F-5 | `schema.prisma` | `Evento.local` e `Evento.linkSobre` (E34) |
| F-6 | `Base/Dashboard.md` | `ConfiguracaoEvento.md` → DD §7.6; exportações a partir da ativação, auditoria sempre (B2, C11) |
| F-7 | `DocumentDesign.md` §13 | Vocabulário das fases (A2) |
| F-8 | `Base/Login.md` §4 | "Método de login" vem das tabelas da biblioteca de autenticação (C22) |
| F-9 | `DocumentDesign.md` §3.3 | O que do PDF foi descartado ou adiado (A8, A9) |

---

## 12. Revisão 4: respostas às pendências finais

Documento de origem: "VaiVota — Pendências finais para decisão" (07/10/2026). Objetivo desta revisão: **registrar o que o produto final deve ter**, sem ajustar conteúdo por prazo. Os planners citam estas decisões como "rev. 4, <ID>".

### 12.1 Escopo e plataforma

| ID | Decisão |
|---|---|
| A1 | A **Semana Tech é uso real** (semana de 18/10/2026): sistema funcional com dados reais. Antes dela, **demonstração para o Festival em 09/10/2026**: telas com dados mock, no tema do Festival |
| A2 | "Fase 2 (BD fake)" deixa de existir; "Fase 2/3" nos planners = trilha de produção. A numeração será substituída pela reestruturação em 4 fases (12.4) |
| A3 | Sem BD fake. Planner **"Trilha de Produção"** a escrever: banco, migrações e seed real; autenticação; troca dos serviços; rate limiting, logs e deploy |
| A4 | Banco: **Supabase (PostgreSQL)**. A conversão do schema (hoje em MySQL) é tarefa da trilha de produção |
| A5 | **Better Auth** (Google + código por e-mail, **sem senha**), **Vercel**, **Resend**, rate limiting no PostgreSQL ou Upstash Redis, **Sentry**, Prisma |
| A6 | Planner **"Endurecimento"** a escrever (k6, alertas, backup, roteiro do dia, ensaio). Pendente: número de votantes e pico |
| A7 | **Totem e voto infantil entram no protótipo** (precisam aparecer na demonstração) e no produto. Planner **"Totem"** a escrever |
| A8 | Júri: **voto simples na Semana Tech; voto por critério no Festival** (Direção, Roteiro, Fotografia, Som). Pendente: escala, peso por critério, conversão em placar (proposta: soma das médias dos critérios, normalizada como os outros grupos), desempate por critério |
| A9 | **CPF nunca.** SMS/OTP descartado. Admins adicionais por seed |

### 12.2 Produto

| ID | Decisão |
|---|---|
| A5 (mock) | Login sem senha no protótipo: e-mail → tela de código (`/verificar-email`) → sessão; código mock `123456`. Saem a senha, a recuperação de senha e a rota `recuperar-senha` (C7 resolvida). Serviços `confirmarCodigo` e `reenviarCodigo` substituem `verificarEmail` e `reenviarVerificacao`; `CREDENCIAIS_INVALIDAS` = código incorreto; bloqueio em `ui.bloqueioLoginCodigo`; e-mail pendente em `ui.loginPendente` |
| E1 | Texto escuro sobre o laranja `#F15A29` |
| E2 | Seletor de fonte mantido; a lista `FONTES_APROVADAS` é personalizada pelo dono depois |
| E3 | Semana Tech na semana de 18/10/2026; o seed (22/10, 13h–17h) fica dentro dela; dia e horário exatos a confirmar |
| E21 | **Um único trailer do evento, por link/embed**; nunca se armazena vídeo; sem trailer por candidato; animações e trailer gerado continuam. As categorias da revelação mostram **só o vencedor**, nunca quem votou em quem: `exibirVotosJuriNoTelao` removido. Demais durações mantidas |
| E27 | Semana Tech: telão, celulares e computadores. Festival: telão, celulares e totens |
| E28 | Lighthouse ≥ 90; axe sem `critical` nem `serious` |
| E29 | Controladora dos dados: **VaiVota**. Aviso de privacidade único da plataforma; `avisoPrivacidadeUrl` do evento fica opcional e complementar |

**Continua em aberto:** E22 (direção visual), E30 (textos finais), texto do aviso de privacidade, número de votantes (A6), detalhes do voto por critério (A8), dia exato da Semana Tech (E3).

### 12.3 Mudanças nas fontes (aplicadas)

| ID | Arquivo | Mudança |
|---|---|---|
| F-1 | `schema.prisma`, `schema.sql` | `Participacao.criadoEm` removido |
| F-2 | `Base/Jurado.md`, `Base/VotoInfantil.md` | Trava total dos pesos no MVP |
| F-3 | `DocumentDesign.md` §7.6, §8.1, §17 | Imagem obrigatória para publicar; desqualificado fora da votação e do ranking; base sem desqualificados e redistribuição de peso |
| F-4 | `schema.prisma`, `schema.sql` | Pesos `Int`, CHECK de soma 100 |
| F-5 | `schema.prisma`, `schema.sql` | `Evento.local`, `Evento.linkSobre` |
| F-6 | `Base/Dashboard.md` | Referência ao DD §7.6; exportações a partir da ativação, auditoria sempre |
| F-7 | `DocumentDesign.md` §13 | Plano em 4 fases sequenciais |
| F-8 | `Base/Login.md`, `schema.prisma`, `schema.sql` | Login sem senha; método de login nas tabelas do Better Auth; `senhaHash` removido |
| F-9 | `DocumentDesign.md` §3.3, §7.2, §16; `Base/Jurado.md` | CPF e SMS descartados; notas por critério viram requisito do Festival |
| F-10 | `schema.prisma`, `schema.sql`, DD, `Base/Jurado.md`, `Base/ModoApresentacao.md` | `exibirVotosJuriNoTelao` removido; categorias só com o vencedor; trailer só por link |
| F-11 | `DocumentDesign.md` §5.3, `schema.prisma` (comentário) | Stack decidida |
| F-12 | `DocumentDesign.md` §3.2, §3.3, §10.4 | Voto infantil no protótipo e no Festival; admins por seed; VaiVota controladora dos dados |

### 12.4 Próximo passo: reestruturação em 4 fases

Os planners atuais serão reescritos como **documentos de requisitos** (substituindo os arquivos de funcionalidade de `planners/Base`) e redistribuídos em quatro fases **sequenciais**. O que uma fase entrega não é reimplementado na seguinte.

1. **Demonstração:** telas com dados mock, no tema do Festival, incluindo o totem.
2. **Semana Tech:** dados reais; as funcionalidades necessárias e, principalmente, os requisitos da Semana Tech.
3. **Festival:** continua a implementação com o que o Festival exige (voto infantil real, júri por critério).
4. **Final:** o restante das funcionalidades.

Planners a escrever nessa reestruturação: Trilha de Produção (A3), Endurecimento (A6), Totem (A7) e voto do júri por critério (A8).
