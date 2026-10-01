# VaiVota — Fase 1 · Etapa 5: Votos

> Status: planejada, pronta para implementação.
> Depende de: Etapa 0 (fundação), Etapa 2 (estados da urna), Etapa 3 (sessão e login), Etapa 4 (lista e detalhe de candidatos).
> Fontes: `Login.md` §5–7, `Jurado.md` §6, `DocumentDesign.md` §5.4, §7.1, §7.2 e §9.2.
> Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4, pnpm.

## 1. Objetivo

Entregar, como mockup navegável, o **fluxo completo de voto** em `/e/[slug]/votar`: seleção, revisão, confirmação, sucesso, "já votou", estados da urna e erros, para **público** e **jurado**.

Nada é salvo em banco. O estado vive em memória (o F5 reinicia tudo). Mesmo assim, as regras de "quem pode votar" e "o que acontece quando falha" ficam atrás de funções que **imitam o servidor**, para que a Fase 2 (BD fake) e a última etapa (Prisma + Supabase) troquem só a implementação, sem mexer nas telas.

## 2. Escopo

**Dentro:**
- Seleção do candidato (a partir da lista e do detalhe da Etapa 4).
- Revisão ("Você está votando em *X*"), confirmação e tela de sucesso.
- Estados: urna não iniciada, encerrada, "já votou", sem candidatos, e-mail não verificado, admin tentando votar.
- Erros: rede, urna encerrada durante a confirmação, duplo clique, voto já registrado em outra sessão, erro interno.
- Voto do **jurado**: mesma tela, sem contagens, aviso de voto identificado, alteração até o fim da urna.

**Fora (outras etapas):**
- Lista e detalhe dos candidatos → Etapa 4.
- Login, registro, switch Jurado e resgate de convite → Etapa 3.
- Gerar convites, ver votos identificados e histórico → Etapas 6 e 7.
- Totem / voto infantil → fora da Fase 1.
- Notas por critério do jurado → futuro.

## 3. Premissas das etapas anteriores

Nada disso existe ainda no zip (só a landing). Se uma etapa anterior sair diferente, o CP1 faz o **ajuste mínimo**, sem refazer a etapa.

| Item | Esperado |
|---|---|
| Store | Context + `useReducer` em `src/mocks/`, montado no `layout` de `/e/[slug]` |
| Sessão mock | usuário atual, papel (`publico` \| `jurado` \| `admin`), `emailVerificado` |
| Evento mock | estado da urna, janela de votação, módulos ligados, rótulos do tema (ex.: "filme") |
| Lista de candidatos | só publicados, ordem embaralhada estável na sessão |
| `CandidatoCard` e detalhe | aceitam props de seleção (ajustar no CP3 se não aceitarem) |
| Componentes de estado da urna | criados na Etapa 2 e reaproveitados aqui |
| Dev toolbar | seletores de urna, papel, módulos e tema |

> Convenção de pastas: abaixo uso `src/features/votar/` para a lógica e os componentes desta etapa. Ajuste ao que a Etapa 0 definir.

## 4. Decisões tomadas

| Tema | Decisão |
|---|---|
| Rota | Tudo em `/e/[slug]/votar` (conforme o mapa de rotas). Os passos usam `?passo=lista\|revisao\|sucesso`, para o botão voltar do celular funcionar |
| Guardas de passo | `revisao` sem seleção volta para `lista`; `sucesso` sem confirmação na sessão cai na gate normal ("já votou") |
| Seleção | Fica no store (`sessaoUi.selecaoId`), então sobrevive à ida e volta entre lista e detalhe |
| Dois blocos no store | `banco` (espelha as tabelas: participações, votos, votos do júri, histórico) e `sessaoUi` (seleção, confirmação). Na Fase 2 só o `banco` vira BD fake |
| Sigilo espelhado | `votos[]` **não tem campo de usuário**; `participacoes[].votou` é só booleano. A tela "já votou" **não mostra em quem** a pessoa votou |
| Servidor simulado | `votarPopular` e `votarJuri` validam tudo (urna, papel, e-mail, unicidade, candidato) e devolvem `ResultadoVoto`. A UI nunca decide sozinha se o voto vale |
| Rejeição não muta | Se o resultado é `ok: false`, o `banco` fica intacto |
| Latência | Cada envio demora 600–900 ms simulados, para o estado "enviando" aparecer |
| Falhas | Forçadas pela dev toolbar, valem **só para o próximo envio** e voltam a "Normal" |
| Mensagens | Genéricas para o usuário; o detalhe vai só para `console` com prefixo `[mock:log]` |
| Jurado | Mesma lista e fluxo, sem contagens, com aviso de voto identificado, e pode alterar enquanto a urna estiver aberta |
| Sem contagens | Nenhuma tela de `/votar` mostra totais ou placar, para nenhum papel |
| Temas | Todos os textos usam os rótulos do tema; testar com Semana Tech e Festival |

## 5. Ordem de avaliação da gate

Quando alguém abre `/e/[slug]/votar`, a primeira regra que bater define a tela (Login.md §5 passo 4, mais papéis):

| # | Condição | Tela |
|---|---|---|
| 1 | Sem sessão | Redireciona para `/e/[slug]` (login) |
| 2 | Papel `admin` | "Administradores não votam", com link para o painel |
| 3 | E-mail não verificado | "Verifique seu e-mail" (reaproveita a tela da Etapa 3) |
| 4 | Urna **não iniciada** | Informativa, com contagem regressiva se houver janela |
| 5 | Urna **encerrada** | Informativa, **sem** botão de voto |
| 6 | Público que **já votou** | "Você já votou", sem dizer em quem |
| 7 | Sem candidatos publicados | Informativa |
| 8 | Urna aberta | Lista. Jurado com voto vê o candidato marcado como "Seu voto atual" |

A gate **reage ao store em tempo real**: se a urna mudar na toolbar com a pessoa na revisão, a tela troca na hora.

## 6. Contratos (pseudotipos)

```ts
type MotivoRejeicao =
  | "urna_nao_aberta" | "urna_encerrada"
  | "ja_votou"
  | "papel_invalido" | "email_nao_verificado"
  | "candidato_indisponivel"
  | "rede" | "erro_interno";

type ResultadoVoto =
  | { ok: true; atualizado: boolean }   // atualizado = jurado trocou o voto
  | { ok: false; motivo: MotivoRejeicao };

// Funções que a UI usa (ficam em src/mocks/, mesmas assinaturas na Fase 2)
votarPopular(candidatoId): Promise<ResultadoVoto>
votarJuri(candidatoId):    Promise<ResultadoVoto>
consultarEstadoVoto():     Promise<{ votou: boolean; candidatoAtualId?: string }>  // candidatoAtualId só para jurado

// Função pura, sem efeitos, testável
resolverEstadoVotar(sessao, evento, candidatos, participacao): EstadoVotar
```

### Resultado do envio → o que a UI faz

| Resultado | Tela / ação |
|---|---|
| `ok` | Sucesso |
| `urna_nao_aberta`, `urna_encerrada` | Gate informativa, "seu voto não foi contado" |
| `ja_votou` | Tela "Você já votou" |
| `papel_invalido`, `email_nao_verificado` | Gate correspondente |
| `candidato_indisponivel` | Volta à lista, limpa a seleção e avisa |
| `rede` | "Verificando seu voto…", chama `consultarEstadoVoto()`. Se gravou, vai para sucesso. Se não, oferece "Tentar novamente" |
| `erro_interno` | Mensagem genérica com "Tentar novamente" |

### Modos de falha da toolbar

| Modo | Efeito no próximo envio |
|---|---|
| Normal | Funciona |
| Rede: não gravou | Devolve `rede`, nada gravado |
| Rede: gravou, resposta perdida | Grava e devolve `rede` (a consulta deve descobrir que gravou) |
| Urna encerra no envio | Muda a urna para encerrada e devolve `urna_encerrada` |
| Já votou em outra sessão | Devolve `ja_votou` |
| Erro interno | Devolve `erro_interno` |

## 7. Regras de entrega (valem para todos os checkpoints)

- Cada checkpoint termina com `pnpm lint` e `pnpm build` **sem erros**.
- Entrega em **zip cumulativo** (`VaiVota-E5-CP1.zip`, `CP2`, …), sem `node_modules` nem `.next`.
- Só avança para o próximo checkpoint depois da validação do atual.
- Cada checkpoint lista o que foi feito, o que ficou fake e como validar.

## 8. Checkpoints

### CP1 — Contratos, seed e simulação (sem tela nova)

**Objetivo:** deixar pronta toda a lógica e as ferramentas de teste, para as telas dos próximos checkpoints só consumirem.

**Tarefas:**
- Tipos do §6 e `EstadoVotar` (união discriminada, uma variante por linha da gate).
- Seed: pelo menos 6 candidatos publicados e 1 **não publicado**; usuários de teste: público sem voto, público que já votou, público com e-mail não verificado, jurado sem voto, jurado com voto, admin.
- Store: blocos `banco` e `sessaoUi`; actions `selecionarCandidato`, `limparSelecao`, `votarPopular`, `votarJuri`, `consultarEstadoVoto`, `resetarMeuVoto` (só dev).
- `resolverEstadoVotar` como função pura.
- Dev toolbar: modo de falha (§6), "Resetar meu voto (simulação)", participação "sem voto / já votou", e-mail verificado sim/não, e um **contador de depuração** (votos no `banco` mock). O contador some com a toolbar e não é tela do produto.
- Ajuste mínimo nas premissas do §3, se necessário.

**Validação:**
- `pnpm lint` e `pnpm build` limpos.
- Revisão de código: nenhum `ResultadoVoto` com `ok: false` altera o `banco`; o tipo `Voto` não tem campo de usuário.

**Entrega:** `VaiVota-E5-CP1.zip`

### CP2 — Gate e telas de estado

**Objetivo:** `/e/[slug]/votar` responde corretamente a cada combinação de papel, urna e participação.

**Tarefas:**
- Página `/e/[slug]/votar` com um componente cliente `VotarFlow` que usa `resolverEstadoVotar`.
- Telas: não iniciada (com contagem regressiva fake), encerrada, já votou, sem candidatos, e-mail não verificado, admin, redirecionamento sem sessão.
- Reação em tempo real à toolbar (mudar urna ou papel troca a tela sem recarregar).
- Reaproveitar os componentes de estado da urna da Etapa 2 em vez de duplicar.
- `useSearchParams` dentro de `<Suspense>`, para o build não reclamar.

**Validação:**
- Percorrer a tabela do §5 pela toolbar, linha a linha.
- Urna encerrada: nenhum botão de voto aparece.
- Lint e build limpos.

**Entrega:** `VaiVota-E5-CP2.zip`

### CP3 — Seleção

**Objetivo:** escolher um candidato a partir da lista ou do detalhe.

**Tarefas:**
- `CandidatoCard` com estado selecionado (semântica de `radio`, operável por teclado, tocar de novo desmarca).
- `BarraSelecao` fixa no rodapé: "Selecionado: *X*" e botão "Revisar voto", respeitando a safe area do celular.
- No detalhe, botão "Votar neste {rótulo}" que seleciona e vai direto a `?passo=revisao`.
- Seleção preservada ao ir e voltar entre lista e detalhe.
- Nenhuma contagem visível.

**Validação:**
- A ordem dos cards é a mesma depois de abrir e fechar um detalhe.
- O candidato não publicado não aparece.
- Fluxo lista → selecionar → revisar funciona só com teclado.

**Entrega:** `VaiVota-E5-CP3.zip`

### CP4 — Revisão e confirmação (público)

**Objetivo:** do "Revisar voto" até o envio, com proteção contra repetição.

**Tarefas:**
- Tela de revisão: "Você está votando em *X*" com cartaz, texto de sigilo e de voto definitivo ("não poderá ser alterado"), botões **Confirmar voto** e **Trocar** (volta à lista mantendo a seleção).
- Estado "enviando": botão desabilitado, indicador com texto, `aria-busy`.
- Proteção contra duplo clique (trava por `ref` e por status, além do botão desabilitado).
- Guarda de passo (revisão sem seleção volta à lista).
- Urna encerrada durante a revisão: aviso imediato, confirmar desabilitado e acesso à tela informativa.
- Envio chamando `votarPopular` e tratando só o caso `ok` (os erros entram no CP5).

**Validação:**
- Duplo clique rápido gera **1** voto no contador de depuração.
- Encerrar a urna pela toolbar com a revisão aberta bloqueia a confirmação.
- Lint e build limpos.

**Entrega:** `VaiVota-E5-CP4.zip`

### CP5 — Sucesso e erros

**Objetivo:** fechar o ciclo do voto popular, inclusive no caminho infeliz.

**Tarefas:**
- Tela de sucesso: ícone **e** texto, nome do candidato escolhido (vindo de `sessaoUi`), aviso de que o resultado só aparece quando a organização liberar, link para o início do evento. Animação em CSS discreta, desligada com `prefers-reduced-motion`.
- Voltar ou recarregar `/votar` depois do sucesso cai em "Você já votou", sem nome.
- Tratamento de todos os motivos da tabela do §6, incluindo a tela "Verificando seu voto…".
- Log `[mock:log]` no console para cada rejeição, sem expor detalhe na interface.

**Validação:** rodar os 6 modos da toolbar e conferir o contador de depuração depois de cada um:
- Rede não gravou: 0 voto, permite tentar de novo.
- Rede gravou: 1 voto, vai para sucesso **sem** permitir novo envio.
- Urna encerra no envio: 0 voto, tela de urna encerrada.
- Já votou em outra sessão: tela "Você já votou".
- Erro interno: 0 voto, mensagem genérica.
- Normal: 1 voto.

**Entrega:** `VaiVota-E5-CP5.zip`

### CP6 — Jurado

**Objetivo:** variação do fluxo para o jurado (Jurado.md §6).

**Tarefas:**
- Aviso na revisão: "Seu voto é identificado para a organização e pode ser alterado até o encerramento da votação".
- Lista marca o voto atual ("Seu voto atual"); botão vira **Alterar voto** quando já existe voto.
- Escolher o mesmo candidato do voto atual mostra "Esse já é o seu voto", sem enviar.
- `votarJuri` substitui o voto e grava `historicoVotoJuri` (anterior → novo), ambos só no `banco` mock.
- Sucesso do jurado: "Voto registrado" ou "Voto atualizado", com "Você pode alterar até o encerramento" e botão "Alterar meu voto". Com a urna encerrada, o jurado vê só a tela de encerrada.
- Conferir que **nenhuma contagem** aparece em nenhum ponto do fluxo do jurado.

**Validação:**
- Votar em A, alterar para B: `votosJuri` com 1 registro e `historico` com 1 entrada (A → B).
- O público não vê "Alterar voto" nem o aviso de identificação.
- Jurado, urna encerrada: sem botão de voto.

**Entrega:** `VaiVota-E5-CP6.zip`

### CP7 — Fechamento da Etapa

**Objetivo:** acabamento, revisão geral e checklist.

**Tarefas:**
- Responsividade em 360 px, 768 px e desktop; barra inferior com safe area.
- Acessibilidade: foco no título a cada troca de passo, `aria-live` nas mensagens de sucesso e erro, foco visível, áreas de toque amplas, informação nunca só por cor.
- Conferir contraste e textos nos dois temas (Semana Tech e Festival), trocando na toolbar.
- Revisar os textos em pt-BR e o uso dos rótulos do tema.
- Percorrer a matriz completa do §5 e do §6 e os critérios do §10.
- Atualizar o README ou o planner com o que mudou em relação a este documento.

**Validação:** `pnpm lint` e `pnpm build` limpos, checklist do §10 marcado.

**Entrega:** `VaiVota-E5-CP7.zip` (final da Etapa 5)

## 9. O que fica fake

- Nenhum voto é persistido: tudo some no F5.
- Latência e falhas são simuladas pela toolbar.
- Usuários, sessão e verificação de e-mail vêm do seed e da toolbar.
- O "resetar meu voto" e o contador de depuração existem só para teste e não fazem parte do produto.
- O recibo do voto (hash) pode existir no `banco` mock, mas não é exibido.
- Sem rate limiting, sem auditoria real e sem autenticação real.

## 10. Critérios de aceitação

- [ ] Público seleciona, revisa, confirma e vê o sucesso em poucos passos, no celular e no desktop.
- [ ] "Trocar" na revisão volta à lista mantendo a seleção; depois de confirmar, não há como editar nem desfazer.
- [ ] Segundo voto do mesmo usuário é impedido, inclusive com duplo clique e com "já votou em outra sessão".
- [ ] Com a urna não iniciada ou encerrada não aparece botão de voto, e a gate vale também para acesso direto por link.
- [ ] Encerrar a urna com a pessoa na tela de revisão bloqueia a confirmação na hora.
- [ ] Rede que cai na confirmação consulta o estado real antes de permitir nova tentativa.
- [ ] A tela "já votou" não revela em quem a pessoa votou, e `votos[]` não tem vínculo com usuário.
- [ ] Candidatos não publicados não aparecem; sem candidatos publicados há tela informativa.
- [ ] Jurado vota, vê a confirmação e consegue alterar enquanto a urna estiver aberta; o histórico é registrado no `banco` mock.
- [ ] Nenhuma tela de `/votar` exibe contagens, para público ou jurado.
- [ ] Jurado é avisado de que o voto é identificado para a organização.
- [ ] O tema do evento aparece na gate, na lista, na revisão e no sucesso; os textos usam os rótulos do tema.
- [ ] Foco visível, navegação por teclado, `prefers-reduced-motion` respeitado e informação nunca só por cor.
- [ ] `pnpm lint` e `pnpm build` limpos em todos os checkpoints.

## 11. Pendências

- **Comprovante do voto:** mostrar o hash de recibo no sucesso? Assumido que **não**, porque um comprovante que identifica a escolha pode servir de prova para compra de voto. Decidir antes da última etapa.
- **Jurado após o encerramento:** pode ver o próprio voto? Assumido que **não** (pendência do `Jurado.md`).
- **Aviso de voto identificado:** banner informativo (assumido) ou checkbox de ciência obrigatória?
- **Ação "Votar neste" no detalhe:** assumido que vai **direto à revisão**. Se preferirem voltar à lista com a seleção marcada, é só ajustar no CP3.
- **Candidato votar em si mesmo:** sem efeito na Fase 1 (o mock não liga candidato a participante); fica para a regra do evento.
