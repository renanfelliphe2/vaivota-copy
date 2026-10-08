# VaiVota — Fase 1 · Etapa 4: Candidato

> **Rotas:** `/e/[slug]/votar` (parte 1: gate de estado, lista e detalhe dos candidatos)
> **Depende de:** Etapa 0 (Fundação), Etapa 2 (`resolverVisaoEvento`, `EventoShell`, textos de estado) e Etapa 3 (sessão, participação e guarda de e-mail verificado)
> **Alimenta:** Etapa 5 (seleção, revisão e envio do voto continuam sobre esta rota) e Etapa 9
> **Fontes:** `Login.md` (seções 5, 6 e 7), `Jurado.md` (seções 6 e 9), `schema.prisma` (`Candidato`, `CampoCandidato`, `Evento.bloquearVotoProprio`, `Participacao`), `package.json`, `DocumentDesign.md` v1.1 (DD §4 e §9.2).
> **Status:** versão final consolidada. Substitui `Etapa4 Candidato.md`. **Revisão 3 (07/10/2026):** aplica as decisões do documento de pendências (itens B1, C2, C5, C10, D19, E5, E6). **Revisão 4 (07/10/2026):** A2, A5, E21.

---

## 1. Objetivo

Entregar a **parte 1 de `/e/[slug]/votar`**: o que a pessoa vê depois de entrar no evento e antes de escolher em quem votar. Isso inclui a **gate de estado** da rota (qual tela aparece para cada combinação de evento, urna, papel e sessão), a **lista de candidatos** em cartões, o **detalhe** de cada candidato e a regra de **voto em si mesmo**. Tudo com o tema do evento e sem gravar nada.

Esta etapa precisa garantir:
- **Uma única função pura decide a tela de `/votar`** (`resolverEstadoVotar`), composta sobre `resolverVisaoEvento` da Etapa 2. A Etapa 5 só consome.
- **A ordem dos cartões é determinística por usuário e evento** (semente), nunca `Math.random()`, e idêntica entre lista e detalhe.
- **Nenhuma tela de `/votar` mostra número de votos**, para nenhum papel.
- **Lista e detalhe nascem prontos para receber a ação de escolher** (Etapa 5) por pontos de extensão, sem refatoração.
- **Nenhum texto de interface concorda em gênero com o rótulo do tema** (D10 da Etapa 2): "Curta" é feminino, "Projeto" é masculino.

## 2. Escopo

**Dentro**
- Rota `/e/[slug]/votar` dentro do grupo `(participante)` (substitui o stub da Etapa 0).
- Gate de estado: nove telas além da lista (seção 5.2), compostas sobre `resolverVisaoEvento`.
- Lista responsiva de candidatos votáveis, cartão e ordem por semente.
- Detalhe em diálogo controlado por `?candidato=<id>`, com anterior e seguinte na ordem do usuário.
- Regra de **voto em si mesmo**: selo e dica no cartão, função pura e código de erro `VOTO_PROPRIO` (validado no serviço pela Etapa 5).
- Tela "Administradores não votam", tela "Já votou" **simples** e aviso de "Tempo esgotado" com a lista ainda votável.
- Cenários `MUITOS_CANDIDATOS` e `VOTO_PROPRIO_PERMITIDO`.
- Mobile-first, foco visível, navegação por teclado e movimento reduzido.

**Fora (e em qual etapa fica)**
- **Seleção** do candidato, "Escolher", barra de seleção, revisão, confirmação, sucesso, versão final de "já votou" e erros de envio → **Etapa 5**.
- Aviso "Seu voto é identificado para a organização" e marcação "Seu voto atual" do jurado → **Etapa 5** (dependem de `consultarEstadoVoto`).
- Login, verificação de e-mail e redirecionamentos de quem não tem acesso → `RotaGuard` (Etapa 0) e formulários (Etapa 3).
- Slug inexistente → gate da Etapa 0.
- Criação da participação → Etapa 3 (no login, no registro ou por `garantirParticipacao` ao chegar ao evento já logado). O voto nunca cria participação (rev. 3, C2).
- CRUD de candidatos, imagem real e campos extras → Etapa 6.
- Contagens, ranking e resultado → Etapas 7 e 8.
- Trailer ou vídeo do candidato (só imagem como mídia). Não existe trailer por candidato: o único trailer é o do evento, por link/embed (rev. 4, E21).

---

## 3. Contrato com as outras etapas

### 3.1 O que esta etapa recebe

| Item | Dono |
|---|---|
| `lib/aleatorio.ts` (`hashDeTexto`, `criarGerador`, `embaralharComSemente`), `dominio/candidatos.ts` (`publicados`, `votaveis`) | Etapa 0 |
| Seed: 8 candidatos votáveis na Semana Tech e 6 no Festival, com os casos de borda da seção 5.6 da Etapa 0; `CampoCandidato`; `Evento.bloquearVotoProprio`; Gabi vinculada a `cand-st-08` e `cand-fv-03` | Etapa 0 |
| `ImagemCandidato` (D16: `placeholder:<n>`, caminho, `blob:`, `null`), `Dialogo`, `Botao`, `Selo`, `Alerta`, `Cartao`, `Carregando`, `ContagemRegressiva`, `LiveRegion` | Etapa 0 |
| `RotaGuard` com `EMAIL_VERIFICADO` no stub de `votar` (cobre deslogado e e-mail não verificado), `AcessoRestrito`, stub `(participante)/votar/page.tsx` | Etapa 0 |
| `useEventoAtivo()`, `useSessao()`, `useAgora()`, `Resultado<T>`, `CodigoErro`, `servicos/mensagens.ts`, mecanismo de cenários, lint de fronteira de dados, toolbar | Etapa 0 |
| `resolverSituacaoEvento` (oito situações, `TEMPO_ESGOTADO`, `RETA_FINAL`) | Etapa 1 |
| `resolverVisaoEvento` (`variante`, `acao`, `avisoJuriDesligado`, `agradecer`), `lib/textosEstado.ts` (`textoDoEstado`), `EventoShell` (com `main id="conteudo"`), `UrnaStatusCard`, textos do contador, do aviso de jurado e de "Tempo esgotado", cenário `SEM_CANDIDATOS` | Etapa 2 |
| Participação criada no login, `garantirParticipacao` (chamado pelo slot de acesso do `EventoShell`), guarda de e-mail verificado, `MenuUsuario` | Etapa 3 |

### 3.2 O que esta etapa entrega

| Item | Consumidor |
|---|---|
| `dominio/estadoVotar.ts` (`resolverEstadoVotar`, tipos `TelaVotar` e `EstadoVotar`) e o hook `useEstadoVotar()` | Etapa 5 (consome a gate), Etapa 9 |
| `TelaVotar` (composição da rota) com os pontos de extensão da seção 5.8 | Etapa 5 (acrescenta seleção, `?passo=` e envio) |
| `ListaCandidatos`, `CartaoCandidato`, `DetalheCandidato` com os *slots* `renderAcao`, `renderSelo` e `renderAcoes` | Etapa 5 |
| `useCandidatosParaVotacao()` e `dominio/ordemVotacao.ts` (`ordenarParaVotacao`, `localizarNaOrdem`) | Etapa 5 (revisão mostra o candidato pela mesma ordem e lookup) |
| `dominio/votoProprio.ts` (`candidatoBloqueadoParaVoto`) e o código de erro `VOTO_PROPRIO` com mensagem | Etapa 5 (`votarPopular`, `votarJuri`) |
| Chave de texto `ADMIN_NAO_VOTA` | Etapas 5 e 9 |
| Parâmetro de URL `?candidato=` e a **reserva** de `?passo=` com regra de precedência (seção 5.7) | Etapa 5 |
| Tela `JA_VOTOU` simples (marcada `// TODO(Etapa 5)`) | Etapa 5 (substitui) |
| Cenários `MUITOS_CANDIDATOS` e `VOTO_PROPRIO_PERMITIDO` | Etapa 9 |
| Matriz de verificação V1–V25 | Etapa 9 |
| Lista de encaminhamentos para a Etapa 5 (seção 10) | Etapa 5 |

---

## 4. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | **A gate é `resolverEstadoVotar` = `resolverVisaoEvento` + papel + sessão.** Ela chama `resolverVisaoEvento` (D1 da Etapa 2) e só acrescenta o que é específico de `/votar`. Começa **depois** do `RotaGuard`: não trata login nem e-mail não verificado (só devolve `ACESSO_PENDENTE` no quadro transitório entre uma saída da sessão e o redirecionamento, e enquanto `garantirParticipacao` da Etapa 3 cria a participação de quem tem sessão e ainda não tem participação no evento; rev. 3, C2). Pura, sem React. | A Etapa 2 mandou compor. Passos de login e verificação já são do `RotaGuard` (D21 da Etapa 0). |
| D2 | **Esta etapa termina na lista.** Seleção, "Escolher" e barra de seleção são da Etapa 5. A lista e o detalhe expõem *slots* (`renderAcao`, `renderSelo`, `renderAcoes`) e `bloqueadoVotoProprio` por item. Sem esses *slots* preenchidos, a lista é somente leitura e mostra um aviso provisório `// TODO(Etapa 5)`. | Escopo definido pelo usuário. Evita dois nomes e duas semânticas de seleção (`aria-pressed` × radio). |
| D3 | **O detalhe é um `Dialogo` (Etapa 0) controlado por `?candidato=<id>`.** Abrir = `router.push` com `{ scroll: false }`; anterior e seguinte = `router.replace`; fechar (botão, Esc ou fundo) = `router.back()` se a lista abriu o detalhe nesta visita, senão `router.replace` sem o parâmetro (link direto). O botão voltar do navegador fecha o detalhe. | Link compartilhável, lista mantém o scroll e a pilha de histórico não cresce ao navegar entre candidatos. |
| D4 | **Ordem por semente `${usuarioId}:${eventoId}`**, aplicada **depois** de ordenar por `ordem` (desempate por `id`), sobre `votaveis()`. É estável **por usuário** (mesmo usuário, mesma ordem enquanto o conjunto não mudar), não "estável após F5": o F5 volta ao seed e à sessão deslogada (D18 da Etapa 0). Função pura em `dominio/ordemVotacao.ts`, usada por lista e detalhe. | Sem hidratação divergente e sem `Math.random()` no render. `Login.md`: ordem embaralhada por usuário, estável na sessão. |
| D5 | **Só candidatos votáveis** (`votaveis()`) aparecem, na lista e no detalhe. Despublicado (rascunho) e desqualificado não aparecem em nenhum cenário. **Confirmado (rev. 3, C10):** desqualificado sai da votação e do ranking; os votos dele ficam. | `Login.md`: candidatos não publicados não aparecem. O schema diz que desqualificado "sai do ranking"; a Etapa 0 já o exclui de `votaveis()`. O DD §7.6 será atualizado (F-3). |
| D6 | **Voto em si mesmo (A5 do Contexto).** Respeita `evento.bloquearVotoProprio` (padrão `true`). Regra pura `candidatoBloqueadoParaVoto(candidato, usuarioId, evento)` em `dominio/votoProprio.ts`. O cartão e o detalhe mostram selo "Você faz parte da equipe" e a dica "Quem faz parte da equipe não vota na própria candidatura."; a Etapa 5 não oferece ação nesse item. **Novo `CodigoErro` `VOTO_PROPRIO`**, validado também no serviço (Etapa 5). Sem tela de configuração da flag na Etapa 6 (por seed). Cenário `VOTO_PROPRIO_PERMITIDO` torna a flag testável. | O schema e o seed já exigem o bloqueio; "sem efeito na Fase 1" (planner antigo da Etapa 5) contradiz Gabi. Textos sem artigo variável, porque "candidatura" é palavra fixa e não o rótulo do tema. |
| D7 | **`TEMPO_ESGOTADO` continua votável (A7).** Urna `ABERTA` além de `janelaFim`, com `encerramentoAutomatico` desligado, mostra a lista com o aviso "Tempo esgotado. Aguardando a organização encerrar a votação." (texto da Etapa 2). | D7 da Etapa 0: a urna só encerra por ação da organização ou pelo tique automático. Compatível com DD §9.2 (rev. 3, B1). |
| D8 | **Jurado com módulo júri desligado não vê a lista**: tela `JURI_DESLIGADO` com o aviso da Etapa 2. Não vira público. | D6 da Etapa 2; `Jurado.md`: o jurado não vota na apuração popular. |
| D9 | **Precedência `SEM_CANDIDATOS` antes de `JA_VOTOU`**, como em `resolverVisaoEvento` (a ação `VER_CONFIRMACAO` só existe na variante `ABERTA`). Combinação só alcançável por cenário, porque a Etapa 6 trava despublicar com a urna aberta. | Composição pura, sem divergência entre entrada e `/votar`. |
| D10 | **Esta etapa não acrescenta campo a `ui`.** O estado do detalhe vive na URL. Parâmetros da rota: `candidato` (Etapa 4) e `passo` (reservado à Etapa 5). **Precedência:** com `passo` presente e diferente de `lista`, `candidato` é ignorado. Fora da tela `LISTA`, `candidato` é ignorado e **não é limpo**. | Link compartilhável e voltar do navegador; a seleção (que precisa de `ui`) é da Etapa 5 (T18 do Contexto). |
| D11 | **Anterior e seguinte não são circulares:** desabilitados nas pontas, com a posição "{i} de {n}". Com um só candidato, a navegação não é renderizada. Rótulos "Anterior" e "Seguinte" (invariáveis em gênero). | Decisão de UX; circular desorienta quem usa leitor de tela. |
| D12 | **Administrador vê "Administradores não votam" em qualquer estado do evento**, inclusive rascunho, antes de qualquer outra regra de estado, com atalho para o painel. | D13 da Etapa 0. Confirmado pelo DD §4 (papel por participação única por evento) (rev. 3, B1). |
| D13 | **Leitura 100% por seletor, sem serviço**: sem *skeleton*, sem latência, sem `useConsulta` nesta etapa. A lista deriva de `candidatos` e `camposCandidato` do evento ativo. | D3 da Etapa 0: candidatos publicados são estado público do cliente. O *skeleton* do planner antigo só valia para um serviço. |
| D14 | **Esta etapa não grava nada e não audita nada.** Ela não escreve no `banco`, não cria participação e não registra ação de auditoria. | Leitura pura; evita duplicar o catálogo de auditoria (T12 do Contexto). |

---

## 5. Modelo e regras

### 5.1 A função da gate

```ts
// src/dominio/estadoVotar.ts
type TelaVotar =
  | "ACESSO_PENDENTE"     // transitório: o RotaGuard já está redirecionando, ou garantirParticipacao (Etapa 3) ainda roda
  | "ADMIN_NAO_VOTA" | "INDISPONIVEL" | "CONCLUIDO" | "ENCERRADA" | "NAO_INICIADA"
  | "JURI_DESLIGADO" | "SEM_CANDIDATOS" | "JA_VOTOU"
  | "LISTA"

type EstadoVotar = {
  tela: TelaVotar
  visao: SaidaVisao                        // da Etapa 2; telas de estado leem situação, contagem e `agradecer` daqui
  papelVoto: "PUBLICO" | "JURADO" | null   // só com tela = "LISTA"
  avisoTempoEsgotado: boolean              // situação TEMPO_ESGOTADO; só com tela = "LISTA"
}

function resolverEstadoVotar(entrada: EntradaVisao): EstadoVotar   // EntradaVisao: seção 5.1 da Etapa 2
```

`useEstadoVotar()` (em `store/seletores/estadoVotar.ts`) monta a `EntradaVisao` com `useEventoAtivo()`, `useSessao()`, `useAgora()` e `votaveis(candidatos).length`, e devolve `EstadoVotar | null` (nulo se não houver evento ativo).

### 5.2 Ordem de avaliação

Avaliada **nesta ordem**; a primeira regra que bater define a tela. `visao` é a saída de `resolverVisaoEvento` para a mesma entrada.

| # | Condição | Tela | Observação |
|---|---|---|---|
| 1 | `sessao.logado = false` ou `emailVerificado = false`, ou sessão sem participação no evento (papel nulo) | `ACESSO_PENDENTE` | Não é regra de negócio: o `RotaGuard` redireciona (login ou verificação), ou `garantirParticipacao` (Etapa 3) está criando a participação `PUBLICO` (rev. 3, C2). Renderiza só `Carregando`, para a lista nunca piscar |
| 2 | Papel `ADMIN` | `ADMIN_NAO_VOTA` | Em qualquer estado, inclusive rascunho (D12) |
| 3 | `visao.variante = INDISPONIVEL` | `INDISPONIVEL` | Rascunho para quem não é admin do evento |
| 4 | `visao.variante = CONCLUIDO` | `CONCLUIDO` | |
| 5 | `visao.variante = ENCERRADA` | `ENCERRADA` | Sem botão de voto; com `visao.agradecer`, mostra o agradecimento |
| 6 | `visao.variante = NAO_INICIADA` | `NAO_INICIADA` | Inclui "abertura pendente"; sem lista, nem por link direto |
| 7 | `visao.avisoJuriDesligado` | `JURI_DESLIGADO` | D8 |
| 8 | `visao.variante = SEM_CANDIDATOS` | `SEM_CANDIDATOS` | D9 |
| 9 | `visao.acao = VER_CONFIRMACAO` | `JA_VOTOU` | Público que já votou. **Jurado que já votou segue para a lista** (pode alterar até o fim) |
| 10 | Qualquer outra | `LISTA` | `papelVoto = JURADO` se o papel é `JURADO`, senão `PUBLICO` (papel nulo já caiu na linha 1); `avisoTempoEsgotado = (visao.situacao = TEMPO_ESGOTADO)` |

Nas linhas 3 a 6 e 8, a tela de estado reaproveita o `UrnaStatusCard` da Etapa 2 com a mesma `visao`. As demais usam um `Cartao` simples com `Selo`, título e corpo (seção 5.5). Todas têm um `h1` e um botão "Voltar ao evento" (`/e/{slug}`); `ADMIN_NAO_VOTA` tem "Ir para o painel" (`/e/{slug}/admin`).

### 5.3 Combinações incoerentes forçadas pela toolbar (D17 da Etapa 0)

A toolbar pode forçar estados que o fluxo real não produziria. A precedência da Etapa 1 resolve todos, sem regra nova aqui:

| Combinação forçada | Tela |
|---|---|
| Evento `CONCLUIDO` + urna `ABERTA` | `CONCLUIDO` |
| Evento `RASCUNHO` + urna `ABERTA` ou `ENCERRADA`, usuário não admin | `INDISPONIVEL` |
| Evento `RASCUNHO` + qualquer urna, admin | `ADMIN_NAO_VOTA` |
| Urna `ABERTA` com `janelaInicio` no futuro (Festival aberto pela toolbar) | `LISTA` |
| Urna `NAO_INICIADA` com `janelaInicio` já passada | `NAO_INICIADA` ("Aguardando a abertura pela organização") |

### 5.4 Ordem dos cartões

`ordenarParaVotacao(candidatos, usuarioId, eventoId)` (pura, em `dominio/ordemVotacao.ts`):
1. Filtra com `votaveis()` e **só candidatos do `eventoId`**.
2. Ordena por `ordem` crescente, desempate por `id`.
3. Embaralha com `embaralharComSemente`, usando a semente `hashDeTexto(\`${usuarioId}:${eventoId}\`)`, **sem mutar** a lista recebida.

`localizarNaOrdem(itens, candidatoId)` devolve `{ indice, anterior, seguinte, total }` ou `null` se o id não estiver na lista. É por ela que o detalhe e a revisão (Etapa 5) encontram o candidato: id inexistente, de outro evento, não votável ou desqualificado **dá `null`**.

`useCandidatosParaVotacao()` (em `store/seletores/candidatos.ts`) devolve `{ itens, campos, total } | null`:

```ts
type ItemLista = { candidato: Candidato; bloqueadoVotoProprio: boolean }
// campos: CampoCandidato[] do evento, ordenados por `ordem`
```

A visão composta é memoizada **no hook** (D11 da Etapa 0). O tique de 1 s do relógio não pode re-renderizar os cartões.

### 5.5 Cartão e detalhe

**Cartão** (`CartaoCandidato`, um `<article>` dentro de `<li>`):

| Elemento | Regra |
|---|---|
| Imagem | `ImagemCandidato` da Etapa 0, proporção fixa, `alt` = título |
| Título | `h2`, até 2 linhas (`line-clamp-2`) |
| Descrição | Até 3 linhas |
| Campos extras | Até 2, só os que **têm valor**, na ordem de `CampoCandidato.ordem`, no formato "Rótulo: valor" |
| "Ver detalhes" | `Botao` de contorno, `aria-label` "Ver detalhes: {título}", com `data-candidato-id` (devolução do foco) |
| Selo de voto próprio | Só com `bloqueadoVotoProprio`: `Selo` "Você faz parte da equipe" + dica "Quem faz parte da equipe não vota na própria candidatura." ligada ao cartão por `aria-describedby` |
| *Slots* | `acao` (rodapé) e `selo` (topo), preenchidos pela Etapa 5 |

**Detalhe** (`DetalheCandidato`, sobre o `Dialogo` da Etapa 0, sem portal):

| Elemento | Regra |
|---|---|
| Título | `h2` ligado ao diálogo por `aria-labelledby`; título completo, sem corte |
| Imagem | Grande, `ImagemCandidato` |
| Descrição | Completa, respeitando quebras de linha |
| Campos extras | Todos os que têm valor, com `CampoCandidato.rotulo`, na ordem de `ordem` (`<dl>`) |
| Voto próprio | Mesmo selo e dica do cartão |
| Navegação | "Anterior" e "Seguinte" + "{i} de {n}" (D11) |
| Rodapé | `renderAcoes` (Etapa 5) + "Fechar" |
| Celular | *Bottom sheet* em tela quase cheia; no desktop, modal centralizado (comportamento do `Dialogo`) |
| Ao fechar | Foco volta ao "Ver detalhes" do **último candidato exibido** (via `data-candidato-id`) e a lista mantém o scroll |

### 5.6 Cabeçalho da lista

| Elemento | Regra |
|---|---|
| `h1` | `tema.rotuloCandidatos` como está no tema (já capitalizado), sem artigo |
| Instrução | "Use \"Ver detalhes\" para conhecer melhor antes de decidir." |
| Contador | Texto do contador da Etapa 2: "{n} {rotulos} concorrendo" (conta **candidatos**, nunca votos) |
| Tempo | "Encerra em {contagem}" com `ContagemRegressiva` quando a situação é `ABERTA` ou `RETA_FINAL` e há `janelaFim`; `Selo` de aviso "Reta final" na reta final |
| Tempo esgotado | `Alerta` de aviso com o texto da seção 5.8 (D7), sem contagem |
| Provisório | `Alerta` informativo "A escolha do voto chega na próxima etapa." `// TODO(Etapa 5)` (D2) |

### 5.7 Parâmetros da URL

| Parâmetro | Dono | Regra |
|---|---|---|
| `candidato` | Etapa 4 | Id válido (`localizarNaOrdem` ≠ `null`) abre o detalhe. Id ausente, inválido, de outro evento, de rascunho ou desqualificado: **ignora o parâmetro** e mostra a lista, sem erro. Fora da tela `LISTA`, é ignorado e não é limpo |
| `passo` | Etapa 5 (reservado) | `lista`, `revisao` ou `sucesso`. Com `passo` diferente de `lista`, `candidato` é ignorado |

`useSearchParams` fica dentro de um `<Suspense>` (seção 6). A leitura de `?candidato=` é um efeito de URL, não de estado: sem `setState` em efeito (React Compiler).

### 5.8 Textos e pontos de extensão

**Chaves de estado** (via `textoDoEstado`, com override do tema). Reaproveita as da Etapa 2 e acrescenta uma:

| Tela | Chave | Título | Corpo |
|---|---|---|---|
| `NAO_INICIADA` | `NAO_INICIADA` | (Etapa 2) | (Etapa 2) |
| `ENCERRADA` | `ENCERRADA` | (Etapa 2) | (Etapa 2) |
| `CONCLUIDO` | `CONCLUIDO` | (Etapa 2) | (Etapa 2) |
| `INDISPONIVEL` | `INDISPONIVEL` | (Etapa 2) | (Etapa 2) |
| `SEM_CANDIDATOS` | `SEM_CANDIDATOS` | (Etapa 2) | (Etapa 2) |
| `JA_VOTOU` (simples) | `JA_VOTOU` | (Etapa 2) | (Etapa 2) |
| `ADMIN_NAO_VOTA` | **`ADMIN_NAO_VOTA`** (nova) | Administradores não votam | Esta conta administra o evento. Para acompanhar a votação, use o painel. |
| `JURI_DESLIGADO` | texto fixo da Etapa 2 | — | "A votação do júri não está ativa neste evento." |

**Textos fixos** (sem override do tema): "Ver detalhes", "Fechar", "Anterior", "Seguinte", "{i} de {n}", "Voltar ao evento", "Ir para o painel", "Você faz parte da equipe", a dica de voto próprio, a instrução, o contador e os avisos da seção 5.6. A mensagem de erro de `VOTO_PROPRIO` (`servicos/mensagens.ts`) é "Você não pode votar na própria candidatura."

Nenhum texto desta etapa leva artigo ou adjetivo que concorde com o rótulo; onde o rótulo aparece, entra pelo mesmo mecanismo da Etapa 2 (`{rotulos}` em minúsculas) ou como `h1`.

**Pontos de extensão para a Etapa 5** (props, sem refatorar):

```ts
// ListaCandidatos
renderAcao?:  (item: ItemLista) => ReactNode   // rodapé do cartão ("Escolher", na Etapa 5)
renderSelo?:  (item: ItemLista) => ReactNode   // topo do cartão ("Seu voto atual", na Etapa 5)
// DetalheCandidato
renderAcoes?: (item: ItemLista) => ReactNode   // rodapé do diálogo, ao lado de "Fechar"
```

`TelaVotar` é quem monta esses *slots*; a Etapa 5 altera `TelaVotar`, não os componentes.

### 5.9 Matriz de cenários

Cada linha é conferida pela toolbar, com os usuários seed ("Entrar como"). Como o F5 e a nova aba voltam ao seed (D18), todos os testes são feitos **na mesma aba**, navegando por `Link`.

| # | Cenário | Como provocar | Tela | Extras |
|---|---|---|---|---|
| V1 | Deslogado | Semana Tech, sem sessão | — (`RotaGuard`) | Vai para `/e/{slug}?de=/e/{slug}/votar` |
| V2 | E-mail não verificado | Davi | — (`RotaGuard`) | Vai para `/e/{slug}/verificar-email` (tela de código, rev. 4, A5) |
| V3 | Público, não votou | Semana Tech, Ana | `LISTA` (`PUBLICO`) | 8 cartões, sem contagens |
| V4 | Público, já votou | Semana Tech, Eva | `JA_VOTOU` | Sem lista, sem dizer em quem |
| V5 | Jurado, não votou | Semana Tech, Bruno | `LISTA` (`JURADO`) | Mesma lista, ordem própria do Bruno |
| V6 | Jurado, já votou | Semana Tech, Fábio | `LISTA` (`JURADO`) | Sem marcação de voto atual (Etapa 5) |
| V7 | Candidato vinculado | Semana Tech, Gabi | `LISTA` | `cand-st-08` com selo e dica |
| V8 | Admin do evento | Carla (qualquer evento) ou Hugo no Festival | `ADMIN_NAO_VOTA` | Link "Ir para o painel" |
| V9 | Admin de outro evento | Semana Tech, Hugo | `LISTA` | Usuário comum (D5 da Etapa 2) |
| V10 | Não iniciada | Festival (seed), Ana via "Entrar como" | `NAO_INICIADA` | "Abre em", sem lista |
| V11 | Abertura pendente | Festival + relógio "Fim da janela" | `NAO_INICIADA` | "Aguardando a abertura pela organização" |
| V12 | Urna encerrada | Urna "Encerrada"; Eva e Ana | `ENCERRADA` | Eva vê o agradecimento |
| V13 | Evento concluído | Estado "Concluído" com urna `ABERTA` | `CONCLUIDO` | Seção 5.3 |
| V14 | Rascunho | Estado "Rascunho"; Ana e Carla | `INDISPONIVEL` / `ADMIN_NAO_VOTA` | |
| V15 | Sem candidatos | Cenário `SEM_CANDIDATOS`; Ana e Eva | `SEM_CANDIDATOS` | Eva idem (D9) |
| V16 | Jurado, júri desligado | Bruno + módulo júri desligado | `JURI_DESLIGADO` | Sem lista |
| V17 | Tempo esgotado | `SEM_ENCERRAMENTO_AUTOMATICO` + "Fim da janela" + Ana | `LISTA` | Aviso; ainda votável (D7) |
| V18 | Festival aberto | Festival, urna "Aberta", Ana (sem participação ao chegar) | `ACESSO_PENDENTE` (só `Carregando`, transitório) → `LISTA` | `garantirParticipacao` cria `PUBLICO` (C2); 6 cartões, tema claro, Direção e Duração; `cand-fv-03` com selo para Gabi |
| V19 | Muitos candidatos | Cenário `MUITOS_CANDIDATOS` | `LISTA` | 24 cartões nos dois eventos, todos com imagem. Cartão sem imagem não ocorre na lista (candidato publicado sempre tem imagem, C5): o fallback é conferido na galeria `/dev/ui` e na lista do admin (Etapa 6) |
| V20 | Voto próprio permitido | `VOTO_PROPRIO_PERMITIDO` + Gabi | `LISTA` | Sem selo nem dica |
| V21 | Urna fecha com a tela aberta | Lista ou detalhe aberto, toolbar: urna "Encerrada" | `ENCERRADA` | Sem recarregar; detalhe some |
| V22 | `?candidato=` inválido | Id inexistente, de outro evento, `cand-st-09` (rascunho), `cand-st-10` (desqualificado) | `LISTA` | Sem diálogo e sem erro |
| V23 | `?candidato=` com urna fechada | Urna "Encerrada" ou "Não iniciada" | Tela de estado | Sem diálogo |
| V24 | Troca de tema ou de evento com a tela aberta | Toolbar, com lista e diálogo abertos | `LISTA` | Cores, fonte e rótulos mudam sem recarregar |
| V25 | Sair com a lista aberta | "Sair" no menu | `ACESSO_PENDENTE` → redirecionamento | A lista não pisca |

---

## 6. Estrutura de arquivos

| Arquivo | Ação |
|---|---|
| `src/app/e/[slug]/(participante)/votar/page.tsx` | Substitui o stub: componente de **servidor** que renderiza `<Suspense fallback={<Carregando />}><TelaVotar /></Suspense>`. O `main id="conteudo"` vem do `EventoShell` |
| `src/components/votacao/TelaVotar.tsx` | Novo (cliente): lê `useEstadoVotar`, `useCandidatosParaVotacao` e `?candidato=`; escolhe a tela; monta os *slots* |
| `src/components/votacao/TelaEstadoVotar.tsx` | Novo: telas de estado (seção 5.2), reaproveitando `UrnaStatusCard` |
| `src/components/votacao/CabecalhoLista.tsx` | Novo: `h1`, instrução, contador, tempo e avisos (seção 5.6) |
| `src/components/candidato/ListaCandidatos.tsx` | Novo: grade 1/2/3 colunas, `<ul>`, devolução do foco |
| `src/components/candidato/CartaoCandidato.tsx` | Novo |
| `src/components/candidato/DetalheCandidato.tsx` | Novo: sobre o `Dialogo` da Etapa 0 |
| `src/components/candidato/CamposExtras.tsx` | Novo: resumo (cartão) e lista completa (detalhe) |
| `src/dominio/estadoVotar.ts` | Novo: `resolverEstadoVotar` |
| `src/dominio/ordemVotacao.ts` | Novo: `ordenarParaVotacao`, `localizarNaOrdem` |
| `src/dominio/votoProprio.ts` | Novo: `candidatoBloqueadoParaVoto` |
| `src/dominio/estadoVotar.test.ts`, `src/dominio/ordemVotacao.test.ts` | Novos: testes Vitest (D19 da Etapa 0) |
| `src/store/seletores/candidatos.ts` | Novo: `useCandidatosParaVotacao` |
| `src/store/seletores/estadoVotar.ts` | Novo: `useEstadoVotar` |
| `src/dominio/tipos.ts`, `src/lib/textosEstado.ts` | Estendem `TextosEstado` e os textos com `ADMIN_NAO_VOTA` |
| `src/servicos/resultado.ts`, `src/servicos/mensagens.ts` | Acrescentam `VOTO_PROPRIO` e a mensagem |
| `src/mocks/cenarios.ts` | Registra `MUITOS_CANDIDATOS` e `VOTO_PROPRIO_PERMITIDO` |

Não são criados aqui: `lib/embaralhar.ts` e `criarGeradorComSemente` (já existe `lib/aleatorio.ts`), `ImagemCandidato` própria, `GuardaVotacao` com checagem de login, `src/mocks/seletores/*`, `public/mock/*` (D16), `selecionadoId`, `BarraSelecao`, `notFound()` de servidor, *skeleton* e `repo.ts`.

---

## 7. Checkpoints

### CP1 — Regras puras, textos, cenários e seletores

**Objetivo:** conferir o que as Etapas 0 a 3 entregaram e criar toda a lógica de decisão antes de qualquer tela.

**Tarefas**
- [ ] Conferir o contrato da seção 3.1 contra o código das Etapas 0 a 3 e ajustar **aqui** o que divergir (em especial: props de `Dialogo` e `ImagemCandidato`, props de `UrnaStatusCard`, se o texto do contador da Etapa 2 está exportado como função; se não, exportá-lo sem mudar o texto).
- [ ] Confirmar no `RotaGuard` do stub de `votar` que `EMAIL_VERIFICADO` cobre também o deslogado (E4-4).
- [ ] `dominio/ordemVotacao.ts` conforme a seção 5.4 (`ordenarParaVotacao`, `localizarNaOrdem`).
- [ ] `dominio/votoProprio.ts`: `candidatoBloqueadoParaVoto` é `true` só se `evento.bloquearVotoProprio`, `usuarioId` não é nulo e `candidato.usuarioVinculadoId === usuarioId`.
- [ ] `dominio/estadoVotar.ts` conforme as seções 5.1 e 5.2.
- [ ] Testes Vitest ao lado dos módulos (D19 da Etapa 0): `estadoVotar.test.ts` (`resolverEstadoVotar` nas linhas 1 a 10 da seção 5.2, inclusive papel nulo com sessão → `ACESSO_PENDENTE`) e `ordemVotacao.test.ts` (mesma semente dá a mesma ordem, sementes diferentes dão ordens diferentes, entrada não mutada, `localizarNaOrdem` com id de outro evento e com um só item); `pnpm test` verde.
- [ ] `store/seletores/candidatos.ts` e `store/seletores/estadoVotar.ts`, com a visão composta memoizada no hook.
- [ ] `VOTO_PROPRIO` em `CodigoErro` e em `mensagens.ts`; chave `ADMIN_NAO_VOTA` em `TextosEstado` e `textosEstado.ts`.
- [ ] Cenário `MUITOS_CANDIDATOS` (grupo `DADOS`): completa o evento ativo até **24 votáveis** com candidatos sintéticos (`cand-st-m01...` e `cand-fv-m01...`), publicados, `ordem` seguinte à maior existente, título `${rotuloCandidato} NN`, descrição curta, campos extras preenchidos com as chaves do evento, `imagemUrl` `placeholder:<n>` variando e `usuarioVinculadoId` nulo. **Idempotente** (aplicar de novo não acrescenta) e **sem alterar** ids nem fatos do seed. O "evento ativo" segue o mesmo critério do `SEM_CANDIDATOS` da Etapa 2.
- [ ] Cenário `VOTO_PROPRIO_PERMITIDO` (grupo `DADOS`): `bloquearVotoProprio = false` no evento ativo.
- [ ] Nenhuma tela criada ou alterada.

**Pronto quando:** pelos testes Vitest e por uma lista de chamadas conferida à mão (D19 da Etapa 0): `ordenarParaVotacao` repete a ordem para o mesmo usuário e evento, devolve ordens diferentes para Ana e Bruno na Semana Tech (se coincidirem por acaso, comparar com Eva) e não altera a lista recebida; `cand-st-09`, `cand-st-10`, `cand-fv-07` e `cand-fv-08` nunca aparecem; `localizarNaOrdem` devolve `null` para id de outro evento e funciona com uma lista de um só item (sem anterior nem seguinte); `resolverEstadoVotar` devolve o esperado para V3 a V20; `candidatoBloqueadoParaVoto` é `true` para Gabi em `cand-st-08` e `false` com o cenário `VOTO_PROPRIO_PERMITIDO`; `MUITOS_CANDIDATOS` dá 24 votáveis nos dois eventos; `verificarInvariantes` vazia depois de aplicar cada cenário.

**Entrega:** `VaiVota-E4-CP1.zip`

### CP2 — Rota, gate e telas de estado

**Objetivo:** `/e/[slug]/votar` decide o que mostrar antes de qualquer lista, em tempo real.

**Tarefas**
- [ ] `votar/page.tsx` (servidor) com `<Suspense>` e `TelaVotar`.
- [ ] `TelaVotar`: lê `useEstadoVotar()` e escolhe a tela. Para `LISTA`, renderiza provisoriamente um parágrafo "Lista: CP3".
- [ ] `TelaEstadoVotar` com as oito telas de estado (seção 5.2), reaproveitando `UrnaStatusCard` onde a seção 5.2 manda, com `h1`, `role="status"` e os botões "Voltar ao evento" e "Ir para o painel".
- [ ] `ACESSO_PENDENTE` renderiza só `Carregando`.
- [ ] Textos por `textoDoEstado`, sem texto de estado fixo no JSX; o Festival exibe os seus textos próprios nas chaves que sobrescreve.
- [ ] Reação em tempo real: trocar urna, estado do evento, papel ("Entrar como"), módulo júri e relógio na toolbar muda a tela sem recarregar.

**Fica fake:** a gate roda só no cliente. Na trilha de produção a mesma ordem passa para o servidor (`Login.md`: validações sempre no servidor).

**Pronto quando:** V1, V2, V4, V8, V10 a V16 e V25 caem na tela certa nos dois temas; com urna não iniciada ou encerrada **nenhuma lista aparece**, nem navegando por `Link` até a rota; trocar o tema muda cores e textos das telas; sem avisos de hidratação.

**Entrega:** `VaiVota-E4-CP2.zip`

### CP3 — Lista e cartão

**Objetivo:** a lista funcional e consistente, em qualquer volume.

**Tarefas**
- [ ] `CabecalhoLista` conforme a seção 5.6 (inclui contador, tempo, aviso de tempo esgotado e aviso provisório).
- [ ] `ListaCandidatos`: `<ul>` em grade de 1 coluna (celular), 2 (tablet) e 3 (desktop), usando `useCandidatosParaVotacao`.
- [ ] `CartaoCandidato` e `CamposExtras` (resumo) conforme a seção 5.5, com `ImagemCandidato` da Etapa 0.
- [ ] Selo e dica de voto próprio no cartão (D6), sem depender da Etapa 5.
- [ ] *Slots* `renderAcao` e `renderSelo` (seção 5.8), vazios nesta etapa.
- [ ] Garantir que o tique de 1 s do relógio **não re-renderiza os cartões** (itens memoizados; conferir pelo Profiler do React).
- [ ] `content-visibility: auto` nos cartões **só** se 24 itens mostrarem lentidão.

**Pronto quando:** 6, 8 e 24 candidatos renderizam sem quebrar o layout em 360, 768 e 1280 px; título com mais de 100 caracteres (`cand-st-06`, `cand-fv-05`) e descrição de uma linha (`cand-st-07`, `cand-fv-06`) deixam os cartões consistentes; `cand-st-03` e `cand-fv-04` aparecem com o `placeholder:<n>` (todo candidato publicado tem imagem, C5; o fallback de "sem imagem" é conferido na galeria `/dev/ui` e na lista do admin da Etapa 6); campo extra sem valor (`cand-st-02`, `cand-fv-02`) não aparece; **nenhum número de votos em lugar nenhum**; a ordem de tabulação é cartão, "Ver detalhes".

**Entrega:** `VaiVota-E4-CP3.zip`

### CP4 — Detalhe do candidato

**Objetivo:** ver o candidato completo sem sair da lista (D3).

**Tarefas**
- [ ] `DetalheCandidato` conforme a seção 5.5, sobre o `Dialogo` (foco preso, Esc fecha, `aria-labelledby`).
- [ ] Estado na URL (seção 5.7): abrir com `router.push(..., { scroll: false })`; anterior e seguinte com `replace`; fechar com `back()` ou `replace` conforme D3 (marca "aberto pela lista" em `useRef`, escrita **só em manipulador de evento**).
- [ ] Anterior e seguinte pela ordem do usuário (`localizarNaOrdem`), desabilitados nas pontas, com "{i} de {n}" (D11); sem navegação com um só item.
- [ ] `?candidato=` inválido, de outro evento, de rascunho ou desqualificado: ignora o parâmetro e mostra a lista, sem erro.
- [ ] Devolução do foco ao "Ver detalhes" do último candidato exibido e manutenção do scroll da lista.
- [ ] Conferir `useSearchParams` dentro do `<Suspense>` do CP2.
- [ ] *Slot* `renderAcoes` no rodapé, vazio nesta etapa.

**Pronto quando:** Esc, botão "Fechar", clique no fundo e botão voltar do navegador fecham o detalhe e preservam a lista; abrir pelo link direto e fechar não sai da página; os rótulos mudam ao trocar de evento (Direção e Duração × Equipe e Tecnologias); anterior e seguinte seguem a ordem do usuário, não a do cadastro; V22 não quebra nada; o histórico não cresce ao navegar entre candidatos.

**Entrega:** `VaiVota-E4-CP4.zip`

### CP5 — Papéis, voto próprio e bordas

**Objetivo:** cobrir o que diferencia jurado de público e o que acontece nos extremos.

**Tarefas**
- [ ] Jurado (Bruno e Fábio): mesma lista, **sem contagens**, sem aviso de identificação e sem "Seu voto atual" (Etapa 5).
- [ ] Voto próprio: Gabi vê selo e dica em `cand-st-08` e `cand-fv-03`; com `VOTO_PROPRIO_PERMITIDO` não vê (V7, V18 e V20).
- [ ] Tempo esgotado: aviso e lista ainda disponível (V17).
- [ ] Troca de estado com a tela aberta: urna, evento, papel e módulo júri na toolbar trocam a tela sem recarregar, inclusive com o diálogo aberto (V21 e V25).
- [ ] Troca de tema e de evento com lista e diálogo abertos: tudo reage aos tokens (V24).
- [ ] 24 candidatos: sem lentidão perceptível (V19).
- [ ] Uma lista de um só item: conferida pela função pura (CP1); a conferência na tela fica para a Etapa 6 (despublicar em rascunho) e para a matriz da Etapa 9.
- [ ] Nenhum hex de marca nos componentes novos.

**Pronto quando:** todas as linhas V1 a V25 passam, nos dois temas, com a exceção declarada do item de um só candidato na tela.

**Entrega:** `VaiVota-E4-CP5.zip`

### CP6 — Revisão e fechamento

**Objetivo:** fechar a etapa com evidência.

**Tarefas**
- [ ] Percorrer V1 a V25 nos dois temas e em 360, 390, 768 e 1280 px (celular em retrato e paisagem), sem rolagem horizontal.
- [ ] Acessibilidade: um `h1` por tela, cartões em `<article>` com `h2`, foco visível, ordem de tab lógica, `alt` com o título, diálogo com foco preso e devolução do foco, contraste ≥ 4,5:1 (selos, avisos, dica), `prefers-reduced-motion` na animação do diálogo, alvos de 44 px.
- [ ] Revisar os textos em português (tom e ausência de concordância de gênero com o rótulo) e listar os que dependem de aprovação.
- [ ] `grep`: nenhum hex de marca nem classe de paleta nos componentes novos.
- [ ] `grep`: nenhum `<a href>` para rota interna; nenhum `Math.random`.
- [ ] `grep`: nenhum acesso a `votos`, `votosJuri`, `historicoVotosJuri`, `votosInfantis` ou `resultados` fora de `store/seletores/**` e `servicos/**`; nenhum import de `@/mocks` em componentes.
- [ ] `grep`: nenhum texto de interface com "candidato" ou "candidatos" fixo (usar os rótulos do tema; "candidatura" é palavra fixa permitida).
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` sem erros; sem warnings de hidratação.
- [ ] Atualizar a seção 3.2 com o que mudou em relação ao entregue, para a Etapa 5 partir do real.

| Grupo \ Tema | Semana Tech | Festival |
|---|---|---|
| Guarda e telas de estado (V1, V2, V4, V8, V10 a V16, V25) | ☐ | ☐ |
| Lista por papel (V3, V5, V6, V9, V18) | ☐ | ☐ |
| Voto próprio (V7, V20) | ☐ | ☐ |
| Volume e bordas (V19; títulos longos; `cand-st-03`/`cand-fv-04` com placeholder) | ☐ | ☐ |
| Detalhe e URL (V22, V23, anterior e seguinte, foco e scroll) | ☐ | ☐ |
| Tempo real (V21, V24) | ☐ | ☐ |
| Tempo esgotado (V17) | ☐ | ☐ |

**Pronto quando:** a matriz está inteira marcada e a seção 9 atendida.

**Entrega:** `VaiVota-E4-CP6.zip` (final da Etapa 4)

---

## 8. O que fica fake

| Item | Tratamento |
|---|---|
| Gate de estado | Só no cliente; na trilha de produção a mesma ordem de checagem vai para o servidor |
| Ordem por semente | Calculada no cliente com `hashDeTexto`; na trilha de produção o servidor devolve a lista já embaralhada com a mesma semente |
| `jaVotou` | Lido da participação no cliente (`useSessao`); o serviço de voto (Etapa 5) revalida |
| Voto em si mesmo | Bloqueio só visual nesta etapa; o serviço da Etapa 5 revalida com `VOTO_PROPRIO` |
| Imagens e textos dos candidatos | Seed e placeholders desenhados pelo tema (D16); sem imagens remotas |
| Persistência | Nenhuma; F5 e nova aba voltam ao seed (D18) |
| Candidato único na tela | Conferido pela função pura; na tela, só quando a Etapa 6 permitir despublicar |

## 9. Critérios de aceitação

- [ ] A tela de `/votar` vem só de `resolverEstadoVotar`; nenhum componente repete a regra.
- [ ] Com urna não iniciada, encerrada, evento concluído, em rascunho (não admin) ou jurado com júri desligado, **não há lista**, nem com `?candidato=`.
- [ ] A ordem dos cartões varia entre usuários e é a mesma para o mesmo usuário, na lista e no detalhe.
- [ ] Candidato em rascunho ou desqualificado nunca aparece; `?candidato=` inválido não gera erro.
- [ ] Campos extras aparecem com os rótulos do evento, só os que têm valor.
- [ ] **Nenhuma tela de `/votar` mostra contagem de votos**, para nenhum papel.
- [ ] Candidato vinculado ao usuário mostra o selo e a dica quando `bloquearVotoProprio` está ligado; `VOTO_PROPRIO` existe para o serviço da Etapa 5.
- [ ] Administradores veem "Administradores não votam" com atalho para o painel.
- [ ] "Tempo esgotado" mostra aviso e mantém a lista disponível.
- [ ] Nenhum texto de interface concorda em gênero com o rótulo do tema; nenhuma cor de marca no código.
- [ ] Utilizável em 360 px, com foco visível, contraste ≥ 4,5:1, navegação por teclado e movimento reduzido respeitado.
- [ ] A lista e o detalhe aceitam os *slots* da Etapa 5 sem refatoração.
- [ ] Console sem erros nem avisos de hidratação; nada é salvo; F5 volta ao seed.

## 10. Pendências

- **P1 — Desqualificado fora da lista:** **Resolvida (rev. 3, C10):** desqualificado sai da votação e do ranking; os votos ficam (D5). DD a atualizar (F-3).
- **P2 — Voto em si mesmo:** **Resolvida (rev. 3, E5): confirmado.** Voto próprio bloqueado por `bloquearVotoProprio` (D6), configurado por seed (sem tela na Etapa 6). O nome "equipe" na interface entra na revisão única de textos (P7).
- **P3 — Administrador não vota:** **Resolvida (rev. 3, B1):** confirmado pelo DD §4 (papel por participação única por evento) (D12).
- **P4 — Jurado com módulo júri desligado:** vê um aviso e não vota (D8). Mesmo ponto da P3 da Etapa 2.
- **P5 — `TEMPO_ESGOTADO` votável:** **Resolvida (rev. 3, B1):** confirmado, compatível com DD §9.2 e com a D7 da Etapa 0 (D7).
- **P6 — Participação ausente:** **Resolvida (rev. 3, C2):** quem tem sessão e não tem participação no evento (por exemplo, Ana no Festival) vê `ACESSO_PENDENTE` (carregamento transitório) enquanto `garantirParticipacao` da Etapa 3 cria a participação `PUBLICO`; o voto nunca cria participação.
- **P7 — Textos finais** das telas de estado e do selo de voto próprio (`Login.md`, seção 10).
- **P8 — Imagens reais e mídia do candidato:** só placeholders na Fase 1; imagem real entra com o CRUD (Etapa 6) e depois com armazenamento.
- **P9 — Navegação anterior e seguinte:** sem circular (D11); revisar com quem usar o protótipo.

**Encaminhamentos para a Etapa 5** (o que esta etapa deixa de propósito):

| # | Encaminhamento |
|---|---|
| 1 | **Seleção:** estado em `ui` com nome a definir pela Etapa 5 (registrar no Contexto, seção 4.9), ação por `renderAcao` e `renderAcoes`, usando `item.bloqueadoVotoProprio` para não oferecer a ação. Textos neutros: nada de "Escolher este candidato" nem "Votar neste {rótulo}" |
| 2 | **`?passo=`:** a Etapa 5 define `lista`, `revisao` e `sucesso`, respeitando a precedência da seção 5.7 |
| 3 | **Gate:** consumir `useEstadoVotar`; remover o aviso provisório do cabeçalho e a tela `JA_VOTOU` simples, trocando por tela final com `textoDoEstado` (`JA_VOTOU`, `JURADO_JA_VOTOU`, `SUCESSO`) |
| 4 | **"Seu voto atual" do jurado:** `consultarEstadoVoto` lido com `useConsulta`, marcação pelo `renderSelo` |
| 5 | **Aviso de voto identificado do jurado:** um só dono, na revisão da Etapa 5 |
| 6 | **Serviços de voto:** validar `VOTO_PROPRIO` com `candidatoBloqueadoParaVoto`, `CANDIDATO_INDISPONIVEL` (despublicado ou desqualificado depois). **Não** criar participação no voto: participação ausente no envio é recusada com `NAO_AUTORIZADO` (rev. 3, C2) |
| 7 | **Revisão e erros:** localizar o candidato escolhido por `localizarNaOrdem`; módulo júri desligado e administrador já estão resolvidos na gate (D8 e D12) e não se repetem |
