# Catálogo do protótipo (Fase 1)

Inventário conferido contra o código em 08/10/2026 (Etapa 9, CP1). Quando um número diverge do planner, vale o do código e a divergência está em [ACHADOS.md](ACHADOS.md).

## Cenários (21 registrados em `src/mocks/cenarios.ts`)

| # | Id | Grupo | Etapa | O que faz |
|---|---|---|---|---|
| 1 | `PADRAO` | DADOS | 0 | Seed inicial (o mesmo do F5), com o volume da Semana Tech |
| 2 | `SEM_ENCERRAMENTO_AUTOMATICO` | ESTADO | 1 | Desliga o encerramento automático nos dois eventos |
| 3 | `SEM_CANDIDATOS` | DADOS | 2 | Despublica todos os candidatos do evento ativo |
| 4 | `SOMENTE_GOOGLE` | ESTADO | 3 | Identificação só por Google no evento ativo |
| 5 | `SOMENTE_EMAIL` | ESTADO | 3 | Identificação só por e-mail no evento ativo |
| 6 | `MUITOS_CANDIDATOS` | DADOS | 4 | Completa o evento ativo até 24 votáveis |
| 7 | `VOTO_PROPRIO_PERMITIDO` | DADOS | 4 | `bloquearVotoProprio = false` no evento ativo |
| 8 | `RASCUNHO_INCOMPLETO` | ESTADO | 6 | Rascunho com 3 bloqueios no checklist |
| 9 | `RASCUNHO_PRONTO` | ESTADO | 6 | Rascunho sem bloqueios, janela no futuro |
| 10 | `URNA_ENCERRADA` | ESTADO | 6 | Ativa e encerra a urna do evento ativo (congela v1) |
| 11 | `EVENTO_CONCLUIDO` | ESTADO | 6 | Urna encerrada e evento concluído |
| 12 | `RESULTADO_PADRAO` | RESULTADO | 7 | Semana Tech com o volume PADRAO, encerrada em T0 |
| 13 | `RESULTADO_EMPATE_RESOLVIDO` | RESULTADO | 7 | c02 e c03 empatam (17,00); júri decide o 2º |
| 14 | `RESULTADO_EMPATE_PERSISTENTE` | RESULTADO | 7 | c01 e c02 empatam (28,00): 1º compartilhado |
| 15 | `RESULTADO_CO_VENCEDORES` | RESULTADO | 7 | c02 e c03 dividem o 2º e a categoria do júri |
| 16 | `RESULTADO_DOIS_CANDIDATOS` | RESULTADO | 7 | Só c01 e c02 publicados (61,32 e 38,68) |
| 17 | `FESTIVAL_ENCERRADO` | RESULTADO | 7 | Festival com infantil (138 votos em 3 totens) |
| 18 | `RESULTADO_SEM_INFANTIL` | RESULTADO | 7 | Festival com o infantil desligado antes do cálculo |
| 19 | `FESTIVAL_EMPATE_RESOLVIDO` | RESULTADO | 8 | c02 e c03 empatam (27,68); júri decide |
| 20 | `FESTIVAL_EMPATE_PERSISTENTE` | RESULTADO | 8 | c01 e c02 empatam (33,35): 1º compartilhado |
| 21 | `FESTIVAL_CO_VENCEDORES` | RESULTADO | 8 | c02 e c03 dividem o 2º e o júri |

Os 21 da lista D10 da Etapa 9. Todos aplicam, reaplicam com o mesmo estado (os de resultado) e deixam `verificarInvariantes` vazia nos dois eventos (`src/dominio/cenarios.test.ts`, `volume.test.ts` e `apresentacao/apresentacao.test.ts`). A demonstração usa `PADRAO` e `FESTIVAL_EMPATE_RESOLVIDO`; reservas: `RESULTADO_PADRAO`, `FESTIVAL_ENCERRADO` e `SEM_ENCERRAMENTO_AUTOMATICO`.


## Ações de auditoria (21, `AcaoAuditoria` em `src/dominio/tipos.ts`)

Rótulo, grupo e descrição de cada uma estão em `src/dominio/auditoria.ts` (`CATALOGO_AUDITORIA`, tipado por `Record<AcaoAuditoria, …>`: nenhuma ação fica sem rótulo; ação desconhecida cai em `OUTRAS`).

| Grupo | Ações | Dona |
|---|---|---|
| Estado | `EVENTO_ATIVADO`, `URNA_ABERTA`, `URNA_ENCERRADA` (com `origem`), `EVENTO_CONCLUIDO` | Etapa 0 |
| Júri | `CONVITE_RESGATADO` | Etapa 3 |
| Segurança | `TENTATIVA_CODIGO_INVALIDA`, `BLOQUEIO_RATE_LIMIT` | Etapa 3 |
| Júri | `VOTO_JURI_REGISTRADO`, `VOTO_JURI_ALTERADO` | Etapa 5 |
| Configuração | `CONFIG_ALTERADA`, `TEMA_ALTERADO`, `CONVITES_GERADOS`, `CONVITE_REVOGADO`, `CANDIDATO_DESQUALIFICADO`, `CANDIDATO_CORRIGIDO` | Etapa 6 |
| Exportação | `EXPORTACAO_CSV` (`detalhes.arquivo`), `RELATORIO_GERADO` (`detalhes.versao`) | Etapa 7 |
| Apresentação | `REVELACAO_INICIADA`, `REVELACAO_CONCLUIDA`, `REVELACAO_REFEITA`, `EMERGENCIA_ACIONADA` (`detalhes`: só `versao` e `cena`) | Etapa 8 |

Nunca vão para a auditoria: escolha de voto popular ou infantil, código de convite, e-mail.

## Códigos de erro (26, `CodigoErro` em `src/servicos/resultado.ts`)

Genéricos: `VALIDACAO`, `NAO_ENCONTRADO`, `NAO_AUTORIZADO`, `CONFLITO`, `REDE`, `ERRO_INTERNO`. Autenticação: `CREDENCIAIS_INVALIDAS`, `EMAIL_NAO_VERIFICADO`, `CADASTRO_NAO_CONCLUIDO`. Convite: `CODIGO_INVALIDO`, `CODIGO_USADO`, `CODIGO_REVOGADO`, `CODIGO_EXPIRADO`, `LIMITE_TENTATIVAS`, `JA_VOTOU_COMO_PUBLICO`, `JA_E_JURADO`. Estado: `EVENTO_INDISPONIVEL`, `EVENTO_CONCLUIDO`, `URNA_NAO_ABERTA`, `URNA_ENCERRADA`, `RESULTADO_INDISPONIVEL`, `TRAVADO`. Voto: `JA_VOTOU`, `PAPEL_INVALIDO`, `CANDIDATO_INDISPONIVEL`, `VOTO_PROPRIO`. Textos em `src/servicos/mensagens.ts`.

`ModoFalha` (6): `NENHUMA`, `REDE_NAO_GRAVOU`, `REDE_GRAVOU`, `URNA_ENCERRA`, `JA_VOTOU_OUTRA_SESSAO`, `ERRO_INTERNO`.

## Invariantes (`verificarInvariantes`, `src/dominio/invariantes.ts`)

| No código | Nos planners | Regra |
|---|---|---|
| 1 | I1 | Slugs únicos; uma participação por (usuário, evento) |
| 2 | I2 | Pesos inteiros, somam 100; módulo desligado tem peso 0 |
| 3 | I3 | Nº de `Voto` = nº de participações `PUBLICO` com `votou` |
| 4 | I4 | Nº de `VotoJuri` = nº de `JURADO` com `votou`; todo `VotoJuri` tem histórico |
| 5 | I5 | Todo voto e histórico aponta para candidato (e participação) do mesmo evento |
| 6 | I6 | Convite `USADO` aponta para participação `JURADO` do mesmo evento |
| 7 | I7 | Versões do resultado sequenciais; urna `ENCERRADA` tem ao menos uma versão (ligada na Etapa 7) |
| 8 | (rev. 3, C5) | Candidato publicado tem imagem |
| 9 | I8 (Etapa 7) | Por versão: placares somam os totais; pesos efetivos e pontuações somam 100 (ou 0); pontos por grupo somam a pontuação; posições 1, 1, 3 |

## Autotestes (lista vazia = ok)

| Função | Onde | Botão na toolbar |
|---|---|---|
| `verificarInvariantes` | `dominio/invariantes.ts` | Inspetor, "Conferir apuração", "Conferir roteiro e motor" |
| `conferirApuracao` | `dominio/apuracaoAutoteste.ts` | Dashboard → "Conferir apuração" |
| `conferirRoteiro`, `conferirMotor`, `conferirFixturesFestival` | `dominio/apresentacao/autotestes.ts` | Apresentação → "Conferir roteiro e motor" |

Todos também rodam em `pnpm test` (Vitest, só `src/dominio/**` e `src/lib/**`).

## Estado de tela e de desenvolvimento

- `ui`: `palcoAtivo`, `apresentacao` (Etapa 8), `bloqueioCodigo`, `bloqueioLoginCodigo`, `loginPendente`, `reenvioVerificacaoAteMs` (Etapa 3), `votacao` (Etapa 5), `dashboard.resultadoVisivel` (Etapa 7, C17).
- `dev`: `slugPadrao`, `latenciaMs`, `simularErroRede`, `falhaProxima`, `simularVotosEntrando` (Etapa 7), `toolbarModo`, `toolbarRecolhida`, `vinculosVoto`, `simularTrailerFalha` (Etapa 8).

## Dependências

`lucide-react` 1.52.0 e `qrcode.react` 4.2.0 (versões fixadas); `vitest` 5.0.3 só em `devDependencies`. Gerenciador: `pnpm` (sem `package-lock.json`).
