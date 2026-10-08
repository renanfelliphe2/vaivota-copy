# VaiVota — Fase 1 · Etapa 1: Landing Page

> **Rotas:** `/`
> **Depende de:** Etapa 0 (Fundação do protótipo)
> **Alimenta:** Etapa 2 (destino dos CTAs e precedência das situações), Etapa 3 (link "Sou jurado" → `/convite`), Etapa 9 (auditoria de rotas e responsividade)
> **Fontes:** `Login.md` (seções 1 e 5), `Jurado.md` (seção 6), `schema.prisma` (`Evento`, `Tema`, `ConfigApresentacao`), `DocumentDesign.md` v1.1 (§9.1), `src/app/page.tsx` atual (existe no repositório; conferir o arquivo atual no CP1)
> **Status:** versão final consolidada. Substitui `Etapa1 LandingPage.md`. **Revisão 3 (07/10/2026):** aplica as decisões do documento de pendências (itens B1, B3, C5, D19, E33, E34; E1 segue pendente). **Revisão 4 (07/10/2026):** A2, E1, E27, E29 (e reflexo de F-5).

---

## 1. Objetivo

Transformar a landing atual, que tem nome, cores e textos do Festival fixos no código, em uma landing **dirigida pelo evento**: nome, logo, cores, rótulos e situação da votação vêm do mock, e trocar de evento ou de estado na dev toolbar muda a página sem alterar código.

É a primeira tela que prova o princípio **configurável, não customizável**: layout fixo, identidade por evento, VaiVota discreto ("powered by").

Esta etapa precisa garantir:
- **Nenhuma cor, nome ou texto de evento no código** da landing.
- **Cada situação do evento e da urna tem faixa de status e chamada coerentes**, decididas por uma única função pura.
- **A landing é pública:** não lê a sessão e nunca exibe contagem de votos nem resultado.

## 2. Escopo

**Dentro**
- Landing em `/` para o evento exibido por padrão (`dev.slugPadrao`).
- Identidade por tokens (nenhuma cor de marca no código).
- Oito situações do evento e da urna (seção 5.1), com faixa de status, contagem regressiva e chamada.
- CTA para `/e/[slug]` e link discreto "Sou jurado" para `/e/[slug]/convite`.
- Prévia curta dos candidatos votáveis.
- Mobile-first e acessibilidade básica.
- Metadata (`<title>` e descrição) do evento padrão.

**Fora**
- Login, registro e convite de jurado (Etapa 3).
- Página de entrada do evento e seus estados completos (Etapa 2).
- Lista e detalhe de candidatos (Etapa 4).
- Store, tema, toolbar, componentes base e dados seed (Etapa 0).
- Uso de `capaUrl` do tema (nenhum seed define capa; ver seção 10).
- Qualquer persistência.

---

## 3. Contrato com as outras etapas

### 3.1 O que esta etapa recebe

| Item | Dono |
|---|---|
| Tokens `--tema-*` e utilitários (`bg-tema-primaria`, `text-tema-sobre-primaria`, `text-tema-primaria-texto`, `text-tema-secundaria-texto`, `text-tema-texto-suave`, `bg-tema-superficie`, `border-tema-borda`, `ring-tema-foco`, `font-tema`) | Etapa 0 |
| `TemaEvento` no layout raiz (a `page.tsx` **não** aplica tema) | Etapa 0 |
| `useEventoAtivo()` (sem slug, usa `dev.slugPadrao`; devolve `{ slug, evento, tema, configPlacar, configApresentacao, camposCandidato, candidatos }`), `useAgora()` | Etapa 0 |
| `Botao` (renderiza `Link` com `href`), `Selo`, `Cartao`, `Alerta`, `ContagemRegressiva` | Etapa 0 |
| `LogoEvento` (cai para o nome em texto sem `logoUrl`), `ImagemCandidato` | Etapa 0 |
| `dominio/candidatos.ts` (`votaveis`), `lib/tempo.ts` e `lib/formatar.ts` (data e hora no fuso do evento) | Etapa 0 |
| `servicos/metadados.ts` (`obterMetadadosEvento`) | Etapa 0 |
| Seed: Semana Tech (escuro, sem logo, sem `linkSobre`, sem `avisoPrivacidadeUrl`) e Festival (claro, com logo, `linkSobre`, aviso de privacidade); `Evento.local` e `Evento.linkSobre` (mock-only) | Etapa 0 |
| Toolbar (evento, estado do evento, urna, relógio, cenários) e registro de cenários | Etapa 0 |
| `SkipLink` no layout raiz (alvo `#conteudo`) | Etapa 0 |
| Rotas stub `/e/[slug]` e `/e/[slug]/convite` | Etapa 0 |

### 3.2 O que esta etapa entrega

| Item | Consumidor |
|---|---|
| Destino dos CTAs: `/e/[slug]` | Etapa 2 |
| `resolverSituacaoEvento` (as oito situações e a precedência da seção 5.1); a Etapa 2 acrescenta a camada de sessão por cima | Etapa 2 |
| Link "Sou jurado" → `/e/[slug]/convite` | Etapa 3 |
| Cenário `SEM_ENCERRAMENTO_AUTOMATICO` (registrado em `mocks/cenarios.ts`) | Etapas 2 e 9 |
| Matriz de verificação tema × situação | Etapa 9 |

---

## 4. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | **Baseline visual = Festival.** "Igual à landing atual" significa mesmo layout e mesmas cores de marca, com as duas exceções da D15 da Etapa 0: texto **escuro** sobre o laranja e verde/laranja **ajustados** quando usados como texto. A fonte passa a ser a do tema (Inter no Festival). | Permite validar a migração para tokens sem ambiguidade e cumpre a política de contraste. Decisão de marca: texto escuro sobre o laranja (rev. 4, E1; seção 10). |
| D2 | **A landing é pública e independente da sessão.** Não lê `useSessao()`. Quem já votou ou é admin vê o mesmo que um visitante; a Etapa 2 cuida disso em `/e/[slug]`. | Evita personalizar uma página que também será acessada por QR Code sem login. |
| D3 | **O evento exibido é o de `dev.slugPadrao`** (inicial: `ver-e-fazer-filmes`). Não há seleção por URL em `/`. | Na trilha de produção (rev. 4, A2), `/` mostrará o evento atual da plataforma; no mockup a toolbar simula isso. |
| D4 | **Textos sem artigo e sem gênero.** O `h1` é o nome do evento, o subtítulo é a `descricao`, e as frases usam o rótulo plural em minúsculas, sem artigo. | O texto atual ("Vote nos melhores curtas do...") não serve para "projetos" ou "músicas". |
| D5 | **Uma função pura decide a situação** (`resolverSituacaoEvento`), com precedência: evento `CONCLUIDO`, depois `RASCUNHO`, depois a urna. | Faixa, CTA, link de jurado e prévia leem a mesma decisão. |
| D6 | **O CTA do header acompanha o CTA principal** (mesmo rótulo e destino) e fica **visível no mobile**. Sem CTA principal, o header não mostra botão. | Hoje o botão é `hidden sm:inline-block`; a votação é mobile-first (QR Code). |
| D7 | **Rascunho na landing:** mostra "Evento em preparação", CTA desabilitado, **oculta** a prévia dos candidatos e o link de jurado. **Confirmado no DD §9.1 (rev. 3, B1).** | Pelo princípio de que nada do evento é público em rascunho (DD §9.1: "nada é público"). Mostrar o aviso é só conveniência do mockup. |
| D8 | **Prévia dos candidatos:** só votáveis (`publicado` e não desqualificado), até 6, na ordem de `ordem` (sem embaralhar), sem links nos cartões e sem qualquer dado de resultado. Aparece também antes da abertura da urna (rev. 3, E33: mantida). | A lista real é pós-login (Etapa 4). A prévia é só vitrine. |
| D9 | **Metadata no servidor** via `obterMetadadosEvento`. Trocar o evento na toolbar não muda o `<title>`. | O estado é do cliente; aceitável no mockup. |
| D10 | **Estado da faixa em `role="status"`; contagem fora dela.** A contagem usa o `role="timer"` da `ContagemRegressiva` (sem anúncio a cada segundo). | O leitor de tela anuncia só mudanças de situação. |

---

## 5. Modelo e regras

### 5.1 Situações

A função `resolverSituacaoEvento(evento, configApresentacao, agoraMs, opcoes?)` (pura, em `src/dominio/situacaoEvento.ts`) devolve uma das oito situações, avaliadas **nesta ordem**. Com `opcoes.ignorarRascunho`, a situação 2 é pulada e a decisão segue pela urna (usado pela Etapa 2 para o admin):

| # | Situação | Condição | Faixa de status | CTA principal (destino) | "Sou jurado"* | Prévia |
|---|---|---|---|---|---|---|
| 1 | `CONCLUIDO` | `estado = CONCLUIDO` | "Evento concluído" | Nenhum | Oculto | Visível |
| 2 | `EM_PREPARACAO` | `estado = RASCUNHO` | "Evento em preparação" | "Em breve", **desabilitado**, com texto "A votação ainda não está disponível." | Oculto | **Oculta** |
| 3 | `ENCERRADA` | `estadoUrna = ENCERRADA` | "Votação encerrada" | Nenhum | Oculto | Visível |
| 4 | `TEMPO_ESGOTADO` | `ABERTA`, `janelaFim` definida e `agora ≥ janelaFim` (só ocorre com `encerramentoAutomatico = false`) | "Tempo esgotado" + "Aguardando a organização encerrar a votação" | "Quero votar" → `/e/[slug]` | Visível | Visível |
| 5 | `RETA_FINAL` | `ABERTA` e `0 < restante ≤ limiarRetaFinalSegundos` | Selo de aviso "Reta final" + contagem | "Quero votar" → `/e/[slug]` | Visível | Visível |
| 6 | `ABERTA` | `estadoUrna = ABERTA` | "Votação aberta" + "Termina em {contagem}" (se houver `janelaFim`) | "Quero votar" → `/e/[slug]` | Visível | Visível |
| 7 | `ABERTURA_PENDENTE` | `NAO_INICIADA`, `janelaInicio` definida e `agora ≥ janelaInicio` | "Aguardando a abertura pela organização" | "Criar conta" → `/e/[slug]` | Visível | Visível |
| 8 | `NAO_INICIADA` | `estadoUrna = NAO_INICIADA` | "A votação abre em {data e hora}" + contagem; sem `janelaInicio`: "Data de abertura a definir" | "Criar conta" → `/e/[slug]` | Visível | Visível |

\* "Sou jurado" também exige `moduloJuri` ligado. Destino: `/e/[slug]/convite`.

Regras:
- `restante = janelaFim − agora`. `limiarRetaFinalSegundos` vem de `configApresentacao` (padrão do schema: 300).
- A urna **nunca abre sozinha**: por isso a situação 7 existe quando o horário de abertura já passou (D7 da Etapa 0).
- Com `encerramentoAutomatico` ligado, passar de `janelaFim` encerra a urna pelo relógio (situação 3), então a situação 4 só aparece com a opção desligada.
- Todo estado tem **texto e ícone**, nunca só cor (via `Selo`).
- A landing não exibe contagem de votos, placar ou resultado em nenhuma situação.

### 5.2 Origem de cada dado

| Elemento | Origem | Quando ausente |
|---|---|---|
| Nome (header, `h1`, footer, `alt`) | `tema.nomeExibicao`, senão `evento.nome` | — |
| Logo | `tema.logoUrl` (via `LogoEvento`) | Nome em texto no header |
| Subtítulo | `evento.descricao` | Não renderiza |
| Badge | `evento.local` (mock-only) + ano de `janelaInicio` no fuso do evento | Mostra só o que existir; sem nada, não renderiza |
| Rótulos | `tema.rotuloCandidato` e `tema.rotuloCandidatos` | — |
| "Sobre o evento" | `evento.linkSobre` (mock-only) | Não renderiza |
| Aviso de privacidade da plataforma (rev. 4, E29) | Aviso da VaiVota (controladora dos dados); **sempre** presente | — (texto pendente; no mockup, link placeholder) |
| Aviso de privacidade do evento (opcional e complementar; rev. 4, E29) | `evento.avisoPrivacidadeUrl` | Não renderiza |
| Link "Sou jurado" | `evento.moduloJuri` e situação (5.1) | Não renderiza |
| Fuso | `evento.fusoHorario` | — |
| Candidatos da prévia | `votaveis(candidatos)` ordenados por `ordem` | Seção some (menos de 2) |

### 5.3 Textos

Texto genérico, sem nada específico de evento. `{rotulos}` é `rotuloCandidatos` em minúsculas (`toLocaleLowerCase("pt-BR")`).

| Onde | Texto |
|---|---|
| Chamada do hero | "Escolha seus favoritos entre {n} {rotulos}" (sem o número se `n < 2`) |
| Passo 1 | **Conheça** — "Veja os {rotulos} em votação neste evento." |
| Passo 2 | **Vote** — "Crie sua conta, escolha seu favorito e confirme. Cada pessoa vota uma vez." |
| Passo 3 | **Acompanhe** — "O resultado é divulgado pela organização do evento." |
| Link de jurado | "Sou jurado" |
| Link externo | "Sobre o evento" (com ícone e aviso de nova aba para leitor de tela) |
| Footer | "{nome}", "Feito com VaiVota", "Aviso de privacidade" (da VaiVota, sempre) e, com `avisoPrivacidadeUrl`, "Aviso de privacidade do evento" (rev. 4, E29) |
| Seção de candidatos | `h2` = `rotuloCandidatos`; legenda "{n} no total"; se `n > 6`, "e mais {n − 6}" |

### 5.4 Layout

Ordem fixa das seções: **header**, **faixa de status**, **hero** (badge, `h1`, subtítulo, chamada, CTAs e link de jurado), **como funciona**, **prévia dos candidatos**, **footer**.

- Mobile-first, uma coluna; a prévia usa 2 colunas no mobile e 3 a partir de `md`.
- Títulos longos nos cartões da prévia são limitados a 2 linhas.
- Toda a landing em `<main id="conteudo">` (alvo do `SkipLink`).

---

## 6. Estrutura de arquivos

| Arquivo | Ação |
|---|---|
| `src/app/page.tsx` | Vira composição fina das seções + `generateMetadata` |
| `src/dominio/situacaoEvento.ts` | Novo (`resolverSituacaoEvento`, tipo `SituacaoEvento`) |
| `src/dominio/situacaoEvento.test.ts` | Novo (Vitest; rev. 3, D19) |
| `src/components/landing/LandingHeader.tsx` | Novo |
| `src/components/landing/StatusUrna.tsx` | Novo (faixa de status + contagem) |
| `src/components/landing/LandingHero.tsx` | Novo |
| `src/components/landing/ComoFunciona.tsx` | Novo |
| `src/components/landing/CandidatosPrevia.tsx` | Novo |
| `src/components/landing/LandingFooter.tsx` | Novo |
| `src/mocks/cenarios.ts` | Registra `SEM_ENCERRAMENTO_AUTOMATICO` |

`layout.tsx`, `globals.css`, `LogoEvento`, `ImagemCandidato` e os componentes de UI **não** são criados aqui (Etapa 0).

---

## 7. Checkpoints

### CP1 — Migração para tokens (paridade visual)

**Objetivo:** tirar toda cor e texto de marca do código sem mudar o layout do Festival.

**Tarefas**
- [ ] Conferir o `src/app/page.tsx` atual (existe no repositório; rev. 3, B3): cores, textos e fontes fixos que serão migrados.
- [ ] Antes de editar, guardar capturas da landing atual em 360 px e 1280 px como referência.
- [ ] Substituir `#F15A29`, `#8DC63F`, `#5f8a1f` e as classes `zinc-*` de marca por utilitários de token: primária e secundária como fundo (`bg-tema-*`), texto sobre elas (`text-tema-sobre-*`), cores como texto sobre o fundo (`text-tema-primaria-texto`, `text-tema-secundaria-texto`), neutros (`text-tema-texto-suave`, `bg-tema-superficie`, `border-tema-borda`).
- [ ] Trocar os botões e links atuais por `Botao`.
- [ ] Nenhuma ocorrência de hex de marca nem de classe de paleta em `src/app/page.tsx` (`grep` limpo).

**Pronto quando:** com o tema Festival, a página fica igual às capturas, salvo as diferenças previstas na D1 (texto escuro sobre o laranja, verde e laranja ajustados como texto, fonte do tema); com a Semana Tech, as cores mudam sem tocar em código.

**Entrega:** `VaiVota-E1-CP1.zip`

### CP2 — Extração de componentes

**Objetivo:** separar `page.tsx` em seções reutilizáveis.

**Tarefas**
- [ ] Criar `LandingHeader`, `LandingHero`, `ComoFunciona` e `LandingFooter` em `src/components/landing/`.
- [ ] Usar o `LogoEvento` da Etapa 0 no header (com a Semana Tech, o nome aparece em texto no lugar da logo).
- [ ] `page.tsx` só compõe as seções (menos de 30 linhas, sem lógica de evento).
- [ ] Marcos semânticos: `header`, `main id="conteudo"`, `footer`.

**Pronto quando:** a página renderiza igual ao CP1 e, com a Semana Tech, o header mostra o nome em texto.

**Entrega:** `VaiVota-E1-CP2.zip`

### CP3 — Conteúdo vindo do evento

**Objetivo:** nenhum texto específico de evento fica no código.

**Tarefas**
- [ ] Ligar a landing ao `useEventoAtivo()` (sem slug, vale `dev.slugPadrao`).
- [ ] Header: `LogoEvento`. Hero: badge (`local` e ano), `h1` = nome, subtítulo = `descricao`, chamada com a contagem de votáveis e o rótulo (5.3), CTA principal temporário "Quero votar" → `/e/[slug]`.
- [ ] "Sobre o evento" só aparece com `linkSobre` (`<a target="_blank" rel="noopener noreferrer">`, com ícone e texto para leitor de tela).
- [ ] "Como funciona" com os 3 passos da seção 5.3.
- [ ] Footer: nome, "Feito com VaiVota" discreto, link do aviso de privacidade **da VaiVota sempre** e, só com `avisoPrivacidadeUrl`, o link complementar do aviso do evento (rev. 4, E29).
- [ ] Link "Sou jurado" → `/e/[slug]/convite` (só com `moduloJuri`; a regra por situação entra no CP4).
- [ ] `generateMetadata` em `page.tsx` usando `obterMetadadosEvento`.

**Pronto quando:** alternar entre Semana Tech e Festival na toolbar troca nome, logo, textos, rótulos e links sem nenhuma string de evento no JSX (`grep` por "Festival" e "Semana" limpo em `src/app/page.tsx` e `src/components/landing/`).

**Entrega:** `VaiVota-E1-CP3.zip`

### CP4 — Situações do evento e da urna

**Objetivo:** a landing reage ao estado simulado na toolbar.

**Tarefas**
- [ ] `resolverSituacaoEvento` conforme a seção 5.1, em `src/dominio/situacaoEvento.ts`.
- [ ] `src/dominio/situacaoEvento.test.ts` (Vitest, D19 da Etapa 0): uma entrada por situação da tabela 5.1, a precedência e `ignorarRascunho`.
- [ ] `StatusUrna`: `Selo` + texto no `role="status"` e `ContagemRegressiva` ao lado, com o texto de zero definido por situação ("Aguardando a abertura pela organização" na situação 8).
- [ ] CTA principal, CTA do header e link "Sou jurado" ditados pela situação (colunas da tabela 5.1). CTA desabilitado em `EM_PREPARACAO` com o texto explicativo ligado por `aria-describedby`.
- [ ] Datas e contagens no fuso do evento (`formatarDataHora`).
- [ ] Registrar o cenário `SEM_ENCERRAMENTO_AUTOMATICO` em `mocks/cenarios.ts`.

**Pronto quando:** as oito situações da tabela 5.1 podem ser provocadas pela toolbar e a contagem anda sozinha:
- Rascunho, concluído e encerrada: pelos controles de evento e urna.
- Não iniciada e aberta: pelos controles de urna.
- Abertura pendente: urna "Não iniciada" + relógio em "Fim da janela" (Festival).
- Reta final: urna "Aberta" + relógio em "Reta final".
- Tempo esgotado: cenário `SEM_ENCERRAMENTO_AUTOMATICO` + relógio em "Fim da janela".

Nenhum dado de resultado aparece em nenhuma delas.

**Entrega:** `VaiVota-E1-CP4.zip`

### CP5 — Prévia dos candidatos

**Objetivo:** vitrine curta dos candidatos votáveis.

**Tarefas**
- [ ] `CandidatosPrevia`: até 6 votáveis por `ordem` (D8), cada um com `ImagemCandidato` + título (2 linhas no máximo) em lista `<ul>`, sem link.
- [ ] `h2` com `rotuloCandidatos`, legenda "{n} no total" e "e mais {n − 6}" quando passar de 6.
- [ ] A seção some com menos de 2 votáveis ou na situação `EM_PREPARACAO`.
- [ ] Desqualificados e rascunhos nunca aparecem.

**Pronto quando:** Semana Tech mostra 6 de 8 + "e mais 2" (com um título longo bem contido; todos os votáveis têm imagem, então o cartão sem imagem não ocorre na landing: esse caso é conferido na galeria `/dev/ui` e na lista do admin da Etapa 6, rev. 3, C5); Festival mostra os 6 sem "e mais"; o rascunho esconde a seção; o cenário `SEM_CANDIDATOS` (Etapa 2, quando existir) também a esconde.

**Entrega:** `VaiVota-E1-CP5.zip`

### CP6 — Responsividade e acessibilidade

**Objetivo:** mobile-first utilizável.

**Tarefas**
- [ ] Layout validado em 360, 768 e 1280 px, sem scroll horizontal. (Rev. 4, E27: na Semana Tech o voto acontece em celulares e computadores; no Festival, em celulares e totens. Dispositivos-alvo consolidados na Etapa 9.)
- [ ] CTA do header visível em todos os tamanhos (D6).
- [ ] Áreas de toque com pelo menos 44 px; foco visível em todo link e botão.
- [ ] Hierarquia de títulos sem saltos (um só `h1`); `SkipLink` leva ao `main`.
- [ ] Leitor de tela anuncia só a mudança de situação (D10), nunca a cada segundo.
- [ ] Animações (se houver) respeitam `prefers-reduced-motion`.
- [ ] Contraste conferido nos dois temas em botão, badge, faixa de status e links, incluindo o selo de "Reta final".

**Pronto quando:** navegar só pelo teclado percorre toda a página em ordem lógica, e nenhum par de texto fica abaixo de 4,5:1 nos dois temas.

**Entrega:** `VaiVota-E1-CP6.zip`

### CP7 — Revisão e fechamento

**Objetivo:** fechar a etapa com evidência.

**Tarefas**
- [ ] `lint`, `typecheck`, `test` e `build` sem erros; sem `console.error` nem warnings de hidratação.
- [ ] Matriz de verificação abaixo preenchida.
- [ ] Todos os links levam a uma rota existente (stubs incluídos).
- [ ] `grep` limpo de hex de marca, classes de paleta e strings de evento em `src/app/page.tsx` e `src/components/landing/`.
- [ ] `page.tsx` revisado: só composição e metadata.

| Tema \ Situação | Em preparação | Não iniciada | Abertura pendente | Aberta | Reta final | Tempo esgotado | Encerrada | Concluído |
|---|---|---|---|---|---|---|---|---|
| Semana Tech | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Festival | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

**Pronto quando:** a matriz está inteira marcada e a seção 9 atendida.

**Entrega:** `VaiVota-E1-CP7.zip` (final da Etapa 1)

---

## 8. O que fica fake

| Item | Tratamento |
|---|---|
| Local do evento (badge) e link "Sobre o evento" | Campos mock-only no seed |
| Link do aviso de privacidade | Aviso da VaiVota: link placeholder (texto pendente, E29); aviso do evento: placeholder no seed do Festival |
| `<title>` e descrição | Fixos no evento padrão inicial; não acompanham a toolbar |
| Horário de abertura e de fechamento | Do seed, com relógio simulado |
| Rascunho visível na landing | Só para o mockup (D7) |

## 9. Critérios de aceitação

- [ ] A landing não contém nome, texto ou cor específicos de um evento no código.
- [ ] Trocar o evento na toolbar muda identidade visual, logo, textos e rótulos.
- [ ] As oito situações têm faixa de status, CTA, link de jurado e prévia coerentes com a tabela 5.1.
- [ ] O tema Festival mantém o layout e as cores de marca da landing atual, com apenas as diferenças da D1.
- [ ] Nenhum dado de resultado ou contagem de votos aparece.
- [ ] A contagem regressiva anda sozinha, no fuso do evento, sem warnings de hidratação.
- [ ] Funciona em celular, com foco visível, navegação por teclado e sem par de texto abaixo de 4,5:1.
- [ ] Nada é salvo; o F5 volta ao estado inicial do seed.

## 10. Pendências

- **Marca do Festival:** **Resolvida (rev. 4, E1):** texto escuro sobre o laranja `#F15A29` (≈5,3:1), verde ajustado quando for texto (D15 da Etapa 0); aprovação visual com a organização.
- **Aviso de privacidade (rev. 4, E29):** a controladora dos dados é a VaiVota; o link do aviso da plataforma aparece sempre no rodapé; `avisoPrivacidadeUrl` do evento é opcional e complementar. Texto do aviso pendente (rascunho a partir do DD §10.4).
- **Rascunho na landing pública:** **Resolvida (rev. 3, B1):** confirmado pelo DD §9.1 ("nada é público"); a D7 vale como está e o "em preparação" é só conveniência do mockup.
- **Candidatos visíveis antes da abertura:** **Resolvida (rev. 3, E33): confirmado** — a prévia aparece com a urna não iniciada.
- **Ordem da prévia:** hoje fixa por `ordem` (os mesmos 6 sempre aparecem primeiro). Decidir se na trilha de produção (rev. 4, A2) será embaralhada ou limitada de outra forma.
- **`Evento.local` e `Evento.linkSobre`:** **Resolvida (rev. 3, E34):** serão campos de `Evento` no schema (F-5, mudança a aprovar); continuam `// mock-only` até lá. **Rev. 4:** F-5 aprovada.
- **Capa do tema (`capaUrl`):** nenhum seed a define; avaliar o uso na landing quando a Etapa 6 permitir configurar.
- **Fonte do Festival:** a landing atual pode usar outra fonte além da Inter; confirmar no CP1.
