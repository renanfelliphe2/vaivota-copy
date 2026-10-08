# Fronteira de dados

O que a trilha de produção (Prisma + Supabase) precisa trocar. O protótipo guarda todo o `banco` no navegador; esta página diz por onde os dados passam hoje e o que não pode continuar assim.

## Dois pontos de troca (Etapa 9, D2)

1. **`src/servicos/`**: tudo o que viria do servidor. Funções assíncronas que devolvem `Resultado<T>` (`{ ok: true, dados }` ou `{ ok: false, erro: { codigo, mensagem } }`), com latência e falhas simuladas. Na produção viram chamadas ao servidor (rotas ou *server actions*) com as **mesmas assinaturas**. Não existe `repo.ts`.
2. **`src/store/seletores/`**: estado público lido direto do `banco` (evento, tema, candidatos, sessão, situação). Hoje leem as tabelas inteiras; na produção leem dados já filtrados que o servidor entregou.

Reaproveitável sem mudança: `src/dominio/**` (regras puras: apuração, travas, situação, roteiro e motor do palco, exportação, auditoria) e `src/lib/**` (tempo, formatação, CSV, contraste, tema).

## Regras comuns dos serviços

- Releem o estado depois de cada `await` e validam antes de gravar.
- Serviços de admin revalidam a participação `ADMIN` **do evento** (`exigirAdmin`; senão `NAO_AUTORIZADO`).
- **Leituras** obedecem só a `simularErroRede` e **não consomem** a falha pontual (`iniciarServico({ leitura: true })`). **Ações** consomem `REDE_NAO_GRAVOU` e `ERRO_INTERNO`. Os serviços de voto interpretam os seis `ModoFalha`.

## Serviços

| Serviço | Arquivo | Tipo | Consome a falha pontual | Erros principais | Tela |
|---|---|---|---|---|---|
| `entrar`, `entrarComGoogle`, `registrar`, `confirmarCodigo`, `reenviarCodigo` | `auth.ts` | ação | sim | `CREDENCIAIS_INVALIDAS`, `EMAIL_NAO_VERIFICADO`, `CADASTRO_NAO_CONCLUIDO`, `LIMITE_TENTATIVAS`, `VALIDACAO` | Entrada do evento, código |
| `resgatarConvite`, `garantirParticipacao` | `auth.ts` | ação | sim | `CODIGO_*`, `JA_VOTOU_COMO_PUBLICO`, `JA_E_JURADO`, `LIMITE_TENTATIVAS` | Convite |
| `entrarComo`, `sair` | `sessao.ts` | ação | não | — | Menu do usuário |
| `votarPopular`, `votarJuri` | `votacao.ts` | ação | todos os modos | `JA_VOTOU`, `URNA_*`, `PAPEL_INVALIDO`, `CANDIDATO_INDISPONIVEL`, `VOTO_PROPRIO`, `REDE` | Votar |
| `consultarEstadoVoto` | `votacao.ts` | leitura | não | `REDE` | Votar (verificação antes de reenviar) |
| `salvarGeral` | `configGeral.ts` | ação | sim | `TRAVADO`, `VALIDACAO`, `CONFLITO` | Configuração · Geral |
| `criarCandidato`, `salvarCandidato`, `alterarPublicacao`, `reordenarCandidato`, `removerCandidato`, `desqualificarCandidato`, `salvarCamposExtras` | `candidatosAdmin.ts` | ação | sim | `TRAVADO`, `VALIDACAO`, `CONFLITO` | Configuração · Candidatos |
| `listarConvites` | `convites.ts` | leitura | não | `NAO_AUTORIZADO` | Configuração · Júri |
| `gerarConvites`, `renomearConvite`, `revogarConvite`, `registrarExportacaoConvites` | `convites.ts` | ação | sim | `TRAVADO`, `VALIDACAO` | Configuração · Júri |
| `salvarPlacar` | `placarConfig.ts` | ação | sim | `TRAVADO`, `VALIDACAO` | Configuração · Placar |
| `listarPresetsTema` / `salvarTema` | `temaConfig.ts` | leitura / ação | não / sim | `VALIDACAO` | Configuração · Tema |
| `ativarEvento`, `abrirUrna`, `encerrarUrna`, `concluirEvento` | `operacao.ts` | ação | sim | `VALIDACAO`, `CONFLITO`, `URNA_*`, `EVENTO_CONCLUIDO` | Configuração · Operação |
| `obterOperacao`, `obterResultado`, `obterVotosJuri`, `listarAuditoria` | `dashboard.ts` | leitura | não | `NAO_AUTORIZADO`, `RESULTADO_INDISPONIVEL`, `REDE` | Painel |
| `prepararExportacao` | `exportacao.ts` | ação (audita) | sim | `RESULTADO_INDISPONIVEL`, `VALIDACAO` | Painel · Exportar |
| `registrarRelatorioGerado` | `relatorio.ts` | ação (audita) | sim | `RESULTADO_INDISPONIVEL` | Relatório |
| `obterStatusResultado`, `obterEstadoAoVivo`, `carregarRevelacao`, `obterDadosEnsaio` | `apresentacao.ts` | leitura | não | `NAO_AUTORIZADO`, `RESULTADO_INDISPONIVEL`, `VALIDACAO`, `REDE` | Sala e palco |
| `registrarAcaoApresentacao` | `apresentacao.ts` | ação sem espera (*fire and forget*) | não | `NAO_AUTORIZADO`, `REDE` | Palco |

Escritas fora de `servicos/` (só estado de tela ou ferramenta do protótipo): `store/acoesVotacao.ts` (`ui.votacao`), `store/acoesDashboard.ts` (`ui.dashboard` e controles da toolbar), `store/acoesApresentacao.ts` (`ui.apresentacao`, `ui.palcoAtivo`), `store/acoes.ts` (toolbar), `store/transicoes.ts` (transições puras usadas por `operacao.ts`, pelo relógio e pela toolbar).

## Dados expostos ao cliente que o servidor real não pode expor (Etapa 9, 5.11)

| Dado | Onde está hoje | O que a produção faz |
|---|---|---|
| `votos`, `votosInfantis` | `banco`, sem usuário | Só o servidor lê; o cliente nunca recebe a lista |
| `votosJuri`, `historicoVotosJuri` | `banco`, ligados à participação | Admin do evento lê a escolha identificada (Resultado e `jurados.csv`, exportação auditada); o jurado lê só o próprio |
| `Participacao` | `banco`, sem `criadoEm` (nunca nasce com o voto, C2) | Igual; o schema já não tem `criadoEm` (F-1) |
| `dev.vinculosVoto` | `dev` | Não existe em produção (só serve ao "Resetar meu voto") |
| `ui.bloqueioCodigo`, `ui.bloqueioLoginCodigo` | `ui`, no cliente | Bloqueio de tentativas é do servidor; o cliente só exibe |
| `hashRecibo` do voto | `hashMock("recibo:{eventoId}:{sequência}")` | **Aleatório de 32 bytes**, nunca derivado de sequência, id ou instante (C20) |
| `ConviteJurado.hashCodigo` | `banco`; o código legível só no retorno de `gerarConvites` | Hash no servidor; o código nunca volta depois da criação |
| `Usuario.email` | `banco` (inclui os 515 usuários gerados `vol-NNNN@demo.com`) | O cliente recebe só o próprio perfil e o nome de quem o admin pode ver; nenhuma tela, CSV ou auditoria mostra e-mail |
| Código de login `123456` | Constante do mock, mostrada na tela | Código de uso único por e-mail (Resend), validado pelo Better Auth |
| `resultados` | `banco`, lidos por serviço | Servidor entrega só o oficial (maior versão) e só com a urna encerrada |
| `auditoria` | `banco` | Só admin do evento |
| Contagem por candidato durante a votação | Calculada em `dashboard.ts`/`apresentacao.ts` e filtrada pela flag `parcialAoVivo` | Cálculo e filtro no servidor |
| Estado público (evento, tema, candidatos, sessão) | Seletores lendo tabelas inteiras | Seletores sobre dados já filtrados |

## Produção: pontos que não podem ser copiados do mock

- `hashRecibo`: aleatório de 32 bytes (C20).
- Bloqueio de tentativas (`ui.bloqueioCodigo`, `ui.bloqueioLoginCodigo`): servidor (D8 rev. 3).
- `congelarResultado` roda numa transação junto com a transição de urna (encerrar e desqualificar), e a leitura nunca recalcula.
- O seed de volume (`src/mocks/volume/`) e os cenários são ferramentas do protótipo; não existem em produção.
