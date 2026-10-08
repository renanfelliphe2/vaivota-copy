# VaiVota — Fase 1 · Etapa 7: Dashboard

> **Rotas:** `/e/[slug]/admin` (com `?aba=operacao|resultado`) e `/e/[slug]/admin/relatorio`, as duas no grupo `(painel)`
> **Depende de:** Etapa 0 (store, `transicoes`, `registrarAuditoria`, `useConsulta`, `Abas`, `AdminShell`, `RotaGuard`, tipos `ResultadoOficial`/`DadosResultado`, cenários), Etapa 1 (`resolverSituacaoEvento`, que traz `TEMPO_ESGOTADO`), Etapa 3 (convites resgatados e auditoria de resgates e bloqueios), Etapa 5 (`aplicarVotoPopular`/`aplicarVotoJuri`, votos e histórico do júri, auditoria do júri) e Etapa 6 (`resolverFaseConfig`, `lib/csv.ts`, `dominio/convites.ts`, chamada a `congelarResultado` com `DESQUALIFICACAO`, ações de auditoria)
> **Alimenta:** Etapa 8 (`apurar`, `congelarResultado`, `obterResultado`, gerador de volume, fixtures e os seis cenários `RESULTADO_*`, `SimuladorVotos`, `LineChart`/`BarChart`) e Etapa 9 (matriz V1–V40, catálogo de auditoria, lista de errata)
> **Fontes:** `Dashboard.md` (seções 3 a 11), `Jurado.md` (seções 5, 7, 8 e 10), `VotoInfantil.md` (seção 9), `ModoApresentacao.md` (seções 6, 8 e 10), `schema.prisma` (`ResultadoOficial`, `Auditoria`, `Dispositivo`, `VotoInfantil`, `ConfigApresentacao.parcialAoVivo`), `Etapa8 Apresentacao.md` antigo (seção 8, que esta etapa absorve), Contexto (itens E7-1 a E7-20, T7 a T9, T12 a T15, T17, T18, F2, F3, F5 a F7, F11, A3, A4, A17, A19), `DocumentDesign.md` v1.1 (seções 5.4, 7.5, 7.6, 8.1, 8.3 e 9).
> **Status:** versão final consolidada. Substitui `Etapa7 Dashboard.md`. **Revisão 3 (07/10/2026):** aplica as decisões do documento de pendências (itens B1, B2, C2, C3, C11, C15, C16, C17, C18, D11, D13, D15, D16, D17, D19, E16, E24). **Revisão 4 (07/10/2026):** A8, A7, A2, A3, A4 (E21 conferido: nenhuma citação de votos do júri no telão; os votos identificados continuam só para o ADMIN; A6 sem menção a carga nesta etapa).

---

## 1. Objetivo

Entregar o painel do admin em `/e/[slug]/admin`, com as abas **Operação** (acompanhar a votação) e **Resultado** (resultado oficial depois do encerramento), a **exportação em CSV** e o **relatório imprimível**. Esta etapa também é a **dona da apuração**: `apurar` e `congelarResultado` (fórmula, empates, categorias, versões) e o **seed de volume** que faz o protótipo parecer um evento de verdade. A Etapa 8 só consome.

Esta etapa precisa garantir:
- **Tudo deriva dos votos.** Não existe `contagens` no store: totais, série por minuto, participantes e resultado saem de `votos`, `votosJuri`, `votosInfantis` e `participacoes`, lidos **só por serviços** (D4 da Etapa 0). Um voto feito na Etapa 5 aparece no painel sem nenhum código extra.
- **Sigilo por construção.** Durante a votação o payload da Operação **não contém** voto por candidato (a menos que `parcialAoVivo` esteja ligado), e a escolha identificada do jurado só existe depois do encerramento. A tela pode estar espelhada no telão.
- **Uma só fonte do resultado.** Encerrar a urna, por qualquer caminho, passa por `transicoes.encerrarUrna` e gera a versão 1; desqualificar depois gera a versão 2. Dashboard, CSV, relatório e telão leem a **maior `versao`** e **nunca recalculam**.
- **Os números conferem entre si:** Operação, Resultado, CSV e relatório mostram os mesmos totais, e os resumos de convites usam as mesmas funções da Etapa 6.
- **Nenhuma tela mostra e-mail.** Jurados aparecem por nome ou rótulo; o CSV passa por uma redação de padrões de e-mail.
- **As invariantes continuam verdes** depois de cada ação, inclusive o voto simulado (cada voto simulado cria usuário e participação **antes** do voto, C2) e a nova invariante I8 (soma das pontuações).
- **Estados incoerentes forçados pela toolbar** seguem a precedência `CONCLUIDO` > `RASCUNHO` > urna (T13), e todo texto respeita D10 da Etapa 2 (nada concorda em gênero com o rótulo do tema).

## 2. Escopo

**Dentro**
- Aba **Operação**: estado da urna e tempo restante, totais por grupo, participantes por papel, votos por minuto com pico, jurados (votou/pendente), totens, resumo de convites, resumo e lista de auditoria, parcial por candidato (opcional) e atualização por polling.
- Aba **Resultado**: resultado oficial (versão, pesos, critério), classificação completa, empates e critério aplicado, categorias, candidatos fora da disputa, histórico de versões, linha do tempo e **votos identificados do júri** (só admin).
- **Apuração** (`apurar`, `congelarResultado`, `resumirApuracao`), com as regras de grupo sem votos, desqualificado, tolerância e empates (seção 5.2).
- **Exportação CSV** (seis arquivos) com disponibilidade por fase, confirmação do arquivo identificado e auditoria de cada download.
- **Relatório imprimível** (`window.print()` com CSS de impressão) e sua auditoria.
- **Seed de volume** na Semana Tech (PADRAO), volume do Festival e os sete cenários de resultado.
- `SimuladorVotos` (votos entrando), seção "Dashboard" da toolbar e `conferirApuracao` (autoteste puro).
- Catálogo de exibição da auditoria de todas as ações das Etapas 0 a 7 (`dominio/auditoria.ts`).
- Gráficos em SVG próprio (`LineChart`, `BarChart`).

**Fora (e em qual etapa fica)**
- Abrir, encerrar e concluir o evento, e edição de pesos → **Etapa 6** (o painel só lê o estado e oferece atalhos).
- Telão, revelação, trailer, ensaio → **Etapa 8** (aqui só o atalho "Abrir apresentação").
- Interruptor de admin para `parcialAoVivo` e tela de `ConfigApresentacao` → por seed e toolbar na Fase 1 (pendência P4).
- Gerar PDF no servidor, retenção e anonimização de dados pessoais (F11), super admin e gráficos avançados → fora da Fase 1 (o PDF continua sendo do navegador; qualquer geração no servidor fica para a trilha de produção, rev. 4, A2/A3).
- **Apuração do júri por critério (Festival)** → requisito do Festival (rev. 4, A8), com planner próprio: notas por critério (Direção, Roteiro, Fotografia e Som; `Criterio` e `NotaJuri`). Proposta registrada: placar do júri do candidato = soma das médias dos critérios dadas pelos jurados, normalizada como os outros grupos (P21). Esta etapa apura o **voto simples** do júri, que continua valendo para a Semana Tech.
- Gestão real de totens e dispositivos (pareamento, quiosque com PIN, voto infantil) → planner próprio **"Totem"** (rev. 4, A7, a escrever). A aba Operação já lê os dispositivos do seed.
- Criar uma versão `CORRECAO` do resultado: o tipo existe (espelha o schema), mas nenhuma ação da Fase 1 a cria; a desqualificação é a única correção (C16, P13 resolvida).
- Navegação depois de "Concluir" e consolidação de cenários e documentação → **Etapa 9**.

---

## 3. Contrato com as outras etapas

### 3.1 O que esta etapa recebe

| Item | Dono |
|---|---|
| `Resultado<T>`, `CodigoErro` (`NAO_AUTORIZADO`, `RESULTADO_INDISPONIVEL`, `VALIDACAO`, `NAO_ENCONTRADO`, `REDE`, `ERRO_INTERNO`), `ModoFalha`, `atraso`, `simularFalha`, `registrarLog`, `servicos/mensagens.ts` | Etapa 0 |
| Store externo, `store.getState()`/`atualizar`, relógio simulado, `registrarAuditoria`, `useConsulta` (polling com pausa em aba oculta) | Etapa 0 |
| `store/transicoes.ts` (`encerrarUrna` chama `congelarResultado`; `forcarEstadoUrna` para trás descarta `resultados`) | Etapa 0 |
| Tipos `ResultadoOficial`, `DadosResultado`, `Grupo`, `MotivoResultado`, `Dispositivo`, `VotoInfantil`, `Auditoria`; `banco.resultados` versionado; `dominio/invariantes.ts` (I1 a I7, com I7 passando a valer aqui) | Etapa 0 |
| `RotaGuard(ADMIN)`, `AcessoRestrito`, `AdminShell` (selos de estado e atalhos), rotas `(painel)/page.tsx` e `(painel)/relatorio/page.tsx` como stubs | Etapa 0 |
| `Abas`, `Botao`, `Cartao`, `Selo`, `Alerta`, `Carregando`, `Dialogo`, `DialogoConfirmacao`, `Toast`, `LiveRegion`, `ContagemRegressiva`, `ImagemCandidato` | Etapa 0 |
| `lib/aleatorio.ts` (`criarGerador`, `hashDeTexto`), `lib/formatar.ts`, `lib/tempo.ts`, `lib/hash.ts`, `redistribuirPesos` | Etapa 0 |
| Seed núcleo dos dois eventos, usuários, convites em todos os estados, dispositivos do Festival, `ConfigApresentacao`, metas do volume (seção 5.6) | Etapa 0 |
| Mecanismo de cenários (`Cenario`, `mocks/cenarios.ts`), registro de seções da toolbar (`components/dev/secoes/`), `InspetorEstado` | Etapa 0 |
| `resolverSituacaoEvento` (inclui `TEMPO_ESGOTADO`) e o cenário `SEM_ENCERRAMENTO_AUTOMATICO` | Etapa 1 |
| Convites `USADO` com `participacaoId`; auditoria `CONVITE_RESGATADO`, `TENTATIVA_CODIGO_INVALIDA`, `BLOQUEIO_RATE_LIMIT` | Etapa 3 |
| `dominio/aplicarVoto.ts` (`aplicarVotoPopular`, `aplicarVotoJuri`, que mantêm as invariantes 3 e 4 e **não criam participação**: exigem a participação já existente, C2/D14 da Etapa 5); primeiro voto do júri já com histórico; auditoria `VOTO_JURI_REGISTRADO` e `VOTO_JURI_ALTERADO`; `simularFalha` com parâmetro para não consumir a falha pontual (errata D16 da Etapa 5) | Etapa 5 |
| `dominio/travas.ts` (`resolverFaseConfig`, tipo `FaseConfig`), `lib/csv.ts` (`montarCsv`, `baixarCsv`), `dominio/convites.ts` (`resumirConvites`), `lib/fusoHorario.ts`, auditoria `CONFIG_ALTERADA`, `TEMA_ALTERADO`, `CONVITES_GERADOS`, `CONVITE_REVOGADO`, `CANDIDATO_DESQUALIFICADO`, `CANDIDATO_CORRIGIDO` | Etapa 6 |
| Chamada `congelarResultado(…, "DESQUALIFICACAO")` ao desqualificar com a urna `ENCERRADA` | Etapa 6 |

### 3.2 O que esta etapa entrega

| Item | Consumidor |
|---|---|
| `dominio/apuracao.ts` (`apurar`), `dominio/resultado.ts` (`congelarResultado`, `resumirApuracao`, `gruposDoResultado`), `dominio/contagens.ts` (`contarVotos`) | Etapa 6 (desqualificação), Etapa 8 (roteiro e telão), Etapa 9 |
| `servicos/dashboard.ts`: `obterResultado` devolve a **maior versão** com `DadosResultado` e derivados | Etapa 8 (telão lê a mesma fonte) |
| `mocks/volume/` (`gerarVolume`, `restaurarNucleo`, tipo `DistribuicaoAlvo`, `DISTRIBUICOES`) e `mocks/cenarios/resultado.ts` | Etapa 8 (cenários e ensaio; consome `restaurarNucleo` e `DistribuicaoAlvo`, D13 rev. 3), Etapa 9 |
| Cenários `FESTIVAL_ENCERRADO`, `RESULTADO_PADRAO`, `RESULTADO_EMPATE_RESOLVIDO`, `RESULTADO_EMPATE_PERSISTENTE`, `RESULTADO_CO_VENCEDORES`, `RESULTADO_SEM_INFANTIL`, `RESULTADO_DOIS_CANDIDATOS` (os `RESULTADO_*` são registrados **por esta etapa**, D11 rev. 3) | Etapa 8, Etapa 9 |
| `components/dashboard/SimuladorVotos.tsx` e `store/simularVotos.ts`, montado **uma vez** no `GateEvento` da Etapa 0 (D12) | Etapa 8 (só lê; **não** monta o simulador) |
| `components/charts/LineChart.tsx`, `BarChart.tsx` | Etapa 8 |
| `dominio/auditoria.ts`: rótulo, grupo e descrição de **todas** as ações das Etapas 0 a 7 | Etapa 9 (consolida o catálogo da seção 7.1 do Contexto) |
| Ações de auditoria `EXPORTACAO_CSV` e `RELATORIO_GERADO` | Etapa 9 |
| Invariante I8 e `conferirApuracao` | Etapa 8, Etapa 9 |
| Matriz de verificação V1–V40 | Etapa 9 |

**Acréscimos ao contrato do conjunto** (para registrar na seção 10 do Contexto)
- `ui`: **um campo novo (rev. 3, C17):** `ui.dashboard.resultadoVisivel: string | null` (chave `eventoId:versao` do resultado já revelado na aba Resultado; zerado quando muda a versão). `dev`: **nenhum campo novo** (`simularVotosEntrando` já existe). `CodigoErro`: **nenhum novo**.
- Toolbar: seção **Dashboard** (seção 5.12). Cenários: os sete da tabela acima, incluindo os seis `RESULTADO_*` que a Etapa 0 atribuía à Etapa 8 (decisão D12).
- Auditoria: `EXPORTACAO_CSV`, `RELATORIO_GERADO`.
- Invariante: **I8** (seção 5.2). A I7 passa a ser verificada.
- Errata mínima na Etapa 0: **incorporada na rev. 2** (pendência P15); o CP1 confere.
- **Rev. 3:** `DadosResultado` (Etapa 0 §5.1) ganha `ranking[].pontosPorGrupo`, `desqualificados` e `pesosEfetivos`, preenchidos por `apurar` (D16); ajuste mínimo no `GateEvento` da Etapa 0 para montar o `SimuladorVotos` (D12); `RESULTADO_*` registrados por esta etapa (Anexo C da Etapa 0, D11).

---

## 4. Decisões

Só as decisões **novas** desta etapa. As do conjunto vivem na Etapa 0.

| # | Decisão | Motivo |
|---|---|---|
| D1 | **Esta etapa é a dona da apuração.** `apurar` é uma função pura em `dominio/apuracao.ts`; `congelarResultado` (em `dominio/resultado.ts`, no lugar do stub da Etapa 0) a chama e **acrescenta** um `ResultadoOficial` com `versao = maior + 1`. O tipo é o `DadosResultado` da Etapa 0, com os campos da rev. 3 (D16): `ranking[].pontosPorGrupo: Record<Grupo, number>`, `desqualificados: string[]` e `pesosEfetivos: Record<Grupo, number>`, **preenchidos por `apurar`** no congelamento; CSV `pontos_*`, "Fora da disputa" e telão leem daí, **sem recalcular**. O que mais for derivado sai de `resumirApuracao`. Absorve a seção 8 da Etapa 8 antiga: fórmula, tolerância de 6 casas, posição compartilhada, categorias. | E7-1: dois donos do resultado. A Etapa 0 já tipou `DadosResultado` com `empates[]` e `resolvido`. |
| D2 | **Normalização por grupo sobre a base dos candidatos que disputam.** `base[g]` = soma dos votos dos candidatos **não desqualificados**. `totais` e `placares` guardam a contagem **bruta** (inclui votos de desqualificado). **Grupo ligado com `base = 0` (rev. 3, C3):** não divide por zero e o peso dele é **redistribuído** proporcionalmente entre os grupos com `base > 0`: `pesoEfetivo[g] = peso[g] × 100 ÷ soma(peso dos grupos com base > 0)` (e `pesoEfetivo = 0` nos grupos com base 0). Se **todos** os grupos tiverem base 0, todas as pontuações são 0. Aviso na tela: "Grupo X sem votos: peso redistribuído". `pesosEfetivos` fica gravado em `DadosResultado` (D16). A invariante I8 vira "soma das pontuações = 100 quando algum grupo tem `base > 0`; senão 0". | A3 e A4 do Contexto, adiadas pela Etapa 6 (P3). Decididas na rev. 3 (C3): P7 e P8 resolvidas. |
| D3 | **Empates.** O critério (`JURI` ou `PUBLICO`) compara **votos brutos no grupo do critério**. Se o critério for `JURI` e o módulo júri estiver desligado, aplica-se `PUBLICO` e `criterioAplicado` registra o que foi realmente usado (a Etapa 6 só avisa, P6). Posição segue "1, 1, 3". **Categorias** desempatam só pela pontuação final; se persistir, há **co-vencedores**. Em posição compartilhada, a ordem de exibição é estável por `ordem` do candidato. | F5, A3 e P6 da Etapa 6. Evita decisão automática onde a regra não decide. |
| D4 | **Gatilhos do congelamento: só dois.** `transicoes.encerrarUrna` (versão 1, `ENCERRAMENTO`, vale para toolbar, Etapa 6 e relógio) e o serviço de desqualificação da Etapa 6 (nova versão `DESQUALIFICACAO`). Leitura **nunca** calcula nem grava. `calculadoPorId` é o usuário da sessão quando houver, senão `null`. | E7-3 e E7-4. D8 e D9 da Etapa 0. |
| D5 | **O painel só lê por serviços** (`servicos/dashboard.ts`, `exportacao.ts`, `relatorio.ts`) com `useConsulta`. Serviços de **leitura** obedecem só a `simularErroRede` (como `consultarEstadoVoto`, D8 da Etapa 5) e **não consomem** a falha pontual; **exportar** e **gerar relatório** são ações e consomem. Todo serviço revalida que a sessão é `ADMIN` **do evento** (`NAO_AUTORIZADO`): a UI esconde, o serviço recusa. | D3 e D5 da Etapa 0. E7-5. Reproduz o servidor real. |
| D6 | **A fase do painel vem de `resolverFaseConfig`** (Etapa 6), e o `incoerente` dela aciona o aviso de combinação criada pela toolbar. Componentes **nunca** comparam `estado` ou `estadoUrna`. A matriz da seção 5.1 acrescenta a linha de **Rascunho**. `TEMPO_ESGOTADO` vem de `resolverSituacaoEvento`. | E7-12 e T13. Uma só derivação para as Etapas 6 e 7. |
| D7 | **Aba na URL** (`?aba=operacao\|resultado`), usando a `Abas` da Etapa 0, e o **padrão é sempre Operação**, mesmo com a urna encerrada. A aba Resultado leva um aviso fixo: "Resultado: não exibir em tela espelhada antes da revelação." **Rev. 3 (C17):** com o resultado disponível, os números da aba ficam **ocultos** até o admin clicar em **"Mostrar resultado"**; o aviso fica ao lado do botão. O estado vive em `ui.dashboard.resultadoVisivel` (chave `eventoId:versao`) e é zerado quando muda a versão (uma versão 2 volta a ficar oculta). Exportações e relatório **não** dependem do clique. Aba Resultado fora de fase normaliza para Operação por `router.replace`. | E7-15 e A17: o admin pode estar com a tela espelhada no telão e a cerimônia ainda não começou. Linkável (atalhos da Etapa 8 e do relatório). P9 resolvida (C17). |
| D8 | **Sigilo em camadas.** (1) Operação **nunca** recebe voto por candidato; o bloco "parcial" só existe com `ConfigApresentacao.parcialAoVivo` ligado **e** urna `ABERTA`, e o serviço **omite** os números quando desligado. (2) A flag é **uma só** (a de `ConfigApresentacao`, usada também na Etapa 8), alterada nesta fase **só pela toolbar**. (3) A lista de jurados da Operação mostra **quem votou**, sem escolha e sem número de alterações, identificando cada jurado pelo **rótulo do convite** por padrão; o botão **"Mostrar nomes"** (estado local da tela) exibe os nomes (rev. 3, C18). (4) A escolha identificada e o histórico só saem em `obterVotosJuri` **depois do encerramento**, e a tabela fica atrás do botão **"Mostrar votos do júri"** (fechada por padrão; abrir **não** é auditado; exportar continua auditado; rev. 3, C15). (5) A lista de auditoria **não** nomeia jurado nem escolha (ator exibido como "Jurado"). | F2, E7-14 e T17. `Dashboard.md` seções 4 e 5. Reduz o que vaza se a tela for espelhada. |
| D9 | **Privacidade.** DTOs não carregam e-mail nem hash. Todo CSV passa por `redigirEmails` (padrão de e-mail vira "[e-mail omitido]"). Nenhum `detalhes` de auditoria é exportado cru. | `Dashboard.md`: "sem e-mails". Proteção contra texto digitado pelo admin (rótulos, motivos). |
| D10 | **Seed de volume aplicado em `criarEstadoInicial`** (o `PADRAO` já mostra um evento cheio). Gerador determinístico `gerarVolume`, parametrizado por distribuição-alvo, que **preserva o núcleo** (ids e fatos da Etapa 0) e subtrai o que já existe. Ajustes: série de **60 minutos** com pico por volta de 2/3 (E7-10); convites 12 = 9 usados + 1 revogado + 1 disponível + 1 expirado (E7-8); auditoria com **25** entradas coerentes com os dados; usuários gerados `usr-v-NNNN` **fora** do "Entrar como"; votos de totens `PAUSADO` e `REVOGADO` **contam** (votos históricos, A19, E7-18). | Metas da seção 5.6 da Etapa 0. E7-10, E7-8, E7-18 e E7-16 (o gerador é reaproveitado pela Etapa 8). |
| D11 | **Fixtures e cenários de resultado.** Esta etapa registra `FESTIVAL_ENCERRADO` e os seis `RESULTADO_*` (a Etapa 0 os atribuía à Etapa 8), porque é dona da apuração e do gerador e precisa dos empates para validar as telas. Empate **persistente no 1º lugar** (cenário da Etapa 8) e empate **resolvido no 2º/3º**; o "6º" do planner antigo sai (E7-17). Todas as distribuições da seção 5.7 são **conferíveis à mão** e viram **testes Vitest** de `apurar` (D19 rev. 3). A Etapa 8 consome e **não** registra de novo (D11 da Etapa 0 rev. 3: `RESULTADO_*` são da Etapa 7, Anexo C). | Seção 2.3 do Contexto ("a 8 depende do módulo de fixtures da 7"). |
| D12 | **Votos simulados mantêm a invariante 3.** `SimuladorVotos` cria, por voto, um usuário gerado, **primeiro** a participação `PUBLICO` (com `criadoEm` anterior ao instante do voto, C2) e **depois** o `Voto` via `aplicarVotoPopular` (que não cria participação). Só roda com a urna `ABERTA` e a aba do navegador visível. **Rev. 3 (D15):** é montado **uma vez**, no `GateEvento` da Etapa 0 (ajuste mínimo feito por esta etapa e registrado no Anexo C da Etapa 0), ligado por `dev.simularVotosEntrando`; assim roda em qualquer tela do evento, inclusive sala e palco, e a Etapa 8 **não** o monta (só lê). A toolbar tem o interruptor e o botão "Adicionar N votos agora". | E7-11. Dar o botão evita esperar o relógio durante a validação. Um só ponto de montagem evita dois timers. |
| D13 | **Série temporal adaptativa.** Passo de **1 minuto** se o intervalo tem até 3 h, **10 min** até 24 h e **1 h** acima disso (o Festival dura mais de 80 h). O intervalo vai de `urnaAbertaEm` até o **agora** (urna aberta) ou `urnaEncerradaEm`. Pico = primeiro máximo. Fonte: `criadoEm` de `Voto`, `VotoJuri` e `VotoInfantil`. | A série de votos por minuto sai de `Voto.criadoEm` (Anexo B). O título do gráfico acompanha o passo. |
| D14 | **Gráficos em SVG próprio** (`LineChart`, `BarChart`) em `components/charts/`, só com tokens do tema, dentro de `<figure>` com `<figcaption>`, `role="img"` com resumo em `aria-label` e **tabela alternativa** em `<details>`. Valores sempre rotulados (nunca só cor). Sem Recharts (dependência não aprovada). | Seção 3.3 da Etapa 0. A troca fica isolada nesta pasta (pendência P1). |
| D15 | **Catálogo de exibição da auditoria** (`dominio/auditoria.ts`): rótulo, grupo e descrição de todas as ações das Etapas 0 a 7, com fallback para ação desconhecida. Acrescenta `EXPORTACAO_CSV` e `RELATORIO_GERADO` (entidade `Evento`; `detalhes` com `arquivo` ou `versao`). Cada download e cada impressão gera **uma** entrada. | T12 e A12. A Etapa 9 só consolida. |
| D16 | **Exportação.** Seis arquivos, formato de `lib/csv.ts` (Etapa 6). Números com vírgula decimal e **sem** separador de milhar; datas em ISO 8601 com offset; colunas de módulo desligado **omitidas**. Disponibilidade por fase (5.1). `prepararExportacao` registra a auditoria e devolve as linhas; o download é feito pelo componente. "Baixar tudo" faz downloads **em sequência** (um `.zip` exigiria dependência). `jurados.csv` pede confirmação antes. | Pendências 2 e 6 do planner antigo (P2 e P5 aqui). E7-7: reutiliza `lib/csv.ts`. |
| D17 | **Relatório.** A rota `relatorio` já existe em `(painel)` e herda o `AdminShell` (E7-19). A impressão esconde o shell e a toolbar por `data-print="ocultar"` (errata mínima na Etapa 0). Só existe com resultado oficial. **Não** traz votos identificados nem e-mail. `RELATORIO_GERADO` é registrado ao clicar em **Imprimir / Salvar como PDF**. | Proposta do planner antigo, mantida (P3). |
| D18 | **Textos neutros e rótulos do tema.** Títulos usam `rotuloCandidatos` do tema, sem artigo nem adjetivo concordando ("Votos por {rótulo}", "Classificação", "Fora da disputa"). Estados de candidato em texto neutro como na Etapa 6. | D10 da Etapa 2 (T10). |
| D19 | **Versões do resultado.** A aba mostra a maior versão e um `<details>` com o histórico (versão, motivo, data e hora). A versão 2 por desqualificação **não** apaga a 1 do `banco`. | D9 da Etapa 0. |
| D20 | **Falha de leitura mostra o último dado bom.** Se uma atualização falhar, a tela mantém o que já tinha, mostra um `Alerta` "Não foi possível atualizar. Mostrando dados de HH:MM:SS." e tenta de novo no próximo ciclo. O horário "Atualizado às" usa `aria-live="off"`: só mudanças de estado (urna encerrada) são anunciadas, uma vez, pela `LiveRegion`. | Evita a tela piscar e evita anunciar a cada ciclo. |

---

## 5. Modelo e regras

### 5.1 Fase do painel e disponibilidade

A fase vem de `resolverFaseConfig(evento)` (Etapa 6), com a precedência da Etapa 1 (`CONCLUIDO` > `RASCUNHO` > urna). Componentes só perguntam a fase; nunca leem `estadoUrna`.

| Fase | Aba Operação | Aba Resultado | Exportações | Relatório |
|---|---|---|---|---|
| `RASCUNHO` | Só o estado vazio: "O evento ainda não foi ativado", com `Link` para Configuração, seção Operação. Nenhum card | Desabilitada ("disponível depois do encerramento") | Só `auditoria` (rev. 3, C11); as demais desabilitadas ("disponível depois de ativar o evento") | Indisponível |
| `ATIVO_NAO_INICIADA` | Zeros com texto explicativo, janela prevista, convites, auditoria; gráficos com estado vazio | Desabilitada | Só as de **operação** | Indisponível |
| `URNA_ABERTA` | Completa, com polling de 5 s e tempo restante (ou "Tempo esgotado", D7 da Etapa 0) | Desabilitada | Só as de **operação** | Indisponível |
| `URNA_ENCERRADA` | Completa e estática; selo "Votação encerrada" | **Habilitada** | Todas | Disponível |
| `CONCLUIDO` | Somente leitura (banner), estática | Somente leitura | Todas | Disponível |

- **Arquivos de operação:** `votos_por_minuto`, `dispositivos` (só com módulo infantil) e `auditoria`. **Arquivos de resultado:** `resumo_evento`, `resultado_candidatos` e `jurados` (este só com módulo júri).
- **Resultado habilitado, mas sem versão calculada** (ex.: evento `CONCLUIDO` com urna `ABERTA`, criado pela toolbar): a aba mostra "O resultado oficial ainda não foi calculado" e os arquivos de resultado e o relatório ficam desabilitados com esse motivo. O serviço devolve `RESULTADO_INDISPONIVEL`.
- **Combinação incoerente** (`incoerente = true`): `Alerta` no topo, "Combinação criada pela toolbar. Use a toolbar para voltar a um estado válido." A fase manda; os dados exibidos são os que existem.
- **Polling** só na fase `URNA_ABERTA` e só na aba Operação. Nas demais fases a consulta roda uma vez (e de novo ao voltar à aba).
- **Concluído** é somente leitura para o evento (nenhuma configuração); exportar continua permitido e continua auditado.
- **`TEMPO_ESGOTADO`** (T14): urna aberta, encerramento automático desligado e janela vencida. O card da urna mostra o selo e "Aguardando a organização encerrar a votação", com `Link` para Configuração, seção Operação. **Votar continua permitido** (D7 da Etapa 0).

### 5.2 Apuração (`dominio/apuracao.ts`, `dominio/resultado.ts`)

```ts
type EntradaApuracao = {
  candidatos: { id: string; ordem: number; desqualificado: boolean }[]   // todos os publicados do evento
  votos: Record<Grupo, Record<string, number>>                            // votos brutos por candidato
  pesos: Record<Grupo, number>                                            // inteiros; 0 para módulo desligado
  gruposAtivos: Grupo[]                                                   // POPULAR sempre; JURI e INFANTIL conforme o módulo
  criterio: RegraDesempate
}
apurar(entrada: EntradaApuracao): DadosResultado                          // pura; sem relógio, sem store

congelarResultado(
  estado: EstadoApp, eventoId: string, motivo: MotivoResultado,
  opcoes?: { calculadoPorId?: string | null; calculadoEm?: Instante }   // sem calculadoEm, usa o relógio simulado
): EstadoApp                                                              // pura; acrescenta uma versão

resumirApuracao(dados: DadosResultado, pesos: Record<Grupo, number>): {
  gruposSemBase: Grupo[]            // ativos com base 0 (peso redistribuído, C3)
  pesoRedistribuido: number         // soma dos pesos configurados desses grupos (repassada aos demais via dados.pesosEfetivos)
  foraDaDisputa: string[]           // = dados.desqualificados (D16; não recalcula)
  criterioEfetivo: RegraDesempate   // o aplicado de fato (ver passo 6 abaixo)
}
gruposDoResultado(dados): Grupo[]   // = dados.categorias.map(c => c.grupo); grupo ativo é o que tem categoria
```

**Passos de `apurar`**
1. **Placares.** Para cada grupo ativo, `placares[g]` lista **todos** os candidatos publicados (inclusive desqualificados) com votos **brutos**, ordenados por votos (desc) e, em empate, por `ordem`. `totais[g]` é a soma bruta. Grupo inativo: `totais[g] = 0` e `placares[g] = []`.
2. **Base.** `base[g]` = soma dos votos dos candidatos **não desqualificados** (D2). Desqualificado não entra no ranking nem nas categorias; fica só nos placares e em `desqualificados` (D16).
3. **Pesos efetivos** (C3): `S` = soma de `pesos[g]` dos grupos ativos com `base[g] > 0`. Se `S > 0`, `pesosEfetivos[g] = pesos[g] × 100 ÷ S` para esses grupos e 0 para os demais; se `S = 0` (nenhum grupo com votos), todos os `pesosEfetivos` são 0. Sem nenhum grupo com base 0, `pesosEfetivos = pesos`.
4. **Pontuação** (em pontos de 0 a 100):
   `pontosPorGrupo(c, g) = pesosEfetivos[g] × votos(c, g) ÷ base[g]` (0 quando `base[g] = 0`)
   `pontuacao(c) = Σ por grupo ativo de pontosPorGrupo(c, g)`
   Arredonda a **6 casas** antes de qualquer comparação (evita separar empatados por erro de ponto flutuante). `pontosPorGrupo` fica gravado em cada item do `ranking` (D16).
5. **Ranking.** Ordena por pontuação (desc). Empatados recebem a **mesma posição** e a seguinte pula (1, 1, 3).
6. **Desempate** de cada trecho empatado: compara os votos brutos no grupo do critério (`JURI` → grupo `JURI`; `PUBLICO` → `POPULAR`). Se o critério for `JURI` e o módulo júri estiver desligado, usa `PUBLICO` (D3). Cada trecho vira uma entrada de `empates[]`:
   - `posicoes`: o trecho disputado (ex.: `[2, 3]`); `candidatoIds`: os empatados; `criterioAplicado`: o critério **efetivo**.
   - `resolvido = true` se, depois do critério, todas as posições do trecho ficaram distintas; o candidato que fica com a melhor posição é o `vencedorId`.
   - Se o critério separa só parte do trecho, `resolvido = false`, os candidatos ainda iguais **compartilham** posição e `vencedorId` só é preenchido se o critério isolou um único primeiro colocado.
   - Nunca se desempata por `ordem`, sorteio ou ordem alfabética: sem decisão, há posição compartilhada.
7. **Categorias.** Uma por grupo ativo (`POPULAR` sempre): vence quem tem mais votos brutos no grupo, entre os candidatos **não desqualificados**. Empate: desempata pela **pontuação final** (`desempatadoPorPontuacao = true` quando isso decide); se persistir, todos os empatados são **co-vencedores**. Grupo sem nenhum voto: `vencedores = []`.
8. Devolve `DadosResultado` com `criterioDesempate` = o configurado, `pesosEfetivos`, `desqualificados` e `pontosPorGrupo` em cada item do ranking (D16).

Os passos acima tratam o júri como **voto simples** (Semana Tech). No Festival o júri vota **por critério** (rev. 4, A8); a forma como as notas viram o placar do júri é pendência [Usuário] (P21) e entra com o planner próprio.

**`congelarResultado`** lê `contarVotos` e a configuração do evento (`ConfigPlacar`, módulos, candidatos), chama `apurar`, e grava `ResultadoOficial` com `versao`, `motivo`, os três pesos, `dados`, `calculadoPorId` e `calculadoEm` = relógio simulado. Não audita (quem chamou já audita: `URNA_ENCERRADA` ou `CANDIDATO_DESQUALIFICADO`).

**Pontuação na tela:** duas casas decimais, vírgula (`lib/formatar.ts`). Se dois candidatos com posições diferentes ficarem com a mesma exibição, a coluna inteira passa a quatro casas, para o admin ver o que decidiu.

**Invariante I8** (acrescentada em `dominio/invariantes.ts`), para **cada** versão de `resultados` do evento:
- para cada grupo, a soma de `placares[g].votos` = `totais[g]`;
- a soma de `ranking[].pontuacao` = **100** quando algum grupo ativo tem base > 0; senão **0** (tolerância de 1e-6) (rev. 3, C3);
- a soma de `pesosEfetivos` = 100 quando algum grupo ativo tem base > 0; senão 0; e, em cada item, a soma de `pontosPorGrupo` = `pontuacao`;
- as posições do ranking seguem a regra 1, 1, 3 (sem buracos fora do salto de empate).

A **I7** (urna `ENCERRADA` tem ao menos uma versão) passa a ser verificada. `forcarEstadoUrna` para trás descarta as versões (Etapa 0), e voltar a `ENCERRADA` gera uma nova versão 1.

**Autoteste puro.** `conferirApuracao(): string[]` (`dominio/apuracaoAutoteste.ts`) roda `apurar` sobre as seis fixtures da seção 5.7, compara com os resultados escritos à mão e devolve a lista de divergências (vazia = ok). É acionado pelo botão da seção Dashboard da toolbar. **Rev. 3 (D19):** as mesmas fixtures viram **testes Vitest** de `apurar` em `dominio/apuracao.test.ts` (números esperados = os das tabelas da 5.7), mais o caso de grupo ligado sem votos (redistribuição), o de todos os grupos sem votos (pontuações 0), o de critério `JURI` com júri desligado e um **empate de 3 ou mais candidatos** (E24); rodam em `pnpm test`.

### 5.3 Contagens e DTOs

`dominio/contagens.ts` (puro): `contarVotos(banco, eventoId)` devolve `Record<Grupo, Record<candidatoId, number>>` e `contarParticipantes(banco, eventoId)` devolve cadastrados e votaram por papel (`PUBLICO`, `JURADO`; `ADMIN` não conta). Só serviços, `transicoes`, cenários e o simulador os chamam.

```ts
type SerieVotos = {
  passoMinutos: 1 | 10 | 60
  inicio: Instante                                   // urnaAbertaEm; vazia se a urna nunca abriu
  pontos: { inicio: Instante; popular: number; juri: number; infantil: number }[]
  pico: { inicio: Instante; votos: number } | null   // total do intervalo; primeiro máximo
}

type OperacaoDados = {
  eventoId: string
  fase: FaseConfig; incoerente: boolean; situacao: SituacaoEvento
  janela: { inicio: Instante; fim: Instante; encerramentoAutomatico: boolean }
  urna: { abertaEm: Instante | null; encerradaEm: Instante | null }
  modulos: { juri: boolean; infantil: boolean }
  totais: Record<Grupo, number>                      // brutos; grupo desligado = 0
  participantes: { publico: { cadastrados: number; votaram: number };
                   jurado:  { cadastrados: number; votaram: number } }
  serie: SerieVotos
  jurados: { rotulo: string | null; nome: string; votou: boolean }[]   // sem escolha, sem nº de alterações
  totens: { nome: string; estado: EstadoDispositivo; ultimoUso: Instante | null; votos: number }[]
  convites: { disponiveis: number; usados: number; revogados: number; expirados: number }
  auditoria: { resumo: ResumoAuditoria; itens: ItemAuditoria[] }        // até 50, mais recentes primeiro
  parcialAoVivo: boolean
  parcial: { candidatoId: string; votos: number }[] | null              // null salvo flag ligada e urna ABERTA
  resultadoDisponivel: boolean                       // existe versão e a fase permite
  geradoEm: Instante
}

type ResultadoVisao = {
  versao: number; motivo: MotivoResultado; calculadoEm: Instante
  pesos: Record<Grupo, number>
  dados: DadosResultado
  derivados: ReturnType<typeof resumirApuracao>
  versoes: { versao: number; motivo: MotivoResultado; calculadoEm: Instante }[]
  evento: { inicio: Instante | null; fim: Instante | null; candidatosNaDisputa: number }
  serie: SerieVotos
}

type VotosJuriVisao = {
  jurados: { nome: string; rotulo: string | null; votou: boolean
             candidatoId: string | null; atualizadoEm: Instante | null
             historico: { candidatoAnteriorId: string | null; candidatoId: string; em: Instante }[] }[]
}

type ItemAuditoria = { id: number; criadoEm: Instante; acao: string; grupo: GrupoAuditoria; descricao: string; ator: string }
type ResumoAuditoria = { porGrupo: Record<GrupoAuditoria, number>; bloqueiosRateLimit: number; alteracoesVotoJuri: number; ultimaEm: Instante | null }
```

Os candidatos aparecem por `candidatoId`; a tela resolve o título pelo seletor público de candidatos (a Etapa 0 permite). **Nenhum DTO carrega e-mail, hash de código nem `ipHash`.**

### 5.4 Serviços (`servicos/dashboard.ts`, `servicos/exportacao.ts`, `servicos/relatorio.ts`)

Todos `Promise<Resultado<T>>`, com `atraso()`, relendo `store.getState()` depois de cada `await` e validando **antes** de gravar. Todos começam por: sessão é `ADMIN` do `eventoId`? Senão `NAO_AUTORIZADO`.

| Serviço | Entrada | Efeito | Erros | Falha simulada |
|---|---|---|---|---|
| `obterOperacao` | `eventoId` | Só leitura. Monta `OperacaoDados` | `NAO_AUTORIZADO`, `NAO_ENCONTRADO`, `REDE` | só `simularErroRede` |
| `obterResultado` | `eventoId` | Só leitura. Maior `versao` + derivados + série | `NAO_AUTORIZADO`, `RESULTADO_INDISPONIVEL` (fase fora de encerrada/concluído **ou** sem versão), `REDE` | só `simularErroRede` |
| `obterVotosJuri` | `eventoId` | Só leitura. Votos identificados e histórico | `NAO_AUTORIZADO`, `RESULTADO_INDISPONIVEL` (antes do encerramento), `REDE` | só `simularErroRede` |
| `listarAuditoria` | `eventoId`, `grupo?`, `limite?` (padrão 50, máx. 200) | Só leitura | `NAO_AUTORIZADO`, `REDE` | só `simularErroRede` |
| `prepararExportacao` | `eventoId`, `arquivo` | Valida disponibilidade (5.1), monta cabeçalho e linhas (5.10), **registra `EXPORTACAO_CSV` num único `atualizar`** e devolve `{ nome, cabecalho, linhas }` | `NAO_AUTORIZADO`, `RESULTADO_INDISPONIVEL`, `VALIDACAO` (arquivo inexistente ou de módulo desligado), `REDE`, `ERRO_INTERNO` | padrão (consome a pontual) |
| `registrarRelatorioGerado` | `eventoId` | Valida que há resultado; registra `RELATORIO_GERADO` com a `versao` | `NAO_AUTORIZADO`, `RESULTADO_INDISPONIVEL`, `REDE`, `ERRO_INTERNO` | padrão (consome a pontual) |

**Regras comuns**
- O **resumo de convites** usa `resumirConvites(convites, agora)` da Etapa 6, então os números batem com a seção Júri por construção.
- `jurados[]` vem de `participacoes` (`JURADO`) e do nome do usuário; o **rótulo** vem do convite `USADO` ligado à participação. Ordem: pendentes primeiro, depois por rótulo.
- `totens[].ultimoUso` = `Dispositivo.ultimoUsoEm` (campo do schema; rev. 3, D17).
- `jurados[]` traz `rotulo` e `nome`; a tela mostra o **rótulo** por padrão e o nome só depois de "Mostrar nomes" (C18).
- O **ator** da auditoria (`ItemAuditoria.ator`) é o nome para quem tem participação `ADMIN` no evento; "Jurado" ou "Participante" para os demais; "Sistema" quando `atorUsuarioId` é nulo (ex.: encerramento automático).
- O serviço de leitura **não muta** nada. A única mutação do painel é a auditoria de exportação e de relatório.

### 5.5 Aba Operação

Blocos, do mais importante ao mais detalhado. Módulo desligado **some** do painel (Semana Tech: júri ligado, infantil desligado; Festival: ambos ligados).

| Bloco | Conteúdo e regras |
|---|---|
| **Estado da urna** | Selo (`NAO_INICIADA`, `ABERTA`, `ENCERRADA`, `TEMPO_ESGOTADO`), "Aberta desde", tempo restante (`ContagemRegressiva`), janela configurada. Não iniciada: "A urna ainda não foi aberta" e, se a janela já começou, "Aguardando a organização abrir a urna". `TEMPO_ESGOTADO`: texto da seção 5.1. Atalho para Configuração, seção Operação |
| **Totais por grupo** | `KpiCard` de popular, júri (se ligado) e infantil (se ligado). Mostra só o total do grupo, nunca por candidato. Grupo ligado sem votos mostra 0 com a dica "Nenhum voto ainda" |
| **Participantes** | Cadastrados e votaram, com % por papel (público e jurado). Nome do papel via texto fixo |
| **Votos por minuto** | `LineChart` do total com pico destacado (valor e horário), tabela alternativa em `<details>` com as colunas por grupo. Título acompanha o passo (D13): "Votos por minuto", "por 10 minutos" ou "por hora". Estado vazio sem gráfico quebrado |
| **Jurados** (júri ligado) | Lista com o **rótulo do convite** e a situação (**Votou** ou **Pendente**, ícone e texto); botão **"Mostrar nomes"** (estado local da tela, volta a ocultar ao sair) acrescenta o nome (rev. 3, C18). Totais "N de M votaram" iguais ao card de participantes. **Não mostra escolha nem número de alterações** (D8). Botão "Copiar pendentes" (nomes, um por linha; com fallback manual se `navigator.clipboard` não existir) |
| **Totens** (infantil ligado) | Nome, estado (`ATIVO`, `PAUSADO`, `REVOGADO`, com ícone e texto), último uso e votos. Votos de totens pausados ou revogados contam (A19) e uma nota explica isso |
| **Convites** (júri ligado) | Disponíveis, usados, revogados, expirados, com `Link` "Gerenciar convites" para `configuracao?secao=juri` |
| **Auditoria** | Resumo (por grupo, bloqueios por tentativas, alterações de voto do júri) e lista dos eventos mais recentes com tipo, horário, descrição e ator, filtro por grupo. Sem escolha de voto, sem código de convite, sem nome de jurado |
| **Parcial por candidato** | Só com `parcialAoVivo` ligado **e** urna `ABERTA`: `BarChart` com votos por candidato e `Alerta` "Esta tela mostra votos por candidato. Não espelhe no telão." Desligado: o bloco não existe e uma faixa fixa diz "Placar por candidato oculto durante a votação" |
| **Exportar dados** | `ExportPanel` (5.10), o mesmo componente da aba Resultado |

Outros comportamentos
- **Atualização:** `useConsulta(obterOperacao, { intervaloMs: 5000, ativo: fase === URNA_ABERTA })`, com "Atualizado às HH:MM:SS" (D20) e botão "Atualizar agora".
- **Carregando:** esqueleto por card (`Carregando`). **Erro sem dado anterior:** `Alerta` com "Tentar de novo". **Erro com dado anterior:** D20.
- Quando a urna passa para encerrada com o painel aberto, a `LiveRegion` anuncia uma vez "Votação encerrada. O resultado oficial está disponível."

### 5.6 Aba Resultado

Ordem dos blocos (D7: o aviso vem primeiro):

1. `Alerta` fixo de tela espelhada (A17) **ao lado do botão "Mostrar resultado"** (rev. 3, C17). Enquanto `ui.dashboard.resultadoVisivel` não for igual a `eventoId:versao` da versão exibida, os blocos 2 a 9 **não mostram números** (nem nomes na classificação); só o botão, o aviso, o bloco 10 e o `ExportPanel`. Uma nova versão (ex.: desqualificação) volta a ocultar. Exportações e relatório não dependem do clique.
2. **Cabeçalho:** "Resultado oficial", versão, motivo (texto: "Encerramento", "Desqualificação", "Correção"), data e hora do cálculo, **pesos usados** e critério de desempate (o configurado e, se diferente, o efetivo, com a explicação "Critério JURI indisponível: júri desligado. Aplicado PUBLICO.").
3. **Avisos de apuração** (de `resumirApuracao` e `dados.pesosEfetivos`): grupo sem votos ("Grupo Júri sem votos: peso redistribuído", com os pesos efetivos ao lado dos configurados; rev. 3, C3), e candidatos fora da disputa. Todos os grupos sem votos: "Nenhum grupo recebeu votos: todas as pontuações são 0".
4. **Classificação** (`ClassificacaoTable`): posição, {rótulo do candidato}, votos e pontuação por grupo ativo, pontuação final e **indicador de empate** (ícone e texto: "Empate resolvido" ou "Posição compartilhada"). `<caption>`, cabeçalhos associados, rolagem horizontal contida em 360 px. Desqualificados aparecem num bloco **"Fora da disputa"** abaixo, com votos brutos e sem posição. Os pontos por grupo vêm de `ranking[].pontosPorGrupo` e a lista "Fora da disputa" de `dados.desqualificados` (D16), sem recalcular.
5. **Pontuação final** (`BarChart`), com os valores escritos nas barras ou ao lado.
6. **Empates** (`PainelEmpates`): para cada entrada, o trecho, quem empatou, o critério aplicado, os valores que decidiram e o desfecho ("decidido pela maior votação do júri" ou "posição compartilhada, sem decisão automática").
7. **Categorias** (`CategoriasCards`): uma por grupo ativo, com o rótulo do tema (`ConfigApresentacao`, ex.: "Favorito da comunidade"), vencedor e votos, co-vencedores e "desempatado pela pontuação final" quando for o caso. Sem vencedor: "Sem votos neste grupo".
8. **Linha do tempo** (`LineChart` reaproveitado) com o horário do pico, e **dados do evento**: período, candidatos na disputa e totais por grupo.
9. **Votos do júri** (`VotosJuriTable`, só com júri ligado): **fechada por padrão**, atrás do botão **"Mostrar votos do júri"** (estado local; abrir **não** é auditado; rev. 3, C15). Aberta: jurado, escolha, atualizado em e histórico de alterações expansível. Aviso de confidencialidade: "Estes votos são identificados e só a organização os vê. A exportação deste arquivo fica registrada na auditoria."
10. **Histórico de versões** (`<details>`, D19) e atalhos: **Abrir apresentação** (`Link` para `/e/[slug]/admin/apresentar`), **Ver relatório** e `ExportPanel`.

`CONCLUIDO`: tudo igual, com selo de somente leitura.

### 5.7 Seed de volume e fixtures de resultado

**Estrutura.** A Etapa 0 (rev. 2) já entrega `criarEstadoNucleo()` e um `criarEstadoInicial()` que o compõe. O CP2 mantém o núcleo intacto e faz `criarEstadoInicial()` passar a compor **núcleo + volume da Semana Tech**. O cenário `PADRAO` da Etapa 0 continua chamando `criarEstadoInicial`.

```ts
gerarVolume(estado: EstadoApp, opcoes: {
  eventoId: string
  distribuicao: DistribuicaoAlvo                // votos por candidato em cada grupo (tabelas abaixo)
  incluirNucleo: boolean                        // true: conta e preserva os votos do núcleo; false: parte do núcleo sem votos
  publicos: { cadastrados: number }             // participações PUBLICO no total (inclui as do núcleo)
  jurados: { convidados: number; convites: "CRIAR" | "REUSAR" }
  infantil: { votosPorDispositivo: Record<string, number> } | null
  auditoria: boolean
  janela: { inicio: Instante; fim: Instante }   // onde caem os instantes dos votos
  semente: string
}): EstadoApp                                   // pura e determinística
```

Regras do gerador
- **Determinismo:** `criarGerador(hashDeTexto(semente))`; nada de `Math.random` nem `Date.now`. A mesma entrada gera sempre o mesmo estado.
- **Núcleo intocado:** ids e fatos da Etapa 0 permanecem (Ana, Eva, Gabi, Bruno, Fábio, convites, candidatos). Com `incluirNucleo`, a distribuição-alvo **conta** o voto de Eva e o de Fábio, e o gerador cria só a diferença. Se o alvo de algum candidato for menor que o que o núcleo já deu a ele, o gerador **lança erro de seed** (nunca acontece em tempo de execução do usuário; é conferido no CP2).
- **Usuários gerados:** `usr-v-NNNN`, nome sorteado de listas fixas em `mocks/volume/nomes.ts`, e-mail `vol-NNNN@demo.com` (único, nunca exibido), e-mail verificado. Não entram no "Entrar como".
- **Participações antes dos votos (rev. 3, C2):** o gerador cria **primeiro** todas as participações (público e jurado), com `criadoEm` no início da janela ou antes (nunca igual ao instante de um voto), e **só depois** aplica os votos. `aplicarVoto*` não criam participação.
- **Votos:** criados por `aplicarVotoPopular` e `aplicarVotoJuri` (Etapa 5) com `criadoEm` **explícito**, o que mantém as invariantes 3 e 4. A atribuição dos candidatos aos instantes é embaralhada pelo gerador, então a classificação não vira uma faixa no tempo.
- **Curva no tempo:** distribuição triangular com **moda em 2/3 da janela**; o i-ésimo voto de N cai no quantil (i + 0,5) / N, mais uma variação de segundos. Todos os instantes ficam em `[janela.inicio, janela.fim]`.
- **Jurados:** cada jurado novo consome um convite (`CRIAR` gera convite `USADO` com rótulo "Jurado N", continuando a numeração; `REUSAR` usa os convites `DISPONIVEL` do evento). Dos jurados novos que votaram, `floor(n / 3)` **alteram** o voto uma vez (histórico com 2 entradas e auditoria `VOTO_JURI_ALTERADO`).
- **Auditoria** (`auditoria: true`): entradas coerentes com os dados, com `criadoEm` explícito (ver conferência do CP1) e ordenadas no tempo.
- **Totens:** `votosPorDispositivo` cria `VotoInfantil` por dispositivo, **inclusive** `PAUSADO` e `REVOGADO` (A19).

**Metas da Semana Tech no `PADRAO`** (resolve E7-8 e E7-10)

| Meta (em `T0`) | Valor | Nota |
|---|---|---|
| Participações | 520 = 511 `PUBLICO` + 9 `JURADO` | núcleo: Ana, Eva, Gabi (público); Bruno, Fábio (jurado). Gerados: 508 e 7 |
| Votos populares | 412 = participações `PUBLICO` com `votou` | Eva + 411 gerados |
| Jurados | 9 convidados, 7 votaram, 2 pendentes | Fábio + 6 gerados votaram; **Bruno** e mais 1 gerado pendentes |
| Convites | 12 = 9 `USADO` + 1 `REVOGADO` + 1 `DISPONIVEL` + 1 expirado | núcleo 5 (K7M3 disponível, H4TR e F3WJ usados, P8CD revogado, M6ZQ expirado) + 7 `USADO` gerados |
| Janela dos votos | `urnaAbertaEm` (13h) a `T0` (14h): **60 minutos** | pico por volta do 40º minuto |
| Auditoria | **25 entradas** | EVENTO_ATIVADO 1, URNA_ABERTA 1, CONVITES_GERADOS 1, CONFIG_ALTERADA 1, TEMA_ALTERADO 1, CONVITE_REVOGADO 1, CONVITE_RESGATADO 7, TENTATIVA_CODIGO_INVALIDA 3, BLOQUEIO_RATE_LIMIT 1, VOTO_JURI_REGISTRADO 6, VOTO_JURI_ALTERADO 2 |
| Totens | Nenhum (infantil desligado) | |
| Resultado | Nenhum enquanto a urna estiver aberta | |

**Distribuições-alvo** (votos brutos; pontuação = Σ peso efetivo × votos ÷ base; arredondada a 2 casas só aqui)

> **Conferência rev. 3 (C3):** nenhuma distribuição abaixo tem grupo **ligado** com base 0 (júri 7, 6, 7 e 2 votos; infantil 138 no Festival; em `RESULTADO_SEM_INFANTIL` o infantil está **desligado**, não ligado sem votos). Logo `pesosEfetivos = pesos` em todas e os números não mudam. A redistribuição é coberta pelos testes extras da 5.2 e pela V27.

*`PADRAO`* (Semana Tech; pesos 70/30; popular 412, júri 7; sem empates):

| | c01 | c02 | c03 | c04 | c05 | c06 | c07 | c08 |
|---|---|---|---|---|---|---|---|---|
| Popular | 118 | 96 | 61 | 52 | 41 | 24 | 15 | 5 |
| Júri | 2 | 2 | 1 | 1 | 1 | 0 | 0 | 0 |
| Pontuação | 28,62 | 24,88 | 14,65 | 13,12 | 11,25 | 4,08 | 2,55 | 0,85 |

(`cNN` = `cand-st-NN`. O candidato que recebeu o voto de Fábio tem de estar entre c01 e c05; conferir no CP2.)

*Fixtures de empate* (Semana Tech; pesos 70/30; popular 350, júri 6; `incluirNucleo: false`, então 3 jurados ficam pendentes):

| Cenário | | c01 | c02 | c03 | c04 | c05 | c06 | c07 | c08 | Resultado esperado |
|---|---|---|---|---|---|---|---|---|---|---|
| `RESULTADO_EMPATE_RESOLVIDO` | Popular | 100 | 60 | 85 | 45 | 30 | 20 | 10 | 0 | c02 e c03 empatam em 17,00; critério `JURI` (1 × 0) dá o **2º a c02** e o 3º a c03; `empates[0]` = `[2, 3]`, `resolvido`, `vencedorId = c02` |
| | Júri | 2 | 1 | 0 | 1 | 1 | 1 | 0 | 0 | |
| | Pontuação | 30,00 | 17,00 | 17,00 | 14,00 | 11,00 | 9,00 | 2,00 | 0,00 | |
| `RESULTADO_EMPATE_PERSISTENTE` | Popular | 90 | 90 | 50 | 40 | 30 | 25 | 15 | 10 | c01 e c02 empatam em 28,00 e o critério não separa (2 × 2): **1º compartilhado**, depois 3º; `empates[0]` = `[1, 2]`, `resolvido = false`, sem `vencedorId`. As duas categorias (popular e júri) ficam com **co-vencedores** |
| | Júri | 2 | 2 | 1 | 1 | 0 | 0 | 0 | 0 | |
| | Pontuação | 28,00 | 28,00 | 15,00 | 13,00 | 6,00 | 5,00 | 3,00 | 2,00 | |
| `RESULTADO_CO_VENCEDORES` | Popular | 100 | 70 | 70 | 50 | 30 | 20 | 10 | 0 | 1º c01 (25,00); c02 e c03 empatam em 24,00 e **persistem no 2º**; categoria popular: c01; categoria júri (2 × 2, mesma pontuação): **co-vencedores c02 e c03** |
| | Júri | 1 | 2 | 2 | 1 | 0 | 0 | 0 | 0 | |
| | Pontuação | 25,00 | 24,00 | 24,00 | 15,00 | 6,00 | 4,00 | 2,00 | 0,00 | |

*`RESULTADO_DOIS_CANDIDATOS`* (Semana Tech; 412/7; só c01 e c02 publicados, os outros viram rascunho): popular 260 e 152, júri 4 e 3, pontuação **61,32** e **38,68**; pódio com dois nomes.

*`RESULTADO_PADRAO`:* a distribuição `PADRAO` com a urna encerrada em `T0`, sem empates.

*Festival* (`FESTIVAL_ENCERRADO`; pesos 50/30/20; 260 públicos cadastrados, 240 votaram; jurados A e B votaram, em candidatos diferentes; infantil 138 em 3 totens; `incluirNucleo: false`; janela do evento inteira, passo de 1 h):

| | c01 | c02 | c03 | c04 | c05 | c06 |
|---|---|---|---|---|---|---|
| Popular (240) | 70 | 55 | 42 | 35 | 25 | 13 |
| Júri (2) | 1 | 1 | 0 | 0 | 0 | 0 |
| Infantil (138) | 30 | 38 | 28 | 22 | 12 | 8 |
| Pontuação | 33,93 | 31,97 | 12,81 | 10,48 | 6,95 | 3,87 |

Totens: Hall 70, Pátio 41, Oficinas 27 (soma 138). Categorias esperadas: popular c01; infantil **c02**; júri empatado em 1 × 1, decidido pela **pontuação final** a favor de **c01** (`desempatadoPorPontuacao = true`).

*`RESULTADO_SEM_INFANTIL`:* a mesma distribuição do Festival sem os votos infantis e com o módulo infantil **desligado antes** do cálculo (`alternarModulo`, que redistribui os pesos mantendo a soma em 100). Esperado: sem categoria infantil, `totais.INFANTIL = 0` e soma das pontuações = 100.

Em todos os cenários, o **estado de partida** é o núcleo do evento (ver 5.12), e a urna é encerrada em `urnaEncerradaEm = T0` (Semana Tech) ou `janelaFim` (Festival).

### 5.8 Série temporal e gráficos

**Série** (`dominio/serie.ts`, pura). Intervalo: de `urnaAbertaEm` até `agora` (urna aberta) ou `urnaEncerradaEm`. Passo (D13): 1 min se o intervalo tem até 180 min; 10 min até 1440 min; 60 min acima. Cada ponto soma os votos cujo `criadoEm` cai no balde. Urna que nunca abriu: série vazia.

**`LineChart`** (props: `pontos`, `rotuloX`, `rotuloY`, `destaque?`, `alt`)
- `<figure>` + `<figcaption>`; `role="img"` com `aria-label` que resume ("Votos por minuto. Pico de 14 votos às 13:41").
- Linha e destaque do pico em `var(--tema-primaria-texto)`; eixos, grade e textos em tokens de texto. Sem hex.
- Tooltip por foco e por hover (setas movem entre pontos); rótulos legíveis em 360 px (menos marcas no eixo X, sem rolagem horizontal).
- Alternativa textual: `<details>` "Ver dados" com tabela (intervalo, popular, júri, infantil, total).
- Estado vazio: texto explicativo, sem eixo quebrado.

**`BarChart`** (props: `itens: { rotulo; valor; destaque? }[]`, `formato`, `alt`)
- Barras horizontais com o **valor escrito** ao lado de cada uma (nunca só cor); mesma alternativa textual.
- Usado na pontuação final e no parcial por candidato.

Os dois ficam em `components/charts/` e **não importam** store nem serviços (recebem dados por props), para a Etapa 8 reaproveitar.

### 5.9 Auditoria

**Catálogo de exibição** (`dominio/auditoria.ts`): para cada `acao`, `rotulo`, `grupo` e uma função `descrever(detalhes)` que devolve texto **sem** escolha de voto, sem código de convite e sem e-mail.

| Grupo | Ações | Exemplo de descrição |
|---|---|---|
| `ESTADO` | `EVENTO_ATIVADO`, `URNA_ABERTA`, `URNA_ENCERRADA`, `EVENTO_CONCLUIDO` | "Urna encerrada (automático)" / "(manual)" |
| `CONFIGURACAO` | `CONFIG_ALTERADA`, `TEMA_ALTERADO`, `CONVITES_GERADOS`, `CONVITE_REVOGADO`, `CANDIDATO_DESQUALIFICADO`, `CANDIDATO_CORRIGIDO` | "Convites gerados: 7" / "Janela alterada" |
| `JURI` | `CONVITE_RESGATADO`, `VOTO_JURI_REGISTRADO`, `VOTO_JURI_ALTERADO` | "Voto de jurado registrado" (sem nome, sem escolha) |
| `SEGURANCA` | `TENTATIVA_CODIGO_INVALIDA`, `BLOQUEIO_RATE_LIMIT` | "Código recusado" / "Campo bloqueado por excesso de tentativas" |
| `EXPORTACAO` | `EXPORTACAO_CSV`, `RELATORIO_GERADO` | "Arquivo resultado_candidatos baixado" / "Relatório gerado (versão 1)" |

- **Ação desconhecida** (de uma etapa futura): mostra o código e "Ação registrada", no grupo `OUTRAS`. Nunca quebra a lista.
- **Novas ações desta etapa:** `EXPORTACAO_CSV` (`entidade = "Evento"`, `detalhes = { arquivo }`) e `RELATORIO_GERADO` (`entidade = "Evento"`, `detalhes = { versao }`). O `ipHash` segue `hashMock("ip-demo")`.
- **Resumo:** contagem por grupo, `bloqueiosRateLimit`, `alteracoesVotoJuri` e a data da última entrada.
- O **ator** exibido segue a regra da seção 5.4 (jurados aparecem só como "Jurado").

### 5.10 Exportação

`ExportPanel` lista os seis arquivos com título, descrição, botão **Baixar** e, quando indisponível, o **motivo** em texto ("Disponível depois do encerramento"). "Baixar tudo" aparece quando há mais de um disponível e dispara os downloads **em sequência**, com um pequeno intervalo; um aviso explica que o navegador pode pedir permissão para vários downloads.

`prepararExportacao` devolve `{ nome, cabecalho, linhas }`. O componente chama `montarCsv` e `baixarCsv` (Etapa 6). Nome do arquivo: `{slug}-{arquivo}-{AAAAMMDD}.csv`, com a data do **relógio simulado**. Todo texto passa por `redigirEmails`.

| Arquivo | Disponível | Colunas (nesta ordem; `;` como separador) |
|---|---|---|
| `resumo_evento` | Encerrada, concluído (com resultado) | `campo;valor`, uma linha por: evento, slug, estado do evento, estado da urna, início e fim da janela, urna aberta em, urna encerrada em, versão e motivo do resultado, calculado em, pesos por grupo, critério de desempate, totais por grupo, participantes cadastrados e que votaram por papel, candidatos na disputa |
| `resultado_candidatos` | Encerrada, concluído (com resultado) | `posicao;candidato;situacao;votos_popular;votos_juri;votos_infantil;pontos_popular;pontos_juri;pontos_infantil;pontuacao_final;empate`. Colunas de grupo desligado omitidas. `pontos_*` vêm de `ranking[].pontosPorGrupo` e "Fora da disputa" de `dados.desqualificados` (D16, sem recalcular). `situacao` = `Na disputa` ou `Fora da disputa` (sem posição nem pontos); `empate` = `Nao`, `Resolvido` ou `Compartilhado` |
| `votos_por_minuto` | A partir de `ATIVO_NAO_INICIADA` | `intervalo_inicio;passo_minutos;popular;juri;infantil;total` (colunas de grupo desligado omitidas) |
| `jurados` | Encerrada, concluído (com resultado; só com júri ligado) | `jurado;rotulo;situacao;registro;candidato_anterior;candidato;registrado_em`. Uma linha por entrada de histórico; `situacao` = `Votou` ou `Pendente` (pendente sem as últimas quatro colunas). **Sem e-mail** |
| `dispositivos` | A partir de `ATIVO_NAO_INICIADA`; só com infantil ligado | `dispositivo;estado;ultimo_uso;votos` |
| `auditoria` | **Sempre**, inclusive em `RASCUNHO` (rev. 3, C11) | `registrado_em;acao;entidade;descricao;ator;motivo` (o `motivo` só quando o admin informou um; `ipHash` e `detalhes` crus nunca saem) |

Regras
- **Formato** (confirmado na rev. 3, E16): `lib/csv.ts` (UTF-8 com BOM, `;`, CRLF, aspas escapadas, neutralização de fórmulas). Números com **vírgula decimal e sem milhar** (`28,62`); datas em ISO 8601 com offset.
- **Confirmação** antes de `jurados`: "Este arquivo contém votos identificados. A exportação será registrada na auditoria."
- **Auditoria:** cada download gera uma entrada `EXPORTACAO_CSV`, e a lista da aba Operação passa a mostrá-la na próxima atualização. Falha em `prepararExportacao` **não** registra nada.
- **Sem e-mail:** nenhuma coluna carrega e-mail; `redigirEmails` é a rede de proteção contra texto digitado (rótulos, motivos).

### 5.11 Relatório imprimível

- **Rota** `/e/[slug]/admin/relatorio`, no mesmo guard do painel. Só renderiza o relatório com resultado oficial disponível (5.1); caso contrário mostra a explicação e um `Link` de volta ao painel.
- **Conteúdo** (`RelatorioView`): capa com `LogoEvento` e nome do evento, resumo (período, candidatos na disputa, totais e participantes), pesos e critério, classificação completa, categorias, empates com o critério, gráfico de votos por minuto e rodapé com data e hora de geração e a versão do resultado. **Sem** votos identificados do júri e sem e-mail.
- **Impressão** (`relatorio.print.css`, importado por `RelatorioView`): `@page` A4 com margens; `[data-print="ocultar"]` some (shell, toolbar, barra de ações, `SkipLink`, `Toast`); quebra de página antes de cada seção grande; linhas de tabela sem corte; barras e selos legíveis em **preto e branco** (rótulo e borda, não só cor).
- **Barra de ações** (some na impressão): **Imprimir / Salvar como PDF** e **Voltar ao painel**. O botão chama `registrarRelatorioGerado` e, ao receber `ok`, chama `window.print()`. Se o serviço falhar, mostra o erro e **não** imprime.
- **Marcador de impressão (já na Etapa 0 rev. 2, CP6 a CP8):** `AdminShell`, `DevToolbar`, `SkipLink` e o contêiner do `Toast` já têm `data-print="ocultar"`. Aqui só se confere e se escreve o CSS. Ctrl+P direto não passa pelo botão e não é auditado (pendência P14).

### 5.12 Toolbar e cenários

**Seção "Dashboard"** (`components/dev/secoes/SecaoDashboard.tsx`, registrada sem tocar no núcleo)

| Controle | Efeito |
|---|---|
| "Simular votos entrando" | Liga e desliga `dev.simularVotosEntrando`. O `SimuladorVotos` (montado no `GateEvento`, D12) cria +1 a +3 votos a cada 3 s (quantidade determinística), só com a urna `ABERTA` e a aba visível |
| "Adicionar votos agora" | Escolhe 10, 50 ou 200 e cria os votos de uma vez (urna `ABERTA`). Evita esperar o simulador durante a validação |
| "Mostrar parcial por candidato" | Liga e desliga `ConfigApresentacao.parcialAoVivo` do **evento ativo** (padrão `false` nos dois eventos do seed) |
| "Conferir apuração" | Roda `conferirApuracao()` e mostra a lista de divergências (vazia = ok), ao lado do resultado de `verificarInvariantes` |

**Cenários** (`mocks/cenarios/resultado.ts`, grupo `RESULTADO`, registrados no registro da Etapa 0). Todos puros, com **evento-alvo fixo** (a distribuição é desenhada para ele) e que também trocam `dev.slugPadrao` para o evento-alvo.

| Cenário | Evento | O que faz |
|---|---|---|
| `RESULTADO_PADRAO` | Semana Tech | Núcleo + volume `PADRAO` + urna encerrada em `T0` (resultado v1) |
| `RESULTADO_EMPATE_RESOLVIDO` | Semana Tech | Núcleo + fixture da seção 5.7 + urna encerrada |
| `RESULTADO_EMPATE_PERSISTENTE` | Semana Tech | idem, com a fixture de empate no 1º |
| `RESULTADO_CO_VENCEDORES` | Semana Tech | idem, com a fixture de co-vencedores |
| `RESULTADO_DOIS_CANDIDATOS` | Semana Tech | idem, só c01 e c02 votáveis |
| `FESTIVAL_ENCERRADO` | Festival | Núcleo + volume do Festival (com infantil) + urna encerrada em `janelaFim` |
| `RESULTADO_SEM_INFANTIL` | Festival | Como acima, sem infantil (módulo desligado antes do cálculo) |

Como cada cenário constrói o estado (todos idempotentes: aplicar duas vezes dá o mesmo resultado)
1. `restaurarNucleo(estado, eventoId)` (em `mocks/volume/`) remove **todas** as entidades do evento (usuários `usr-v-*`, participações, convites gerados, votos, histórico, votos infantis, auditoria gerada e resultados) e reinsere as do núcleo do seed, sem tocar no outro evento, na sessão, em `ui` nem em `dev` (exceto o `slugPadrao`).
2. Ajusta o evento: `estado = ATIVO`, `estadoUrna = ENCERRADA`, `urnaAbertaEm`, `urnaEncerradaEm` (Semana Tech: 13h e `T0`; Festival: `janelaInicio` e `janelaFim`).
3. `gerarVolume` com a distribuição do cenário.
4. `congelarResultado(…, "ENCERRAMENTO", { calculadoEm: urnaEncerradaEm })`.
5. Confere `verificarInvariantes` vazia (I7 e I8 incluídas), nos dois eventos.

Os cenários **não usam** `forcarEstadoUrna`, porque o relógio não faz parte do `EstadoApp` e os votos precisam cair dentro da janela do evento.

### 5.13 Textos e acessibilidade

- **Rótulos do tema** em títulos e listas (`rotuloCandidatos`, rótulos de categoria de `ConfigApresentacao`), sem concordância de gênero (D18). Estados de candidato: "Na disputa" e "Fora da disputa".
- **Textos fixos:** "Placar por candidato oculto durante a votação", "Resultado: não exibir em tela espelhada antes da revelação", "Votação encerrada", "Tempo esgotado", "Aguardando a organização encerrar a votação", "Fora da disputa", "Posição compartilhada, sem decisão automática", "Este arquivo contém votos identificados. A exportação será registrada na auditoria.", "O resultado oficial ainda não foi calculado", "Mostrar resultado", "Mostrar votos do júri", "Mostrar nomes", "Grupo X sem votos: peso redistribuído". Textos finais ficam pendentes de aprovação (P18).
- **Foco e estrutura:** um `h1` ("Painel"), `Abas` com `role="tablist"`, setas alternam e o foco vai ao painel ao trocar de aba; tabelas com `<caption>` e cabeçalhos associados; `Esc` fecha diálogos e o foco volta a quem os abriu.
- **Estado nunca só por cor:** selos, indicadores de empate, situação de jurado e de totem têm ícone e texto.
- **Atualização:** "Atualizado às HH:MM:SS" com `aria-live="off"`; só a mudança de estado da urna é anunciada (D20).
- **Responsivo:** 360 px sem rolagem horizontal da página (tabelas largas rolam dentro do próprio contêiner), 768 px, 1280 px e 1920 px (tela espelhada). Alvos de toque de 44 px.
- **Movimento:** `prefers-reduced-motion` desliga transições dos gráficos e do destaque do pico.
- **Contraste:** nenhum texto abaixo de 4,5:1 nos dois temas (D15 da Etapa 0); linhas e barras dos gráficos usam `--tema-primaria-texto`.

### 5.14 Matriz de verificação (V1–V40)

Todos os testes são feitos **na mesma aba** (D18 da Etapa 0), navegando por `Link` e trocando de usuário pela toolbar ("Entrar como"). Confirme `verificarInvariantes` vazia (I7 e I8 incluídas) **depois de cada linha** e use o `InspetorEstado` para conferir `banco.resultados` e `banco.auditoria`. Salvo indicação, o evento é a Semana Tech no `PADRAO`.

| # | Cenário | Como provocar | Resultado esperado |
|---|---|---|---|
| V1 | Acesso | Carla em `/e/semana-tech/admin`; depois Ana, Hugo e deslogado; Hugo em `/e/ver-e-fazer-filmes/admin` | Carla entra; Ana e Hugo veem `AcessoRestrito` sem nenhum dado; deslogado vai para `/e/semana-tech?de=…`; Hugo entra no Festival |
| V2 | Abas na URL | Abrir `?aba=operacao`, `?aba=resultado` (urna aberta), `?aba=xyz` | Operação abre; Resultado fora de fase e valor inválido normalizam para Operação; foco no painel ao trocar de aba |
| V3 | Fases | Toolbar: Rascunho, Ativo + não iniciada, urna Aberta, Encerrada, Concluído | Cada fase mostra o que a tabela 5.1 diz (inclusive a linha de Rascunho, com só `auditoria` disponível, C11); concluído fica em somente leitura |
| V4 | Estados incoerentes | Toolbar: Concluído com urna Aberta; Rascunho com urna Encerrada | Aviso de combinação criada pela toolbar; a fase manda; Resultado vazio ou desabilitado conforme 5.1; nenhum erro no console |
| V5 | Totais e participantes | Painel no `PADRAO` | Popular 412; júri 7; sem infantil; público 511 cadastrados e 412 votaram; jurado 9 e 7 |
| V6 | Módulos | Toolbar: desligar e ligar júri e infantil, nos dois eventos | O que está desligado some de totais, jurados, totens, convites, categorias e CSV; Semana Tech nasce sem infantil e Festival com |
| V7 | Sigilo da Operação | Urna aberta, parcial desligado; inspecionar a resposta no `InspetorEstado` ou no console | `parcial = null`; nenhuma tela mostra voto por candidato; faixa "Placar por candidato oculto durante a votação" |
| V8 | Voto reflete no painel | Ana vota (Etapa 5) e volta ao painel | Popular +1, votaram +1 e % atualizados, sem recarregar a página |
| V9 | Simulador | Ligar "Simular votos entrando"; trocar de aba do navegador; desligar; encerrar a urna | Totais sobem a cada ciclo, também fora do painel (montado no `GateEvento`, D12); para com a aba oculta e retoma; para ao desligar e ao encerrar; invariante 3 verde (cada voto simulado criou a participação **antes** do voto, com `criadoEm` anterior) |
| V10 | Adicionar votos | "Adicionar votos agora" (10, 50, 200) com a urna aberta; depois com a urna encerrada | Totais sobem na hora; com a urna encerrada o controle fica desabilitado |
| V11 | Votos por minuto | Gráfico no `PADRAO`; depois com +1 h no relógio e urna encerrada | 60 pontos de 1 minuto e pico por volta do 40º minuto; título "por minuto"; tabela alternativa confere o total; legível em 360 px |
| V12 | Jurados | Lista de jurados; "Copiar pendentes" | 9 jurados, 2 pendentes (Bruno e mais 1) listados primeiro, identificados pelo **rótulo**; "Mostrar nomes" exibe os nomes (C18); sem escolha e sem número de alterações; copia nomes (ou mostra o texto para copiar à mão) |
| V13 | Totens | Festival com `FESTIVAL_ENCERRADO` | Três totens com estado em ícone e texto; Hall 70, Pátio 41, Oficinas 27; nota de que votos de totens pausados e revogados contam |
| V14 | Convites | Card de convites e seção Júri da Etapa 6 | 1 disponível, 9 usados, 1 revogado, 1 expirado (12), **iguais** nas duas telas; "Gerenciar convites" leva a `?secao=juri` |
| V15 | Auditoria | Lista e resumo no `PADRAO`; filtrar por grupo | 25 entradas; resumo com 1 bloqueio e 2 alterações de voto do júri; nenhuma linha traz escolha, nome de jurado ou código de convite |
| V16 | Parcial por candidato | Ligar "Mostrar parcial por candidato" com a urna aberta; desligar; encerrar com ele ligado | Bloco e alerta de espelhamento aparecem; sem a flag o bloco some; encerrada, o bloco não existe (a informação vive no Resultado) |
| V17 | Tempo esgotado | `SEM_ENCERRAMENTO_AUTOMATICO`, relógio no "Fim da janela" | Selo "Tempo esgotado" e aviso; Ana ainda consegue votar; link para Operação da Etapa 6 |
| V18 | Encerrar gera a versão 1 | Encerrar pela toolbar; refazer pela seção Operação da Etapa 6; refazer deixando o relógio fechar | Cada caminho gera **uma** versão 1 (`ENCERRAMENTO`) e **uma** auditoria `URNA_ENCERRADA`; aba Resultado habilitada; `LiveRegion` anuncia uma vez |
| V19 | Resultado `PADRAO` | `RESULTADO_PADRAO`, aba Resultado | Números ocultos até "Mostrar resultado" (C17); depois, classificação e pontuações da tabela da seção 5.7; soma = 100,00; sem empates; categorias coerentes; `pesosEfetivos` = pesos |
| V20 | Empate resolvido | `RESULTADO_EMPATE_RESOLVIDO` | c02 em 2º e c03 em 3º, ambos 17,00; painel de empates explica "decidido pela maior votação do júri" (1 × 0) |
| V21 | Empate persistente | `RESULTADO_EMPATE_PERSISTENTE` | "1º compartilhado" e depois 3º; indicador "Posição compartilhada, sem decisão automática"; categorias com co-vencedores |
| V22 | Co-vencedores | `RESULTADO_CO_VENCEDORES` | c02 e c03 compartilham o 2º; categoria do júri com os dois; popular só c01 |
| V23 | Sem infantil | `RESULTADO_SEM_INFANTIL` | Sem categoria infantil; sem coluna infantil na classificação e no CSV; soma das pontuações = 100,00 |
| V24 | Dois candidatos | `RESULTADO_DOIS_CANDIDATOS` | Dois nomes (61,32 e 38,68); sem erro em gráficos e tabelas |
| V25 | Festival encerrado | `FESTIVAL_ENCERRADO` | Pontuações da tabela do Festival; categoria infantil c02; júri empatado e desempatado pela pontuação final a favor de c01; série por **hora** |
| V26 | Desqualificar depois de encerrar | `RESULTADO_PADRAO`; na Etapa 6, desqualificar c01 | Nova versão 2 (`DESQUALIFICACAO`); c01 em "Fora da disputa" com votos brutos; demais pontuações recalculadas sobre a base sem c01; soma = 100,00; versão 1 continua em "Histórico de versões"; a versão 2 volta a ficar oculta até "Mostrar resultado" (C17) |
| V27 | Grupo sem votos | (a) Festival no `PADRAO` (sem votos): Urna → Encerrada pela toolbar. (b) Festival no `PADRAO`: Urna → Aberta, "Adicionar votos agora" (10, só populares), Urna → Encerrada | (a) Todos os grupos com base 0: todas as pontuações 0 e 1º compartilhado; `pesosEfetivos` todos 0; categorias "Sem votos neste grupo"; aviso "Nenhum grupo recebeu votos"; sem divisão por zero nem erro. (b) Júri e infantil ligados com base 0: avisos "Grupo Júri sem votos: peso redistribuído" e "Grupo Infantil sem votos: peso redistribuído"; `pesosEfetivos` = popular 100 (50 × 100 ÷ 50), júri 0, infantil 0; soma das pontuações = 100,00 (C3) |
| V28 | Critério `JURI` sem júri | `RESULTADO_EMPATE_PERSISTENTE`; Urna → Aberta; desligar o júri; Urna → Encerrada | Critério efetivo `PUBLICO` e explicação no cabeçalho; c01 e c02 continuam empatados (90 × 90) |
| V29 | Exportações por fase | Painel em cada fase | Rascunho: só `auditoria` (C11); não iniciada e aberta: só operação, com o motivo nos demais; encerrada e concluído: todas (dispositivos só com infantil, jurados só com júri) |
| V30 | Formato do CSV | Baixar os seis arquivos e abrir no Excel e no LibreOffice | Acentos preservados, colunas separadas por `;`, vírgula decimal, datas ISO; cabeçalhos conforme 5.10 |
| V31 | Sem e-mails | Procurar `@` em todos os arquivos, no relatório e nas telas | Nenhum e-mail; texto digitado com e-mail sai como "[e-mail omitido]" |
| V32 | Arquivo identificado | Baixar `jurados` | Confirmação antes; entrada `EXPORTACAO_CSV` com `arquivo = jurados` na auditoria |
| V33 | Baixar tudo | "Baixar tudo" em encerrada | Arquivos em sequência, cada um com a sua entrada de auditoria |
| V34 | Falhas | `REDE_NAO_GRAVOU` e erro de rede persistente: baixar um arquivo e esperar uma atualização do painel | Exportação com falha mostra erro, **não** audita e **não** baixa; leitura com erro de rede mantém os dados antigos com o aviso de D20; a falha pontual não é consumida por leitura |
| V35 | Relatório | `RESULTADO_PADRAO`, `/admin/relatorio`, pré-visualização de impressão, nos dois temas | A4 com quebras de página, sem shell, toolbar nem botões; legível em preto e branco; `RELATORIO_GERADO` ao imprimir; com a urna aberta mostra a explicação |
| V36 | Votos identificados | Aba Resultado, bloco do júri; clicar "Mostrar votos do júri"; consulta antes de encerrar | Fechado por padrão; aberto, mostra jurado, escolha e histórico, sem e-mail, com o aviso; abrir **não** gera auditoria (C15); antes do encerramento o serviço devolve `RESULTADO_INDISPONIVEL` |
| V37 | Aviso de espelhamento | Encerrar a urna e abrir o painel; ir à aba Resultado; clicar "Mostrar resultado"; trocar de aba e voltar; baixar `resultado_candidatos` e abrir o relatório **sem** clicar | Abre na Operação; Resultado traz o aviso ao lado do botão "Mostrar resultado" e **nenhum número** antes do clique; depois do clique os números aparecem e continuam visíveis na mesma versão (`ui.dashboard.resultadoVisivel = eventoId:versao`); CSV e relatório funcionam sem o clique (C17) |
| V38 | Consistência numérica | Comparar totais de Operação, Resultado, CSV e relatório; repetir depois de votos da Etapa 5 | Os mesmos números nos quatro lugares |
| V39 | Autoteste e invariantes | "Conferir apuração" e `verificarInvariantes` depois de cada cenário | Autoteste vazio; `pnpm test` verde (D19); I7 e I8 verdes; sem violação da 3 e da 4 depois de votos simulados |
| V40 | Responsividade, teclado e leitor | 360, 768, 1280 e 1920 px; só teclado; `prefers-reduced-motion` | Sem rolagem horizontal da página; ordem de foco lógica; abas por setas; foco visível; gráficos com alternativa textual; contraste ≥ 4,5:1 nos dois temas |

---

## 6. Estrutura de arquivos

```
src/app/e/[slug]/admin/(painel)/
  page.tsx                          # só compõe <TelaDashboard /> (o layout já tem RotaGuard e AdminShell)
  relatorio/page.tsx                # só compõe <RelatorioView />

src/components/dashboard/
  TelaDashboard.tsx                 # resolve ?aba, polling, avisos de fase (SimuladorVotos fica no GateEvento, D12)
  BannerPainel.tsx                  # incoerente, somente leitura, tempo esgotado
  KpiCard.tsx
  OperacaoTab.tsx
  EstadoUrnaCard.tsx
  TotaisCards.tsx
  ParticipantesCard.tsx
  VotosPorMinuto.tsx
  JuradosCard.tsx
  TotensTable.tsx
  ConvitesResumo.tsx
  AuditoriaPainel.tsx               # resumo + lista + filtro
  ParcialPorCandidato.tsx
  ResultadoTab.tsx
  ClassificacaoTable.tsx
  PainelEmpates.tsx
  CategoriasCards.tsx
  ForaDaDisputa.tsx
  VotosJuriTable.tsx
  HistoricoVersoes.tsx
  ExportPanel.tsx
  SimuladorVotos.tsx
src/components/relatorio/
  RelatorioView.tsx
  BarraAcoesRelatorio.tsx
  relatorio.print.css
src/components/charts/
  LineChart.tsx
  BarChart.tsx
src/components/dev/secoes/
  SecaoDashboard.tsx                # toolbar (5.12)

src/dominio/
  apuracao.ts                       # apurar
  apuracao.test.ts                  # Vitest: fixtures da 5.7, redistribuição, todos sem votos, JURI sem júri, empate de 3+ (D19, E24)
  resultado.ts                      # congelarResultado (substitui o stub), resumirApuracao, gruposDoResultado
  apuracaoAutoteste.ts              # conferirApuracao (fixtures da 5.7)
  contagens.ts                      # contarVotos, contarParticipantes
  serie.ts                          # montarSerie (passo adaptativo)
  auditoria.ts                      # catálogo de exibição, descrever, resumir
  exportacao.ts                     # arquivosDisponiveis, montagem das linhas, redigirEmails
  invariantes.ts                    # + I8 (e I7 ativa)

src/servicos/
  dashboard.ts                      # obterOperacao, obterResultado, obterVotosJuri, listarAuditoria
  exportacao.ts                     # prepararExportacao
  relatorio.ts                      # registrarRelatorioGerado

src/store/
  simularVotos.ts                   # criar votos simulados (puro) + helper do agendador
  seletores/                        # (sem seletor novo de dados do painel: ele lê por serviço)

src/mocks/
  volume/
    gerarVolume.ts
    restaurarNucleo.ts
    distribuicoes.ts                # DISTRIBUICOES (tabelas da 5.7)
    nomes.ts
  cenarios/resultado.ts             # 7 cenários, registrados em mocks/cenarios.ts
  criarEstadoInicial.ts             # compõe núcleo + volume da Semana Tech (criarEstadoNucleo separado)
```

Arquivos de outras etapas **que esta etapa não toca** (se faltar algo, ajusta-se aqui, não lá): `lib/csv.ts`, `dominio/travas.ts`, `dominio/convites.ts`, `dominio/aplicarVoto.ts`, `lib/tempo.ts`, `lib/useConsulta.ts`, `RotaGuard`, `Abas`. Exceções: as erratas mínimas da pendência P15, os registros de cenário e de seção da toolbar e, na rev. 3, o ajuste mínimo no `GateEvento` (Etapa 0) que monta o `SimuladorVotos` (D12, registrado no Anexo C da Etapa 0) e os campos novos de `DadosResultado` (D16) e de `ui.dashboard` (C17).

---

## 7. Checkpoints

Regras de entrega, convenções de código e dependências aprovadas são as da seção 3.3 da Etapa 0 e **não se repetem**. Cada checkpoint termina com a tela rodando, `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` sem erros, e só avança depois da validação. A ordem põe a apuração e os dados primeiro (todas as telas e todos os cenários dependem deles), depois a casca e a Operação, o Resultado, os arquivos e, por último, o relatório.

---

### CP1 — Conferência, contratos, apuração e invariantes (sem tela)

**Objetivo:** `apurar` e `congelarResultado` existem, conferidos à mão, e todos os gatilhos do encerramento geram o resultado certo.

**Tarefas**
- [ ] **Conferir o contrato da seção 3.1 contra o código** e ajustar **aqui** o que divergir (nunca criando nome novo). Em especial:
  - assinatura do stub `congelarResultado` e de `transicoes.encerrarUrna` (como obtêm o instante e o `calculadoPorId`); `ResultadoOficial.calculadoPorId` aceita `null`;
  - `registrarAuditoria`: tipo de `acao` com `EXPORTACAO_CSV` e `RELATORIO_GERADO`; aceita `criadoEm` explícito (o volume precisa); campos `entidade`, `entidadeId`, `detalhes`, `ipHash`;
  - `aplicarVotoPopular` e `aplicarVotoJuri` (**da Etapa 5**, não da 0): recebem o instante em `agoraMs` (então o seed de volume já passa um instante explícito) e **não criam participação** (rev. 3, C2: sem `idNovaParticipacao`; participação ausente → `NAO_AUTORIZADO`); se algo divergir, ajusta-se na Etapa 5, sem criar nome novo;
  - `simularFalha` com o parâmetro que **não** consome a falha pontual (errata D16 da Etapa 5) e como a leitura "obedece só `simularErroRede`";
  - `useConsulta`: recarrega quando a consulta muda? mantém `dados` anteriores quando a nova chamada falha (D20)?
  - `Abas` aceita aba desabilitada com dica e valor controlado;
  - campos de `Dispositivo` (nome, estado, `ultimoUsoEm`) e de `VotoJuri` (data do primeiro voto e da última alteração); `ConfigApresentacao.parcialAoVivo` presente nos dois eventos do seed, `false`;
  - assinaturas de `lib/csv.ts` (`montarCsv`, `baixarCsv`), `resumirConvites`, `resolverFaseConfig`, `resolverSituacaoEvento`, e se `lib/tempo.ts` formata só a hora no fuso do evento (senão, criar `lib/formatarPainel.ts` com `lib/fusoHorario.ts`);
  - `servicos/mensagens.ts` com texto para `NAO_AUTORIZADO` e `RESULTADO_INDISPONIVEL`;
  - nome da função que lê o relógio fora de componente;
  - `DadosResultado` com `ranking[].pontosPorGrupo`, `desqualificados` e `pesosEfetivos` (D16 rev. 3) e `ui.dashboard.resultadoVisivel` (C17); se faltar, aplicar o ajuste mínimo e registrar.
- [ ] `dominio/contagens.ts` e `dominio/apuracao.ts` (`apurar`) conforme a seção 5.2: tolerância de 6 casas, base sem desqualificados, grupo sem base com **peso redistribuído** (`pesosEfetivos`, C3), todos sem base → 0, `pontosPorGrupo` e `desqualificados` preenchidos (D16), empates (trecho, critério efetivo, `resolvido`, `vencedorId`), categorias e co-vencedores.
- [ ] `dominio/resultado.ts`: `congelarResultado` (substitui o stub; versão = maior + 1; `calculadoEm` opcional), `resumirApuracao`, `gruposDoResultado`.
- [ ] Ligar os gatilhos: `transicoes.encerrarUrna` gera a versão 1; o serviço de desqualificação da Etapa 6 gera a versão 2; `forcarEstadoUrna` para trás descarta as versões. Conferir que **nenhum outro lugar** calcula resultado.
- [ ] `dominio/invariantes.ts`: ativar a **I7** e acrescentar a **I8**.
- [ ] `dominio/apuracaoAutoteste.ts` com `conferirApuracao()`: as seis fixtures da seção 5.7 (`PADRAO`, os três empates, dois candidatos, Festival) com os resultados esperados escritos à mão, mais um caso de **grupo ligado sem votos** (redistribuição), um de **todos os grupos sem votos** e um de **critério `JURI` com júri desligado**.
- [ ] **Testes Vitest** (D19 rev. 3) em `dominio/apuracao.test.ts`: as fixtures da seção 5.7 (números esperados = os das tabelas), os casos extras acima e um **empate de 3 ou mais candidatos** (E24). Conferir todas as fixtures contra C3: nenhuma tem grupo ligado com base 0 (nota da 5.7).

**Fica fake:** nada novo (lógica pura sobre o estado).

**Pronto quando**
- [ ] `conferirApuracao()` devolve lista vazia e `pnpm test` passa (inclui o empate de 3+).
- [ ] Encerrar a urna pela toolbar, pelo relógio e pelo `servicos/operacao` da Etapa 6 gera **uma** versão 1 cada (V18), e `verificarInvariantes` fica vazia, com I7 e I8.
- [ ] Desqualificar com a urna encerrada gera a versão 2 com a base sem o desqualificado (V26).
- [ ] A lista de errata mínima da pendência P15 foi **conferida** contra o código (já está na Etapa 0 rev. 2) e o que divergiu foi registrado.

**Entrega:** `VaiVota-E7-CP1.zip`

---

### CP2 — Volume, fixtures, cenários e simulador (dados)

**Objetivo:** o protótipo abre com um evento cheio e os sete cenários de resultado existem e passam nas invariantes.

**Tarefas**
- [ ] `mocks/volume/`: `gerarVolume`, `restaurarNucleo`, tipo `DistribuicaoAlvo`, `distribuicoes.ts` (tabelas da 5.7) e `nomes.ts`, conforme a seção 5.7. `gerarVolume` cria **primeiro** as participações (`criadoEm` no início da janela ou antes, nunca igual ao de um voto) e só depois aplica os votos (C2).
- [ ] Conferir que `criarEstadoNucleo()` existe (Etapa 0 rev. 2) e fazer `criarEstadoInicial()` compor núcleo + volume da Semana Tech (as metas da 5.7). Conferir o núcleo intacto (ids e fatos) e que o candidato votado por Fábio está entre c01 e c05 na distribuição `PADRAO`.
- [ ] Auditoria do volume: as 25 entradas da tabela de metas, com `criadoEm` crescente e `detalhes` coerentes (`historicoId` nas do júri; nenhum código de convite).
- [ ] `mocks/cenarios/resultado.ts` com os sete cenários da 5.12, registrados em `mocks/cenarios.ts`. Aplicar **cada um duas vezes seguidas** e confirmar o mesmo estado e `verificarInvariantes` vazia nos dois eventos.
- [ ] `store/simularVotos.ts`: criação de votos simulados (usuário gerado, **depois** a participação com `criadoEm` anterior ao voto, **depois** o `Voto` via `aplicarVotoPopular`, que não cria participação; C2), quantidade determinística.
- [ ] Seção "Dashboard" da toolbar (`SecaoDashboard.tsx`): os quatro controles da 5.12 (o simulador só liga o flag aqui; a tela entra no CP5).
- [ ] Conferir pelo `InspetorEstado`: 520 participações, 412 votos populares, 9 jurados com 7 votos, convites 12 (9, 1, 1, 1), auditoria 25 e nenhum e-mail fora de `usuarios`.
- [ ] Medir a abertura: o `PADRAO` com volume carrega sem atraso perceptível.

**Fica fake:** os dados (nomes, curva de votos, auditoria) e o volume do Festival, que só existe em cenário.

**Pronto quando**
- [ ] As metas da 5.7 conferem no `InspetorEstado` e as invariantes 3, 4 e 7 ficam verdes; nenhuma participação gerada tem `criadoEm` igual ao de um voto (C2).
- [ ] Os sete cenários aplicam, são idempotentes e geram o resultado esperado (conferido por `conferirApuracao` e pelas tabelas da 5.7).
- [ ] "Adicionar votos agora" cria participação e voto e mantém a invariante 3.

**Entrega:** `VaiVota-E7-CP2.zip`

---

### CP3 — Serviços de leitura e casca do painel

**Objetivo:** `/admin` abre com abas, avisos de fase e os indicadores principais, atualizando sozinho.

**Tarefas**
- [ ] `servicos/dashboard.ts`: `obterOperacao` (completo conforme 5.3, com o bloco `parcial` omitido salvo a flag), `obterResultado` e `obterVotosJuri` (assinaturas e erros da 5.4; as telas deles entram no CP6), `listarAuditoria` (resumo no CP5). Papel `ADMIN` do evento revalidado em todos.
- [ ] `TelaDashboard`: `Abas` da Etapa 0 com `?aba=`, padrão Operação, Resultado desabilitada fora de fase com dica e normalização por `router.replace` (V2).
- [ ] `BannerPainel`: combinação incoerente, somente leitura (`CONCLUIDO`), `TEMPO_ESGOTADO`. Estado vazio de `RASCUNHO` com `Link` para a Operação da Etapa 6.
- [ ] `useConsulta` da Operação com `intervaloMs: 5000` e `ativo` só na fase `URNA_ABERTA`; "Atualizado às" (D20), "Atualizar agora", esqueleto, erro sem dado e erro com dado anterior.
- [ ] `KpiCard`; `EstadoUrnaCard` (selo, aberta desde, tempo restante com `ContagemRegressiva`, janela, `TEMPO_ESGOTADO`); `TotaisCards` e `ParticipantesCard` (módulo desligado some).
- [ ] Faixa fixa "Placar por candidato oculto durante a votação" (com a flag desligada).
- [ ] `LiveRegion` anunciando uma vez a mudança para urna encerrada.
- [ ] Layout em 360 px e 1280 px.

**Fica fake:** nada novo (leitura do volume do CP2).

**Pronto quando**
- [ ] V1 a V8 passam.
- [ ] Nenhuma tela do painel compara `estado` ou `estadoUrna`, e a resposta de `obterOperacao` não traz voto por candidato com a flag desligada.
- [ ] A leitura com erro de rede mantém os dados anteriores com o aviso (parte de V34).

**Entrega:** `VaiVota-E7-CP3.zip`

---

### CP4 — Operação: votos por minuto, jurados, totens e convites

**Objetivo:** o restante do painel operacional, com os gráficos em SVG.

**Tarefas**
- [ ] `dominio/serie.ts` (`montarSerie`) e `components/charts/LineChart.tsx` conforme 5.8 (pico destacado, foco por teclado, alternativa em `<details>`, estado vazio, legível em 360 px).
- [ ] `VotosPorMinuto` com título pelo passo e o pico (valor e horário).
- [ ] `JuradosCard` (pendentes primeiro, rótulo do convite por padrão e botão "Mostrar nomes" com estado local, C18; sem escolha e sem nº de alterações) e "Copiar pendentes" com fallback manual.
- [ ] `TotensTable` (só infantil ligado), com a nota sobre votos de totens pausados e revogados.
- [ ] `ConvitesResumo` usando `resumirConvites`, com `Link` para `configuracao?secao=juri`.
- [ ] Conferir: pendentes batem com o card de participantes; convites batem com a seção Júri da Etapa 6.

**Fica fake:** a série e os totens vêm do seed; só os votos reagem à Etapa 5.

**Pronto quando**
- [ ] V11 a V14 passam (inclusive a série por **hora** do Festival).
- [ ] O gráfico tem rótulos legíveis em 360 px e alternativa textual.
- [ ] Os números de convites são **iguais** aos da Etapa 6 (V14).

**Entrega:** `VaiVota-E7-CP4.zip`

---

### CP5 — Operação: auditoria, parcial por candidato e votos entrando

**Objetivo:** fechar a aba Operação.

**Tarefas**
- [ ] `dominio/auditoria.ts` (catálogo de exibição de todas as ações das Etapas 0 a 7, `descrever`, resumo, fallback para ação desconhecida) e `AuditoriaPainel` (resumo, lista, filtro por grupo; ator conforme 5.4).
- [ ] `components/charts/BarChart.tsx` e `ParcialPorCandidato` com o alerta de espelhamento (só com a flag ligada **e** urna aberta).
- [ ] `SimuladorVotos` montado **uma vez** no `GateEvento` da Etapa 0 (ajuste mínimo, registrado no Anexo C da Etapa 0; D12 rev. 3): intervalo de 3 s, só com urna `ABERTA`, aba visível e `dev.simularVotosEntrando` ligado; limpa o timer ao desmontar e nunca acumula. Conferir que nenhuma outra tela o monta.
- [ ] Verificar que a lista de auditoria nunca mostra escolha, nome de jurado nem código de convite.

**Fica fake:** auditoria do volume e cadência do simulador.

**Pronto quando**
- [ ] V9, V10, V15 e V16 passam.
- [ ] Ligar e desligar o parcial adiciona e remove o bloco e o alerta; o `BarChart` fica legível em 360 px.
- [ ] O simulador mantém as invariantes, continua rodando ao navegar entre telas do mesmo evento e não deixa timer solto ao sair do evento.

**Entrega:** `VaiVota-E7-CP5.zip`

---

### CP6 — Aba Resultado

**Objetivo:** mostrar o resultado oficial congelado, com todos os casos de empate e de grupo sem votos.

**Tarefas**
- [ ] `ResultadoTab` na ordem da seção 5.6, com o aviso fixo de tela espelhada ao lado do botão "Mostrar resultado"; números ocultos até o clique, estado em `ui.dashboard.resultadoVisivel` (`eventoId:versao`), zerado quando muda a versão (C17).
- [ ] `ClassificacaoTable` (colunas por grupo ativo, `<caption>`, indicador de empate com ícone e texto, rolagem contida em 360 px, regra das quatro casas), `ForaDaDisputa` e o `BarChart` da pontuação final.
- [ ] `PainelEmpates` (trecho, critério efetivo, valores que decidiram, desfecho) e `CategoriasCards` (rótulos do tema, co-vencedores, "Sem votos neste grupo").
- [ ] Cabeçalho com versão, motivo, pesos e critério; avisos de `resumirApuracao`; `HistoricoVersoes`.
- [ ] Linha do tempo (reuso do `LineChart`) e dados do evento.
- [ ] `VotosJuriTable` (só com júri ligado), fechada por padrão atrás de "Mostrar votos do júri" (abrir não audita, C15), com aviso de confidencialidade e histórico expansível; `obterVotosJuri` recusa antes do encerramento.
- [ ] Avisos de apuração com "Grupo X sem votos: peso redistribuído" e pesos efetivos (C3); pontos por grupo de `pontosPorGrupo` e "Fora da disputa" de `desqualificados` (D16).
- [ ] Atalhos "Abrir apresentação" e "Ver relatório".
- [ ] Estado "resultado ainda não calculado" (V4) e somente leitura em `CONCLUIDO`.

**Fica fake:** o resultado vem de `apurar` sobre o volume.

**Pronto quando**
- [ ] V18 a V28, V36 e V37 passam.
- [ ] A soma dos votos por candidato, por grupo, bate com os totais da aba Operação (V38).
- [ ] Sem júri ligado, a tabela de votos do júri e a categoria do júri não existem.

**Entrega:** `VaiVota-E7-CP6.zip`

---

### CP7 — Exportação CSV com auditoria

**Objetivo:** download real dos seis arquivos, gerados a partir dos dados.

**Tarefas**
- [ ] `dominio/exportacao.ts`: `arquivosDisponiveis(fase, resultadoDisponivel, modulos)` (com `auditoria` disponível em `RASCUNHO`, C11), montagem das linhas dos seis arquivos (colunas da 5.10; `pontos_*` de `pontosPorGrupo`, D16) e `redigirEmails`, com testes Vitest de `arquivosDisponiveis` e `redigirEmails` (D19).
- [ ] `servicos/exportacao.ts`: `prepararExportacao` (valida disponibilidade, monta, registra `EXPORTACAO_CSV` em um único `atualizar`, devolve `{ nome, cabecalho, linhas }`).
- [ ] `ExportPanel` nas duas abas: lista com motivo dos indisponíveis, **Baixar**, confirmação de `jurados`, "Baixar tudo" em sequência. O download usa `montarCsv` e `baixarCsv` da Etapa 6, em manipulador de evento.
- [ ] Conferir que nenhum arquivo contém e-mail e que a auditoria ganha uma entrada por download.

**Fica fake:** os dados; o download em si é real (`Blob` e link temporário).

**Pronto quando**
- [ ] V29 a V34 passam.
- [ ] Cada arquivo abre no Excel e no LibreOffice com acentos preservados.
- [ ] Durante a votação só os arquivos de operação estão habilitados e o motivo dos demais está visível.

**Entrega:** `VaiVota-E7-CP7.zip`

---

### CP8 — Relatório imprimível

**Objetivo:** página formatada que o navegador salva como PDF.

**Tarefas**
- [ ] Conferir `data-print="ocultar"` em `AdminShell`, `DevToolbar`, `SkipLink` e contêiner do `Toast` (vêm da Etapa 0 rev. 2); só se faltar, aplicar aqui.
- [ ] `servicos/relatorio.ts` (`registrarRelatorioGerado`) e a composição dos dados do relatório a partir de `obterResultado` (sem votos identificados).
- [ ] `RelatorioView` conforme 5.11 e `BarraAcoesRelatorio` (Imprimir / Salvar como PDF e Voltar), com a explicação quando não há resultado.
- [ ] `relatorio.print.css`: A4, margens, quebras de página, tabelas sem corte de linha, legibilidade em preto e branco, ocultação de `[data-print="ocultar"]`.
- [ ] Conferir nos dois temas e em 360 px (a tela, não a impressão).

**Fica fake:** o PDF é gerado pelo navegador.

**Pronto quando**
- [ ] V35 passa: a pré-visualização de impressão do Chrome mostra páginas bem quebradas, sem shell, toolbar nem botões, e o contraste é adequado em preto e branco.
- [ ] O relatório não é acessível com a urna aberta e não contém votos identificados nem e-mail.
- [ ] Clicar em Imprimir registra **uma** entrada `RELATORIO_GERADO`.

**Entrega:** `VaiVota-E7-CP8.zip`

---

### CP9 — Revisão e fechamento

**Objetivo:** fechar a etapa com evidência.

**Tarefas**
- [ ] Percorrer **V1 a V40** nos dois temas e em 360, 768, 1280 e 1920 px, sem rolagem horizontal da página.
- [ ] Acessibilidade: um `h1`, `Abas` por teclado, foco ao trocar de aba, tabelas com `<caption>`, gráficos com alternativa textual, `aria-live` só onde previsto, foco visível, alvos de 44 px, contraste ≥ 4,5:1 em selos, alertas e gráficos, `prefers-reduced-motion`, estado nunca só por cor.
- [ ] Revisar os textos em português (tom e ausência de concordância de gênero com o rótulo do tema) e listar os que dependem de aprovação.
- [ ] `grep`: nenhum hex de marca nem classe de paleta nos componentes novos.
- [ ] `grep`: nenhum `<a href>` para rota interna (o único `<a>` permitido é o de download do CSV, criado em manipulador de evento).
- [ ] `grep`: nenhum `Math.random` nem `Date.now` fora do que a Etapa 0 permite (`relogio.ts`).
- [ ] `grep`: nenhum acesso a `votos`, `votosJuri`, `historicoVotosJuri`, `votosInfantis` ou `resultados` em `src/components/**` e `src/app/**`; nenhum import de `@/mocks` em componentes.
- [ ] `grep`: nenhuma comparação de `estado` ou `estadoUrna` em componentes desta etapa para decidir fase (só `resolverFaseConfig`).
- [ ] `grep`: nenhum texto de interface com "candidato" ou "candidatos" fixo (usar os rótulos do tema).
- [ ] `grep`: nenhuma ocorrência de `email` em DTOs, em `servicos/dashboard.ts`, em `dominio/exportacao.ts` e nos componentes novos, salvo `redigirEmails`.
- [ ] Verificar que cada transição de estado aparece **uma só vez** na auditoria e que não há timer solto (simulador, polling) depois de sair da tela.
- [ ] `lint`, `typecheck`, `test` e `build` sem erros e sem avisos de hidratação.
- [ ] Atualizar o Contexto (seções 2, 4.1, 4.4, 4.7, 4.8, 7.1 e 10) com o que a etapa acrescentou (seção 3.2) e registrar se alguma errata da P15 precisou ser aplicada no código (a rev. 2 da Etapa 0 já as traz).
- [ ] Atualizar o README da Fase 1 com o que a seção Dashboard da toolbar controla.

| Grupo \ Tema | Semana Tech | Festival |
|---|---|---|
| Acesso, abas e fases (V1 a V4) | ☐ | ☐ |
| Operação: totais, módulos e sigilo (V5 a V10) | ☐ | ☐ |
| Operação: gráficos, jurados, totens, convites, auditoria e parcial (V11 a V17) | ☐ | ☐ |
| Apuração e Resultado (V18 a V28) | ☐ | ☐ |
| Exportação (V29 a V34) | ☐ | ☐ |
| Relatório, votos do júri e espelhamento (V35 a V37) | ☐ | ☐ |
| Consistência, invariantes e acessibilidade (V38 a V40) | ☐ | ☐ |

**Pronto quando:** a matriz está inteira marcada e a seção 9 atendida.

**Entrega:** `VaiVota-E7-CP9.zip` (final da Etapa 7)

---

## 8. O que fica fake

| Item | Tratamento |
|---|---|
| Persistência | Nenhuma; o F5 e qualquer nova aba voltam ao seed (D18 da Etapa 0) |
| "Servidor" | Os serviços rodam no cliente; na trilha de produção (Prisma + Supabase PostgreSQL; rev. 4, A2/A3/A4) as mesmas validações e consultas agregadas vão para o servidor, com cache curto |
| Polling | `useConsulta` a cada 5 s lendo o store; sem WebSocket (nem na trilha de produção, conforme `Dashboard.md`) |
| Totens na Operação | Lidos dos dispositivos do seed; a gestão real vem do planner "Totem" (rev. 4, A7) |
| Volume de dados | Gerado de forma determinística (nomes, curva de votos, auditoria); o Festival só existe em cenário |
| Votos "entrando" | `SimuladorVotos` cria usuários e votos de mentira; as invariantes valem |
| Parcial por candidato | Flag `parcialAoVivo` alterada só pela toolbar nesta fase |
| CSV | **Gerado de verdade** pelo navegador, para validar o formato |
| Relatório | Página imprimível; o PDF é do navegador |
| Auditoria | Registro no `banco` mock com `ipHash` constante |
| E-mails dos usuários gerados | Existem no `banco` (campo do schema) e nunca saem dele |
| Retenção e anonimização de dados pessoais | Fora da Fase 1 (F11) |

## 9. Critérios de aceitação

- [ ] Durante a votação, o admin vê totais, votos por minuto, participantes, jurados, totens, convites e auditoria, **sem voto por candidato** (a menos que o parcial esteja ligado).
- [ ] Depois do encerramento, a aba Resultado exibe o resultado oficial congelado, com versão, pesos, empates, critério e categorias; o painel abre na Operação e avisa sobre tela espelhada.
- [ ] A apuração segue a seção 5.2 (base sem desqualificados, peso de grupo sem votos redistribuído, tolerância de 6 casas, posições 1-1-3) e `conferirApuracao` fica vazio e `pnpm test` verde.
- [ ] Encerrar por qualquer caminho gera **uma** versão 1; desqualificar depois gera a versão 2 e mantém a 1 no histórico; nada recalcula na leitura.
- [ ] Os números de Operação, Resultado, CSV e relatório são consistentes entre si, e os de convites são **iguais** aos da Etapa 6.
- [ ] Os seis CSV respeitam a disponibilidade por fase, abrem corretamente em planilha e **não contêm e-mail**.
- [ ] Exportar o voto identificado do júri pede confirmação, e cada exportação e cada relatório fica na auditoria **uma vez**.
- [ ] O relatório imprimível salva como PDF em boa qualidade, sem shell nem toolbar, e não traz voto identificado.
- [ ] Apenas o admin **do evento** acessa; jurado, público, deslogado e admin de outro evento são barrados (e o serviço também recusa).
- [ ] Evento concluído abre em somente leitura, com exportações; combinações incoerentes seguem a precedência `CONCLUIDO` > `RASCUNHO` > urna e são explicadas.
- [ ] Júri e infantil desligados somem do painel, da classificação, das categorias e dos CSV.
- [ ] Votos simulados mantêm as invariantes 3 e 4; I7 e I8 ficam verdes depois de cada ação.
- [ ] Os sete cenários de resultado aplicam, são idempotentes e reproduzem as tabelas da seção 5.7.
- [ ] Funciona nos dois temas, em 360 px e em 1920 px, com teclado e foco visível, e nenhum texto concorda em gênero com o rótulo do tema.
- [ ] Console sem erros nem avisos de hidratação; nada persiste (F5 restaura o seed).

## 10. Pendências

- **P1 — Biblioteca de gráficos:** SVG próprio (adotado) ou Recharts? A troca ficaria isolada em `components/charts/`. **[Usuário]**
- **P2 — Formato dos CSV:** **Resolvida (rev. 3, E16):** confirmado UTF-8 com BOM, `;`, CRLF, vírgula decimal, datas ISO e colunas de módulo desligado omitidas.
- **P3 — Rota do relatório:** `/admin/relatorio` (adotada) ou impressão da própria aba Resultado com CSS de impressão, sem rota nova? **[Usuário]**
- **P4 — Parcial por candidato:** hoje só a toolbar liga `parcialAoVivo`. Decidir onde o admin liga de verdade (tela de `ConfigApresentacao`, trilha de produção; rev. 4, A2) e se o parcial deve existir no MVP. **[Usuário]**
- **P5 — "Baixar tudo":** downloads em sequência (adotado) ou um `.zip` (exigiria dependência nova)? **[Usuário]**
- **P6 — Retenção e anonimização de dados pessoais:** continua fora da Fase 1 (F11); confirmar que o painel não precisa de tela de apoio. **[Usuário]**
- **P7 — Grupo ligado sem votos (A3):** **Resolvida (rev. 3, C3):** o peso do grupo com base 0 é redistribuído proporcionalmente entre os grupos com base > 0 (`pesoEfetivo[g] = peso[g] × 100 ÷ soma dos pesos com base > 0`); todos com base 0 → pontuações 0; aviso "Grupo X sem votos: peso redistribuído" (D2, I8).
- **P8 — Votos de candidato desqualificado (A4):** **Resolvida (rev. 3, C3):** excluídos da base de normalização e mantidos na contagem bruta (DD §8.1 a atualizar, F-3).
- **P9 — Spoiler na aba Resultado (A17):** **Resolvida (rev. 3, C17):** números ocultos até "Mostrar resultado", com o aviso ao lado do botão; estado em `ui.dashboard.resultadoVisivel` (`eventoId:versao`); exportações e relatório não dependem do clique (D7).
- **P10 — Desempate `JURI` com júri desligado:** adotado o fallback para `PUBLICO`, registrado em `criterioAplicado` e explicado na tela (fecha a P6 da Etapa 6). **[Mescla]**
- **P11 — Votos de totens pausados ou revogados (A19):** contam como históricos no volume e na apuração. Confirmar com `VotoInfantil.md` seção 9 (a regra de "não conta" vale para votos rejeitados depois da pausa). **[Mescla]**
- **P12 — Consulta ao voto identificado do júri:** **Resolvida (rev. 3, C15):** a tabela fica atrás de "Mostrar votos do júri" (fechada por padrão); abrir **não** é auditado; exportar continua auditado.
- **P13 — Versão `CORRECAO` do resultado:** **Resolvida (rev. 3, C16):** `CORRECAO` continua no tipo (espelha o schema), mas não existe ação na Fase 1; a desqualificação é a única correção.
- **P14 — Auditoria do relatório:** registrada ao clicar em Imprimir; Ctrl+P direto não passa pelo botão. **[Mescla]**
- **P15 — Errata mínima na Etapa 0:** **incorporada na Etapa 0 rev. 2 (Anexo C)**: (a) `AcaoAuditoria` com `EXPORTACAO_CSV` e `RELATORIO_GERADO`; (b) `registrarAuditoria` aceitando `criadoEm` explícito (os `aplicarVoto*` são da Etapa 5 e já recebem `agoraMs`); (c) `congelarResultado` com `motivo` e opções (`calculadoPorId`, `calculadoEm`); (d) `data-print="ocultar"`; (e) `Abas` com aba desabilitada e valor controlado; (f) `criarEstadoNucleo` separado de `criarEstadoInicial`. O CP1 confere. **[Mescla]**
- **P16 — Registrante dos cenários `RESULTADO_*`:** **Resolvida (rev. 3, D11):** a Etapa 7 registra os `RESULTADO_*` (Etapa 0 §5.8 e Anexo C atualizados); a Etapa 8 consome e não registra de novo.
- **P17 — Nomes de jurados na Operação:** **Resolvida (rev. 3, C18):** a lista mostra o rótulo do convite por padrão e o botão "Mostrar nomes" (estado local da tela) exibe os nomes.
- **P18 — Textos finais** dos avisos, confirmações e descrições de auditoria. **[Usuário]** (pendência E30, revisão única de textos com a organização).
- **P19 — Citações do `DocumentDesign.md`:** **Resolvida (rev. 3, B1):** o `DocumentDesign.md` v1.1 existe e é citado nas Fontes; `ConfiguracaoEvento.md` não existe e a referência é DD §7.6 (B2).
- **P20 — Série do Festival por hora:** com a janela de mais de 80 h, o gráfico usa passo de 1 h. Confirmar se é a leitura desejada para eventos longos.
- **P21 — Apuração do júri por critério no Festival (rev. 4, A8):** requisito do Festival (voto simples continua na Semana Tech); modelo previsto `Criterio` e `NotaJuri`. Proposta: placar do júri do candidato = soma das médias dos critérios dadas pelos jurados, normalizada como os outros grupos. Pendentes: escala da nota, peso por critério, confirmação da proposta e desempate por critério. **[Usuário]**
