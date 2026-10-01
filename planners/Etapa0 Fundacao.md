# VaiVota — Fase 1 · Etapa 0: Fundação do protótipo

> Rotas: nenhuma tela nova (infraestrutura + rotas stub)
> Fontes: `DocumentDesign.md` (seções 5, 6, 9, 12), `prisma/schema.prisma`, `package.json` enviado
> Consumidores: Etapas 1 a 9. Esta etapa cumpre o contrato da seção 3 do planner da Etapa 1.

---

## 1. Objetivo

Montar a base sobre a qual todas as telas da Fase 1 serão construídas: tema por tokens, dados seed, estado em memória, relógio simulado, camada de serviços, dev toolbar e componentes básicos de interface.

O que esta etapa precisa garantir:
- **Tudo é mock e some no F5**, mas a navegação entre telas mantém o estado.
- **Cada estado do sistema pode ser forçado** (urna, evento, sessão, tempo, módulos), porque quase toda tela muda conforme eles.
- **A Fase 2 e a Fase 3 entram sem reescrever telas**: as telas só falam com hooks de leitura e com serviços; trocar o que há por trás (BD fake, depois Prisma + Supabase) não deve exigir mexer nelas.

## 2. Escopo

**Dentro**
- Configuração do projeto (Next.js, TypeScript, lint, aliases).
- Tipos de domínio e dados seed de dois eventos.
- Sistema de tema (tokens CSS, contraste, fontes aprovadas).
- Store em memória, relógio simulado e camada de serviços assíncronos.
- Dev toolbar.
- Componentes básicos de UI e rotas stub.

**Fora**
- Qualquer tela real (Etapas 1 a 8).
- Persistência de qualquer tipo (Fase 2).
- Autenticação de verdade (a Etapa 3 faz o fluxo mockado).
- Totem e voto infantil (fora da Fase 1).

## 3. Rastreabilidade

### 3.1 O que a Etapa 1 espera

| Contrato da Etapa 1 | Onde é entregue |
|---|---|
| Tokens `--tema-*` e utilitários Tailwind | CP3 |
| `useEventoAtivo()` | CP4 |
| `useAgora()` | CP4 |
| Seed com Semana Tech e Festival (incluindo `local` e `linkSobre`) | CP2 |
| Rotas stub `/e/[slug]` e `/e/[slug]/convite` | CP6 |
| Dev toolbar (evento, estado do evento, urna) | CP5 |
| `lang="pt-BR"` | CP1 |

### 3.2 O que as Etapas 2 e 3 esperam

| Item | Entrega |
|---|---|
| Usuários, participações e convites de jurado seed cobrindo todos os cenários | CP2 |
| Serviços com `Resultado<T>`, latência e erro de rede simulados | CP4 |
| Sessão no store e atalho "Entrar como" | CP4 e CP5 |
| Componentes `Button`, `Campo`, `Input`, `Cartao`, `Selo`, `Alerta` | CP6 |
| Grupos de rota `(participante)` e `admin` | CP6 |

## 4. Decisões desta etapa

1. **Estado único em memória, montado no `layout` raiz.** O provider fica no layout raiz, que não remonta em navegação client-side. Assim `/`, `/e/[slug]` e as telas de admin compartilham o mesmo estado, e o F5 volta ao seed.
2. **Rota interna só com `next/link` ou `useRouter`.** Um `<a href="/e/...">` comum recarrega a página e perde o estado. Âncoras `#id` e links externos podem usar `<a>`. Vale como convenção para todas as etapas (a regra `@next/next/no-html-link-for-pages` do ESLint ajuda).
3. **Leitura por hooks seletores, escrita por serviços assíncronos.** Todo serviço devolve `Promise<Resultado<T>>` e simula latência, mesmo sendo síncrono por baixo. Isso força as telas a tratar loading, erro e duplo clique desde já, e é exatamente o contrato que a API real terá.
4. **Store externo com `useSyncExternalStore`.** Serviços assíncronos precisam ler o estado mais recente depois de um `await`, o que um `useReducer` não dá de forma simples. O store é criado dentro do provider (uma instância por montagem), não como singleton de módulo, para não vazar estado entre requisições no SSR.
5. **Relógio simulado e determinístico.** O "agora" do protótipo começa em um instante fixo `T0` e corre a partir dele. Seeds usam datas absolutas, não relativas ao carregamento, o que evita divergência entre o HTML do servidor e o do cliente (hydration mismatch) e permite pular no tempo pela toolbar. As datas são placeholders: o DD diz que as datas da Semana Tech ainda estão por confirmar.
6. **Tipos espelham o schema, sem importar o Prisma.** Mesmos nomes de entidades, campos e enums (camelCase), definidos à mão em `src/dominio/`. Campos que não existem no schema levam o comentário `// mock-only`. Na Fase 3, esses tipos podem ser trocados pelos do Prisma.
7. **Seletores devolvem referências estáveis.** Um seletor que cria objeto novo a cada chamada causa loop de renderização com `useSyncExternalStore`. Quem precisa de dado derivado usa seletor simples + cálculo no componente.
8. **Dependências novas: só `lucide-react`** (ícones). QR Code entra na Etapa 8 e gráficos são decididos na Etapa 7.
9. **Sem framework de testes na Fase 1.** Funções puras (contraste, embaralhar, formatação de tempo) ficam isoladas em `src/lib/` para serem testadas depois. A verificação é por checklist manual em cada checkpoint.
10. **Toolbar controlada por variável de ambiente.** `NEXT_PUBLIC_DEV_TOOLBAR=true` (padrão na Fase 1). Ela some sozinha em `/e/[slug]/admin/apresentar` (telão) e com `?toolbar=0`.

## 5. Estrutura de pastas

```
src/
├── app/
│   ├── layout.tsx                     # lang pt-BR, AppProvider, TemaEvento, DevToolbar
│   ├── page.tsx                       # landing (Etapa 1)
│   └── e/[slug]/
│       ├── layout.tsx                 # gate: slug válido ou "Evento não encontrado"
│       ├── (participante)/
│       │   ├── page.tsx               # /e/[slug]          (Etapa 2)
│       │   ├── votar/page.tsx         # /e/[slug]/votar    (Etapas 4 e 5)
│       │   └── convite/page.tsx       # /e/[slug]/convite  (Etapa 3)
│       └── admin/
│           ├── page.tsx               # dashboard          (Etapa 7)
│           ├── configuracao/page.tsx  # configuração       (Etapa 6)
│           └── apresentar/page.tsx    # apresentação       (Etapa 8)
├── components/
│   ├── ui/                            # Button, Campo, Input, Cartao, Selo, Alerta, Carregando
│   ├── evento/                        # LogoEvento, TemaEvento, EventoNaoEncontrado
│   └── dev/                           # DevToolbar, InspetorEstado, EmConstrucao
├── dominio/
│   └── tipos.ts                       # enums e entidades (espelham o schema)
├── mocks/
│   └── seed/                          # eventos, candidatos, usuarios, participacoes, convites
├── store/
│   ├── criarStore.ts
│   ├── AppProvider.tsx
│   ├── seletores.ts                   # useEventoAtivo, useSessao, useAgora...
│   └── acoes.ts
├── servicos/
│   ├── resultado.ts                   # Resultado<T>, CodigoErro, atraso, simularFalha
│   ├── evento.ts                      # urna, estado do evento, módulos
│   └── sessao.ts                      # entrarComo, sair
└── lib/
    ├── tema.ts                        # aplicarTema, tokens derivados
    ├── contraste.ts                   # razaoContraste, corTextoSobre
    ├── fontes.ts                      # fontes aprovadas (next/font)
    └── tempo.ts                       # formatação no fuso do evento, contagem regressiva
```

## 6. Modelo do estado

```ts
type EstadoApp = {
  slugPadrao: string                       // evento exibido em "/"
  eventos: Record<string, EventoCompleto>  // evento + tema + configPlacar + configApresentacao
                                           // + camposCandidato + candidatos
  usuarios: Usuario[]
  participacoes: Participacao[]
  convitesJurado: ConviteJurado[]
  votos: Voto[]                            // vazio; usado a partir da Etapa 5
  votosJuri: VotoJuri[]                    // vazio; usado a partir da Etapa 5
  sessao: { usuarioId: string | null }
  relogio: { baseMs: number; deslocamentoMs: number; pausado: boolean }
  dev: { latenciaMs: number; simularErroRede: boolean; toolbarVisivel: boolean }
}

type Resultado<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: { codigo: CodigoErro; mensagem: string } }

type CodigoErro =
  | "VALIDACAO" | "NAO_ENCONTRADO" | "NAO_AUTORIZADO" | "CONFLITO"
  | "URNA_FECHADA" | "JA_VOTOU" | "LIMITE_TENTATIVAS" | "REDE"
```

Entidades como `ResultadoOficial` e `Auditoria` são tipadas e semeadas na etapa que as usa.

## 7. Dados seed

**Eventos**

| | Semana Tech | 9º Festival Ver e Fazer Filmes |
|---|---|---|
| `slug` | `semana-tech` | `ver-e-fazer-filmes` |
| Estado / urna | `ATIVO` / `ABERTA` | `ATIVO` / `NAO_INICIADA` |
| Janela (fuso `America/Sao_Paulo`) | 22/10/2026, 13h às 17h | 25/11/2026 10h a 28/11/2026 20h |
| Módulos | Júri ligado, infantil desligado | Júri e infantil ligados |
| Pesos (popular/júri/infantil) | 70 / 30 / 0, desempate `JURI` | 50 / 30 / 20, desempate `JURI` |
| Tema | Escuro: fundo `#0F172A`, texto `#E2E8F0`, primária `#38BDF8`, secundária `#A78BFA`; fonte Space Grotesk; **sem logo** | Claro: primária `#F15A29`, secundária `#8DC63F`, fundo `#FFFFFF`, texto `#18181B`; fonte Inter; logo `.webp` atual |
| Rótulos | Projeto / Projetos | Curta / Curtas |
| Campos extras | Equipe, Tecnologias | Direção, Duração |
| Candidatos | 8 (7 publicados + 1 rascunho) | 6 (5 publicados + 1 rascunho) |
| `textosEstado` | Ausente (testa o fallback padrão) | Textos próprios |
| `local` (mock-only) | "Cataguases · MG" (placeholder) | "Cataguases · MG" |
| `linkSobre` (mock-only) | Ausente | `https://festivalverefazerfilmes.org.br/` |

Os dois temas cobrem extremos de propósito: um escuro sem logo e um claro com logo. Os títulos e descrições dos candidatos são **fictícios**. Sem imagens remotas: o card gera um placeholder com as cores do tema.

**Usuários, participações e convites (Semana Tech)**

| Usuário | Situação | Serve para testar |
|---|---|---|
| Ana Souza | Público, e-mail verificado, não votou | Fluxo feliz de voto |
| Bruno Lima | Jurado (resgatou o convite "Jurado 1") | Voto do júri |
| Carla Mendes | Admin (também no Festival) | Telas de admin |
| Davi Rocha | E-mail **não verificado**, sem participação | Bloqueio por verificação |
| Eva Santos | Público, **já votou** | Estado "já votou"; bloqueio de resgate de convite |

| Código de convite | Estado |
|---|---|
| `K7M3-QX9P` | Disponível ("Jurado 2") |
| `H4TR-9WNB` | Usado (por Bruno) |
| `P8CD-2VXF` | Revogado |
| `M6ZQ-4KTA` | Disponível, mas com validade já vencida em `T0` |

O Festival tem dois convites disponíveis. Os códigos não usam caracteres ambíguos (0/O, 1/I). O mock guarda o código legível; o sistema real guardará só o hash.

**Relógio:** `T0 = 22/10/2026 14:00 (-03:00)`, uma hora dentro da janela da Semana Tech (faltam 3 h) e bem antes do Festival (faltam 34 dias).

---

## 8. Checkpoints

### Checkpoint 1 — Base do projeto

**Objetivo:** projeto íntegro, com convenções definidas.

- [ ] Conferir os arquivos de configuração que não vieram no zip: `next.config.ts` (com `reactCompiler: true`), `tsconfig.json` (strict, alias `@/*` → `src/*`), `eslint.config.mjs`, `postcss.config.mjs`.
- [ ] `package.json`: renomear para `vaivota`, adicionar script `typecheck` (`tsc --noEmit`) e instalar `lucide-react`.
- [ ] `.env.example` com `NEXT_PUBLIC_DEV_TOOLBAR=true`.
- [ ] `layout.tsx`: `lang="pt-BR"`, metadata genérica ("VaiVota"), remover as fontes Geist (as fontes do tema entram no CP3).
- [ ] Criar a árvore de pastas da seção 5.
- [ ] README: seção "Fase 1 — protótipo (sem banco)" com como rodar, o que a toolbar faz e a convenção de `next/link`.

**Pronto quando:** `npm run dev`, `lint`, `typecheck` e `build` passam.

### Checkpoint 2 — Tipos de domínio e dados seed

**Objetivo:** modelo e dados prontos, sem UI.

- [ ] `src/dominio/tipos.ts` com os enums (como uniões literais) e as interfaces de `Evento`, `Tema`, `ConfigPlacar`, `ConfigApresentacao`, `CampoCandidato`, `Candidato`, `Usuario`, `Participacao`, `ConviteJurado`, `Voto` e `VotoJuri`, com os nomes de campo do schema.
- [ ] Campos mock-only: `local` e `linkSobre` (em `Evento`) e `corSobrePrimaria?` (em `Tema`, ver CP3), todos comentados `// mock-only`.
- [ ] Seeds da seção 7 em `src/mocks/seed/`, validados com `satisfies`.
- [ ] `criarEstadoInicial()` pura, devolvendo cópia nova a cada chamada (usada também pelo "Resetar mock").
- [ ] Constante `T0` e funções auxiliares de data em `src/lib/tempo.ts`.

**Pronto quando:** `typecheck` passa, e os seeds cobrem todos os cenários da seção 7 (conferência manual).

### Checkpoint 3 — Sistema de tema

**Objetivo:** identidade do evento aplicada por tokens, sem cor de marca no código.

| Token CSS | Origem |
|---|---|
| `--tema-primaria`, `--tema-secundaria`, `--tema-fundo`, `--tema-texto` | `Tema` do evento |
| `--tema-sobre-primaria`, `--tema-sobre-secundaria` | `corSobrePrimaria` (mock-only) quando existir; senão, a cor de maior contraste |
| `--tema-superficie`, `--tema-borda`, `--tema-texto-suave` | Derivados com `color-mix` entre fundo e texto |
| `--tema-foco` | Primária, ou texto se a primária tiver menos de 3:1 contra o fundo |
| `--tema-fonte` | Fonte aprovada do evento |

- [ ] `contraste.ts`: `razaoContraste(a, b)` (fórmula WCAG) e `corTextoSobre(hex)`.
- [ ] Mapear os tokens em `globals.css` com `@theme inline`, gerando utilitários como `bg-tema-primaria`, `text-tema-sobre-primaria`, `border-tema-borda`, `ring-tema-foco` e `font-tema`.
- [ ] `lib/fontes.ts`: três fontes aprovadas via `next/font/google` (proposta: Inter, Poppins, Space Grotesk), cada uma exposta como variável CSS.
- [ ] `TemaEvento`: wrapper que aplica as variáveis do evento ativo e define `bg-tema-fundo text-tema-texto`.
- [ ] Remover do `globals.css` o bloco `prefers-color-scheme: dark` e a fonte Arial fixa (o tema manda).
- [ ] O seed do Festival define `corSobrePrimaria: "#FFFFFF"` para manter o visual atual. O contraste fica em torno de 3,4:1, abaixo de AA para texto pequeno, e isso vira aviso na validação de contraste da Etapa 6.

**Pronto quando:** trocar o tema muda cores e fonte de um bloco de teste sem mexer em código; o tema escuro da Semana Tech escolhe texto escuro sobre a primária azul-clara.

### Checkpoint 4 — Store, relógio e serviços

**Objetivo:** estado compartilhado, tempo simulado e serviços assíncronos funcionando.

- [ ] `criarStore` (`getState`, `atualizar`, `subscribe`), `AppProvider` no layout raiz e `useStore(seletor)` com `useSyncExternalStore`.
- [ ] Seletores: `useEventoAtivo()` (usa `useParams().slug` e, se não houver, `slugPadrao`; devolve `{ slug, evento, tema, configPlacar, configApresentacao, camposCandidato, candidatos }`), `useSessao()` e `useParticipacaoAtual()`.
- [ ] Relógio: `useAgora()` via `useSyncExternalStore` com tique de 1 s e `getServerSnapshot` fixo em `T0`; ações de avançar, ir para, pausar e reiniciar.
- [ ] Encerramento automático: se a urna estiver `ABERTA`, `encerramentoAutomatico` ligado e `agora >= janelaFim`, o estado muda para `ENCERRADA`.
- [ ] `servicos/resultado.ts`: `Resultado<T>`, `atraso(ms)` (usa `dev.latenciaMs`) e `simularFalha()` (devolve erro `REDE` quando `dev.simularErroRede` estiver ligado).
- [ ] Serviços iniciais: `definirEstadoUrna`, `definirEstadoEvento`, `alternarModulo`, `entrarComo(usuarioId)` e `sair`.
- [ ] Ação `resetarMock()` que volta ao seed, inclusive sessão e relógio.

**Pronto quando:** um componente temporário mostra o estado, que muda ao chamar os serviços; a urna fecha sozinha quando o relógio passa de `janelaFim`; a navegação por `Link` preserva o estado e o F5 o perde.

### Checkpoint 5 — Dev toolbar

**Objetivo:** forçar qualquer estado em um clique.

| Controle | Efeito |
|---|---|
| Evento | Troca o evento padrão (e o tema) |
| Estado do evento | Rascunho, Ativo, Concluído |
| Urna | Não iniciada, Aberta, Encerrada |
| Sessão | Deslogado ou "Entrar como" um dos cinco usuários seed |
| Módulos | Liga/desliga júri e infantil |
| Relógio | +15 min, +1 h, "Reta final", "Fim da janela", pausar, voltar a `T0` |
| Latência | 0, 400 ou 1500 ms |
| Erro de rede | Liga/desliga a falha simulada nos serviços |
| Resetar mock | Volta ao seed |
| Inspetor | Painel com o JSON do estado |

- [ ] Painel flutuante, recolhível, acessível por teclado e com visual neutro (fora do `TemaEvento`).
- [ ] Respeita `NEXT_PUBLIC_DEV_TOOLBAR`, esconde-se em `/admin/apresentar` e com `?toolbar=0`.
- [ ] Estado "toolbar recolhida" guardado no store.

**Pronto quando:** cada controle muda o `InspetorEstado` e é refletido nas rotas stub do CP6.

### Checkpoint 6 — Componentes de UI e rotas stub

**Objetivo:** blocos básicos e todas as rotas existindo.

- [ ] `Button` (variantes primária, secundária, contorno e fantasma; tamanhos; `carregando`; renderiza `Link` quando recebe `href`).
- [ ] `Campo` (rótulo, dica, erro, ligações `htmlFor` e `aria-describedby`) + `Input`.
- [ ] `Cartao`, `Selo`, `Alerta` (informação, sucesso, aviso, erro; com ícone e texto) e `Carregando` (spinner e skeleton).
- [ ] Todos usando só tokens `tema-*`, com foco visível e alvos de toque de pelo menos 44 px.
- [ ] `LogoEvento` (imagem ou nome em texto) e `EventoNaoEncontrado`.
- [ ] `e/[slug]/layout.tsx` como gate: slug inválido mostra `EventoNaoEncontrado`.
- [ ] Rotas stub da seção 5, usando `EmConstrucao` (mostra rota, etapa responsável e um resumo do estado: evento, urna, sessão, papel).
- [ ] Página `/` continua como está; a Etapa 1 a migra.

**Pronto quando:** todas as rotas abrem sem 404, `/e/inexistente` mostra a tela de não encontrado, e os links entre stubs mantêm o estado.

### Checkpoint 7 — Revisão e fechamento

- [ ] `lint`, `typecheck` e `build` sem erros; sem warnings de hidratação no console.
- [ ] Nenhum hex de marca fora de `src/mocks/seed/` e `globals.css` (`grep`).
- [ ] Nenhum `<a href>` para rota interna (`grep`).
- [ ] Verificação manual: trocar evento, urna, sessão e relógio na toolbar e confirmar o efeito em duas rotas stub.
- [ ] Zip de entrega gerado.

---

## 9. Critérios de aceitação da Etapa 0

- [ ] Todos os estados relevantes são forçáveis pela toolbar.
- [ ] Os dois temas funcionam sem tocar em código, inclusive o escuro e sem logo.
- [ ] Navegar por `Link` mantém o estado; F5 volta ao seed.
- [ ] Serviços são assíncronos, com latência e erro simuláveis.
- [ ] O relógio simulado produz o mesmo HTML no servidor e no cliente.
- [ ] Todas as rotas da Fase 1 existem como stub.
- [ ] O contrato da Etapa 1 (seção 3.1) está integralmente atendido.

## 10. Pendências

- Lista final de fontes pré-aprovadas (pendência do DD); as três do CP3 são provisórias.
- Datas reais da Semana Tech para trocar os placeholders do seed (`T0` e janela).
- Se a toolbar ficará visível no deploy de demonstração da semana tech ou só no desenvolvimento.
- Como a Fase 2 persistirá o BD fake (arquivo JSON, SQLite local ou outro); a camada de serviços foi desenhada para não depender disso.
