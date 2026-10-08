# VaiVota — Fase 1 · Etapa 6: Configuração do evento

> **Rotas:** `/e/[slug]/admin/configuracao`, com `?secao=geral|candidatos|juri|placar|tema|operacao` (e `&editar=<id|novo>` na seção de candidatos)
> **Depende de:** Etapa 0 (store, `transicoes`, `registrarAuditoria`, tema, `codigos`, componentes de UI, `RotaGuard`, `AdminShell`, cenários, `votaveis`, `ImagemCandidato`), Etapa 2 (textos de estado, `EventoShell`), Etapa 3 (resgate de convite que consome o que é gerado aqui), Etapa 4 (lista pública e detalhe que refletem as edições), Etapa 5 (votos que impedem remover candidato e o `CANDIDATO_INDISPONIVEL` que a desqualificação passa a provocar)
> **Alimenta:** Etapa 7 (`travas.ts`, `lib/csv.ts`, `resumirConvites`, ações de auditoria, `congelarResultado` chamado com motivo `DESQUALIFICACAO`), Etapa 8 (pesos, rótulos, tema, convites, estado da urna) e Etapa 9 (matriz C1–C36, cenários)
> **Fontes:** `Login.md`, `Jurado.md` (seções 4, 5, 7 e 12), `VotoInfantil.md` (seção 12), `ModoApresentacao.md` (seções 7 e 9), `Dashboard.md` (seção 7), `schema.prisma` (`Evento`, `Tema`, `ConfigPlacar`, `CampoCandidato`, `Candidato`, `ConviteJurado`, `Auditoria`), Contexto (itens E6-1 a E6-19, F1, F11, A2, A6, A9, A10), `DocumentDesign.md` v1.1 (seções 4, 7.6, 8.1 e 9; a configuração do evento é a DD §7.6).
> **Status:** versão final consolidada. Substitui `Etapa6 Configuracao.md`. **Revisão 3 (07/10/2026):** aplica as decisões do documento de pendências (itens B1, B2, C3, C4, C5, C6, C13, C14, D9, D10, D19, E5, E11, E12, E13, E14, E15, E16, E26, E29, E32). **Revisão 4 (07/10/2026):** E21, E2, E29, A7, A8, A2, A3, A4.

---

## 1. Objetivo

Entregar a tela `/e/[slug]/admin/configuracao`, completa e navegável, com as seis seções do MVP: **Geral, Candidatos, Júri (convites), Placar, Tema e Operação**. Cada seção grava no store, e o resto do protótipo (landing, evento, votação, dashboard, telão) reage às edições. O foco é mostrar **como a tela deve ficar e se comportar**: validações, travas por estado da urna, checklist de ativação e condução do evento de Rascunho até Concluído. Nada é gravado fora da memória.

Esta etapa precisa garantir:
- **Toda regra de bloqueio vem de um só lugar** (`dominio/travas.ts`). Nenhum componente decide trava por conta própria, e **todo serviço revalida** a trava (a UI esconde, o serviço recusa).
- **Salvar é atômico:** cada serviço valida tudo **antes** de mutar e grava com **um único** `atualizar`. Rejeição nunca muta o `banco` (D5 da Etapa 0).
- **As invariantes continuam verdes depois de cada ação.** Em especial: pesos somam 100 e módulo desligado tem peso 0 (invariante 2); um candidato que já recebeu voto, inclusive um que aparece em `historicoVotosJuri`, não é removido (invariante 5, que na rev. 3 cobre o histórico, D9).
- **Sigilo de convites:** só o `hashCodigo` vai ao `banco`. O código legível existe apenas na memória do diálogo que o mostra, uma única vez (D12 da Etapa 0).
- **Estados incoerentes forçados pela toolbar** (por exemplo, `CONCLUIDO` com urna `ABERTA`) seguem a precedência da Etapa 1: `CONCLUIDO` > `RASCUNHO` > urna (T13).
- **Nenhum texto concorda em gênero com o rótulo do tema** (D10 da Etapa 2): "Na votação", "Rascunho", "Fora da disputa", "Adicionar", em vez de "Publicado" ou "Novo".
- **Nenhuma tela desta etapa lê** `votos`, `votosJuri`, `historicoVotosJuri`, `votosInfantis` nem `resultados` (D4 da Etapa 0). Só serviços as consultam, e só para **recusar** operações.

## 2. Escopo

**Dentro**
- Layout da tela: navegação entre as seis seções, banner de trava, painel lateral de checklist, modo leitura.
- **Geral:** nome, slug, descrição, janela de votação, fuso e encerramento automático (o método de identificação fica por seed, C6).
- **Candidatos:** lista do admin (ordem, filtro, publicar/tirar da votação), formulário (título, descrição, imagem, campos extras), campos extras do evento, remoção e **desqualificação**.
- **Júri:** gerar convites em lote, mostrar os códigos uma única vez, copiar, **baixar CSV**, listar, filtrar, renomear e revogar (com substituto opcional).
- **Placar:** pesos por grupo, desempate, exemplo numérico. (A opção "exibir votos do júri no telão" foi removida: o telão nunca mostra quem votou em quem; rev. 4, E21.)
- **Tema:** nome de exibição, logo, quatro cores, fonte, rótulos, **política de contraste** (D15), presets e **pré-visualização** isolada.
- **Operação:** checklist de ativação, linha do tempo, ativar evento, abrir urna, encerrar urna, concluir evento.
- Matriz de travas por fase, auditoria das ações sensíveis, quatro cenários de estado e a matriz de verificação C1–C36.

**Fora (e em qual etapa fica)**
- Módulos júri e infantil ligados/desligados → **toolbar** (Etapa 0). A seção Placar apenas **reage** a eles.
- Votação avançada (limiar da reta final), Apresentação (`ConfigApresentacao`) → por **seed**.
- Infantil (dispositivos, pareamento, quiosque com PIN, voto infantil) → **planner próprio "Totem"** (rev. 4, A7, a escrever; mock e depois real). Até lá, `Dispositivo` e `VotoInfantil` são dados seed e esta etapa só lê a contagem de dispositivos no checklist.
- Júri por critério no Festival (Direção, Roteiro, Fotografia e Som; `Criterio` e `NotaJuri`): requisito do Festival (rev. 4, A8); os critérios configuráveis entram com o planner próprio. Esta etapa continua com o voto simples do júri (Semana Tech).
- Privacidade (`avisoPrivacidadeUrl`, `prazoAnonimizacaoDias`, 90 dias confirmado em E29; o aviso de privacidade é **da plataforma VaiVota**, texto único com link no registro e no rodapé, e `avisoPrivacidadeUrl` do evento passa a ser **opcional e complementar**, rev. 4, E29) e `bloquearVotoProprio` (bloqueado, confirmado em E5) → por seed (a flag é testável pelo cenário `VOTO_PROPRIO_PERMITIDO`, Etapa 4). Retenção de dados fica fora da Fase 1 (F11).
- Método de identificação (`GOOGLE_OU_EMAIL`, `SOMENTE_GOOGLE`, `SOMENTE_EMAIL`) → por **seed**, sem campo na Geral (rev. 3, C6); os cenários `SOMENTE_GOOGLE` e `SOMENTE_EMAIL` da Etapa 3 continuam.
- Admins adicionais, super admin, duplicar configuração, `ConviteAdmin` → fora da Fase 1 (admins adicionais por seed). `CodigoPareamento` → planner "Totem" (rev. 4, A7).
- `capaUrl` do tema e `textosEstado` do tema → por seed (a Etapa 1 deixou `capaUrl` em aberto; **decisão: sem tela nesta fase**).
- Upload real de arquivos: a imagem é uma pré-visualização local (`blob:`), perdida no F5 → trilha de produção (rev. 4, A2/A3; Supabase PostgreSQL, A4).
- Apuração, ranking, contagens, exportação CSV de resultado e relatório → **Etapa 7**. Telão e revelação → **Etapa 8**.
- Tela de auditoria (leitura do registro) → Etapa 7. Aqui o registro se confere pelo `InspetorEstado`.

---

## 3. Contrato com as outras etapas

### 3.1 O que esta etapa recebe

| Item | Dono |
|---|---|
| `Resultado<T>`, `CodigoErro`, `ModoFalha`, `atraso`, `simularFalha`, `registrarLog`, `servicos/mensagens.ts` | Etapa 0 |
| Store externo, `store.getState()`/`atualizar`, relógio simulado, `useConsulta`, `registrarAuditoria` | Etapa 0 |
| `store/transicoes.ts` (`ativarEvento`, `abrirUrna`, `encerrarUrna`, `concluirEvento`, `forcarEstadoEvento`, `forcarEstadoUrna`), que já **auditam** `EVENTO_ATIVADO`, `URNA_ABERTA`, `URNA_ENCERRADA`, `EVENTO_CONCLUIDO` | Etapa 0 |
| `dominio/placar.ts` (`redistribuirPesos`), `dominio/candidatos.ts` (`publicados`, `votaveis`), `dominio/invariantes.ts` | Etapa 0 |
| `lib/contraste.ts` (`razaoContraste`, `corTextoSobre`, `corLegivelSobre`), `lib/tema.ts` (`calcularTokens`), `lib/fontes.ts` (`FONTES_APROVADAS`), `TemaEvento` (aceita `tema` por prop) | Etapa 0 |
| `lib/codigos.ts` (`gerarCodigo`, `normalizarCodigo`, `formatarCodigo`), `lib/aleatorio.ts` (`criarGerador`), `lib/hash.ts` (`hashMock`), `lib/formatar.ts`, `lib/tempo.ts` | Etapa 0 |
| `Botao`, `Campo`, `Input`, `Textarea`, `Select`, `Checkbox`, `Cartao`, `Selo`, `Alerta`, `Carregando`, `Dialogo`, `DialogoConfirmacao` (com confirmação por digitação), `Toast`, `LiveRegion`, `ImagemCandidato`, `LogoEvento` | Etapa 0 |
| `RotaGuard` e `AdminShell` do layout `(painel)` (papel `ADMIN`, selos de estado, atalhos) | Etapa 0 |
| Mecanismo de cenários (`Cenario`, `mocks/cenarios.ts`), `InspetorEstado`, `verificarInvariantes` | Etapa 0 |
| `dominio/situacaoEvento.ts` (precedência `CONCLUIDO` > `RASCUNHO` > urna) | Etapa 1 |
| Cenário `SEM_ENCERRAMENTO_AUTOMATICO` (testa "Tempo esgotado" com a janela estendida) | Etapa 1 |
| `resgatarConvite` e as regras `CODIGO_USADO`, `CODIGO_REVOGADO`, `CODIGO_EXPIRADO` que **consomem** os convites criados aqui | Etapa 3 |
| `CANDIDATO_INDISPONIVEL` validado em `votarPopular`/`votarJuri` | Etapa 5 |
| Seeds: dois eventos, candidatos de borda (rascunho, desqualificado, rascunho sem imagem `cand-st-09`/`cand-fv-07`, título longo, descrição curta, campo extra vazio), convites em todos os estados, dispositivos do Festival | Etapa 0 |

### 3.2 O que esta etapa entrega

| Item | Consumidor |
|---|---|
| `dominio/travas.ts` (`resolverFaseConfig`, `resolverTravas`, `exigirAcao`) | Etapa 7 (aba Resultado e exportações respeitam a fase), Etapa 9 |
| `lib/csv.ts` (`montarCsv`, `baixarCsv`): UTF-8 com BOM, `;`, CRLF, neutralização de fórmulas | Etapa 7 (os seis CSV de exportação) |
| `dominio/convites.ts` (`estadoExibidoConvite`, `resumirConvites`): **mesmos números** do resumo da aba Operação do Dashboard | Etapa 7 (aceite cruzado, seção 2.3 do Contexto) |
| `servicos/operacao.ts` (`ativarEvento`, `abrirUrna`, `encerrarUrna`, `concluirEvento` com validação) | Etapas 7, 8 e 9 |
| Chamada `congelarResultado(…, "DESQUALIFICACAO")` ao desqualificar com a urna `ENCERRADA` | Etapa 7 (implementa a nova versão do resultado, D9 da Etapa 0) |
| Ações de auditoria `CONFIG_ALTERADA`, `TEMA_ALTERADO`, `CONVITES_GERADOS`, `CONVITE_REVOGADO`, `CANDIDATO_DESQUALIFICADO`, `CANDIDATO_CORRIGIDO`, e o primeiro uso de `EXPORTACAO_CSV` (já no tipo da Etapa 0) com `detalhes: { arquivo: "convites", quantidade }` (C14) | Etapa 7 (resumo de auditoria), Etapa 9 |
| `ConfigPlacar`, `Tema`, `Evento`, `Candidato`, `CampoCandidato`, `ConviteJurado` editáveis, refletidos nas demais telas | Etapas 1, 2, 4, 5, 7, 8 |
| `dominio/checklistAtivacao.ts` (`avaliarChecklist`) | Etapa 8 (o aviso de trailer aponta para o ensaio) |
| Cenários `RASCUNHO_INCOMPLETO`, `RASCUNHO_PRONTO`, `URNA_ENCERRADA`, `EVENTO_CONCLUIDO` | Etapas 7, 8 e 9 |
| `useCandidatosAdmin()` (`store/seletores/candidatosAdmin.ts`) | Etapa 7 (lista de candidatos no dashboard usa a mesma ordem) |
| Matriz de verificação C1–C36 | Etapa 9 |

---

## 4. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | **A rota vive em `(painel)`, sem guarda nem casca próprias.** O `RotaGuard(ADMIN)` e o `AdminShell` do layout fazem o papel (E6-11). A tela só acrescenta, dentro da página, a navegação de seções, o `BannerTrava` e o painel de checklist. Os componentes ficam em `src/components/config/`, **não** em `_components` dentro da rota (T4). | Evita três guardas e duas cascas (T9). A estrutura de pastas é a da seção 4.10 do Contexto. |
| D2 | **Seção na URL (`?secao=`), com navegação por links.** `SecaoNav` é um `<nav>` com `Link` e `aria-current="page"` (sidebar no desktop, faixa rolável no celular); não é `tablist`. Valor ausente ou inválido vira `geral` por `router.replace`. Trocar de seção com alteração pendente pergunta antes de descartar (`FormularioSujoProvider`). A pergunta cobre **só** a navegação interna da tela (seções e fechar o painel de candidato); voltar do navegador e os links do `AdminShell` não são interceptados (limitação do App Router). | Linkável e acessível sem ARIA improvisada. Esconde a limitação em vez de prometer o que o framework não permite. |
| D3 | **`dominio/travas.ts` é a fonte única** (seção 5.1). Deriva uma `FaseConfig` do par (`estado`, `estadoUrna`) com a **precedência da Etapa 1** e marca `incoerente` quando a combinação só existe por toolbar (T13). A matriz ganha a coluna **"Ativo + urna não iniciada"** (A6): igual à de rascunho, **exceto o slug**, que trava a partir de `ATIVO`. Os serviços chamam `exigirAcao`; concluído devolve `EVENTO_CONCLUIDO`, o resto `TRAVADO`. | Fecha E6-9 e T13. O slug já pode estar em QR Code e links quando o evento é ativado. |
| D4 | **Pesos e desempate ficam travados ao abrir a urna, sem exceção** (A2; **trava total no MVP, confirmada na rev. 3, C4**). `VotoInfantil.md` e `Jurado.md` recomendam "travar com alteração auditada"; isso fica como **evolução** (P2 resolvida) e as fontes base serão atualizadas (F-2). O método de identificação saiu da tela (D15, C6). "Exibir votos do júri no telão" foi removido (rev. 4, E21). | Mantém a decisão do planner antigo e do DD, e registra a divergência das fontes (F1) sem inventar um fluxo novo. |
| D5 | **Padrão único de formulário**, definido no Geral (CP2) e repetido nas outras seções: rascunho do formulário em `useState` inicializado pelo valor salvo; o pai remonta o formulário com `key` quando o valor salvo muda (nada de efeito para sincronizar, por causa do React Compiler); **Salvar** desabilitado sem alteração, **Descartar**, erros inline, `aria-describedby`. A flag "sujo" é escrita **só em manipulador de evento**. | Regras do React Compiler (`package.json`) e consistência entre as seções. |
| D6 | **Serviços por domínio** (`configGeral`, `candidatosAdmin`, `convites`, `placarConfig`, `temaConfig`, `operacao`), todos `Promise<Resultado<T>>`, com `atraso()` e `simularFalha()`, validando **antes** de mutar e relendo `store.getState()` depois de cada `await`. Validações de campo são **funções puras** (`dominio/validacoesConfig.ts`), usadas pela UI (erro inline) e **de novo** pelo serviço (`VALIDACAO`). | D3, D5 e as regras de serviço da Etapa 0. Nada de regra duplicada em componente. |
| D7 | **Falha simulada:** os serviços desta etapa usam `simularFalha()` padrão, que consome `REDE_NAO_GRAVOU` e `ERRO_INTERNO` e ignora `REDE_GRAVOU`, `URNA_ENCERRA` e `JA_VOTOU_OUTRA_SESSAO` (que ficam esperando o próximo envio de voto). Isso fecha a pergunta P8 da Etapa 5. Em falha, o formulário **mantém o rascunho**, mostra o erro e nada é gravado. | Permite testar o estado de erro do salvar com a toolbar, sem roubar a falha dos votos. |
| D8 | **Auditoria só do que é novo** (E6-6): o que `transicoes` já audita não é registrado de novo. Cada gravação de Geral, Placar e campos extras gera `CONFIG_ALTERADA`; Tema, `TEMA_ALTERADO`; convites, `CONVITES_GERADOS` e `CONVITE_REVOGADO`; desqualificação, `CANDIDATO_DESQUALIFICADO`; correção de texto/imagem com a urna `ABERTA` ou `ENCERRADA`, `CANDIDATO_CORRIGIDO` (com a fase em `detalhes`). Criar, editar e remover candidato **antes** de abrir a urna não é auditado ("Livre"). `detalhes` nunca contém **código de convite**. | Catálogo único (A12 do Contexto). A auditoria acompanha a coluna "Com auditoria" da matriz. |
| D9 | **Convites: só o hash vai ao `banco`** (`hashCodigo = hashMock(normalizarCodigo(código))`). O código legível sai do serviço **no resultado** (`dados`), vive no estado local do diálogo e some ao fechar; nunca entra no store, em `ui`, no console nem na auditoria. A geração garante unicidade por evento (repete o sorteio se o hash colidir). Lote de **1 a 50**; validade padrão = `janelaFim`, opcional, sempre no futuro (confirmado em E14). **Revogar só vale para convite `DISPONIVEL`** (usado não se desfaz, `Jurado.md`; sem "retirar jurado", confirmado em E13). Expirado é derivado (`DISPONIVEL` com `validadeAte` anterior ao relógio). | E6-3 e D12 da Etapa 0. "Os códigos não reaparecem" fica verdadeiro por construção. |
| D10 | **A lista de convites é lida por serviço** (`listarConvites`, com `useConsulta` e `recarregar()` depois de cada mutação), devolvendo um `ConviteListado` **sem** `hashCodigo` e com o **nome** de quem resgatou (nunca o e-mail, `Dashboard.md`). O **checklist**, por outro lado, é derivado por **seletor** (reativo, sem latência), que só expõe **contagens** de convites e de totens. O serviço de ativação revalida com a mesma função pura. | A lista é dado "de servidor"; o checklist é validação de formulário. A UI mostra o que o servidor confirmaria. |
| D11 | **Candidatos no admin:** a lista mostra todos (na votação, rascunho, fora da disputa), na ordem de `ordem` (a votação embaralha por usuário, E6-4). Estados em texto neutro: **"Na votação"**, **"Rascunho"**, **"Fora da disputa"**. Reordenar é **livre até concluir** (não afeta apuração nem a ordem de votação). Tirar da votação, **colocar na votação** (equivale a adicionar) e remover ficam travados com a urna aberta. **Remover** é recusado (`CONFLITO`) se o candidato já tiver qualquer voto ou aparecer em `historicoVotosJuri` (como voto anterior ou novo; rev. 3, D9), para respeitar a invariante 5; a saída é tirar da votação ou, com a urna aberta/encerrada, desqualificar. | O planner antigo não cobria reordenar e esquecia que "colocar na votação" também muda a cédula. |
| D12 | **Imagem do candidato é obrigatória para colocar ou manter na votação; opcional em rascunho** (rev. 3, C5). Salvar um **rascunho** sem imagem é permitido, com o aviso "Sem imagem: obrigatória para colocar na votação". **Colocar na votação** (`alterarPublicacao` com `publicado = true`) e **salvar um candidato que já está na votação** exigem imagem; sem ela, `VALIDACAO`. Título e descrição são obrigatórios. Escolha entre enviar arquivo (`blob:`), usar um exemplo (`placeholder:1` a `placeholder:8`) ou remover (remover só em rascunho). **Um `blob:` salvo nunca é revogado**; só se revoga o descartado (troca antes de salvar, Descartar). | Decisão rev. 3 (C5; DD §7.6 a atualizar, F-3). O seed não publica mais candidato sem imagem: o caso "sem imagem" é o rascunho `cand-st-09` (e `cand-fv-07`), e a Etapa 0 ganha a invariante "candidato publicado tem `imagemUrl` não nulo". Revogar um `blob:` salvo quebraria a imagem nas outras telas. |
| D13 | **Campos extras** (`CampoCandidato`): a `chave` é gerada do rótulo na criação e é **imutável** (E6-17); renomear o **rótulo** é permitido e **remover** o campo apaga também os valores nos candidatos, na mesma operação, depois de confirmar quantos serão afetados. Adicionar e remover ficam travados com a urna aberta; só o rótulo pode ser corrigido (com auditoria). Teto de 6 campos. | Valores são indexados por `chave`; sem esta regra ficariam órfãos. |
| D14 | **Desqualificar** é irreversível na Fase 1, exige **motivo** (mínimo 10 caracteres) e só existe com a urna `ABERTA` ou `ENCERRADA`. Marca `desqualificado = true` (o registro e os votos permanecem), audita e, **se a urna estiver `ENCERRADA`**, chama `congelarResultado(…, "DESQUALIFICACAO")` (stub até a Etapa 7; D9 da Etapa 0). A regra de apuração está decidida (rev. 3, C3; DD §8.1): o desqualificado sai da base de normalização e continua na contagem bruta; grupo ligado sem votos tem o peso redistribuído entre os grupos com votos. O diálogo diz que os votos permanecem registrados, que o resultado será refeito em nova versão e **pode citar a regra** ("os votos dele deixam de contar na pontuação"). | A Etapa 7 é dona de `apurar`; a tela só descreve a regra, não a calcula. Desqualificação irreversível confirmada (E12). |
| D15 | **Geral:** entram nome, slug, descrição, início, fim, fuso e encerramento automático. O **método de identificação não tem campo na tela**: fica por **seed** (rev. 3, C6; cenários `SOMENTE_GOOGLE` e `SOMENTE_EMAIL` da Etapa 3). Slug: minúsculas, números e hífen, 3 a 40 caracteres, único entre os eventos, **travado a partir de `ATIVO`** (D3; confirmado em E15). Ao renomear, o serviço atualiza `dev.slugPadrao` **na mesma gravação** (A9) e a tela navega para a nova URL com `router.replace`. Fusos: lista fechada em `lib/fusoHorario.ts`, `FUSOS_SUPORTADOS` = ids IANA `America/Sao_Paulo`, `America/Manaus`, `America/Rio_Branco` e `America/Noronha` (rev. 3, C13). `Evento.fusoHorario` guarda o **id**; o deslocamento é calculado com `Intl.DateTimeFormat` e **nunca é guardado**. Os campos de data guardam **instantes**; trocar o fuso muda só o relógio exibido. | E6-10, E6-18 e P4 da Etapa 3 (resolvida pela C6). `lib/tempo.ts` é da Etapa 0 e não pode ser estendida aqui. |
| D16 | **Janela com a urna aberta:** o início fica travado; o fim só pode ser **estendido** (novo fim posterior ao atual e ao agora), com motivo e auditoria. Com `TEMPO_ESGOTADO` (urna aberta, auto-encerramento desligado, fim vencido), estender é o caminho para reabrir o prazo. Ligar/desligar "encerrar automaticamente" com a urna aberta também pede motivo. Com a urna encerrada, tudo da janela trava. | D7 da Etapa 0 e "estender o fim" da matriz antiga. |
| D17 | **Placar:** pesos inteiros de 0 a 100. A soma dos módulos **ligados** deve ser 100; grupo desligado vale **0** e o campo fica desabilitado com o motivo (invariante 2). Presets e "Distribuir igualmente" dependem de quantos módulos estão ligados. O texto explicativo traz um **exemplo numérico fixo** (seção 5.5), calculado ao vivo com os pesos escolhidos. Se o júri estiver desligado e o desempate for `JURI`, aparece um **aviso** (o fallback é regra de apuração, Etapa 7); o valor guardado não muda. | A3 e F6 ficam para a Etapa 7. Sem este aviso o admin não sabe que o critério ficou inócuo. |
| D18 | **Tema:** política de contraste da D15 da Etapa 0: **texto × fundo < 4,5:1 bloqueia**; primária ou secundária × fundo < 3:1 **avisa**; não existe `corSobrePrimaria` (E6-1). Os presets "Semana Tech" e "Festival" vêm de `servicos/temaConfig.ts` (que lê o seed), porque componentes não importam `@/mocks` nem guardam hex de marca. Aplicar um preset troca **paleta e fonte**; nome, logo e rótulos ficam. A pré-visualização usa o `TemaEvento` com o **tema do rascunho** e a prop `inert`, então **não altera o app** antes de salvar (E6-16). A aba "Telão" é simplificada (a cena real é da Etapa 8). Fonte "carregando" some: as fontes são carregadas por `next/font` na Etapa 0. | E6-1, E6-15 e E6-16. |
| D19 | **Checklist de ativação** (seção 5.7) é uma função pura (`avaliarChecklist`) sobre contagens e valores públicos. **Bloqueiam:** ≥ 2 itens na votação, pesos válidos, janela válida, convite utilizável (módulo júri ligado), tema com contraste aprovado. **Avisam:** totem ativo (infantil ligado) e trailer configurado. Cada item leva à seção que o resolve. Os itens de totem e trailer derivam do seed (E6-13). | Mantém o planner antigo, corrigindo o item de pesos (a invariante 2 já impede soma ≠ 100; o que sobra é "módulo ligado com peso 0"). |
| D20 | **Operação:** `servicos/operacao.ts` envolve `transicoes` com validação e **não audita de novo** (E6-6). **Ativar evento** e **Abrir urna** são ações separadas (confirmado em E11) e ambas exigem o checklist sem bloqueios. **Encerrar urna** tem confirmação mais forte e **não mostra número de votos** (a Etapa 7 é dona dos totais; seção 2.3 do Contexto). **Concluir** exige digitar o nome do evento (`DialogoConfirmacao`) e deixa a tela em leitura **sem navegar**: mostra um `Alerta` com `Link` para o painel (E6-19; "Concluir não redireciona" confirmado em E26). Com combinação incoerente, as ações ficam desabilitadas e a tela explica. | O encerramento sempre congela o resultado (D8 da Etapa 0). A Etapa 9 decide a navegação pós-conclusão. |
| D21 | **Cenários (A10):** `RASCUNHO_INCOMPLETO` mantém os **pesos somando 100** (a invariante 2 vale em qualquer cenário); o "incompleto" vem de **um só item na votação, nenhum convite e janela no passado**. Os quatro cenários agem sobre o **evento ativo** e saem de `src/mocks/cenarios/configuracao.ts`, registrados no registro da Etapa 0. "Urna aberta" e "Festival" do planner antigo já são o `PADRAO` (Semana Tech e Festival). | E6-7 e E6-8. |
| D22 | **Sem campo novo em `ui` nem em `dev`, e sem controle novo na toolbar** além dos quatro cenários. O "Resetar protótipo" continua só na toolbar. | T18 do Contexto e T17 (evita controles duplicados). |
| D23 | **`lib/csv.ts` é desta etapa** e a Etapa 7 reaproveita (E6-2): UTF-8 **com BOM**, separador `;`, fim de linha CRLF, aspas duplas escapadas e **neutralização de fórmulas** (célula que começa com `=`, `+`, `-` ou `@` ganha um apóstrofo à frente). Cabeçalho do CSV de convites: `rotulo;codigo;validade` (formato confirmado em E16). **"Baixar CSV" dos convites é auditado** como `EXPORTACAO_CSV` com `detalhes: { arquivo: "convites", quantidade }` (rev. 3, C14), pelo serviço `registrarExportacaoConvites`; a ação já existe no tipo da Etapa 0, sem ação nova no catálogo, e o código legível nunca entra em `detalhes`. | O rótulo é texto digitado pelo admin e abre em planilha; sem a neutralização vira injeção de fórmula. Toda exportação deixa rastro, como na Etapa 7. |
| D24 | **Módulo júri travado com convite usado** (rev. 3, E32): o módulo júri **não pode ser desligado** quando existe convite `USADO` no evento (há jurado com papel). `dominio/travas.ts` ganha a ação `MODULO_JURI_DESLIGAR`, cujo nível depende do dado (não da fase): `TRAVADO` com convite `USADO`, `LIVRE` sem. Como o liga/desliga é da toolbar (`alternarModulo`, Etapa 0), o CP1 faz o ajuste mínimo para `alternarModulo` consultar `exigirAcao` e recusar com o motivo "Travado: já existe jurado com convite resgatado.", registrado como errata (seção 10, P15). A seção Placar mostra o motivo ao lado do peso do júri. | Desligar o júri depois de resgates deixaria jurados sem voto e mudaria os pesos com papéis já distribuídos (Etapa 2 P3). |

---

## 5. Modelo e regras

### 5.1 Fases e travas (`dominio/travas.ts`)

```ts
type FaseConfig = "RASCUNHO" | "ATIVO_NAO_INICIADA" | "URNA_ABERTA" | "URNA_ENCERRADA" | "CONCLUIDO"
type NivelTrava = "LIVRE" | "AUDITADO" | "ESTENDER" | "EXCEPCIONAL" | "TRAVADO" | "INDISPONIVEL" | "LEITURA"

resolverFaseConfig(evento): { fase: FaseConfig; incoerente: boolean }
resolverTravas(evento): { fase; incoerente; nivel(acao: AcaoConfig): NivelTrava; motivo(acao): string | null }
exigirAcao(evento, acao): Resultado<null>   // EVENTO_CONCLUIDO se LEITURA; TRAVADO se TRAVADO ou INDISPONIVEL
```

**Derivação da fase** (precedência da Etapa 1: `CONCLUIDO` > `RASCUNHO` > urna):

| `estado` | `estadoUrna` | Fase | `incoerente` |
|---|---|---|---|
| `CONCLUIDO` | qualquer | `CONCLUIDO` | `true` se a urna não for `ENCERRADA` |
| `RASCUNHO` | `NAO_INICIADA` | `RASCUNHO` | `false` |
| `RASCUNHO` | `ABERTA` ou `ENCERRADA` | `RASCUNHO` | `true` (só por toolbar) |
| `ATIVO` | `NAO_INICIADA` | `ATIVO_NAO_INICIADA` | `false` |
| `ATIVO` | `ABERTA` | `URNA_ABERTA` | `false` |
| `ATIVO` | `ENCERRADA` | `URNA_ENCERRADA` | `false` |

**Matriz de travas** (única fonte; `AcaoConfig` é o nome da primeira coluna em maiúsculas):

| Ação | Rascunho | Ativo + não iniciada | Urna aberta | Urna encerrada | Concluído |
|---|---|---|---|---|---|
| Geral: nome e descrição | Livre | Livre | Livre | Livre | Leitura |
| Geral: slug | Livre | **Travado** | Travado | Travado | Leitura |
| Geral: fuso e início da janela | Livre | Livre | **Travado** | Travado | Leitura |
| Geral: fim da janela | Livre | Livre | **Estender** (motivo + auditoria) | Travado | Leitura |
| Geral: encerramento automático | Livre | Livre | Auditado | Travado | Leitura |
| Candidatos: adicionar, remover, colocar/tirar da votação | Livre | Livre | **Travado** | Travado | Leitura |
| Candidatos: reordenar | Livre | Livre | Livre | Livre | Leitura |
| Candidatos: corrigir texto ou imagem | Livre | Livre | Auditado | Auditado | Leitura |
| Candidatos: desqualificar | Indisponível | Indisponível | Excepcional | Excepcional | Leitura |
| Campos extras: adicionar e remover | Livre | Livre | **Travado** | Travado | Leitura |
| Campos extras: corrigir rótulo | Livre | Livre | Auditado | Auditado | Leitura |
| Convites: gerar | Livre | Livre | Livre | **Travado** | Leitura |
| Convites: renomear | Livre | Livre | Livre | Travado | Leitura |
| Convites: revogar | Livre | Livre | Auditado | Travado | Leitura |
| Placar: pesos e desempate | Livre | Livre | **Travado** | Travado | Leitura |
| Módulo júri: desligar (toolbar, D24) | Livre; **Travado** com convite `USADO` | Livre; **Travado** com convite `USADO` | Livre; **Travado** com convite `USADO` | Livre; **Travado** com convite `USADO` | Leitura |
| Tema | Livre | Livre | Livre | Livre | Leitura |
| Operação | Conforme a fase (5.7) | Conforme a fase | Conforme a fase | Conforme a fase | Leitura |

Significado dos níveis:
- **Auditado:** abre `DialogoMotivo` (motivo opcional) e grava na auditoria.
- **Estender:** só permite um valor posterior ao atual; pede motivo e audita.
- **Excepcional:** igual a Auditado, com **motivo obrigatório** e texto de consequência (desqualificar).
- **Indisponível:** o controle nem aparece; o serviço devolve `TRAVADO`.
- **Leitura:** a tela inteira vira somente leitura (`fieldset disabled`, `Alerta` no topo, nenhum botão de ação).

**Regras de uso**
- Componentes só perguntam `travas.nivel(acao)` e `travas.motivo(acao)`. **Nunca** comparam `estadoUrna` por conta própria.
- O motivo é sempre **texto visível** ("Travado: a urna já foi aberta.") além de `aria-disabled`/tooltip; estado nunca só por cor.
- Com `incoerente = true`, o `BannerTrava` acrescenta: "Combinação criada pela toolbar. Use a toolbar para voltar a um estado válido." As ações de Operação ficam desabilitadas.
- `BannerTrava` aparece quando houver qualquer trava ativa na seção atual: "Urna aberta: candidatos e pesos estão travados."
- Os serviços **sempre** chamam `exigirAcao` antes de validar campos.
- `MODULO_JURI_DESLIGAR` (D24, E32) é a única ação cujo nível depende de dado: `resolverTravas` e `exigirAcao` recebem, além do evento, a contagem pública `conviteUsado: boolean` (montada por seletor ou serviço, nunca com hash). O método de identificação não está na matriz: é **por seed** (C6).

### 5.2 Serviços

Todos `Promise<Resultado<T>>`, com `atraso()` e `simularFalha()` (D7). Erros genéricos vêm de `servicos/mensagens.ts`; textos específicos de campo (por exemplo, "Este endereço já está em uso.") são do formulário, que interpreta `CONFLITO` e `VALIDACAO` no contexto.

| Serviço | Entrada | Efeito (um único `atualizar`) | Erros |
|---|---|---|---|
| `salvarGeral` | `eventoId`, `patch` (campos de 5.3), `motivo?` | Atualiza `Evento`; se o slug mudou e `dev.slugPadrao` era o antigo, atualiza `dev.slugPadrao`; audita `CONFIG_ALTERADA` (`detalhes`: campos alterados e, na janela, de/para) | `NAO_ENCONTRADO`, `EVENTO_CONCLUIDO`, `TRAVADO`, `VALIDACAO`, `CONFLITO` (slug em uso), `REDE`, `ERRO_INTERNO` |
| `criarCandidato` / `salvarCandidato` | `eventoId`, dados do candidato (`titulo`, `descricao`, `imagemUrl`, `camposExtras`), `motivo?` | Cria (próxima `ordem`, sempre como rascunho) ou atualiza; com a urna `ABERTA`/`ENCERRADA` só atualiza texto e imagem e audita `CANDIDATO_CORRIGIDO` | `TRAVADO`, `VALIDACAO` (inclui candidato já na votação sem imagem, D12), `NAO_ENCONTRADO` |
| `alterarPublicacao` | `eventoId`, `candidatoId`, `publicado` | Muda `publicado` | `TRAVADO`, `VALIDACAO` (colocar na votação sem imagem, D12), `NAO_ENCONTRADO` |
| `reordenarCandidato` | `eventoId`, `candidatoId`, `direcao: "SUBIR" \| "DESCER"` | Troca `ordem` com o vizinho e reindexa | `NAO_ENCONTRADO`, `EVENTO_CONCLUIDO` |
| `removerCandidato` | `eventoId`, `candidatoId` | Remove o candidato | `TRAVADO`, `CONFLITO` (já recebeu voto ou aparece em `historicoVotosJuri`, anterior ou novo; ver D11; rev. 3, D9), `NAO_ENCONTRADO` |
| `desqualificarCandidato` | `eventoId`, `candidatoId`, `motivo` (≥ 10 caracteres) | `desqualificado = true`; audita `CANDIDATO_DESQUALIFICADO`; com a urna `ENCERRADA`, chama `congelarResultado(…, "DESQUALIFICACAO")` | `TRAVADO`, `VALIDACAO`, `CONFLITO` (já desqualificado), `NAO_ENCONTRADO` |
| `salvarCamposExtras` | `eventoId`, lista de campos (`chave?`, `rotulo`, `ordem`), `motivo?` | Cria, renomeia rótulo, reordena e remove campos; remoção apaga os valores em `camposExtras` dos candidatos; audita `CONFIG_ALTERADA` | `TRAVADO`, `VALIDACAO` |
| `listarConvites` | `eventoId` | Só leitura. Devolve `ConviteListado[]` (sem hash) com nome de quem resgatou | `NAO_ENCONTRADO`, `REDE` |
| `gerarConvites` | `eventoId`, `quantidade` (1–50), `rotuloBase?`, `validadeAte?` | Cria convites `DISPONIVEL` com `hashCodigo`; devolve os **códigos legíveis no resultado**; audita `CONVITES_GERADOS` (quantidade, rótulo base, validade) | `TRAVADO`, `VALIDACAO`, `EVENTO_CONCLUIDO` |
| `registrarExportacaoConvites` | `eventoId`, `quantidade` | Chamado pelo "Baixar CSV" de `CodigosGeradosDialog`; audita `EXPORTACAO_CSV` com `detalhes: { arquivo: "convites", quantidade }` (C14); **nunca** recebe nem registra códigos. O CSV em si é montado no diálogo, a partir dos códigos em memória | `NAO_ENCONTRADO`, `EVENTO_CONCLUIDO` |
| `renomearConvite` | `eventoId`, `conviteId`, `rotulo` | Muda o rótulo | `TRAVADO`, `NAO_ENCONTRADO`, `VALIDACAO` |
| `revogarConvite` | `eventoId`, `conviteId`, `gerarSubstituto`, `motivo?` | `REVOGADO`; opcionalmente cria um substituto (mesmo rótulo e validade, que devolve o código); audita `CONVITE_REVOGADO` | `TRAVADO`, `CONFLITO` (convite já usado ou revogado), `NAO_ENCONTRADO` |
| `salvarPlacar` | `eventoId`, `pesoPopular`, `pesoJuri`, `pesoInfantil`, `regraDesempate` (sem `exibirVotosJuriNoTelao`, removido na rev. 4, E21) | Atualiza `ConfigPlacar`; audita `CONFIG_ALTERADA` | `TRAVADO`, `VALIDACAO` |
| `salvarTema` | `eventoId`, campos de 5.6 | Atualiza `Tema`; audita `TEMA_ALTERADO` | `EVENTO_CONCLUIDO`, `VALIDACAO` |
| `listarPresetsTema` | nenhuma | Lê os temas do seed e devolve `{ id, nome, paleta, fonte }[]` | `REDE` |
| `ativarEvento` / `abrirUrna` / `encerrarUrna` / `concluirEvento` | `eventoId` (+ `confirmacaoNome` em `concluirEvento`) | Valida fase e checklist (ativar e abrir), chama a transição de `store/transicoes.ts` (que **já audita**) | `EVENTO_CONCLUIDO`, `URNA_ENCERRADA`, `URNA_NAO_ABERTA`, `CONFLITO` (fase errada), `VALIDACAO` (checklist com bloqueio ou nome não confere) |

**Regras comuns**
- `salvarPlacar` rejeita soma diferente de 100 considerando só módulos ligados, módulo desligado com peso diferente de 0 e valores fora de 0–100 (`VALIDACAO`).
- `salvarCandidato` e `criarCandidato` **nunca** alteram `publicado`, `desqualificado` ou `ordem` de um candidato existente (cada um tem sua ação).
- `alterarPublicacao` (para `true`) e `salvarCandidato` de um candidato já na votação recusam `imagemUrl` nula com `VALIDACAO` (D12); salvar rascunho sem imagem é aceito.
- A remoção de candidato consulta `votos`, `votosJuri`, `historicoVotosJuri` (voto anterior e novo) e `votosInfantis` **dentro do serviço**, o que a fronteira de dados (D4) permite, e só para recusar.
- `desqualificarCandidato` não altera votos, não recalcula nada e não mexe em `participacoes`.
- O código legível de convite **não** é registrado em log nem em auditoria. O prefixo `[mock:log]` só recebe quantidades e ids.

### 5.3 Validações de campo (`dominio/validacoesConfig.ts`, funções puras)

| Campo | Regra |
|---|---|
| Nome do evento | Obrigatório, 3 a 80 caracteres |
| Slug | Obrigatório, `^[a-z0-9]+(-[a-z0-9]+)*$`, 3 a 40 caracteres, único entre os eventos (comparado sem diferenciar maiúsculas) |
| Descrição | Opcional, até 600 caracteres |
| Início e fim | Fim posterior ao início. Antes de abrir a urna, o **fim** precisa ser posterior ao agora para ativar (checklist), mas pode ser salvo no passado (assim o cenário `RASCUNHO_INCOMPLETO` é alcançável pela UI). Com a urna aberta, novo fim > fim atual e > agora |
| Fuso | Um dos quatro ids IANA de `FUSOS_SUPORTADOS` (`America/Sao_Paulo`, `America/Manaus`, `America/Rio_Branco`, `America/Noronha`); guarda-se o id, o deslocamento vem de `Intl.DateTimeFormat` (C13) |
| Título do candidato | Obrigatório, até 150 caracteres (se algum seed passar disso, ajustar o limite no CP1 e registrar) |
| Descrição do candidato | Obrigatória, até 1500 caracteres |
| Valor de campo extra | Opcional, até 200 caracteres |
| Imagem | **Obrigatória** para colocar na votação e para salvar um candidato já na votação; opcional em rascunho, com o aviso "Sem imagem: obrigatória para colocar na votação" (D12, C5). Arquivo: PNG, JPG, WebP ou SVG, até **2 MB** (validado pelo tipo e pelo tamanho informados pelo navegador). Exemplo: `placeholder:1` a `placeholder:8` |
| Rótulo de campo extra | Obrigatório, 2 a 30 caracteres, único no evento; a `chave` é gerada (minúsculas, sem acento, `_`) e recebe sufixo numérico em caso de colisão; teto de 6 campos |
| Motivo | Opcional nas ações "Auditado" e "Estender"; **obrigatório (≥ 10 caracteres)** em "Excepcional" |
| Convites | Quantidade inteira de 1 a 50; rótulo base opcional até 40 caracteres (vira "Jurado 4", "Jurado 5"… a partir do maior número já usado com o mesmo rótulo base); validade opcional, posterior ao agora |
| Pesos | Inteiros de 0 a 100; soma dos módulos ligados igual a 100; módulo desligado igual a 0 |
| Módulo júri (desligar) | Recusado (`TRAVADO`) se existir convite `USADO` no evento (D24, E32) |
| Rótulos do tema | Singular e plural obrigatórios, 2 a 30 caracteres, escritos como no começo de uma frase (ex.: "Curta" e "Curtas") |
| Cores | Hex de 6 dígitos (`<input type="color">`) |
| Nome de exibição do tema | Obrigatório, 2 a 60 caracteres |

### 5.4 Convites

**Estado exibido** (`dominio/convites.ts`): `estadoExibidoConvite(convite, agora)` devolve `DISPONIVEL`, `USADO`, `REVOGADO` ou `EXPIRADO` (derivado). `resumirConvites(convites, agora)` devolve `{ disponiveis, usados, revogados, expirados }`. **A Etapa 7 usa as mesmas duas funções**, e por isso os números batem por construção.

```ts
type ConviteListado = {
  id: string; rotulo: string | null
  estado: "DISPONIVEL" | "USADO" | "REVOGADO" | "EXPIRADO"
  validadeAte: Instante | null
  resgatadoPor: string | null      // nome do usuário; nunca e-mail, nunca hash
  resgatadoEm: Instante | null
}
```

**Geração:** `gerarCodigo(gerador)` com um gerador semeado por `crypto.getRandomValues` **dentro do serviço** (nada de `Math.random`). Alfabeto e formato `XXXX-XXXX` da Etapa 0. O serviço guarda `hashCodigo` e devolve `{ rotulo, codigo, validadeAte }[]` apenas em `dados`.

**`CodigosGeradosDialog`**
- Mostra os códigos **uma única vez**, com "Copiar tudo", "Baixar CSV" e o aviso: "Depois de fechar, não será possível ver os códigos novamente."
- Rastreia em estado local se a pessoa copiou ou baixou. Fechar (botão, Esc ou fundo) **sem** ter copiado nem baixado pede confirmação.
- A cópia usa `navigator.clipboard.writeText`. Em HTTP na rede local ele pode não existir; nesse caso mostra um `<textarea readonly>` selecionável e o toast "Não foi possível copiar. Selecione e copie manualmente."
- O nome do arquivo é `convites-{slug}-{AAAAMMDD}.csv`, com a data do **relógio simulado**.
- Cada clique em "Baixar CSV" chama `registrarExportacaoConvites`, que audita `EXPORTACAO_CSV` com `detalhes: { arquivo: "convites", quantidade }` (C14). Falha no registro mostra o erro e não baixa o arquivo.

**Tabela:** rótulo (editável), estado (`Selo` com ícone e texto), validade (`formatarDataHora` ou "Sem validade"), "Resgatado por/em", ação **Revogar** (só em `DISPONIVEL` e `EXPIRADO`). Filtro por estado e resumo no topo com os quatro números. Módulo júri **desligado:** o resumo e a lista continuam visíveis em **leitura**, "Gerar" e "Revogar" ficam desabilitados com o motivo; sem convites, aparece o estado vazio explicativo.

**Revogação:** `DialogoMotivo` com a opção "Gerar um convite substituto"; se marcada, o substituto é mostrado em `CodigosGeradosDialog`.

**Integração com a Etapa 3:** um código gerado aqui funciona no resgate; ao resgatar, o convite vira `USADO` com `participacaoId` e `resgatadoEm`; revogado e expirado são recusados (`CODIGO_REVOGADO`, `CODIGO_EXPIRADO`).

### 5.5 Placar

- Cada módulo **ligado** tem um controle de peso (slider sincronizado com campo numérico); o grupo **popular** está sempre ligado.
- A barra empilhada mostra a divisão com **rótulos dentro dos segmentos** ("Popular 50%"), usando só tokens do tema (`bg-tema-primaria`, `bg-tema-secundaria`, `bg-tema-texto-suave`); nunca só cor.
- Indicador ao vivo (em `LiveRegion`): "Faltam 10%", "Excede 5%" ou "Soma 100%". **Salvar** só habilita com soma 100 e alteração pendente.
- **Distribuir igualmente:** divide 100 entre os módulos ligados; o resto vai ao popular (3 módulos: 34 / 33 / 33).
- **Presets:** 1 módulo ligado, 100; 2 módulos, 70/30 e 50/50; 3 módulos, 50/30/20 e 40/40/20 (ordem popular, júri, infantil).
- **Desempate:** `JURI` ou `PUBLICO`. Com o júri desligado e `JURI` escolhido, `Alerta` de aviso: "O júri está desligado. Esse critério não terá efeito; a regra de apuração decide o desempate." (o fallback é da Etapa 7, P6).
- **Removido (rev. 4, E21):** a opção "Exibir votos do júri no telão" não existe; a revelação mostra só o vencedor de cada categoria, nunca quem votou em quem.
- **Exemplo numérico fixo** (`dominio/placarExemplo.ts`, função pura `calcularExemploPlacar(pesos)`), com votos fixos que **não** vêm do evento:

| Grupo | Total | Candidato A | Candidato B | Candidato C |
|---|---|---|---|---|
| Popular | 200 | 100 | 60 | 40 |
| Júri | 10 | 2 | 7 | 1 |
| Infantil | 40 | 10 | 10 | 20 |

`pontuação = peso_popular × (votos_pop ÷ total_pop) + peso_juri × (votos_juri ÷ total_juri) + peso_infantil × (votos_inf ÷ total_inf)`, com cada grupo normalizado **antes** do peso (`Jurado.md`). Resultados de conferência: com **70 / 30 / 0**, A = 41,0, B = 42,0 e C = 17,0; com **50 / 30 / 20**, A = 36,0, B = 41,0 e C = 23,0; com **100 / 0 / 0**, A = 50,0, B = 30,0 e C = 20,0. O exemplo mostra que a mudança de pesos muda quem lidera. Grupo sem votos é regra da Etapa 7 (A3), decidida na rev. 3 (C3): o peso do grupo ligado com base 0 é **redistribuído** proporcionalmente entre os grupos com votos (`pesoEfetivo[g] = peso[g] × 100 ÷ soma dos pesos dos grupos com base > 0`); se nenhum grupo tiver votos, todas as pontuações são 0. O texto de ajuda diz: "Se um grupo ficar sem votos, o peso dele é redistribuído entre os outros." O exemplo fixo não tem grupo vazio.
- Com a urna aberta, **nada** é editável e o `BannerTrava` explica.

### 5.6 Tema

**Campos:** nome de exibição, logo (envio local, exemplo ou remover), cor primária, secundária, fundo e texto, fonte (`FONTES_APROVADAS`, hoje Inter, Poppins e Space Grotesk; a lista é uma configuração **editável pelo dono do produto**, comentário em `lib/fontes.ts`, rev. 4, E2), rótulo no singular e no plural.

**Pares verificados** (todos calculados a partir de `calcularTokens` e `razaoContraste`):

| Par | Mínimo | Efeito |
|---|---|---|
| Texto × fundo | 4,5:1 | **Bloqueia** |
| Texto suave × fundo e superfície | 4,5:1 | **Bloqueia** |
| Texto sobre primária (derivado) | 4,5:1 | **Bloqueia** |
| Texto sobre secundária (derivado) | 4,5:1 | **Bloqueia** |
| Primária-texto e secundária-texto × fundo (ajustadas) | 4,5:1 | **Bloqueia** |
| Primária × fundo, secundária × fundo | 3:1 | **Aviso** (não bloqueia; elementos gráficos e foco) |
| Foco × fundo | 3:1 | **Aviso** |

`ContrasteBadge` mostra a razão (ex.: "5,3:1"), o veredito em **texto e ícone** ("Aprovado", "Reprovado", "Atenção") e o par; nunca só cor. Salvar fica bloqueado enquanto qualquer par bloqueante reprovar, com a lista dos pares que falharam. Sugerir cor corrigida é opcional.

**Pré-visualização (`PreviaTema`):** abas **Login**, **Votação** e **Telão**, feitas com os componentes de UI da Etapa 0 dentro de `TemaEvento` com o tema **do rascunho**, com `inert` e `aria-label="Pré-visualização"`. A aba Telão é **simplificada** (fundo, logo ou nome, título e três posições).

**Presets:** "Semana Tech" e "Festival", vindos de `listarPresetsTema`. Aplicar um preset troca paleta e fonte e **entra no rascunho** (a pessoa ainda precisa salvar). O preset do Festival reproduz o visual do seed, com as exceções da D15 da Etapa 0 (texto escuro sobre o laranja, verde ajustado como texto).

**Ao salvar:** o tema vale para landing, evento, votação e telão. É **livre** mesmo com a urna aberta.

**Logo:** o envio gera `blob:` por `URL.createObjectURL` **no manipulador do evento**; o `blob:` anterior só é revogado se **não** foi salvo (D12). `LogoEvento` precisa aceitar `blob:` (conferido no CP1); sem logo, mostra o nome em texto.

### 5.7 Checklist de ativação e Operação

**Itens** (`dominio/checklistAtivacao.ts`, `avaliarChecklist(entrada)`); a entrada é montada por `store/seletores/checklist.ts`, que expõe **só** valores públicos e **contagens**:

| # | Item | Condição para "ok" | Severidade | Leva a |
|---|---|---|---|---|
| 1 | Itens na votação | ao menos **2** votáveis (`votaveis()`) | Bloqueia | Candidatos |
| 2 | Pesos | soma 100 e **todo módulo ligado com peso maior que 0** | Bloqueia | Placar |
| 3 | Janela de votação | início anterior ao fim **e** fim posterior ao agora | Bloqueia | Geral |
| 4 | Convites | módulo júri ligado → ao menos 1 convite que não seja revogado nem expirado | Bloqueia | Júri |
| 5 | Tema | todos os pares bloqueantes de 5.6 aprovados | Bloqueia | Tema |
| 6 | Totem | módulo infantil ligado → ao menos 1 dispositivo `ATIVO` | **Aviso** | (só informa; dispositivos do seed; a gestão real vem do planner "Totem", rev. 4, A7) |
| 7 | Trailer | `trailerUrl` válido **ou** `usarTrailerGerado` | **Aviso** | (só informa; o ensaio é da Etapa 8). Um **único trailer do evento**, por link/embed (YouTube ou Vimeo); **nunca se armazena vídeo** (rev. 4, E21) |

Item que não se aplica (módulo desligado) aparece como "Não se aplica", nunca some. Cada item mostra ícone **e** texto do estado ("Pendente", "Ok", "Aviso", "Não se aplica") e, se houver pendência, um `Link` para a seção.

**Ações de Operação por fase:**

| Fase | Ação disponível | Exigência | Confirmação |
|---|---|---|---|
| `RASCUNHO` | **Ativar evento** | checklist sem bloqueio | `DialogoConfirmacao` |
| `ATIVO_NAO_INICIADA` | **Abrir urna** | checklist sem bloqueio; aviso se agora < início da janela | `DialogoConfirmacao`; informa que candidatos e pesos vão travar |
| `URNA_ABERTA` | **Encerrar urna** | nenhuma | Confirmação **forte** (efeito imediato, congela o resultado); **sem número de votos** |
| `URNA_ENCERRADA` | **Concluir evento** | nenhuma | Digitar o **nome do evento**; deixa tudo em leitura |
| `CONCLUIDO` | nenhuma | — | — |

- A **linha do tempo** mostra as duas trilhas (`Rascunho → Ativo → Concluído` e `Não iniciada → Aberta → Encerrada`) com `aria-current="step"` na posição atual.
- Cada transição usa `store/transicoes.ts`, que **já audita**; esta etapa não registra de novo.
- Depois de **Concluir**, a tela fica em leitura e mostra um `Alerta` com `Link` para o painel.
- Antes de abrir a urna, se o relógio já passou do fim e o encerramento automático está ligado, o item 3 bloqueia (evita abrir e fechar no mesmo instante).
- **"Resetar protótipo"** continua só na toolbar.

### 5.8 Auditoria (catálogo desta etapa)

| `acao` | `entidade` | Quando | `detalhes` |
|---|---|---|---|
| `CONFIG_ALTERADA` | `Evento`, `ConfigPlacar` ou `CampoCandidato` | Salvar Geral, Placar ou campos extras | campos alterados; na janela, de/para; `motivo` quando houve |
| `TEMA_ALTERADO` | `Tema` | Salvar Tema | campos alterados (cores, fonte, rótulos, logo trocado sim/não) |
| `CONVITES_GERADOS` | `ConviteJurado` | Gerar lote ou substituto | quantidade, rótulo base, validade; **nunca** códigos |
| `CONVITE_REVOGADO` | `ConviteJurado` | Revogar | rótulo, `substituto` sim/não, `motivo` |
| `CANDIDATO_DESQUALIFICADO` | `Candidato` | Desqualificar | `motivo`, fase |
| `CANDIDATO_CORRIGIDO` | `Candidato` | Corrigir texto ou imagem com a urna `ABERTA` ou `ENCERRADA` | campos alterados, fase, `motivo` |
| `EXPORTACAO_CSV` (já no tipo da Etapa 0; não é ação nova) | `Evento` | "Baixar CSV" dos convites (C14) | `{ arquivo: "convites", quantidade }`; **nunca** códigos |

Já existentes e **não repetidos aqui**: `EVENTO_ATIVADO`, `URNA_ABERTA`, `URNA_ENCERRADA`, `EVENTO_CONCLUIDO` (E0), `CONVITE_RESGATADO`, `TENTATIVA_CODIGO_INVALIDA`, `BLOQUEIO_RATE_LIMIT` (E3), `VOTO_JURI_REGISTRADO`, `VOTO_JURI_ALTERADO` (E5). `ipHash = hashMock("ip-demo")`. A Etapa 9 atualiza o catálogo da seção 7.1 do Contexto (esta etapa troca a sugestão `CANDIDATO_EDITADO_COM_URNA_ABERTA` por `CANDIDATO_CORRIGIDO`).

### 5.9 Cenários (`src/mocks/cenarios/configuracao.ts`)

Todos puros (`aplicar(atual) => EstadoApp`), agindo no **evento ativo** (`dev.slugPadrao`), grupo `ESTADO`, e deixando `verificarInvariantes` vazia.

| Cenário | O que faz |
|---|---|
| `RASCUNHO_INCOMPLETO` | Evento `RASCUNHO`/`NAO_INICIADA`; **zera os votos do evento** (`votos`, `votosJuri`, `historicoVotosJuri`, `votou` das participações, `dev.vinculosVoto` do evento); **um único item na votação** (os demais viram rascunho); **remove todos os convites** e as participações `JURADO` do evento; janela **no passado** (início e fim anteriores a `T0`); pesos do seed (somam 100). Resultado: itens 1, 3 e 4 do checklist bloqueiam |
| `RASCUNHO_PRONTO` | Evento `RASCUNHO`/`NAO_INICIADA`; zera os votos como acima; mantém candidatos, convites e pesos do seed; se a janela do seed não estiver inteira no futuro, ajusta para `[T0 + 1 dia, T0 + 1 dia + 4 h]`. Resultado: checklist sem bloqueios |
| `URNA_ENCERRADA` | Se for `RASCUNHO`, ativa; leva a urna a `ENCERRADA` por `forcarEstadoUrna` (que congela o resultado; stub até a Etapa 7); mantém votos do seed |
| `EVENTO_CONCLUIDO` | `URNA_ENCERRADA` seguido de `forcarEstadoEvento("CONCLUIDO")` |

Para **urna aberta** e **Festival** usam-se o `PADRAO` (Semana Tech `ABERTA`; Festival `NAO_INICIADA`). Lista longa e candidato sem imagem já existem no seed e em `MUITOS_CANDIDATOS` (Etapa 4); desde a rev. 3 (C5) o caso sem imagem é o **rascunho** `cand-st-09` (e `cand-fv-07` no Festival). Os cenários que colocam itens na votação nunca publicam candidato sem imagem (invariante nova da Etapa 0).

### 5.10 Textos e acessibilidade

- **Rótulos do tema** nos títulos de seção e de lista (`rotuloCandidatos`), sem artigo nem adjetivo concordando: "Na votação: 6 (mínimo 2 para ativar)", "Fora da disputa", "Adicionar" (com `aria-label` "Adicionar à lista de {rótulos}"), "Colocar na votação", "Tirar da votação". Nunca "Novo", "Publicado" nem "Desqualificado" como etiqueta.
- **Dica de travas:** texto fixo em `lib/textosTravas.ts` (função de `motivo(acao)`): "Travado: a urna já foi aberta.", "Travado: o evento foi concluído.", "Travado: a urna foi encerrada.", "Travado: o endereço já foi divulgado quando o evento é ativado."
- **Foco:** um `h1` por tela ("Configuração"), foco no título da seção ao trocar de seção, retorno do foco ao fechar diálogos (`Dialogo` da Etapa 0).
- **Erros:** inline, ligados por `aria-describedby`, resumo no topo do formulário com `LiveRegion` quando o envio é recusado.
- **Alvos de toque** de 44 px, foco visível, `prefers-reduced-motion`, e **estado nunca só por cor** (ícone e texto em todo `Selo`, barra de pesos e `ContrasteBadge`).
- **Mobile (360 px):** sem rolagem horizontal; a tabela de convites vira lista de cartões; o painel de checklist vira um `<details>` acima do conteúdo.
- **Modo leitura:** `fieldset disabled` em volta de cada formulário, `Alerta` fixo no topo e nenhum botão de ação.

### 5.11 Matriz de verificação (C1–C36)

Todos os testes são feitos **na mesma aba** (D18 da Etapa 0), navegando por `Link` e trocando de usuário pela toolbar ("Entrar como"). Confirme `verificarInvariantes` vazia **depois de cada linha** e use o `InspetorEstado` para conferir `banco.auditoria`.

| # | Cenário | Como provocar | Resultado esperado |
|---|---|---|---|
| C1 | Acesso | Carla em `/e/semana-tech/admin/configuracao`; depois Ana, Hugo e deslogado | Carla entra; Ana e Hugo veem `AcessoRestrito` sem nenhum dado; deslogado vai para `/e/semana-tech?de=…` |
| C2 | Seções na URL | Abrir cada `?secao=` e `?secao=xyz` | As seis abrem e mantêm a URL; valor inválido normaliza para `geral`; foco no título |
| C3 | Fases e banner | Toolbar: Rascunho, Ativo + não iniciada, urna Aberta, Encerrada, Concluído | Banner, travas e selos mudam conforme a matriz 5.1; concluído deixa tudo em leitura |
| C4 | Estado incoerente | Toolbar: evento Concluído com urna Aberta; evento Rascunho com urna Encerrada | Leitura no primeiro; fase `RASCUNHO` no segundo; ambos com o aviso de combinação criada pela toolbar e ações de Operação desabilitadas |
| C5 | Geral: validações | Nome vazio; slug `Meu Evento`; slug de outro evento; fim antes do início | Erros inline; Salvar bloqueado; nada gravado |
| C6 | Geral: salvar e refletir | `RASCUNHO_PRONTO`, mudar o nome e a descrição, salvar | Toast "Salvo"; nome novo no cabeçalho, na landing e na página do evento; `CONFIG_ALTERADA` |
| C7 | Slug em rascunho | `RASCUNHO_PRONTO`, mudar o slug e salvar | Navega para a nova URL sem perder a sessão; `dev.slugPadrao` acompanha; landing continua funcionando |
| C8 | Slug travado | Semana Tech (`ATIVO`, urna aberta) e Festival (`ATIVO`, não iniciada) | Slug desabilitado nos dois, com o motivo visível |
| C9 | Alteração pendente | Editar um campo e clicar em outra seção | Pergunta antes de descartar; "Continuar editando" mantém o rascunho |
| C10 | Estender o fim | Semana Tech, aumentar o fim em 1 h | Pede motivo e audita; fim anterior ao atual é recusado; início desabilitado |
| C11 | Tempo esgotado | `SEM_ENCERRAMENTO_AUTOMATICO` + "Fim da janela" + estender o fim | Aviso "Tempo esgotado" some na Etapa 2 depois de salvar; voto continua aceito |
| C12 | Lista de candidatos | Semana Tech: lista com 10 itens, `MUITOS_CANDIDATOS` | Mostra "Na votação", "Rascunho" e "Fora da disputa"; item sem imagem = `cand-st-09` (rascunho), com bloco de cor e o aviso "Sem imagem: obrigatória para colocar na votação"; "Colocar na votação" nele é recusado com `VALIDACAO` (C5); filtro por estado; contador "Na votação: N" |
| C13 | Reordenar | Subir e descer um item | A ordem muda no admin e (E7) no dashboard; a votação continua embaralhada por usuário |
| C14 | Trava de candidatos | Semana Tech (urna aberta) | Adicionar, remover, colocar e tirar da votação desabilitados com o motivo; reordenar e corrigir texto liberados |
| C15 | Criar candidato | `RASCUNHO_PRONTO`, adicionar um com título, descrição e imagem e outro só com título e descrição; colocar os dois na votação | Com imagem: entra na lista e, colocado na votação, aparece em `/votar` (Etapa 4). Sem imagem: só salva como **rascunho** (aviso "Sem imagem: obrigatória para colocar na votação"); colocar na votação é recusado com `VALIDACAO`. Sem auditoria |
| C16 | Corrigir com a urna aberta | Semana Tech, editar o título de um item | Pede confirmação; `CANDIDATO_CORRIGIDO` com fase `URNA_ABERTA`; o novo título aparece em `/votar` |
| C17 | Remover | `RASCUNHO_PRONTO`, remover um item sem voto; depois `PADRAO` na Semana Tech, toolbar: urna "Não iniciada" (o voto de Eva permanece no seed), tentar remover o candidato que recebeu esse voto (conferir o id no `InspetorEstado`); por fim, com a urna aberta, "Entrar como" Fábio e alterar o voto do júri (Etapa 5), voltar a Carla, toolbar: urna "Não iniciada", e tentar remover o candidato **anterior** de Fábio (agora só em `historicoVotosJuri`) | O primeiro some; o segundo e o terceiro são recusados com `CONFLITO` e a dica "tire da votação"; 0 mudança no `banco` |
| C18 | Campos extras | Festival: adicionar "Elenco", preencher em um item, depois remover o campo | `chave` imutável; o valor aparece no detalhe (Etapa 4); remover pergunta quantos itens têm valor e apaga os valores; com a urna aberta só o rótulo é corrigível |
| C19 | Desqualificar (aberta) | Semana Tech, desqualificar um item com motivo | Pede motivo (≥ 10 caracteres); `desqualificado = true`; some de `/votar`; o registro permanece; `CANDIDATO_DESQUALIFICADO`; "Enviar direto" da Etapa 5 devolve `CANDIDATO_INDISPONIVEL` |
| C20 | Desqualificar (encerrada) | `URNA_ENCERRADA`, desqualificar | Igual a C19 e `congelarResultado` é chamado com `DESQUALIFICACAO` (sem efeito visível até a Etapa 7) |
| C21 | Desqualificar indisponível | `RASCUNHO_PRONTO` | O controle não aparece; o serviço devolve `TRAVADO` |
| C22 | Gerar convites | Semana Tech, gerar 5 com rótulo base "Banca", validade padrão | Diálogo com 5 códigos no formato `XXXX-XXXX`; lista +5 `DISPONIVEL`; `CONVITES_GERADOS` sem códigos; limite 51 recusado |
| C23 | Códigos uma só vez | Fechar o diálogo e reabrir a seção; inspecionar o `banco` | Nenhum código legível em lugar nenhum; só `hashCodigo`; fechar sem copiar nem baixar pergunta antes |
| C24 | CSV | "Baixar CSV" | Arquivo abre acentuado (BOM), separador `;`, cabeçalho `rotulo;codigo;validade`; rótulo começando com `=` sai com apóstrofo; cada download registra `EXPORTACAO_CSV` com `{ arquivo: "convites", quantidade }` e **sem** códigos (C14) |
| C25 | Resgate integrado | Carla gera, copia um código; "Entrar como" Ana; resgata em `/e/semana-tech/convite`; "Entrar como" Carla | Convite vira `USADO` com "Resgatado por Ana Souza" e a data; Ana vira `JURADO`; resumo e lista batem |
| C26 | Revogar | Revogar um `DISPONIVEL` com "gerar substituto"; tentar resgatar o revogado | `REVOGADO`; substituto mostrado uma vez; resgate do revogado dá `CODIGO_REVOGADO`; usado não tem "Revogar" |
| C27 | Convite expirado | Seed `M6ZQ-4KTA` | Estado "Expirado" derivado; resgate dá `CODIGO_EXPIRADO`; contagem no resumo |
| C28 | Júri desligado | Festival (sem convite `USADO`): toolbar, desligar o júri; depois Semana Tech (convites `USADO` de Bruno e Fábio): tentar desligar o júri | Festival: seção Júri em leitura com o motivo; sem convites mostra o estado vazio; Placar zera e trava o peso do júri. Semana Tech: recusado com "Travado: já existe jurado com convite resgatado."; o módulo continua ligado e nada muda no `banco` (D24, E32) |
| C29 | Placar | Festival: 50/30/20 → alterar | Soma ≠ 100 desabilita Salvar com "Faltam/Excede X%"; "Distribuir igualmente" dá 34/33/33; exemplo muda (70/30/0 → B lidera; 100/0/0 → A lidera) |
| C30 | Placar travado | Semana Tech (urna aberta) | Pesos e desempate desabilitados ("exibir votos" removido, rev. 4, E21); banner explica; módulo desligado com motivo |
| C31 | Tema: contraste | Texto igual ao fundo | Badge reprovado com razão e motivo; Salvar bloqueado; primária com 2,5:1 sobre o fundo só **avisa** |
| C32 | Tema: prévia e salvar | Mudar a primária e a fonte; salvar | A prévia muda na hora sem afetar o app; depois de salvar, landing, evento e votação assumem o tema; permitido com a urna aberta; `TEMA_ALTERADO` |
| C33 | Preset e logo | Aplicar o preset "Festival"; enviar logo de 3 MB e depois PNG válido | Preset reproduz o visual do seed; o arquivo grande é recusado; o logo válido aparece na prévia e, depois de salvar, no cabeçalho (sem `blob:` revogado) |
| C34 | Checklist | `RASCUNHO_INCOMPLETO` | Ativar bloqueado; itens 1, 3 e 4 pendentes com links certos; resolver um a um (publicar itens, ajustar a janela, gerar convites) libera o botão |
| C35 | Fluxo completo (uma aba) | `RASCUNHO_PRONTO`: ativar → abrir → "Entrar como" Ana e votar → "Entrar como" Carla → encerrar → concluir | Cada passo audita só uma vez (via `transicoes`); candidatos e pesos travam ao abrir; ao concluir a tela fica em leitura sem navegar; concluir exige digitar o nome |
| C36 | Falha e teclado | Falha no próximo envio `ERRO_INTERNO` e salvar o Geral; percorrer a tela só com teclado | O formulário mantém o rascunho e mostra erro; nada é gravado; todas as seções, diálogos e botões operáveis; foco visível |

---

## 6. Estrutura de arquivos

```
src/app/e/[slug]/admin/(painel)/configuracao/
  page.tsx                          # só compõe <TelaConfiguracao /> (o layout (painel) já tem RotaGuard e AdminShell)

src/components/config/
  TelaConfiguracao.tsx              # resolve ?secao, layout em colunas, provider de "sujo", painel de checklist
  SecaoNav.tsx                      # <nav> com Link; sidebar no desktop, faixa rolável no celular
  BannerTrava.tsx                   # "Urna aberta: candidatos e pesos estão travados."
  DicaTrava.tsx                     # motivo visível ao lado de controle desabilitado
  FormularioSujoProvider.tsx        # contexto de alteração pendente + confirmação ao trocar de seção
  DialogoMotivo.tsx                 # compõe Dialogo (motivo opcional ou obrigatório)
  ChecklistAtivacao.tsx             # painel lateral e versão completa na Operação
  geral/FormGeral.tsx
  candidatos/
    SecaoCandidatos.tsx
    ListaCandidatosAdmin.tsx        # filtro por estado, contador, reordenar
    CartaoCandidatoAdmin.tsx
    PainelCandidato.tsx             # Dialogo controlado por ?editar=<id|novo>
    FormCandidato.tsx
    SeletorImagem.tsx               # arquivo, exemplo ou remover
    CamposExtrasEditor.tsx
    DesqualificarDialog.tsx
  juri/
    SecaoJuri.tsx
    GerarConvitesForm.tsx
    TabelaConvites.tsx
    CodigosGeradosDialog.tsx
    RevogarConviteDialog.tsx
  placar/
    SecaoPlacar.tsx
    EditorPesos.tsx
    BarraPesos.tsx
    ExemploPlacar.tsx
  tema/
    SecaoTema.tsx
    TemaForm.tsx
    SeletorLogo.tsx
    PreviaTema.tsx
    ContrasteBadge.tsx
  operacao/
    SecaoOperacao.tsx
    LinhaDoTempoEstado.tsx

src/dominio/
  travas.ts                         # resolverFaseConfig, resolverTravas, exigirAcao (+ travas.test.ts)
  convites.ts                       # estadoExibidoConvite, resumirConvites
  checklistAtivacao.ts              # avaliarChecklist
  placarExemplo.ts                  # calcularExemploPlacar
  validacoesConfig.ts               # validações puras de 5.3 (+ validacoesConfig.test.ts)
  camposExtras.ts                   # gerarChave, aplicar remoção de valores

src/lib/
  csv.ts                            # montarCsv, baixarCsv (reaproveitado pela Etapa 7)
  fusoHorario.ts                    # FUSOS_SUPORTADOS (ids IANA), localParaInstante, instanteParaLocal; offset via Intl.DateTimeFormat, nunca guardado
  textosTravas.ts                   # motivo(acao) por fase

src/servicos/
  configGeral.ts                    # salvarGeral
  candidatosAdmin.ts                # criar, salvar, publicação, reordenar, remover, desqualificar, campos extras
  convites.ts                       # listar, gerar, renomear, revogar, registrarExportacaoConvites (EXPORTACAO_CSV)
  placarConfig.ts                   # salvarPlacar
  temaConfig.ts                     # salvarTema, listarPresetsTema
  operacao.ts                       # ativarEvento, abrirUrna, encerrarUrna, concluirEvento

src/store/seletores/
  candidatosAdmin.ts                # useCandidatosAdmin()
  checklist.ts                      # useEntradaChecklist() (valores públicos e contagens, nunca hash)

src/mocks/cenarios/
  configuracao.ts                   # 4 cenários, registrados em mocks/cenarios.ts
```

Testes Vitest (rev. 3, D19) ficam ao lado do módulo (`*.test.ts`): `travas.test.ts`, `validacoesConfig.test.ts`, `lib/csv.test.ts`, `lib/fusoHorario.test.ts` (e, se houver tempo, `convites.test.ts`, `checklistAtivacao.test.ts`, `placarExemplo.test.ts`, `camposExtras.test.ts`).

Arquivos de outras etapas **que esta etapa não toca** (se faltar algo, ajusta-se aqui, não lá): `lib/contraste.ts`, `lib/tema.ts`, `lib/tempo.ts`, `lib/codigos.ts`, `dominio/placar.ts`, `store/transicoes.ts`, `AdminShell`, `RotaGuard`. As únicas exceções são os registros de cenário (`mocks/cenarios.ts` importa o arquivo novo), o ajuste mínimo em `alternarModulo` da toolbar para respeitar a trava do módulo júri (D24) e, se o CP1 achar divergência, a errata mínima declarada na seção 10.

---

## 7. Checkpoints

Regras de entrega, convenções de código e dependências aprovadas são as da seção 3.3 da Etapa 0 e **não se repetem**. Cada checkpoint termina com a tela rodando, `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` sem erros (rev. 3, D19), e só avança depois da validação. A ordem minimiza retrabalho: travas e casca primeiro (tudo depende delas), a seção simples que define o padrão de formulário, a mais complexa (Candidatos) com tempo, e a Operação por último porque consome todas as outras.

---

### CP1 — Conferência, contratos, travas, cenários e casca

**Objetivo:** a rota existe, navega entre as seis seções, respeita papel e fase, e as regras de trava e os cenários de estado já existem e estão conferidos.

**Tarefas**
- [ ] **Conferir o contrato da seção 3.1 contra o código** e ajustar **aqui** o que divergir (nunca criando nome novo). Em especial:
  - assinatura de `registrarAuditoria` e o tipo de `acao`: acrescentar as seis ações da seção 5.8;
  - `transicoes.encerrarUrna`: `OrigemEncerramento` traz `MANUAL` (usado pela Operação), `AUTOMATICO`, `TOOLBAR` e `FALHA_SIMULADA` (Etapa 0 rev. 2); conferir;
  - `congelarResultado`: aceitar o motivo (`MotivoResultado`) e continuar sendo stub; se a assinatura não aceitar, ajustar o stub;
  - `forcarEstadoEvento` e `forcarEstadoUrna` usáveis como funções puras dentro dos cenários;
  - `DialogoConfirmacao` com confirmação por digitação; `Dialogo` como `<dialog>` nativo sem portal;
  - `TemaEvento` aceitando `tema` por prop; `LogoEvento` e `ImagemCandidato` aceitando `blob:`;
  - formato de `FONTES_APROVADAS`; `useConsulta` (recarrega quando a consulta muda? senão, `recarregar()` explícito);
  - `servicos/mensagens.ts` com texto para `TRAVADO`, `CONFLITO`, `EVENTO_CONCLUIDO`, `URNA_NAO_ABERTA`, `URNA_ENCERRADA`, `VALIDACAO`, `NAO_ENCONTRADO`;
  - limites de título e descrição (seção 5.3) contra os seeds: se algum seed passar do limite, ajustar o limite e registrar.
- [ ] `dominio/travas.ts` (`resolverFaseConfig`, `resolverTravas`, `exigirAcao`) com **toda** a matriz da seção 5.1, e `lib/textosTravas.ts`. Cobrir cada célula da matriz (inclusive `MODULO_JURI_DESLIGAR` com e sem convite `USADO`, D24) em `dominio/travas.test.ts` (Vitest, D19 da Etapa 0 rev. 3).
- [ ] Ajuste mínimo em `alternarModulo` (toolbar, Etapa 0): desligar o júri consulta `exigirAcao(…, "MODULO_JURI_DESLIGAR")` e recusa com o motivo quando há convite `USADO` (D24); registrar como errata (P15).
- [ ] Os quatro cenários da seção 5.9 em `src/mocks/cenarios/configuracao.ts`, registrados em `mocks/cenarios.ts`. Aplicar cada um nos **dois eventos** e confirmar `verificarInvariantes` vazia.
- [ ] Rota `configuracao/page.tsx` e `TelaConfiguracao` (resolve `?secao=`, valor inválido vira `geral` por `replace`), `SecaoNav` (sidebar e faixa rolável), `BannerTrava`, `DicaTrava`, `FormularioSujoProvider` (com a confirmação ao trocar de seção) e `DialogoMotivo`.
- [ ] Seis seções com placeholder que **já leem as travas** (mostram o banner e o modo leitura corretos); `ChecklistAtivacao` apenas como esqueleto (as regras entram no CP8).
- [ ] Modo leitura para `CONCLUIDO` (`fieldset disabled` + `Alerta`) e o aviso de combinação incoerente.
- [ ] Layout em 360 px e 1280 px.

**Fica fake:** nada novo (só leitura e navegação).

**Pronto quando**
- [ ] Carla entra; Ana, Hugo e deslogado respeitam o `RotaGuard` do layout `(painel)` (C1).
- [ ] As seis seções abrem e a URL reflete a seção (C2).
- [ ] O banner e o modo leitura aparecem conforme a fase, inclusive nas combinações incoerentes (C3, C4).
- [ ] `travas.ts` cobre toda a matriz, e nenhum componente compara `estadoUrna` por conta própria.
- [ ] Os quatro cenários deixam `verificarInvariantes` vazia nos dois eventos.

**Entrega:** `VaiVota-E6-CP1.zip`

---

### CP2 — Geral

**Objetivo:** primeira seção real, que define o padrão de formulário que as outras vão repetir.

**Tarefas**
- [ ] `lib/fusoHorario.ts` (`FUSOS_SUPORTADOS` com os ids IANA de D15, `localParaInstante`, `instanteParaLocal`; deslocamento por `Intl.DateTimeFormat`, nunca guardado) e `dominio/validacoesConfig.ts` (parte do Geral), com `lib/fusoHorario.test.ts` e `dominio/validacoesConfig.test.ts` (D19).
- [ ] Padrão de formulário (D5): rascunho em `useState` inicializado pelo valor salvo; remontagem por `key`; **Salvar** desabilitado sem alteração, **Descartar**, erro inline, resumo de erros em `LiveRegion`; flag "sujo" escrita só em manipulador de evento.
- [ ] `FormGeral`: nome, slug (com prévia `/e/{slug}`), descrição, início e fim (`datetime-local`, interpretados no fuso escolhido), fuso e "Encerrar automaticamente ao fim da janela" (com a explicação da D7 da Etapa 0); **sem** método de identificação (por seed, C6). Cada campo trava conforme a matriz, com `DicaTrava`.
- [ ] `servicos/configGeral.ts` (`salvarGeral`), com `exigirAcao` por campo alterado, validação antes de mutar e **um** `atualizar`; atualiza `dev.slugPadrao` quando o evento padrão troca de slug (A9); audita `CONFIG_ALTERADA`.
- [ ] Fluxo "Auditado" e "Estender" (urna aberta): `DialogoMotivo` antes de salvar o fim da janela ou o encerramento automático.
- [ ] Depois de salvar, `router.replace` para a nova URL quando o slug mudou; toast "Salvo".
- [ ] Estados: vazio, com erro, salvo, travado, somente leitura, falha de serviço (o rascunho permanece).

**Fica fake:** nenhum salvamento persiste após o F5; a falha vem da toolbar.

**Pronto quando**
- [ ] C5 a C11 passam: validações, salvar refletindo nome em landing, evento e cabeçalho, slug renomeado em rascunho, slug travado a partir de `ATIVO`, pergunta ao trocar de seção, estender o fim com motivo, "Tempo esgotado" resolvido pela extensão.
- [ ] Falha simulada (`ERRO_INTERNO`) mantém o rascunho e não grava nada (C36, parte).
- [ ] `verificarInvariantes` vazia depois de cada salvamento.

**Entrega:** `VaiVota-E6-CP2.zip`

---

### CP3 — Candidatos: lista

**Objetivo:** ver e organizar os itens antes de editar um.

**Tarefas**
- [ ] `store/seletores/candidatosAdmin.ts` (`useCandidatosAdmin()`): todos os candidatos do evento ativo, ordenados por `ordem` (desempate por `id`), com os campos extras do evento. Referência estável (memoizada no hook, D11 da Etapa 0).
- [ ] `ListaCandidatosAdmin` e `CartaoCandidatoAdmin`: `ImagemCandidato`, título, estado em texto neutro ("Na votação", "Rascunho", "Fora da disputa", com ícone), ações **Colocar na votação**/**Tirar da votação**, subir/descer e "Editar". Desqualificado aparece **riscado** e identificado em texto.
- [ ] Filtro por estado; contador "Na votação: N (mínimo 2 para ativar)" ligado ao item 1 do checklist.
- [ ] `servicos/candidatosAdmin.ts`: `alterarPublicacao` (colocar na votação sem imagem → `VALIDACAO`, D12) e `reordenarCandidato`.
- [ ] Aplicar as travas: com a urna aberta, "Adicionar" e as ações de publicação ficam desabilitados com o motivo (tooltip **e** texto); reordenar segue livre.
- [ ] Estado vazio com a chamada para adicionar o primeiro; lista longa (`MUITOS_CANDIDATOS`) e item sem imagem (rascunho `cand-st-09` do seed, com o aviso "Sem imagem: obrigatória para colocar na votação"; esta lista é onde o "cartão sem imagem" passa a ser conferido, C5).

**Fica fake:** nada persiste; a ordem do admin não afeta a ordem embaralhada da votação.

**Pronto quando**
- [ ] C12, C13 e C14 passam.
- [ ] Colocar ou tirar da votação muda a lista pública (Etapa 4) e o contador; colocar `cand-st-09` (sem imagem) na votação é recusado com `VALIDACAO`.
- [ ] Nenhum texto usa "Novo", "Publicado" nem "Desqualificado" como etiqueta.

**Entrega:** `VaiVota-E6-CP3.zip`

---

### CP4 — Candidatos: formulário, campos extras, remoção e desqualificação

**Objetivo:** criar e editar um candidato completo e gerir os campos extras do evento.

**Tarefas**
- [ ] `PainelCandidato` (`Dialogo` controlado por `?secao=candidatos&editar=<id|novo>`, aberto e fechado por `router.replace`, `{ scroll: false }`; fechar com alteração pendente pergunta antes).
- [ ] `FormCandidato`: título, descrição, imagem (`SeletorImagem`: arquivo, exemplo `placeholder:1..8` ou remover), valores dos campos extras. Aviso "Sem imagem: obrigatória para colocar na votação" (D12): rascunho salva sem imagem; candidato já na votação não salva sem imagem (`VALIDACAO`) e "remover imagem" fica indisponível nele. Validação de tipo e de 2 MB. `blob:` criado só no manipulador; o descartado é revogado, o salvo **nunca** (D12).
- [ ] `CamposExtrasEditor` e `dominio/camposExtras.ts`: criar (com `chave` gerada e imutável), renomear rótulo, reordenar, remover com confirmação que informa quantos itens têm valor e apaga os valores na mesma operação; teto de 6.
- [ ] `criarCandidato`, `salvarCandidato`, `removerCandidato` (recusa com `CONFLITO` se houver voto ou se o candidato aparecer em `historicoVotosJuri`, anterior ou novo; rev. 3, D9) e `salvarCamposExtras` em `servicos/candidatosAdmin.ts`. Com a urna aberta ou encerrada, corrigir texto e imagem pede confirmação e audita `CANDIDATO_CORRIGIDO`.
- [ ] `DesqualificarDialog`: `DialogoMotivo` com **motivo obrigatório (≥ 10 caracteres)**, texto de consequência ("Os votos já recebidos permanecem registrados, mas deixam de contar na pontuação. O resultado será refeito em nova versão."; regra C3, texto final **[Usuário]**) e `desqualificarCandidato`, que chama `congelarResultado(…, "DESQUALIFICACAO")` quando a urna está encerrada. Indisponível com a urna não aberta.
- [ ] Estados: novo, edição, erro de validação, imagem inválida, travado, desqualificado.

**Fica fake:** o upload é um `blob:` local, perdido no F5; `congelarResultado` é stub até a Etapa 7.

**Pronto quando**
- [ ] C15 a C21 passam.
- [ ] Criar um item com imagem e colocá-lo na votação o faz aparecer na votação; sem imagem ele só fica como rascunho (C15); os campos extras aparecem no detalhe (Etapa 4).
- [ ] Desqualificar tira da votação, registra `CANDIDATO_DESQUALIFICADO` e **não apaga** o registro nem os votos; com a urna encerrada chama `congelarResultado` com o motivo.
- [ ] Remover um item com voto, ou presente em `historicoVotosJuri`, é recusado e nada muda no `banco`.

**Entrega:** `VaiVota-E6-CP4.zip`

---

### CP5 — Júri: convites

**Objetivo:** fluxo completo de convites de jurado, como definido em `Jurado.md`.

**Tarefas**
- [ ] `lib/csv.ts` (`montarCsv`, `baixarCsv`): BOM, `;`, CRLF, aspas escapadas, neutralização de fórmulas (D23). `baixarCsv` cria o link temporário **em manipulador de evento**, usa `Blob` e revoga a URL depois. Testes em `lib/csv.test.ts` (BOM, `;`, CRLF, aspas, neutralização; D19).
- [ ] `dominio/convites.ts` (`estadoExibidoConvite`, `resumirConvites`).
- [ ] `servicos/convites.ts`: `listarConvites` (`ConviteListado`, sem hash e com o nome de quem resgatou), `gerarConvites`, `renomearConvite`, `revogarConvite`, com unicidade de hash por evento, e `registrarExportacaoConvites` (audita `EXPORTACAO_CSV` com `{ arquivo: "convites", quantidade }` a cada "Baixar CSV", C14).
- [ ] `SecaoJuri`, `GerarConvitesForm` (quantidade 1–50, rótulo base opcional, validade padrão = `janelaFim`, opcional), `CodigosGeradosDialog` (mostrar uma vez, copiar com fallback, baixar CSV, confirmação ao fechar sem copiar), `TabelaConvites` (rótulo editável, estado com ícone e texto, validade, "Resgatado por/em", filtro por estado, lista de cartões no celular) e `RevogarConviteDialog` (com "gerar substituto").
- [ ] Resumo no topo (disponíveis, usados, revogados, expirados) por `resumirConvites`.
- [ ] Módulo júri desligado: leitura, ações desabilitadas com o motivo, estado vazio explicativo quando não há convites.
- [ ] Integração com a Etapa 3: o código gerado funciona em `/e/[slug]/convite` e o convite vira `USADO` com nome e data.

**Fica fake:** códigos gerados no navegador, `hashMock` como hash, CSV gerado de verdade pelo navegador.

**Pronto quando**
- [ ] C22 a C28 passam.
- [ ] Nenhum código legível aparece no `banco`, no `InspetorEstado`, no console nem na auditoria.
- [ ] O CSV baixado abre acentuado e com o separador esperado, e cada download aparece na auditoria como `EXPORTACAO_CSV` sem códigos.
- [ ] Com convite `USADO` (Semana Tech), desligar o júri pela toolbar é recusado com o motivo (D24).
- [ ] Os números do resumo batem com os da futura aba Operação, porque usam as mesmas funções.

**Entrega:** `VaiVota-E6-CP5.zip`

---

### CP6 — Placar

**Objetivo:** configurar a fórmula de apuração com validação clara.

**Tarefas**
- [ ] `dominio/placarExemplo.ts` (`calcularExemploPlacar`) conferido contra os valores da seção 5.5.
- [ ] `EditorPesos`: slider sincronizado com campo numérico por módulo ligado; módulo desligado em 0, desabilitado e com o motivo ("módulo desligado"); `BarraPesos` com rótulos nos segmentos.
- [ ] Indicador de soma ao vivo (`LiveRegion`), "Distribuir igualmente" e presets por número de módulos ligados.
- [ ] Desempate (`JURI` ou `PUBLICO`) com o aviso de júri desligado. (Sem "Exibir votos do júri no telão": removido, rev. 4, E21.)
- [ ] `ExemploPlacar`: tabela de votos fixos e pontuações calculadas ao vivo com os pesos do rascunho.
- [ ] `servicos/placarConfig.ts` (`salvarPlacar`), com `exigirAcao`, validação (soma 100, desligado em 0) e `CONFIG_ALTERADA`.
- [ ] Trava total com a urna aberta (`BannerTrava` e motivo visível).

**Fica fake:** o exemplo usa votos fixos, nunca votos reais; a ordem do ranking real é da Etapa 7.

**Pronto quando**
- [ ] C29 e C30 passam.
- [ ] Desligar o júri na toolbar zera e trava o peso correspondente; ligar o infantil deixa o peso em 0 até o admin ajustar.
- [ ] Não é possível salvar com soma diferente de 100.
- [ ] Salvar pesos fica disponível para a Etapa 7 e a Etapa 8 (`ConfigPlacar`); a ordem no dashboard e no telão se valida nelas.

**Entrega:** `VaiVota-E6-CP6.zip`

---

### CP7 — Tema, contraste e pré-visualização

**Objetivo:** mostrar o white-label funcionando de ponta a ponta.

**Tarefas**
- [ ] `TemaForm`: nome de exibição, `SeletorLogo` (arquivo, exemplo ou remover; tipo e 2 MB; `blob:` como na D12), quatro cores (`<input type="color">`), fonte (`FONTES_APROVADAS`, lista editável pelo dono do produto, E2) e rótulos no singular e no plural.
- [ ] `ContrasteBadge` por par da seção 5.6 (razão, veredito em texto e ícone). Salvar **bloqueado** enquanto um par bloqueante reprovar, com a lista de pares que falharam; pares de aviso (< 3:1) só avisam.
- [ ] `PreviaTema` com abas Login, Votação e Telão (simplificada), em `TemaEvento` com o tema do **rascunho**, `inert`, `aria-label` e sem tocar no tema real.
- [ ] `servicos/temaConfig.ts`: `listarPresetsTema` (lê o seed) e `salvarTema`, com `TEMA_ALTERADO`. Presets "Semana Tech" e "Festival" entram no **rascunho** (paleta e fonte).
- [ ] Depois de salvar, o tema vale para landing, evento, votação e telão; livre com a urna aberta.
- [ ] Estados: contraste ok, reprovado, logo ausente, rótulo vazio, imagem inválida.

**Fica fake:** o logo é um `blob:` local; a aba Telão é uma amostra, não a cena real.

**Pronto quando**
- [ ] C31, C32 e C33 passam.
- [ ] Mudar a cor primária atualiza a prévia na hora, sem afetar a tela real antes de salvar.
- [ ] Combinação com texto reprovado não pode ser salva e explica o motivo.
- [ ] O preset do Festival reproduz o visual do seed, com as exceções da D15 da Etapa 0.

**Entrega:** `VaiVota-E6-CP7.zip`

---

### CP8 — Operação, checklist de ativação e fechamento do ciclo

**Objetivo:** o painel que conduz o evento de Rascunho até Concluído, usando tudo o que foi feito antes.

**Tarefas**
- [ ] `dominio/checklistAtivacao.ts` (`avaliarChecklist`) e `store/seletores/checklist.ts` (valores públicos e **contagens**: convites utilizáveis, dispositivos `ATIVO`; nunca hash).
- [ ] Completar `ChecklistAtivacao` (painel lateral em todas as seções e versão completa na Operação), com ícone e texto por item, severidade (bloqueia ou aviso) e link para a seção que resolve.
- [ ] `servicos/operacao.ts`: `ativarEvento` e `abrirUrna` (revalidam o checklist com a mesma função pura), `encerrarUrna`, `concluirEvento` (nome conferido). Cada um chama `store/transicoes.ts` e **não audita de novo** (E6-6).
- [ ] `SecaoOperacao` e `LinhaDoTempoEstado`: as duas trilhas com `aria-current="step"` e a ação disponível por fase (tabela de 5.7), cada uma com `DialogoConfirmacao`:
  - Ativar: consequência em texto claro;
  - Abrir: avisa das travas; aviso se agora < início da janela;
  - Encerrar: confirmação mais forte, efeito imediato, **sem número de votos**;
  - Concluir: digitar o nome do evento.
- [ ] Depois de concluir, a tela fica em leitura e mostra `Alerta` com `Link` para o painel (sem navegar).
- [ ] Combinação incoerente: ações desabilitadas e explicação (D20).
- [ ] **Revisão da etapa:** percorrer todas as seções verificando travas, mensagens de erro, foco e teclado.

**Fica fake:** o "servidor" roda no cliente; `congelarResultado` ainda é stub (a Etapa 7 gera a versão 1 do resultado).

**Pronto quando**
- [ ] C34 e C35 passam: com o `RASCUNHO_INCOMPLETO` o botão de ativar fica bloqueado e cada pendência leva à seção certa; o fluxo completo (preencher pendências → ativar → abrir → votar na mesma aba → encerrar → concluir) funciona em **uma aba**.
- [ ] Depois de abrir a urna, candidatos, pesos e slug ficam travados em toda a tela; depois de concluir, a tela inteira fica em leitura.
- [ ] Cada transição aparece **uma única vez** na auditoria (conferir no `InspetorEstado`).

**Entrega:** `VaiVota-E6-CP8.zip`

---

### CP9 — Revisão e fechamento

**Objetivo:** fechar a etapa com evidência.

**Tarefas**
- [ ] Percorrer **C1 a C36** nos dois temas e em 360, 390, 768 e 1280 px, sem rolagem horizontal.
- [ ] Acessibilidade: um `h1`, foco no título a cada troca de seção, `aria-live` nas mensagens, `aria-busy` ao salvar, foco visível, alvos de 44 px, contraste ≥ 4,5:1 em alertas, selos, barra de pesos e badges, `prefers-reduced-motion`, estado nunca só por cor.
- [ ] Revisar os textos em português (tom e ausência de concordância de gênero com o rótulo do tema) e listar os que dependem de aprovação (**[Usuário]**, revisão única de textos E30).
- [ ] `grep`: nenhum hex de marca nem classe de paleta nos componentes novos (os presets saem do seed por serviço).
- [ ] `grep`: nenhum `<a href>` para rota interna (o único `<a>` permitido é o de download do CSV, criado em manipulador); nenhum `Math.random`; nenhum `Date.now`.
- [ ] `grep`: nenhum acesso a `votos`, `votosJuri`, `historicoVotosJuri`, `votosInfantis` ou `resultados` em `src/components/**` e `src/app/**`; nenhum import de `@/mocks` em componentes.
- [ ] `grep`: nenhuma comparação de `estadoUrna` ou `estado` em componentes desta etapa para decidir trava (só `travas.nivel`).
- [ ] `grep`: nenhum texto de interface com "candidato" ou "candidatos" fixo (usar os rótulos do tema).
- [ ] `grep`: o código legível de convite só aparece em `servicos/convites.ts` (geração), em `CodigosGeradosDialog` e em `lib/csv.ts` (saída do arquivo).
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` sem erros e sem avisos de hidratação.
- [ ] Atualizar o Contexto (seções 2, 4.1, 4.4, 4.7, 7.1 e 10) e a seção 3.2 com o que mudou em relação ao entregue.

| Grupo \ Tema | Semana Tech | Festival |
|---|---|---|
| Casca, acesso e travas (C1 a C4) | ☐ | ☐ |
| Geral (C5 a C11) | ☐ | ☐ |
| Candidatos (C12 a C21) | ☐ | ☐ |
| Júri e convites (C22 a C28) | ☐ | ☐ |
| Placar (C29, C30) | ☐ | ☐ |
| Tema (C31 a C33) | ☐ | ☐ |
| Checklist, Operação e falhas (C34 a C36) | ☐ | ☐ |

**Pronto quando:** a matriz está inteira marcada e a seção 9 atendida.

**Entrega:** `VaiVota-E6-CP9.zip` (final da Etapa 6)

---

## 8. O que fica fake

| Item | Tratamento |
|---|---|
| Persistência | Nenhuma; o F5 e qualquer nova aba voltam ao seed (D18 da Etapa 0) |
| "Servidor" | Os serviços rodam no cliente; na trilha de produção (Prisma + Supabase PostgreSQL; rev. 4, A2/A3/A4) as mesmas validações e travas vão para o servidor, com transação |
| Salvar qualquer seção | Atualiza o store, mostra o toast "Salvo" e audita conforme 5.8 |
| Upload de logo e de imagem | `URL.createObjectURL` ou exemplo (`placeholder:<n>`); tipo e tamanho validados no cliente; perdido no F5 |
| Códigos de convite | Gerados no navegador; o "hash" é `hashMock` (não criptográfico); só o hash é guardado |
| CSV de convites | **Gerado de verdade** pelo navegador, para validar o formato |
| Cópia para a área de transferência | Real quando o navegador permite; com fallback manual |
| Abrir, encerrar e concluir | Mudam o estado no store e refletem em todas as telas; o resultado congelado é stub até a Etapa 7 |
| Desqualificar após encerrar | Chama o ponto de extensão `congelarResultado`; o efeito só é validável na Etapa 7 |
| Presets de tema | Lidos do seed por serviço |
| Autosave, concorrência e edição simultânea | Não existem (D18 da Etapa 0) |
| `bloquearVotoProprio`, privacidade, `capaUrl`, `textosEstado`, módulos, infantil, apresentação | Por seed ou pela toolbar, sem tela (infantil e dispositivos: planner "Totem", rev. 4, A7) |
| Totem e trailer no checklist | Derivados do seed; avisos, nunca bloqueios; trailer único por link/embed, sem vídeo armazenado (E21) |

## 9. Critérios de aceitação

- [ ] As seis seções do MVP estão implementadas e navegáveis, em celular (360 px) e desktop (1280 px), nos dois temas.
- [ ] Nenhuma ação persiste após o F5 e não há chamada a banco ou API externa.
- [ ] **Toda** regra de trava vem de `dominio/travas.ts`, bate com a matriz da seção 5.1, e os serviços recusam o que a UI esconde.
- [ ] As edições se refletem nas demais telas: nome, tema, candidatos, convites, pesos e estado da urna.
- [ ] Contraste do tema é validado: texto reprovado impede salvar; primária e secundária baixas só avisam.
- [ ] Convites gerados funcionam no resgate da Etapa 3; revogado e expirado são recusados; os códigos aparecem **uma única vez** e nunca ficam no `banco`.
- [ ] Remover candidato com voto (inclusive em `historicoVotosJuri`) é recusado; colocar na votação sem imagem é recusado; desqualificar exige motivo, mantém o registro e os votos e chama `congelarResultado` com o motivo quando a urna está encerrada.
- [ ] Pesos só salvam com soma 100 nos módulos ligados; módulo desligado vale 0; com a urna aberta nada do Placar é editável; não existe opção de exibir votos do júri no telão (rev. 4, E21).
- [ ] A ativação respeita o checklist; abrir a urna aplica as travas; encerrar e concluir pedem a confirmação certa; **cada transição é auditada uma só vez**.
- [ ] Ações sensíveis têm confirmação e auditoria; nenhum `detalhes` contém código de convite.
- [ ] Combinações incoerentes forçadas pela toolbar seguem a precedência `CONCLUIDO` > `RASCUNHO` > urna e são explicadas na tela.
- [ ] Nenhum texto concorda em gênero com o rótulo do tema; foco visível, teclado completo, `prefers-reduced-motion` respeitado e estado nunca só por cor.
- [ ] Console sem erros nem avisos de hidratação; `verificarInvariantes` vazia depois de cada ação.

## 10. Pendências

- **P1 — Fontes aprovadas:** **Resolvida (rev. 4, E2):** a troca de fonte no Tema continua; `FONTES_APROVADAS` é uma configuração que o dono do produto personaliza depois (comentário em `lib/fontes.ts`: "lista editável pelo dono do produto").
- **P2 — Pesos depois de abrir a urna (A2, F1):** **Resolvida (rev. 3, C4):** trava total no MVP (D4); "alteração auditada" fica como evolução e as fontes base (`Jurado.md` §12, `VotoInfantil.md` §12) serão atualizadas (F-2).
- **P3 — Grupo ligado sem votos (A3) e base de normalização com candidato desqualificado (A4):** **Resolvida (rev. 3, C3):** desqualificado fora da base de normalização e na contagem bruta; peso de grupo ligado com base 0 redistribuído proporcionalmente entre os grupos com base > 0 (todas as pontuações 0 se nenhum tiver votos); o diálogo de desqualificação pode citar a regra (D14, 5.5).
- **P4 — Formato do CSV de convites:** **Resolvida (rev. 3, E16):** confirmado UTF-8 com BOM, `;`, CRLF e cabeçalho `rotulo;codigo;validade`.
- **P5 — Teto por lote e validade padrão dos convites:** **Resolvida (rev. 3, E14):** confirmado 50 por lote e validade padrão igual ao fim da janela.
- **P6 — Desempate `JURI` com o júri desligado:** a Etapa 6 só avisa; o fallback é regra da **Etapa 7**. **[Mescla]**
- **P7 — "Ativar evento" e "Abrir urna" como duas ações:** **Resolvida (rev. 3, E11):** confirmado, ficam separadas (RASCUNHO → ATIVO e depois NAO_INICIADA → ABERTA).
- **P8 — Limites de campos e imagem obrigatória:** **Resolvida (rev. 3, C5):** limites mantidos (título 150, descrição 1500, valor de campo extra 200); imagem obrigatória para colocar ou manter na votação e opcional em rascunho (D12; DD §7.6 a atualizar, F-3).
- **P9 — Desqualificação irreversível:** **Resolvida (rev. 3, E12):** confirmado, sem "reabilitar" no MVP.
- **P10 — Slug travado a partir de `ATIVO` (A6):** **Resolvida (rev. 3, E15):** confirmado; só os cenários de rascunho permitem renomear.
- **P11 — Método de identificação na seção Geral:** **Resolvida (rev. 3, C6):** sai da tela Geral e fica por seed; os cenários `SOMENTE_GOOGLE` e `SOMENTE_EMAIL` (Etapa 3) continuam.
- **P12 — `bloquearVotoProprio` e `prazoAnonimizacaoDias` sem tela:** **Resolvida (rev. 3, E5 e E29):** confirmado por seed: voto próprio bloqueado (E5) e anonimização em 90 dias (E29); o texto do aviso de privacidade continua **[Usuário]**. Rev. 4 (E29): controladora dos dados é a VaiVota; o aviso é da plataforma (texto único, link no registro e no rodapé) e `avisoPrivacidadeUrl` do evento é opcional e complementar.
- **P13 — Revogar convite já usado:** **Resolvida (rev. 3, E13):** confirmado, não se revoga convite usado e não existe "retirar jurado" no MVP.
- **P14 — Cópia em HTTP na rede local:** `navigator.clipboard` pode não existir; há fallback manual. Confirmar o ambiente da demonstração.
- **P15 — Errata mínima na Etapa 0:** **incorporada na Etapa 0 rev. 2 (Anexo C)**: (a) `AcaoAuditoria` com as seis novas ações; (b) `OrigemEncerramento` com `MANUAL`; (c) `congelarResultado(estado, eventoId, motivo, opcoes?)`; (d) `TemaEvento` com `tema` por prop, `LogoEvento` e `ImagemCandidato` aceitando `blob:`. O CP1 conferiu; só se divergir, ajusta e registra no Contexto. Na rev. 3 entra mais um ajuste mínimo: (e) `alternarModulo` da toolbar respeita a trava do módulo júri com convite `USADO` (D24, E32). **[Mescla]**
- **P16 — Mídia real (trilha de produção; rev. 4, A2/A3):** o `blob:` some no F5; armazenamento de imagens, tipos permitidos e limite definitivo ficam para a trilha de produção (planner "Trilha de Produção", a escrever). Vídeo nunca é armazenado (E21).
- **P17 — Navegação depois de "Concluir":** **Resolvida (rev. 3, E26):** confirmado, Concluir não redireciona; a tela fica em leitura, com atalho para o painel.
- **P18 — Limites da pergunta "descartar alterações":** só cobre a navegação interna da tela (D2); voltar do navegador e os links do `AdminShell` não são interceptados.
- **P19 — Leitura da auditoria:** sem tela nesta etapa; a Etapa 7 mostra o resumo e a exportação. Até lá, o registro se confere pelo `InspetorEstado`.
- **P20 — Textos finais** das confirmações, dos avisos e das dicas de trava. **[Usuário]** (revisão única de textos com a organização, E30).
