# VaiVota — Fase 1 · Etapa 0: Fundação do protótipo

> **Rotas:** nenhuma tela nova (infraestrutura + rotas stub de todas as telas da Fase 1)
> **Depende de:** nada (primeira etapa)
> **Alimenta:** Etapas 1 a 9. Esta etapa é o **contrato do conjunto**: o que ela define vale para todas as outras.
> **Fontes:** `Login.md`, `Jurado.md`, `VotoInfantil.md`, `ModoApresentacao.md`, `Dashboard.md`, `schema.prisma`, `package.json`, `DocumentDesign.md` v1.1 (raiz do repositório; "DD" neste conjunto). A configuração do evento é a DD §7.6.
> **Status:** versão final consolidada, **revisão 2**. Substitui `Etapa0 Final.md` (rev. 1) e `Etapa0 Fundacao.md`. A rev. 2 incorpora as errata mínimas pedidas pelas Etapas 5, 6, 7 e 8 (Anexo C) e troca o gerenciador de pacotes para `pnpm` (D20). **Quem implementar a Etapa 0 já constrói o contrato corrigido:** os CP1 das Etapas 5 a 8 só conferem. **Revisão 3 (07/10/2026):** aplica as decisões do documento de pendências (itens A1–A9, B1, B3, C2, C3, C5, D1, D9, D11, D12, D15, D16, D19, E4, E5, E34; E1, E2 e E3 seguem pendentes). Lista no Anexo C, subseção "Revisão 3". **Revisão 4 (07/10/2026):** A1, A2/F-7, A3, A4, A5, A6, A7, A8, A9, E1, E2, E3, E21, E29 (e reflexos de F-4, F-5). Lista no Anexo C, subseção "Revisão 4".

---

## 1. Objetivo

Montar a base sobre a qual todas as telas da Fase 1 serão construídas: tema por tokens, tipos e dados seed, estado em memória, relógio simulado, camada de serviços, dev toolbar, componentes básicos, guarda de acesso e rotas stub.

Esta etapa precisa garantir:
- **Tudo é mock e some no F5**, mas a navegação entre telas mantém o estado.
- **Cada estado do sistema pode ser forçado** (evento, urna, sessão, tempo, módulos, cenários), porque quase toda tela muda conforme eles.
- **As telas só falam com seletores e serviços.** A trilha de produção (Prisma + Supabase; rev. 4, A2/A3) entra trocando o que há por trás, sem reescrever telas.
- **Um único contrato para as dez etapas:** tipos, nomes, donos de cada módulo compartilhado, dados seed e convenções (seção 3).

> **Vocabulário (rev. 3, A2):** "Fase 1/2/3" destes planners ≠ fases do DD §13 (Fundação, Maratona Tech Tivit, Endurecimento, Festival). Mapeamento: protótipo (Fase 1) ⊂ Fundação/Maratona Tech Tivit do DD; Endurecimento do DD não tem planner.
>
> **Vocabulário (rev. 4, A2/F-7):** a "Fase 2 = BD fake" **deixa de existir** (A3: não há BD fake). Onde estes planners diziam "Fase 2" (BD fake) ou "Fase 3" (Prisma + banco), leia-se **trilha de produção** (Prisma + Supabase). A reestruturação futura dos planners em **4 fases** (Demonstração, Maratona Tech Tivit, Festival, Final; DD §13 após F-7) substituirá a numeração Fase 1/2/3; até lá, "Fase 1" continua designando o protótipo.

## 2. Escopo

**Dentro**
- Configuração do projeto (Next.js, TypeScript, lint com fronteira de dados, aliases).
- Tipos de domínio espelhando o schema, utilitários puros e dados seed do núcleo.
- Sistema de tema (tokens CSS, política de contraste, fontes aprovadas).
- Store em memória, relógio simulado, transições de estado do evento e da urna, serviços assíncronos base.
- Dev toolbar extensível e mecanismo de cenários.
- Componentes básicos de UI, guarda de acesso, `AdminShell` mínimo e rotas stub de todas as telas.

**Fora**
- Qualquer tela real (Etapas 1 a 8).
- Apuração do resultado, seed de volume, CSV, QR Code (Etapas 6, 7 e 8).
- Persistência de qualquer tipo (trilha de produção; rev. 4, A3).
- Autenticação de verdade (a Etapa 3 faz o fluxo mockado; a real é Better Auth na trilha de produção, rev. 4, A5).
- Totem e voto infantil: o totem entra por planner próprio (rev. 4, A7, a escrever); até lá, `Dispositivo` e `VotoInfantil` são dados seed (**somente leitura**, para o dashboard).
- Entidade `CodigoPareamento`: entra com o planner "Totem" (rev. 4, A7, a escrever). Entidade `ConviteAdmin`: admins adicionais são criados por seed; a tela de convite de admin fica para depois (rev. 4, A9).

---

## 3. Contrato com as outras etapas

### 3.1 O que cada etapa recebe desta

| Etapa | Recebe da Etapa 0 |
|---|---|
| 1 Landing | Tokens `--tema-*` e utilitários Tailwind, `useEventoAtivo()`, `useAgora()`, `ContagemRegressiva`, `LogoEvento`, `ImagemCandidato`, `dominio/candidatos.ts`, `obterMetadadosEvento`, seed completo dos dois eventos, `Botao`/`Selo`/`Cartao`, rotas stub `/e/[slug]` e `/e/[slug]/convite`, `lang="pt-BR"` |
| 2 Evento | Layout `e/[slug]` com gate, grupo de rota `(participante)`, `useSessao()`, `resolverAcesso`, usuários e participações seed, toolbar com estado do evento, urna e "Entrar como", `Selo`, `Alerta` |
| 3 Login e Registro | `Resultado<T>` + `CodigoErro`, `entrarComo`/`sair`, `hashMock`, `lib/codigos.ts`, convites seed (todos os estados), `RotaGuard`, `Campo`/`Input`/`Abas`/`Dialogo`/`Toast`, stub de `verificar-email` (a tela de código; rev. 4, A5: não existe `recuperar-senha`) |
| 4 Candidato | `lib/aleatorio.ts` (embaralhar com semente), `dominio/candidatos.ts`, 8 candidatos votáveis por evento com casos de borda, placeholders de imagem, `Dialogo`, cenário `MUITOS_CANDIDATOS` (registrado pela Etapa 4) e `SEM_CANDIDATOS` (da Etapa 2) |
| 5 Votos | Tabelas `votos`, `votosJuri`, `historicoVotosJuri` sem vínculo indevido, `dev.falhaProxima`, `dev.vinculosVoto`, usuários jurado com e sem voto, `ui` extensível, `DialogoConfirmacao` |
| 6 Configuração | `store/transicoes.ts` (ativar, abrir, encerrar, concluir), `registrarAuditoria`, `contraste.ts`, `fontes.ts`, `lib/codigos.ts`, `Abas`, `Dialogo`, `DialogoConfirmacao`, `Toast`, `Campo`/`Input`/`Textarea`/`Select`/`Checkbox`, `AdminShell` mínimo, `redistribuirPesos` |
| 7 Dashboard | `useConsulta` (polling com pausa), `ResultadoOficial` e `DadosResultado` tipados, `congelarResultado` como ponto de extensão, `resultados` versionado, dispositivos seed, seed núcleo + metas do volume (seção 5.6), `AdminShell` |
| 8 Apresentação | `useAgora()` com deslocamento pela toolbar, regra de visibilidade da toolbar no palco, `ui.palcoAtivo`, grupo de rota `(painel)` já criado e `apresentar` fora dele, `RotaGuard`, `transicoes.encerrarUrna` |
| 9 Fechamento | Tudo acima como linha de base para auditar; lint de fronteira de dados já ativo; `SkipLink`, `LiveRegion` e `RotaGuard` já existentes |

### 3.2 Mapa de donos dos módulos compartilhados

Cada módulo tem **um** dono. Quem não é dono consome, e se precisar de mudança, ajusta o planner do dono.

| Módulo | Dono | Consumidores |
|---|---|---|
| Tipos de domínio, `Resultado<T>`, `CodigoErro`, mensagens padrão | Etapa 0 | todas (cada etapa pode acrescentar códigos em `servicos/resultado.ts`) |
| Store, relógio, transições (`ativarEvento`, `abrirUrna`, `encerrarUrna`, `concluirEvento`) | Etapa 0 | 6, 7, 8 |
| Tema: tokens, contraste, fontes, `TemaEvento` | Etapa 0 | todas |
| Formulário de tema e validação do que o admin escolhe | Etapa 6 | — |
| `lib/aleatorio.ts`, `lib/codigos.ts`, `lib/hash.ts`, `lib/formatar.ts`, `lib/tempo.ts` | Etapa 0 | 3, 4, 6, 7, 8 |
| `resolverAcesso`, `RotaGuard`, `AcessoRestrito`, `AdminShell` mínimo | Etapa 0 | 3 a 8 (a Etapa 9 só audita) |
| `Dialogo`, `DialogoConfirmacao`, `Toast`, `Abas`, `ContagemRegressiva`, `SkipLink`, `LiveRegion` | Etapa 0 | todas |
| `useConsulta` (leitura "de servidor" com polling) | Etapa 0 | 5, 7, 8 |
| Registro de cenários (mecanismo e `PADRAO`) | Etapa 0 | cada etapa registra os seus; a 9 consolida |
| `registrarAuditoria` (helper) | Etapa 0 | quem executa a ação auditável |
| `EventoShell`, `resolverVisaoEvento`, textos de estado (`lib/textosEstado.ts`) | Etapa 2 | 1, 3, 4, 5 |
| Serviços de autenticação, `MenuUsuario`, formulários de acesso | Etapa 3 | 2, 5 |
| `resolverEstadoVotar` (ordem da gate de `/votar`), lista, cartão, detalhe, ordem por semente (seletor) | Etapa 4 | 5 |
| Seleção, revisão, envio (`votarPopular`, `votarJuri`, `consultarEstadoVoto`), telas "já votou" e de erro | Etapa 5 | 4 |
| CRUD de candidatos, convites, placar, formulário de tema, Operação, `travas.ts`, `lib/csv.ts` | Etapa 6 | 7 |
| **Apuração** (`apurar`, `congelarResultado`), seed de volume, dashboard, exportação, relatório | Etapa 7 | 6, 8 |
| `montarRoteiro`, motor da revelação, palco, trailer, QR Code, ensaio | Etapa 8 | — |

### 3.3 Convenções do conjunto

**Estrutura dos planners.** Todos seguem o modelo do **Anexo A**: mesmas seções, mesma numeração e mesmo formato de checkpoint (`CP1`, `CP2`...).

**Regras de entrega (valem para todos os checkpoints de todas as etapas).**
- Cada checkpoint termina com `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` **sem erros** (D19).
- Função pura nova em `src/dominio/**` ou `src/lib/**` ganha teste Vitest ao lado do módulo (`*.test.ts`) no checkpoint em que é criada.
- Entrega em **zip cumulativo** `VaiVota-E{n}-CP{m}.zip`, sem `node_modules` nem `.next`.
- Só avança para o próximo checkpoint depois da validação do atual.
- Cada checkpoint registra o que foi feito, o que ficou fake e como validar.

**Código.**
- Domínio, componentes, rotas e textos em **português**; enums em `MAIUSCULAS`, idênticos aos do schema.
- Componentes e hooks de componente em `PascalCase.tsx`; módulos em `camelCase.ts`. Sem `kebab-case`.
- Datas em ISO 8601 com offset. Formatação sempre em pt-BR e no fuso do evento, via `lib/formatar.ts` e `lib/tempo.ts`.
- Rota interna só com `next/link` ou `useRouter`. Um `<a href>` comum para rota interna recarrega a página e perde o estado. Âncoras `#id` e links externos podem usar `<a>`.
- Nenhuma cor de marca (hex) nem classe de paleta solta fora de `src/mocks/seed/`, `globals.css` e `components/dev/`.

**Dependências aprovadas na Fase 1.** `lucide-react` (Etapa 0), `vitest` (Etapa 0, só como dependência de desenvolvimento; D19) e `qrcode.react` (Etapa 8). Gráficos em SVG próprio (Etapa 7). Qualquer outra exige decisão registrada.

---

## 4. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | **Estado único em memória, montado no `layout` raiz**, em um store externo com `useSyncExternalStore`, criado dentro do provider (uma instância por montagem, nunca singleton de módulo). | O layout raiz não remonta na navegação client-side, então `/`, `/e/[slug]` e o admin compartilham o estado. O store externo permite que serviços leiam o estado mais recente depois de um `await`. Sem singleton, não há vazamento entre requisições no SSR. |
| D2 | **Quatro blocos de estado:** `banco` (espelha as tabelas do schema), `sessao`, `ui` (transitório de tela) e `dev` (só existe no protótipo). O **relógio é um store à parte**. | Só o `banco` é trocado pelo banco real na trilha de produção (rev. 4, A2/A3). O tique de 1 s do relógio não pode invalidar quem lê o `banco`. |
| D3 | **Dois caminhos de leitura.** (a) Estado público do cliente (evento, tema, candidatos, sessão): **seletores**. (b) Dados que viriam do servidor (operação, resultado, voto do júri, "já votei?"): **serviços** assíncronos lidos com `useConsulta`. Escrita: sempre por serviços. | É a fronteira que a trilha de produção vai trocar (rev. 4, A2). **A camada `servicos/` é a fronteira de dados; não existe `repo.ts`.** |
| D4 | **Sigilo espelhado.** `votos` e `votosInfantis` não têm campo de usuário. `votosJuri` tem vínculo com a participação. Telas nunca leem `votos`, `votosJuri`, `historicoVotosJuri`, `votosInfantis` nem `resultados` diretamente: só `store/seletores/**` e `servicos/**`. Única exceção: `dev.vinculosVoto`, usado só pelo "Resetar meu voto" da toolbar. | Reproduz o desenho de `Login.md` e `Jurado.md` e evita vazar contagens por acidente. |
| D5 | **Todo serviço devolve `Promise<Resultado<T>>`**, simula latência global (`dev.latenciaMs`, padrão 400 ms) e pode falhar por rede simulada. Rejeição nunca muta o `banco`. | Força as telas a tratar loading, erro e duplo clique desde já, que é o contrato da API real. Uma latência só, para todas as etapas. |
| D6 | **Relógio simulado e determinístico.** O "agora" começa em `T0` e corre a partir dele. Seeds usam datas absolutas. `getServerSnapshot` devolve `T0`. | Evita hydration mismatch, permite pular no tempo e dispensa "só calcular depois de montado" nos componentes. |
| D7 | **Abertura da urna é sempre manual** (ação do admin ou toolbar). **Encerramento é automático** quando `encerramentoAutomatico` está ligado e `agora >= janelaFim`. Com ele desligado, a urna segue `ABERTA` e as telas mostram "Tempo esgotado, aguardando a organização". Contagem regressiva nunca muda estado por conta própria. **Confirmado no DD §9.2 (rev. 3, B1).** | Os campos do schema só preveem fechamento automático. Uma regra única evita desencontro entre relógio e toolbar. |
| D8 | **Transições de estado em um único módulo** (`store/transicoes.ts`), usado pelos serviços da Etapa 6, pelo relógio (fechamento automático) e pela toolbar (forçar estado). Encerrar a urna sempre chama `congelarResultado` e registra auditoria. | Elimina os três gatilhos divergentes de congelamento do resultado. |
| D9 | **Resultado oficial versionado**, como no schema. `resultados[]` guarda versões (`ENCERRAMENTO`, `DESQUALIFICACAO`, `CORRECAO`); telão, dashboard e exportação leem a **maior `versao`**. Nunca há recálculo silencioso: nova versão só por ação auditada. | O schema já prevê `versao` e `motivo`, e resolve "congelado" × "desqualificar depois de encerrar". "Refazer revelação" (Etapa 8) refaz a cerimônia, não o resultado. |
| D10 | **Tipos espelham o schema**, sem importar o Prisma, com enums em `MAIUSCULAS`. Só dois campos são mock-only (`Evento.local` e `Evento.linkSobre`), comentados `// mock-only`. **Rev. 3 (E34):** os dois passarão a ser campos de `Evento` no schema (F-5, mudança de schema a aprovar); continuam `// mock-only` até lá. **Rev. 4:** F-5 aprovada e aplicada no schema; no protótipo seguem `// mock-only` até a troca pelos tipos do Prisma. | Na trilha de produção (rev. 4, A2) os tipos podem ser trocados pelos do Prisma. |
| D11 | **`banco` normalizado por tabela** (arrays de entidades com `eventoId`). `EventoAtivo` é só uma **visão composta**, montada e memoizada dentro do hook, nunca dentro do seletor. | Mapeia 1:1 para linhas de BD (pedido da Etapa 9) e mantém referências estáveis. A chave de busca é `id`, então o slug pode ser renomeado. |
| D12 | **Convites guardam só o hash** (`hashMock`, não criptográfico, 64 hex). O código legível aparece uma vez na criação e, para os seeds, no README. | Espelha o desenho real e torna "os códigos não reaparecem" verdadeiro por construção. Hash assíncrono do navegador (`crypto.subtle`) falha em HTTP na rede local, então não é usado. |
| D13 | **Sessão por usuário; papel por participação no evento.** O papel é derivado. `ADMIN` é por evento e **não vota**. **Confirmado no DD §4 (papel por participação única por evento; rev. 3, B1).** A participação nunca nasce junto com o voto (rev. 3, C2): é criada no login/registro ou por `garantirParticipacao` (Etapa 3). | `schema.prisma` já modela `Participacao.papel` com `ADMIN`. Permite demonstrar "acesso negado entre eventos". |
| D14 | **Validade do slug resolvida no cliente**, por um gate em `e/[slug]/layout.tsx`. Não há `notFound()` de servidor para slug. O slug pode ser renomeado na Etapa 6. Metadata de servidor usa `servicos/metadados.ts` (lê o seed) e cai em título genérico para slug desconhecido. | O servidor não conhece o estado do cliente. |
| D15 | **Tema por tokens `--tema-*`. Sem dark mode automático.** Política de contraste: **nenhum texto do sistema fica abaixo de 4,5:1**. O texto sobre cor de marca é sempre derivado (claro ou escuro) e a cor de marca usada como texto passa por ajuste. Não existe `corSobrePrimaria`. | Fecha o conflito entre Etapas 0, 1, 2, 6 e 9. Efeitos no Festival: texto escuro sobre o laranja (≈5,3:1 no lugar de branco, 3,4:1) e verde ajustado quando usado como texto. **Decidido (rev. 4, E1):** texto escuro sobre o laranja; aprovação visual com a organização. |
| D16 | **Imagens de candidato:** `imagemUrl` aceita `placeholder:<n>` (componente desenha um cartaz com as cores do tema), caminho em `public/` (ex.: logo), `blob:` (prévia da Etapa 6) ou `null` (bloco de cor + inicial). Sem imagens remotas. **Rev. 3 (C5):** imagem é obrigatória para publicar (colocar na votação) e opcional em rascunho; `null` só ocorre em candidato não publicado. | Zero arquivos de imagem, tema-aware e sem hex no código. |
| D17 | **Toolbar extensível** (registro de seções), agindo sobre o **evento ativo** (o da rota ou `slugPadrao`), podendo forçar combinações que o fluxo real não permitiria. Visibilidade na seção 5.9. | As telas precisam se comportar em qualquer combinação. |
| D18 | **Instância única.** Não há sincronização entre abas, janelas ou dispositivos: nova aba ou F5 volta ao seed. Os roteiros de teste e de demo devem caber em **uma aba**. | Sem backend não há estado compartilhado; um canal entre abas daria falsa sensação de persistência. |
| D19 | **Testes automáticos com Vitest, só para funções puras (rev. 3).** `vitest` entra como dependência de **desenvolvimento** (versão fixada) e cobre apenas `src/dominio/**` e `src/lib/**`; os testes ficam ao lado do módulo (`*.test.ts`) e rodam com `pnpm test` (`vitest run`). Telas continuam verificadas por checklist manual e por `verificarInvariantes`. Esta etapa testa o que cria em `lib/` e `dominio/` (contraste, códigos, tempo, aleatório, acesso, invariantes). | Funções puras (apuração, códigos, contraste, acesso) são onde um erro silencioso custa mais e onde o teste é barato; restringir a `dominio/` e `lib/` mantém a Fase 1 enxuta. |
| D20 | **Gerenciador de pacotes: `pnpm`.** Comandos: `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm add <pacote>@<versão>` (versão fixada). O lockfile é o `pnpm-lock.yaml`. | O projeto é gerenciado com `pnpm` (informação do dono do projeto); o `package.json` não declara o campo `packageManager`, por isso o CP1 confere o lockfile. A versão anterior desta decisão escolhia `npm` por não ver essa informação; as Etapas 5 e 8 já citavam `pnpm` e estavam certas. |
| D21 | **Guarda de acesso central desde esta etapa** (`resolverAcesso` + `RotaGuard`). Voltar de um login usa `?de=<rota interna>`. | Evita cinco guardas diferentes para a Etapa 9 unificar depois. |

---

## 5. Modelo e regras

### 5.1 Estado e tipos

```ts
type EstadoApp = {
  banco: Banco                         // espelha o schema; só ele é trocado pelo banco real na trilha de produção (rev. 4)
  sessao: { usuarioId: string | null }
  ui: EstadoUi                         // transitório de tela; as etapas 4, 5 e 8 estendem
  dev: EstadoDev                       // só existe no protótipo
}

type Banco = {
  sequencias: { voto: number; historicoVotoJuri: number; votoInfantil: number; auditoria: number }
  eventos: Evento[]
  temas: Tema[]                        // 1:1 com evento (eventoId)
  configsPlacar: ConfigPlacar[]
  configsApresentacao: ConfigApresentacao[]
  camposCandidato: CampoCandidato[]
  candidatos: Candidato[]
  usuarios: Usuario[]
  participacoes: Participacao[]
  convitesJurado: ConviteJurado[]
  votos: Voto[]
  votosJuri: VotoJuri[]
  historicoVotosJuri: HistoricoVotoJuri[]
  dispositivos: Dispositivo[]
  votosInfantis: VotoInfantil[]
  resultados: ResultadoOficial[]
  auditoria: Auditoria[]
}

type EstadoUi = {
  palcoAtivo: boolean                  // Etapa 8 liga; a toolbar lê
  apresentacao: EstadoUiApresentacao   // tipo definido pela Etapa 8 (seção 5.2 dela); valor inicial: tudo nulo, modoSala "REAL"
  // demais campos acrescentados pelas Etapas 4 e 5 (todos transitórios)
}

type EstadoDev = {
  slugPadrao: string                   // evento exibido em "/" e fallback de useEventoAtivo (inicial: "ver-e-fazer-filmes")
  latenciaMs: 0 | 400 | 1500
  simularErroRede: boolean             // persistente: todo serviço devolve REDE
  falhaProxima: ModoFalha              // pontual: vale para o próximo serviço que a suporta
  simularVotosEntrando: boolean        // lógica na Etapa 7; usada por 7 e 8
  toolbarModo: "AUTO" | "OCULTA" | "FORCADA"
  toolbarRecolhida: boolean
  vinculosVoto: Record<string, number> // chave `${usuarioId}:${eventoId}` → Voto.id (o mesmo usuário vota nos dois eventos); só para "Resetar meu voto"; nunca lido por telas
  simularTrailerFalha: boolean         // Etapa 8 usa; valor inicial: false
}
```

**Tipos de domínio** (`src/dominio/tipos.ts`): `Evento`, `Tema`, `ConfigPlacar`, `ConfigApresentacao`, `CampoCandidato`, `Candidato`, `Usuario`, `Participacao`, `ConviteJurado`, `Voto`, `VotoJuri`, `HistoricoVotoJuri`, `Dispositivo`, `VotoInfantil`, `ResultadoOficial` e `Auditoria`, com **os mesmos nomes de campo do schema** (camelCase).

```ts
type Instante = string                 // ISO 8601 com offset: "2026-10-22T13:00:00-03:00"

type EstadoEvento = "RASCUNHO" | "ATIVO" | "CONCLUIDO"
type EstadoUrna = "NAO_INICIADA" | "ABERTA" | "ENCERRADA"
type MetodoIdentificacao = "GOOGLE_OU_EMAIL" | "SOMENTE_GOOGLE" | "SOMENTE_EMAIL"
type PapelParticipacao = "PUBLICO" | "JURADO" | "ADMIN"
type EstadoConvite = "DISPONIVEL" | "USADO" | "REVOGADO"   // "expirado" é derivado: DISPONIVEL com validadeAte < agora
type EstadoDispositivo = "ATIVO" | "PAUSADO" | "REVOGADO"
type RegraDesempate = "JURI" | "PUBLICO"
type ModoAvanco = "AUTOMATICO" | "MANUAL"

type Grupo = "POPULAR" | "JURI" | "INFANTIL"                // domínio; não existe no schema
type MotivoResultado = "ENCERRAMENTO" | "DESQUALIFICACAO" | "CORRECAO"

// Catálogo único de ações de auditoria (A12 do Contexto). `Auditoria.acao` é string no schema; no protótipo é esta união.
// Quem acrescenta uma ação nova edita esta lista e o catálogo de exibição da Etapa 7.
type AcaoAuditoria =
  // Etapa 0 (transições) e Etapa 3 (convites)
  | "EVENTO_ATIVADO" | "URNA_ABERTA" | "URNA_ENCERRADA" | "EVENTO_CONCLUIDO"
  | "CONVITE_RESGATADO" | "TENTATIVA_CODIGO_INVALIDA" | "BLOQUEIO_RATE_LIMIT"
  // Etapa 5 (voto do júri; nunca a escolha do voto popular ou infantil)
  | "VOTO_JURI_REGISTRADO" | "VOTO_JURI_ALTERADO"
  // Etapa 6 (configuração)
  | "CONFIG_ALTERADA" | "TEMA_ALTERADO" | "CONVITES_GERADOS" | "CONVITE_REVOGADO"
  | "CANDIDATO_DESQUALIFICADO" | "CANDIDATO_CORRIGIDO"
  // Etapa 7 (exportação)
  | "EXPORTACAO_CSV" | "RELATORIO_GERADO"
  // Etapa 8 (telão; só no modo real)
  | "REVELACAO_INICIADA" | "REVELACAO_CONCLUIDA" | "REVELACAO_REFEITA" | "EMERGENCIA_ACIONADA"

// Quem encerrou a urna; vai em `detalhes` da auditoria `URNA_ENCERRADA`.
type OrigemEncerramento = "MANUAL" | "AUTOMATICO" | "TOOLBAR" | "FALHA_SIMULADA"
//   MANUAL = admin, na seção Operação da Configuração (Etapa 6) · AUTOMATICO = relógio (janelaFim)
//   TOOLBAR = dev toolbar (`forcarEstadoUrna`) · FALHA_SIMULADA = modo `URNA_ENCERRA` de `ModoFalha` (Etapa 5)

// ResultadoOficial = campos do schema (id, eventoId, versao, motivo, pesoPopular, pesoJuri,
// pesoInfantil, dados, calculadoPorId, calculadoEm). Conteúdo de `dados`:
type DadosResultado = {
  criterioDesempate: RegraDesempate
  totais: Record<Grupo, number>
  placares: Record<Grupo, { candidatoId: string; votos: number }[]>
  ranking: {
    candidatoId: string; pontuacao: number; posicao: number
    pontosPorGrupo: Record<Grupo, number> // rev. 3 (D16): contribuição de cada grupo para a pontuação
  }[]
  desqualificados: string[]            // rev. 3 (D16): candidatoIds fora da disputa
  pesosEfetivos: Record<Grupo, number> // rev. 3 (D16, C3): pesos após redistribuir os grupos ligados com base 0
  categorias: {
    grupo: Grupo
    vencedores: { candidatoId: string; votos: number }[]
    desempatadoPorPontuacao: boolean
  }[]
  empates: {
    posicoes: number[]                 // trecho disputado, ex.: [2, 3]
    candidatoIds: string[]
    criterioAplicado: RegraDesempate
    resolvido: boolean                 // false = posição compartilhada
    vencedorId?: string
  }[]
}
```

`pontosPorGrupo`, `desqualificados` e `pesosEfetivos` são preenchidos por `apurar` no congelamento (Etapa 7); o CSV (`pontos_*`) e "fora da disputa" leem daí, sem recalcular.

**Diferenças deliberadas em relação ao schema**

| Schema | Protótipo |
|---|---|
| `Int` (pesos, sem decimais; rev. 4, F-4) | `number` (inteiro) |
| `DateTime` | `Instante` (string ISO) |
| `Json` (`camposExtras`, `textosEstado`, `dados`, `detalhes`) | Tipos próprios (`Record<string, string>`, `TextosEstado`, `DadosResultado`...) |
| `Char(36)` UUID | `string`. Seeds usam ids legíveis (`usr-ana`, `cand-st-01`); registros novos usam `crypto.randomUUID()` dentro de serviços |
| `Int @default(autoincrement())` | `number`, com contador em `banco.sequencias` |
| Hashes (`hashCodigo`, `hashToken`, `hashRecibo`, `hashPin`) | `hashMock(...)` |
| `Evento.local`, `Evento.linkSobre` | **mock-only**, só no seed (irão para o schema: F-5, E34) |

`TextosEstado` é um `Partial<Record<"NAO_INICIADA" | "ENCERRADA" | "JA_VOTOU" | "SUCESSO", { titulo: string; corpo: string }>>`. A Etapa 2 pode estender as chaves.

### 5.2 Serviços, erros e leitura

```ts
type Resultado<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: { codigo: CodigoErro; mensagem: string; detalhe?: string } }  // detalhe só vai ao console
```

| Família | `CodigoErro` |
|---|---|
| Genéricos | `VALIDACAO`, `NAO_ENCONTRADO`, `NAO_AUTORIZADO`, `CONFLITO`, `REDE`, `ERRO_INTERNO` |
| Autenticação | `CREDENCIAIS_INVALIDAS`, `EMAIL_NAO_VERIFICADO`, `CADASTRO_NAO_CONCLUIDO` |
| Convite | `CODIGO_INVALIDO`, `CODIGO_USADO`, `CODIGO_REVOGADO`, `CODIGO_EXPIRADO`, `LIMITE_TENTATIVAS`, `JA_VOTOU_COMO_PUBLICO`, `JA_E_JURADO` |
| Estado do evento | `EVENTO_INDISPONIVEL`, `EVENTO_CONCLUIDO`, `URNA_NAO_ABERTA`, `URNA_ENCERRADA`, `RESULTADO_INDISPONIVEL`, `TRAVADO` |
| Voto | `JA_VOTOU`, `PAPEL_INVALIDO`, `CANDIDATO_INDISPONIVEL` |

**Rev. 4 (A5):** sem senha, `CREDENCIAIS_INVALIDAS` passa a significar **código de login incorreto** ("Código incorreto ou expirado."). Nenhum código novo e nenhum removido: o total de `CodigoErro` continua **26**.

```ts
type ModoFalha =
  | "NENHUMA" | "REDE_NAO_GRAVOU" | "REDE_GRAVOU" | "URNA_ENCERRA"
  | "JA_VOTOU_OUTRA_SESSAO" | "ERRO_INTERNO"
```

**Regras dos serviços**
1. Todo serviço é `async`, começa com `atraso()` e `simularFalha()` e valida **antes** de qualquer `atualizar`.
2. Lê `store.getState()` de novo depois de cada `await`.
3. `simularFalha(opcoes?: { consumirPontual?: boolean })` (padrão `true`) trata `simularErroRede` (persistente) e os modos `REDE_NAO_GRAVOU` e `ERRO_INTERNO` (pontuais). Com `{ consumirPontual: false }` ela **obedece só `simularErroRede`** e não toca em `falhaProxima`: é o que as **leituras de servidor** usam (por exemplo `consultarEstadoVoto`), para não gastar a falha que era do próximo envio. Os demais modos (`REDE_GRAVOU`, `URNA_ENCERRA`, `JA_VOTOU_OUTRA_SESSAO`) são interpretados pelos serviços de voto (Etapa 5). `consumirFalhaProxima()` devolve o modo e volta a `NENHUMA`.
4. Mensagens ao usuário são genéricas e vêm de `servicos/mensagens.ts` (código → texto pt-BR). O detalhe vai só para o console, com prefixo `[mock:log]`.
5. Ação auditável chama `registrarAuditoria(estado, { eventoId, usuarioId, acao: AcaoAuditoria, entidade, entidadeId?, detalhes?, ipHash?, criadoEm? })`, pura sobre o estado. Sem `criadoEm`, usa o relógio simulado; com ele (seed de volume da Etapa 7), grava o instante pedido. **Nunca** se registra a escolha de voto popular ou infantil.
6. Leitura "de servidor" usa `useConsulta(consulta, { intervaloMs?, ativo? })`, que devolve `{ dados, erro, carregando, atualizadoEm, recarregar }`. O polling pausa com a aba oculta (`visibilitychange`) e nunca acumula timers.

### 5.3 Relógio e transições

**Relógio** (`store/relogio.ts`, store próprio): `T0 = 2026-10-22T14:00:00-03:00`.
- `useAgora(): number` devolve o instante simulado em ms. No servidor e durante a hidratação vale `T0`, então **componentes que leem `useAgora()` não precisam de gate de montagem**.
- Ações: `avancar(ms)`, `irPara(ms)`, `pausar()`, `retomar()`, `reiniciar()` (volta a `T0`).
- `Date.now()` e `performance.now()` só aparecem em `relogio.ts`. Componentes nunca leem o tempo real.
- O provider mantém um tique de 1 s. A cada tique, para **todo** evento com urna `ABERTA`, `encerramentoAutomatico` ligado e `agora >= janelaFim`, chama `transicoes.encerrarUrna(eventoId, { origem: "AUTOMATICO" })`.

**Transições** (`store/transicoes.ts`, funções puras sobre o estado):

| Transição | Disparada por | Efeitos |
|---|---|---|
| `ativarEvento` (`RASCUNHO` → `ATIVO`) | Etapa 6, toolbar | auditoria `EVENTO_ATIVADO` |
| `abrirUrna` (`NAO_INICIADA` → `ABERTA`) | Etapa 6, toolbar | `urnaAbertaEm = agora`; auditoria `URNA_ABERTA` |
| `encerrarUrna` (`ABERTA` → `ENCERRADA`) | Etapa 6, relógio, toolbar | `urnaEncerradaEm = agora`; `congelarResultado` (versão 1, motivo `ENCERRAMENTO`); auditoria `URNA_ENCERRADA` com `origem: OrigemEncerramento` (obrigatória: `MANUAL`, `AUTOMATICO`, `TOOLBAR` ou `FALHA_SIMULADA`) |
| `concluirEvento` (→ `CONCLUIDO`) | Etapa 6, toolbar | `concluidoEm = agora`; auditoria `EVENTO_CONCLUIDO` |
| `forcarEstadoUrna` / `forcarEstadoEvento` | só toolbar | Para frente, reaproveita as transições acima. **Para trás** (ex.: `ENCERRADA` → `ABERTA`): limpa `urnaEncerradaEm`, descarta `resultados` do evento e **zera `ui.apresentacao`** (o progresso de revelação). `resetarMock` e `aplicarCenario` também zeram `ui.apresentacao`. Só existe no protótipo. |

`congelarResultado` é um **ponto de extensão**: na Etapa 0 é um stub em `dominio/resultado.ts` que não faz nada; a Etapa 7 implementa. A **assinatura já é a final**, para a Etapa 7 só trocar o corpo:

```ts
congelarResultado(
  estado: EstadoApp, eventoId: string, motivo: MotivoResultado,
  opcoes?: { calculadoPorId?: string | null; calculadoEm?: Instante }   // sem calculadoEm, usa o relógio simulado
): EstadoApp                                                              // pura; o stub devolve o mesmo estado
```

`ResultadoOficial.calculadoPorId` aceita `null` (encerramento pelo relógio não tem usuário). `transicoes.encerrarUrna` passa `motivo: "ENCERRAMENTO"` e, como `calculadoPorId`, o usuário da sessão quando houver.

**Módulos.** `alternarModulo` (só toolbar) ao **desligar** um módulo zera o peso do grupo e redistribui o restante proporcionalmente, mantendo a soma em 100 (`dominio/placar.ts`, `redistribuirPesos`). Ao **ligar**, o peso permanece 0 e o admin ajusta na Etapa 6.

### 5.4 Sessão, papéis e acesso

`useSessao()` devolve:

```ts
{
  logado: boolean                      // false = visitante
  usuario: Usuario | null
  emailVerificado: boolean
  participacao: Participacao | null    // no evento ativo
  papel: PapelParticipacao | null      // null = visitante ou logado sem participação
  jaVotou: boolean                     // participacao.votou
}
```

- A participação é criada no login do evento (`Login.md`, passo 3) ou, para quem já tem sessão e chega a outro evento, por `garantirParticipacao` (Etapa 3). **Nunca nasce junto com o voto** (rev. 3, C2). Davi (seed) não tem participação até a Etapa 3 criá-la.
- **Admin não vota** (`/votar` mostra "Administradores não votam", com link para o painel). Confirmado no DD §4 (rev. 3, B1).
- `resolverAcesso(exigencia, contexto)` (função pura em `dominio/acesso.ts`) devolve `{ ok: true }` ou `{ ok: false, motivo }`:

| Exigência | Motivo de negação | Comportamento do `RotaGuard` |
|---|---|---|
| `LOGADO` | `DESLOGADO` | Redireciona para `/e/{slug}?de={rotaAtual}` |
| `EMAIL_VERIFICADO` | `EMAIL_NAO_VERIFICADO` | Redireciona para `/e/{slug}/verificar-email?de={rotaAtual}` (rev. 3, D1), que é a **tela de código** (rev. 4, A5) |
| `PAPEL` (lista de papéis) | `PAPEL_INSUFICIENTE` | Mostra `AcessoRestrito`, **sem nenhum dado da tela** |

`?de=` só aceita caminho interno (começa com `/` e não com `//`). Admin de outro evento cai em `PAPEL_INSUFICIENTE`, porque a participação `ADMIN` é por evento.

### 5.5 Tema

| Token CSS | Origem |
|---|---|
| `--tema-primaria`, `--tema-secundaria`, `--tema-fundo`, `--tema-texto` | `Tema` do evento |
| `--tema-sobre-primaria`, `--tema-sobre-secundaria` | `corTextoSobre(cor)`: claro ou escuro, o de maior contraste |
| `--tema-primaria-texto`, `--tema-secundaria-texto` | `corLegivelSobre(cor, fundo, texto)`: a cor ajustada (mistura gradual com o texto) até atingir 4,5:1 sobre o fundo. Para uso como texto, link ou ícone |
| `--tema-superficie`, `--tema-borda`, `--tema-texto-suave` | Derivados com `color-mix` entre fundo e texto, com proporções que mantêm 4,5:1 (conferido no CP4) |
| `--tema-foco` | Primária, ou texto se a primária tiver menos de 3:1 contra o fundo |
| `--tema-fonte` | Fonte aprovada do evento |
| `color-scheme` | `dark` se a luminância do fundo for baixa, senão `light` |

- **Política (D15):** o texto sobre primária e secundária é sempre derivado. A Etapa 6 valida o que o admin escolher: **texto × fundo < 4,5:1 bloqueia**; primária ou secundária × fundo < 3:1 gera **aviso**.
- `Dialogo` e demais overlays **não usam portal fora do `TemaEvento`**, para herdar os tokens.
- A toolbar fica fora do `TemaEvento`, com visual neutro.
- Fontes aprovadas: Inter, Poppins e Space Grotesk, via `next/font/google`. `FONTES_APROVADAS` é a lista que o formulário da Etapa 6 usa. **Rev. 4 (E2):** a lista é uma configuração que o dono do produto personaliza depois; a troca de fonte no Tema continua.

### 5.6 Dados seed

**Eventos**

| | Maratona Tech Tivit | 9º Festival Ver e Fazer Filmes |
|---|---|---|
| `id` / `slug` | `evt-maratona-tech-tivit` / `maratona-tech-tivit` | `evt-ver-e-fazer-filmes` / `ver-e-fazer-filmes` |
| Estado / urna | `ATIVO` / `ABERTA` | `ATIVO` / `NAO_INICIADA` |
| Janela (`America/Sao_Paulo`) | 22/10/2026, 13h às 17h; `urnaAbertaEm` = 13h | 25/11/2026 10h a 28/11/2026 20h |
| `encerramentoAutomatico` | `true` | `true` |
| Módulos | Júri ligado, infantil desligado | Júri e infantil ligados |
| `ConfigPlacar` | 70 / 30 / 0, desempate `JURI` | 50 / 30 / 20, desempate `JURI` |
| `bloquearVotoProprio` / `metodoIdentificacao` | `true` / `GOOGLE_OU_EMAIL` | `true` / `GOOGLE_OU_EMAIL` |
| Tema | Escuro: fundo `#0F172A`, texto `#E2E8F0`, primária `#38BDF8`, secundária `#A78BFA`; fonte Space Grotesk; **sem logo** | Claro: primária `#F15A29`, secundária `#8DC63F`, fundo `#FFFFFF`, texto `#18181B`; fonte Inter; logo `.webp` atual (`public/`) |
| Rótulos | Projeto / Projetos | Curta / Curtas |
| Campos extras | `equipe` (Equipe), `tecnologias` (Tecnologias) | `direcao` (Direção), `duracao` (Duração) |
| `textosEstado` | Ausente (testa o fallback padrão) | Textos próprios para `NAO_INICIADA`, `ENCERRADA`, `JA_VOTOU`, `SUCESSO` |
| `ConfigApresentacao` | Sem `trailerUrl` (testa o trailer gerado); rótulos de categoria próprios ("Favorito da comunidade", "Escolha da banca") | `trailerUrl` válido (placeholder); rótulos padrão do schema |
| `avisoPrivacidadeUrl` | Ausente | Placeholder externo |
| `local` (mock-only) | "Cataguases · MG" (placeholder) | "Cataguases · MG" |
| `linkSobre` (mock-only) | Ausente | `https://festivalverefazerfilmes.org.br/` |
| `descricao` | Texto fictício curto | Reaproveitar o texto atual da landing |

As datas da Maratona Tech Tivit são **placeholders** dentro da semana real: **rev. 4 (E3)** — a Maratona Tech Tivit acontece na semana de 18/10/2026; o seed (22/10/2026, 13h–17h) fica dentro dela; dia e horário exatos ainda a confirmar.

**Aviso de privacidade (rev. 4, E29):** a controladora dos dados é a **VaiVota**; o aviso de privacidade é **da plataforma** (texto único, link no registro e no rodapé, sempre). `avisoPrivacidadeUrl` do evento é **opcional e complementar** (aviso próprio do evento, se houver): a Maratona Tech Tivit segue sem ele e o Festival com o placeholder.

**Candidatos** (títulos e descrições fictícios; imagens por D16)

| | Maratona Tech Tivit (`cand-st-01..10`) | Festival (`cand-fv-01..08`) |
|---|---|---|
| Votáveis (publicados e não desqualificados) | **8** (01 a 08) | **6** (01 a 06) |
| Rascunho (`publicado: false`) | 09 | 07 |
| Desqualificado (`publicado: true`, `desqualificado: true`) | 10 | 08 |
| Sem imagem (`imagemUrl: null`; só rascunho, rev. 3 C5) | 09 | 07 |
| Título com mais de 100 caracteres | 06 | 05 |
| Descrição de uma linha | 07 | 06 |
| Vinculado a Gabi (`usuarioVinculadoId`) | 08 | 03 |
| Campo extra sem valor | 02 (sem `tecnologias`) | 02 (sem `duracao`) |

**Rev. 3 (C5):** todo candidato publicado tem imagem (`placeholder:<n>` ou caminho de `public/`); `cand-st-03` e `cand-fv-04`, que antes eram o caso "sem imagem", passam a ter `placeholder:<n>`. O caso `imagemUrl: null` fica nos rascunhos `cand-st-09` e `cand-fv-07`. Nenhum voto nem fixture muda (rascunhos não têm votos).

**Usuários e participações** (login por código: `123456`; rev. 4, A5: não existe senha)

| Usuário | E-mail | Participações | Serve para testar |
|---|---|---|---|
| Ana Souza | `publico@demo.com` | Maratona Tech Tivit: `PUBLICO`, verificado, não votou | Fluxo feliz de voto |
| Bruno Lima | `jurado@demo.com` | Maratona Tech Tivit: `JURADO` (convite `H4TR-9WNB`), não votou | Voto do júri |
| Carla Mendes | `admin@demo.com` | `ADMIN` nos dois eventos | Telas de admin |
| Davi Rocha | `naoverificado@demo.com` | Nenhuma; e-mail **não verificado** (rev. 4: cadastro iniciado, código nunca confirmado) | Bloqueio por verificação; tela de código |
| Eva Santos | `votou@demo.com` | Maratona Tech Tivit: `PUBLICO`, **já votou** (1 `Voto`) | "Já votou"; bloqueio de resgate de convite |
| Fábio Nunes | `jurado.votou@demo.com` | Maratona Tech Tivit: `JURADO` (convite `F3WJ-8RNK`), com `VotoJuri` e 1 entrada de histórico | "Seu voto atual"; alterar voto |
| Gabi Torres | `equipe@demo.com` | Maratona Tech Tivit: `PUBLICO`; candidata vinculada nos dois eventos | Bloqueio de voto em si mesma |
| Hugo Pires | `admin.festival@demo.com` | Festival: `ADMIN` | Acesso negado entre eventos |

**Convites de jurado** (alfabeto `23456789ABCDEFGHJKMNPQRSTUVWXYZ`, sem 0/O, 1/I/L; formato `XXXX-XXXX`; comparação sem diferenciar maiúsculas e ignorando o hífen)

| Evento | Código | Estado | Rótulo |
|---|---|---|---|
| Maratona Tech Tivit | `K7M3-QX9P` | `DISPONIVEL` | Jurado 2 |
| Maratona Tech Tivit | `H4TR-9WNB` | `USADO` (Bruno) | Jurado 1 |
| Maratona Tech Tivit | `F3WJ-8RNK` | `USADO` (Fábio) | Jurado 3 |
| Maratona Tech Tivit | `P8CD-2VXF` | `REVOGADO` | — |
| Maratona Tech Tivit | `M6ZQ-4KTA` | `DISPONIVEL` com `validadeAte` anterior a `T0` (**expirado**) | — |
| Festival | `R5HN-7DCW`, `T9VB-3JXG` | `DISPONIVEL` | Jurado A, Jurado B |

**Dispositivos (Festival, somente leitura; dados seed até o planner "Totem", rev. 4, A7):** "Totem Hall" (`ATIVO`), "Totem Pátio" (`PAUSADO`), "Totem Oficinas" (`REVOGADO`), sem votos até um cenário de volume.

**Votos do núcleo (Maratona Tech Tivit):** 1 `Voto` (o de Eva, registrado em `dev.vinculosVoto`) e 1 `VotoJuri` (o de Fábio). O Festival não tem votos.

**Metas do seed de volume** (implementado na Etapa 7 **sobre** o núcleo, sem alterar ids nem fatos do núcleo; os invariantes continuam verdes)

| Meta (Maratona Tech Tivit em `T0`) | Valor |
|---|---|
| Participações `PUBLICO` + `JURADO` | 520 (511 públicas, 9 jurados) |
| Votos populares | 412 (= participações `PUBLICO` com `votou`), com `criadoEm` entre `urnaAbertaEm` e `T0` e pico por volta de 2/3 do período |
| Jurados | 9 convidados: 7 votaram (Fábio + 6), 2 pendentes (Bruno + 1) |
| Convites | 12: 9 usados, 1 revogado, 1 disponível, 1 expirado |
| Auditoria | cerca de 25 entradas |
| Infantil (só Festival, em cenário de volume) | 138 votos em 3 totens |
| Resultado | um empate resolvido pelo critério (2º e 3º) e um que persiste (ex.: 6º), via cenários da Etapa 8 |

**Relógio:** `T0 = 22/10/2026 14:00 (-03:00)`, uma hora dentro da janela da Maratona Tech Tivit (faltam 3 h) e cerca de 34 dias antes do Festival.

### 5.7 Invariantes

`verificarInvariantes(estado): string[]` (`dominio/invariantes.ts`) devolve a lista de violações; o inspetor da toolbar a exibe. Deve ser vazia no estado inicial e **depois de cada ação da toolbar e de cada serviço**.

1. Slugs únicos; uma participação por `(usuarioId, eventoId)`.
2. Os pesos configurados (`ConfigPlacar`) somam 100 por evento, e módulo desligado tem peso 0. (Não confundir com `DadosResultado.pesosEfetivos`, que é o peso depois da redistribuição da Etapa 7; rev. 3, C3.)
3. Nº de `Voto` do evento = nº de participações `PUBLICO` com `votou = true`.
4. Nº de `VotoJuri` do evento = nº de participações `JURADO` com `votou = true`, e cada `VotoJuri` tem ao menos 1 entrada de histórico.
5. Todo voto aponta para candidato do **mesmo evento** (espelha as FKs compostas). Vale também para cada entrada de `historicoVotosJuri` (candidato anterior e novo; rev. 3, D9).
6. Convite `USADO` tem `participacaoId` de uma participação `JURADO` do mesmo evento.
7. `resultados` do evento têm `versao` única e sequencial; urna `ENCERRADA` tem ao menos uma (checado a partir da Etapa 7).
8. Candidato publicado (`publicado: true`) tem `imagemUrl` não nulo (rev. 3, C5).

### 5.8 Cenários

```ts
type Cenario = {
  id: string
  nome: string
  grupo: "DADOS" | "ESTADO" | "RESULTADO"
  descricao: string
  aplicar: (atual: EstadoApp) => EstadoApp   // pura; a toolbar troca o estado pelo retorno
}
```

A Etapa 0 entrega o mecanismo (`mocks/cenarios.ts`) e `PADRAO` (`criarEstadoInicial()`, que na Etapa 0 é só `criarEstadoNucleo()`; a Etapa 7 passa a compor núcleo + volume). Cada etapa registra os seus; a Etapa 9 só consolida e valida a lista.

| Cenário | Registrado por |
|---|---|
| `PADRAO` | Etapa 0 |
| `SEM_ENCERRAMENTO_AUTOMATICO` (`encerramentoAutomatico = false` nos dois eventos; permite testar "Tempo esgotado") | Etapa 1 |
| `SEM_CANDIDATOS` | Etapa 2 |
| `SOMENTE_GOOGLE`, `SOMENTE_EMAIL` (`metodoIdentificacao` do evento ativo) | Etapa 3 |
| `MUITOS_CANDIDATOS` (24), `VOTO_PROPRIO_PERMITIDO` (`bloquearVotoProprio = false`) | Etapa 4 |
| `RASCUNHO_INCOMPLETO`, `RASCUNHO_PRONTO`, `URNA_ENCERRADA`, `EVENTO_CONCLUIDO` | Etapa 6 |
| `FESTIVAL_ENCERRADO` (volume infantil) | Etapa 7 |
| `RESULTADO_PADRAO`, `RESULTADO_EMPATE_RESOLVIDO`, `RESULTADO_EMPATE_PERSISTENTE`, `RESULTADO_CO_VENCEDORES`, `RESULTADO_SEM_INFANTIL`, `RESULTADO_DOIS_CANDIDATOS` | Etapa 7 (os 6 cenários de apuração; rev. 3, D11) |
| `FESTIVAL_EMPATE_RESOLVIDO`, `FESTIVAL_EMPATE_PERSISTENTE`, `FESTIVAL_CO_VENCEDORES` | Etapa 8 |

Total: **21 cenários** (rev. 3, D12; a Etapa 9 confere a lista por nome).

### 5.9 Dev toolbar

| Controle | Efeito |
|---|---|
| Evento | Troca `dev.slugPadrao` (e o tema, em `/` e fora de `/e/[slug]`) |
| Estado do evento | Rascunho, Ativo, Concluído (`forcarEstadoEvento`) |
| Urna | Não iniciada, Aberta, Encerrada (`forcarEstadoUrna`) |
| Sessão | Deslogado ou "Entrar como" um dos oito usuários seed |
| Usuário atual | E-mail verificado liga/desliga |
| Módulos | Liga/desliga júri e infantil (`alternarModulo`) |
| Relógio | +15 min, +1 h, "Reta final" (faltando `limiarRetaFinalSegundos` − 60 s, mínimo 30 s), "Fim da janela", pausar/retomar, voltar a `T0` |
| Latência | 0, 400 ou 1500 ms |
| Erro de rede | Liga/desliga a falha persistente |
| Falha no próximo envio | Escolhe o `ModoFalha` pontual |
| Cenários | Lista do registro + "Aplicar" |
| Resetar mock | Volta ao seed, inclusive sessão e relógio |
| Inspetor | Painel com o JSON do estado e o resultado de `verificarInvariantes` |
| Seções das etapas | Votação (Etapa 5), Dashboard (Etapa 7), Apresentação (Etapa 8), adicionadas ao registro de seções sem tocar no núcleo |

**Visibilidade.** Controlada por `NEXT_PUBLIC_DEV_TOOLBAR` (padrão `true` na Fase 1, inclusive em build de produção).
- `toolbarModo = "AUTO"`: visível, **exceto** enquanto `ui.palcoAtivo` (telão).
- `?toolbar=0` grava `OCULTA`.
- `Alt+D` alterna: visível → `OCULTA`; oculta → `FORCADA` (visível mesmo no palco). Assim a validação da Etapa 8 continua possível sem sujar o telão.
- Com a variável em `false`, a toolbar não existe nem responde a `Alt+D`.

---

## 6. Estrutura de arquivos

```
src/
├── app/
│   ├── layout.tsx                          # lang pt-BR, AppProvider, TemaEvento, SkipLink, LiveRegion, DevToolbar
│   ├── globals.css                         # tokens, @theme inline, foco visível, reduced-motion
│   ├── page.tsx                            # landing (Etapa 1)
│   ├── dev/ui/page.tsx                     # galeria de componentes (só com a flag da toolbar)
│   └── e/[slug]/
│       ├── layout.tsx                      # servidor; renderiza o GateEvento (cliente): slug válido ou EventoNaoEncontrado
│       ├── (participante)/
│       │   ├── layout.tsx                  # EventoShell (Etapa 2)
│       │   ├── page.tsx                    # /e/[slug]                    (Etapas 2 e 3)
│       │   ├── convite/page.tsx            #                              (Etapa 3)
│       │   ├── verificar-email/page.tsx    # tela de código (rev. 4, A5)  (Etapa 3)
│       │   └── votar/page.tsx              #                              (Etapas 4 e 5)
│       └── admin/
│           ├── (painel)/
│           │   ├── layout.tsx              # RotaGuard(ADMIN) + AdminShell
│           │   ├── page.tsx                # dashboard                    (Etapa 7)
│           │   ├── configuracao/page.tsx   #                              (Etapa 6)
│           │   └── relatorio/page.tsx      #                              (Etapa 7)
│           └── apresentar/page.tsx         # fora do AdminShell; RotaGuard próprio (Etapa 8)
├── components/
│   ├── ui/                                 # Botao, Campo, Input, Textarea, Select, Checkbox, Cartao, Selo,
│   │                                       # Alerta, Carregando, Dialogo, DialogoConfirmacao, Toast, Abas,
│   │                                       # ContagemRegressiva
│   ├── a11y/                               # SkipLink, LiveRegion
│   ├── evento/                             # LogoEvento, TemaEvento, GateEvento, EventoNaoEncontrado
│   ├── candidato/                          # ImagemCandidato
│   ├── nav/                                # RotaGuard, AcessoRestrito, AdminShell
│   └── dev/                                # DevToolbar, InspetorEstado, EmConstrucao, secoes/
├── dominio/
│   ├── tipos.ts                            # enums, entidades, DadosResultado
│   ├── acesso.ts                           # resolverAcesso
│   ├── candidatos.ts                       # publicados(), votaveis()
│   ├── placar.ts                           # redistribuirPesos
│   ├── resultado.ts                        # congelarResultado (stub; Etapa 7 implementa)
│   └── invariantes.ts                      # verificarInvariantes
├── mocks/
│   ├── seed/                               # eventos, temas, configs, candidatos, usuarios, participacoes,
│   │                                       # convites, dispositivos, votos, index
│   ├── criarEstadoNucleo.ts                # seeds do núcleo (Etapa 0)
│   ├── criarEstadoInicial.ts               # compõe criarEstadoNucleo() (a Etapa 7 soma o volume da Maratona Tech Tivit)
│   └── cenarios.ts
├── store/
│   ├── criarStore.ts                       # getState, atualizar, subscribe
│   ├── relogio.ts
│   ├── AppProvider.tsx
│   ├── transicoes.ts
│   ├── acoes.ts                            # registrarAuditoria, resetarMock, aplicarCenario, ações da toolbar
│   └── seletores/                          # evento.ts, sessao.ts, relogio.ts (as etapas acrescentam os seus)
├── servicos/
│   ├── resultado.ts                        # Resultado, CodigoErro, ModoFalha, atraso, simularFalha, registrarLog
│   ├── mensagens.ts
│   ├── sessao.ts                           # entrarComo, sair
│   └── metadados.ts                        # obterMetadadosEvento (servidor, lê o seed)
└── lib/
    ├── tema.ts                             # calcularTokens
    ├── contraste.ts                        # razaoContraste, corTextoSobre, corLegivelSobre
    ├── fontes.ts                           # FONTES_APROVADAS (next/font)
    ├── tempo.ts                            # T0, conversões, restante, contagem, formatarDataHora
    ├── formatar.ts                         # números e percentuais pt-BR
    ├── aleatorio.ts                        # hashDeTexto, criarGerador, embaralharComSemente
    ├── codigos.ts                          # alfabeto, normalizar, formatar, validar, gerar
    ├── hash.ts                             # hashMock
    └── useConsulta.ts
```

---

## 7. Checkpoints

### CP1 — Base do projeto

**Objetivo:** projeto íntegro, com convenções e fronteira de dados já impostas pelo lint.

**Tarefas**
- [ ] Conferir os arquivos existentes no repositório (rev. 3, B3): `next.config.ts` (já com `reactCompiler: true`), `tsconfig.json` (strict, alias `@/*` → `src/*`), `eslint.config.mjs`, `postcss.config.mjs`. Ajustar só o que faltar. Confirmar que as regras do React Compiler estão ativas no lint.
- [ ] `package.json`: renomear de `verefazerfilmes-project` para `vaivota`, adicionar os scripts `typecheck` (`tsc --noEmit`) e `test` (`vitest run`), instalar `lucide-react` com `pnpm add lucide-react@<versão fixada>` e `vitest` como dependência de desenvolvimento com `pnpm add -D vitest@<versão fixada>` (D19). Configurar o Vitest para `src/dominio/**` e `src/lib/**` (`*.test.ts`), com o alias `@/*`. Conferir que o `pnpm-lock.yaml` existe e que não há `package-lock.json` (se houver, remover). Se o `package.json` não tiver `packageManager`, acrescentar `"packageManager": "pnpm@<versão em uso>"`.
- [ ] `.env.example` com `NEXT_PUBLIC_DEV_TOOLBAR=true`.
- [ ] ESLint: `no-restricted-imports` bloqueando `@/mocks/*` em `src/app/**`, `src/components/**` e `src/lib/**` (permitido em `src/store/**`, `src/servicos/**` e `src/mocks/**`).
- [ ] `layout.tsx`: `lang="pt-BR"`, metadata genérica ("VaiVota"), remover as fontes Geist (as do tema entram no CP4).
- [ ] Criar a árvore de pastas da seção 6.
- [ ] README: seção "Fase 1 — protótipo (sem banco)" com como rodar, o que a toolbar faz, a convenção de `next/link` e a lista de contas e códigos seed (login por código: `123456`; rev. 4, A5).

**Pronto quando:** `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (sem testes ainda, sem falha; usar `passWithNoTests` se preciso) e `pnpm build` passam, e um `import "@/mocks/..."` de teste dentro de um componente falha no lint.

**Entrega:** `VaiVota-E0-CP1.zip`

### CP2 — Tipos de domínio e utilitários puros

**Objetivo:** modelo e ferramentas puras prontos, sem UI.

**Tarefas**
- [ ] `dominio/tipos.ts` conforme a seção 5.1 (enums como uniões literais, entidades, `DadosResultado`, `TextosEstado`, `AcaoAuditoria` e `OrigemEncerramento`), com `// mock-only` em `Evento.local` e `Evento.linkSobre`.
- [ ] `dominio/acesso.ts` (`resolverAcesso`), `dominio/candidatos.ts` (`publicados`, `votaveis`) e `dominio/placar.ts` (`redistribuirPesos`).
- [ ] `lib/tempo.ts`: `T0`, `paraMs`, `paraInstante`, `restanteAte`, formatação de contagem e `formatarDataHora(ms, fuso)` (sempre com locale `pt-BR` e `timeZone` explícitos).
- [ ] `lib/aleatorio.ts`: `hashDeTexto`, `criarGerador(semente)` (mulberry32 ou equivalente) e `embaralharComSemente` (Fisher-Yates, sem mutar a lista).
- [ ] `lib/codigos.ts`: alfabeto, `normalizarCodigo`, `formatarCodigo`, `validarFormatoCodigo`, `gerarCodigo(gerador)`.
- [ ] `lib/hash.ts`: `hashMock(texto)`, determinístico, 64 caracteres hex.
- [ ] `lib/formatar.ts`: número, percentual e vírgula decimal em pt-BR.
- [ ] Testes Vitest (D19) ao lado dos módulos: `lib/codigos.test.ts`, `lib/tempo.test.ts`, `lib/aleatorio.test.ts`, `dominio/acesso.test.ts` (e `hash`/`placar`, que são baratos), cobrindo os casos do "Pronto quando".

**Pronto quando:** `typecheck` e `pnpm test` passam, e os testes cobrem: `normalizarCodigo("k7m3 qx9p")` → `K7M3QX9P`; mesma semente gera a mesma ordem e a lista original não muda; `hashMock` é repetível; `redistribuirPesos` mantém a soma em 100.

**Entrega:** `VaiVota-E0-CP2.zip`

### CP3 — Seeds do núcleo, estado inicial e invariantes

**Objetivo:** dados prontos e verificáveis, sem UI.

**Tarefas**
- [ ] Seeds da seção 5.6 em `src/mocks/seed/`, validados com `satisfies`. Hashes por `hashMock`; `dev.vinculosVoto` preenchido para Eva com a chave `usr-eva:<id do evento Maratona Tech Tivit>` (`usuarioId:eventoId`).
- [ ] `criarEstadoNucleo()` pura, devolvendo cópia nova a cada chamada, e `criarEstadoInicial()` que **compõe** `criarEstadoNucleo()` (nesta etapa devolve o núcleo sem acréscimos; a Etapa 7 soma o volume). `criarEstadoInicial()` é usada por "Resetar mock" e pelo cenário `PADRAO`.
- [ ] `dev.slugPadrao` inicial = `ver-e-fazer-filmes` (a landing atual é a do Festival, que serve de baseline visual).
- [ ] `dominio/invariantes.ts` conforme a seção 5.7.
- [ ] `dominio/invariantes.test.ts` (D19): estado inicial sem violações e, para cada invariante, um estado montado à mão que a viola (inclusive histórico do júri com candidato de outro evento e candidato publicado sem imagem).
- [ ] `mocks/cenarios.ts` com o tipo `Cenario` e `PADRAO`.

**Pronto quando:** `typecheck` e `pnpm test` passam; `verificarInvariantes(criarEstadoInicial())` devolve lista vazia; duas chamadas de `criarEstadoNucleo()` e de `criarEstadoInicial()` devolvem objetos independentes; os seeds cobrem todos os cenários da seção 5.6 (conferência manual).

**Entrega:** `VaiVota-E0-CP3.zip`

### CP4 — Sistema de tema

**Objetivo:** identidade do evento aplicada por tokens, sem cor de marca no código.

**Tarefas**
- [ ] `lib/contraste.ts`: `razaoContraste(a, b)` (fórmula WCAG), `corTextoSobre(hex)` e `corLegivelSobre(cor, fundo, texto)`.
- [ ] `lib/fontes.ts`: três fontes aprovadas via `next/font/google`, cada uma exposta como variável CSS, e a lista `FONTES_APROVADAS`, com o comentário "lista editável pelo dono do produto" (rev. 4, E2).
- [ ] `lib/tema.ts`: `calcularTokens(tema)` com os tokens da seção 5.5 e o `color-scheme`.
- [ ] `globals.css`: mapear os tokens com `@theme inline` (utilitários `bg-tema-primaria`, `text-tema-sobre-primaria`, `text-tema-primaria-texto`, `border-tema-borda`, `ring-tema-foco`, `font-tema`...); foco visível global com `--tema-foco`; `prefers-reduced-motion`; **remover** o bloco `prefers-color-scheme: dark` e a fonte Arial fixa.
- [ ] `TemaEvento`: wrapper que aplica as variáveis e define `bg-tema-fundo text-tema-texto font-tema`. Neste checkpoint recebe o `tema` por prop (o CP5 liga ao hook).
- [ ] Bloco de teste temporário que troca entre os dois temas do seed.
- [ ] Conferir com `razaoContraste`, nos dois temas: texto × fundo, texto suave × fundo e superfície, texto sobre primária, texto sobre secundária, primária-texto × fundo, secundária-texto × fundo (todos ≥ 4,5:1) e foco × fundo (≥ 3:1).
- [ ] `lib/contraste.test.ts` (D19): `razaoContraste` com pares de referência (preto × branco = 21:1), `corTextoSobre` nas primárias dos dois temas e `corLegivelSobre` sempre ≥ 4,5:1.
- [ ] `globals.css`: `--qr-claro` e `--qr-escuro` (neutros, fora do tema; a placa fixa do QR Code da Etapa 8). São a **única exceção** de cor fixa além dos tokens do tema, e o `grep` de "nenhum hex de marca" da Etapa 9 as aceita.

**Pronto quando:** trocar o tema muda cores e fonte do bloco de teste sem tocar em código; a Maratona Tech Tivit escolhe texto escuro sobre a primária azul-clara; o Festival escolhe texto escuro sobre o laranja (≥ 4,5:1) e usa verde e laranja ajustados quando aparecem como texto; nenhum par de texto fica abaixo de 4,5:1.

**Entrega:** `VaiVota-E0-CP4.zip`

### CP5 — Store, relógio, transições e serviços

**Objetivo:** estado compartilhado, tempo simulado e serviços assíncronos funcionando.

**Tarefas**
- [ ] `criarStore` (`getState`, `atualizar`, `subscribe`), `AppProvider` no layout raiz (store e relógio criados por montagem; tique de 1 s com limpeza) e `useStore(seletor)` com `useSyncExternalStore`.
- [ ] Seletores: `useEventoAtivo()` (usa `useParams().slug` e, sem slug, `dev.slugPadrao`; devolve `{ slug, evento, tema, configPlacar, configApresentacao, camposCandidato, candidatos } | null`, com o objeto montado e memoizado **no hook**), `useSessao()`, `useAgora()` e `useDev()`.
- [ ] `relogio.ts` com as ações da seção 5.3 e `getServerSnapshot` fixo em `T0`.
- [ ] `transicoes.ts` (com `origem: OrigemEncerramento` obrigatória em `encerrarUrna` e o tique chamando com `"AUTOMATICO"`) e `dominio/resultado.ts` (stub de `congelarResultado` **com a assinatura final** da seção 5.3), com o fechamento automático ligado ao tique.
- [ ] `acoes.ts`: `registrarAuditoria` (assinatura da regra 5 da seção 5.2, com `criadoEm` opcional), `resetarMock` (estado, sessão, relógio e `ui.apresentacao`), `aplicarCenario` (zera `ui.apresentacao`) e as ações da toolbar (`forcarEstadoEvento`, `forcarEstadoUrna`, que para trás também zera `ui.apresentacao`, `alternarModulo`, etc.).
- [ ] `servicos/resultado.ts` (`Resultado<T>`, `CodigoErro`, `ModoFalha`, `atraso`, `simularFalha(opcoes?: { consumirPontual?: boolean })` conforme a regra 3 da seção 5.2, `consumirFalhaProxima`, `registrarLog`) e `servicos/mensagens.ts`.
- [ ] `servicos/sessao.ts` (`entrarComo(usuarioId)`, `sair`) e `servicos/metadados.ts`.
- [ ] `lib/useConsulta.ts` conforme a regra 6 da seção 5.2.
- [ ] Ligar o `TemaEvento` do CP4 ao `useEventoAtivo()`. A prop `tema` **continua aceita e tem precedência** sobre o hook (a pré-visualização da Etapa 6 usa o tema do rascunho), e atributos como `inert` e `aria-label` são repassados ao elemento raiz.
- [ ] Conferir à mão: `simularFalha({ consumirPontual: false })` com `falhaProxima = ERRO_INTERNO` **não** altera `falhaProxima`; com `simularErroRede` ligado ela ainda devolve `REDE`.

**Pronto quando:** um componente temporário mostra o estado e ele muda ao chamar os serviços e as ações; a urna fecha sozinha quando o relógio passa de `janelaFim`; com `encerramentoAutomatico` desligado ela permanece `ABERTA`; a navegação por `Link` preserva o estado e o F5 o perde; `verificarInvariantes` fica vazia depois de cada ação; sem avisos de hidratação.

**Entrega:** `VaiVota-E0-CP5.zip`

### CP6 — Dev toolbar

**Objetivo:** forçar qualquer estado em um clique.

**Tarefas**
- [ ] Painel flutuante, recolhível, acessível por teclado e com visual neutro (fora do `TemaEvento`), com os controles da seção 5.9.
- [ ] Registro de seções (`components/dev/secoes/`): cada etapa adiciona a sua sem editar o núcleo.
- [ ] Regras de visibilidade da seção 5.9 (`NEXT_PUBLIC_DEV_TOOLBAR`, `?toolbar=0`, palco, `Alt+D`).
- [ ] `InspetorEstado` com o JSON do estado e o resultado de `verificarInvariantes`.
- [ ] `toolbarRecolhida` e `toolbarModo` guardados no store.
- [ ] O contêiner da `DevToolbar` ganha `data-print="ocultar"` (a Etapa 7 esconde na impressão do relatório).

**Pronto quando:** cada controle muda o `InspetorEstado`, e o efeito é conferido de novo nas rotas stub do CP8.

**Entrega:** `VaiVota-E0-CP6.zip`

### CP7 — Componentes de UI base

**Objetivo:** blocos reutilizáveis por todas as etapas, para ninguém recriar o que já existe.

**Tarefas**
- [ ] `Botao` (primária, secundária, contorno, fantasma e **perigo**; tamanhos; `carregando`; renderiza `Link` quando recebe `href`).
- [ ] `Campo` (rótulo, dica, erro, `htmlFor` e `aria-describedby`) + `Input`, `Textarea`, `Select` e `Checkbox`.
- [ ] `Cartao`, `Selo` (sempre ícone + texto), `Alerta` (informação, sucesso, aviso e erro) e `Carregando` (spinner e skeleton).
- [ ] `Dialogo` (`<dialog>` nativo: foco preso, Esc fecha, retorno do foco, bottom sheet em tela pequena, sem portal) e `DialogoConfirmacao` (título, consequência, botão de perigo, confirmação opcional por digitação).
- [ ] `Toast` com `LiveRegion`; o contêiner do `Toast` ganha `data-print="ocultar"`.
- [ ] `SkipLink` apontando para `#conteudo` e com `data-print="ocultar"`; **toda página define `<main id="conteudo">`** (inclusive as stubs do CP8).
- [ ] `ImagemCandidato` (`components/candidato/`): implementa a D16 (`placeholder:<n>` desenhado com tokens do tema, caminho de `public/`, **`blob:`** (usa `<img>` simples, nunca `next/image`) e `null` com bloco de cor + inicial), com `alt` vindo do título e proporção fixa para não dar salto de layout.
- [ ] `Abas` (`role="tablist"`, setas alternam, foco por tab index móvel), com **valor controlado** (`valor` + `aoMudar`, além do modo não controlado) e **aba desabilitada com dica** (`desabilitada` + `dica`; a aba desabilitada é pulada pelas setas, tem `aria-disabled` e a dica fica acessível por `aria-describedby`).
- [ ] `ContagemRegressiva` (usa `useAgora`; `role="timer"`, `aria-live="off"`, `aria-label` atualizado a cada minuto; prop para o texto exibido ao zerar).
- [ ] Todos usando só tokens `tema-*`, com foco visível e alvos de toque de pelo menos 44 px; movimento respeita `prefers-reduced-motion`.
- [ ] Galeria `/dev/ui` (404 quando a flag da toolbar está desligada) com todos os componentes nos dois temas.

**Pronto quando:** a galeria mostra todos os componentes e estados nos dois temas, operáveis só pelo teclado, sem cor fixa no código.

**Entrega:** `VaiVota-E0-CP7.zip`

### CP8 — Layouts, acesso e rotas stub

**Objetivo:** todas as rotas existindo, com a guarda de acesso já valendo.

**Tarefas**
- [ ] `e/[slug]/layout.tsx` como layout de **servidor** que renderiza o `GateEvento` (componente cliente, D14): slug inválido mostra `EventoNaoEncontrado`. Assim os layouts filhos podem exportar `generateMetadata`. (Rev. 3, D15: a Etapa 7 monta o `SimuladorVotos` **uma vez** neste `GateEvento`, ligado por `dev.simularVotosEntrando`, como ajuste mínimo registrado no Anexo C; a Etapa 8 não o monta.)
- [ ] `LogoEvento` (`next/image` com altura fixa e largura automática para caminhos de `public/`; **`<img>` simples para `blob:`**; o nome em texto quando não há `logoUrl`), `EventoNaoEncontrado` e `AcessoRestrito`.
- [ ] `RotaGuard` (usa `resolverAcesso` e o `?de=`) e `AdminShell` mínimo (cabeçalho com nome do evento, selos de estado do evento e da urna e atalhos para Dashboard, Configuração e Apresentação com `aria-current`), com `data-print="ocultar"` no contêiner do shell.
- [ ] Rotas stub da seção 6 usando `EmConstrucao` (mostra rota, etapa responsável e resumo do estado: evento, urna, sessão, papel). Proteções: `convite` e `votar` exigem `EMAIL_VERIFICADO`; `(painel)` e `apresentar` exigem papel `ADMIN`. **Rev. 4 (A5):** não há rota `recuperar-senha`; `verificar-email` é a tela de código e **não exige `LOGADO`** (no login por código ainda não há sessão, só o e-mail pendente em `ui.loginPendente`); o comportamento sem sessão e sem e-mail pendente é definido pela Etapa 3.
- [ ] Página `/` continua como está; a Etapa 1 a migra.

**Pronto quando:** todas as rotas abrem sem 404; `/e/inexistente` mostra a tela de não encontrado; os links entre stubs mantêm o estado; deslogado em `/votar` vai para `/e/{slug}?de=...`; Davi em `/votar` vai para a verificação; Ana em `/admin` e Hugo em `/e/maratona-tech-tivit/admin` veem `AcessoRestrito`; Carla entra nos dois eventos.

**Entrega:** `VaiVota-E0-CP8.zip`

### CP9 — Revisão e fechamento

**Objetivo:** fechar a etapa com evidência.

**Tarefas**
- [ ] `lint`, `typecheck`, `test` e `build` sem erros; sem warnings de hidratação no console.
- [ ] `grep`: nenhum hex de marca nem classe de paleta fora de `src/mocks/seed/`, `globals.css` e `components/dev/`.
- [ ] `grep`: nenhum `<a href>` para rota interna.
- [ ] `grep`: nenhum acesso a `votos`, `votosJuri`, `historicoVotosJuri`, `votosInfantis` ou `resultados` fora de `store/seletores/**` e `servicos/**`.
- [ ] Verificação manual: trocar evento, estado, urna, sessão, módulos e relógio na toolbar e confirmar o efeito em duas rotas stub; `verificarInvariantes` vazia ao fim de cada troca.
- [ ] README atualizado e zip final gerado.

**Pronto quando:** todos os itens acima marcados e a seção 9 inteira atendida.

**Entrega:** `VaiVota-E0-CP9.zip` (final da Etapa 0)

---

## 8. O que fica fake

| Item | Tratamento |
|---|---|
| Persistência | Nenhuma; o F5 e qualquer nova aba voltam ao seed (o banco real vem na trilha de produção; rev. 4, A3) |
| Autenticação (Google e código por e-mail, sem senha; rev. 4, A5) | Fluxo mockado na Etapa 3 (código `123456`); esta etapa só entrega `entrarComo` e `sair` |
| Hashes | `hashMock`, não criptográfico |
| Latência e falhas | Simuladas pela toolbar |
| Hora do servidor | Relógio mock, com deslocamento ajustável |
| Imagens | Placeholders desenhados pelo tema; sem imagens remotas |
| Sincronização entre abas e dispositivos | Não existe (D18) |
| `Dispositivo` e `VotoInfantil` | Só dados seed para o dashboard; sem tela de totem. O totem entra por planner próprio (rev. 4, A7, a escrever); até lá, `Dispositivo` e `VotoInfantil` são dados seed |

## 9. Critérios de aceitação

- [ ] Todos os estados relevantes (evento, urna, sessão, módulos, tempo, cenários) são forçáveis pela toolbar.
- [ ] Os dois temas funcionam sem tocar em código, inclusive o escuro e sem logo, e nenhum par de texto fica abaixo de 4,5:1.
- [ ] Navegar por `Link` mantém o estado; F5 volta ao seed.
- [ ] Serviços são assíncronos, com latência e erro simuláveis, e devolvem `Resultado<T>`.
- [ ] O relógio simulado produz o mesmo HTML no servidor e no cliente, e fecha a urna automaticamente quando configurado.
- [ ] Encerrar a urna (por qualquer caminho) passa por `transicoes.encerrarUrna` e chama `congelarResultado`.
- [ ] `verificarInvariantes` fica vazia no estado inicial e depois de cada ação.
- [ ] Todas as rotas da Fase 1 existem como stub, protegidas conforme a seção 5.4.
- [ ] O lint impede importar `src/mocks` fora de `store`, `servicos` e `mocks`.
- [ ] Todo item da seção 3.1 está atendido e cada módulo da seção 3.2 tem um único dono.

## 10. Pendências

- **Marca do Festival:** **Resolvida (rev. 4, E1):** texto escuro sobre o laranja `#F15A29` (≈5,3:1), verde ajustado quando for texto; aprovação visual com a organização.
- **Fontes:** **Resolvida (rev. 4, E2):** a troca de fonte no Tema continua; `FONTES_APROVADAS` é uma configuração que o dono do produto personaliza depois (comentário em `lib/fontes.ts`, CP4).
- **Datas reais** da Maratona Tech Tivit: **Resolvida em parte (rev. 4, E3):** semana de 18/10/2026; o seed (22/10/2026, 13h–17h) fica dentro dela. Dia e horário exatos ainda a confirmar [Usuário].
- **Calendário (rev. 4, A1):** a Maratona Tech Tivit (semana de 18/10/2026) é **uso real** (sistema funcional, dados reais). Antes dela há uma **demonstração** para o Festival (09/10/2026): telas com dados mock, no tema do Festival. Registro apenas; o conteúdo das etapas não muda por causa de datas.
- **Aviso de privacidade (rev. 4, E29):** controladora dos dados é a VaiVota; aviso da plataforma (link no registro e no rodapé); `Evento.avisoPrivacidadeUrl` opcional e complementar. Texto do aviso pendente (rascunho a partir do DD §10.4).
- **Toolbar no deploy de demonstração:** **Resolvida (rev. 3, E4):** o build para o público sai **sem** toolbar (`NEXT_PUBLIC_DEV_TOOLBAR=false`); build com toolbar só para ensaio/roteiro completo (detalhe na Etapa 9, D9).
- **Resolvida (rev. 3, B1):** abertura manual da urna (D7) confirmada no DD §9.2 e admin não vota (D13) confirmado no DD §4.
- **`bloquearVotoProprio`:** **Resolvida (rev. 3, E5): confirmado** — voto próprio bloqueado, por seed (`true`, padrão recomendado do schema). O mock bloqueia.
- **Fase 2:** **Resolvida (rev. 4, A3):** não há BD fake; a camada de serviços é trocada diretamente pelo banco real na trilha de produção.
- **Fase 3:** **Resolvida (rev. 4, A4):** banco decidido: **Supabase (PostgreSQL)**; a conversão do schema (hoje MySQL) é tarefa da trilha de produção. A Etapa 9 registra no documento da fronteira de dados.
- **Resolvida (rev. 3, B1):** `DocumentDesign.md` v1.1 existe na raiz do repositório e as regras antes marcadas "(a confirmar no DD)" foram fechadas; `ConfiguracaoEvento.md` não existe, a referência é a DD §7.6.
- **Arquivos de configuração (rev. 3, B3):** `next.config.ts` (já com `reactCompiler: true`), `tsconfig.json`, `eslint.config.mjs` e `postcss.config.mjs` existem; o CP1 confere os arquivos existentes em vez de criá-los.
- **`local` e `linkSobre` (rev. 3, E34):** passarão a ser campos de `Evento` no schema (F-5, a aprovar); até lá continuam `// mock-only`. **Rev. 4:** F-5 aprovada.

**Fora da Fase 1 — exige planner próprio ou decisão do dono do produto** (registro da rev. 3, atualizado com as decisões da rev. 4; nenhuma etapa da Fase 1 implementa)
- **A1:** **decidido (rev. 4):** a Maratona Tech Tivit (semana de 18/10/2026) é uso real; antes dela, demonstração para o Festival (09/10/2026) com dados mock no tema do Festival.
- **A3:** **planner a escrever: "Trilha de Produção"** — banco, migrações, seed real; autenticação; troca dos serviços de voto; troca dos serviços de configuração/dashboard/resultado; rate limiting, logs e deploy. Não há BD fake.
- **A4:** **decidido (rev. 4):** Supabase (PostgreSQL).
- **A5:** **decidido (rev. 4):** Better Auth (Google + código por e-mail, **sem senha**), Vercel, Resend (e-mail), rate limiting no PostgreSQL ou Upstash Redis, Sentry + logs da Vercel; Prisma como ORM.
- **A6:** **planner a escrever: "Endurecimento"** — carga com k6, alertas Sentry, backup e teste de restauração, roteiro do dia, ensaio do telão. Pendente [Usuário]: número esperado de votantes e pico.
- **A7:** **planner a escrever: "Totem"** (mock e depois real) — pareamento, quiosque com PIN, voto infantil, gestão de dispositivos. Passa a fazer parte do protótipo (precisa aparecer na demonstração) e do produto; até lá, `Dispositivo` e `VotoInfantil` são dados seed.
- **A8:** **decidido (rev. 4):** júri com **voto simples na Maratona Tech Tivit** (os planners atuais continuam válidos) e **voto por critério no Festival** (Direção, Roteiro, Fotografia e Som — PDF §3.3); modelo previsto `Criterio` e `NotaJuri`. Pendentes [Usuário]: escala da nota, peso por critério, como a nota vira placar do júri (proposta: soma das médias dos critérios dadas pelos jurados, normalizada como os outros grupos), desempate por critério.
- **A9:** **decidido (rev. 4):** CPF nunca; SMS/OTP descartado (código por e-mail no lugar); admins adicionais por seed (tela de convite de admin fica para depois).

---

## Anexo A — Modelo padrão dos planners

Todas as etapas seguem esta estrutura. Seções sem conteúdo ficam com "Não se aplica", nunca são removidas.

```markdown
# VaiVota — Fase 1 · Etapa N: Título

> **Rotas:** ...
> **Depende de:** Etapas ...
> **Alimenta:** Etapas ...
> **Fontes:** ...
> **Status:** ...

## 1. Objetivo
Parágrafo curto + garantias da etapa.

## 2. Escopo
**Dentro** / **Fora (e em qual etapa fica)**

## 3. Contrato com as outras etapas
### 3.1 O que esta etapa recebe (tabela: item | dono)
### 3.2 O que esta etapa entrega (tabela: item | consumidor)

## 4. Decisões
Tabela numerada (D1, D2...) com decisão e motivo. Só decisões novas desta etapa;
as do conjunto vivem na Etapa 0.

## 5. Modelo e regras
Matrizes de estado, tipos, regras de negócio e textos. Subseções 5.1, 5.2...

## 6. Estrutura de arquivos
Árvore (ou tabela arquivo | ação).

## 7. Checkpoints
### CPn — Título
**Objetivo** / **Tarefas** (checklist) / **Fica fake** (quando houver) /
**Pronto quando** / **Entrega:** `VaiVota-E{n}-CP{m}.zip`
O último checkpoint é sempre "Revisão e fechamento".

## 8. O que fica fake
## 9. Critérios de aceitação
## 10. Pendências
```

**Regras do modelo**
- Checkpoints se chamam `CP1`, `CP2`... em todas as etapas (nada de "Checkpoint 2.1").
- Nomes de arquivos, hooks, serviços, tokens, enums e seeds vêm do que a Etapa 0 definiu. Divergência se resolve ajustando o planner, não criando um nome novo.
- Regras de entrega, convenções de código e dependências aprovadas vivem na seção 3.3 da Etapa 0 e **não se repetem** nas demais.
- Toda etapa lista, na seção 3.2, o que ela entrega às seguintes e, na 3.1, de quem recebe.

## Anexo B — Registro de reconciliação (o que muda nas demais etapas)

Lista de ajustes que os planners das Etapas 1 a 9 precisam absorver ao serem reescritos.

**Etapa 1 — Landing**
- Seção 3 vira "recebe da Etapa 0". Metadata passa a usar `obterMetadadosEvento` (a Etapa 0 define só o título genérico).
- Paridade com a landing atual vira "mesmo layout e mesmas cores de marca", com as duas exceções de D15 (texto sobre o laranja e verde usado como texto).
- Usar `ContagemRegressiva`, `LogoEvento` e `Selo` da Etapa 0. Sem "só calcular depois de montado".
- Definir a precedência entre estado do evento e da urna e o texto "Tempo esgotado" (D7).

**Etapa 2 — Evento**
- Tokens `--tema-*` (não `--cor-*`); store externo da Etapa 0 (não `useReducer`); janela com datas absolutas (remove a D3 do planner antigo).
- Remover `EventoLogo`, `Countdown`, `use-agora.ts` e `contraste.ts` próprios; grupo de rota `(participante)`; gate no cliente em vez de `notFound()` de servidor e `not-found.tsx` neutro de evento.
- Sessão pelos oito usuários seed ("Entrar como"), com `jaVotou` derivado; sem extensão da toolbar para papel e "já votou".
- "Candidatos publicados" nenhum/todos vira o cenário `SEM_CANDIDATOS`, registrado pela própria Etapa 2. A D7 do planner antigo e o critério 4,5:1 passam a ser atendidos pelo CP4 da Etapa 0. "Admin não vota" deixa de ser pendência.

**Etapa 3 — Login e Registro**
- Remover `auth.seed.ts` e `auth.actions.ts`: contas e convites vêm do seed da Etapa 0 (e-mails `@demo.com`, códigos `K7M3-QX9P` etc.); serviços em `servicos/auth.ts`.
- `{ ok, motivo }` vira `Resultado<T>` com `CodigoErro` (`dados_invalidos` → `VALIDACAO`, `erro_generico` → `ERRO_INTERNO`...). Latência global.
- Toolbar "papel" vira "Entrar como". Guarda por `RotaGuard`. Bloqueio de tentativas (5 em 60 s) usa o relógio simulado.
- Convites por `hashMock`; código gerado só aparece na criação. `MenuUsuario` (provisório na Etapa 2) assume o slot do `EventoShell`.

**Etapa 4 — Candidato**
- A **seleção** (marcar, `BarraSelecao`, "Escolher") passa para a Etapa 5, conforme o escopo definido; a Etapa 4 entrega lista, cartão, detalhe, ordem por semente e a gate até a lista.
- Usar `lib/aleatorio.ts` e `dominio/candidatos.ts` (remover `embaralhar.ts`); seletores em `store/seletores/candidatos.ts`; imagens `placeholder:<n>`.
- Seeds vêm da Etapa 0 (8 votáveis na Maratona Tech Tivit, 6 no Festival, casos de borda da seção 5.6); "Muitos (24)" vira cenário registrado ("Sem candidatos" vem da Etapa 2).
- Dona de `resolverEstadoVotar`. Admin → "Administradores não votam". Rota em `(participante)`.

**Etapa 5 — Votos**
- Cards ganham a ação "Escolher" e a seleção em `ui`; `banco` + `sessaoUi` vira `banco` + `ui`.
- `ResultadoVoto` e `MotivoRejeicao` viram `Resultado<T>` e `CodigoErro`; latência global; falhas via `dev.falhaProxima`; "Resetar meu voto" via `dev.vinculosVoto`.
- Serviços `votarPopular`, `votarJuri` e `consultarEstadoVoto` em `servicos/votacao.ts`; `consultarEstadoVoto` lido com `useConsulta`.
- Substitui a tela "já votou" simples da Etapa 4.

**Etapa 6 — Configuração**
- Dona de `travas.ts` e `csv.ts`. Formulário de tema segue a política de D15 (sem `corSobrePrimaria`; texto × fundo bloqueia, primária e secundária × fundo é aviso).
- Abrir, encerrar e concluir usam `store/transicoes`. Desqualificar após encerrar gera nova versão `DESQUALIFICACAO` do resultado (D9).
- O critério "a ordem aparece igual na votação" muda para dashboard, telão e lista de admin (a votação embaralha por usuário).
- "Votar em outra aba" vira "na mesma aba". `auditoria[]` passa a ser `banco.auditoria` (`acao`, `entidade`, `detalhes`). Convites por `hashCodigo`. Cenários da seção 8 viram registros. Itens de totem e trailer do checklist derivam do seed.

**Etapa 7 — Dashboard**
- Dona de `apurar`, `congelarResultado` e do seed de volume (metas da seção 5.6). Remove `contagens` do store: tudo deriva dos votos; série por minuto sai de `Voto.criadoEm`.
- `dashboard.queries.ts` e `usePolling` viram `servicos/dashboard.ts` + `useConsulta`. `AdminShell` já existe: só acrescenta as abas.
- Rev. 3 (D15): o `SimuladorVotos` é montado uma única vez no `GateEvento` desta etapa (ajuste mínimo feito e registrado pela Etapa 7), ligado por `dev.simularVotosEntrando`; a Etapa 8 só lê. Rev. 3 (D11): a Etapa 7 registra os 6 cenários `RESULTADO_*`.
- Flags únicas `parcialAoVivo` (schema) e `dev.simularVotosEntrando`. Acesso negado entre eventos demonstrado por Hugo. Números de convites: 12 / 9 / 1 / 1 / 1. Reutiliza `csv.ts` da Etapa 6.

**Etapa 8 — Apresentação**
- Remove a apuração e o `ResultadoOficial` próprios (consome os da Etapa 7); os 6 cenários viram cenários registrados (pela Etapa 7; rev. 3, D11).
- `useRelogioServidor` vira `useAgora`; instala `qrcode.react` com `pnpm add` e versão fixada. Não move rotas (`(painel)` já existe, `apresentar` está fora).
- Regra de visibilidade da toolbar no palco (seção 5.9) e `ui.palcoAtivo`. Encerrar urna via `transicoes`. "Refazer revelação" não recalcula o resultado. "Tempo esgotado" segue D7.

**Etapa 9 — Fechamento**
- Remove `repo.ts` (a fronteira é `servicos/`) e o `RotaGuard`, `SkipLink`, `LiveRegion` como entregas (já existem; só audita). Lint de fronteira de dados já ativo.
- Matriz 6.2 corrigida: Apresentação tem fases reais de pré-votação e ao vivo, não só "ensaio". Toolbar controlada por flag, não removida do build. Remove o item de modo escuro do sistema.
- Rotas auditadas incluem `verificar-email` (tela de código) e `relatorio`; `recuperar-senha` não existe mais (rev. 4, A5). `cenarios.ts` consolida o que as etapas registraram.
- Roteiro de demo cabe em **uma instância**: "celular" é viewport/emulação, ou a demo roda inteira no aparelho.

---

## Anexo C — Errata incorporadas (revisões 2 e 3)

As Etapas 5 a 8 pediram ajustes mínimos no contrato. Eles estão **todos incorporados nas seções acima**; os CP1 dessas etapas apenas **conferem** que o código os tem. Nenhum deles muda uma decisão (D1 a D21).

| Pedido | O que mudou na Etapa 0 | Onde |
|---|---|---|
| Etapa 5 (D16a) | `dev.vinculosVoto` usa a chave `usuarioId:eventoId` (o mesmo usuário vota nos dois eventos); o seed de Eva já nasce com essa chave | 5.1 (`EstadoDev`), CP3 |
| Etapa 5 (D16b) e Etapa 7 | `simularFalha(opcoes?: { consumirPontual?: boolean })`: com `false`, obedece só `simularErroRede` (leituras de servidor) | 5.2 regra 3, CP5 |
| Etapa 5 (D16c) e Etapa 6 | `OrigemEncerramento = MANUAL \| AUTOMATICO \| TOOLBAR \| FALHA_SIMULADA`, obrigatória em `encerrarUrna` | 5.1, 5.3, CP5 |
| Etapas 6, 7 e 8 | `AcaoAuditoria`: união única com as 21 ações conhecidas (7 da Etapa 0/3, 2 da 5, 6 da 6, 2 da 7, 4 da 8) | 5.1, CP2 |
| Etapa 6 (c) e Etapa 7 (c) | `congelarResultado(estado, eventoId, motivo, opcoes?)` com a assinatura final; `calculadoPorId` aceita `null` | 5.3, CP5 |
| Etapa 6 (d) | `TemaEvento` aceita `tema` por prop com precedência; `LogoEvento` e `ImagemCandidato` aceitam `blob:` | CP5, CP7, CP8 |
| Etapa 7 (b) | `registrarAuditoria` aceita `criadoEm` explícito. **`aplicarVotoPopular` e `aplicarVotoJuri` não são da Etapa 0:** são da Etapa 5 e já recebem o instante em `agoraMs` | 5.2 regra 5 |
| Etapa 7 (d) | `data-print="ocultar"` em `AdminShell`, `DevToolbar`, `SkipLink` e contêiner do `Toast` | CP6, CP7, CP8 |
| Etapa 7 (e) | `Abas` com valor controlado e aba desabilitada com dica | CP7 |
| Etapa 7 (f) | `criarEstadoNucleo()` separado de `criarEstadoInicial()` | CP3, árvore da seção 6 |
| Etapa 8 (b, c) | `EstadoUi.apresentacao` e `EstadoDev.simularTrailerFalha` com valor inicial; `resetarMock`, `aplicarCenario` e `forcarEstadoUrna` para trás zeram `ui.apresentacao` | 5.1, 5.3, CP5 |
| Etapa 8 (d) | `--qr-claro` e `--qr-escuro` em `globals.css` | CP4 |
| D20 | `pnpm` no lugar de `npm` (comandos e lockfile) | 4 (D20), CP1 |

**Pendente de confirmação:** o nome do parâmetro `consumirPontual` e os nomes `MANUAL`/`TOOLBAR` são escolha desta revisão, porque as Etapas 5 e 6 pediam o recurso mas não fixaram o nome. Se o código já tiver outro nome, ajustar nele **e nesta tabela**, nunca criando um segundo.

### Revisão 3 (07/10/2026)

Decisões do documento de pendências aplicadas ao contrato. Assim como as da rev. 2, estão incorporadas nas seções acima; quem implementa a Etapa 0 já as constrói.

| Item | O que mudou na Etapa 0 | Onde |
|---|---|---|
| A2 | Nota de vocabulário: Fase 1/2/3 destes planners ≠ fases do DD §13 | 1 |
| A1, A3–A9 | Bloco "Fora da Fase 1 — exige planner próprio ou decisão do dono do produto" | 10 |
| B1 | Fontes citam `DocumentDesign.md` v1.1; D7 confirmada (DD §9.2), D13 confirmada (DD §4); pendências do DD resolvidas | Cabeçalho, 4 (D7, D13), 5.4, 10 |
| B3 | CP1 confere os arquivos de configuração existentes (`next.config.ts` já com `reactCompiler: true`) | CP1, 10 |
| C2 | A participação nunca nasce junto com o voto: login/registro ou `garantirParticipacao` (Etapa 3); nenhum tipo muda | 4 (D13), 5.4 |
| C5 | `cand-st-03` e `cand-fv-04` ganham `placeholder:<n>`; sem imagem passa aos rascunhos `cand-st-09` e `cand-fv-07`; invariante 8 (publicado tem `imagemUrl`) | 4 (D16), 5.6, 5.7, CP3 |
| D1 | Guarda `EMAIL_VERIFICADO` redireciona com `?de={rotaAtual}` | 5.4 |
| D9 | Invariante 5 cobre `historicoVotosJuri` (anterior e novo) | 5.7, CP3 |
| D11 | `RESULTADO_*` registrados pela Etapa 7 (não 8) | 5.8 |
| D15 | A Etapa 7 monta o `SimuladorVotos` uma vez no `GateEvento` (ajuste mínimo, ligado por `dev.simularVotosEntrando`); a Etapa 8 não o monta | CP8, Anexo B (Etapa 7) |
| D16 | `DadosResultado`: `ranking[].pontosPorGrupo`, `desqualificados`, `pesosEfetivos` (preenchidos por `apurar`, Etapa 7) | 5.1 |
| D19 | Vitest como dependência de desenvolvimento (`dominio/` e `lib/`); `pnpm test` na regra de entrega; CP1 instala e cria o script; CP2, CP3 e CP4 testam o que criam | 3.3, 4 (D19, D20), CP1–CP4, CP9 |
| E4, E5 | Toolbar fora do build público; voto próprio bloqueado confirmado | 10 |
| E34 | `local` e `linkSobre` irão para `Evento` no schema (F-5); seguem `// mock-only` | 4 (D10), 5.1, 10 |
| D12 | Tabela de cenários completa: `VOTO_PROPRIO_PERMITIDO` (Etapa 4) e os três `FESTIVAL_*` (Etapa 8); total de 21 | 5.8 |
| C3 | Invariante 2 fala dos pesos **configurados**; `pesosEfetivos` é só do resultado | 5.7 |

**Ajustes mínimos que outras etapas fazem em arquivos desta etapa (rev. 3)** — feitos e registrados pela etapa dona do recurso, sem nome novo:

| Etapa | Arquivo da Etapa 0 | Ajuste |
|---|---|---|
| 6 (E32, D24 dela) | `store/acoes.ts` (`alternarModulo`) | Desligar o júri consulta `exigirAcao(…, "MODULO_JURI_DESLIGAR")` e recusa quando há convite `USADO` |
| 7 (D15, D12 dela) | `components/evento/GateEvento.tsx` | Monta o `SimuladorVotos` uma vez, ligado por `dev.simularVotosEntrando` |
| 7 (C17) | `EstadoUi` em `dominio/tipos.ts` e valor inicial | Campo `ui.dashboard.resultadoVisivel: string \| null` (chave `eventoId:versao`) |

Continuam pendentes [Usuário]: marca do Festival (E1), fontes (E2), datas da Maratona Tech Tivit (E3). (Resolvidas na rev. 4; ver abaixo.)

### Revisão 4 (07/10/2026)

Decisões do documento "Pendências finais para decisão" aplicadas ao contrato. Estão incorporadas nas seções acima. Nenhum nome novo de tipo, serviço ou código de erro.

| Item | O que mudou na Etapa 0 | Onde |
|---|---|---|
| A2/F-7 | "Fase 2 = BD fake" deixa de existir; "Fase 2/3" passa a ser **trilha de produção** (Prisma + Supabase); nota da reestruturação futura em 4 fases (Demonstração, Maratona Tech Tivit, Festival, Final) | 1, 2, 4 (D2, D3, D10), 5.1 |
| A1, A3–A9 | Bloco "Fora da Fase 1" atualizado: A1, A4, A5, A8, A9 decididos; A3 ("Trilha de Produção"), A6 ("Endurecimento") e A7 ("Totem") viram planners a escrever | 10 |
| A3, A4 | Pendências "Fase 2" (BD fake) e "Fase 3" (MySQL × PostgreSQL/Supabase) resolvidas: sem BD fake; Supabase (PostgreSQL) | 8, 10 |
| A5 | Autenticação sem senha: rota `recuperar-senha` sai da árvore, dos stubs do CP8 e das proteções; `verificar-email` vira a tela de código e deixa de exigir `LOGADO`; seed "(login por código: `123456`)"; Davi = código nunca confirmado; `CREDENCIAIS_INVALIDAS` = código de login incorreto (total de `CodigoErro` continua 26); tabela "O que fica fake" sem senha | 2, 3.1, 5.2, 5.4, 5.6, 6, CP1, CP8, 8, Anexo B |
| A7, A9 | Totem entra por planner próprio; `Dispositivo` e `VotoInfantil` seguem dados seed até lá; `CodigoPareamento` vem com o "Totem"; admins adicionais por seed (`ConviteAdmin` fica para depois) | 2, 5.6, 8, 10 |
| A8 | Júri: voto simples na Maratona Tech Tivit, por critério no Festival (`Criterio`, `NotaJuri` previstos) | 10 |
| E1 | Texto escuro sobre o laranja decidido | 4 (D15), 10 |
| E2 | `FONTES_APROVADAS` editável pelo dono; comentário em `lib/fontes.ts` | 5.5, CP4, 10 |
| E3 | Maratona Tech Tivit na semana de 18/10/2026; seed 22/10 dentro dela | 5.6, 10 |
| E21 | `exibirVotosJuriNoTelao` não aparece no contrato da Etapa 0 (nada a remover aqui) | — |
| E29 | Aviso de privacidade da plataforma VaiVota; `avisoPrivacidadeUrl` do evento opcional e complementar | 5.6, 10 |
| F-4, F-5 | Pesos `Int` no schema (protótipo: `number` inteiro); `local`/`linkSobre` aprovados no schema (seguem `// mock-only` no protótipo) | 4 (D10), 5.1, 10 |
