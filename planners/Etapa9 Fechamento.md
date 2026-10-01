# VaiVota — Fase 1 · Etapa 9: Fechamento do Protótipo (mockup)

> Status: proposta de planner, pronta para revisão.
> Depende de: Etapas 0 a 8 concluídas (todas as telas existem e o store reage entre elas).
> Alimenta: Fase 2 (BD fake local). O resultado desta etapa é a **linha de base aprovada** para começar a Fase 2.
> Fontes: `DocumentDesign.md` seções 5.4 (mapa de rotas), 12 (acessibilidade e responsividade) e 14 (critérios transversais).
> Stack: Next.js (App Router) + React/TS + Tailwind 4. **Continua sem banco e sem persistência.**

## 1. Objetivo

Transformar o conjunto de telas das Etapas 1 a 8 em um **protótipo coeso, demonstrável e pronto para a Fase 2**. Esta etapa não cria telas novas. Ela revisa, costura e fecha:

- navegação entre as telas e todos os caminhos do fluxo;
- responsividade (mobile-first, tablet e telão 16:9);
- acessibilidade básica;
- consistência de tema, textos e estados;
- um roteiro de demonstração para a Semana Tech;
- a **fronteira de dados** que a Fase 2 vai substituir.

## 2. Escopo

**Dentro:**
- Auditoria de rotas, links, redirecionamentos e estados vazios/erro.
- Revisão de responsividade em larguras-alvo e no telão.
- Acessibilidade básica (teclado, foco, rótulos, contraste, movimento reduzido).
- Consistência de tema white-label nas duas identidades (Semana Tech e Festival).
- Limpeza de dados fixos fora de `src/mocks/` e preparação da camada de acesso a dados.
- Roteiro de demonstração, cenários de seed e checklist final de aceite.
- Rota de 404 e página de erro padrão.

**Fora:**
- Telas novas ou funcionalidades novas (qualquer ideia vira item de backlog).
- Persistência, autenticação real, rate limiting real.
- Otimização de desempenho e teste de carga (dependem do backend real).
- `/totem` e `/totem/parear`: o DD empurra o Totem para depois da Semana Tech, então ficam fora da Fase 1.

## 3. O que fica fake

Tudo continua fake. A diferença desta etapa é que o fake passa a ser **explícito e rastreável**:

| Item | Tratamento |
|---|---|
| Dados seed | Concentrados em `src/mocks/`; nenhum dado de domínio fixo dentro de componentes |
| Ações (votar, gerar convite, abrir urna) | Só passam por funções da camada de dados (`votar()`, `listarCandidatos()` etc.) |
| E-mail, verificação, login social | Telas simuladas, sem envio real |
| Dev toolbar | Existe só em desenvolvimento/demonstração; some com uma flag e não aparece no build de produção |
| F5 | Reseta o estado, e isso deve estar dito no roteiro de demo |

## 4. Mapa de rotas a cobrir

Fonte: DD 5.4, limitado ao escopo da Fase 1.

| Rota | Quem | Etapa de origem |
|---|---|---|
| `/` | Todos | 1 |
| `/e/[slug]` | Todos | 2 e 3 |
| `/e/[slug]/convite` | Logado | 3 |
| `/e/[slug]/votar` | Público, jurado | 4 e 5 |
| `/e/[slug]/admin` | Admin | 7 |
| `/e/[slug]/admin/configuracao` | Admin | 6 |
| `/e/[slug]/admin/apresentar` | Admin | 8 |
| `not-found` / `error` | Todos | 9 |

## 5. Estrutura de arquivos nova ou alterada

```
src/app/
  layout.tsx                    # lang="pt-BR", metadata, viewport
  not-found.tsx                 # 404 temático
  error.tsx                     # erro padrão com ação "voltar"
  e/[slug]/not-found.tsx        # evento inexistente
src/components/
  nav/RotaGuard.tsx             # guarda de papel/estado reutilizável (se ainda não existir)
  a11y/SkipLink.tsx             # "Pular para o conteúdo"
  a11y/LiveRegion.tsx           # anúncios de toast/erro para leitores de tela
src/mocks/
  cenarios.ts                   # cenários nomeados da dev toolbar
  repo.ts                       # única porta de acesso a dados (fronteira da Fase 2)
docs/
  ROTEIRO-DEMO.md               # roteiro de demonstração
  MATRIZ-ROTAS.md               # rotas × papel × estado (gerada neste checkpoint)
  CHECKLIST-FASE1.md            # checklist final assinado
  FRONTEIRA-DADOS.md            # contrato das funções que a Fase 2 vai implementar
```

## 6. Matrizes de verificação

### 6.1 Rotas × papel

| Rota | Deslogado | Público | Jurado | Admin |
|---|---|---|---|---|
| `/` | Ver | Ver | Ver | Ver |
| `/e/[slug]` | Ver, entrar/registrar | Ver | Ver | Ver |
| `/e/[slug]/convite` | Pedir login | Resgatar | Redirecionar (já é jurado) | Bloquear |
| `/e/[slug]/votar` | Pedir login | Votar | Votar (sem contagens) | Bloquear ou só visualizar |
| `/e/[slug]/admin` | Pedir login | Acesso restrito | Acesso restrito | Ver |
| `/e/[slug]/admin/configuracao` | Pedir login | Acesso restrito | Acesso restrito | Ver |
| `/e/[slug]/admin/apresentar` | Pedir login | Acesso restrito | Acesso restrito | Ver |

> Cada célula vira um teste manual do CP1. Qualquer comportamento diferente do esperado é bug ou decisão a registrar.

### 6.2 Telas × estado da urna

| Tela | Rascunho | Não iniciada | Aberta | Encerrada | Concluído |
|---|---|---|---|---|---|
| Evento | Não público | Aguardando | Votar | Encerrada | Encerrado |
| Votar | Indisponível | Indisponível | Fluxo completo | Indisponível | Indisponível |
| Dashboard | Operação vazia | Operação | Operação ao vivo | Operação + Resultado | Leitura + exportação |
| Configuração | Livre | Livre | Com travas | Com travas | Leitura |
| Apresentação | Ensaio apenas | Ensaio apenas | Ensaio apenas | Resultado oficial | Resultado oficial |

### 6.3 Larguras-alvo de responsividade

| Perfil | Largura | Onde importa |
|---|---|---|
| Celular pequeno | 360 px | Votação por QR Code, evento, login |
| Celular grande | 414 px | Votação, evento |
| Tablet | 768 px | Admin leve, dashboard |
| Notebook | 1280 px | Configuração, dashboard |
| Telão | 1920×1080 e 3840×2160 (16:9) | Apresentação |

## 7. Checkpoints

A ordem vai do mais estrutural ao mais fino: primeiro garantir que dá para ir de qualquer lugar a qualquer lugar, depois consertar layout, depois acessibilidade, depois consistência, e só então fechar documentação e aceite.

---

### CP1 — Auditoria de navegação e guarda de rotas

**Objetivo:** nenhum link quebrado, nenhum beco sem saída, nenhum papel vendo o que não deve.

**Tarefas**
- Percorrer a matriz 6.1 célula por célula e registrar o resultado real em `MATRIZ-ROTAS.md`.
- Centralizar a guarda de papel e estado em um único componente ou helper (`RotaGuard`); remover verificações duplicadas dentro das telas.
- Garantir navegação em ambos os sentidos: toda tela tem caminho de entrada **e** de saída (voltar ao evento, ir ao admin, voltar à landing).
- Cabeçalho do admin com atalhos entre Dashboard, Configuração e Apresentação, indicando a rota atual (`aria-current`).
- Redirecionamentos: logar leva de volta à rota de origem; resgatar convite leva à votação; concluir evento leva ao dashboard em leitura.
- Páginas `not-found` (rota e slug de evento inexistente) e `error`, com o tema aplicado e ação clara de retorno.
- Verificar que o botão voltar do navegador não deixa o fluxo de voto em estado inconsistente (ex.: voltar da confirmação para a seleção sem duplicar voto).
- Verificar slug mudado na Configuração: links internos continuam funcionando.

**Estados a cobrir:** deslogado, público, jurado, admin; evento inexistente; rota inexistente; erro inesperado.

**Pronto quando**
- [ ] A matriz 6.1 está preenchida e todos os desvios estão corrigidos ou documentados.
- [ ] Nenhuma tela exige digitar URL para sair dela.
- [ ] A lógica de acesso existe em um só lugar.
- [ ] 404 e erro aparecem com o tema do evento quando há evento no contexto.

---

### CP2 — Revisão de estados globais e consistência de fluxo

**Objetivo:** todas as telas se comportam coerentemente com o estado do evento e da urna.

**Tarefas**
- Percorrer a matriz 6.2 e conferir cada célula, anotando desvios.
- Rodar os **fluxos completos** de ponta a ponta com a dev toolbar e registrar bugs:
  1. Público: landing → evento → registro → votar → sucesso → tentativa de votar de novo ("já votou").
  2. Jurado: gerar convite na Configuração → registrar com código → votar → alterar voto → urna encerra e bloqueia.
  3. Admin: rascunho incompleto → completar checklist → ativar → abrir urna → acompanhar no dashboard → encerrar → ver resultado → apresentar → concluir.
- Conferir consistência dos **números** entre telas: totais no Dashboard, resultado no telão, convites usados na Configuração e no Dashboard (a mesma fonte, sem duplicar valores).
- Revisar mensagens de erro e textos de estado: tom único, em português, sem texto em inglês perdido, sem placeholders ("Lorem", "TODO").
- Garantir estados vazios, de carregamento simulado e de erro simulado nas telas que os têm.
- Conferir que a urna aberta nunca mostra votos por candidato ao público nem ao jurado.

**Pronto quando**
- [ ] Os três fluxos de ponta a ponta rodam sem erro e sem passos manuais além da toolbar.
- [ ] Os mesmos números aparecem iguais em todas as telas que os exibem.
- [ ] Não restam textos em inglês, placeholders ou valores fixos de domínio fora de `src/mocks/`.
- [ ] Cada célula da matriz 6.2 está conferida.

---

### CP3 — Responsividade

**Objetivo:** as telas funcionam nas larguras-alvo, com prioridade para o celular.

**Tarefas**
- Revisar cada rota nas larguras da seção 6.3 (360, 414, 768, 1280 e 16:9), registrando falhas.
- Verificar: sem rolagem horizontal da página, sem texto cortado, áreas de toque de pelo menos 44×44 px, formulários utilizáveis com teclado virtual aberto.
- Tabelas largas (convites, auditoria, classificação) rolam dentro do próprio contêiner ou viram cartões no mobile.
- `viewport` correto no layout; imagens com proporção preservada (`object-fit`) e sem estourar o contêiner.
- Votação em 360 px: seleção, revisão e confirmação sem exigir zoom; botão de confirmar sempre alcançável.
- Admin em tablet: navegação de seções da Configuração e abas do Dashboard utilizáveis.
- Telão: tipografia escalada, margens de segurança, nada depende de hover; testar em 1080p e em 4K, em tela cheia.
- Trocar tema (Semana Tech ↔ Festival) em cada largura: logos e textos longos de nome de evento não quebram o layout.
- Orientação: celular em paisagem não esconde ações essenciais.

**Pronto quando**
- [ ] Nenhuma tela tem rolagem horizontal involuntária entre 360 e 1920 px.
- [ ] Todas as ações principais cabem e são tocáveis em 360 px.
- [ ] O telão é legível a distância em 1080p e em 4K e funciona sem mouse.
- [ ] Os dois temas passam na revisão em todas as larguras.

---

### CP4 — Acessibilidade básica

**Objetivo:** cumprir o que o DD pede em 12: contraste, foco visível, teclado, leitores de tela e movimento reduzido.

**Tarefas**
- `lang="pt-BR"` no layout (conferir se a Etapa 0 já trocou), `<title>` por rota, hierarquia de títulos (um `h1` por página).
- **Teclado:** percorrer cada fluxo só com Tab/Shift+Tab/Enter/Esc/setas; ordem de foco lógica; diálogos com foco preso e retorno do foco ao elemento de origem; `Esc` fecha diálogos.
- **Foco visível** em todos os controles, com contraste suficiente nos dois temas.
- `SkipLink` ("Pular para o conteúdo") nas telas com cabeçalho.
- **Rótulos:** todo campo com `label` associado; botões só com ícone com `aria-label`; imagens de candidatos com `alt` útil (o título do candidato, não "imagem").
- **Anúncios:** `LiveRegion` para toasts, erros de validação e mudança de estado da urna; erros ligados ao campo (`aria-describedby`).
- **Estado nunca só por cor ou animação:** revisar badges (Publicado, Revogado, Aberta etc.), contraste do tema, validação de pesos; sempre texto ou ícone junto.
- **`prefers-reduced-motion`:** reduzir/desligar animações da UI e as transições do telão; a revelação continua funcionando de forma estática.
- **Contraste:** verificar texto e controles nos dois temas (4,5:1 para texto normal, mesmo limiar adotado na Etapa 6); conferir também o modo escuro do sistema, se mantido.
- Ferramentas: passada com Lighthouse (Accessibility) e axe DevTools em cada rota; leitor de tela (NVDA ou VoiceOver) nos fluxos de votar e de configurar candidato.

**Pronto quando**
- [ ] Todos os fluxos principais são concluídos só com teclado.
- [ ] Lighthouse Accessibility ≥ 90 em todas as rotas; zero erros "críticos" no axe.
- [ ] Diálogos prendem e devolvem o foco corretamente.
- [ ] Com movimento reduzido ativado, nenhuma animação essencial é necessária para entender a tela.
- [ ] Nenhum estado depende apenas de cor.

---

### CP5 — Consistência visual, tema e conteúdo

**Objetivo:** o protótipo parece um produto único, e o white-label se sustenta nas duas identidades.

**Tarefas**
- Varrer o código atrás de **cores, fontes e textos fixos** que deveriam vir do tema (`#hex`, `rgb(`, classes de cor soltas), e substituí-los por tokens.
- Conferir que a landing (antes com cores fixas do Festival) já usa os tokens e que o preset "Festival" reproduz seu visual.
- Alternar Semana Tech ↔ Festival em todas as rotas, buscando: logo faltando, cor residual, rótulo hardcoded ("filme", "candidato").
- Padronizar componentes repetidos: botões (primário, secundário, perigo), cartões, badges, diálogos de confirmação, toasts, estados vazios, esqueletos de carregamento.
- Padronizar espaçamentos, raios, sombras e tamanhos de título.
- Revisar o "powered by VaiVota" (discreto, presente nas telas públicas e no telão).
- Revisar microcopy: verbos de ação consistentes, mensagens de erro construtivas, datas e números no formato brasileiro (`dd/MM/aaaa`, vírgula decimal, fuso do evento).
- Remover do build final: `console.log`, componentes e arquivos sem uso, imagens não referenciadas.
- Configurar `metadata` (título, descrição, favicon) com o tema do evento onde possível.

**Pronto quando**
- [ ] Busca por cores/fonts hardcoded fora de `globals.css`/tokens retorna zero.
- [ ] Trocar o tema na toolbar altera visualmente todas as telas de forma completa.
- [ ] Componentes repetidos vêm de um único lugar.
- [ ] Datas, números e porcentagens seguem o padrão pt-BR em todas as telas.

---

### CP6 — Fronteira de dados e preparação para a Fase 2

**Objetivo:** garantir que a Fase 2 consiga trocar a implementação sem mexer nas telas.

**Tarefas**
- Garantir que **nenhum componente importa dados seed diretamente**. Tudo passa por `repo.ts` (ou pelo store, com a mesma interface).
- Documentar em `FRONTEIRA-DADOS.md` o contrato de cada função usada pelas telas: nome, parâmetros, retorno, erros possíveis, e qual tela a consome. Exemplo de agrupamento: evento, candidatos, participação/voto, convites, placar/resultado, auditoria, tema.
- Padronizar o tipo de retorno das funções (ex.: sempre assíncronas, com sucesso/erro tipado), mesmo que hoje resolvam instantaneamente. Isso evita reescrever telas quando o BD fake introduzir latência e falhas.
- Introduzir **latência simulada configurável** (ex.: 0 / 300 ms / 1,5 s) e **falha simulada** na dev toolbar, para provar que loading e erro funcionam em todas as telas.
- Garantir que funções de regra de negócio puras (travas, fórmula do placar, contraste, desempate) estejam isoladas e testáveis, porque serão reaproveitadas no BD real.
- Mapear as entidades do store contra o `schema.prisma` e o DD (seção 6): listar campos usados no mock que **não existem** no schema, e campos do schema que o mock não usa. Registrar divergências, sem alterá-las nesta etapa.
- Registrar a pendência **MySQL × PostgreSQL/Supabase** no documento, pois impacta a última etapa do projeto (FKs compostas e CHECK dos pesos).
- Confirmar que os IDs e a forma dos dados do seed são plausíveis para virar linhas de BD (sem objetos aninhados que o relacional não representaria).

**Pronto quando**
- [ ] Busca por imports de `mocks/seed` fora de `src/mocks/` retorna zero.
- [ ] `FRONTEIRA-DADOS.md` cobre todas as funções usadas pelas telas.
- [ ] Todas as telas lidam com carregamento e erro quando a latência/falha simuladas são ligadas.
- [ ] A lista de divergências mock × schema está registrada.

---

### CP7 — Roteiro de demonstração e checklist final

**Objetivo:** fechar a Fase 1 com um protótipo demonstrável e aprovado.

**Tarefas**
- Escrever `ROTEIRO-DEMO.md`: passo a passo de 8 a 10 minutos mostrando o fluxo mais convincente para a Semana Tech, na ordem: landing → evento no tema da Semana Tech → votar no celular → jurado → configuração (tema e placar) → dashboard → **trocar para o Festival** → apresentação com revelação. Incluir quais cenários da toolbar usar e como voltar ao início (reset).
- Documentar atalhos de teclado e passos de contingência (o que fazer se algo travar: resetar o protótipo).
- Definir os **cenários nomeados** finais em `cenarios.ts` (consolidando os criados nas Etapas 2, 6, 7 e 8) e deixá-los selecionáveis na toolbar.
- Passar o **build de produção** (`next build`) e o lint (`eslint`), corrigindo erros e avisos relevantes; rodar `next start` e repetir o roteiro de demo nesse modo.
- Verificar que a dev toolbar é desligável (flag/variável) e que a demonstração pode ser feita **com ou sem** ela visível.
- Executar a demo completa em: Chrome desktop, Safari iOS, Chrome Android e, se possível, no telão real ou em monitor 16:9.
- Preencher `CHECKLIST-FASE1.md` (seção 9 deste planner) com ✔/✘ e responsável; tudo ✘ vira issue de backlog, classificada como "bloqueia Fase 2" ou "pode esperar".
- Marcar o commit/tag da linha de base (ex.: `fase1-prototipo`) para poder voltar a ele durante a Fase 2.
- Reunir uma lista curta de **ideias e ajustes pedidos** durante os testes, separadas do escopo desta etapa.

**Pronto quando**
- [ ] `next build` e `eslint` passam sem erros.
- [ ] O roteiro de demo roda de ponta a ponta no build de produção, em desktop e celular.
- [ ] O checklist final está preenchido e sem itens "bloqueia Fase 2".
- [ ] A tag da linha de base existe.
- [ ] Você (ou a equipe) aprovou o protótipo para iniciar a Fase 2.

---

## 8. Dependências entre checkpoints

```
CP1 ─┬─> CP2 ─> CP3 ─> CP4 ─> CP5 ─> CP6 ─> CP7
     └─> (CP1 libera os fluxos testados no CP2)
```

CP3, CP4 e CP5 podem ser feitos em paralelo por pessoas diferentes, desde que CP1 e CP2 estejam fechados, porque dependem de navegação e estados estáveis. CP6 deve começar depois de CP5 para não refatorar componentes ainda mudando de visual. CP7 é sempre o último.

## 9. Checklist final de aceite da Fase 1

**Telas e rotas**
- [ ] Landing, Evento, Login/Registro, Candidato, Votos, Configuração, Dashboard e Apresentação implementados.
- [ ] Matriz rotas × papel verificada e sem desvios.
- [ ] Matriz telas × estado da urna verificada e sem desvios.
- [ ] 404 e erro padrão funcionando.

**Comportamento**
- [ ] Os três fluxos de ponta a ponta (público, jurado, admin) rodam sem intervenção fora da toolbar.
- [ ] Nada persiste após F5 e nenhuma chamada a banco/API externa existe.
- [ ] Durante a votação, nenhuma tela mostra votos por candidato ao público ou ao jurado.
- [ ] Números iguais em todas as telas que os exibem.
- [ ] Travas da Configuração coerentes em todo o protótipo.

**Tema e conteúdo**
- [ ] O tema do evento aparece em landing, login, votação e apresentação.
- [ ] Semana Tech ↔ Festival alteram todas as telas sem cor ou rótulo residual.
- [ ] Textos em português do Brasil, sem placeholders.

**Responsividade e acessibilidade**
- [ ] Utilizável de 360 px a 1920 px, e telão em 1080p/4K.
- [ ] Navegação completa por teclado e foco visível.
- [ ] Lighthouse Accessibility ≥ 90 nas rotas; axe sem erros críticos.
- [ ] Movimento reduzido respeitado.
- [ ] Estado nunca apenas por cor.

**Qualidade e preparação**
- [ ] `next build` e `eslint` sem erros.
- [ ] Nenhum dado de domínio fixo fora de `src/mocks/`.
- [ ] `FRONTEIRA-DADOS.md` completo; divergências mock × schema registradas.
- [ ] Latência e falha simuladas funcionam em todas as telas.
- [ ] `ROTEIRO-DEMO.md` testado em build de produção.
- [ ] Tag `fase1-prototipo` criada.

## 10. Pendências e decisões assumidas

| Item | Assumido neste planner | Precisa confirmar? |
|---|---|---|
| Totem (`/totem`, `/totem/parear`) | Fora da Fase 1, conforme o DD | Confirmar |
| Meta de acessibilidade | Lighthouse ≥ 90 e axe sem críticos, sem auditoria formal WCAG | Sim: basta isso para a Semana Tech? |
| Navegadores/dispositivos | Chrome desktop, Safari iOS, Chrome Android | Informar se há outros alvos (ex.: o telão real) |
| Admin acessando `/votar` | Bloquear ou só visualizar (a decidir) | Sim: o DD não define |
| Dev toolbar na demo | Desligável por flag; demo funciona com e sem | Confirmar se ela aparece na apresentação ao público |
| Modo escuro do sistema | Mantido se já existir, e verificado em contraste | Decidir se vale manter no white-label |
| Banco de produção | MySQL (schema atual) × PostgreSQL/Supabase | Decidir antes da última etapa, não bloqueia a Fase 1 |
| Teste de carga | Fora da Fase 1 (depende de backend real) | — |
