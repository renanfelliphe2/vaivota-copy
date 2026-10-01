# VaiVota — Fase 1 · Etapa 1: Landing Page

> Rota: `/` · Fase 1 (mockup, sem banco, F5 perde tudo)
> Fontes: `DocumentDesign.md` (seções 1, 5.4, 9, 12), `README.md`, `src/app/page.tsx` atual
> Pré-requisito: **Etapa 0 (Fundação do protótipo)**. Ver seção 3.

---

## 1. Objetivo

Transformar a landing atual, que tem nome, cores e textos do Festival fixos no código, em uma landing **dirigida pelo evento**: nome, logo, cores, rótulos e estado da urna vêm do mock, e trocar de evento ou de estado na dev toolbar muda a página sem alterar código.

É a primeira tela que prova o princípio **configurável, não customizável**: layout fixo, identidade por evento, VaiVota discreto ("powered by").

## 2. Escopo

**Dentro**
- Landing em `/` para o evento ativo do mock.
- Tema aplicado por variáveis (nenhuma cor de marca hardcoded).
- Quatro situações do evento: em preparação, urna não iniciada, urna aberta, encerrada/concluída.
- CTA para `/e/[slug]` (a entrada do evento é a Etapa 2).
- Link discreto "Sou jurado" para `/e/[slug]/convite`.
- Prévia curta dos candidatos publicados.
- Mobile-first e acessibilidade básica.

**Fora (outras etapas)**
- Login, registro e convite de jurado (Etapa 3).
- Página de entrada do evento e seus estados completos (Etapa 2).
- Lista e detalhe de candidatos (Etapa 4).
- Dev toolbar, store e dados seed (Etapa 0).
- Qualquer persistência.

## 3. Contrato esperado da Etapa 0

Como o planner da Etapa 0 ainda não existe, esta etapa define o mínimo que consome dela. Se algo divergir, ajustamos aqui ou lá.

| Item | O que a Etapa 1 espera |
|---|---|
| Tokens de tema | Variáveis CSS `--tema-primaria`, `--tema-secundaria`, `--tema-fundo`, `--tema-texto` e `--tema-sobre-primaria` (cor do texto sobre a primária), aplicadas no container do evento |
| Utilitários Tailwind | Mapeados em `@theme inline` (ex.: `bg-tema-primaria`, `text-tema-texto`) |
| Evento ativo | `useEventoAtivo()` retorna `{ evento, tema, candidatos }` seguindo os campos do schema (`nome`, `descricao`, `slug`, `estado`, `estadoUrna`, `janelaInicio`, `janelaFim`, `moduloJuri`, `avisoPrivacidadeUrl`; tema com `nomeExibicao`, `logoUrl`, `capaUrl`, `rotuloCandidato(s)`) |
| Relógio | `useAgora()` retorna o instante atual simulado (a Fase 3 troca pela hora do servidor) |
| Seed | Dois eventos: **Semana Tech** (sem logo, tema próprio) e **9º Festival Ver e Fazer Filmes** (com logo `.webp`, laranja e verde atuais) |
| Rotas stub | `/e/[slug]` e `/e/[slug]/convite` existem como placeholder, para os links não darem 404 |
| Dev toolbar | Seletor de evento/tema e de estado do evento e da urna |
| Idioma | `lang="pt-BR"` no `layout.tsx` (se não vier da Etapa 0, entra no Checkpoint 1) |

## 4. Decisões desta etapa

1. **O tema Festival é o baseline visual.** Com o tema Festival ativo, a landing deve ficar visualmente igual à atual. Isso permite validar a migração para tokens sem ambiguidade.
2. **Sem dark mode automático.** O `globals.css` troca fundo e texto por `prefers-color-scheme`, mas no VaiVota quem define fundo e texto é o tema do evento. O bloco dark é removido.
3. **Textos sem artigo e sem gênero.** O título atual ("Vote nos melhores curtas do...") não funciona para "projetos" ou "músicas". Padrão: o `h1` é o `nomeExibicao`; o subtítulo é a `descricao` do evento; a chamada usa o rótulo plural sem artigo (ex.: "Escolha seus favoritos entre 12 {rotuloCandidatos}").
4. **Logo com fallback.** Sem `logoUrl`, o header mostra o nome do evento em texto. A Semana Tech exercita esse caminho.
5. **CTA do header visível no mobile.** Hoje o botão do header é `hidden sm:inline-block`; como a votação é mobile-first (QR Code), ele passa a aparecer em todos os tamanhos.
6. **Contraste do botão.** O texto branco `text-sm` sobre `#F15A29` dá cerca de 3,4:1, abaixo dos 4,5:1 de AA para texto pequeno. A cor do texto sobre a primária passa a vir do token `--tema-sobre-primaria`, e os botões usam texto de tamanho grande/negrito. A validação automática de contraste do tema é da Etapa 6; aqui só conferimos manualmente.
7. **Metadata.** `generateMetadata` usa o evento padrão do seed (servidor), pois o store é client-side. Trocar o tema na toolbar não altera o `<title>`, o que é aceitável no mockup.

## 5. Estrutura de arquivos

| Arquivo | Ação |
|---|---|
| `src/app/page.tsx` | Vira composição fina das seções |
| `src/app/layout.tsx` | `lang="pt-BR"`, metadata do evento padrão |
| `src/app/globals.css` | Remove dark mode automático; garante tokens |
| `src/components/landing/LandingHeader.tsx` | Novo |
| `src/components/landing/LandingHero.tsx` | Novo |
| `src/components/landing/StatusUrna.tsx` | Novo (faixa de estado + contagem regressiva) |
| `src/components/landing/ComoFunciona.tsx` | Novo |
| `src/components/landing/CandidatosPrevia.tsx` | Novo |
| `src/components/landing/LandingFooter.tsx` | Novo |
| `src/components/evento/LogoEvento.tsx` | Novo (reutilizado nas próximas etapas) |

---

## 6. Checkpoints

Cada checkpoint termina em algo que roda e pode ser conferido. Sugestão de entrega em zip a cada um.

### Checkpoint 1 — Migração para tokens (paridade visual)

**Objetivo:** tirar toda cor e texto de marca do código sem mudar o visual do Festival.

- [ ] `lang="pt-BR"` no `layout.tsx` (se ainda não feito na Etapa 0).
- [ ] Remover o bloco `prefers-color-scheme: dark` e a fonte `Arial` fixa do `globals.css`; fundo e texto vêm do tema.
- [ ] Substituir `#F15A29`, `#8DC63F`, `#5f8a1f` e as classes `zinc-*` de marca por utilitários de token.
- [ ] Texto do botão com `--tema-sobre-primaria`.
- [ ] Nenhuma ocorrência de hex de marca em `src/app/page.tsx` (`grep` limpo).

**Pronto quando:** com o tema Festival, a página fica igual à atual (comparação lado a lado); com o tema Semana Tech, as cores mudam sem tocar em código.

### Checkpoint 2 — Extração de componentes

**Objetivo:** separar `page.tsx` em seções reutilizáveis.

- [ ] Criar `LandingHeader`, `LandingHero`, `ComoFunciona`, `LandingFooter` em `src/components/landing/`.
- [ ] Criar `LogoEvento` com fallback para o nome em texto quando não há `logoUrl`.
- [ ] `page.tsx` apenas compõe as seções (menos de 30 linhas).
- [ ] Imagens via `next/image` com `alt` vindo do `nomeExibicao`.

**Pronto quando:** a página renderiza igual ao Checkpoint 1 e, com a Semana Tech, o header mostra o nome em texto no lugar da logo.

### Checkpoint 3 — Conteúdo vindo do evento

**Objetivo:** nenhum texto específico do Festival fica no código.

- [ ] Header: `LogoEvento` + CTA "Votar agora" → `/e/[slug]`.
- [ ] Hero: badge (local e ano a partir do evento), `h1` = `nomeExibicao`, subtítulo = `descricao`, CTA principal e CTA secundário.
- [ ] CTA secundário "Sobre o evento" só aparece se o evento tiver link externo no seed.
- [ ] "Como funciona" com 3 passos (conhecer, votar, acompanhar) usando `rotuloCandidatos` do tema, sem artigo.
- [ ] Footer: nome do evento, "powered by VaiVota" discreto, link do aviso de privacidade (se houver `avisoPrivacidadeUrl`).
- [ ] Link "Sou jurado" → `/e/[slug]/convite`, visível só se `moduloJuri` estiver ligado.

**Pronto quando:** alternar entre Semana Tech e Festival troca nome, textos, rótulos e links sem nenhuma string de evento no JSX.

### Checkpoint 4 — Estados do evento e da urna

**Objetivo:** a landing reage ao estado simulado na toolbar.

| Situação | Faixa de status | CTA principal |
|---|---|---|
| Evento em `RASCUNHO` | "Evento em preparação" | Desabilitado, com texto explicativo |
| Urna `NAO_INICIADA` | "A votação abre em {data/hora}" + contagem regressiva | "Criar conta" → `/e/[slug]` |
| Urna `ABERTA` | "Votação aberta" + tempo restante (com destaque na "reta final") | "Quero votar" → `/e/[slug]` |
| Urna `ENCERRADA` | "Votação encerrada" | Sem CTA de voto |
| Evento `CONCLUIDO` | "Evento concluído" | Sem CTA de voto |

- [ ] `StatusUrna` consome `useAgora()` e só calcula o tempo depois de montado (evita hydration mismatch).
- [ ] Contagem regressiva respeita o fuso do evento.
- [ ] Texto e ícone acompanham o estado; nunca só cor.
- [ ] Nenhum dado de resultado aparece na landing.
- [ ] `CandidatosPrevia`: até 6 candidatos publicados (imagem + título), com contagem total; se houver menos de 2 publicados, a seção some.

**Pronto quando:** as cinco situações da tabela se alternam pela toolbar, e a contagem regressiva anda sozinha.

### Checkpoint 5 — Responsividade e acessibilidade

**Objetivo:** mobile-first utilizável.

- [ ] Layout validado em 360, 768 e 1280 px, sem scroll horizontal.
- [ ] CTA do header visível em todos os tamanhos.
- [ ] Áreas de toque com pelo menos 44 px.
- [ ] Foco visível em todos os links e botões, com cor derivada do tema.
- [ ] Marcos semânticos (`header`, `main`, `footer`) e hierarquia de títulos sem saltos (um só `h1`).
- [ ] Contagem regressiva com `aria-live="polite"` em intervalos longos (não anunciar a cada segundo).
- [ ] Animações (se houver) respeitam `prefers-reduced-motion`.
- [ ] Contraste conferido manualmente nos dois temas (botão, badge e faixa de status).

**Pronto quando:** navegar só pelo teclado percorre toda a página, e nenhum par de cores do tema Festival fica abaixo de AA em texto de tamanho normal, ou o ajuste fica registrado como pendência para a Etapa 6.

### Checkpoint 6 — Revisão e fechamento

**Objetivo:** fechar a etapa com evidência.

- [ ] `npm run lint` e `npm run build` sem erros.
- [ ] Matriz de verificação abaixo preenchida.
- [ ] Sem `console.error` e sem warnings de hidratação.
- [ ] Todos os links levam a uma rota existente (stubs incluídos).
- [ ] Zip de entrega gerado e `page.tsx` revisado (sem lógica de evento, só composição).

| Tema \ Situação | Rascunho | Não iniciada | Aberta | Encerrada | Concluído |
|---|---|---|---|---|---|
| Semana Tech | ☐ | ☐ | ☐ | ☐ | ☐ |
| Festival | ☐ | ☐ | ☐ | ☐ | ☐ |

---

## 7. Critérios de aceitação da Etapa 1

- [ ] A landing não contém nenhum nome, texto ou cor específicos de um evento no código.
- [ ] Trocar o evento na toolbar muda identidade visual, textos e rótulos.
- [ ] As cinco situações de evento/urna têm faixa de status e CTA coerentes.
- [ ] O tema Festival mantém a aparência da landing atual.
- [ ] Funciona em celular, com foco visível e navegação por teclado.
- [ ] Nada é salvo; o F5 volta ao estado inicial do seed.

## 8. Pendências

- Link "Sobre o evento": o seed precisa de um campo para ele (o schema atual não tem). Para o mockup basta um valor no seed; na Fase 3 decidir se vira campo do `Evento` ou do `Tema`.
- Tamanho de fonte e peso do botão para atingir contraste no laranja do Festival: confirmar no Checkpoint 5 ou escurecer a primária (decisão da Etapa 6).
- Estado `RASCUNHO` na landing pública: o DD diz que nada é público em rascunho; aqui mostramos "em preparação" só para o mockup. Confirmar o comportamento real depois.
