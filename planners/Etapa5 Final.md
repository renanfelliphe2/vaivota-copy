# VaiVota — Fase 1 · Etapa 5: Votos

> **Rotas:** `/e/[slug]/votar` (parte 2: seleção, revisão, envio, sucesso, "já votou" e erros)
> **Depende de:** Etapa 0 (Fundação), Etapa 2 (`resolverVisaoEvento`, textos de estado), Etapa 3 (sessão, participação, `MenuUsuario`) e Etapa 4 (`resolverEstadoVotar`, lista, cartão, detalhe, ordem por semente, `VOTO_PROPRIO`)
> **Alimenta:** Etapa 7 (votos e histórico do júri gerados aqui, funções puras de aplicar voto, auditoria do júri), Etapa 8 (nenhum acoplamento direto) e Etapa 9 (matriz W1–W28)
> **Fontes:** `Login.md` (seções 5 a 8), `Jurado.md` (seções 5, 6, 9 e 10), `schema.prisma` (`Voto`, `VotoJuri`, `HistoricoVotoJuri`, `Participacao`, `Auditoria`, `Evento.bloquearVotoProprio`), `package.json`, `DocumentDesign.md` v1.1.
> **Status:** versão final consolidada. Substitui `Etapa5 Votos.md`. **Revisão 3 (07/10/2026):** aplica as decisões do documento de pendências (itens B1, C2, C9, C20, D19, E6, E7, E8, E9, E10, E30). **Revisão 4 (07/10/2026):** A2, A7, A8.

---

## 1. Objetivo

Entregar a **parte 2 de `/e/[slug]/votar`**: o que acontece depois que a gate da Etapa 4 libera a lista. A pessoa **escolhe** em quem votar, **revisa**, **confirma**, vê o **sucesso** (ou a tela de **"já votou"**) e, quando algo falha, recebe uma resposta clara e segura. Vale para **público** e para **jurado**, com os temas e os rótulos do evento. Nada é persistido.

Esta etapa precisa garantir:
- **A UI nunca decide se o voto vale.** Quem decide são os serviços `votarPopular` e `votarJuri`, que imitam o servidor: validam tudo **antes** de gravar e devolvem `Resultado<T>`.
- **Voto, `Participacao.votou` e `dev.vinculosVoto` são gravados na mesma operação.** Sem isso as invariantes 3 e 4 quebram.
- **Rejeição nunca muta o `banco`** (D5 da Etapa 0). A única exceção declarada é a falha simulada "já votou em outra sessão" (D8).
- **Sigilo espelhado.** `Voto` não tem usuário; "já votou" e o sucesso do público não dizem em quem; a participação nunca nasce junto com o voto (rev. 3, C2); a escolha só existe em memória de tela (`ui`) e nunca no `banco` ligada à pessoa. O voto do júri é identificado e fica ligado à participação, como manda `Jurado.md`.
- **Falha de rede nunca leva a voto duplicado.** Depois de um erro de rede, a tela consulta o estado real antes de permitir novo envio.
- **Nenhuma tela de `/votar` mostra contagem de votos**, para nenhum papel.
- **Nenhum texto concorda em gênero com o rótulo do tema** (D10 da Etapa 2): "Escolher", "Sua escolha" e "Seu voto" não variam entre "Curta" e "Projeto".

## 2. Escopo

**Dentro**
- Seleção do candidato na lista e no detalhe (a Etapa 4 deixou os *slots*).
- Passo `?passo=` (`lista`, `revisao`, `sucesso`), com normalização da URL.
- Revisão, confirmação com proteção contra duplo clique, tela de envio e tela de sucesso.
- Versão final de **"Você já votou"** (substitui a simples da Etapa 4).
- Serviços `votarPopular`, `votarJuri` e `consultarEstadoVoto` (`servicos/votacao.ts`) e as funções puras de aplicar voto.
- Tratamento dos seis `ModoFalha` e de todos os `CodigoErro` possíveis no envio, incluindo a verificação depois de erro de rede.
- Voto do **jurado**: aviso de identificação com caixa de ciência no primeiro voto, "Seu voto atual", alterar até o fim da urna, histórico e auditoria.
- Recusa defensiva (`NAO_AUTORIZADO`) do envio sem participação no evento; a participação é criada pela Etapa 3 (`garantirParticipacao`), nunca pelo voto (rev. 3, C2).
- Seção "Votação" da toolbar: "Resetar meu voto" e "Enviar direto (teste do serviço)".

**Fora (e em qual etapa fica)**
- Lista, cartão, detalhe, ordem por semente, gate de estado e `VOTO_PROPRIO` como código e regra → **Etapa 4**.
- Login, registro, verificação de e-mail, resgate de convite → **Etapa 3**.
- Contagens, ranking, resultado, exportação → **Etapas 7 e 8**.
- Gerar convites, ver votos identificados e histórico do júri → **Etapas 6 e 7**.
- Comprovante ou hash do voto na tela (decisão: **não exibir**, seção 10).
- Rate limiting de voto (só o bloqueio de código de convite é simulado, na Etapa 3).
- Totem e voto infantil: entram por planner próprio (rev. 4, A7, a escrever); até lá, `Dispositivo` e `VotoInfantil` são dados seed.
- Notas por critério do jurado: **requisito do Festival** (rev. 4, A8: Direção, Roteiro, Fotografia e Som, PDF §3.3; modelo previsto `Criterio` e `NotaJuri`). Esta etapa entrega o **voto simples do júri, usado na Semana Tech**. Escala da nota, peso por critério, conversão em placar do júri e desempate ficam pendentes [Usuário].

---

## 3. Contrato com as outras etapas

### 3.1 O que esta etapa recebe

| Item | Dono |
|---|---|
| `Resultado<T>`, `CodigoErro`, `ModoFalha`, `atraso`, `simularFalha`, `consumirFalhaProxima`, `registrarLog`, `servicos/mensagens.ts` | Etapa 0 |
| Store externo, `store.getState()`/`atualizar`, relógio simulado, `transicoes.encerrarUrna`, `registrarAuditoria`, `useConsulta` | Etapa 0 |
| `EstadoUi` extensível, `dev.falhaProxima`, `dev.vinculosVoto`, `dev.latenciaMs`, `dev.simularErroRede`, `InspetorEstado` e registro de seções da toolbar | Etapa 0 |
| Tabelas `votos`, `votosJuri`, `historicoVotosJuri`, `sequencias`, `verificarInvariantes` (invariantes 3, 4 e 5), `hashMock`, `paraInstante` | Etapa 0 |
| Seed: Ana (público, não votou), Eva (público, votou), Bruno (jurado, não votou), Fábio (jurado, com voto e 1 entrada de histórico), Gabi (vinculada a `cand-st-08` e `cand-fv-03`), Carla/Hugo (admin), Davi (não verificado) | Etapa 0 |
| `Dialogo`, `DialogoConfirmacao`, `Botao`, `Alerta`, `Selo`, `Cartao`, `Carregando`, `Toast`, `LiveRegion`, `ImagemCandidato`, `ContagemRegressiva` | Etapa 0 |
| `RotaGuard` com `EMAIL_VERIFICADO` em `votar` | Etapa 0 |
| `resolverVisaoEvento`, `lib/textosEstado.ts` (`textoDoEstado`, chaves `JA_VOTOU`, `JURADO_JA_VOTOU`, `SUCESSO`), `UrnaStatusCard`, `EventoShell` | Etapa 2 |
| Participação criada no login e por `garantirParticipacao` (ao chegar ao evento já logado), `entrarComo`/`sair`, auditoria com `ipHash = hashMock("ip-demo")` | Etapas 0 e 3 |
| `resolverEstadoVotar` / `useEstadoVotar` (`TelaVotar`, `papelVoto`, `avisoTempoEsgotado`), `TelaVotar`, `TelaEstadoVotar`, `CabecalhoLista` | Etapa 4 |
| `ListaCandidatos`, `CartaoCandidato`, `DetalheCandidato` com os *slots* `renderAcao`, `renderSelo`, `renderAcoes` | Etapa 4 |
| `useCandidatosParaVotacao` (`itens` com `bloqueadoVotoProprio`), `ordenarParaVotacao`, `localizarNaOrdem` | Etapa 4 |
| `candidatoBloqueadoParaVoto`, código `VOTO_PROPRIO` e sua mensagem | Etapa 4 |
| Parâmetro `?candidato=` e a reserva de `?passo=` com a regra de precedência | Etapa 4 |

### 3.2 O que esta etapa entrega

| Item | Consumidor |
|---|---|
| `servicos/votacao.ts` (`votarPopular`, `votarJuri`, `consultarEstadoVoto`) | Etapa 9 (documenta a fronteira de dados) |
| `dominio/aplicarVoto.ts` (`aplicarVotoPopular`, `aplicarVotoJuri`): funções puras que mantêm as invariantes 3 e 4 | Etapa 7 (seed de volume e "Simular votos entrando" criam votos por aqui, E7-11) |
| Primeiro voto do júri já com entrada de histórico (`candidatoAnteriorId` nulo) | Etapa 7 (aba de jurados), Etapa 9 |
| Ações de auditoria `VOTO_JURI_REGISTRADO` e `VOTO_JURI_ALTERADO` | Etapa 7 (resumo de auditoria) |
| `ui.votacao` (seção 5.1) | Etapa 9 |
| `dominio/passoVotar.ts` (`resolverPassoVotar`) | Etapa 9 |
| Chave de texto `VOTO_ATUALIZADO` e texto padrão de `SUCESSO` | Etapas 7 e 9 |
| Seção "Votação" da toolbar | Etapa 9 |
| Matriz de verificação W1–W28 | Etapa 9 |

---

## 4. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | **Estado de tela em `ui.votacao`**, com campo `chave = "${usuarioId}:${eventoId}"`. Todo campo só vale se `chave` bate com a sessão e o evento atuais; senão é lido como vazio. Trocar de usuário ("Entrar como", "Sair") ou de evento nunca herda seleção, aviso ou sucesso de outra pessoa, **sem editar** os serviços da Etapa 3. | Resolve T18 do Contexto e evita vazamento de escolha entre contas na mesma aba (D18 da Etapa 0). |
| D2 | **A gate da Etapa 4 é consumida como está.** Esta etapa acrescenta só `resolverPassoVotar` (seção 5.3), que decide qual passo aparece **dentro** das telas `LISTA` e `JA_VOTOU`. O sucesso **prevalece** sobre `JA_VOTOU` (público) e sobre `LISTA` (jurado) enquanto houver `ultimoVoto` da chave atual e `?passo=` for `revisao` ou `sucesso`; qualquer outra tela de estado vence o sucesso. Enquanto `envio` não for `OCIOSO` e o passo for `revisao`, a revisão continua na tela, mesmo que a gate já diga `JA_VOTOU`. | Ao gravar o voto, `participacao.votou` vira `true` e a gate muda para `JA_VOTOU` **antes** de a UI saber do resultado; sem esta regra o sucesso nunca apareceria para o público. |
| D3 | **A seleção é um grupo de `radio` nativo** (um `fieldset` com legenda oculta em volta da lista). O botão do cartão é o texto "Escolher" de um `<label>` ligado ao `radio`. Tocar no selecionado **não desmarca**; a barra inferior tem "Limpar". Cartão selecionado mostra `Selo` "Sua escolha" (ícone + texto, nunca só cor). Candidato com `bloqueadoVotoProprio` e o "voto atual" do jurado **não oferecem a ação**. | Setas e Tab corretas sem ARIA improvisada (o desmarcar por toque exigiria tratar teclado à parte). Textos sem artigo nem adjetivo (T10). |
| D4 | **"Escolher e revisar" no detalhe seleciona e vai direto à revisão** (`router.replace` para `?passo=revisao`, sem `candidato`). Se o candidato já está selecionado, o botão é "Revisar voto". Fecha a pendência do planner antigo. | O detalhe foi aberto com `push` (D3 da Etapa 4); trocar a entrada faz o voltar do navegador cair na lista. |
| D5 | **Navegação do fluxo.** Lista → revisão: `router.push` (voltar do navegador volta à lista). "Trocar escolha": `router.back()` se a revisão foi aberta pela lista nesta visita (marca em `useRef`, escrita **só em manipulador de evento**), senão `router.replace` para a lista. Revisão → sucesso: `router.replace` (voltar nunca reabre a confirmação). A URL é **normalizada** por `router.replace` quando o passo pedido não é válido; isso nunca gera erro. | Link direto e F5 não podem produzir tela quebrada nem permitir confirmar sem seleção. |
| D6 | **Os serviços ficam em `servicos/votacao.ts` e a mutação em funções puras de `dominio/aplicarVoto.ts`.** O serviço valida, chama a função pura e grava com **um único** `atualizar`: `Voto` + `Participacao.votou` + `sequencias` + `dev.vinculosVoto` (nunca cria participação, D14); no júri, `VotoJuri` + `HistoricoVotoJuri` + `Participacao.votou` + auditoria. | Atomicidade que espelha a transação de `Login.md`; a Etapa 7 reaproveita as funções puras. |
| D7 | **Ordem de validação dos serviços** na seção 5.2. A identidade vem sempre da sessão (`sessao.usuarioId`), nunca de parâmetro da tela. | O servidor real não confia no cliente. |
| D8 | **Interpretação dos `ModoFalha`** na seção 5.2. `URNA_ENCERRA` passa por `transicoes.encerrarUrna` (que congela o resultado, D8 da Etapa 0). `JA_VOTOU_OUTRA_SESSAO` grava um voto legítimo "da outra sessão" (único caso em que uma rejeição muta o `banco`, sempre consistente com as invariantes). `consultarEstadoVoto` **só obedece** `simularErroRede`, para a consulta da lista não consumir a falha pontual destinada ao envio. | Cada modo simula uma situação real; o modo pontual vale para o próximo **envio**, não para qualquer serviço. |
| D9 | **Erro de rede nunca libera novo envio sem verificar.** `REDE` leva a `VERIFICANDO` e a uma chamada de `consultarEstadoVoto`. Gravou → sucesso. Não gravou → "Tentar novamente". A consulta também falhou → só "Verificar novamente" (sem reenviar). | `Login.md`: queda de rede consulta o estado real antes de nova tentativa. |
| D10 | **Histórico do júri desde o primeiro voto** (A11 do Contexto): o primeiro voto cria `VotoJuri` e uma entrada com `candidatoAnteriorId = null`; cada alteração cria outra. Confirmar o mesmo candidato devolve `SEM_ALTERACAO` e não grava. **Auditoria** (A12): `VOTO_JURI_REGISTRADO` e `VOTO_JURI_ALTERADO`, com `detalhes` apontando o id da entrada de histórico (a escolha em si já vive no histórico). | A invariante 4 exige ao menos 1 entrada por `VotoJuri`; `Jurado.md` seção 10 manda auditar. A regra "nunca auditar a escolha" vale para voto popular e infantil, não para o júri, que é identificado. |
| D11 | **Um só aviso de voto identificado:** banner informativo na **revisão do jurado** (`Alerta`). Na revisão do **primeiro** voto do jurado (sem voto atual), acrescenta a caixa de ciência obrigatória "Sei que meu voto é identificado para a organização" (`Checkbox`); sem ela marcada, "Confirmar voto" fica desabilitado. Nas alterações a caixa não aparece. Não se repete na lista nem no sucesso (rev. 3, E10). | Encaminhamento 5 da Etapa 4. A ciência explícita no primeiro voto evita surpresa com a identificação sem atrapalhar as alterações. |
| D12 | **Voto em si mesmo é validado no serviço** com `candidatoBloqueadoParaVoto`, devolvendo `VOTO_PROPRIO`, nos dois serviços. | A UI já não oferece a ação; o serviço revalida (D6 da Etapa 4). |
| D13 | **`TEMPO_ESGOTADO` continua votável:** os serviços não consultam `janelaFim`, só `estadoUrna`. | D7 da Etapa 0 e D7 da Etapa 4. |
| D14 | **A participação nunca nasce junto com o voto** (rev. 3, C2). `votarPopular`, `votarJuri`, `aplicarVotoPopular` e `aplicarVotoJuri` **não criam** participação (sai o `idNovaParticipacao`). Ela é criada pela Etapa 3 (login, registro ou `garantirParticipacao` ao chegar ao evento). Participação ausente no envio é recusada com `NAO_AUTORIZADO` (defensivo, com `registrarLog`), sem gravar nada. | Criar a participação no mesmo instante do voto permitiria ligar pessoa e voto pelo horário (sigilo). Encaminhamento 6 da Etapa 4 e P8 da Etapa 3. |
| D15 | **Toolbar: só o que é novo.** Seção "Votação" com "Resetar meu voto" (usa `dev.vinculosVoto` e, no júri, a participação) e "Enviar direto" (chama o serviço sem passar pela tela, para provar `VOTO_PROPRIO`, `CANDIDATO_INDISPONIVEL`, `PAPEL_INVALIDO` e `EMAIL_NAO_VERIFICADO`). "Falha no próximo envio", "Entrar como" e "E-mail verificado" já existem na Etapa 0. O contador de depuração do planner antigo vira o `InspetorEstado`. | Evita controles duplicados (T17) e leitura de `votos` em tela (D4 da Etapa 0). |
| D16 | **Errata mínima na Etapa 0, **já incorporada na Etapa 0 (rev. 2, Anexo C)**:** (a) `dev.vinculosVoto` usa a chave `"${usuarioId}:${eventoId}"`, porque o mesmo usuário pode votar nos dois eventos; (b) `simularFalha(opcoes?: { consumirPontual?: boolean })` aceita o parâmetro para não consumir falha pontual (usado por `consultarEstadoVoto`, com `consumirPontual: false`); (c) `OrigemEncerramento` inclui `FALHA_SIMULADA`. O CP1 **confere** os três no código; se a Etapa 0 foi implementada pela rev. 1, aplica-os ali. | Sem (a) o "Resetar meu voto" apaga o voto errado; sem (b) a consulta consome a falha do envio; sem (c) a auditoria de `URNA_ENCERRA` fica sem origem. |
| D17 | **Sem tela de contagem em lugar nenhum.** Os únicos números exibidos são os da Etapa 4: a quantidade de candidatos e a contagem regressiva de tempo. | `Login.md` e `Jurado.md`. |

---

## 5. Modelo e regras

### 5.1 Estado de tela (`ui.votacao`)

```ts
type AvisoVotacao = "NAO_REGISTRADO" | "ESCOLHA_INDISPONIVEL" | "VOTO_PROPRIO" | "JA_VOTOU_ANTES"

type EstadoUiVotacao = {
  chave: string | null                      // `${usuarioId}:${eventoId}` dono dos campos abaixo
  selecaoId: string | null                  // candidato escolhido, ainda não enviado
  envio: "OCIOSO" | "ENVIANDO" | "VERIFICANDO"
  falhaEnvio: "REDE" | "ERRO_INTERNO" | "NAO_CONFIRMADO" | null
  ultimoVoto: { candidatoId: string; resultado: "REGISTRADO" | "ATUALIZADO" | "SEM_ALTERACAO" } | null
  aviso: AvisoVotacao | null
}
// EstadoUi.votacao: EstadoUiVotacao; valor inicial: tudo nulo e envio = "OCIOSO"
```

Regras:
- **Leitura filtrada pela chave.** `useSelecaoVoto(eventoId)` (em `store/seletores/votacao.ts`) devolve o `EstadoUiVotacao` ou o vazio quando a chave não bate. A referência devolvida é estável (memoizada no hook, D11 da Etapa 0).
- **Escrita só por `store/acoesVotacao.ts`**: `selecionarCandidato(eventoId, candidatoId | null)`, `iniciarEnvio(eventoId)`, `concluirEnvio(eventoId, parcial)` (um **único** `atualizar` por conclusão) e `descartarSucesso(eventoId)`. Toda escrita grava a chave atual e zera o que pertencia a outra chave.
- `selecionarCandidato` zera `aviso` e `falhaEnvio`. `descartarSucesso` zera `ultimoVoto`.
- **Seleção válida** (derivada, nunca gravada): `selecaoId` existe em `useCandidatosParaVotacao().itens` e o item **não** tem `bloqueadoVotoProprio`. Se deixar de valer (trocou o cenário, por exemplo), a tela se comporta como "sem seleção".
- `ultimoVoto.candidatoId` existe só para a tela de sucesso **do jurado**. O sucesso do público e **nenhuma** tela de "já votou" o leem (D17, sigilo e rev. 3, E8).
- Sem campo novo em `dev`. Seção 4.9 do Contexto atualizada com `ui.votacao`.

### 5.2 Serviços

```ts
// src/servicos/votacao.ts
votarPopular(e: { eventoId: string; candidatoId: string }): Promise<Resultado<{ resultado: "REGISTRADO" }>>
votarJuri(e: { eventoId: string; candidatoId: string }):    Promise<Resultado<{ resultado: "REGISTRADO" | "ATUALIZADO" | "SEM_ALTERACAO" }>>
consultarEstadoVoto(e: { eventoId: string }):               Promise<Resultado<{ votou: boolean; candidatoAtualId: string | null }>>
// candidatoAtualId só é preenchido para JURADO com voto; para os demais é sempre null
```

**Regras comuns** (regras 1 a 5 da seção 5.2 da Etapa 0): `async`; começam com `atraso()` e `simularFalha()`; validam antes de mutar; releem `store.getState()` depois de cada `await`; mensagens vindas de `mensagens.ts`; detalhe só no console (`[mock:log]`). A mutação é uma chamada de `atualizar` que aplica `aplicarVotoPopular` ou `aplicarVotoJuri`.

**Ordem de validação** (a primeira que falhar devolve o erro e nada é gravado):

| # | Validação | Código | Popular | Júri | Consulta |
|---|---|---|:---:|:---:|:---:|
| 1 | Há usuário na sessão | `NAO_AUTORIZADO` | ✓ | ✓ | ✓ |
| 2 | O evento existe | `NAO_ENCONTRADO` | ✓ | ✓ | ✓ |
| 3 | E-mail verificado | `EMAIL_NAO_VERIFICADO` | ✓ | ✓ | — |
| 4 | Estado do evento: `CONCLUIDO` → `EVENTO_CONCLUIDO`; `RASCUNHO` → `EVENTO_INDISPONIVEL` | | ✓ | ✓ | — |
| 4a | Há participação do usuário no evento (defensivo; `registrarLog` com o detalhe) (D14) | `NAO_AUTORIZADO` | ✓ | ✓ | — |
| 5 | Papel: popular exige `PUBLICO`; júri exige `JURADO` **e** módulo júri ligado (detalhe no log) | `PAPEL_INVALIDO` | ✓ | ✓ | — |
| 6 | Urna: `NAO_INICIADA` → `URNA_NAO_ABERTA`; `ENCERRADA` → `URNA_ENCERRADA`. `ABERTA` passa, **inclusive depois de `janelaFim`** (D13) | | ✓ | ✓ | — |
| 7 | Popular: participação já com `votou = true` | `JA_VOTOU` | ✓ | — | — |
| 8 | Candidato existe no evento, é votável (`votaveis()`) | `CANDIDATO_INDISPONIVEL` | ✓ | ✓ | — |
| 9 | Voto em si mesmo (`candidatoBloqueadoParaVoto`) | `VOTO_PROPRIO` | ✓ | ✓ | — |
| 10 | Júri: o candidato é o voto atual | sucesso com `SEM_ALTERACAO`, sem gravar | — | ✓ | — |

`consultarEstadoVoto` sem participação, ou com participação `ADMIN`, devolve `votou: false` e `candidatoAtualId: null`.

**`ModoFalha`** (lido com `consumirFalhaProxima()` uma única vez por envio; o modo volta a `NENHUMA` mesmo se a validação rejeitar):

| Modo | Efeito em `votarPopular` | Efeito em `votarJuri` |
|---|---|---|
| `NENHUMA` | Normal | Normal |
| `REDE_NAO_GRAVOU` | `REDE`, nada gravado (já tratado por `simularFalha`) | idem |
| `ERRO_INTERNO` | `ERRO_INTERNO`, nada gravado (já tratado por `simularFalha`) | idem |
| `REDE_GRAVOU` | Valida e **grava**; depois devolve `REDE` (resposta perdida) | idem |
| `URNA_ENCERRA` | Depois das validações 1 a 5, se a urna está `ABERTA`: chama `transicoes.encerrarUrna(eventoId, { origem: "FALHA_SIMULADA" })` e devolve `URNA_ENCERRADA` sem gravar. Com a urna já fechada, não faz nada além das validações normais | idem |
| `JA_VOTOU_OUTRA_SESSAO` | Depois da validação 6: grava, por `aplicarVotoPopular`, um voto "da outra sessão" (candidato diferente do escolhido, tirado de `embaralharComSemente` sobre os votáveis não bloqueados) e devolve `JA_VOTOU`. **Única** rejeição que muta o `banco`, e deixa as invariantes verdes | Sem efeito: o jurado sempre pode substituir. O modo é consumido e registrado em `[mock:log]` |

`simularErroRede` (persistente) devolve `REDE` em **todos** os três serviços, sem gravar.

**Auditoria.** `votarJuri` registra, no mesmo `atualizar` da gravação: `VOTO_JURI_REGISTRADO` (primeiro voto) ou `VOTO_JURI_ALTERADO` (substituição), com `atorUsuarioId` = o jurado, `entidade` = `VotoJuri`, `detalhes = { historicoId }` e `ipHash = hashMock("ip-demo")`. `SEM_ALTERACAO` não audita. **`votarPopular` não audita nada.**

**`aplicarVotoPopular(estado, entrada)`** (pura, `entrada = { eventoId, usuarioId, candidatoId, agoraMs }`):
1. Usa a participação existente do usuário no evento. **Não cria participação** (D14); o serviço já recusou o envio sem participação (validação 4a).
2. Incrementa `sequencias.voto` e acrescenta `Voto` com `hashRecibo = hashMock("recibo:{eventoId}:{sequencia}")` (sem usuário, sem candidato no cálculo) e `criadoEm = paraInstante(agoraMs)`. Esse `hashRecibo` é só do mock: em produção ele é aleatório (32 bytes), nunca derivado de sequência (rev. 3, C20; registrado em `FRONTEIRA-DADOS.md` na Etapa 9).
3. Marca `votou = true` e grava `dev.vinculosVoto["{usuarioId}:{eventoId}"] = Voto.id`.

**`aplicarVotoJuri(estado, entrada)`** (pura; não cria participação, D14): cria ou atualiza o `VotoJuri` da participação (`atualizadoEm`), incrementa `sequencias.historicoVotoJuri` e acrescenta uma entrada `{ candidatoAnteriorId (nulo no primeiro voto), candidatoNovoId, criadoEm }`, e marca `votou = true`.

### 5.3 Passos e URL

`dominio/passoVotar.ts`:

```ts
type PassoVotar = "LISTA" | "REVISAO" | "SUCESSO"

function resolverPassoVotar(e: {
  tela: TelaVotar                         // da Etapa 4
  papelVoto: "PUBLICO" | "JURADO" | null
  passoUrl: string | null                 // valor bruto de ?passo=
  selecaoValida: boolean
  ultimoVotoValido: boolean               // ultimoVoto existe e a chave bate
  envio: "OCIOSO" | "ENVIANDO" | "VERIFICANDO"
}): { passo: PassoVotar | null; normalizarPara: "BASE" | "SUCESSO" | null }
// passo = null → o componente renderiza a tela de estado da gate (ou TelaJaVotou)
```

Avaliada **nesta ordem**:

| # | Condição | Resultado |
|---|---|---|
| 1 | `tela` não é `LISTA` nem `JA_VOTOU` | `passo = null`; não normaliza (o `?candidato=` e o `?passo=` ficam como estão, como na D10 da Etapa 4) |
| 2 | `envio ≠ OCIOSO` e `passoUrl = "revisao"` | `REVISAO`; não normaliza |
| 3 | `ultimoVotoValido` e `passoUrl` ∈ {`revisao`, `sucesso`} e (`tela = JA_VOTOU`, ou `tela = LISTA` com `papelVoto = JURADO`) | `SUCESSO`; `normalizarPara = SUCESSO` se `passoUrl ≠ "sucesso"` |
| 4 | `tela = JA_VOTOU` | `passo = null` (mostra `TelaJaVotou`); `normalizarPara = BASE` se há `passoUrl` |
| 5 | `tela = LISTA` e `passoUrl = "revisao"` e `selecaoValida` | `REVISAO` |
| 6 | `tela = LISTA` e `passoUrl = "revisao"` sem seleção válida, ou `"sucesso"` sem voto válido, ou valor desconhecido | `LISTA`; `normalizarPara = BASE` |
| 7 | Qualquer outra | `LISTA` |

- **`BASE`** é `/e/{slug}/votar` sem `passo` (o `candidato`, se houver, só é mantido quando o passo é `LISTA`; com `passo` diferente de `lista`, o `candidato` é ignorado, D10 da Etapa 4).
- A normalização é um **efeito de navegação** (`router.replace`), não `setState`. O que se renderiza vem de `passo`, então não há *flash* de tela errada.
- O sucesso depende da URL: voltar ou recarregar `/votar` por `Link` depois do sucesso cai em `TelaJaVotou` (público) ou na lista (jurado). O botão voltar do navegador a partir de outra rota pode reabrir a entrada `?passo=sucesso`, e o sucesso reaparece enquanto a aba viver; é navegação interna (D18 da Etapa 0).

### 5.4 Seleção

| Elemento | Regra |
|---|---|
| Grupo | `<fieldset>` com `<legend>` oculta "Sua escolha de voto" em volta de `ListaCandidatos`, montado por `TelaVotar` |
| Ação do cartão (`renderAcao`) | `EscolhaCandidato`: `<label>` com `<input type="radio" name="escolha-voto">` e o texto visível "Escolher"; `aria-label` "Escolher: {título}" (começa com o texto visível). Alvo de 44 px. Foco visível |
| Cartão selecionado | Borda e `ring` por tokens + `Selo` "Sua escolha" no *slot* `renderSelo` (ícone + texto) |
| Sem ação | Item com `bloqueadoVotoProprio` (a dica da Etapa 4 já explica) e o candidato que é o **voto atual** do jurado (que mostra `Selo` "Seu voto atual") |
| Detalhe (`renderAcoes`) | Botão primário "Escolher e revisar" (D4); se já selecionado, "Revisar voto"; se é o voto atual do jurado, texto estático "Esse já é o seu voto."; bloqueado: nenhum botão |
| `BarraSelecao` | Fixa no rodapé, só com seleção válida: "Sua escolha: {título}" (uma linha, truncada), "Limpar" (contorno) e o botão primário "Revisar voto" (jurado com voto atual: "Revisar alteração"). `padding-bottom` com `env(safe-area-inset-bottom)`; a lista ganha folga embaixo para não esconder o último cartão |
| Anúncio | Ao escolher: `LiveRegion` "Sua escolha: {título}"; ao limpar: "Escolha removida" |
| Detalhe aberto | Escolher no detalhe não precisa fechar antes: a navegação para a revisão troca a entrada (D4) |

### 5.5 Revisão

Rota `?passo=revisao`. Um `h1`, e o foco vai para ele ao entrar (seção 5.9).

| Elemento | Público | Jurado |
|---|---|---|
| `h1` | "Revise seu voto" | "Revise seu voto" |
| Cartaz | `ImagemCandidato` grande + "Você está votando em" e o **título completo** (localizado por `localizarNaOrdem`) | igual |
| Aviso principal | `Alerta` informativo: "Seu voto é secreto: ele não fica ligado ao seu nome." | `Alerta` informativo: "Seu voto é identificado para a organização e pode ser alterado até o encerramento da votação." (D11) |
| Aviso de definitivo | "Depois de confirmar, não será possível alterar nem desfazer o voto." | (não aparece) |
| Caixa de ciência | (não aparece) | Só no **primeiro** voto (sem voto atual): `Checkbox` obrigatório "Sei que meu voto é identificado para a organização", desmarcado ao entrar na revisão; nas alterações não aparece (D11, rev. 3, E10) |
| Ações | "Confirmar voto" (primário) e "Trocar escolha" (contorno) | igual; no primeiro voto, "Confirmar voto" fica desabilitado enquanto a caixa de ciência não estiver marcada; se a escolha é o voto atual: "Confirmar voto" desabilitado e o texto "Esse já é o seu voto. Escolha outra opção para alterar." |
| Enviando | Botão com `carregando` e texto "Enviando seu voto…"; `aria-busy` na seção; "Trocar escolha" desabilitado | igual |
| Verificando | Texto "Verificando seu voto…" com `Carregando`; os dois botões desabilitados | igual |
| Falha `REDE` | `Alerta` de erro "Seu voto ainda não foi registrado." + "Tentar novamente" | igual |
| Falha `ERRO_INTERNO` | `Alerta` de erro com a mensagem genérica de `mensagens.ts` + "Tentar novamente" | igual |
| Falha `NAO_CONFIRMADO` | `Alerta` de erro "Não foi possível confirmar se seu voto foi registrado. Verifique antes de tentar de novo." + "Verificar novamente"; **sem** "Confirmar voto" e com "Trocar escolha" desabilitado | igual |

Se a gate trocar de tela com a revisão aberta (urna encerrada pela toolbar, por exemplo), `TelaVotar` mostra a tela de estado e o botão de confirmar deixa de existir (W12).

### 5.6 Envio: do clique ao resultado

1. **Trava.** O manipulador lê `store.getState().ui.votacao.envio`; se não for `OCIOSO`, ignora o clique. Senão `iniciarEnvio` grava `envio = ENVIANDO` (limpa `falhaEnvio` e `aviso`) de forma **síncrona**, antes de qualquer `await`. Dois cliques no mesmo instante geram **uma** chamada. A proteção do serviço é a validação 7 (`JA_VOTOU`).
2. Captura `jaVotouAntes` (do jurado) e chama `votarPopular` ou `votarJuri` conforme `papelVoto`.
3. Mapeia o resultado com **uma única** chamada de `concluirEnvio`:

| Resultado | Efeito em `ui.votacao` | O que o usuário vê |
|---|---|---|
| `ok` | `ultimoVoto = { candidatoId, resultado }`, `selecaoId = null`, `envio = OCIOSO`; jurado: recarrega o voto atual | Sucesso (seção 5.7) |
| `REDE` | `envio = VERIFICANDO` e chama `consultarEstadoVoto`: **votou** (popular) ou `candidatoAtualId` igual à escolha (júri) → trata como `ok` (`resultado = jaVotouAntes ? ATUALIZADO : REGISTRADO`); **não gravou** → `falhaEnvio = REDE`; **a consulta também falhou** → `falhaEnvio = NAO_CONFIRMADO` | Sucesso, ou a falha correspondente na revisão |
| `ERRO_INTERNO` e qualquer erro inesperado | `falhaEnvio = ERRO_INTERNO`, `envio = OCIOSO` | Falha na revisão com "Tentar novamente" |
| `CANDIDATO_INDISPONIVEL` | `aviso = ESCOLHA_INDISPONIVEL`, `selecaoId = null` | Volta à lista, com `Alerta` "A escolha anterior não está mais disponível. Escolha novamente." |
| `VOTO_PROPRIO` | `aviso = VOTO_PROPRIO`, `selecaoId = null` | Volta à lista, com a mensagem de `VOTO_PROPRIO` |
| `JA_VOTOU` | `aviso = JA_VOTOU_ANTES`, `selecaoId = null` | `TelaJaVotou` com `Alerta` "Seu voto já tinha sido registrado em outra sessão. A escolha desta tela não foi usada." |
| `URNA_NAO_ABERTA`, `URNA_ENCERRADA`, `EVENTO_CONCLUIDO`, `EVENTO_INDISPONIVEL`, `PAPEL_INVALIDO`, `EMAIL_NAO_VERIFICADO`, `NAO_AUTORIZADO` | `aviso = NAO_REGISTRADO`, `selecaoId = null` | A tela de estado da gate (ou o `RotaGuard`) com `Alerta` "Sua escolha não foi registrada: a votação não estava aberta." Se a gate ainda disser `LISTA`, o alerta aparece na lista |

4. Todo log de rejeição vai ao console (`[mock:log]`); a interface só mostra mensagens genéricas.
5. "Verificar novamente" chama só `consultarEstadoVoto` (nunca reenvia) e repete o mapeamento da linha `REDE`.

### 5.7 Sucesso e "já votou"

**Sucesso** (`TelaSucesso`, `?passo=sucesso`): `Selo` com ícone de confirmação, `h1` e corpo de `textoDoEstado` conforme a tabela, o aviso de que o resultado só aparece quando a organização liberar e o botão "Voltar ao evento" (`Link`). **Público:** "Seu voto foi registrado" (título padrão de `SUCESSO`), **sem** o nome do candidato (um *print* equivaleria a um comprovante; rev. 3, E8). **Jurado:** continua mostrando o voto atual, na linha "Sua escolha: {título}" (pelo `ultimoVoto`; `Jurado.md` §6.7).

| Quem | `resultado` | Chave de texto | Botões extras |
|---|---|---|---|
| Público | `REGISTRADO` | `SUCESSO` (override do Festival) | — |
| Jurado | `REGISTRADO` ou `SEM_ALTERACAO` | `JURADO_JA_VOTOU` | "Alterar meu voto" (`descartarSucesso` + `router.replace` para a base) |
| Jurado | `ATUALIZADO` | `VOTO_ATUALIZADO` (nova) | "Alterar meu voto" |

Animação discreta em CSS, desligada com `prefers-reduced-motion`. O anúncio de sucesso e de erro usa `LiveRegion`.

**`TelaJaVotou`** (público já votou, sem sucesso ativo): `Selo` "Voto registrado", `h1` e corpo de `textoDoEstado("JA_VOTOU")`, botão "Voltar ao evento". **Nunca** mostra em quem a pessoa votou. Mostra o `Alerta` `JA_VOTOU_ANTES` quando houver. Substitui a tela simples da Etapa 4 (remove o ramo `JA_VOTOU` de `TelaEstadoVotar`).

### 5.8 Jurado

- **Lista:** a mesma da Etapa 4, sem contagens. `useVotoAtual(eventoId)` (`components/votacao/useVotoAtual.ts`) lê `consultarEstadoVoto` com `useConsulta`, **só** com `papelVoto = JURADO`. Enquanto carrega ou se falhar, a lista funciona sem o selo "Seu voto atual" (o serviço revalida: `SEM_ALTERACAO`).
- **Seu voto atual:** `renderSelo` mostra `Selo` "Seu voto atual" no candidato de `candidatoAtualId`. Esse cartão não tem "Escolher".
- **Alterar:** escolher outro candidato leva a "Revisar alteração"; o sucesso é `ATUALIZADO` ("Seu voto foi atualizado"); "Alterar meu voto" volta à lista.
- **Mesmo candidato:** impedido na UI (sem ação) e, se chegar ao serviço, `SEM_ALTERACAO` sem gravar e sem auditar.
- **Urna encerrada:** a gate mostra `ENCERRADA`; sem botão de voto (W19).
- **Módulo júri desligado:** resolvido pela gate (`JURI_DESLIGADO`, D8 da Etapa 4); não se repete.
- **Histórico e auditoria:** D10. Votar em A e alterar para B deixa 1 `VotoJuri` e 2 entradas de histórico (`null → A`, `A → B`); com a entrada que o Fábio já tem no seed, a primeira alteração dele chega a 2.
- **Público não vê** "Alterar voto", "Seu voto atual" nem o aviso de identificação.

### 5.9 Textos e acessibilidade

**Chaves de estado** (via `textoDoEstado`, com override do tema). Reaproveita `JA_VOTOU`, `JURADO_JA_VOTOU` e `SUCESSO`, e acrescenta:

| Chave | Título | Corpo |
|---|---|---|
| `SUCESSO` (padrão, para temas sem override) | Seu voto foi registrado | Obrigado por participar! O resultado será divulgado pela organização. |
| `VOTO_ATUALIZADO` (**nova**) | Seu voto foi atualizado | Você pode alterá-lo até o encerramento da votação. |

`TextosEstado` ganha a chave `VOTO_ATUALIZADO`; o Festival não a sobrescreve (testa o fallback).

**Textos fixos** (sem override): "Escolher", "Escolher e revisar", "Revisar voto", "Revisar alteração", "Limpar", "Sua escolha", "Sua escolha: {título}", "Seu voto atual", "Esse já é o seu voto.", "Revise seu voto", "Você está votando em", "Sei que meu voto é identificado para a organização", "Confirmar voto", "Trocar escolha", "Enviando seu voto…", "Verificando seu voto…", "Tentar novamente", "Verificar novamente", "Alterar meu voto", "Voltar ao evento" e os textos dos `Alerta` das seções 5.5 a 5.7. As mensagens de erro vêm de `mensagens.ts`; a única nova da Etapa 4 (`VOTO_PROPRIO`) já existe. Os códigos usados aqui têm mensagem desde a Etapa 0 (conferir no CP1).

Nenhum texto leva artigo ou adjetivo que concorde com o rótulo ("Escolher", não "Escolher este"; "Sua escolha", não "Selecionado/Selecionada"). Onde o rótulo aparece, entra pelo mecanismo da Etapa 2.

**Acessibilidade e React Compiler**
- Foco no `h1` (`tabIndex={-1}`) a cada troca de passo, **exceto** na primeira renderização da rota (`useFocoNoTitulo`).
- `aria-live` (`LiveRegion` / `role="alert"` nos erros) para escolha, sucesso e falha; `aria-busy` durante o envio.
- Informação nunca só por cor; alvos de 44 px; foco visível; `prefers-reduced-motion`; contraste ≥ 4,5:1 nos dois temas.
- Sem `setState` síncrono em efeito. A normalização da URL é `router.replace` em efeito de navegação. Leitura de `ref` só em manipulador de evento (a marca "revisão aberta pela lista" da D5).

### 5.10 Matriz de verificação

Todos os testes são feitos **na mesma aba**, navegando por `Link` (D18 da Etapa 0). Para conferir o `banco`, use o `InspetorEstado` (substitui o contador de depuração) e confirme `verificarInvariantes` vazia **depois de cada linha**.

| # | Cenário | Como provocar | Resultado esperado |
|---|---|---|---|
| W1 | Público, fluxo feliz | Semana Tech, Ana: escolher, "Revisar voto", "Confirmar voto" | Sucesso "Seu voto foi registrado", **sem** o nome do candidato (E8); `votos` +1 (Eva + Ana); Ana `votou`; `vinculosVoto["usr-ana:evt-semana-tech"]` preenchido |
| W2 | Depois do sucesso | W1 e "Voltar ao evento"; voltar a `/votar` por `Link` | Entrada com selo "Seu voto foi registrado"; `/votar` mostra `TelaJaVotou` sem dizer em quem |
| W3 | Trocar escolha | Revisão e "Trocar escolha" | Volta à lista com a seleção mantida; o voltar do navegador não cria entradas duplicadas |
| W4 | Duplo clique | Latência 1500 e dois cliques rápidos em "Confirmar voto" | **1** voto novo |
| W5 | Já votou | Semana Tech, Eva | `TelaJaVotou`, sem lista, sem dizer em quem |
| W6 | Rede: não gravou | `Falha no próximo envio = REDE_NAO_GRAVOU`, Ana confirma | "Verificando seu voto…", depois "Seu voto ainda não foi registrado." + "Tentar novamente"; 0 voto novo; tentar de novo dá sucesso |
| W7 | Rede: gravou | `REDE_GRAVOU` | "Verificando seu voto…" e sucesso, sem permitir novo envio; 1 voto novo |
| W8 | Urna encerra no envio | `URNA_ENCERRA` | Tela `ENCERRADA` com o alerta "Sua escolha não foi registrada…"; 0 voto; resultado congelado e auditoria `URNA_ENCERRADA` com origem `FALHA_SIMULADA` |
| W9 | Já votou em outra sessão | `JA_VOTOU_OUTRA_SESSAO` | `TelaJaVotou` com o alerta de outra sessão; 1 voto (da "outra sessão"); invariantes verdes |
| W10 | Erro interno | `ERRO_INTERNO` | Mensagem genérica + "Tentar novamente"; 0 voto |
| W11 | Rede persistente | Liga "Erro de rede" e confirma | Verificação falha: "Não foi possível confirmar…" + "Verificar novamente", sem "Confirmar voto"; ao desligar o erro de rede e verificar, volta ao estado real |
| W12 | Urna fecha com a revisão aberta | Toolbar: urna "Encerrada" | Tela `ENCERRADA` na hora; não há como confirmar; seleção descartada |
| W13 | Candidato indisponível | Toolbar, "Enviar direto" com `cand-st-09` (rascunho) e depois `cand-st-10` | `CANDIDATO_INDISPONIVEL` nos dois; 0 voto |
| W14 | Voto em si mesmo | "Enviar direto" como Gabi com `cand-st-08` (popular); depois com `VOTO_PROPRIO_PERMITIDO` | `VOTO_PROPRIO` e 0 voto; com o cenário, o voto é aceito |
| W15 | Jurado, primeiro voto | Bruno: escolhe, revisa, marca a caixa de ciência, confirma | Antes de marcar a caixa, "Confirmar voto" desabilitado (E10); sucesso `JURADO_JA_VOTOU` com "Sua escolha: {título}"; `votosJuri` +1; histórico +1 com anterior `null`; auditoria `VOTO_JURI_REGISTRADO` |
| W16 | Jurado altera | Fábio: "Seu voto atual" marcado; escolher outro, "Revisar alteração", confirmar | Sem caixa de ciência na alteração (E10); "Seu voto foi atualizado"; ainda 1 `VotoJuri` dele; histórico 2 entradas; auditoria `VOTO_JURI_ALTERADO`; "Alterar meu voto" e voltar ao primeiro dá 3 entradas |
| W17 | Jurado, mesmo candidato | Fábio, "Enviar direto" (júri) com o voto atual | `SEM_ALTERACAO`; nenhuma entrada nova |
| W18 | Papéis | Ana na revisão × Bruno na revisão | Só o jurado vê o aviso de identificação e a caixa de ciência; só o público vê "não será possível alterar" |
| W19 | Jurado, urna encerrada | Bruno ou Fábio, urna "Encerrada" | `ENCERRADA`, sem botão de voto |
| W20 | Tempo esgotado | `SEM_ENCERRAMENTO_AUTOMATICO` + "Fim da janela" + Ana | Aviso da Etapa 4 e o voto é **aceito** |
| W21 | Participação ausente | Festival, urna "Aberta", Ana (sem participação ali ao chegar) | Ao chegar, `garantirParticipacao` (Etapa 3) cria a participação `PUBLICO` **antes** de qualquer voto; o voto é aceito e atualiza essa participação (não cria outra); textos próprios de `SUCESSO` do Festival. A recusa defensiva do envio sem participação (`NAO_AUTORIZADO`, `[mock:log]`, 0 mudança no `banco`, D14) é conferida no CP1, chamando o serviço pelo console (D19 da Etapa 0) |
| W22 | Troca de usuário | Ana escolhe e, na toolbar, "Entrar como" Bruno | Bruno vê a lista **sem** seleção (D1) |
| W23 | Tema e rótulos | Revisão aberta, trocar evento e tema na toolbar | Cores, fonte e rótulos mudam sem recarregar; nenhum texto dependente de gênero |
| W24 | Papéis impróprios | "Enviar direto" (popular) como Carla e como Bruno; (júri) como Ana; Davi em qualquer um | `PAPEL_INVALIDO`, `PAPEL_INVALIDO`, `PAPEL_INVALIDO`, `EMAIL_NAO_VERIFICADO`; 0 mudança no `banco` |
| W25 | Links diretos | `?passo=revisao` sem seleção; `?passo=sucesso` sem voto; `?passo=xyz` | Lista, URL normalizada, sem erro |
| W26 | Resetar meu voto | Eva, "Resetar meu voto" | Voto removido, `votou = false`, vínculo apagado, invariantes verdes; com urna não aberta, recusa com aviso |
| W27 | Sem contagens | Qualquer tela do fluxo, os dois papéis | Nenhum número de votos |
| W28 | Teclado | Lista → escolher → "Revisar voto" → "Confirmar voto" só com teclado | Tudo operável; foco no `h1` a cada passo |

---

## 6. Estrutura de arquivos

| Arquivo | Ação |
|---|---|
| `src/servicos/votacao.ts` | Novo: `votarPopular`, `votarJuri`, `consultarEstadoVoto` |
| `src/dominio/aplicarVoto.ts` | Novo: `aplicarVotoPopular`, `aplicarVotoJuri` (puras) |
| `src/dominio/passoVotar.ts` | Novo: `resolverPassoVotar` |
| `src/dominio/aplicarVoto.test.ts`, `src/dominio/passoVotar.test.ts` | Novos: testes Vitest (D19 da Etapa 0) |
| `src/store/acoesVotacao.ts` | Novo: `selecionarCandidato`, `iniciarEnvio`, `concluirEnvio`, `descartarSucesso`, `resetarMeuVoto` |
| `src/store/seletores/votacao.ts` | Novo: `useSelecaoVoto` |
| `src/components/votacao/TelaVotar.tsx` | Altera: `fieldset`, *slots*, `resolverPassoVotar`, normalização da URL, `AvisoVotacao` |
| `src/components/votacao/TelaEstadoVotar.tsx` | Altera: remove o ramo `JA_VOTOU` simples |
| `src/components/votacao/CabecalhoLista.tsx` | Altera: remove o aviso provisório `// TODO(Etapa 5)` |
| `src/components/votacao/EscolhaCandidato.tsx` | Novo: `radio` + `label` "Escolher" |
| `src/components/votacao/BarraSelecao.tsx` | Novo |
| `src/components/votacao/TelaRevisao.tsx` | Novo |
| `src/components/votacao/TelaSucesso.tsx` | Novo |
| `src/components/votacao/TelaJaVotou.tsx` | Novo |
| `src/components/votacao/AvisoVotacao.tsx` | Novo: `Alerta` por `AvisoVotacao` |
| `src/components/votacao/useEnviarVoto.ts` | Novo: `enviar`, `verificarNovamente` (seção 5.6) |
| `src/components/votacao/useVotoAtual.ts` | Novo: `useConsulta` de `consultarEstadoVoto` (só júri) |
| `src/components/votacao/useFocoNoTitulo.ts` | Novo |
| `src/components/dev/secoes/SecaoVotacao.tsx` | Novo: "Resetar meu voto" e "Enviar direto" |
| `src/dominio/tipos.ts` | Estende `EstadoUi` (`votacao`) e `TextosEstado` (`VOTO_ATUALIZADO`) |
| `src/lib/textosEstado.ts` | Acrescenta o padrão de `SUCESSO` e `VOTO_ATUALIZADO` |
| `src/mocks/criarEstadoNucleo.ts` | Valor inicial de `ui.votacao` (se não vier da Etapa 0); chave `usuarioId:eventoId` de `dev.vinculosVoto` do Eva (D16): conferir, já vem da Etapa 0 rev. 2 |
| `src/servicos/resultado.ts`, `src/store/transicoes.ts` | Só se a Etapa 0 foi implementada pela rev. 1: aplicar a D16 (parâmetro de `simularFalha`, origem `FALHA_SIMULADA`). Na rev. 2: nenhuma edição |

Não são criados aqui: `sessaoUi`, `ResultadoVoto`, `MotivoRejeicao`, contador de depuração em tela, `features/votar`, controles de "participação sem voto/já votou" e de e-mail verificado na toolbar, `repo.ts`.

---

## 7. Checkpoints

### CP1 — Conferência, contratos e serviços (sem tela do produto)

**Objetivo:** conferir o que as Etapas 0 a 4 entregaram e deixar pronta toda a lógica de voto, antes de qualquer tela.

**Tarefas**
- [ ] Conferir o contrato da seção 3.1 contra o código e ajustar **aqui** o que divergir. Em especial: assinatura de `simularFalha`/`consumirFalhaProxima`, se `useConsulta` recarrega quando a consulta muda (senão, `recarregar()` explícito), assinatura de `registrarAuditoria` e do tipo de ação, tipo da `origem` de `encerrarUrna`, ids e campos de `VotoJuri` e `HistoricoVotoJuri`, e se todos os `CodigoErro` usados têm mensagem em `mensagens.ts`.
- [ ] **Conferir a D16** (a Etapa 0 rev. 2 já a traz): chave `usuarioId:eventoId` em `dev.vinculosVoto` (seed do Eva), `simularFalha({ consumirPontual: false })` sem consumir falha pontual, origem `FALHA_SIMULADA` em `OrigemEncerramento`. Se faltar algum, aplicar aqui e registrar no Contexto.
- [ ] Estender `EstadoUi` com `votacao` (seção 5.1) e o valor inicial em `criarEstadoInicial`.
- [ ] Estender `TextosEstado` e `textosEstado.ts` (`SUCESSO` padrão, `VOTO_ATUALIZADO`).
- [ ] `dominio/aplicarVoto.ts` e `servicos/votacao.ts` conforme a seção 5.2 (validações na ordem, modos de falha, auditoria do júri, recusa `NAO_AUTORIZADO` sem participação; nenhuma criação de participação, D14).
- [ ] `store/acoesVotacao.ts` e `store/seletores/votacao.ts` (seção 5.1).
- [ ] `dominio/passoVotar.ts` (seção 5.3).
- [ ] Testes Vitest ao lado dos módulos (D19 da Etapa 0): `aplicarVoto.test.ts` (voto popular sem campo de usuário, `votou`, `vinculosVoto` e `sequencias.voto` coerentes, nenhuma participação criada; júri com entrada de histórico `null → A` no primeiro voto e `A → B` na alteração; entrada não mutada; `verificarInvariantes` vazia) e `passoVotar.test.ts` (`resolverPassoVotar` nas linhas 1 a 7 da tabela 5.3); `pnpm test` verde.
- [ ] Seção "Votação" da toolbar: "Resetar meu voto" (só com a urna aberta; público por `vinculosVoto`, júri pela participação, limpando `ui.votacao`) e "Enviar direto" (escolhe serviço e candidato, inclusive não votáveis e vinculado, e mostra o `codigo` num `Toast`).
- [ ] Nenhuma tela do produto criada ou alterada.

**Fica fake:** latência, falhas, hash do recibo e auditoria são simulados.

**Pronto quando:** por "Enviar direto" e pelo `InspetorEstado` (D19 da Etapa 0): W13, W14, W17, W24 e W26 dão o resultado esperado; um voto popular de Ana deixa `Voto` +1, `votou`, `vinculosVoto` e `sequencias.voto` coerentes e **nenhum** campo de usuário em `Voto`; o primeiro voto de Bruno cria `VotoJuri`, uma entrada com anterior `null` e a auditoria `VOTO_JURI_REGISTRADO`; o modo `REDE_GRAVOU` grava e devolve `REDE`; `REDE_NAO_GRAVOU` e `ERRO_INTERNO` não gravam; `URNA_ENCERRA` encerra a urna e congela o resultado (stub); uma rejeição qualquer deixa o `banco` **idêntico** (exceto `JA_VOTOU_OUTRA_SESSAO`); `consultarEstadoVoto` não consome `falhaProxima`; `votarPopular` e `votarJuri` sem participação no evento devolvem `NAO_AUTORIZADO` sem mudar o `banco` e com `[mock:log]` (D14); `resolverPassoVotar` dá o esperado nas linhas 1 a 7 da tabela 5.3 (testes Vitest); `verificarInvariantes` vazia depois de cada chamada.

**Entrega:** `VaiVota-E5-CP1.zip`

### CP2 — Seleção

**Objetivo:** escolher um candidato na lista ou no detalhe, e ver a escolha.

**Tarefas**
- [ ] `TelaVotar`: `fieldset` com legenda oculta, `useSelecaoVoto`, `EscolhaCandidato` em `renderAcao` e `Selo` "Sua escolha" em `renderSelo` (seção 5.4).
- [ ] `BarraSelecao` com "Limpar" e "Revisar voto"; folga inferior na lista.
- [ ] Botão do detalhe em `renderAcoes` ("Escolher e revisar" / "Revisar voto"); itens bloqueados sem ação.
- [ ] "Revisar voto" leva a `?passo=revisao` por `router.push` (D5); a revisão mostra, por ora, o texto provisório "Revisão: CP3".
- [ ] Remover o `Alerta` provisório do `CabecalhoLista`.
- [ ] Anúncios por `LiveRegion` (escolher e limpar).
- [ ] Nenhuma contagem visível.

**Fica fake:** nada novo.

**Pronto quando:** escolher pelo cartão e pelo detalhe funciona só com teclado (setas movem entre os `radio`); a escolha sobrevive a abrir e fechar o detalhe; Gabi não vê "Escolher" em `cand-st-08`; trocar de usuário descarta a seleção (W22); a barra respeita a *safe area* e não cobre o último cartão em 360 px; a ordem dos cartões não muda ao escolher.

**Entrega:** `VaiVota-E5-CP2.zip`

### CP3 — Revisão, envio e sucesso (público)

**Objetivo:** do "Revisar voto" até o sucesso, com proteção contra repetição.

**Tarefas**
- [ ] `TelaVotar` passa a usar `resolverPassoVotar` e a normalizar a URL por `router.replace` (seção 5.3), incluindo a marca "revisão aberta pela lista" em `useRef`.
- [ ] `TelaRevisao` (público) conforme a seção 5.5, com "Trocar escolha" (D5).
- [ ] `useEnviarVoto` com a trava síncrona de `iniciarEnvio`, o caminho `ok` e o estado "Enviando seu voto…" (os erros entram no CP4).
- [ ] `TelaSucesso` e `TelaJaVotou` (seção 5.7); remover o ramo `JA_VOTOU` de `TelaEstadoVotar`.
- [ ] `useFocoNoTitulo` e `AvisoVotacao`.
- [ ] Sucesso por `LiveRegion`; animação desligada com movimento reduzido.

**Fica fake:** latência simulada; envio sem rede real.

**Pronto quando:** W1 a W5, W12, W20, W21, W23 e W25 passam; duplo clique gera **1** voto; o sucesso aparece para o público mesmo com a gate mudando para `JA_VOTOU` (D2); voltar do navegador depois do sucesso nunca reabre a revisão; o sucesso do público não mostra o nome do candidato (E8); `/votar` por `Link` depois do sucesso mostra `TelaJaVotou` sem o nome.

**Entrega:** `VaiVota-E5-CP3.zip`

### CP4 — Erros e recuperação

**Objetivo:** fechar o ciclo do voto popular no caminho infeliz.

**Tarefas**
- [ ] Mapeamento completo da tabela 5.6, em `concluirEnvio` e `useEnviarVoto`.
- [ ] `VERIFICANDO` com `consultarEstadoVoto`; `falhaEnvio` `REDE`, `ERRO_INTERNO` e `NAO_CONFIRMADO`; "Tentar novamente" e "Verificar novamente" (D9).
- [ ] `AvisoVotacao` com os quatro avisos e sua posição em cada tela (lista, `TelaJaVotou`, tela de estado).
- [ ] Log `[mock:log]` para cada rejeição, sem detalhe na interface.
- [ ] Conferir o `Inspetor` depois de cada modo da toolbar.

**Fica fake:** os seis modos são forçados pela toolbar.

**Pronto quando:** W6 a W11 passam com o resultado exato (nenhum voto duplicado em nenhum modo); com `simularErroRede` ligado nunca aparece "Confirmar voto" enquanto a verificação não for concluída; as invariantes ficam verdes depois de cada modo.

**Entrega:** `VaiVota-E5-CP4.zip`

### CP5 — Jurado

**Objetivo:** variação do fluxo para o jurado (`Jurado.md`, seção 6).

**Tarefas**
- [ ] `useVotoAtual` e o `Selo` "Seu voto atual" em `renderSelo`; o cartão do voto atual sem "Escolher"; texto estático no detalhe.
- [ ] Botão "Revisar alteração" na barra quando existe voto atual.
- [ ] Aviso de identificação na `TelaRevisao` do jurado (D11) e ausência do aviso de "definitivo".
- [ ] Caixa de ciência obrigatória na revisão do **primeiro** voto do jurado; "Confirmar voto" desabilitado sem ela; ausente nas alterações (D11, E10).
- [ ] `votarJuri` ligado a `useEnviarVoto` (mesmo mapeamento da seção 5.6, `ATUALIZADO`, `SEM_ALTERACAO`).
- [ ] `TelaSucesso` do jurado com `JURADO_JA_VOTOU` ou `VOTO_ATUALIZADO`, a linha "Sua escolha: {título}" e "Alterar meu voto".
- [ ] Recarregar o voto atual depois de cada envio.
- [ ] Conferir que **nenhuma contagem** aparece no fluxo do jurado.

**Fica fake:** a identificação para a organização é só um aviso; o painel que mostra os votos identificados é da Etapa 7.

**Pronto quando:** W15 a W19 e W27 passam; Fábio altera e a auditoria e o histórico têm as entradas esperadas; o público nunca vê "Seu voto atual" nem o aviso de identificação; `verificarInvariantes` vazia.

**Entrega:** `VaiVota-E5-CP5.zip`

### CP6 — Revisão e fechamento

**Objetivo:** fechar a etapa com evidência.

**Tarefas**
- [ ] Percorrer W1 a W28 nos dois temas e em 360, 390, 768 e 1280 px (celular em retrato e paisagem), sem rolagem horizontal.
- [ ] Acessibilidade: um `h1` por tela, foco no título a cada passo, `aria-live` nas mensagens, `aria-busy` no envio, `radio` operável por teclado, foco visível, alvos de 44 px, contraste ≥ 4,5:1 (alertas, selos, barra), `prefers-reduced-motion`.
- [ ] Revisar os textos em português (tom e ausência de concordância de gênero com o rótulo) e listar os que dependem de aprovação.
- [ ] `grep`: nenhum hex de marca nem classe de paleta nos componentes novos.
- [ ] `grep`: nenhum `<a href>` para rota interna; nenhum `Math.random`; nenhum `// TODO(Etapa 5)`.
- [ ] `grep`: nenhum acesso a `votos`, `votosJuri`, `historicoVotosJuri`, `votosInfantis` ou `resultados` em `src/components/**` e `src/app/**` (a seção da toolbar usa `InspetorEstado` e ações de `store/`); nenhum import de `@/mocks` em componentes.
- [ ] `grep`: nenhum texto de interface com "candidato" ou "candidatos" fixo (usar os rótulos do tema).
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` sem erros; sem warnings de hidratação.
- [ ] Atualizar o Contexto (seções 2, 4.4, 4.9, 7.1 e 10) e a seção 3.2 com o que mudou em relação ao entregue.

| Grupo \ Tema | Semana Tech | Festival |
|---|---|---|
| Seleção (W22, W27, W28) | ☐ | ☐ |
| Fluxo feliz e navegação (W1 a W5, W25) | ☐ | ☐ |
| Falhas e recuperação (W6 a W12) | ☐ | ☐ |
| Serviço direto (W13, W14, W24) | ☐ | ☐ |
| Jurado (W15 a W19) | ☐ | ☐ |
| Estados do evento (W20, W21, W23) | ☐ | ☐ |
| Ferramentas de teste (W26) | ☐ | ☐ |

**Pronto quando:** a matriz está inteira marcada e a seção 9 atendida.

**Entrega:** `VaiVota-E5-CP6.zip` (final da Etapa 5)

---

## 8. O que fica fake

| Item | Tratamento |
|---|---|
| Persistência do voto | Nenhuma; F5 e nova aba voltam ao seed (D18 da Etapa 0) |
| "Servidor" | Os serviços rodam no cliente; na trilha de produção as mesmas validações vão para o servidor, com transação e restrição de unicidade |
| Latência e falhas | Latência global da toolbar; os seis modos pela toolbar |
| "Outra sessão" | Simulada pelo modo `JA_VOTOU_OUTRA_SESSAO`; não há segunda sessão real |
| Hash do recibo | `hashMock` sobre a sequência, gravado e nunca exibido; **não** é o algoritmo real (em produção, aleatório de 32 bytes, C20) |
| Identidade e e-mail verificado | Seed e "Entrar como" |
| Rate limiting de voto | Não simulado (só o do código de convite, na Etapa 3) |
| Auditoria | Registrada no `banco` mock com `ipHash` constante |
| "Resetar meu voto" e "Enviar direto" | Ferramentas de teste; não fazem parte do produto |

## 9. Critérios de aceitação

- [ ] Público escolhe, revisa, confirma e vê o sucesso em poucos passos, no celular e no desktop.
- [ ] "Trocar escolha" volta à lista mantendo a seleção; depois de confirmar, não há como editar nem desfazer o voto popular.
- [ ] Um segundo voto do mesmo usuário é impedido, inclusive com duplo clique e com "já votou em outra sessão".
- [ ] Com a urna não iniciada ou encerrada não aparece botão de voto, e os serviços também recusam (`URNA_NAO_ABERTA`, `URNA_ENCERRADA`).
- [ ] Encerrar a urna com a pessoa na revisão bloqueia a confirmação na hora.
- [ ] Depois de erro de rede, a tela consulta o estado real antes de permitir novo envio; nenhum modo de falha gera voto duplicado.
- [ ] `Voto` não tem usuário; `TelaJaVotou` não revela em quem a pessoa votou; a escolha só existe em `ui` e nunca no `banco` ligada à pessoa.
- [ ] Voto, `votou` e `dev.vinculosVoto` são gravados juntos; as invariantes 3, 4 e 5 ficam verdes depois de cada serviço.
- [ ] Candidato vinculado ao usuário não é votável pela UI nem pelo serviço (`VOTO_PROPRIO`, com `bloquearVotoProprio` ligado).
- [ ] Jurado vota, vê a confirmação e altera até o fim da urna; o histórico (inclusive o primeiro voto) e a auditoria são gravados.
- [ ] O aviso de voto identificado aparece uma única vez, na revisão do jurado; no primeiro voto, "Confirmar voto" só habilita com a caixa de ciência marcada; o público não vê nenhum dos dois.
- [ ] O sucesso do público não mostra o nome do candidato; o do jurado mostra o voto atual.
- [ ] Nenhuma tela de `/votar` mostra contagem de votos, para público ou jurado.
- [ ] `TEMPO_ESGOTADO` ainda aceita voto; o voto nunca cria participação (ela vem da Etapa 3) e o envio sem participação é recusado com `NAO_AUTORIZADO`.
- [ ] O tema do evento aparece em todas as telas do fluxo e nenhum texto concorda em gênero com o rótulo.
- [ ] Foco visível, navegação por teclado, `prefers-reduced-motion` respeitado, informação nunca só por cor.
- [ ] Console sem erros nem avisos de hidratação; F5 volta ao seed.

## 10. Pendências

- **P1 — Comprovante do voto:** **Resolvida (rev. 3, E7): confirmado.** Sem comprovante: não exibir hash nem recibo (um comprovante que identifica a escolha pode servir de prova para compra de voto).
- **P2 — Nome do candidato na tela de sucesso:** **Resolvida (rev. 3, E8):** o sucesso do público diz "Seu voto foi registrado", sem o nome do candidato; o jurado continua vendo o voto atual (`Jurado.md` §6.7) (seção 5.7).
- **P3 — Jurado após o encerramento:** **Resolvida (rev. 3, E9): confirmado.** O jurado **não** vê o próprio voto depois do fim.
- **P4 — Aviso de voto identificado:** **Resolvida (rev. 3, E10):** banner informativo mais caixa de ciência obrigatória "Sei que meu voto é identificado para a organização" na revisão do primeiro voto do jurado; sem ela, "Confirmar voto" fica desabilitado (D11).
- **P5 — "Escolher e revisar" no detalhe:** assumido que vai direto à revisão (D4). Se preferirem voltar à lista com a seleção marcada, ajusta-se no CP2.
- **P6 — Rate limiting de login e voto** (`Login.md`, seção 8): **Resolvida (rev. 3, C9):** só o bloqueio de código é simulado; o rate limiting real vai para o planner de produção (A3).
- **P7 — Errata da Etapa 0 (D16):** incorporada na Etapa 0 rev. 2 (Anexo C); o CP1 só confere. Se o código da Etapa 0 foi feito pela rev. 1, a conferência final inclui reaplicar os três itens.
- **P8 — `falhaProxima` nas Etapas 3 e 6:** a falha pontual vale para "o próximo serviço que a suporta". Só `votarPopular` e `votarJuri` a consomem; as Etapas 3 e 6 devem declarar se também a consomem.
- **P9 — Textos finais** de `SUCESSO`, `VOTO_ATUALIZADO`, da caixa de ciência e dos alertas de erro (`Login.md`, seção 10). **[Usuário]** (revisão única de textos com a organização, E30)
- **P10 — Votos de uma "outra sessão" na revisão da E7:** o voto criado por `JA_VOTOU_OUTRA_SESSAO` é um voto comum; a Etapa 7 não precisa tratá-lo à parte.
- **P11 — Despublicar candidato durante o envio:** só testável pelo serviço direto (W13) até a Etapa 6 permitir editar candidatos com a urna aberta (que ela trava).
- **P12 — Participação criada no primeiro voto** (D14): **Resolvida (rev. 3, C2):** a participação nunca nasce junto com o voto; nasce na Etapa 3 (login, registro ou `garantirParticipacao`), e o envio sem participação é recusado com `NAO_AUTORIZADO`.