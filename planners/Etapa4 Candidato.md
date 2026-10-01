# VaiVota — Fase 1 · Etapa 4: Candidato

> Status: planejada, aguardando início.
> Fase: 1 (interface mockup, sem banco).
> Depende de: Etapa 0 (fundação), Etapa 2 (Evento) e Etapa 3 (Login e Registro).
> Alimenta: Etapa 5 (Votos), que continua exatamente de onde esta termina.
> Stack no zip: Next.js 16.3.5 (App Router), React 19.2.8 com React Compiler, Tailwind 4, TypeScript.

## 1. Objetivo

Entregar a **parte 1 de `/e/[slug]/votar`**: o que a pessoa vê depois de entrar no evento e antes de confirmar o voto. Isso inclui a guarda de estado da rota, a lista de candidatos (cards), o detalhe de cada candidato e a seleção visual. Tudo com o tema do evento, sem salvar nada.

**Fora desta etapa:**
- Revisão, confirmação, sucesso, "já votou" completo e erros de envio → Etapa 5.
- CRUD de candidatos (cadastro, publicar, imagem, campos extras) → Etapa 6.
- Contagens e resultado → Etapas 7 e 8.

## 2. Decisões assumidas (altere antes de começar, se discordar)

| # | Decisão | Motivo |
|---|---|---|
| D1 | O detalhe abre como **dialog** sobre a lista, controlado por `?candidato=<id>` | O botão voltar fecha o detalhe, o link é compartilhável no mockup e a lista não perde o scroll. Não cria rota nova além das do README |
| D2 | A **seleção** (destacar um card e mostrar a barra "Revisar voto") nasce aqui; a revisão em si é da Etapa 5 | A seleção faz parte do card. A barra termina num placeholder que a Etapa 5 substitui |
| D3 | Candidato **não publicado** e **desqualificado** não aparecem na lista | DD 7.1: só publicados. Desqualificado sai do ranking e não deve ser votável |
| D4 | Ordem embaralhada por **semente determinística** `(usuarioId + eventoId)`, nunca `Math.random()` | Estável na sessão e até no F5, varia entre usuários e evita erro de hidratação. O React Compiler também não gosta de render impuro |
| D5 | **Nenhuma contagem de votos** em nenhum papel (público, jurado) | DD 7.2: painel do jurado sem contagens. O público também só vê resultado quando a organização libera |
| D6 | Candidato **vinculado ao usuário logado** mostra selo "Você faz parte deste projeto" e não pode ser selecionado | Padrão recomendado pelo DD (bloquear). A pendência continua aberta no DD; aqui é só uma proposta de mockup |

## 3. Pré-requisitos (contrato esperado das Etapas 0 a 3)

As Etapas 0 a 3 ainda não existem no zip, então os nomes abaixo são o **contrato que esta etapa assume**. Se a Etapa 0 usar outros nomes, ajustamos aqui, sem mudar a lógica.

- Tokens de tema como CSS variables, já trocáveis entre Semana Tech e Festival.
- Store em `src/mocks/` (Context + `useReducer`) montado no `layout` de `/e/[slug]`, com: evento (urna, módulos, tema, rótulos), candidatos, usuário mock logado, papel e `votou`.
- Dev toolbar com seletores de urna, papel, módulos e tema.
- Componentes base: botão, cartão, dialog, selo, skeleton.
- Telas de estado da urna da Etapa 2 (não iniciada, encerrada), reaproveitáveis nesta rota.
- Login mockado da Etapa 3, com usuário mock que a toolbar consegue trocar.
- Seed com candidatos dos dois eventos (ver CP1 para o que ele precisa conter).

## 4. Checkpoints

São **6 checkpoints**, cada um validável sozinho. Ao final de cada um: `tsc --noEmit`, `npm run lint` e `npm run build` limpos antes de seguir.

---

### CP1 — Dados, seletores e ordem embaralhada

**Objetivo:** ter a fonte de dados da lista pronta e testada, antes de qualquer tela.

**Tarefas**
- [ ] Revisar o tipo `Candidato` do mock contra o `schema.prisma`: `id`, `eventoId`, `titulo`, `descricao`, `imagemUrl`, `publicado`, `desqualificado`, `ordem`, `camposExtras` (`Record<chave, valor>`), `usuarioVinculadoId`.
- [ ] Revisar `CampoCandidato` (`chave`, `rotulo`, `ordem`) para o detalhe renderizar rótulos do evento, não fixos.
- [ ] Completar o **seed** para cobrir os casos de teste, em cada evento:
  - Festival: ao menos 6 curtas publicados, com campos extras **Direção** e **Duração**.
  - Semana Tech: ao menos 6 projetos publicados, com campos extras **Equipe** e **Tecnologias**.
  - 1 candidato **não publicado** e 1 **desqualificado** por evento.
  - 1 candidato com **título longo** (acima de 100 caracteres) e 1 com **descrição curta** de uma linha.
  - 1 candidato **vinculado ao usuário mock** (para D6).
- [ ] Imagens: placeholders **locais** em `public/mock/` (SVG ou WebP gerados), com cor/forma por candidato. Sem URLs externas.
- [ ] Criar `src/lib/embaralhar.ts`: `hashDeTexto(string): number`, `criarGeradorComSemente(seed): () => number` (mulberry32 ou equivalente) e `embaralharComSemente(lista, semente)` (Fisher-Yates, **sem mutar** a lista original).
- [ ] Criar o seletor `listarCandidatosParaVotacao(estado, { eventoId, usuarioId })`: filtra publicados e não desqualificados, ordena por `ordem` (base estável) e então embaralha com a semente `usuarioId + eventoId`.
- [ ] Criar o seletor `obterCandidato(estado, candidatoId)` para o detalhe, que devolve `null` se o id não existir, não pertencer ao evento ou não estiver votável.
- [ ] Adicionar à toolbar o controle **Cenário de candidatos**: `Padrão` · `Sem candidatos` · `Muitos (24)`. Ele é só um modificador do seed em memória, para testar estados de borda sem esperar o CRUD da Etapa 6.

**Arquivos:** `src/lib/embaralhar.ts` (novo), `src/mocks/seletores/candidatos.ts` (novo), seed e tipos em `src/mocks/` (alterados), `public/mock/*` (novos), dev toolbar (alterada).

**Fica fake:** imagens e textos dos candidatos, o usuário e a semente.

**Pronto quando**
- Dois usuários mock diferentes recebem ordens diferentes; o mesmo usuário recebe sempre a mesma ordem, inclusive após F5.
- Despublicado e desqualificado não aparecem em nenhum cenário.
- O seletor não altera a lista original (conferir com teste simples ou `console.assert` temporário).

---

### CP2 — Guarda da rota `/e/[slug]/votar`

**Objetivo:** a rota decide **o que mostrar** antes de renderizar a lista, inclusive por link direto (DD 7.1: "link direto com urna fechada").

**Tarefas**
- [ ] Criar `src/app/e/[slug]/votar/page.tsx` (server component, `await params`, mesmo estilo de tipagem que o `layout` usa com `LayoutProps`).
- [ ] Criar `GuardaVotacao` (client) que lê a store e decide, **nesta ordem**:
  1. Slug inexistente → `notFound()`.
  2. Sem usuário logado → redireciona para `/e/[slug]` (entrada/login da Etapa 3).
  3. E-mail não verificado → tela de "verifique seu e-mail" da Etapa 3 (ou redireciona para ela).
  4. Urna **não iniciada** → tela de estado (reaproveitada da Etapa 2), sem lista.
  5. Urna **encerrada** → tela de estado, sem botão de voto.
  6. Papel público com `votou = true` → tela "Você já votou" (versão simples aqui; a versão final fica na Etapa 5). Jurado que já votou **segue para a lista**, pois pode alterar o voto.
  7. Nenhum candidato votável → tela informativa "Os candidatos ainda não foram publicados".
  8. Caso contrário → renderiza a lista (CP3).
- [ ] Textos das telas de estado vindos do **tema do evento** (rótulos configuráveis, DD "Tema"), com fallback padrão. Textos finais seguem como pendência do `Login.md` §10.
- [ ] Extrair a decisão para uma função pura `resolverEstadoVotar(estado)` que devolve um tipo união (`'lista' | 'nao_iniciada' | 'encerrada' | 'ja_votou' | 'sem_candidatos' | ...`), testável sem React.
- [ ] `useSearchParams` (usado no CP4) exige `<Suspense>` ao redor; deixar o limite preparado aqui.

**Arquivos:** `src/app/e/[slug]/votar/page.tsx` (novo), `src/components/votar/GuardaVotacao.tsx` (novo), `src/mocks/seletores/estadoVotar.ts` (novo).

**Fica fake:** o "servidor" validando; aqui a guarda é só cliente. Na fase real, a mesma ordem de checagem vai para o servidor (README: validações sempre no servidor).

**Pronto quando**
- Pela toolbar, cada combinação de urna × papel × `votou` × cenário cai na tela certa (tabela do §5).
- Abrir `/e/[slug]/votar` direto, com urna fechada, nunca mostra a lista.
- Trocar o tema na toolbar muda cor e textos das telas de estado.

---

### CP3 — Lista e cartão do candidato

**Objetivo:** a lista funcional e bonita, com seleção visual.

**Tarefas**
- [ ] Cabeçalho da página: nome do evento (do tema), instrução curta ("Escolha um candidato") e total de candidatos (**contagem de candidatos, não de votos**).
- [ ] `ListaCandidatos`: grid responsivo (1 coluna no celular, 2 no tablet, 3 no desktop), usando `listarCandidatosParaVotacao`.
- [ ] `CartaoCandidato`: imagem (proporção fixa para evitar salto de layout), título (máx. 2 linhas, `line-clamp`), trecho da descrição (máx. 3 linhas), até 2 campos extras resumidos, botão **"Ver detalhes"** e botão **"Escolher"**.
- [ ] `ImagemCandidato` com **fallback** (bloco de cor + inicial do título) quando a imagem falha ou não existe. A imagem é obrigatória no DD, mas o componente não pode quebrar.
- [ ] Seleção: clicar em "Escolher" marca o card (borda na cor primária do tema, ícone de check, `aria-pressed`). Clicar de novo desmarca. **Só um** selecionado por vez, guardado na store como `selecionadoId`.
- [ ] `BarraSelecao` fixa no rodapé quando há selecionado: "Você escolheu *X*" + botão **"Revisar voto"**. Nesta etapa o botão leva a um placeholder claramente marcado ("Revisão: Etapa 5"). A Etapa 5 troca esse destino.
- [ ] Selo "Você faz parte deste projeto" e botão "Escolher" desabilitado com explicação no card vinculado ao usuário (D6).
- [ ] Skeleton de carregamento (200 a 400 ms simulados) para ver o estado de loading no mockup. Opcional, mas barato.

**Arquivos:** `src/components/votar/ListaCandidatos.tsx`, `CartaoCandidato.tsx`, `ImagemCandidato.tsx`, `BarraSelecao.tsx` (novos); `selecionadoId` na store (alterada).

**Fica fake:** a seleção não persiste (F5 limpa), conforme o comportamento já decidido para a store.

**Pronto quando**
- 6 e 24 candidatos renderizam sem quebrar o layout em 360 px, 768 px e 1280 px.
- Título longo e descrição de uma linha deixam os cards com aparência consistente.
- Selecionar, trocar e desmarcar funciona por mouse, toque e teclado (Enter e Espaço).
- Nenhum número de votos aparece em lugar nenhum.

---

### CP4 — Detalhe do candidato

**Objetivo:** ver o candidato completo sem sair da lista (D1).

**Tarefas**
- [ ] `DetalheCandidato` com `<dialog>` nativo (foco preso, Esc fecha, `aria-labelledby` no título). No celular vira **bottom sheet** em tela quase cheia; no desktop, modal centralizado.
- [ ] Estado na URL: `?candidato=<id>`. Abrir adiciona ao histórico; fechar remove o parâmetro. O botão voltar do navegador fecha o detalhe.
- [ ] Conteúdo: imagem grande, título, descrição completa e **todos os campos extras** com os rótulos do evento (`CampoCandidato.rotulo`, na ordem de `ordem`). Campo sem valor não aparece.
- [ ] Ações no rodapé do dialog: **"Escolher este candidato"** (mesma seleção do CP3, com o mesmo bloqueio de D6) e **"Fechar"**.
- [ ] Navegação **anterior / próximo** respeitando a **ordem embaralhada do usuário**, com limites nas pontas (desabilitar ou circular; decidir na implementação e registrar aqui).
- [ ] `?candidato=` com id inválido, de outro evento ou de candidato não votável: ignora o parâmetro e mostra a lista, sem erro na tela.
- [ ] Ao fechar, devolver o foco ao botão que abriu e **manter a posição do scroll** da lista.
- [ ] Conferir que `useSearchParams` está dentro do `<Suspense>` preparado no CP2.

**Arquivos:** `src/components/votar/DetalheCandidato.tsx`, `CamposExtras.tsx` (novos); `ListaCandidatos.tsx` e `CartaoCandidato.tsx` (alterados para abrir o detalhe).

**Fica fake:** nenhum dado novo. Se houver trailer ou vídeo, fica para depois: o DD só prevê imagem como mídia do candidato nesta fase.

**Pronto quando**
- Esc, botão voltar do navegador e botão "Fechar" fecham o detalhe e preservam a lista.
- Os rótulos mudam corretamente ao trocar de evento (Direção/Duração × Equipe/Tecnologias).
- Anterior e próximo seguem a ordem do usuário, não a ordem do cadastro.
- Link com `?candidato=` inválido não quebra nada.

---

### CP5 — Papéis, estados de borda e cenários

**Objetivo:** cobrir o que diferencia jurado de público e o que acontece nos extremos.

**Tarefas**
- [ ] **Jurado:** mesma lista e mesma ordem, **sem contagens**. Se o jurado já tem voto, o card do voto atual aparece marcado como "Seu voto atual" e a barra mostra "Alterar voto" (o fluxo de alteração é da Etapa 5). Aviso discreto e fixo no topo: "Seu voto é identificado para a organização" (DD 7.2 pede informar o jurado; o aviso principal está no registro da Etapa 3).
- [ ] **Público que já votou:** nunca chega à lista (CP2). Conferir que não há caminho por `?candidato=`.
- [ ] **Um único candidato votável:** lista e detalhe funcionam sem anterior/próximo.
- [ ] **24 candidatos:** sem lentidão perceptível; considerar `content-visibility: auto` nos cards só se houver problema.
- [ ] **Cenário "Sem candidatos"** da toolbar leva à tela informativa do CP2.
- [ ] **Troca de estado com a tela aberta:** se a toolbar muda a urna para encerrada com a lista aberta, a tela passa para o estado "encerrada" sem recarregar (simula "urna fecha durante a navegação"; o caso da confirmação é da Etapa 5).
- [ ] **Troca de tema com a tela aberta:** tudo (cards, selo, barra, dialog) reage às variáveis, sem cor fixa.
- [ ] Verificar que **nenhuma cor hexadecimal fixa** foi usada nos componentes novos (o problema da landing atual, com `#F15A29` e `#8DC63F` no código).

**Arquivos:** ajustes em `GuardaVotacao`, `CartaoCandidato`, `BarraSelecao`; sem arquivos novos obrigatórios.

**Pronto quando:** todas as linhas da matriz do §5 passam, nos dois temas.

---

### CP6 — Fechamento da etapa

**Objetivo:** qualidade e entrega.

**Tarefas**
- [ ] **Responsividade:** 360, 390, 768 e 1280 px, em retrato e paisagem no celular. Sem rolagem horizontal; a `BarraSelecao` não cobre o último card (padding inferior).
- [ ] **Acessibilidade básica:**
  - foco visível em todos os controles, nos dois temas;
  - ordem de tab lógica (card → ver detalhes → escolher);
  - `alt` útil nas imagens (título do candidato);
  - dialog com foco preso e retorno de foco;
  - contraste mínimo do texto e dos botões nos dois temas;
  - `prefers-reduced-motion` respeitado na animação do dialog e do skeleton;
  - cards como `<article>` com título em heading coerente.
- [ ] **Idioma e textos:** todos os textos em pt-BR; textos de estado vindos do tema.
- [ ] **Revisão de segredos do mock:** nenhum componente exibe contagens, horários de voto ou qualquer dado que o DD marque como sigiloso.
- [ ] **Validação:** `tsc --noEmit`, `npm run lint`, `npm run build`, com a saída registrada neste planner.
- [ ] **Teste manual** da matriz do §5 e da checklist do §6.
- [ ] **Entrega:** ZIP cumulativo com os arquivos criados e alterados (lista abaixo no §7) e este planner atualizado com o status de cada checkpoint.

**Pronto quando:** checklist do §6 inteira marcada e os três comandos de validação sem erro.

---

## 5. Matriz de estados de `/e/[slug]/votar`

| Urna | Papel | `votou` | Candidatos votáveis | Resultado esperado |
|---|---|---|---|---|
| qualquer | sem login | — | — | Redireciona para `/e/[slug]` |
| qualquer | logado, e-mail não verificado | — | — | Tela de verificação (Etapa 3) |
| Não iniciada | público ou jurado | — | — | Tela "não iniciada", sem lista |
| Encerrada | público ou jurado | — | — | Tela "encerrada", sem botão de voto |
| Aberta | público | sim | — | "Você já votou" (versão simples) |
| Aberta | público | não | 0 | "Candidatos ainda não publicados" |
| Aberta | público | não | 1 ou mais | **Lista**, sem contagens |
| Aberta | jurado | não | 1 ou mais | **Lista**, sem contagens, aviso de voto identificado |
| Aberta | jurado | sim | 1 ou mais | **Lista**, com "Seu voto atual" marcado |
| Aberta | jurado | qualquer | 0 | "Candidatos ainda não publicados" |
| Aberta | admin | — | — | Fora do escopo desta rota (ver Etapa 6/7); definir na Etapa 0 se admin é redirecionado ou pode pré-visualizar |

## 6. Checklist de aceite da etapa

Derivada dos critérios de aceitação de `Login.md` §9 e `Jurado.md` §11 que cabem em um mockup.

- [ ] Usuário vê os candidatos publicados e consegue escolher um em poucos passos.
- [ ] Com urna não iniciada ou encerrada, não há lista, nem por link direto.
- [ ] A ordem dos cards varia entre usuários e é estável para o mesmo usuário.
- [ ] Tema do evento aparece na lista, no detalhe e nas telas de estado.
- [ ] Candidato não publicado ou desqualificado nunca aparece.
- [ ] Campos extras aparecem com os rótulos do evento.
- [ ] O painel do jurado e o do público **não exibem contagens**.
- [ ] Interface utilizável em celular, com foco visível e navegação por teclado.
- [ ] Nenhuma cor fixa fora das variáveis de tema.
- [ ] Nada é salvo; F5 volta ao estado inicial do seed.

## 7. Arquivos previstos

| Ação | Arquivo |
|---|---|
| Novo | `src/lib/embaralhar.ts` |
| Novo | `src/mocks/seletores/candidatos.ts` |
| Novo | `src/mocks/seletores/estadoVotar.ts` |
| Novo | `src/app/e/[slug]/votar/page.tsx` |
| Novo | `src/components/votar/GuardaVotacao.tsx` |
| Novo | `src/components/votar/ListaCandidatos.tsx` |
| Novo | `src/components/votar/CartaoCandidato.tsx` |
| Novo | `src/components/votar/ImagemCandidato.tsx` |
| Novo | `src/components/votar/BarraSelecao.tsx` |
| Novo | `src/components/votar/DetalheCandidato.tsx` |
| Novo | `src/components/votar/CamposExtras.tsx` |
| Novo | `public/mock/*` (placeholders de imagem) |
| Alterado | Seed e tipos em `src/mocks/` |
| Alterado | Store (`selecionadoId`) e dev toolbar (cenário de candidatos) |

## 8. Entrega para a Etapa 5 (contrato de saída)

A Etapa 5 recebe desta etapa, sem refatorar:

- `selecionadoId` na store e a ação para alterá-lo.
- `BarraSelecao` com o botão "Revisar voto" apontando para um destino trocável.
- `resolverEstadoVotar` já com os ramos `ja_votou` (versão simples) e jurado com voto atual.
- A lista e o detalhe prontos para receber o modo "alterando voto" do jurado.

## 9. Riscos e pendências

| Item | Tratamento |
|---|---|
| Nomes da Etapa 0 diferentes do contrato do §3 | Ajustar no CP1; a lógica não muda |
| Candidato votar em si mesmo (pendência do DD) | Mockup bloqueia (D6). Decisão final do negócio fica no DD |
| Textos finais das telas de estado | Placeholders vindos do tema; texto final pendente (`Login.md` §10) |
| Admin acessando `/votar` | Definir comportamento (redirecionar ou pré-visualizar) na Etapa 0 ou 6 |
| Imagens reais dos candidatos | Só placeholders locais na Fase 1; imagem real entra com o CRUD (Etapa 6) e depois com storage |
| Banco real (MySQL × PostgreSQL/Supabase) | Não afeta esta etapa; a ordem por semente e os seletores migram para queries na Fase 2 |
