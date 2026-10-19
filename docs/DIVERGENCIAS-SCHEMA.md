# Divergências mock × schema

Comparação entre os tipos do protótipo (`src/dominio/tipos.ts`) e `prisma/schema.prisma`. **Só registra**: nada aqui altera o schema. O banco está decidido (Supabase PostgreSQL, rev. 4, A4); o schema ainda declara `provider = "mysql"` e tipos `@db.*` de MySQL, e **a conversão para PostgreSQL é tarefa da trilha de produção** (F-11).

## Conversão para PostgreSQL (MVP Maratona Tech Tivit, 15/10/2026)

Feita (F-11): `provider = "postgresql"`, gerador `prisma-client` em `src/generated/prisma`, datas `timestamptz(3)`, ids como `String` (UUID em texto, gerado pelo Prisma), `Json` nativo, URL da migração em `prisma.config.ts` (`DIRECT_URL`) e da aplicação no adaptador `pg` (`DATABASE_URL`, o pooler do Supabase). A migração está em `prisma/migrations/20261015000000_init` e inclui os CHECKs: pesos (`config_placar` e `resultado_oficial`), candidato publicado com imagem, versão e motivo do resultado, ordem do candidato. O `prisma/schema.sql` (referência em MySQL) foi removido: a migração é a referência.

**Better Auth.** `user` é a própria `usuario` (`user.modelName` e `user.fields` em `src/server/auth.ts`); `emailVerificado` (booleano) substitui `emailVerificadoEm` e o cliente recebe `emailVerificadoEm` derivado dele. `session`, `account` (a senha fica na conta `credential`, hash scrypt), `verification` (códigos de e-mail, guardados com hash) e `rate_limit` são tabelas novas. A `rate_limit` guarda limites por e-mail e por IP (código, cadastro, bloqueio de senha) e **nunca** o voto (sigilo). `ConviteAdmin` entrou em uso: o `promover-admin` cria o convite de quem ainda não tem conta.

## Já coincidentes (aplicados no schema na rev. 4)

| Item | Decisão |
|---|---|
| `Participacao` sem `criadoEm` | A participação nunca nasce junto com o voto (C2, F-1) |
| Pesos `Int` com CHECK de soma 100 | C12, F-4 (o CHECK vem na migração) |
| `Evento.local` e `Evento.linkSobre` | E34, F-5 (o código ainda os comenta como `mock-only`; podem perder o comentário) |
| `Usuario` sem `senhaHash` no schema | Contas e sessões nas tabelas do Better Auth (C22, F-8). Desde 08/10/2026 o login é por e-mail e senha (revoga a A5): o mock guarda `Usuario.senhaHash` só para simular; em produção a senha fica na conta `credential` do Better Auth (provedor e-mail e senha), e o código por e-mail serve só para recuperar a senha |
| `ConfigPlacar` sem `exibirVotosJuriNoTelao` | Votos do júri nunca no telão (E21, F-10) |

## Campos e tipos

| Mock | Schema | Observação |
|---|---|---|
| `Instante` (string ISO com offset) | `DateTime` | Serialização; o fuso de exibição é `Evento.fusoHorario` |
| Ids legíveis (`evt-maratona-tech-tivit`, `cand-st-01`, `par-ana-st`, `usr-v-0001`, `vj-par-…`, `conv-v-…`, `res-…-v1`) | `uuid()` em `Char(36)` | Só no seed; os serviços tratam ids como opacos |
| `Voto.id`, `HistoricoVotoJuri.id`, `VotoInfantil.id`, `Auditoria.id` inteiros via `banco.sequencias` | `autoincrement()` | `sequencias` não existe no schema |
| `Auditoria.acao: AcaoAuditoria` (união de 21) | `String @db.VarChar(64)` | A lista fechada fica no código (catálogo) |
| `ResultadoOficial.motivo: MotivoResultado` | `String @db.VarChar(40)` | Valores: `ENCERRAMENTO`, `DESQUALIFICACAO`, `CORRECAO` |
| `ResultadoOficial.dados: DadosResultado` | `Json` | Forma em `tipos.ts` (inclui `pontosPorGrupo`, `desqualificados`, `pesosEfetivos`, D16) |
| `Auditoria.entidade` em snake_case (`voto_juri`, `convite_jurado`, `config_placar`, `campo_candidato`, `tema`, `evento`, `candidato`) | `String?` | Padrão do código desde a Etapa 0 |
| `Grupo` (`POPULAR`, `JURI`, `INFANTIL`) | — | Só domínio |
| `Tema.textosEstado: TextosEstado` | `Json?` | Chaves em `ChaveTextoEstado` |
| `Candidato.camposExtras: Record<string,string>` | `Json?` | Chaves = `CampoCandidato.chave` |

## Só no schema (sem tela na Fase 1)

| Modelo | Quando entra |
|---|---|
| `CodigoPareamento`, `EstadoCodigoPareamento` | Planner Totem (A7) |
| `ConviteAdmin`, `EstadoConviteAdmin` | Depois; admins adicionais por seed (A9) |
| Tabelas do Better Auth | Trilha de produção (A5) |

## Só no mock

`banco.sequencias`, `ui` (estado de tela), `dev` (toolbar), `dev.vinculosVoto` (só para "Resetar meu voto"), usuários e participações gerados pelo volume.

**Júri por critério (08/10/2026, A8), a levar ao schema:** `ConfigPlacar.modoVotoJuri` (`VOTO_UNICO` | `NOTAS_POR_CRITERIO` | `MELHOR_POR_CRITERIO`), `CriterioJuri` (id, evento, nome, ordem), `NotaJuri` (participação, candidato, critério, nota inteira 0 a 10; única por participação, candidato e critério) e `EscolhaCriterioJuri` (participação, critério, candidato; única por participação e critério). Substituem os `Criterio` e `NotaJuri` previstos. Ids legíveis no mock (`crit-fv-direcao`, `nj-…`, `ec-…`). Auditoria com `entidade` `nota_juri`, `escolha_juri` e `config_juri`.

## Invariantes × constraints

| Invariante | Como vira constraint no banco |
|---|---|
| 1 slug único; uma participação por usuário e evento | `@unique` em `slug`; `@@unique([usuarioId, eventoId])` |
| 2 pesos inteiros que somam 100; módulo desligado com peso 0 | CHECK na migração (soma 100); peso 0 com módulo desligado na regra de serviço |
| 3 votos = públicos que votaram | Transação no serviço de voto (`Voto` + `votou` juntos); não é constraint |
| 4 jurado com `votou` ⇔ tem voto único, nota ou escolha (08/10/2026); histórico obrigatório no voto único | Transação; `VotoJuri.participacaoId @unique` |
| 10 nota inteira de 0 a 10; nota e escolha de critério, candidato e jurado do mesmo evento; uma escolha por jurado e critério | CHECK `nota BETWEEN 0 AND 10`; FKs compostas por evento; `@@unique([participacaoId, criterioId])` na escolha |
| 5 voto aponta para candidato do mesmo evento | FK composta `(eventoId, candidatoId)` → `Candidato(eventoId, id)` |
| 6 convite usado aponta para participação JURADO do evento | FK + CHECK/regra de serviço |
| 7 versões sequenciais; urna encerrada com versão | `@@unique([eventoId, versao])`; a criação da versão na mesma transação do encerramento |
| 8 publicado tem imagem | CHECK `NOT publicado OR imagem_url IS NOT NULL` |
| 9 (I8) consistência da apuração | Não é constraint: é garantida por `apurar` (testes) e conferida em auditoria de dados |

## Forma do seed

Todas as entidades do seed são linhas planas; os únicos campos aninhados são os que o schema já declara como `Json` (`textosEstado`, `camposExtras`, `dados`, `detalhes`). O volume gerado (`src/mocks/volume/`) segue a mesma forma.
