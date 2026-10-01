# VaiVota — Fase 1 · Etapa 2: Evento (`/e/[slug]`)

> Status: proposta de planner, aguardando validação das decisões da seção 5.
> Fase: 1 (interface mockup, sem banco, sem persistência).
> Depende de: Etapa 0 (fundação, tema, store, dev toolbar) e Etapa 1 (landing com tema).
> Alimenta: Etapas 3 (login/registro), 4 (candidato), 5 (votos), 6 (configuração).
> Stack (do `package.json`): Next.js 16.3.5 (App Router), React 19.2.8, Tailwind 4, TypeScript 5, React Compiler (`babel-plugin-react-compiler`).
> Fontes: `DocumentDesign.md` (§5.4, 7.1, 7.2, 9, 12), `public/Login.md`, `public/Jurado.md`, `prisma/schema.prisma` (modelos `Evento` e `Tema`) e o código atual de `src/app`.

---

## 1. Objetivo

Entregar a **página de entrada do evento** (`/e/[slug]`): a primeira tela que o público vê ao ler o QR Code. Ela carrega o tema do evento (white-label), informa o estado da votação e leva a pessoa para a ação certa (entrar, votar, aguardar), conforme o estado da urna e a sessão simulada.

Tudo é mockup: o estado vive na memória (store da Etapa 0) e é controlado pela dev toolbar.

## 2. Escopo

**Dentro**
- Rota `/e/[slug]` com casca visual do evento (header, rodapé), hero temático e painel de estado.
- Todos os estados de entrada: urna **não iniciada**, **aberta**, **encerrada**, evento **concluído**, **rascunho** (indisponível para não-admin; banner para admin), **sem candidatos publicados** e **slug inexistente**.
- Contagem regressiva ("Abre em" / "Encerra em") e contador de candidatos.
- Botões de ação por sessão simulada (visitante, público, jurado, admin, "já votou").
- Funções puras de decisão de estado, reaproveitáveis nas Etapas 4 e 5.
- Versão para celular, foco visível, navegação por teclado.

**Fora (outras etapas)**
- Formulários de login, registro e switch Jurado: Etapa 3. Aqui fica apenas um **slot** com botões provisórios.
- Resgate de convite (`/e/[slug]/convite`): Etapa 3.
- Lista e detalhe de candidatos: Etapa 4. A entrada mostra só a **contagem**.
- Fluxo de voto e tela "já votou" completa: Etapa 5. A entrada só muda o botão.
- Painel admin, configuração e apresentação: Etapas 6 a 8.
- Totem: fora da Fase 1.

## 3. Auditoria do código atual (achados que afetam esta etapa)

| # | Achado | Impacto | Onde resolver |
|---|---|---|---|
| A1 | `globals.css` define `body { font-family: Arial }`, o que anula `--font-sans` (Geist). | A tipografia por tema (`Tema.fonte`) não aplicaria no `body`. | Etapa 0 (remover) |
| A2 | `globals.css` inverte as cores com `prefers-color-scheme: dark`. | Uma página de evento com tema claro viraria escura no celular em modo escuro, contrariando o tema validado por contraste. | Decisão D6; Etapa 0 |
| A3 | `layout.tsx` tem `lang="en"` e metadata fixa do Festival. | Leitores de tela leem em inglês. Título do evento precisa vir de `generateMetadata`. | Etapa 0 (`pt-BR`); CP 2.2 (metadata) |
| A4 | `page.tsx` usa cores fixas (`#F15A29`, `#8DC63F`, `text-zinc-*`). | Não pode ser copiado para a entrada do evento; precisa de tokens. | Etapa 1; esta etapa só usa tokens |
| A5 | **Contraste:** botão branco sobre `#F15A29` dá cerca de **3,4:1**, abaixo de 4,5:1 exigido para texto normal. | O botão primário do Festival não passaria na checagem de contraste prevista no DD (§7.6). | Decisão D7; CP 2.3 |
| A6 | Só existe o logo do Festival (`webp`, 1600×468, RGBA). Não há logo nem capa da Semana Tech, nem capa do Festival. | O hero precisa de fallback sem imagem. | Decisão D8; CP 2.3 |
| A7 | `Tema` no Prisma tem `rotuloCandidato(s)`. O DD cita "filme", "projeto", "música", "jogo"; **"música" é feminino**. | Frases com artigo ou adjetivo ("nenhum", "publicados") quebram com alguns rótulos. | Seção 7: textos neutros em gênero |
| A8 | O `package.json` traz o React Compiler, mas o zip não tem `next.config`. | Não dá para confirmar se está ativo. Se estiver, `Date.now()` e `Math.random()` no render são proibidos. | CP 2.1 (verificar) |
| A9 | Os planners estão em `public/*.md` e o README fala em `docs/`. | Tudo em `public/` é servido por URL (`/Login.md`). | Fora de escopo; mover antes de publicar a demo |

## 4. Contratos com outras etapas

### 4.1 O que esta etapa espera das Etapas 0 e 1

> Os nomes abaixo são **provisórios**. O planner da Etapa 0 ainda não existe; ajustar aqui quando ele for gerado. O CP 2.1 serve justamente para conferir esse contrato antes de qualquer tela.

| Item | Esperado |
|---|---|
| Tokens de tema | CSS variables por evento (`--cor-primaria`, `--cor-secundaria`, `--cor-fundo`, `--cor-texto`, fonte), aplicadas por um wrapper em `e/[slug]/layout.tsx`. Nomes alinhados aos campos de `Tema` do schema. |
| Store | Context + `useReducer` montado no `e/[slug]/layout.tsx`. Expõe evento, tema, candidatos, `sessao`, `jaVotou`. |
| Seed | Dois eventos (Semana Tech e Festival) com `slug`, `nome`, `descricao`, `estado`, `estadoUrna`, `moduloJuri`, tema, candidatos com `publicado`, janela de votação como **deslocamento relativo** (ver D3). |
| Tipos | Enums iguais aos do Prisma (`RASCUNHO/ATIVO/CONCLUIDO`, `NAO_INICIADA/ABERTA/ENCERRADA`, `PUBLICO/JURADO/ADMIN`) para facilitar a troca na última etapa. |
| Dev toolbar | Já tem urna, papel, módulos e tema. **Falta** (CP 2.1): estado do evento, "visitante" como sessão, "já votou", quantidade de candidatos publicados e reinício do relógio. |
| Componentes base | Botão, badge, card, ícones. Se algum faltar, nasce no CP em que for usado. |
| Etapa 1 | Os botões da landing apontam para `/e/{slug}`. |

### 4.2 O que esta etapa entrega para as próximas

| Entrega | Usada em |
|---|---|
| `src/app/e/[slug]/(publico)/layout.tsx` com `EventoShell` (header e rodapé do evento) | Etapas 3, 4, 5 (`convite/`, `votar/` entram no mesmo grupo) |
| `resolverVisaoEvento()` (função pura de decisão) | Etapa 5 reaproveita as mesmas regras para liberar ou bloquear `/votar` |
| `AcessoEvento` (slot com botões provisórios) | Etapa 3 substitui pelos formulários |
| `Countdown` e hook `useAgora` | Etapas 5, 7 e 8 |
| `not-found.tsx` do evento | Todas as rotas `/e/[slug]/*` |

## 5. Decisões assumidas (podem ser vetadas)

| # | Decisão | Motivo |
|---|---|---|
| D1 | Route group `e/[slug]/(publico)/` para a casca pública; o admin terá `(admin)/` com casca própria. As URLs não mudam. | Header do público e do admin são diferentes; evita condicional no layout. |
| D2 | Provider, tema e dev toolbar ficam em `e/[slug]/layout.tsx` (Etapa 0). A casca visual fica em `(publico)/layout.tsx` (esta etapa). | Separa estado de apresentação. |
| D3 | A janela de votação no seed é um **deslocamento** (ex.: "abre em 2 h"), calculado depois da montagem no cliente. A contagem **não muda o estado sozinha** ao chegar a zero; quem manda é a toolbar. | Datas fixas ficariam velhas; evita desencontro entre relógio e toolbar. |
| D4 | A entrada **não lista candidatos**: mostra só "N {candidatos} concorrendo". | A lista é a Etapa 4; escopo enxuto (DD §2). |
| D5 | `resolverVisaoEvento()` é função pura, sem React. | Testável, e vira a base do gate da Etapa 5; na última etapa a regra passa para o servidor. |
| D6 | Páginas de evento **ignoram** o modo escuro do sistema; o tema do evento define as cores. | O tema é validado por contraste (DD §7.6). |
| D7 | A cor do texto sobre a cor primária é **derivada por contraste** (claro ou escuro, o que passar), sem campo novo no `Tema`. | Resolve A5 sem mexer no schema. |
| D8 | Sem `logoUrl`: mostrar o nome do evento como wordmark. Sem `capaUrl`: gradiente com as cores do tema. | A Semana Tech não tem logo nem capa (A6). |
| D9 | Como o estado simulado vive no cliente, o servidor só chama `notFound()` para slug inexistente. Rascunho, concluído etc. são resolvidos no cliente. | A toolbar muda o estado depois do carregamento. |
| D10 | Logado, o header mostra o papel simulado e **Sair (simulado)**, que volta a sessão para visitante. Deslogado, mostra um link discreto **Entrar**. | Dá a sensação real de sessão sem backend; admins precisam de um acesso em qualquer estado. |

## 6. Matriz de estados da entrada

**Entradas:** estado do evento × estado da urna × sessão × já votou × módulo júri × candidatos publicados.
**Sessão simulada:** `VISITANTE | PUBLICO | JURADO | ADMIN`.

**Precedência da variante (de cima para baixo):**
1. Evento em `RASCUNHO` e sessão diferente de `ADMIN` → `INDISPONIVEL`.
2. Evento `CONCLUIDO` → `CONCLUIDO`.
3. Urna `ENCERRADA` → `ENCERRADA`.
4. Urna `ABERTA` e 0 candidatos publicados → `SEM_CANDIDATOS`.
5. Urna `ABERTA` → `ABERTA`.
6. Urna `NAO_INICIADA` → `NAO_INICIADA`.

Para `ADMIN` em rascunho, a variante segue a urna normalmente e aparece o banner de rascunho.

| # | Cenário | Variante | Ação principal | Extras |
|---|---|---|---|---|
| E1 | Ativo, não iniciada, visitante | `NAO_INICIADA` | Entrar / Criar conta | "Abre em" (contagem) |
| E2 | Ativo, não iniciada, logado | `NAO_INICIADA` | Nenhuma ("volte quando abrir") | "Abre em" |
| E3 | Ativo, aberta, visitante | `ABERTA` | Entrar / Criar conta | "Encerra em" |
| E4 | Aberta, público, não votou | `ABERTA` | **Votar agora** → `/votar` | link "Tenho um código de convite" se módulo júri ligado |
| E5 | Aberta, público, já votou | `ABERTA` | Ver confirmação → `/votar` | selo "Seu voto foi registrado" |
| E6 | Aberta, jurado, não votou | `ABERTA` | **Votar como jurado** → `/votar` | |
| E7 | Aberta, jurado, já votou | `ABERTA` | **Alterar meu voto** → `/votar` | aviso "pode alterar até encerrar" |
| E8 | Urna encerrada, qualquer sessão | `ENCERRADA` | Nenhuma | se `jaVotou`: "Obrigado por votar" |
| E9 | Evento concluído | `CONCLUIDO` | Nenhuma | |
| E10 | Rascunho, não-admin | `INDISPONIVEL` | Nenhuma | casca mínima, sem hero completo |
| E11 | Rascunho, admin | conforme a urna | atalho para o painel | banner "Rascunho" |
| E12 | Aberta, 0 candidatos publicados | `SEM_CANDIDATOS` | Nenhuma (botão de voto ausente) | |
| E13 | Slug inexistente | `not-found` | Voltar para `/` | |
| E14 | Admin em qualquer estado | conforme a urna | **Ir para o painel** → `/admin`, **Configuração** → `/admin/configuracao` | admin não vota (ver pendência P1) |

**Regras de apoio**
- Link "Tenho um código de convite" aparece só se: módulo júri ligado, sessão `PUBLICO`, `jaVotou = false`, urna não encerrada e evento não concluído (coerente com `Jurado.md`: quem já votou como público não resgata).
- Sessão `JURADO` com módulo júri desligado é combinação inválida: tratar como `PUBLICO`, e a toolbar desabilita a opção Jurado nesse caso.
- Login e criação de conta ficam disponíveis também com a urna não iniciada (a pessoa já deixa a conta e o e-mail verificados). **[Proposta]**
- Usuário com e-mail não verificado: tratado na Etapa 3.

## 7. Textos das telas de estado (proposta)

Padrão do mockup; o tema pode sobrescrever via `textosEstado`. **Sem artigos nem adjetivos que concordem com o rótulo** (A7). `{candidatos}` = rótulo plural do tema, em minúsculas.

| Variante | Título | Corpo |
|---|---|---|
| `NAO_INICIADA` | A votação ainda não começou | Você já pode criar sua conta. Quando a urna abrir, é só voltar aqui para votar. |
| `ABERTA` | Votação aberta | Entre ou crie sua conta e vote em poucos passos. |
| `ABERTA` + votou | Seu voto foi registrado | Obrigado por participar! |
| `ABERTA` + jurado votou | Seu voto foi registrado | Você pode alterá-lo até o encerramento da votação. |
| `ENCERRADA` | Votação encerrada | Obrigado por participar! O resultado será divulgado pela organização. |
| `CONCLUIDO` | Evento concluído | Obrigado por fazer parte desta edição. |
| `SEM_CANDIDATOS` | Ainda não dá para votar | A lista de {candidatos} será divulgada em breve. |
| `INDISPONIVEL` | Este evento ainda não está disponível | Volte em breve. |
| Banner (admin) | Rascunho | Só administradores veem esta página. |
| Contador | "{n} {candidatos} concorrendo" | invariável em gênero |

## 8. Estrutura de arquivos

```
src/
├── app/e/[slug]/
│   ├── layout.tsx                    # Etapa 0: provider + tema + dev toolbar
│   ├── not-found.tsx                 # CP 2.2
│   └── (publico)/
│       ├── layout.tsx                # CP 2.2: EventoShell
│       └── page.tsx                  # CP 2.2 a 2.5: entrada do evento
├── components/evento/
│   ├── EventoShell.tsx               # header + rodapé
│   ├── EventoLogo.tsx                # logo ou wordmark (D8)
│   ├── EventoHero.tsx                # CP 2.3
│   ├── BannerRascunho.tsx            # CP 2.4
│   ├── UrnaStatusCard.tsx            # CP 2.4
│   ├── Countdown.tsx                 # CP 2.4
│   └── AcessoEvento.tsx              # CP 2.5 (slot da Etapa 3)
└── lib/evento/
    ├── visao-evento.ts               # CP 2.1: resolverVisaoEvento()
    ├── textos-estado.ts              # CP 2.1: textos padrão + override do tema
    ├── contraste.ts                  # CP 2.3: texto sobre cor (D7)
    └── use-agora.ts                  # CP 2.4: hook de relógio
```

Os caminhos de `mocks/` e do store seguem o definido na Etapa 0.

## 9. Checkpoints

Seis checkpoints. Cada um termina com algo que abre no navegador e pode ser conferido pela toolbar. Tamanho relativo: P (pequeno), M (médio).

### Checkpoint 2.1 — Contrato, tipos e regras puras (P)

**Objetivo:** conferir o que as Etapas 0 e 1 entregaram e criar a lógica de decisão antes de qualquer tela.

**Tarefas**
1. Auditar a Etapa 0: tokens, store, seed, toolbar, tipos. Registrar diferenças em relação à seção 4.1 e ajustar nomes neste planner.
2. Verificar se o React Compiler está ativo (A8) e anotar a regra: sem `Date.now()`/`Math.random()` no render.
3. Estender a toolbar: **sessão** (`VISITANTE/PUBLICO/JURADO/ADMIN`), **já votou**, **estado do evento**, **candidatos publicados** (nenhum / todos) e **reiniciar relógio**. Estender o reducer com as ações correspondentes.
4. Criar `visao-evento.ts` com `resolverVisaoEvento(entrada)` seguindo a precedência da seção 6. Retorna: `variante`, `mostrarBannerRascunho`, `acao`, `mostrarCodigoConvite`, `atalhoAdmin`.
5. Criar `textos-estado.ts` com os textos da seção 7 e a função de override por `tema.textosEstado`.

**Critério de pronto**
- [ ] Contrato da seção 4.1 conferido e corrigido onde divergiu.
- [ ] Toolbar controla os cinco novos itens e a opção Jurado fica desabilitada com módulo júri desligado.
- [ ] `resolverVisaoEvento` cobre E1 a E14; quando houver runner de testes, entra como teste de tabela. Até lá, conferência manual por uma lista de chamadas.
- [ ] Nenhuma tela criada ou alterada neste checkpoint.

### Checkpoint 2.2 — Rota, casca e slug inválido (M)

**Objetivo:** `/e/semana-tech` e `/e/<festival>` abrem dentro de uma casca temática; slug desconhecido cai em 404.

**Tarefas**
1. Criar `(publico)/layout.tsx` e `(publico)/page.tsx`. Em Next 16, `params` é `Promise`: usar `await params` e os helpers `PageProps<'/e/[slug]'>`/`LayoutProps` (os tipos são gerados por `next dev`, `next build` ou `next typegen`).
2. `generateMetadata` com `title` = nome do evento e `description` = descrição do seed.
3. `notFound()` no servidor só para slug inexistente (D9). `not-found.tsx` do evento, neutro (sem tema), com link para `/`.
4. `EventoShell`: header com `EventoLogo` (link para `/e/{slug}`) e, à direita, **Entrar** (visitante) ou papel simulado + **Sair (simulado)** (D10); rodapé com "Powered by VaiVota" discreto e link do aviso de privacidade (mock `#`).
5. Estrutura de landmarks: `header`, `main`, `footer`; um único `h1` por página.

**Critério de pronto**
- [ ] As duas URLs abrem com o tema correto (cores e fonte).
- [ ] `/e/qualquer-coisa` mostra o 404 do evento.
- [ ] A aba do navegador mostra o nome do evento.
- [ ] Sair (simulado) volta a sessão para visitante e o header troca.
- [ ] Sem avisos de hidratação no console.

### Checkpoint 2.3 — Hero e identidade visual (M)

**Objetivo:** a primeira dobra identifica o evento e muda por tema sem alterar o layout.

**Tarefas**
1. `EventoLogo`: `next/image` quando houver `logoUrl` (usar as dimensões reais, 1600×468 no Festival, para evitar salto de layout); senão, wordmark com `nomeExibicao` (D8).
2. `contraste.ts`: calcula a razão de contraste (luminância WCAG) e escolhe texto claro ou escuro sobre a cor primária (D7). Aplicar como token `--cor-sobre-primaria`.
3. `EventoHero`: nome (`h1`), descrição, datas quando existirem, capa se houver (`capaUrl`), senão gradiente do tema.
4. Rótulo temático nos textos (`rotuloCandidatos`), conforme seção 7.
5. Conferir os dois temas lado a lado pelo seletor da toolbar.

**Critério de pronto**
- [ ] Semana Tech (sem logo) e Festival (com logo) renderizam sem imagem quebrada.
- [ ] Texto do botão primário passa em 4,5:1 nos dois temas (verificar com o cálculo de `contraste.ts`).
- [ ] Trocar o tema na toolbar muda cores, fonte, logo e rótulos sem recarregar.
- [ ] Nenhum valor de cor fixo no JSX; só tokens.

### Checkpoint 2.4 — Painel de estado da urna e contagem (M)

**Objetivo:** todas as variantes de estado, com contagem regressiva.

**Tarefas**
1. `UrnaStatusCard` recebe a `variante` e mostra título, corpo, **selo com ícone e texto** (nunca só cor) e a contagem de candidatos publicados.
2. `use-agora.ts`: hook com `useEffect` + `setInterval`, que só começa depois da montagem. Antes disso, `null`.
3. `Countdown`: "Abre em" (`NAO_INICIADA`) e "Encerra em" (`ABERTA`) a partir da janela relativa do seed (D3). Antes da montagem mostra placeholder estável (sem diferença entre servidor e cliente). Sem janela: "A data de abertura será anunciada".
4. Ao chegar a zero: texto "Atualizando…" sem mudar o estado (D3).
5. Acessibilidade: card com `role="status"`; contagem com `role="timer"` e `aria-live="off"`, com `aria-label` atualizado a cada minuto, não a cada segundo.
6. `BannerRascunho` para admin; variante `INDISPONIVEL` com casca mínima (E10).
7. `prefers-reduced-motion`: sem pulso no selo "Aberta".

**Critério de pronto**
- [ ] Cada variante (E1 a E3, E8 a E12) aparece ao mudar a toolbar, sem recarregar.
- [ ] Contagem não gera aviso de hidratação e reinicia pelo botão da toolbar.
- [ ] O estado é compreensível sem cor (texto + ícone).
- [ ] Textos vêm de `textos-estado.ts`, não do JSX.

### Checkpoint 2.5 — Área de acesso e botões por sessão (M)

**Objetivo:** a ação certa para cada sessão, deixando o encaixe pronto para a Etapa 3.

**Tarefas**
1. `AcessoEvento` consome `acao` de `resolverVisaoEvento` e renderiza: Entrar / Criar conta (visitante), **Votar agora**, **Votar como jurado**, **Alterar meu voto**, **Ver confirmação**, **Ir para o painel** e **Configuração** (admin).
2. "Entrar" e "Criar conta" são **provisórios** (marcados `// TODO(Etapa 3)`): levam a uma âncora `#acesso` ou mostram aviso discreto "Disponível na Etapa 3". Não simulam login.
3. Links "Votar…" e "Ver confirmação" apontam para `/e/{slug}/votar`; "Tenho um código de convite" para `/e/{slug}/convite`. Essas rotas ainda não existem: confirmar que o 404 do evento aparece em vez de erro.
4. Regras de apoio da seção 6 (link de convite, jurado sem módulo, admin sem botão de voto).
5. Área de toque de pelo menos 44 px, foco visível, ordem de tabulação coerente (header → conteúdo → rodapé).

**Critério de pronto**
- [ ] E4 a E7 e E14 mostram o botão e o destino corretos.
- [ ] Link de convite aparece só nas condições da seção 6.
- [ ] Nenhum botão "morto" sem indicação de que é provisório.
- [ ] Tudo operável só com o teclado.

### Checkpoint 2.6 — Responsividade, acessibilidade e fechamento (P)

**Objetivo:** validar a matriz completa e fechar a etapa.

**Tarefas**
1. Percorrer E1 a E14 nos dois temas (28 combinações) e nos tamanhos 360, 768 e 1280 px. Anotar problemas.
2. Conferir: hierarquia de títulos, landmarks, foco visível, contraste dos selos e do rodapé, `lang="pt-BR"`, reduced motion.
3. `npm run lint` e `npm run build` sem erros (inclui o typegen das rotas).
4. Remover código morto e confirmar que não há cores fixas nem textos fixos de estado nos componentes.
5. Atualizar neste planner o que mudou em relação ao contrato da seção 4.2 (para o planner da Etapa 3 partir do real).

**Critério de pronto da etapa**
- [ ] `/e/semana-tech` e `/e/<festival>` funcionam com os dois temas e todos os estados da seção 6.
- [ ] Slug inexistente cai no 404 do evento.
- [ ] Entrada utilizável em 360 px, sem rolagem horizontal.
- [ ] Contraste do texto principal e dos botões ≥ 4,5:1.
- [ ] Console sem erros nem avisos de hidratação.
- [ ] `lint` e `build` passam.
- [ ] Nenhuma gravação em banco ou armazenamento; F5 volta ao estado do seed.

## 10. Riscos e pontos de atenção

| Risco | Mitigação |
|---|---|
| Nomes provisórios do contrato 4.1 divergirem da Etapa 0 | CP 2.1 existe para isso; revisar antes de tocar em UI |
| Hidratação divergente na contagem | Placeholder até montar; relógio só em efeito (D3, CP 2.4) |
| React Compiler reclamar de código impuro | Verificar em A8; efeitos e hooks isolados em `use-agora.ts` |
| Rótulos femininos quebrarem frases | Textos neutros (seção 7) e override por `textosEstado` |
| Regra de decisão duplicada entre entrada e `/votar` | Uma única `resolverVisaoEvento` (D5) |
| Dev toolbar aparecer na demo para o público | Etapa 0 deve permitir esconder a toolbar (flag); lembrar no CP 2.6 |

## 11. Pendências

- **P1:** o DD não diz se o admin pode votar. O mockup assume que **não** (sem botão de voto).
- **P2:** permitir criar conta com a urna ainda não iniciada (assumido; ver seção 6).
- **P3:** capa e logo da Semana Tech; sem eles valem os fallbacks (D8).
- **P4:** paleta e fonte finais da Semana Tech (a Etapa 0 define valores provisórios).
- **P5:** textos finais das telas de estado (pendência já listada no DD §17).
- **P6:** o botão primário laranja do Festival com texto escuro ou um laranja mais escuro: decisão visual; o cálculo de contraste (D7) só garante o mínimo.
