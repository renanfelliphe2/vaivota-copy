# VaiVota — Fase 1 · Etapa 2: Evento

> **Rotas:** `/e/[slug]`
> **Depende de:** Etapa 0 (Fundação) e Etapa 1 (Landing: `resolverSituacaoEvento`)
> **Alimenta:** Etapa 3 (login e registro), Etapa 4 (candidato), Etapa 5 (votos), Etapa 6 (configuração, que usa a casca do evento para o link do painel)
> **Fontes:** `Login.md` (seções 5, 6 e 7), `Jurado.md` (seções 6 e 9), `schema.prisma` (`Evento`, `Tema`, `Participacao`), `package.json`, `DocumentDesign.md` v1.1 (§4)
> **Status:** versão final consolidada. Substitui `Etapa2 Evento.md`. **Revisão 3 (07/10/2026):** aplica as decisões do documento de pendências (itens B1, C2, D3, D4, D19, E32). **Revisão 4 (07/10/2026):** A5, A7, E1, E29.

---

## 1. Objetivo

Entregar a **página de entrada do evento** (`/e/[slug]`): a primeira tela que o público vê ao ler o QR Code. Ela carrega o tema do evento, informa o estado da votação e leva a pessoa para a ação certa (entrar, verificar e-mail, votar, aguardar), conforme o estado da urna e a sessão.

Esta etapa precisa garantir:
- **Uma única função pura decide a variante e a ação** (`resolverVisaoEvento`), e a Etapa 4 compõe a sua gate de `/votar` sobre ela.
- **A casca do evento** (`EventoShell`) serve a todas as rotas públicas seguintes (`convite`, `votar`, `verificar-email`). Rev. 4 (A5): sem senha, não existe `recuperar-senha`; `verificar-email` é a tela de código.
- **Nenhum texto de estado fica no JSX:** vem de `textosEstado`, com override pelo tema do evento.
- **A entrada nunca lista candidatos nem mostra resultado.**

## 2. Escopo

**Dentro**
- Casca visual do evento (`EventoShell`: header, rodapé, slot do menu do usuário) no grupo `(participante)`.
- Entrada `/e/[slug]` com hero, painel de estado da urna, contagem regressiva e contador de candidatos.
- Variantes de entrada: não iniciada, aberta, encerrada, concluído, rascunho (indisponível para quem não é admin do evento; banner para o admin), sem candidatos votáveis.
- Ações por sessão: entrar ou criar conta, verificar e-mail, votar, votar como jurado, alterar voto, ver confirmação, ir para o painel.
- `resolverVisaoEvento`, textos de estado e o cenário `SEM_CANDIDATOS`.
- Metadata do evento (`<title>` e descrição).
- Mobile-first, foco visível e navegação por teclado.

**Fora**
- Formulários de login, registro, switch Jurado e resgate de convite (Etapa 3). Aqui há só um **slot provisório** de acesso e um menu de usuário provisório.
- Slug inexistente: a tela é do gate da Etapa 0; esta etapa apenas verifica.
- Lista e detalhe de candidatos (Etapa 4). A entrada mostra só a **contagem**.
- Fluxo de voto, tela "já votou" completa e erros (Etapa 5). A entrada só muda o botão.
- Painel admin, configuração e apresentação (Etapas 6 a 8).
- Totem: entra por planner próprio (rev. 4, A7, a escrever); até lá, `Dispositivo` e `VotoInfantil` são dados seed.

---

## 3. Contrato com as outras etapas

### 3.1 O que esta etapa recebe

| Item | Dono |
|---|---|
| Tokens `--tema-*`, `TemaEvento` no layout raiz e os componentes `Botao`, `Selo`, `Cartao`, `Alerta`, `ContagemRegressiva`, `SkipLink` e `LogoEvento` | Etapa 0 |
| `e/[slug]/layout.tsx` (servidor) + `GateEvento` (cliente, com `EventoNaoEncontrado`) | Etapa 0 |
| `useEventoAtivo()`, `useSessao()`, `useAgora()`, `servicos/sessao.ts` (`sair`), `dominio/candidatos.ts` (`votaveis`), `obterMetadadosEvento` | Etapa 0 |
| Toolbar completa (estado do evento, urna, "Entrar como", e-mail verificado, módulos, relógio, cenários) | Etapa 0 |
| Seed: oito usuários, participações, candidatos com casos de borda, `ConfigApresentacao`, `textosEstado` do Festival | Etapa 0 |
| Rotas stub de `convite`, `verificar-email`, `votar` e `admin`; `RotaGuard` | Etapa 0 |
| `resolverSituacaoEvento` (oito situações, `opcoes.ignorarRascunho`) | Etapa 1 |
| `LandingFooter` (passa a reutilizar o `RodapeEvento` desta etapa) | Etapa 1 |
| Cenário `SEM_ENCERRAMENTO_AUTOMATICO` | Etapa 1 |

### 3.2 O que esta etapa entrega

| Item | Consumidor |
|---|---|
| `(participante)/layout.tsx` com `EventoShell` (as rotas `convite`, `votar` e `verificar-email` renderizam dentro dele; rev. 4, A5: não há `recuperar-senha`) | Etapas 3, 4, 5 |
| `resolverVisaoEvento` (variante e ação) | Etapa 4 (a gate de `/votar` compõe sobre ela) |
| Contrato `AcaoEntrada` e o slot `#acesso` do `AcessoEvento` | Etapa 3 (substitui o provisório pelos formulários; o slot de acesso que a Etapa 3 pluga no `EventoShell` chama `garantirParticipacao` ao montar quando há sessão e não há participação no evento ativo; rev. 3, C2) |
| `MenuUsuario` provisório (nome, papel, "Sair") | Etapa 3 (assume e evolui) |
| `lib/textosEstado.ts` (`textoDoEstado`, chaves estendidas) | Etapas 4 e 5 |
| `RodapeEvento` | Etapas 1 (`LandingFooter`), 3, 4, 5 |
| Cenário `SEM_CANDIDATOS` | Etapas 4 e 9 |
| Matriz de verificação E1–E18 | Etapa 9 |

---

## 4. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | **`resolverVisaoEvento` = situação (Etapa 1) + sessão.** Ela chama `resolverSituacaoEvento` (com `ignorarRascunho` quando o papel é `ADMIN`) e acrescenta variante, ação e flags. É pura, sem React. | Uma só regra de tempo e de urna para landing e entrada; a Etapa 4 reaproveita. |
| D2 | **Rascunho:** quem é `ADMIN` **deste evento** vê a página normal com banner de rascunho. Qualquer outro vê a variante `INDISPONIVEL`, com casca mínima (header e rodapé, sem hero). | Admin precisa de acesso em qualquer estado. Evita expor conteúdo de um evento não publicado. |
| D3 | **A entrada não lista candidatos:** mostra só "{n} {rótulo} concorrendo", contando os **votáveis** (`votaveis()`). | A lista é a Etapa 4. |
| D4 | **Sessão pela `useSessao()` da Etapa 0.** Verificado sem participação (`papel` nulo) é tratado como público. Não verificado leva à ação `VERIFICAR_EMAIL`, que continua e leva à **tela de código** (`/e/{slug}/verificar-email`; rev. 4, A5: login sem senha, por Google ou código por e-mail). A criação da participação é da Etapa 3: login e registro criam; quem já tem sessão e chega a outro evento ganha `PUBLICO` por `garantirParticipacao`, chamada pelo slot de acesso da Etapa 3 ao montar. A participação nunca nasce junto com o voto (rev. 3, C2). | `Login.md`, passo 3. |
| D5 | **Admin não vota** e `ADMIN` é por evento: admin de outro evento (Hugo na Semana Tech) é um usuário comum aqui. **Confirmado no DD §4 (papel por participação única por evento; rev. 3, B1).** | D13 da Etapa 0. |
| D6 | **Jurado com módulo júri desligado** fica sem botão de voto, com aviso "A votação do júri não está ativa neste evento". Não vira público. Rev. 3 (E32): com convite `USADO` no evento, o módulo júri fica travado e não pode ser desligado (regra da Etapa 6); o caso só ocorre antes de qualquer resgate ou forçado pela toolbar. | `Jurado.md`: o jurado não vota na apuração popular. |
| D7 | **Login e criação de conta também com a urna não iniciada.** Compatível com o DD (nada proíbe; rev. 3, B1). | A pessoa já deixa a conta e o e-mail verificados. P2 resolvida. |
| D8 | **Sem texto sobre gradiente.** O hero tem uma faixa decorativa (gradiente primária → secundária, ou `capaUrl` se houver) sem texto em cima; o texto fica sobre o fundo do tema. | Texto sobre gradiente quebraria a política de 4,5:1 (D15 da Etapa 0). |
| D9 | **Acesso provisório não simula login.** "Entrar" e "Criar conta" abrem um aviso explicando que o formulário chega na Etapa 3 e apontando para "Entrar como" na toolbar. | Evita um login fake concorrente com o da Etapa 3. |
| D10 | **Textos por chave** em `textosEstado`, com override do tema e sem artigo nem adjetivo que concorde com o rótulo (gênero). `{rotulos}` e `{rotulo}` vêm do tema, em minúsculas. | "Música" é feminino; "projeto", masculino. |
| D11 | **Metadata no layout de servidor** de `(participante)`, via `obterMetadadosEvento(slug)`; slug desconhecido do servidor cai no título genérico. | D14 da Etapa 0. |

---

## 5. Modelo e regras

### 5.1 Entrada e saída da função

```ts
// src/dominio/visaoEvento.ts
type EntradaVisao = {
  evento: Evento
  configApresentacao: ConfigApresentacao
  agoraMs: number
  sessao: { logado: boolean; papel: PapelParticipacao | null; emailVerificado: boolean; jaVotou: boolean }
  qtdVotaveis: number
}

type VarianteEntrada = "NAO_INICIADA" | "ABERTA" | "ENCERRADA" | "CONCLUIDO" | "SEM_CANDIDATOS" | "INDISPONIVEL"

type AcaoEntrada =
  | "ENTRAR_OU_CRIAR" | "VERIFICAR_EMAIL" | "VOTAR" | "VOTAR_JURADO"
  | "ALTERAR_VOTO_JURADO" | "VER_CONFIRMACAO" | "PAINEL_ADMIN" | "NENHUMA"

type SaidaVisao = {
  variante: VarianteEntrada
  situacao: SituacaoEvento                 // da Etapa 1: dá a contagem, "reta final", "tempo esgotado"
  acao: AcaoEntrada
  bannerRascunho: boolean
  mostrarCodigoConvite: boolean
  avisoJuriDesligado: boolean
  seloVoto: "REGISTRADO" | "REGISTRADO_JURADO" | null
  agradecer: boolean                       // "Obrigado por votar" na urna encerrada
}
```

### 5.2 Variante

Calculada a partir da situação da Etapa 1, nesta ordem:

| # | Condição | Variante |
|---|---|---|
| 1 | Situação `CONCLUIDO` | `CONCLUIDO` |
| 2 | Situação `EM_PREPARACAO` e papel diferente de `ADMIN` | `INDISPONIVEL` |
| 3 | Situação `ENCERRADA` | `ENCERRADA` |
| 4 | Situações `TEMPO_ESGOTADO`, `RETA_FINAL` ou `ABERTA` e `qtdVotaveis = 0` | `SEM_CANDIDATOS` |
| 5 | Situações `TEMPO_ESGOTADO`, `RETA_FINAL` ou `ABERTA` | `ABERTA` |
| 6 | Situações `ABERTURA_PENDENTE` ou `NAO_INICIADA` | `NAO_INICIADA` |

Para `ADMIN` em rascunho, a situação é calculada com `ignorarRascunho` e a variante segue a urna; `bannerRascunho` fica ligado. A urna `NAO_INICIADA` com zero votáveis continua `NAO_INICIADA`.

A contagem, o destaque de "reta final" e o aviso de "tempo esgotado" saem da `situacao`, sem nova variante.

### 5.3 Ação

Avaliada nesta ordem:

| # | Condição | Ação |
|---|---|---|
| 1 | Papel `ADMIN` | `PAINEL_ADMIN` (em qualquer variante) |
| 2 | Variante `INDISPONIVEL`, `ENCERRADA`, `CONCLUIDO` ou `SEM_CANDIDATOS` | `NENHUMA` (com `SEM_CANDIDATOS`, o login continua disponível pelo menu do usuário, da Etapa 3; só a ação inline é `NENHUMA`; rev. 3, D4) |
| 3 | Não logado | `ENTRAR_OU_CRIAR` |
| 4 | E-mail não verificado | `VERIFICAR_EMAIL` |
| 5 | Variante `NAO_INICIADA` | `NENHUMA` ("volte quando abrir") |
| 6 | Papel `JURADO` com módulo júri desligado | `NENHUMA` + `avisoJuriDesligado` |
| 7 | Papel `JURADO`, já votou | `ALTERAR_VOTO_JURADO` |
| 8 | Papel `JURADO`, não votou | `VOTAR_JURADO` |
| 9 | Público (ou papel nulo), já votou | `VER_CONFIRMACAO` |
| 10 | Público (ou papel nulo), não votou | `VOTAR` |

Flags:
- `mostrarCodigoConvite`: módulo júri ligado, logado, **e-mail verificado** (rev. 3, D3), papel público ou nulo, `jaVotou = false` e variante `ABERTA` ou `NAO_INICIADA` (coerente com `Jurado.md`: quem já votou como público não resgata).
- `seloVoto`: variante `ABERTA` e `jaVotou` (`REGISTRADO` para público, `REGISTRADO_JURADO` para jurado).
- `agradecer`: variante `ENCERRADA` e `jaVotou`.
- `bannerRascunho`: estado `RASCUNHO` e papel `ADMIN`.

### 5.4 Matriz de cenários

Cada cenário é testado com os usuários seed pela toolbar ("Entrar como").

| # | Cenário | Como provocar | Variante | Ação | Extras |
|---|---|---|---|---|---|
| E1 | Não iniciada, visitante | Festival, deslogado | `NAO_INICIADA` | `ENTRAR_OU_CRIAR` | "Abre em" (contagem) |
| E2 | Não iniciada, logado verificado | Festival, Ana | `NAO_INICIADA` | `NENHUMA` | "Abre em" |
| E3 | Aberta, visitante | Semana Tech, deslogado | `ABERTA` | `ENTRAR_OU_CRIAR` | "Encerra em" |
| E4 | Aberta, público, não votou | Semana Tech, Ana | `ABERTA` | `VOTAR` | link de convite (módulo júri ligado) |
| E5 | Aberta, público, já votou | Semana Tech, Eva | `ABERTA` | `VER_CONFIRMACAO` | selo "Seu voto foi registrado" |
| E6 | Aberta, jurado, não votou | Semana Tech, Bruno | `ABERTA` | `VOTAR_JURADO` | |
| E7 | Aberta, jurado, já votou | Semana Tech, Fábio | `ABERTA` | `ALTERAR_VOTO_JURADO` | aviso "pode alterar até encerrar" |
| E8 | Urna encerrada | Urna "Encerrada", qualquer sessão | `ENCERRADA` | `NENHUMA` | com `jaVotou`: "Obrigado por votar" |
| E9 | Evento concluído | Estado "Concluído" | `CONCLUIDO` | `NENHUMA` | |
| E10 | Rascunho, não admin | Estado "Rascunho", Ana ou deslogado | `INDISPONIVEL` | `NENHUMA` | casca mínima |
| E11 | Rascunho, admin do evento | Estado "Rascunho", Carla | conforme a urna | `PAINEL_ADMIN` | banner "Rascunho" |
| E12 | Aberta, sem votáveis | Cenário `SEM_CANDIDATOS` | `SEM_CANDIDATOS` | `NENHUMA` | sem botão de voto; deslogado ainda entra pelo menu (Etapa 3; D4 rev. 3) |
| E13 | Slug inexistente | `/e/inexistente` | — | — | tela do gate (Etapa 0); só verificar |
| E14 | Admin em qualquer estado | Carla | conforme a urna | `PAINEL_ADMIN` | links "Painel" e "Configuração" |
| E15 | Logado, e-mail não verificado | Davi ("Entrar como" força o estado; rev. 4: código nunca confirmado), urna aberta ou não iniciada | `ABERTA` ou `NAO_INICIADA` | `VERIFICAR_EMAIL` (→ tela de código) | sem link de convite (`mostrarCodigoConvite` exige e-mail verificado; rev. 3, D3) |
| E16 | Jurado, módulo júri desligado | Bruno + módulo júri desligado | `ABERTA` | `NENHUMA` | `avisoJuriDesligado` |
| E17 | Tempo esgotado | Cenário `SEM_ENCERRAMENTO_AUTOMATICO` + relógio em "Fim da janela" | `ABERTA` | conforme sessão | aviso "Tempo esgotado" |
| E18 | Admin de outro evento | Semana Tech, Hugo | `ABERTA` | `VOTAR` | tratado como usuário comum (D5) |

Casos de tempo cobertos pela situação da Etapa 1: **abertura pendente** (urna "Não iniciada" + relógio em "Fim da janela") mostra "Aguardando a abertura pela organização" no lugar da contagem; **reta final** destaca a contagem de "Encerra em".

### 5.5 Textos das telas de estado

Padrão do mockup, sobrescritos por `tema.textosEstado`. Chaves: as da Etapa 0 (`NAO_INICIADA`, `ENCERRADA`, `JA_VOTOU`, `SUCESSO`) mais as que esta etapa acrescenta (`ABERTA`, `CONCLUIDO`, `SEM_CANDIDATOS`, `INDISPONIVEL`, `JURADO_JA_VOTOU`). `{rotulos}` é o rótulo plural em minúsculas.

| Chave | Título | Corpo |
|---|---|---|
| `NAO_INICIADA` | A votação ainda não começou | Você já pode criar sua conta. Quando a urna abrir, é só voltar aqui para votar. |
| `ABERTA` | Votação aberta | Entre ou crie sua conta e vote em poucos passos. |
| `JA_VOTOU` | Seu voto foi registrado | Obrigado por participar! |
| `JURADO_JA_VOTOU` | Seu voto foi registrado | Você pode alterá-lo até o encerramento da votação. |
| `ENCERRADA` | Votação encerrada | Obrigado por participar! O resultado será divulgado pela organização. |
| `CONCLUIDO` | Evento concluído | Obrigado por fazer parte desta edição. |
| `SEM_CANDIDATOS` | Ainda não dá para votar | A lista de {rotulos} será divulgada em breve. |
| `INDISPONIVEL` | Este evento ainda não está disponível | Volte em breve. |

Textos fixos (sem override):

| Onde | Texto |
|---|---|
| Banner do admin | **Rascunho** — Só administradores deste evento veem esta página. |
| Contador | "{n} {rotulos} concorrendo" (com `n = 1`, "1 {rotulo} concorrendo") |
| Tempo esgotado | "Tempo esgotado. Aguardando a organização encerrar a votação." |
| Abertura pendente | "Aguardando a abertura pela organização." |
| Sem data de abertura | "A data de abertura será anunciada." |
| Aviso de jurado | "A votação do júri não está ativa neste evento." |
| Acesso provisório | "O formulário de acesso chega na próxima etapa. Para testar, use 'Entrar como' na toolbar." |

### 5.6 Origem dos dados

| Elemento | Origem | Quando ausente |
|---|---|---|
| Nome (`h1`, header, `alt`) | `tema.nomeExibicao`, senão `evento.nome` | — |
| Logo | `tema.logoUrl` via `LogoEvento` | Nome em texto |
| Descrição | `evento.descricao` | Não renderiza |
| Datas | `janelaInicio` e `janelaFim` via `formatarDataHora` no fuso do evento | Linha omitida |
| Faixa do hero | Gradiente `--tema-primaria` → `--tema-secundaria`, ou `tema.capaUrl` | — |
| Contador | `votaveis(candidatos).length` | — |
| Link de privacidade da plataforma (rev. 4, E29) | Aviso da VaiVota (controladora dos dados); **sempre** presente | — (texto pendente; no mockup, link placeholder) |
| Link de privacidade do evento (opcional e complementar; rev. 4, E29) | `evento.avisoPrivacidadeUrl` | Não renderiza |

---

## 6. Estrutura de arquivos

| Arquivo | Ação |
|---|---|
| `src/app/e/[slug]/(participante)/layout.tsx` | Novo: layout de **servidor** com `generateMetadata` e `EventoShell` (em Next 16, `params` é `Promise`: usar `await params` e `LayoutProps<'/e/[slug]'>`) |
| `src/app/e/[slug]/(participante)/page.tsx` | Novo: composição da entrada |
| `src/components/evento/EventoShell.tsx` | Novo: header (`LogoEvento` + `MenuUsuario`) e `RodapeEvento` |
| `src/components/evento/MenuUsuario.tsx` | Novo, **provisório**: nome, papel e "Sair"; visitante vê link "Entrar" para `#acesso`. A Etapa 3 assume |
| `src/components/evento/RodapeEvento.tsx` | Novo: nome, "Feito com VaiVota", aviso de privacidade da VaiVota (sempre) e do evento (só com `avisoPrivacidadeUrl`; rev. 4, E29) |
| `src/components/evento/EventoHero.tsx` | Novo |
| `src/components/evento/BannerRascunho.tsx` | Novo |
| `src/components/evento/UrnaStatusCard.tsx` | Novo |
| `src/components/evento/AcessoEvento.tsx` | Novo: slot provisório |
| `src/components/landing/LandingFooter.tsx` | Passa a renderizar `RodapeEvento` (sem duplicar) |
| `src/dominio/visaoEvento.ts` | Novo: `resolverVisaoEvento` |
| `src/dominio/visaoEvento.test.ts` | Novo (Vitest; rev. 3, D19): casos E1 a E12 e E14 a E18 |
| `src/lib/textosEstado.ts` | Novo: textos padrão, `textoDoEstado(chave, tema, contexto)` |
| `src/lib/textosEstado.test.ts` | Novo (Vitest; rev. 3, D19): interpolação e override |
| `src/dominio/tipos.ts` | Estende `TextosEstado` com as novas chaves |
| `src/mocks/cenarios.ts` | Registra `SEM_CANDIDATOS` |

Não são criados aqui: `EventoLogo`, `Countdown`, `use-agora`, `contraste`, `not-found.tsx` de evento, nem extensões da toolbar (tudo isso é da Etapa 0).

---

## 7. Checkpoints

### CP1 — Regras puras, textos e cenário

**Objetivo:** conferir o que as Etapas 0 e 1 entregaram e criar a lógica de decisão antes de qualquer tela.

**Tarefas**
- [ ] Conferir o contrato da seção 3.1 contra o código das Etapas 0 e 1 e corrigir aqui o que divergir.
- [ ] `dominio/visaoEvento.ts` conforme as seções 5.1 a 5.3.
- [ ] `lib/textosEstado.ts` com os textos da seção 5.5, interpolação de `{rotulos}` e `{rotulo}` e override por `tema.textosEstado`; estender `TextosEstado` em `tipos.ts`.
- [ ] Registrar `SEM_CANDIDATOS` em `mocks/cenarios.ts` (todos os candidatos do evento ativo com `publicado = false`, mantendo os invariantes verdes).
- [ ] Testes Vitest (D19 da Etapa 0): `dominio/visaoEvento.test.ts` (E1 a E12 e E14 a E18, inclusive `mostrarCodigoConvite` falso para e-mail não verificado) e `lib/textosEstado.test.ts` (interpolação de `{rotulos}`/`{rotulo}` e override do tema).
- [ ] Nenhuma tela criada ou alterada.

**Pronto quando:** `pnpm test` passa e `resolverVisaoEvento` devolve o esperado para E1 a E12 e E14 a E18; `verificarInvariantes` fica vazia depois de aplicar `SEM_CANDIDATOS`.

**Entrega:** `VaiVota-E2-CP1.zip`

### CP2 — Casca do evento e metadata

**Objetivo:** `/e/semana-tech` e `/e/ver-e-fazer-filmes` abrem dentro de uma casca temática.

**Tarefas**
- [ ] `(participante)/layout.tsx` (servidor) com `generateMetadata` via `obterMetadadosEvento` e renderizando `EventoShell`.
- [ ] `EventoShell`: header com `LogoEvento` (link para `/e/{slug}`) e `MenuUsuario`; `main id="conteudo"`; `RodapeEvento`.
- [ ] `MenuUsuario` provisório: logado mostra nome, papel e "Sair" (chama `servicos/sessao.sair`); deslogado mostra "Entrar" (âncora `#acesso`).
- [ ] `RodapeEvento` com nome, "Feito com VaiVota", link do aviso de privacidade **da VaiVota sempre** e, só com `avisoPrivacidadeUrl`, o link complementar do aviso do evento (rev. 4, E29); `LandingFooter` passa a usá-lo.
- [ ] `page.tsx` com um único `h1` e landmarks `header`, `main`, `footer`.
- [ ] Tratar `useEventoAtivo()` nulo defensivamente (o gate já impede, mas o tipo permite).

**Pronto quando:** as duas URLs abrem com o tema correto (cores e fonte); a aba do navegador mostra o nome do evento; `/e/inexistente` mostra a tela do gate; "Sair" volta a sessão para visitante e o header troca; sem avisos de hidratação.

**Entrega:** `VaiVota-E2-CP2.zip`

### CP3 — Hero e identidade visual

**Objetivo:** a primeira dobra identifica o evento e muda por tema sem alterar o layout.

**Tarefas**
- [ ] `EventoHero`: nome (`h1`), descrição, datas de abertura e encerramento (quando existirem) e faixa decorativa (D8).
- [ ] Contador "{n} {rotulos} concorrendo" com `votaveis`.
- [ ] Rótulos do tema nos textos, conforme a seção 5.5.
- [ ] Conferir os dois temas lado a lado pela toolbar.

**Pronto quando:** Semana Tech (sem logo) e Festival (com logo) renderizam sem imagem quebrada; trocar o evento muda cores, fonte, logo e rótulos sem recarregar; nenhum valor de cor fixo no JSX; texto sempre sobre o fundo do tema.

**Entrega:** `VaiVota-E2-CP3.zip`

### CP4 — Painel de estado da urna e contagem

**Objetivo:** todas as variantes de estado, com contagem regressiva.

**Tarefas**
- [ ] `UrnaStatusCard`: `Selo` (ícone + texto, nunca só cor), título e corpo de `textoDoEstado`, `role="status"`.
- [ ] Contagem com `ContagemRegressiva`: "Abre em" (`NAO_INICIADA`) e "Encerra em" (`ABERTA`), com destaque na reta final. Sem janela: "A data de abertura será anunciada."
- [ ] Tratar os casos de tempo da situação: abertura pendente e tempo esgotado (textos da seção 5.5, sem contagem).
- [ ] `seloVoto` e `agradecer` (selo "Seu voto foi registrado", "Obrigado por votar").
- [ ] `BannerRascunho` para o admin e variante `INDISPONIVEL` com casca mínima (E10).
- [ ] Sem pulso no selo "Aberta" com `prefers-reduced-motion`.

**Pronto quando:** cada variante (E1 a E3, E8 a E12 e E17) aparece ao mudar a toolbar sem recarregar; a contagem anda sozinha e não gera aviso de hidratação; o estado é compreensível sem cor; os textos vêm de `textosEstado`; o Festival exibe os seus textos próprios nas chaves que sobrescreve.

**Entrega:** `VaiVota-E2-CP4.zip`

### CP5 — Área de acesso e botões por sessão

**Objetivo:** a ação certa para cada sessão, com o encaixe pronto para a Etapa 3.

**Tarefas**
- [ ] `AcessoEvento` consome `acao` e renderiza: Entrar / Criar conta, Verificar e-mail, Votar agora, Votar como jurado, Alterar meu voto, Ver confirmação e, para admin, Ir para o painel e Configuração.
- [ ] "Entrar" e "Criar conta" provisórios (D9): abrem o aviso da seção 5.5, marcados `// TODO(Etapa 3)`. A região tem `id="acesso"`.
- [ ] Destinos: "Votar…" e "Ver confirmação" → `/e/{slug}/votar`; "Tenho um código de convite" → `/e/{slug}/convite`; "Verificar e-mail" → `/e/{slug}/verificar-email` (tela de código; rev. 4, A5); painel → `/e/{slug}/admin`; configuração → `/e/{slug}/admin/configuracao`. Todas existem como stub; os guardas da Etapa 0 se aplicam.
- [ ] Aviso de jurado com módulo desligado (D6) e link de convite só nas condições da seção 5.3.
- [ ] Alvos de toque de pelo menos 44 px, foco visível e ordem de tabulação coerente (header, conteúdo, rodapé).

**Pronto quando:** E4 a E7, E14 a E16 e E18 mostram o botão e o destino corretos; o link de convite aparece só nas condições da seção 5.3; nenhum botão morto sem indicação de que é provisório; tudo operável só com o teclado.

**Entrega:** `VaiVota-E2-CP5.zip`

### CP6 — Revisão e fechamento

**Objetivo:** validar a matriz completa e fechar a etapa.

**Tarefas**
- [ ] Percorrer E1 a E18 nos dois temas e nos tamanhos 360, 768 e 1280 px, anotando problemas (E13 não tem tema: só confirma a tela do gate).
- [ ] Conferir hierarquia de títulos, landmarks, foco visível, contraste ≥ 4,5:1 (selos, banner, rodapé), `SkipLink` levando ao `main`, `prefers-reduced-motion`.
- [ ] `lint`, `typecheck`, `test` e `build` sem erros; sem `console.error` nem warnings de hidratação.
- [ ] `grep`: nenhum hex de marca, classe de paleta nem texto de estado fixo nos componentes.
- [ ] Atualizar a seção 3.2 com o que mudou em relação ao entregue, para a Etapa 3 partir do real.

**Pronto quando:** a seção 9 inteira atendida e a matriz E1–E18 conferida.

**Entrega:** `VaiVota-E2-CP6.zip` (final da Etapa 2)

---

## 8. O que fica fake

| Item | Tratamento |
|---|---|
| Entrar e criar conta | Provisórios; a sessão se simula pela toolbar ("Entrar como") |
| Criação da participação | Não ocorre aqui (Etapa 3: login/registro ou `garantirParticipacao` no slot de acesso; nunca junto com o voto) |
| Link de privacidade | Aviso da VaiVota: link placeholder (texto pendente, E29); aviso do evento: placeholder do seed |
| Metadata | Fixa no que o servidor conhece do seed |
| Janelas de votação | Do seed, com relógio simulado |

## 9. Critérios de aceitação

- [ ] `/e/semana-tech` e `/e/ver-e-fazer-filmes` funcionam com os dois temas e todos os cenários da matriz 5.4.
- [ ] A variante e a ação vêm só de `resolverVisaoEvento`; nenhum componente repete a regra.
- [ ] Nenhum texto de estado, cor de marca ou nome de evento fixo no código.
- [ ] A entrada nunca lista candidatos, nem mostra contagem de votos ou resultado.
- [ ] Admin só vê o banner e o acesso em rascunho se for admin **deste** evento; qualquer outro vê a variante indisponível.
- [ ] Todo botão leva a uma rota existente, ou indica claramente que é provisório.
- [ ] Utilizável em 360 px, sem rolagem horizontal; foco visível; contraste ≥ 4,5:1; navegação por teclado.
- [ ] Console sem erros nem avisos de hidratação.
- [ ] Nada é salvo; F5 volta ao seed.

## 10. Pendências

- **P1 — Admin vota?** **Resolvida (rev. 3, B1):** admin não vota; confirmado no DD §4 (papel por participação única por evento). D5 vale como está.
- **P2 — Criar conta antes da abertura:** **Resolvida (rev. 3, B1):** compatível com o DD (nada proíbe); D7 vale como está.
- **P3 — Jurado com módulo desligado:** **Resolvida (rev. 3, E32):** o módulo júri fica travado (não pode ser desligado) quando existe convite `USADO` no evento; a regra é da Etapa 6 (travas). O aviso da D6 continua para o caso sem resgates ou forçado pela toolbar.
- **P4 — Criação da participação:** **Resolvida (rev. 3, C2):** login e registro criam (Etapa 3); quem já tem sessão e chega a outro evento ganha `PUBLICO` por `garantirParticipacao`, chamada pelo slot de acesso da Etapa 3 no `EventoShell`. A participação nunca nasce junto com o voto. Até a Etapa 3, usuário verificado sem participação é tratado como público.
- **P5 — Capa e logo da Semana Tech:** sem eles valem os fallbacks (D8).
- **P6 — Textos finais das telas de estado:** os da seção 5.5 são provisórios.
- **P7 — Marca do Festival:** **Resolvida (rev. 4, E1):** texto escuro sobre o laranja `#F15A29` (≈5,3:1), verde ajustado quando for texto; aprovação visual com a organização.
- **P8 — Aviso de privacidade (rev. 4, E29):** a controladora dos dados é a VaiVota; o `RodapeEvento` mostra sempre o link do aviso da plataforma; `avisoPrivacidadeUrl` do evento é opcional e complementar. Texto do aviso pendente (rascunho a partir do DD §10.4).
