# VaiVota — Fase 1 · Etapa 8: Apresentação (Telão)

> **Rotas:** `/e/[slug]/admin/apresentar` (fora do grupo `(painel)`, sem `AdminShell`; `RotaGuard(ADMIN)` próprio)
> **Depende de:** Etapa 0 (store, relógio, `transicoes`, `registrarAuditoria`, `useConsulta`, tema, `Dialogo`/`DialogoConfirmacao`, `ContagemRegressiva`, `ImagemCandidato`, `LogoEvento`, `RotaGuard`, `LiveRegion`, cenários, toolbar), Etapa 1 (`resolverSituacaoEvento`: `RETA_FINAL`, `TEMPO_ESGOTADO`, `ABERTURA_PENDENTE`), Etapa 6 (`resolverFaseConfig`, `ConfigPlacar`, tema) e Etapa 7 (`apurar`, `obterResultado`, `contarVotos`, versões do resultado, gerador de volume, cenários `RESULTADO_*`, catálogo de auditoria). As Etapas 2 a 5 entram só de forma indireta (textos neutros, candidatos votáveis, votos reais que aparecem no total ao vivo)
> **Alimenta:** Etapa 9 (matriz AP1–AP45, cenários, ações de auditoria, lista de errata e pendências do palco)
> **Fontes:** `ModoApresentacao.md` (seções 1 a 11), `Jurado.md` (seções 7 e 10: fórmula e desempate; votos identificados não vão ao telão, rev. 4), `Dashboard.md` (resultado como fonte única), `VotoInfantil.md` (seção 9), `schema.prisma` (`ConfigApresentacao`, `ConfigPlacar`, `ResultadoOficial`), `Etapa8 Apresentacao.md` antigo, Etapa 7 final (D1 a D20, seções 5.2 e 5.7) e Contexto (itens E8-1 a E8-18, T8, T13, T14, T17, T18, F2, F3, F5, F6, F10, A8, A13 a A16 e A18) e `DocumentDesign.md` v1.1 (raiz do repositório; §8.1 a §8.4 para fórmula, desempate, resultado congelado e padrões de apresentação).
> **Status:** versão final consolidada. Substitui `Etapa8 Apresentacao.md`. **Revisão 3 (07/10/2026):** aplica as decisões do documento de pendências (itens B1, C3, C19, D14, D15, D16, D19, E18, E19, E20, E21, E22, E23, E24, E25, E30). **Revisão 4 (07/10/2026):** E21 (sai `exibirVotosJuriNoTelao` e o passo de votos do júri: categorias mostram só o vencedor; AP30 removido; demais durações mantidas), trailer único do evento por link/embed (nunca se armazena vídeo), E22 (continua pendente), A2/A3/A4 ("Fase 3"/"fase com banco" → trilha de produção, Prisma + Supabase).

---

## 1. Objetivo

Entregar a **tela de apresentação do admin** em `/e/[slug]/admin/apresentar`: uma **sala de controle** (preparar e escolher entre apresentação real e ensaio) e o **palco** em tela cheia, que acompanha a urna (pré-votação, votação ao vivo com QR Code e temporizador, encerrada), conduz a **revelação** (trailer, categorias, pódio, empates, classificação opcional) e termina no **resultado final estático**. É a tela mais complexa da Fase 1, por isso a etapa separa três camadas:

- **Apuração** (`apurar`, da Etapa 7): função pura, **não é reimplementada aqui**.
- **Roteiro e motor da revelação** (`montarRoteiro`, `reduzirMotor`): funções puras em `dominio/apresentacao/`, sem JSX e sem relógio.
- **Cenas** (componentes): só desenham o que o motor manda e nunca calculam nada.

Esta etapa precisa garantir:
- **Uma só fonte do resultado.** O palco real lê a **maior `versao`** pelo `obterResultado` da Etapa 7, nunca recalcula e nunca grava resultado. O ensaio usa **o mesmo `apurar`** (por meio dos cenários da Etapa 7) sobre uma **cópia descartável** do estado.
- **Sigilo da cerimônia.** Antes de a revelação começar, nenhum dado de resultado chega à tela (nem à sala de controle, que pode estar espelhada): a sala só sabe se existe resultado e qual é a sua assinatura. Cenas futuras **nem entram no DOM**.
- **O ensaio não toca no estado real.** `banco`, `resultados`, `ui.apresentacao`, relógio e urna ficam idênticos antes e depois, e o selo **ENSAIO** nunca some.
- **Toda combinação de evento e urna tem um palco coerente** (rascunho, ativo, concluído, urna em qualquer estado, combinações incoerentes forçadas pela toolbar), seguindo a precedência da Etapa 1 (`CONCLUIDO` > `RASCUNHO` > urna).
- **Nova versão do resultado invalida a revelação.** Se o resultado mudar depois da cerimônia (desqualificação, cenário, urna refeita), o palco não mostra mais o resultado antigo como final.
- **Depois de carregado o resultado (uma vez, ao iniciar ou reabrir), a cerimônia nunca espera por serviço.** Latência, erro de rede e falha de auditoria não travam o avanço das cenas.
- **Legível a distância e acessível:** canvas lógico 1920×1080 escalado, texto mínimo no canvas, `prefers-reduced-motion`, informação nunca só por cor ou animação, nenhum texto que concorde em gênero com o rótulo do tema (D10 da Etapa 2) e **nenhum e-mail** em qualquer tela.
- **Regras do React Compiler** respeitadas em todo temporizador e animação (seção 5.5).

## 2. Escopo

**Dentro**
- Rota, guarda e **sala de controle**: estado e fase de abertura, aviso de espelhamento e de instância única, escolha **Apresentação real / Ensaio**, cenário do ensaio, modo de avanço, roteiro público (só nomes), pré-carregamento de mídia, atalhos, continuar ou refazer a revelação, botão **Apresentar**.
- **Palco** 16:9 em tela cheia, sem elementos de interface, com atalhos de teclado e HUD que aparece ao mover o mouse.
- **Fases** do palco para todas as combinações de evento e urna (seção 5.1), com QR Code, temporizador pela hora simulada, total geral, mensagens de abertura e de reta final, e "Tempo esgotado".
- **Trailer:** um único trailer **do evento**, por link/embed (YouTube/Vimeo), com fallback gerado, tempo limite e "pular". Nunca se armazena vídeo (rev. 4, E21).
- **Revelação:** categorias (com co-vencedores; **só o vencedor**, nunca quem votou em quem, rev. 4, E21), pódio 3º → 1º, **cena de desempate**, posição compartilhada, classificação completa opcional, final estático.
- **Ensaio** com relógio e dados locais, **emergência** (`Shift+E`), "Refazer revelação" e progresso mantido em memória.
- Auditoria das ações do modo real (4 ações).
- Três cenários de empate para o **Festival** (seção 5.11) e a seção **Apresentação** da toolbar.
- Autotestes puros: `conferirRoteiro`, `conferirMotor` e `conferirFixturesFestival`.

**Fora (e em qual etapa fica)**
- Apuração, `congelarResultado`, seed de volume, gerador, cenários `RESULTADO_*` e `FESTIVAL_ENCERRADO` → **Etapa 7** (esta etapa só consome). `SimuladorVotos` → **Etapa 7**, montado no `GateEvento` (D15 rev. 3); sala e palco só leem.
- Abrir, encerrar e concluir o evento; desqualificar candidato → **Etapa 6**. O palco **não** encerra a urna sozinho nem oferece botão para isso.
- Sincronização entre telas, controle remoto e "Ver Apresentação" para outros usuários → fora da Fase 1 (D18 da Etapa 0).
- Tela de configuração da apresentação (`ConfigApresentacao`) → por seed e toolbar (Etapa 6, seção Fora).
- Tela pública de resultado, trilha sonora e efeitos sonoros → futuro. Trailer por candidato: **não existe** (confirmado na rev. 4). Vídeo hospedado ou upload: **nunca** (o trailer é sempre link/embed, rev. 4, E21).
- Exibir quem votou em quem no telão: **nunca** (rev. 4, E21; a opção `exibirVotosJuriNoTelao` foi removida).
- Cerimônia depois de **Concluir** o evento → fora (D3: concluído abre direto no final estático).
- Consolidação de rotas, matrizes e documentação final → **Etapa 9**.

---

## 3. Contrato com as outras etapas

### 3.1 O que esta etapa recebe

| Item | Dono |
|---|---|
| `Resultado<T>`, `CodigoErro`, `ModoFalha`, `atraso`, `simularFalha`, `registrarLog`, `servicos/mensagens.ts` | Etapa 0 |
| Store externo, relógio simulado (`useAgora`; `avancar`, `irPara`, `pausar`, `retomar`, `reiniciar`), `registrarAuditoria`, `useConsulta` (polling com pausa em aba oculta) | Etapa 0 |
| `store/transicoes.ts` (`encerrarUrna` congela o resultado; `forcarEstadoUrna`) | Etapa 0 |
| `RotaGuard`, `AcessoRestrito`, rota stub `apresentar/page.tsx` fora de `(painel)`, atalho "Apresentação" do `AdminShell` | Etapa 0 |
| `Dialogo`, `DialogoConfirmacao`, `Toast`, `Alerta`, `Selo`, `Botao`, `Cartao`, `Carregando`, `Abas`, `LiveRegion`, `ContagemRegressiva`, `ImagemCandidato`, `LogoEvento` | Etapa 0 |
| `lib/aleatorio.ts` (`hashDeTexto`), `lib/formatar.ts`, `lib/tempo.ts`, tokens `--tema-*`, `useEventoAtivo()` | Etapa 0 |
| `ui.palcoAtivo`, `dev.toolbarModo` (`AUTO`, `OCULTA`, `FORCADA`), regra de visibilidade da toolbar no palco, `Alt+D`, registro de seções da toolbar | Etapa 0 |
| `dominio/candidatos.ts` (`votaveis()`), `redistribuirPesos`, seed dos eventos, `ConfigApresentacao` do seed (Maratona Tech Tivit sem `trailerUrl`; Festival com `trailerUrl` de placeholder) | Etapa 0 |
| `resolverSituacaoEvento(evento, configApresentacao, agoraMs)` (situações `RETA_FINAL`, `TEMPO_ESGOTADO`, `ABERTURA_PENDENTE`, `NAO_INICIADA`, `ABERTA`, `ENCERRADA`, `CONCLUIDO`, `EM_PREPARACAO`) | Etapa 1 |
| `resolverFaseConfig(evento)` (`FaseConfig` + `incoerente`), `dominio/checklistAtivacao.ts` (o item Trailer da sala usa o mesmo critério), `ConfigPlacar`, tema | Etapa 6 |
| `apurar`, `DadosResultado` por versão (com `ranking[].pontosPorGrupo`, `desqualificados` e `pesosEfetivos`, D16 rev. 3), `SimuladorVotos` já montado no `GateEvento` (D15 rev. 3), `contarVotos`, `servicos/dashboard.ts` (`obterResultado`; `obterVotosJuri` **não** é consumido aqui, rev. 4, E21), `mocks/volume/` (`gerarVolume`, `restaurarNucleo`, `DISTRIBUICOES`, tipo `DistribuicaoAlvo`), cenários `FESTIVAL_ENCERRADO`, `RESULTADO_PADRAO`, `RESULTADO_EMPATE_RESOLVIDO`, `RESULTADO_EMPATE_PERSISTENTE`, `RESULTADO_CO_VENCEDORES`, `RESULTADO_SEM_INFANTIL`, `RESULTADO_DOIS_CANDIDATOS`, `conferirApuracao`, invariante I8, `dominio/auditoria.ts` (catálogo de exibição) | Etapa 7 |
| Regra de casas decimais da pontuação na tela (duas casas; quatro se duas posições diferentes ficarem iguais) | Etapa 7 (seção 5.2) |
| Cenário `MUITOS_CANDIDATOS` (24) e `SEM_CANDIDATOS`; cenário `SEM_ENCERRAMENTO_AUTOMATICO` | Etapas 4, 2 e 1 |

### 3.2 O que esta etapa entrega

| Item | Consumidor |
|---|---|
| `dominio/apresentacao/` (`resolverFasePalco`, `montarRoteiro`, `descreverRoteiroPublico`, `reduzirMotor`, `duracoes`, `interpretarLinkTrailer`, `assinaturaDoResultado`, `lerRevelacao`) | Etapa 9 (auditoria de rotas e de estados) |
| `servicos/apresentacao.ts` (`obterStatusResultado`, `obterEstadoAoVivo`, `carregarRevelacao`, `obterDadosEnsaio`, `registrarAcaoApresentacao`) | Etapa 9 (`FRONTEIRA-DADOS.md`) |
| `ui.apresentacao` (seção 5.2) e `dev.simularTrailerFalha` | Etapa 9 (seção 4.9 do Contexto) |
| Cenários `FESTIVAL_EMPATE_RESOLVIDO`, `FESTIVAL_EMPATE_PERSISTENTE`, `FESTIVAL_CO_VENCEDORES` | Etapa 9 (consolida a lista) |
| Ações de auditoria `REVELACAO_INICIADA`, `REVELACAO_CONCLUIDA`, `REVELACAO_REFEITA`, `EMERGENCIA_ACIONADA` | Etapa 7 (catálogo de exibição, errata mínima), Etapa 9 |
| Seção **Apresentação** da toolbar | Etapa 9 |
| Autotestes `conferirRoteiro`, `conferirMotor`, `conferirFixturesFestival` | Etapa 9 |
| Matriz de verificação AP1–AP45 | Etapa 9 |
| Token `--qr-claro` e `--qr-escuro` em `globals.css` (placa fixa do QR Code) | Etapa 9 (auditoria de "nenhum hex de marca": são cores neutras, ficam em `globals.css`) |

**Acréscimos ao contrato do conjunto** (para registrar na seção 10 do Contexto)
- `ui`: **`apresentacao`** (seção 5.2). `dev`: **`simularTrailerFalha`**. `CodigoErro`: **nenhum novo**.
- Toolbar: seção **Apresentação** (seção 5.12). Cenários: **3 novos** (Festival com empates). Esta etapa **não** registra de novo os `RESULTADO_*` (P16 da Etapa 7).
- Auditoria: as 4 ações acima. Invariantes: **nenhuma nova**.
- Dependência nova aprovada: `qrcode.react` (já prevista na seção 3.3 da Etapa 0).
- Errata mínima nas Etapas 0 e 7: **incorporada na Etapa 0 rev. 2** (pendência P12); o CP1 confere. A parte da Etapa 7 (catálogo de exibição com os quatro rótulos) continua sendo feita aqui.

---

## 4. Decisões

Só as decisões **novas** desta etapa. As do conjunto vivem na Etapa 0 e as da apuração na Etapa 7.

| # | Decisão | Motivo |
|---|---|---|
| D1 | **Três camadas** (apuração da Etapa 7 → roteiro e motor puros → cenas). `montarRoteiro` recebe só `DadosResultado`, a opção de classificação completa e o modo; `reduzirMotor` é uma função pura sobre `(estado, ação, roteiro)`. As cenas não calculam posição, empate nem pontuação. | Mantém tudo conferível por autoteste (D19 da Etapa 0) e deixa o visual trocável. |
| D2 | **Sigilo em camadas.** A sala de controle e as fases anteriores à revelação só chamam `obterStatusResultado` (existe? qual a assinatura? houve votos?) e `obterEstadoAoVivo` (total geral e, se a flag estiver ligada, o parcial). O resultado só é pedido (`carregarRevelacao`, que usa `obterResultado` da Etapa 7) **depois** de a revelação iniciar ou quando o palco reabre com progresso válido ou no final estático. Antes disso nem a sala nem o palco guardam `DadosResultado` em memória. | E7-15, F3 e `ModoApresentacao.md` seção 10: a tela pode estar espelhada no telão. |
| D3 | **A fase do palco é derivada** (`resolverFasePalco`) de `resolverFaseConfig` (Etapa 6), do status do resultado e da revelação lida (seção 5.1). **Rascunho** abre a pré-votação (A8). **Concluído** abre o **final estático**, sem cerimônia. Combinação incoerente segue a precedência da Etapa 1 e a sala explica. | E8-12, T13 e A8. Uma só derivação, compatível com as Etapas 6 e 7. |
| D4 | **Progresso em `ui.apresentacao` com assinatura do resultado.** O progresso (revelação, cena, passo, modo de avanço) só vale se `eventoId` e `assinatura` baterem com a maior versão atual; senão é lido como vazio e a sala avisa "o resultado mudou desde a revelação". Assim, desqualificar depois de revelar, aplicar cenário ou voltar e refazer a urna **reiniciam a revelação** sem editar as Etapas 0, 6 ou 7. A assinatura é `hashDeTexto` de `(versao, motivo, calculadoEm, pesos, dados)` (rev. 3, D14). | E8-7, E8-16 e A13. É a mesma ideia do `ui.votacao` com `chave` (D1 da Etapa 5). Um cenário reaplicado também gera a versão 1, então comparar só a versão não basta; e um cenário reaplicado com os **mesmos** dados geraria a mesma assinatura sem `calculadoEm`, então a revelação antiga seria herdada por um resultado recongelado. Com `calculadoEm`, todo congelamento novo invalida o progresso. |
| D5 | **Ensaio 100% local** (T8). Os dados vêm de `cenario.aplicar(estado)` sobre uma **cópia** do estado, descartada (os cenários da Etapa 7 são puros); o relógio do ensaio é um **contador de tiques** (não usa `useAgora`, `Date.now` nem `performance.now`); o motor roda num `useReducer` local; **nada** vai para `banco`, `resultados`, auditoria ou `ui.apresentacao`. O selo **ENSAIO** é parte do canvas e não pode ser ocultado. | O tique de 1 s da Etapa 0 fecharia a urna real se o ensaio usasse o relógio global (T8). Reaproveitar o cenário evita uma segunda cópia das fixtures (E8-4). |
| D6 | **Auditoria só no modo real, em quatro ações**, chamadas sem aguardar (fire and forget): `REVELACAO_INICIADA`, `REVELACAO_CONCLUIDA`, `REVELACAO_REFEITA`, `EMERGENCIA_ACIONADA`. O `detalhes` leva só `versao` e `cena` (índice) (`votosJuriNoTelao` saiu na rev. 4, E21); **nunca** vencedores, pontuações ou votos. O serviço obedece só a `simularErroRede` e **não consome** a falha pontual (é efeito colateral da cerimônia, não ação do usuário). Falha de auditoria aparece só no HUD. | Contexto 7.1 sugeria três ações; `REVELACAO_CONCLUIDA` registra o momento em que o resultado foi mostrado. A cerimônia não pode esperar 400 ms (ou 1500 ms) por serviço. |
| D7 | **Serviços de leitura** (`obterStatusResultado`, `obterEstadoAoVivo`, `obterDadosEnsaio`) seguem o padrão da Etapa 7: `Resultado<T>`, `atraso()`, **só** `simularErroRede`, revalidam que a sessão é `ADMIN` **do evento** (`NAO_AUTORIZADO`). Falha de leitura **mantém o último dado bom**; no telão não aparece alerta (só no HUD). | D5 da Etapa 7, E7-5. Um alerta de erro no telão estraga a cerimônia. |
| D8 | **Visual do palco:** usa os tokens do tema **como estão** (fundo e texto do evento), sem derivar uma paleta escura. Texto mínimo de 36 px no canvas, títulos de candidato com degraus de fonte conforme o tamanho (nunca menos de 3 linhas antes de cortar). A prévia "Telão" da Etapa 6 deve parecer com o palco (conferido no CP10). | D15 da Etapa 0 (sem dark mode automático, sem hex de marca) e 4,5:1 já garantido. Inverter cores quebraria o contraste da cor de marca como texto. Fica registrado como pendência visual (P5). |
| D9 | **Rótulos e textos.** Os títulos das categorias vêm de `ConfigApresentacao.rotuloCategoria*` (E8-8), não do tema; o nome do conjunto de candidatos vem de `tema.rotuloCandidatos`. Textos fixos são neutros: nunca artigo ou adjetivo que concorde com o rótulo. Posições: "1º lugar" e "1º lugar — empate". | E8-8 e D10 da Etapa 2 (T10). |
| D10 | **Modo de avanço:** o valor inicial é `ConfigApresentacao.modoAvanco`; a sala e o HUD gravam só um **override local** em `ui.apresentacao.modoAvancoLocal`, que não altera o `banco`. A seção da toolbar altera o valor padrão da config. | E8-10. A sala não pode editar configuração de evento. |
| D11 | **Trailer.** `interpretarLinkTrailer` aceita YouTube (`watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`) e Vimeo (`vimeo.com/<id>`, `player.vimeo.com/video/<id>`) e devolve a URL de embed, ou `null`. Link `null`, `usarTrailerGerado` ligado ou tempo limite de carregamento vencido → trailer **gerado**. A duração do trailer por link é **constante** (`duracoes.ts`), porque sem a API do player não há como detectar o fim; o gerado tem duração fixa. `dev.simularTrailerFalha` faz o iframe nunca carregar. | E8-9 e A18: `ConfigApresentacao` não tem campo de duração. Fim real por API fica para a versão real (P4). |
| D12 | **Regras do roteiro** (seção 5.4). Pódio: **uma cena por posição distinta ≤ 3**, de 3 para 1, mostrando **todos** os que a compartilham; **desempate** é inserido antes da pior posição **resultante** (≤ 3) do trecho empatado; **categoria sem vencedor** (grupo ativo sem votos) é pulada; **limite visual de 6 nomes** por cena de pódio ou de desempate, com "+N" no resto. | E8-15, F5 e F6. Cobre posições 1-1-3 e 1-2-2-4 e o caso extremo de urna sem votos (todos empatados). |
| D13 | **Categorias mostram só o vencedor (rev. 4, E21).** As categorias da revelação (queridinho do público, preferido das crianças, escolha dos jurados) mostram **só o(s) candidato(s) vencedor(es)** e a quantidade de votos dele(s). **Nunca** se mostra quem votou em quem: a opção `ConfigPlacar.exibirVotosJuriNoTelao` foi **removida** em todo o conjunto, a categoria do júri tem os mesmos 3 passos das outras e `carregarRevelacao` não chama `obterVotosJuri`. | Decisão do dono do produto (rev. 4, E21): sigilo do voto do júri também no telão. Substitui a versão anterior desta decisão (passo extra com votos identificados). |
| D14 | **Roteiro público da sala** (`descreverRoteiroPublico`): esqueleto fixo, derivado só de módulos e opções (trailer, categorias ativas, pódio, classificação, final). **Não** lista cenas de desempate nem vencedores. | O roteiro real depende do resultado e revelaria que há empate. |
| D15 | **Teclado e tela cheia.** Um único `keydown` no `window`, que ignora `repeat` e alvos interativos (botão, campo). Atalhos: `Espaço`, `→`/`Enter`, `←`, `T`, `F`, `Shift+E`, `Q`, `?`. `Shift+E` não pede confirmação; `Q` pede se a revelação real estiver em andamento. **Sair da tela cheia pausa** a revelação e avisa. A tela cheia é pedida no clique de **Apresentar** (gesto do usuário) sobre o elemento do palco, para o `Dialogo` nativo continuar visível. **O mesmo gesto também libera o áudio** (rev. 3, C19): o player do trailer é iniciado **sem mudo** depois desse clique. | `ModoApresentacao.md` seção 10. `repeat` evitaria avançar vários passos segurando `Enter`. Navegadores bloqueiam autoplay com som sem gesto do usuário; reaproveitar o clique de Apresentar evita um segundo clique no telão. |
| D16 | **A validação do palco não depende de `Alt+D`** (E8-2 e A14): a seção da toolbar tem o controle "Toolbar no palco" (`AUTO` ou `FORCADA`), usado antes de apresentar. Nenhuma errata no atalho da Etapa 0. | `Alt+D` pode ser tomado pelo navegador (foco na barra de endereço). |
| D17 | **Instância única** (D18 da Etapa 0). A sala avisa que a apresentação deve abrir **nesta mesma janela**: outra aba ou o F5 volta ao seed. O QR Code usa `window.location.origin` + `/e/<slug atual>`, montado no clique de Apresentar (cliente), e fica numa **placa clara fixa** com módulos escuros (`currentColor`), independente do tema, para leitura confiável. | E8-13, E8-14 e A15. QR invertido (claro sobre escuro) falha em alguns leitores. |
| D18 | **Ao vivo.** Total geral = soma **bruta** dos três grupos, lida por `obterEstadoAoVivo` a cada 5 s (`useConsulta`). Votos por candidato nos cards **só** com `ConfigApresentacao.parcialAoVivo` ligado **e** urna `ABERTA` (a flag é a única, D8 da Etapa 7) e **o serviço omite** os números quando desligada (não estão no DOM). As mensagens de abertura e de reta final são **derivadas do relógio**: abertura enquanto `agora − urnaAbertaEm` ≤ `duracoes.mensagemAberturaMs`; reta final pela situação `RETA_FINAL` (limiar do `ConfigApresentacao`). Sem timers próprios. | T14, T17 e F2. Evita estado local que se perde ao reabrir o palco. |
| D19 | **Paginação.** Mais de 8 candidatos na pré-votação, no ao vivo e no trailer gerado: páginas de 8 em rotação (`duracoes.paginaMs`; sem rotação animada em `prefers-reduced-motion`, só troca). Classificação completa: uma página de 10 linhas por **passo**. Candidatos do palco: só votáveis, na ordem de `ordem` (sem embaralhar). | E8-17. O cenário `MUITOS_CANDIDATOS` (24) precisa continuar legível. |
| D20 | **Cenários.** O ensaio lista os cenários da Etapa 7 **do evento atual** (tabela `CENARIOS_ENSAIO`, conferida contra o registro no CP1). Como a Etapa 7 desenhou os empates só para a Maratona Tech Tivit, esta etapa registra **três cenários do Festival** (empate resolvido, empate persistente e co-vencedores) sobre o gerador e o `restaurarNucleo` da Etapa 7, também aplicáveis ao estado real pela toolbar. | O Festival tem tema claro e três categorias: é onde cenas de empate e contraste mais precisam ser vistas. Não reregistra `RESULTADO_*` (P16 da Etapa 7). |
| D21 | **Final estático com marca discreta.** O final estático mostra pódio e categorias na mesma tela e, ao pé, uma linha discreta "Apuração por VaiVota" (A16). É o único lugar do telão com a marca do produto. | Proposta A16 do Contexto, confirmada na rev. 3 (E25, P6). |

---

## 5. Modelo e regras

### 5.1 Fase do palco

A fase vem de `resolverFasePalco(entrada)` (pura, em `dominio/apresentacao/fasePalco.ts`). Entradas: `FaseConfig` e `incoerente` (de `resolverFaseConfig`, Etapa 6), `situacao` (de `resolverSituacaoEvento`, Etapa 1), o **status do resultado** (`existe`, `assinatura`) e a **revelação lida** (seção 5.2). Componentes nunca comparam `estado` nem `estadoUrna`.

| `FaseConfig` | Resultado oficial | Revelação (válida) | Fase do palco | O que o palco mostra |
|---|---|---|---|---|
| `RASCUNHO` | — | — | `PRE_VOTACAO` | Nome, logo e candidatos votáveis; "Em breve" (A8). A sala avisa "Evento em preparação" |
| `ATIVO_NAO_INICIADA` | — | — | `PRE_VOTACAO` | "A votação começa em {contagem}"; com `janelaInicio` vencida (situação `ABERTURA_PENDENTE`): "Aguardando a abertura pela organização"; sem `janelaInicio`: "Data de abertura a definir" |
| `URNA_ABERTA` | — | — | `AO_VIVO` | Cards, QR Code, temporizador, total geral. Subestados: abertura recente, `RETA_FINAL`, `TEMPO_ESGOTADO` (seção 5.9) |
| `URNA_ENCERRADA` | **não existe** (só por toolbar) | — | `ENCERRADA_AGUARDANDO` | "Votação encerrada". `Enter` e `Shift+E` não fazem nada; a sala diz "O resultado oficial ainda não foi calculado" |
| `URNA_ENCERRADA` | existe | nenhuma ou inválida | `ENCERRADA_AGUARDANDO` | "Votação encerrada". `Enter` inicia a revelação |
| `URNA_ENCERRADA` | existe | `EM_ANDAMENTO` | `REVELACAO` | A cena do progresso (a sala pergunta antes: continuar ou recomeçar) |
| `URNA_ENCERRADA` | existe | `CONCLUIDA` | `FINAL_ESTATICO` | Pódio e categorias, sem animação |
| `CONCLUIDO` | existe | qualquer | `FINAL_ESTATICO` | Idem; **sem cerimônia** e sem "Refazer revelação" (D3) |
| `CONCLUIDO` | não existe | — | `SEM_RESULTADO` | "O resultado oficial ainda não foi calculado" (só ocorre por toolbar) |

- **Incoerente** (`incoerente = true`, combinação criada pela toolbar): a sala mostra `Alerta` "Combinação criada pela toolbar. Use a toolbar para voltar a um estado válido." A fase manda; o palco mostra o que a tabela diz. A precedência é `CONCLUIDO` > `RASCUNHO` > urna (T13).
- **Ensaio** ignora a tabela: percorre `AO_VIVO` simulado → `ENCERRADA_AGUARDANDO` → `REVELACAO` → `FINAL_ESTATICO` sobre os dados do cenário escolhido (seção 5.10), em qualquer fase real.
- **Reação em tempo real:** o palco real reage ao store. Mudar a urna pela toolbar, passar pelo relógio ou desqualificar um candidato na Configuração troca a fase na hora (as telas leem o estado por serviços e seletores públicos).
- **O palco real nunca altera a urna.** Encerrar, abrir ou concluir continua sendo da Etapa 6 e do relógio (E8-11). Com `encerramentoAutomatico` ligado e `agora ≥ janelaFim`, o tique da Etapa 0 encerra a urna e o palco apenas **reage**; com ele desligado, aparece "Tempo esgotado" (D7 da Etapa 0).
- **`TEMPO_ESGOTADO` e votar:** continua permitido (D7 da Etapa 0, A7); o palco não menciona isso, só mostra o aviso.

### 5.2 Estado: `ui.apresentacao`, `dev` e leitura filtrada

```ts
type EstadoUiApresentacao = {
  chave: string | null                 // `${usuarioId}:${eventoId}`; null = nada gravado
  modoSala: "REAL" | "ENSAIO"          // escolha na sala (padrão: "REAL")
  cenarioEnsaioId: string | null       // escolha na sala; null = o primeiro da lista do evento
  modoAvancoLocal: ModoAvanco | null   // override local (D10); null = valor da ConfigApresentacao
  revelacao: {
    eventoId: string
    assinatura: string                 // do resultado em que a cerimônia começou (D4)
    situacao: "EM_ANDAMENTO" | "CONCLUIDA"
    cena: number; passo: number
    pausado: boolean
    emergencia: boolean                // true se terminou por Shift+E
    iniciadaEm: Instante               // relógio simulado
  } | null
}
// EstadoUi.apresentacao: EstadoUiApresentacao; valor inicial: tudo nulo, modoSala "REAL"
// EstadoDev.simularTrailerFalha: boolean   // valor inicial: false
```

- **Leitura filtrada.** `useRevelacao(eventoId)` (em `store/seletores/apresentacao.ts`) devolve a revelação ou `null` quando a `chave` não bate com a sessão e o evento atuais, ou quando `lerRevelacao` a invalida pela assinatura (D4). Trocar de usuário ("Entrar como", "Sair") ou de evento nunca herda a cerimônia de outra pessoa, **sem editar** as Etapas 3 e 6.
- **`lerRevelacao(ui, usuarioId, eventoId, assinaturaAtual)`** (pura): devolve `{ revelacao, motivoDescartada }`, com `motivoDescartada` = `"RESULTADO_MUDOU"` quando a assinatura não bate (a sala mostra "O resultado mudou desde a última revelação. A cerimônia recomeça do início"), ou `null`.
- **Quem grava:** só `store/acoesApresentacao.ts` (`iniciarRevelacao`, `gravarProgresso`, `concluirRevelacao`, `emergencia`, `refazerRevelacao`, `limparApresentacao`), no **modo real**. O ensaio nunca grava em `ui.apresentacao` (D5).
- **`ui.palcoAtivo`** (Etapa 0): ligado no clique de **Apresentar** e desligado ao sair (`Q`, botão da HUD, fechar o `Dialogo`, desmontar a rota), inclusive no ensaio, porque a regra de visibilidade da toolbar vale para o palco, não para a cerimônia.
- **Sem campo novo em `banco`.** A Etapa 0 já manda `forcarEstadoUrna` para trás, `resetarMock` e `aplicarCenario` zerarem o progresso em `ui` (seção 5.3 da Etapa 0); a errata P12 só confirma que isso inclui `ui.apresentacao`. A assinatura continua protegendo mesmo se algum caminho esquecer.
- **Registro na seção 4.9 do Contexto:** `ui.apresentacao` (dono: Etapa 8) e `dev.simularTrailerFalha`.

### 5.3 Serviços (`servicos/apresentacao.ts`)

Todos `Promise<Resultado<T>>`, com `atraso()`, relendo `store.getState()` depois de cada `await` e validando antes de gravar. Todos começam por: a sessão é `ADMIN` **do** `eventoId`? Senão `NAO_AUTORIZADO`. Nenhum DTO carrega e-mail, hash nem `ipHash`.

| Serviço | Entrada | Devolve / efeito | Erros | Falha simulada |
|---|---|---|---|---|
| `obterStatusResultado` | `eventoId` | Só leitura. `{ existe: boolean; versao: number \| null; assinatura: string \| null }`. **Nunca** devolve `DadosResultado` | `NAO_AUTORIZADO`, `NAO_ENCONTRADO`, `REDE` | só `simularErroRede` |
| `obterEstadoAoVivo` | `eventoId` | Só leitura. `{ totalGeral: number; parcial: { candidatoId: string; votos: number }[] \| null }`. `parcial` só existe com `parcialAoVivo` ligado **e** urna `ABERTA`; senão é `null` (o número nem sai do serviço) | `NAO_AUTORIZADO`, `NAO_ENCONTRADO`, `REDE` | só `simularErroRede` |
| `carregarRevelacao` | `eventoId` | Só leitura. Reúne, **de uma vez**, o que a cerimônia precisa: `obterResultado` da Etapa 7 (maior versão), os candidatos votáveis (`id`, `titulo`, `imagemUrl`, `ordem`), `configApresentacao` e módulos. **Não** chama `obterVotosJuri` (nenhum voto identificado chega ao palco, rev. 4, E21). Só depois de a urna estar encerrada | `NAO_AUTORIZADO`, `RESULTADO_INDISPONIVEL` (fase fora de encerrada ou concluído, ou sem versão), `REDE` | só `simularErroRede` |
| `obterDadosEnsaio` | `eventoId`, `cenarioId` | Só leitura. Aplica `cenario.aplicar(estado)` a uma **cópia** (nada vai ao store), lê o resultado v1 e devolve o **mesmo DTO** de `carregarRevelacao` mais `totalGeral` e `votosPorMinutoSimulados`. O cenário precisa ser do evento (`VALIDACAO` se não for) | `NAO_AUTORIZADO`, `VALIDACAO`, `NAO_ENCONTRADO`, `ERRO_INTERNO` (invariante violada na cópia), `REDE` | só `simularErroRede` |
| `registrarAcaoApresentacao` | `eventoId`, `acao`, `{ versao, cena? }` | Registra uma das quatro ações (D6) com `registrarAuditoria`, num único `atualizar`. **Não aguarda** `atraso()` quando chamada pela cerimônia (fire and forget); falhas vão ao console (`[mock:log]`) e ao HUD | `NAO_AUTORIZADO`, `NAO_ENCONTRADO` | só `simularErroRede` |

**Regras comuns**
- `DadosRevelacao` (DTO de `carregarRevelacao` e `obterDadosEnsaio`) é a **única** forma de o palco enxergar o resultado. As cenas recebem só o necessário (seção 5.7).
- **Pontos e desqualificados vêm de `DadosResultado` (rev. 3, D16).** Quem está fora da disputa (classificação, final, `candidatosNaDisputa`) é lido de `dados.desqualificados`; a contribuição por grupo, quando exibida, de `ranking[].pontosPorGrupo`; os pesos usados, de `dados.pesosEfetivos`. `montarProps` e as cenas **nunca recalculam** nada disso.
- Os serviços de leitura obedecem só a `simularErroRede` e **não consomem** `dev.falhaProxima` (D8 da Etapa 5 e D5 da Etapa 7). `registrarAcaoApresentacao` também não consome (D6).
- **`carregarRevelacao` roda uma vez**: ao iniciar a revelação (`Enter`), ao reabrir o palco com progresso válido ou ao abrir o final estático. Daí em diante a cerimônia **não espera por serviço** (avanço, pausa e emergência são locais). Falha ao carregar: o telão continua em "Votação encerrada" e o HUD mostra "Não foi possível carregar o resultado. Tente de novo." (`Enter` repete).
- **Cópia do ensaio:** `cenario.aplicar` recebe uma cópia do estado e devolve outra; o serviço lê só o resultado v1 e os dados do evento, e **descarta** o estado devolvido (nunca chama `atualizar`).

### 5.4 Roteiro (`dominio/apresentacao/roteiro.ts`)

```ts
type Cena =
  | { tipo: "AO_VIVO_ENSAIO" }                                  // só no ensaio
  | { tipo: "ENCERRADA_ENSAIO" }                                // só no ensaio
  | { tipo: "TRAILER" }                                          // 1 passo
  | { tipo: "CATEGORIA"; grupo: Grupo; passos: 3 }               // suspense → nome → votos (só o vencedor, D13 rev. 4)
  | { tipo: "DESEMPATE"; empateIndex: number; passos: 3 }        // lado a lado → critério → resultado
  | { tipo: "PODIO"; posicao: 1 | 2 | 3; passos: 3 }             // suspense → nomes → pontuação
  | { tipo: "CLASSIFICACAO"; paginas: number }                   // um passo por página de 10
  | { tipo: "FINAL" }                                            // 1 passo, estático

montarRoteiro(
  dados: DadosResultado,
  opcoes: { classificacaoCompleta: boolean; modo: "REAL" | "ENSAIO"; candidatosNaDisputa: number }
): Cena[]                                                       // pura, determinística, sem relógio

descreverRoteiroPublico(opcoes: {
  modulos: { juri: boolean; infantil: boolean }; classificacaoCompleta: boolean; modo: "REAL" | "ENSAIO"
}): string[]                                                    // só nomes, sem depender do resultado (D14)
```

**Regras de `montarRoteiro`** (D12)
1. **Ensaio** começa com `AO_VIVO_ENSAIO` e `ENCERRADA_ENSAIO`; o real começa no `TRAILER` (a fase `ENCERRADA_AGUARDANDO` vem antes do roteiro e não é uma cena).
2. `TRAILER`.
3. **Categorias**, na ordem `POPULAR`, `INFANTIL`, `JURI`, só dos grupos que existem em `dados.categorias` (grupo ativo) **e** têm ao menos um vencedor (grupo sem votos é pulado). Toda categoria tem 3 passos, inclusive `JURI` (o passo extra de votos do júri saiu na rev. 4, E21).
4. **Pódio:** uma cena por **posição distinta ≤ 3** presente em `dados.ranking`, de 3 para 1. Cada cena mostra **todos** os candidatos daquela posição (empate dá "2º lugar — empate"). Com menos de 3 candidatos, só as posições que existem.
5. **Desempate** (`DESEMPATE`) para cada `dados.empates[k]` em que **algum** candidato termina em posição ≤ 3 (considerando as posições **depois** do critério). Fica **imediatamente antes** da cena de pódio da **pior posição ≤ 3** entre os candidatos do trecho. Empates só entre posições > 3 não geram cena.
6. `CLASSIFICACAO` só com `classificacaoCompleta` ligada: `paginas = ceil(candidatosNaDisputa / 10)`.
7. `FINAL`.
8. **Sem candidatos na disputa** (`ranking` vazio): `TRAILER` → `FINAL` (o final mostra "Nenhum candidato na disputa").

**Roteiros esperados** (conferidos no CP1 por `conferirRoteiro`, contra as fixtures da Etapa 7 e da seção 5.11; `CAT:x` é categoria, `D:k` é desempate `k`, `P:n` é pódio)

| Cenário (evento) | Roteiro real |
|---|---|
| `RESULTADO_PADRAO` (Maratona Tech Tivit) | TRAILER, CAT:POPULAR, CAT:JURI, P:3, P:2, P:1, FINAL |
| `RESULTADO_EMPATE_RESOLVIDO` | TRAILER, CAT:POPULAR, CAT:JURI, **D:0**, P:3, P:2, P:1, FINAL |
| `RESULTADO_EMPATE_PERSISTENTE` | TRAILER, CAT:POPULAR, CAT:JURI, P:3, **D:0**, P:1, FINAL (não há 2º lugar; 1º compartilhado) |
| `RESULTADO_CO_VENCEDORES` | TRAILER, CAT:POPULAR, CAT:JURI, **D:0**, P:2, P:1, FINAL (não há 3º; 2º compartilhado) |
| `RESULTADO_DOIS_CANDIDATOS` | TRAILER, CAT:POPULAR, CAT:JURI, P:2, P:1, FINAL |
| `FESTIVAL_ENCERRADO` | TRAILER, CAT:POPULAR, CAT:INFANTIL, CAT:JURI, P:3, P:2, P:1, FINAL |
| `RESULTADO_SEM_INFANTIL` | TRAILER, CAT:POPULAR, CAT:JURI, P:3, P:2, P:1, FINAL |
| `FESTIVAL_EMPATE_RESOLVIDO` | TRAILER, CAT:POPULAR, CAT:INFANTIL, CAT:JURI, **D:0**, P:3, P:2, P:1, FINAL |
| `FESTIVAL_EMPATE_PERSISTENTE` | TRAILER, CAT:POPULAR, CAT:INFANTIL, CAT:JURI, P:3, **D:0**, P:1, FINAL |
| `FESTIVAL_CO_VENCEDORES` | TRAILER, CAT:POPULAR, CAT:INFANTIL, CAT:JURI, **D:0**, P:2, P:1, FINAL |

No ensaio, acrescenta-se `AO_VIVO_ENSAIO` e `ENCERRADA_ENSAIO` no início. Com a classificação completa ligada, entra `CLASSIFICACAO` antes de `FINAL` (1 página nesses cenários, que têm 6 a 8 candidatos).

**Conteúdo das cenas**
- **Categoria:** passo 1 suspense (rótulo da categoria, sem nome); passo 2 o(s) nome(s) e cartaz; passo 3 a **quantidade de votos** (brutos) de cada vencedor e, se `desempatadoPorPontuacao`, "Desempate pela pontuação final". Co-vencedores: todos juntos, com "Co-vencedores". **Nunca** mostra quem votou em quem, em nenhuma categoria (D13, rev. 4).
- **Desempate:** passo 1 os candidatos **lado a lado**; passo 2 o **critério** efetivo ("Critério: maior votação do júri" ou "do público") com os votos de cada um nesse grupo (`placares`); passo 3 o resultado: **vencedor destacado** se `vencedorId`, senão "Posição compartilhada, sem decisão automática". Se `criterioAplicado` for diferente do configurado (júri desligado, D3 da Etapa 7), mostra o aplicado e a nota "Módulo do júri desligado".
- **Pódio:** passo 1 o número da posição, sem nome; passo 2 os nomes e cartazes; passo 3 a **pontuação final** (duas casas, quatro se houver colisão, regra da Etapa 7; a contagem animada some em `prefers-reduced-motion`). Posição compartilhada: "1º lugar — empate".
- **Classificação:** só posição, título e pontuação; sem destaque negativo; candidato fora da disputa **não aparece**.
- **Final:** pódio e categorias na mesma tela (seção 5.7).

**Nota sobre critério e travas.** Pesos e critério ficam **travados** a partir da abertura da urna (D3 da Etapa 6) e o resultado é congelado: não existe "alternar júri e público e ver o vencedor mudar" depois do encerramento, como dizia o planner antigo. Para conferir os dois critérios, o ensaio usa os cenários de empate, que já cobrem resolvido e persistente.

### 5.5 Motor, tempo e React Compiler

```ts
type EstadoMotor = {
  cena: number; passo: number
  pausado: boolean
  modoAvanco: ModoAvanco
  trailer: "CARREGANDO" | "LINK" | "GERADO"
  situacao: "EM_ANDAMENTO" | "CONCLUIDA"
  emergencia: boolean
}
type AcaoMotor =
  | { tipo: "AVANCAR" } | { tipo: "VOLTAR" } | { tipo: "PAUSAR" } | { tipo: "RETOMAR" }
  | { tipo: "AVANCO_AUTOMATICO"; cena: number; passo: number }     // só vale se (cena, passo) ainda forem os atuais
  | { tipo: "TRAILER_PRONTO" } | { tipo: "TRAILER_FALHOU" } | { tipo: "PULAR_TRAILER" }
  | { tipo: "IR_PARA_FINAL" }                                      // emergência
  | { tipo: "DEFINIR_MODO"; modo: ModoAvanco } | { tipo: "REINICIAR" }

reduzirMotor(estado: EstadoMotor, acao: AcaoMotor, roteiro: Cena[]): EstadoMotor   // pura
duracaoDoPasso(cena: Cena, passo: number): number | null                            // ms; null = espera o admin
```

- **Avançar** consome os passos da cena e depois passa à próxima. No `FINAL` não faz nada, mas marca `situacao = "CONCLUIDA"` na **primeira** chegada. **Voltar** do passo 0 vai ao **último passo da cena anterior** (nunca antes do `TRAILER`, nem para as cenas de ensaio no modo real). Voltar ou avançar nunca pula passo.
- **`AVANCO_AUTOMATICO` carrega `(cena, passo)`** e o redutor ignora a ação se o par não for o atual. Assim um timer atrasado, depois de um avanço manual, nunca avança duas vezes.
- **Modo automático:** depois de `duracaoDoPasso`, avança; `duracaoDoPasso = null` (por exemplo, `FINAL`, ou o `TRAILER` de link com `trailer = CARREGANDO`) espera. **Modo manual:** nunca avança sozinho. A pausa vale nos dois. `trailer` só muda no `TRAILER`; `PULAR_TRAILER` avança direto para a cena seguinte.
- **Duas fontes do mesmo redutor (D5):** no **modo real** o `EstadoMotor` vive em `ui.apresentacao.revelacao` (`store/acoesApresentacao.ts`), então sair e voltar continua da cena certa; no **ensaio** vive num `useReducer` local, que some ao sair. O hook `useMotor(origem)` esconde a diferença das cenas.
- **`duracoes.ts`** (constantes em ms, ajustáveis, P3): suspense 2500, nome 4000, detalhe 4000, desempate 5000 por passo, pódio 4000 por passo, classificação 6000 por página, trailer de link 60000, trailer gerado 12000, tempo limite de carga do link 8000, mensagem de abertura 8000, rotação de páginas de candidatos 8000, ensaio ao vivo 20000, ensaio encerrada 4000, HUD visível 3000, ajuda visível 8000. (A duração "categoria do júri com votos 7000" saiu na rev. 4, E21; as demais foram mantidas.)
- **Regras do React Compiler (obrigatórias para timers e animações).**
  1. Timers (`setTimeout`, `setInterval`) e `requestAnimationFrame` vivem **dentro de `useEffect`**, com **limpeza** que os cancela, e as dependências incluem `(cena, passo, pausado, modoAvanco)`.
  2. **Nenhum `setState` síncrono dentro do efeito**: o estado só muda de dentro do callback assíncrono do timer ou de um handler de evento.
  3. **Nenhuma leitura de `ref.current` durante a renderização.** Refs só dentro de efeitos e handlers (por exemplo, o elemento do palco para `requestFullscreen`).
  4. Contagens animadas calculam o valor do quadro dentro do callback do `requestAnimationFrame` e o gravam em estado local; em `prefers-reduced-motion`, o valor final é usado direto, sem efeito.
  5. Nada de `Date.now()` nem `performance.now()` fora de `relogio.ts`: o tempo da cerimônia é medido pelo **próprio timer** do passo; o do ao vivo vem de `useAgora()`; o do ensaio é um contador de tiques.
- **Listener de teclado** (`usePalcoTeclado`): um `keydown` no `window`, registrado e removido em `useEffect`, com `acao` estável (mesma ideia de `useConsulta`, sem acumular listeners).

### 5.6 Sala de controle

A sala é o que o admin vê ao abrir a rota. **Nada nela mostra resultado** (D2): nem vencedor, nem pontuação, nem a existência de empates. Itens, na ordem:

1. **Cabeçalho:** nome do evento (`tema.nomeExibicao`), selos de estado do evento e da urna (`Selo`) e a **fase em que o palco vai abrir** ("Vai abrir em: Votação ao vivo", e assim por diante). `Alerta` de combinação incoerente quando aplicável.
2. **Avisos fixos** (`Alerta`):
   - **Espelhamento:** "Recomenda-se estender a tela e deixar a apresentação no monitor do telão. Com a tela espelhada, o público vê esta sala."
   - **Instância única (D17):** "Abra a apresentação nesta mesma janela. Em outra aba ou depois de atualizar a página, os dados voltam ao início."
   - **QR Code:** mostra a URL que será usada; se o `origin` for `localhost` ou `127.0.0.1`: "Celulares podem não alcançar este endereço."
   - Mudança de resultado: "O resultado mudou desde a última revelação. A cerimônia recomeça do início" (quando `lerRevelacao` descartou).
3. **Escolha de modo** (`Abas` ou rádio): **Apresentação real** ou **Ensaio** (`ui.apresentacao.modoSala`). Real indisponível só se não houver nada a mostrar (nunca acontece: sempre há uma fase). Ensaio mostra o **seletor de cenário** com os cenários do evento (D20) e a descrição de cada um.
4. **Modo de avanço** (automático ou manual; valor inicial da config, D10).
5. **Revelação (modo real, urna encerrada com resultado):** estado em texto neutro ("Ainda não iniciada", "Em andamento", "Concluída"), **Continuar de onde parei** / **Recomeçar** (quando em andamento) e **Refazer revelação** (quando concluída). Refazer e Recomeçar usam `DialogoConfirmacao` e auditam `REVELACAO_REFEITA`. Desabilitados com o evento concluído, com o motivo.
6. **Roteiro** (`descreverRoteiroPublico`): lista de nomes de cena na ordem, sem vencedor e sem desempate (D14).
7. **Pré-carregamento** (seção abaixo) e **atalhos** (tabela da seção 5.7).
8. **Botão Apresentar** (primário, grande). Desabilitado enquanto o pré-carregamento roda ou se `carregarRevelacao` for necessário e estiver pendente (final estático). Ao clicar (gesto do usuário): liga `ui.palcoAtivo`, monta o palco e pede `requestFullscreen()` sobre o elemento do palco; **falha de tela cheia** (negada ou não suportada) mostra `Toast` "Não foi possível entrar em tela cheia. A apresentação segue em janela" e **não trava**.

**Pré-carregamento (`PreCarregamento`):** carrega o logo e a `imagemUrl` de cada candidato votável que for **caminho de `public/` ou `blob:`** (`placeholder:<n>` e `null` não precisam de rede, D16). Mostra `progress` (com `aria-valuenow`). Imagem que falha ou passa de 8 s usa o placeholder, soma um aviso "N imagens não carregaram" e **não impede** o início. Roda uma vez por montagem da sala e de novo se os candidatos votáveis mudarem. Cria `Image()` dentro de `useEffect`, com limpeza.

### 5.7 Palco: canvas, cenas, HUD e teclado

**Canvas.** Elemento de **1920×1080 px lógicos**, escalado com `transform: scale()` para caber na janela (letterbox, centralizado, com `--tema-fundo` fora do canvas). A escala vem de `useEscalaPalco` (ResizeObserver, dentro de `useEffect`). Em 4K e em janela de 800×450 o layout é o mesmo. Nenhuma barra de rolagem. **Texto mínimo no canvas: 36 px**; títulos de candidato com degraus de fonte (de 96 a 48 px) e corte em 3 linhas; nomes muito longos (seed: título com mais de 100 caracteres) sempre inteiros no passo de nome, sem reticências, na menor fonte.

**Camadas.** (1) cena atual; (2) `SeloEnsaio` (fixo, canto superior, só no ensaio); (3) aviso de pausa e de saída da tela cheia; (4) HUD; (5) ajuda. Só a cena e o selo aparecem por padrão. **Nenhum botão, menu ou barra no telão.**

**HUD** (`Hud`): aparece ao **mover o mouse** ou por `?`, some após 3 s sem movimento. Mostra o nome da cena (não o conteúdo), os controles equivalentes aos atalhos (pausar/retomar, voltar, avançar, pular trailer, emergência, sair), o modo de avanço, a mensagem de falha de leitura ou de auditoria e o botão **Sair**. Tem `role="toolbar"` e `aria-label`, alvos de 44 px e foco visível. Não herda do telão: fica fora do canvas escalado, no mesmo contêiner de tela cheia.

**Teclado** (`usePalcoTeclado`, D15). Ignora `repeat` e eventos cujo alvo seja botão, campo ou `dialog`.

| Tecla | Ação |
|---|---|
| `Espaço` | Pausar / retomar |
| `→` ou `Enter` | Avançar o passo ou a cena; em `ENCERRADA_AGUARDANDO` (real) inicia a revelação; no `FINAL` não faz nada |
| `←` | Voltar |
| `T` | Pular trailer (só na cena de trailer) |
| `F` | Entrar / sair da tela cheia |
| `Shift+E` | **Emergência:** vai direto ao final estático (seção 5.10) |
| `Q` | Sair da apresentação (com `DialogoConfirmacao` se a revelação real estiver em andamento) |
| `?` | Mostrar / esconder a ajuda (some sozinha em 8 s) |

**Tela cheia.** `useTelaCheia` escuta `fullscreenchange`. Ao **sair** da tela cheia com a revelação em andamento (Esc nativo, por exemplo), despacha `PAUSAR`, mostra "Apresentação pausada. Pressione F para voltar à tela cheia e Espaço para continuar." (HUD forçado visível) e **não encerra** o palco. Fora de revelação, só atualiza o estado.

**Cenas** (`components/apresentacao/cenas/`; só desenham):

| Componente | Recebe |
|---|---|
| `CenaPreVotacao` | tema, candidatos votáveis (paginados, D19), `ContagemRegressiva` até `janelaInicio` |
| `CenaAoVivo` | tema, candidatos, `urlQr`, restante, totalGeral, `parcial`, subestado (seção 5.9) |
| `CenaEncerrada` | tema; nada além de "Votação encerrada" |
| `CenaTrailer` | `trailer` do motor, URL de embed ou `null`, candidatos (se a opção estiver ligada), callbacks `onPronto` e `onFalha` |
| `CenaCategoria` | rótulo, vencedores (id, votos), passo (sem votos identificados, D13 rev. 4) |
| `CenaDesempate` | candidatos do empate, critério, votos no critério, resolvido, vencedor, passo |
| `CenaPodio` | posição, candidatos da posição (id, pontuação), compartilhada, passo |
| `CenaClassificacao` | página do ranking |
| `CenaFinal` | pódio, categorias, `candidatosNaDisputa` |
| `CenaSemResultado` | tema |

As cenas **não conhecem** `DadosResultado` inteiro: recebem fatias montadas por `montarProps(dados, cena, passo)` (pura, em `dominio/apresentacao/`). Elas resolvem **título e cartaz** de cada `candidatoId` pelo seletor público de candidatos e por `ImagemCandidato`.

### 5.8 Trailer

- **Um único trailer do evento (rev. 4, E21):** `ConfigApresentacao.trailerUrl` é um link/embed do YouTube ou do Vimeo. **Nunca se armazena vídeo** (não há upload nem vídeo hospedado, nem no futuro) e **não existe trailer por candidato**. O trailer gerado (fallback) e as animações da apresentação continuam.
- **Interpretação (`interpretarLinkTrailer`):** `youtube.com/watch?v=<id>`, `youtu.be/<id>`, `youtube.com/embed/<id>` e `youtube.com/shorts/<id>` viram `https://www.youtube-nocookie.com/embed/<id>?autoplay=1&rel=0`; `vimeo.com/<id>` e `player.vimeo.com/video/<id>` viram `https://player.vimeo.com/video/<id>?autoplay=1`. Qualquer outra URL, vazia ou com id inválido: `null` (vai direto ao gerado). Só `https`. Sem biblioteca.
- **Áudio (rev. 3, C19):** o clique em **Apresentar** é o gesto que libera o som; o player do trailer de link é iniciado **sem mudo** (sem `mute=1`/`muted=1` na URL de embed). Se o navegador ainda assim bloquear o som, o trailer segue mudo e não trava.
- **Iframe** com `allow="autoplay; fullscreen"`, `title` e `referrerpolicy="strict-origin-when-cross-origin"`. O `onLoad` dispara `TRAILER_PRONTO` (estado `LINK`). Se não carregar em 8 s (tempo limite, `duracoes`), ou se `dev.simularTrailerFalha` estiver ligado (o iframe nem é montado), dispara `TRAILER_FALHOU` (estado `GERADO`).
- **Quando usa o gerado:** link `null`, `usarTrailerGerado` ligado, ou falha. O gerado é feito em CSS: nome do evento, logo (`LogoEvento`), data (`formatarDataHora`, fuso do evento) e identidade do tema; com `incluirCandidatosTrailer` ligado, passa também **cartaz e nome** de cada candidato votável (paginados em grupos de 8). Duração fixa de 12 s.
- **Duração do trailer de link:** constante de 60 s (D11): sem a API do player não há como saber o fim. Em modo manual, o admin avança quando quiser.
- **Pular:** `T` ou o botão da HUD, a qualquer momento, nos dois tipos.
- **Movimento:** com `prefers-reduced-motion`, o gerado usa fade simples entre blocos, sem animação de entrada.
- **Limitação conhecida:** um iframe que carrega mas exibe "vídeo indisponível" (por exemplo, id inexistente) **não é detectado** (P4). Em ambiente sem internet, `onLoad` pode não disparar e o fallback assume.

### 5.9 Ao vivo: QR Code, temporizador, total e mensagens

`CenaAoVivo` aparece na fase `AO_VIVO` (urna `ABERTA`) e no `AO_VIVO_ENSAIO`.

| Elemento | Regra |
|---|---|
| Cards | Candidatos votáveis (`votaveis()`), na ordem de `ordem`, com `ImagemCandidato` e título; paginados de 8 em 8 (D19). **Sem votos por candidato** por padrão |
| QR Code | `QRCodeSVG` (`qrcode.react`) com `value = ${origin}/e/${slug}`, nível `M`, 360 px, em **placa clara fixa** (`--qr-claro` de fundo, `--qr-escuro` nos módulos via `currentColor`, margem de 4 módulos). Abaixo, o endereço em texto legível (36 px). `aria-label` "QR Code para votar" |
| Temporizador | `ContagemRegressiva` da Etapa 0, com `useAgora()` (relógio simulado, nunca a hora do computador). Sem `janelaFim`: mostra "Votação aberta" sem contagem |
| Total geral | `obterEstadoAoVivo` a cada 5 s por `useConsulta` (D18): soma **bruta** dos três grupos, com `formatar.ts`. Com o módulo infantil desligado, o grupo não conta |
| Votos por candidato | Só com `ConfigApresentacao.parcialAoVivo` ligado **e** urna `ABERTA`: número ao lado do título em cada card. Com a flag desligada o dado **não existe no DOM** (o serviço não o devolve) |
| Mensagem de abertura | "A votação começou" enquanto `agora − urnaAbertaEm ≤ mensagemAberturaMs`. Derivada do relógio (D18): não há timer próprio e ela some sozinha |
| Reta final | Situação `RETA_FINAL` (Etapa 1): selo de aviso "Reta final" e contagem em destaque, sem som |
| Tempo esgotado | Situação `TEMPO_ESGOTADO`: "Tempo esgotado" e "Aguardando a organização encerrar a votação". O QR Code **continua** (votar segue permitido) |
| Reação | Troca de fase em tempo real (seção 5.1). Votos entrando pelo `SimuladorVotos` (Etapa 7, montado no `GateEvento`) aumentam o total no próximo ciclo |

- **Votos simulados (rev. 3, D15):** esta etapa **não monta** o `SimuladorVotos`. Ele é montado **uma vez**, no `GateEvento` da Etapa 0 (ajuste mínimo feito e registrado pela Etapa 7, D12 dela), ligado por `dev.simularVotosEntrando`, e por isso já roda com a sala ou o palco abertos; **sala e palco só leem** o total por `obterEstadoAoVivo`. Ele só roda com a urna `ABERTA`, a flag ligada e a aba visível, e mantém as invariantes 3 e 4. O ensaio não depende dele (usa a curva local).
- **Ao vivo do ensaio:** 20 s de tique local; o total sobe do 0 até o `totalGeral` do cenário seguindo a curva de `votosPorMinutoSimulados`; o temporizador mostra a contagem local. Sem QR real: a placa mostra o mesmo QR do evento, com o selo ENSAIO.
- **Prévia na pré-votação:** `CenaPreVotacao` não mostra QR Code (a urna ainda não abriu e o link não pode ser usado para votar).

### 5.10 Ensaio e emergência

**Ensaio (D5)**
- Escolhido na sala. Ao clicar em **Apresentar** com `modoSala = "ENSAIO"`, chama `obterDadosEnsaio(eventoId, cenarioId)`. Enquanto carrega, o botão mostra "Preparando…" e o palco **não abre**. Falha: `Alerta` na sala, sem abrir.
- Roteiro: `AO_VIVO_ENSAIO` (20 s) → `ENCERRADA_ENSAIO` (4 s ou `Enter`) → revelação → `FINAL`. O **modo de avanço** vale para a revelação; as duas cenas iniciais seguem os tempos fixos, com `Enter` para adiantar.
- **O que o ensaio não faz:** não chama `carregarRevelacao`, não grava em `banco`, em `resultados`, em auditoria nem em `ui.apresentacao`; não altera relógio, urna, evento, `dev` nem `ui.palcoAtivo` (este **liga**, porque vale para a toolbar, e volta ao sair). Selo **ENSAIO** sempre visível (D5), com ícone e texto.
- **Sair** (`Q` ou HUD) volta à sala sem efeito colateral e **sem confirmação**. A apresentação real depois de um ensaio começa do zero.
- **Cenários do ensaio (`CENARIOS_ENSAIO`):**

| Evento | Cenários (ids) |
|---|---|
| Maratona Tech Tivit | `RESULTADO_PADRAO`, `RESULTADO_EMPATE_RESOLVIDO`, `RESULTADO_EMPATE_PERSISTENTE`, `RESULTADO_CO_VENCEDORES`, `RESULTADO_DOIS_CANDIDATOS` |
| Festival | `FESTIVAL_ENCERRADO`, `RESULTADO_SEM_INFANTIL`, `FESTIVAL_EMPATE_RESOLVIDO`, `FESTIVAL_EMPATE_PERSISTENTE`, `FESTIVAL_CO_VENCEDORES` |

O ensaio de um evento **sem** cenário próprio (evento criado no futuro) não existe na Fase 1; o CP1 confere que toda entrada de `CENARIOS_ENSAIO` existe no registro.

**Emergência (`Shift+E`, D15)**
- Vai direto ao `FINAL`, **em qualquer cena**, inclusive no meio de um desempate ou do trailer, pelo `IR_PARA_FINAL` (o motor marca `emergencia = true`).
- **Real:** só vale com resultado (fase `ENCERRADA_AGUARDANDO` ou `REVELACAO`). Se o resultado ainda não foi carregado, carrega e vai ao final. Registra `EMERGENCIA_ACIONADA` e marca a revelação `CONCLUIDA` (com `emergencia = true`). Nas outras fases não faz nada e o HUD avisa "Sem resultado para mostrar".
- **Ensaio:** vai ao final do ensaio, sem registro.
- No final estático, `Shift+E` não faz nada.

### 5.11 Fixtures do Festival (três cenários novos)

A Etapa 7 desenhou os empates só para a Maratona Tech Tivit. Esta etapa acrescenta três distribuições do **Festival** em `mocks/volume/distribuicoesApresentacao.ts`, reutilizando `gerarVolume` e `restaurarNucleo` da Etapa 7 com a mesma configuração do `FESTIVAL_ENCERRADO` (pesos 50/30/20; 260 públicos cadastrados e 240 votaram; 2 jurados votaram em candidatos diferentes; infantil 138 em 3 totens: Hall 70, Pátio 41, Oficinas 27; `incluirNucleo: false`; janela do evento inteira). Critério de desempate: `JURI`. Pontuação = Σ peso × votos ÷ base, **recalculada com frações exatas** (`50/240`, `30/2` e `20/138` por voto) e arredondada a duas casas **só aqui**.

| Cenário | | c01 | c02 | c03 | c04 | c05 | c06 | Resultado esperado |
|---|---|---|---|---|---|---|---|---|
| `FESTIVAL_EMPATE_RESOLVIDO` | Popular (240) | 40 | 40 | 112 | 22 | 16 | 10 | c02 e c03 empatam em **27,68**; critério `JURI` (1 × 0) dá o **2º a c02** e o 3º a c03; `empates[0]` = `[2, 3]`, `resolvido`, `vencedorId = c02`. Categorias: popular **c03**, infantil **c01**, júri empatado 1 × 1 e decidido pela pontuação final a favor de **c01** (`desempatadoPorPontuacao`) |
| | Júri (2) | 1 | 1 | 0 | 0 | 0 | 0 | |
| | Infantil (138) | 60 | 30 | 30 | 8 | 6 | 4 | |
| | Pontuação | 32,03 | 27,68 | 27,68 | 5,74 | 4,20 | 2,66 | |
| `FESTIVAL_EMPATE_PERSISTENTE` | Popular (240) | 70 | 70 | 40 | 30 | 20 | 10 | c01 e c02 empatam em **33,35** e o critério não separa (1 × 1): **1º compartilhado**, depois o 3º (c03, 14,13); `empates[0]` = `[1, 2]`, `resolvido = false`, sem `vencedorId`. Categorias: popular e júri com **co-vencedores c01 e c02**; infantil **c03** (40) |
| | Júri (2) | 1 | 1 | 0 | 0 | 0 | 0 | |
| | Infantil (138) | 26 | 26 | 40 | 22 | 14 | 10 | |
| | Pontuação | 33,35 | 33,35 | 14,13 | 9,44 | 6,20 | 3,53 | |
| `FESTIVAL_CO_VENCEDORES` | Popular (240) | 150 | 35 | 35 | 10 | 6 | 4 | c01 é 1º (39,95); c02 e c03 empatam em **26,06** e persistem no 2º (critério 1 × 1); `empates[0]` = `[2, 3]`, `resolvido = false`. Categorias: popular **c01**, infantil **c01**, júri **c02 e c03** (1 × 1, mesma pontuação: co-vencedores) |
| | Júri (2) | 0 | 1 | 1 | 0 | 0 | 0 | |
| | Infantil (138) | 60 | 26 | 26 | 14 | 8 | 4 | |
| | Pontuação | 39,95 | 26,06 | 26,06 | 4,11 | 2,41 | 1,41 | |

(`cNN` = `cand-fv-NN`.) Conferido: a soma das pontuações é 100 nos três; os jurados são Jurado A e B (convites gerados, sem rótulo próprio, que o gerador numera); os totens somam 138.

**Redistribuição de peso (rev. 3, C3), conferida:** nas três fixtures os três grupos estão ligados e **todos têm base > 0** (popular 240, júri 2, infantil 138). Logo `pesoEfetivo[g] = peso[g] × 100 ÷ (50 + 30 + 20) = peso[g]`, ou seja, `pesosEfetivos` = 50/30/20 e **nenhum número da tabela muda**. Um grupo ligado com base 0 teria o peso redistribuído entre os demais (regra da Etapa 7, D2); nenhuma fixture desta etapa cai nesse caso.

**Cenários** (`mocks/cenarios/festivalApresentacao.ts`, grupo `RESULTADO`, registrados no registro da Etapa 0): `FESTIVAL_EMPATE_RESOLVIDO`, `FESTIVAL_EMPATE_PERSISTENTE`, `FESTIVAL_CO_VENCEDORES`. Todos puros, idempotentes, com **evento-alvo fixo** (Festival) e que também trocam `dev.slugPadrao`, **exatamente com os cinco passos da seção 5.12 da Etapa 7** (`restaurarNucleo`, ajuste do evento com `urnaEncerradaEm = janelaFim`, `gerarVolume`, `congelarResultado(…, "ENCERRAMENTO", { calculadoEm })`, conferência das invariantes, incluindo I7 e I8).

**`conferirFixturesFestival(): string[]`** (autoteste puro, `dominio/apresentacao/autotestes.ts`): roda `apurar` sobre as três distribuições e compara com a tabela acima (posições, empates, categorias, soma 100, `pesosEfetivos` = 50/30/20); lista vazia = ok. A Etapa 7 já cobre as demais por `conferirApuracao`.

### 5.12 Toolbar e cenários

**Seção "Apresentação"** (`components/dev/secoes/SecaoApresentacao.tsx`, registrada sem tocar no núcleo). Só o que é novo (T17): o "Simular votos entrando", o "Adicionar votos agora" e o "Mostrar parcial por candidato" já existem na seção **Dashboard** da Etapa 7 e **não** se repetem aqui.

| Controle | Efeito |
|---|---|
| Toolbar no palco | `AUTO` ou `FORCADA` (`dev.toolbarModo`), para validar sem depender de `Alt+D` (D16). Sempre visível enquanto a seção estiver aberta |
| Link do trailer | Válido (o `trailerUrl` do seed do Festival) / Inválido (`https://exemplo.com/nao-e-video`) / Ausente (`null`), no `ConfigApresentacao` do evento ativo |
| Usar trailer gerado | Liga e desliga `usarTrailerGerado` |
| Incluir candidatos no trailer | Liga e desliga `incluirCandidatosTrailer` |
| Mostrar classificação completa | Liga e desliga `classificacaoCompleta` |
| Modo de avanço padrão | `AUTOMATICO` ou `MANUAL` (`ConfigApresentacao.modoAvanco`) |
| Limiar da reta final | 300 s, 120 s ou 30 s (`limiarRetaFinalSegundos`) |
| Simular falha do trailer | Liga e desliga `dev.simularTrailerFalha` |
| Resetar apresentação | `limparApresentacao`: zera `ui.apresentacao` do evento ativo, **sem auditoria** (diferente de "Refazer revelação") |
| Conferir roteiro e motor | Roda `conferirRoteiro()`, `conferirMotor()` e `conferirFixturesFestival()` e mostra as divergências (vazio = ok), ao lado de `verificarInvariantes` e de `conferirApuracao` |

- A **toolbar pode editar `ConfigApresentacao`** do evento ativo: o resultado já congelado **não** muda (nova versão só por ação auditada, D9 da Etapa 0). Rótulos de categoria mudam pela Etapa 6 e pelo seed.
- `invariantes`: depois de cada ação da seção, a lista fica vazia.
- **Cenários novos:** os três do Festival (5.11). **Cenários consumidos** (registrados pela Etapa 7): `FESTIVAL_ENCERRADO`, `RESULTADO_PADRAO`, `RESULTADO_EMPATE_RESOLVIDO`, `RESULTADO_EMPATE_PERSISTENTE`, `RESULTADO_CO_VENCEDORES`, `RESULTADO_DOIS_CANDIDATOS`, `RESULTADO_SEM_INFANTIL`.
- **Fluxo de validação do palco real** (sem `Alt+D`): (1) cenário (toolbar, seção Cenários); (2) toolbar no palco `FORCADA`; (3) `/e/<slug>/admin/apresentar`; (4) Apresentar. Com `AUTO`, a toolbar some no palco (regra da Etapa 0).

### 5.13 Textos e acessibilidade

- **Textos do palco** em `lib/textosPalco.ts`, **neutros** (D9): "Em breve", "A votação começa em", "Aguardando a abertura pela organização", "Data de abertura a definir", "Votação aberta", "A votação começou", "Reta final", "Tempo esgotado", "Aguardando a organização encerrar a votação", "Votação encerrada", "Co-vencedores", "Desempate pela pontuação final", "Posição compartilhada, sem decisão automática", "{n}º lugar", "{n}º lugar — empate", "Critério: maior votação do júri", "Critério: maior votação do público", "Módulo do júri desligado", "Nenhum candidato na disputa", "O resultado oficial ainda não foi calculado", "Apuração por VaiVota", "Apresentação pausada…". **Não** usam `textoDoEstado` nem `tema.textosEstado` (esses textos são das telas do participante). Os títulos de categoria vêm de `ConfigApresentacao`; "candidatos" nos títulos vem de `tema.rotuloCandidatos`. Textos finais ficam pendentes de aprovação **[Usuário]** (P9, E30).
- **Foco e estrutura da sala:** `h1` "Apresentação"; ordem lógica; foco visível; todos os controles com rótulo; `Esc` fecha diálogos e o foco volta a quem os abriu; alvos de 44 px; `<main id="conteudo">`.
- **Palco:** o DOM contém **só o conteúdo do passo atual** (nunca cenas futuras escondidas), e uma `LiveRegion` educada anuncia **apenas** o nome da cena ("Pódio, 2º lugar", "Desempate") e as mudanças de fase ("Votação encerrada"), **nunca** vencedores nem pontuações antes de aparecerem na tela. `lang` herdado do layout (pt-BR).
- **Informação nunca só por cor ou animação:** posição por número e texto, empate por texto e ícone, selo ENSAIO por texto e ícone, vencedor por texto "Vencedor" além do destaque.
- **Movimento:** `prefers-reduced-motion` troca animações por fade simples, desliga a contagem animada, a celebração do 1º e a rotação animada de páginas; os tempos dos passos não mudam.
- **Contraste:** nenhum texto abaixo de 4,5:1 nos dois temas (D15 da Etapa 0), conferido no CP10 com a cena de pódio e a de desempate **no tema claro do Festival** (a cor de marca como texto usa `--tema-primaria-texto`). A celebração do 1º usa a cor de marca só como decoração.
- **Distância:** texto mínimo de 36 px no canvas; contraste de projetor conferido com a prévia em tela cheia nos dois temas.
- **Responsivo da sala:** 360, 768 e 1280 px sem rolagem horizontal da página. O palco não é responsivo: escala o canvas (5.7).

### 5.14 Matriz de verificação (AP1–AP45)

Conferência manual pela toolbar, pelo inspetor (`verificarInvariantes` e os autotestes) e pelas rotas. "ST" = Maratona Tech Tivit; "FV" = Festival.

| ID | Verificação | Como |
|---|---|---|
| AP1 | Deslogado vai a `/e/{slug}?de=…`; Ana, Bruno e Davi veem `AcessoRestrito` sem dado de resultado; Hugo em `/e/maratona-tech-tivit/admin/apresentar` também; Carla entra nos dois eventos e Hugo só no Festival | Entrar como |
| AP2 | `RASCUNHO`: a sala abre e o palco mostra "Em breve" com logo e candidatos votáveis; combinação incoerente mostra o `Alerta` | Toolbar: evento |
| AP3 | FV `NAO_INICIADA`: "A votação começa em" com contagem até 25/11 (≈34 dias) e os 6 votáveis na ordem de `ordem`; sem QR Code | Padrão |
| AP4 | `ABERTURA_PENDENTE`: com `janelaInicio` vencida e urna não iniciada, "Aguardando a abertura pela organização" | Relógio: "Fim da janela" no FV (a urna continua não iniciada) |
| AP5 | ST (tema escuro, sem logo): nome em texto, contraste e legibilidade; FV (tema claro, com logo) | Dois temas |
| AP6 | `AO_VIVO` (ST): cards, QR Code com URL de texto, temporizador, total geral; **nenhum** voto por candidato no DOM | Inspecionar o DOM |
| AP7 | Parcial ligado (seção Dashboard) mostra os votos por candidato só com urna `ABERTA`; desligado remove do DOM; urna encerrada nunca mostra | Toolbar |
| AP8 | Mensagem de abertura: abrir a urna com o palco aberto mostra "A votação começou" por 8 s e some; recarregar a sala depois dos 8 s não a mostra | Toolbar: urna |
| AP9 | Reta final: o botão "Reta final" da toolbar mostra o selo e a contagem em destaque | Toolbar: relógio |
| AP10 | `TEMPO_ESGOTADO` com `SEM_ENCERRAMENTO_AUTOMATICO` + "Fim da janela": "Tempo esgotado… Aguardando a organização", QR Code continua, a urna **não** encerra; com encerramento automático, a urna encerra pelo relógio e o palco muda para "Votação encerrada" | Cenário + relógio |
| AP11 | O temporizador segue o relógio simulado: +1 h altera, pausar congela, voltar a `T0` restaura | Toolbar: relógio |
| AP12 | Mudar a urna pela toolbar com o palco aberto troca a fase na hora; a toolbar some no palco com `AUTO`, fica visível com `FORCADA` e `Alt+D` alterna | Toolbar |
| AP13 | `ENCERRADA` sem resultado (por toolbar): "Votação encerrada"; `Enter` e `Shift+E` não fazem nada; a sala diz "O resultado oficial ainda não foi calculado" | Toolbar: urna para trás e para frente |
| AP14 | Encerrada com resultado: "Votação encerrada" e **nenhum** nome, voto ou pontuação no DOM do palco **nem da sala** (inspecionar) | `RESULTADO_PADRAO` |
| AP15 | Erro de rede no ao vivo mantém o último total e o HUD avisa; nenhum alerta no telão; voltar ao normal retoma | Toolbar: erro de rede |
| AP16 | Roteiro de cada cenário bate com a tabela da seção 5.4 (os 10 cenários, real e ensaio) | `conferirRoteiro` + palco |
| AP17 | FV: categorias com os rótulos do seed; ST: "Favorito da comunidade" e "Escolha da banca" e **sem** infantil | Dois eventos |
| AP18 | `RESULTADO_SEM_INFANTIL`: categoria infantil pulada, pesos somam 100, pódio coerente | Cenário |
| AP19 | `RESULTADO_CO_VENCEDORES`: categoria do júri com c02 e c03 e "Co-vencedores" | Cenário |
| AP20 | `FESTIVAL_ENCERRADO`: júri 1 × 1 decide pela pontuação final a favor de c01 e mostra "Desempate pela pontuação final" | Cenário |
| AP21 | `RESULTADO_EMPATE_RESOLVIDO` (ST): cena de desempate **antes** do 3º, lado a lado, "Critério: maior votação do júri", c02 destacado; depois P:3, P:2, P:1 | Cenário |
| AP22 | `RESULTADO_EMPATE_PERSISTENTE` (ST): P:3 (c03), desempate, depois "1º lugar — empate" com c01 e c02; nenhuma tela decide; não há 2º lugar | Cenário |
| AP23 | `RESULTADO_CO_VENCEDORES` (ST): desempate antes do 2º; "2º lugar — empate" com c02 e c03; não há 3º | Cenário |
| AP24 | `RESULTADO_DOIS_CANDIDATOS`: duas cenas de pódio (2º e 1º), com 61,32 e 38,68 | Cenário |
| AP25 | `FESTIVAL_EMPATE_RESOLVIDO`: desempate antes do 3º, c02 em 2º por júri; categorias: popular c03, infantil c01, júri c01 | Cenário |
| AP26 | `FESTIVAL_EMPATE_PERSISTENTE`: P:3, desempate, "1º lugar — empate" (c01 e c02); infantil c03; no tema claro | Cenário |
| AP27 | `FESTIVAL_CO_VENCEDORES`: desempate antes do 2º; "2º lugar — empate" (c02 e c03); júri c02 e c03 | Cenário |
| AP28 | O pódio mostra a **pontuação final** (duas casas, vírgula), nunca votos brutos; a categoria mostra votos brutos | Cenas |
| AP29 | Classificação completa: desligada por padrão; ligada acrescenta a cena (10 linhas por passo; `MUITOS_CANDIDATOS`, com a urna aberta e encerrada pela toolbar, gera 3 páginas), posições compartilhadas, sem desqualificado | Toolbar + cenário |
| AP30 | **Removido (rev. 4, E21).** (Era "votos do júri no telão" com `exibirVotosJuriNoTelao`; a opção não existe mais. Os AP19, AP20 e AP14 já conferem que as categorias mostram só o vencedor.) | — |
| AP31 | Final estático: pódio e categorias, "Apuração por VaiVota", sem animação; números iguais aos da aba Resultado e dos CSV da Etapa 7 | Comparar telas |
| AP32 | Posição compartilhada com mais de 6 nomes (`MUITOS_CANDIDATOS`, abrir e encerrar a urna pela toolbar sem votos: os 24 empatam em 1º) mostra 6 e "+N" no desempate e no pódio | Toolbar + `conferirRoteiro` |
| AP33 | Desqualificar candidato (Etapa 6) depois de revelar gera v2: o palco volta a "Votação encerrada", a sala mostra "O resultado mudou…" e o final de v1 **não** aparece; a v2 revela sem o desqualificado | Configuração |
| AP34 | `CONCLUIDO` com resultado: abre no final estático; "Refazer revelação" desabilitado com motivo; sem resultado: "O resultado oficial ainda não foi calculado" | Toolbar |
| AP35 | Automático, manual, pausar, voltar e avançar sem pular passos; voltar do passo 0 vai ao último passo da cena anterior; um timer atrasado nunca avança duas vezes | `conferirMotor` + palco |
| AP36 | Teclas: `repeat` ignorado; foco em botão ou campo não dispara atalho; `?` mostra e some sozinha; `Enter` na fase aguardando inicia | Teclado |
| AP37 | Sair da tela cheia pausa e avisa; `F` volta; fora da revelação só atualiza o estado; falha de tela cheia mostra `Toast` e segue | Esc nativo |
| AP38 | Sair no meio e voltar: "Continuar de onde parei" abre na cena e no passo certos; "Recomeçar" e "Refazer" pedem confirmação e auditam `REVELACAO_REFEITA` uma vez | Sala + auditoria |
| AP39 | Trailer: link válido (carrega ou cai no gerado por tempo limite), inválido e ausente; sem tela em branco; `T` pula nos dois tipos; "Simular falha do trailer" cai no gerado | Toolbar |
| AP40 | Ensaio de ponta a ponta em **cada um dos 10 cenários**: o JSON do inspetor (`banco`, `resultados`, auditoria, `ui.apresentacao`, relógio, `dev`) é **idêntico** antes e depois; selo ENSAIO sempre visível | Inspetor |
| AP41 | Emergência em cada tipo de cena (trailer, categoria, desempate, pódio, classificação), real e ensaio; real registra `EMERGENCIA_ACIONADA` uma vez e marca concluída | Teclado + auditoria |
| AP42 | As 4 ações de auditoria aparecem **uma vez** cada, sem vencedor, voto ou pontuação em `detalhes`, e com rótulo no catálogo da Etapa 7; falha de auditoria não trava a cerimônia | Dashboard, auditoria |
| AP43 | Reduced motion: sem contagem animada, sem celebração, fades; texto ≥ 36 px no canvas; contraste ≥ 4,5:1 nos dois temas; foco visível na sala; o DOM só tem o passo atual | Emulação do navegador |
| AP44 | Palco legível em 1080p, 4K e 800×450 sem rolagem; console sem erros nem avisos de hidratação; F5 volta ao seed; nenhum e-mail em nenhuma tela | Navegador |
| AP45 | Trailer com som depois do clique (rev. 3, C19): no FV, com o link válido, clicar em **Apresentar** e chegar ao trailer: o vídeo toca **com som** (sem mudo na URL de embed), sem segundo clique; se o navegador bloquear o som, segue mudo sem travar | Palco + áudio |

### 5.15 O que muda em relação ao planner antigo

| Antigo | Agora |
|---|---|
| Apuração e `ResultadoOficial` próprios, "gerado uma vez ao encerrar" | **Etapa 7 é a dona**; o palco lê a **maior versão** e nunca recalcula (E8-3, E8-18) |
| Cenários e fixtures próprios | Cenários da Etapa 7 + **3 do Festival**; ensaio sobre uma cópia descartável (E8-4) |
| "Relógio comprimido" no ensaio | Contador de tiques local, sem tocar no relógio global (T8) |
| `resultadoRevelado` (booleano) | `ui.apresentacao.revelacao` com **assinatura do resultado**; nova versão reinicia a cerimônia (E8-7, E8-16, A13) |
| Rótulos de categoria "do tema" | `ConfigApresentacao.rotuloCategoria*` (E8-8) |
| Duração do trailer "configurada no seed" | Constante em `duracoes.ts` (E8-9, A18) |
| Modo de avanço só da sala | Valor da config + override local (E8-10) |
| "Tempo zerado: encerra sozinho" no palco | O tique da Etapa 0 encerra; o palco só reage (E8-11) |
| Sem fase para rascunho ou concluído | Rascunho abre a pré-votação; concluído abre o final (E8-12, A8) |
| Pódio com "todos com posição ≤ 3" | Uma cena por posição distinta, máximo de 6 nomes por cena (E8-15) |
| Auditoria "fake" genérica | 4 ações do catálogo, só no real (T12, A12) |
| "Alternar júri/público na Etapa 6 muda o vencedor" | Impossível com a urna encerrada (travas e resultado congelado); coberto pelos cenários |
| Votos do júri no telão ignorados | Categorias mostram só o vencedor; nunca quem votou em quem (D13, rev. 4) |
| `useRelogioServidor`, `src/features`, Context | `useAgora`, `components/apresentacao` + `dominio/apresentacao`, store externo (T3 a T5) |
| Toolbar oculta no palco e validação "pela toolbar" | Regra da Etapa 0 (`AUTO`/`FORCADA`) e controle próprio para não depender de `Alt+D` (E8-1, E8-2) |

---

## 6. Estrutura de arquivos

```
src/app/e/[slug]/admin/apresentar/
  page.tsx                            # RotaGuard(ADMIN) + <TelaApresentar />; <main id="conteudo"> na sala

src/components/apresentacao/
  TelaApresentar.tsx                  # alterna sala e palco; liga e desliga ui.palcoAtivo (não monta SimuladorVotos, D15 rev. 3)
  SalaControle.tsx
  AvisosSala.tsx                      # espelhamento, instância única, URL do QR, resultado mudou, incoerente
  EscolhaModo.tsx                     # real × ensaio, cenário, modo de avanço
  PainelRevelacao.tsx                 # continuar, recomeçar, refazer
  RoteiroPublico.tsx
  PreCarregamento.tsx
  Palco.tsx                           # canvas 1920×1080, escala, camadas
  Hud.tsx
  AjudaAtalhos.tsx
  AvisoPausa.tsx
  SeloEnsaio.tsx
  QrPlaca.tsx
  CartaoCandidatoPalco.tsx
  cenas/
    CenaPreVotacao.tsx
    CenaAoVivo.tsx
    CenaEncerrada.tsx
    CenaTrailer.tsx
    TrailerGerado.tsx
    CenaCategoria.tsx
    CenaDesempate.tsx
    CenaPodio.tsx
    CenaClassificacao.tsx
    CenaFinal.tsx
    CenaSemResultado.tsx
  CenaPendente.tsx                    # provisória (CP6 a CP8); apagada no CP8
  hooks/
    useMotor.ts                       # origem "REAL" (store) ou "ENSAIO" (useReducer local)
    useTemporizadorDoPasso.ts         # um setTimeout por (cena, passo, pausado, modo), com limpeza
    useContagemAnimada.ts             # requestAnimationFrame com limpeza; reduced motion = valor final
    usePalcoTeclado.ts
    useTelaCheia.ts
    useEscalaPalco.ts
    useHudVisivel.ts
    useTiqueEnsaio.ts                 # contador de tiques local do ensaio (D5)
    usePreCarregamento.ts
  apresentacao.css                    # keyframes de cena, fades, @media (prefers-reduced-motion)

src/components/dev/secoes/
  SecaoApresentacao.tsx               # toolbar (5.12)

src/dominio/apresentacao/
  tipos.ts                            # Cena, EstadoMotor, AcaoMotor, DadosRevelacao, FasePalco
  fasePalco.ts                        # resolverFasePalco
  roteiro.ts                          # montarRoteiro, montarProps
  roteiroPublico.ts                   # descreverRoteiroPublico
  motor.ts                            # reduzirMotor, duracaoDoPasso
  duracoes.ts
  trailer.ts                          # interpretarLinkTrailer
  assinatura.ts                       # assinaturaDoResultado
  revelacao.ts                        # lerRevelacao
  cenariosEnsaio.ts                   # CENARIOS_ENSAIO
  autotestes.ts                       # conferirRoteiro, conferirMotor, conferirFixturesFestival

src/servicos/
  apresentacao.ts                     # obterStatusResultado, obterEstadoAoVivo, carregarRevelacao,
                                      # obterDadosEnsaio, registrarAcaoApresentacao

src/store/
  acoesApresentacao.ts                # iniciarRevelacao, gravarProgresso, concluirRevelacao, emergencia,
                                      # refazerRevelacao, limparApresentacao
  seletores/apresentacao.ts           # useRevelacao

src/lib/
  textosPalco.ts

src/mocks/
  volume/distribuicoesApresentacao.ts # as 3 distribuições da 5.11
  cenarios/festivalApresentacao.ts    # 3 cenários, registrados em mocks/cenarios.ts

src/app/globals.css                   # + --qr-claro, --qr-escuro (neutros; única exceção de hex além do tema)
```

**Arquivos de outras etapas que esta etapa não toca** (se faltar algo, ajusta-se aqui, não lá): `dominio/apuracao.ts`, `dominio/resultado.ts`, `dominio/travas.ts`, `dominio/contagens.ts`, `servicos/dashboard.ts`, `mocks/volume/gerarVolume.ts`, `mocks/volume/restaurarNucleo.ts`, `store/transicoes.ts`, `lib/useConsulta.ts`, `lib/tempo.ts`, `RotaGuard`, `ContagemRegressiva`. **Exceções:** as erratas mínimas da pendência P12 e os registros de cenário e de seção da toolbar.

---

## 7. Checkpoints

Regras de entrega, convenções de código e dependências aprovadas são as da seção 3.3 da Etapa 0 e **não se repetem**. Cada checkpoint termina com a tela rodando, `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` sem erros (D19 rev. 3), e só avança depois da validação. A ordem põe a lógica pura e os dados primeiro (todas as telas dependem deles), depois a rota e a sala, o palco com as fases, o trailer, o motor ligado, o pódio, os empates, o ensaio e, por último, a revisão.

### CP1 — Conferência, contratos e lógica pura (sem tela)

**Objetivo:** deixar prontos e conferidos o roteiro, o motor, a fase e o trailer, para as cenas só desenharem.

**Tarefas**
- [ ] **Conferir as Etapas 0 a 7 entregues** contra a seção 3.1: `resolverSituacaoEvento`, `resolverFaseConfig`, `obterResultado`, `apurar`, `gerarVolume`, `restaurarNucleo`, `DistribuicaoAlvo`, `SimuladorVotos` (montado no `GateEvento`, D15 rev. 3), os campos `pontosPorGrupo`, `desqualificados` e `pesosEfetivos` de `DadosResultado` (D16 rev. 3), o formato do catálogo de auditoria, `formatarPontuacao` (nome real da função das duas casas e quatro casas) e o registro de cenários. Divergência de **nome** se resolve ajustando este planner, não criando um nome novo.
- [ ] **Conferir a errata (P12)**; já vêm da Etapa 0 rev. 2: (a) `AcaoAuditoria` aceita `REVELACAO_INICIADA`, `REVELACAO_CONCLUIDA`, `REVELACAO_REFEITA`, `EMERGENCIA_ACIONADA`; **fazer aqui** o catálogo de exibição da Etapa 7 com os quatro rótulos (grupo "Apresentação"); (b) `EstadoUi.apresentacao` e `EstadoDev.simularTrailerFalha` com valor inicial; (c) `resetarMock`, `aplicarCenario` e `forcarEstadoUrna` para trás zeram `ui.apresentacao`; (d) `--qr-claro` e `--qr-escuro` em `globals.css`; (e) **fazer aqui:** `pnpm add qrcode.react@<versão fixada>`. Registrar no Contexto o que precisou ser aplicado.
- [ ] `dominio/apresentacao/tipos.ts` (seções 5.2, 5.4 e 5.5) e `duracoes.ts`.
- [ ] `fasePalco.ts` (`resolverFasePalco`) com **toda** a tabela da seção 5.1.
- [ ] `assinatura.ts` (`assinaturaDoResultado`: `hashDeTexto` sobre `(versao, motivo, calculadoEm, pesos, dados)` serializados em ordem estável, D14 rev. 3) e `revelacao.ts` (`lerRevelacao`, com `motivoDescartada`).
- [ ] `roteiro.ts` (`montarRoteiro`, `montarProps`) e `roteiroPublico.ts`, com as 8 regras da seção 5.4.
- [ ] `motor.ts` (`reduzirMotor`, `duracaoDoPasso`) com o par `(cena, passo)` do `AVANCO_AUTOMATICO`.
- [ ] `trailer.ts` (`interpretarLinkTrailer`) com os formatos da seção 5.8.
- [ ] `cenariosEnsaio.ts` (`CENARIOS_ENSAIO`) e a conferência de que cada id existe no registro de cenários.
- [ ] `autotestes.ts`: `conferirRoteiro()` (os 10 roteiros da seção 5.4, real e ensaio, mais os casos extremos: urna sem votos com 24 candidatos, 1 candidato, 0 candidatos, empate fora do pódio e empate em `[3, 4]` resolvido e persistente), `conferirMotor()` (avanço, volta entre cenas, ação automática atrasada ignorada, emergência, `DEFINIR_MODO`, `REINICIAR`) e a assinatura do `conferirFixturesFestival()` (corpo no CP2).
- [ ] **Casos extremos de `conferirRoteiro`** acompanham a conta feita à mão (como na seção 5.4): quando houver dúvida, vale a tabela da seção 5.4.
- [ ] **Testes Vitest (D19 rev. 3)** ao lado de cada módulo de `dominio/apresentacao/` (`*.test.ts`): `roteiro.test.ts` (`montarRoteiro`: os 10 roteiros da seção 5.4 e os casos extremos), `motor.test.ts` (`reduzirMotor`), `fasePalco.test.ts`, `trailer.test.ts`, `assinatura.test.ts` (muda com `calculadoEm`) e `revelacao.test.ts`.
- [ ] **Empate triplo (rev. 3, E24):** fixture de `DadosResultado` em `roteiro.test.ts` com 3 candidatos empatados em 1º (1-1-1-4) e com 3 empatados em 2º (1-2-2-2): `montarRoteiro` gera uma cena de desempate e uma cena de pódio com os três nomes, sem cena para as posições que não existem.

**Fica fake:** nada novo; tudo é função pura.

**Pronto quando:** `conferirRoteiro()` e `conferirMotor()` voltam vazios; `pnpm test` passa; `lint`, `typecheck` e `build` limpos; `verificarInvariantes` e `conferirApuracao` seguem vazias; o Contexto registra o resultado da conferência da errata.

**Entrega:** `VaiVota-E8-CP1.zip`

### CP2 — Serviços, fixtures do Festival e toolbar

**Objetivo:** dados e fronteira de leitura prontos, com a toolbar para forçar cada variação.

**Tarefas**
- [ ] `servicos/apresentacao.ts` com os cinco serviços da seção 5.3 e as regras comuns (admin do evento, só `simularErroRede`, sem e-mail nem hash).
- [ ] `store/acoesApresentacao.ts` e `store/seletores/apresentacao.ts` (`useRevelacao` filtrado por `chave`).
- [ ] `mocks/volume/distribuicoesApresentacao.ts` e `mocks/cenarios/festivalApresentacao.ts`: os 3 cenários, **idempotentes**, com a conferência de invariantes (I7 e I8 incluídas) nos dois eventos.
- [ ] `conferirFixturesFestival()` (corpo): compara posições, empates, categorias e soma 100 com a tabela da seção 5.11.
- [ ] `SecaoApresentacao.tsx` registrada na toolbar, com todos os controles da seção 5.12 e o botão "Conferir roteiro e motor".
- [ ] `lib/textosPalco.ts` com os textos da seção 5.13.
- [ ] Rota `apresentar/page.tsx` ainda com o stub da Etapa 0, para o link do `AdminShell` continuar funcionando.

**Fica fake:** os serviços rodam no cliente; o "servidor" é o store.

**Pronto quando:** cada um dos 10 cenários aplica e reaplica com o mesmo resultado; `conferirFixturesFestival()` vazia; `obterStatusResultado` nunca devolve `DadosResultado`; o ensaio de um cenário **não** altera o JSON do inspetor; Ana e Hugo (no evento errado) recebem `NAO_AUTORIZADO` de todos os serviços; os controles da toolbar mudam a `ConfigApresentacao` do evento ativo e as invariantes ficam vazias.

**Entrega:** `VaiVota-E8-CP2.zip`

### CP3 — Rota, guarda e sala de controle

**Objetivo:** o admin entra, vê o estado, prepara e clica em **Apresentar**.

**Tarefas**
- [ ] `apresentar/page.tsx` com `RotaGuard(ADMIN)` e `TelaApresentar` (fora do `AdminShell`); `<main id="conteudo">`; `h1`.
- [ ] `SalaControle`: cabeçalho com selos e a fase em que o palco vai abrir (`resolverFasePalco`); `AvisosSala` (espelhamento, instância única, URL do QR com o aviso de `localhost`, resultado mudou, incoerente).
- [ ] `EscolhaModo` (real × ensaio, cenário, modo de avanço com o override local em `ui.apresentacao`), `PainelRevelacao` (continuar, recomeçar, refazer, com `DialogoConfirmacao` e a auditoria `REVELACAO_REFEITA`), `RoteiroPublico` e lista de atalhos.
- [ ] `PreCarregamento` com `progress`, tolerância a imagem quebrada (placeholder e aviso) e sem travar.
- [ ] A sala consulta **só** `obterStatusResultado` (nunca o resultado). Conferir no DOM e no console.
- [ ] Botão **Apresentar**: liga `ui.palcoAtivo`, monta um palco **mínimo** (um `Palco` vazio com o fundo do tema, o `F` e o `Q`) e pede a tela cheia; falha de tela cheia mostra `Toast` e segue.
- [ ] **Não** montar o `SimuladorVotos` (rev. 3, D15): conferir que ele já roda pelo `GateEvento` (Etapa 7) com a sala aberta, a urna `ABERTA` e a flag ligada, e que o total da sala e do palco sobe só por leitura.

**Fica fake:** o pré-carregamento mede só imagens por caminho ou `blob:` (as `placeholder:` não usam rede).

**Pronto quando:** AP1, AP2 e AP14 (parte da sala) passam; a sala não contém nenhum dado de resultado; "Refazer" confirma e audita uma vez; o botão fica desabilitado durante o pré-carregamento; o palco mínimo escala corretamente em janela pequena, em 1080p e em 4K; sair desliga `ui.palcoAtivo`.

**Entrega:** `VaiVota-E8-CP3.zip`

### CP4 — Palco e fases: pré-votação, ao vivo e encerrada

**Objetivo:** o palco responde ao estado da urna, em tempo real, nos dois eventos.

**Tarefas**
- [ ] `Palco` completo: canvas 1920×1080, `useEscalaPalco`, `useTelaCheia` (pausa ao sair), `usePalcoTeclado` (`F`, `Q`, `?`, `Espaço`, `Enter`; os demais ligam no CP6), `Hud`, `AjudaAtalhos`, `AvisoPausa`, `SeloEnsaio` (usado no CP9).
- [ ] `CenaPreVotacao`, `CenaAoVivo` (cards paginados, `QrPlaca`, `ContagemRegressiva`, total geral por `useConsulta` a 5 s, parcial por candidato só com a flag, mensagem de abertura **derivada do relógio**, reta final, tempo esgotado), `CenaEncerrada`, `CenaSemResultado`.
- [ ] `QrPlaca` com `QRCodeSVG` (D17) e o endereço em texto; URL montada no clique de Apresentar.
- [ ] Reação em tempo real ao store e ao relógio; `LiveRegion` anunciando só mudanças de fase.
- [ ] `apresentacao.css` com os estados, `prefers-reduced-motion` e a rotação de páginas.
- [ ] Texto mínimo de 36 px e degraus de fonte para títulos longos (D8).

**Fica fake:** o total ao vivo vem do store (e do simulador de votos); o QR aponta para o `origin` atual, que pode não ser acessível de um celular.

**Pronto quando:** AP3 a AP15 passam, percorrendo a tabela da seção 5.1 pela toolbar linha a linha; mudar o relógio altera o temporizador; **com a flag do parcial desligada nenhum voto por candidato existe no DOM**; `MUITOS_CANDIDATOS` (24) pagina em 3 telas sem rolagem; legível nos dois temas; escalas 1080p, 4K e 800×450.

**Entrega:** `VaiVota-E8-CP4.zip`

### CP5 — Trailer

**Objetivo:** abrir a revelação com o trailer do evento, com fallback.

**Tarefas**
- [ ] `CenaTrailer` e `TrailerGerado` (nome, logo, data, identidade; com a opção, cartazes e nomes dos candidatos em grupos de 8).
- [ ] `interpretarLinkTrailer` ligado ao iframe (`allow`, `title`, `referrerpolicy`), `onLoad` → `TRAILER_PRONTO`, tempo limite de 8 s → `TRAILER_FALHOU`, `dev.simularTrailerFalha` (iframe nem montado).
- [ ] `T` e o botão da HUD pulam o trailer; em modo manual o admin avança.
- [ ] Fade simples em `prefers-reduced-motion`.
- [ ] Montagem **provisória** da cena no palco (o roteiro real chega ao CP6): botão "Ver trailer" na sala, visível só com `NEXT_PUBLIC_DEV_TOOLBAR` ligado e **removido no CP6**.

**Fica fake:** sem a API do YouTube ou do Vimeo, o fim vem de duração constante e a falha de tempo limite (P4).

**Pronto quando:** AP39 e AP45 (som depois do clique) passam; AP39 nos três caminhos (link válido, inválido, ausente), sem tela em branco; `T` pula nos dois tipos; o gerado respeita o tema nos dois eventos (FV sem `usarTrailerGerado` usa o link; ST usa o gerado porque o seed não tem `trailerUrl`).

**Entrega:** `VaiVota-E8-CP5.zip`

### CP6 — Revelação: categorias, controles e progresso

**Objetivo:** o motor roda de verdade, com as três categorias, no modo real.

**Tarefas**
- [ ] `useMotor("REAL")` sobre `ui.apresentacao.revelacao`; `iniciarRevelacao` chama `carregarRevelacao` (uma vez), com estado "Preparando a revelação" **neutro** e falha só no HUD; audita `REVELACAO_INICIADA` (fire and forget).
- [ ] `useTemporizadorDoPasso` com as regras do React Compiler (5.5).
- [ ] `CenaCategoria` (suspense → nome → votos; co-vencedores; "Desempate pela pontuação final"; só o vencedor, sem votos identificados, D13 rev. 4) e `montarProps`.
- [ ] Modos **automático** e **manual**, pausa, avançar e voltar; `DEFINIR_MODO` pela HUD; todos os atalhos do 5.7.
- [ ] **Continuar de onde parei** e **Recomeçar** (sala), com progresso mantido; **assinatura** invalida o progresso quando o resultado muda (D4).
- [ ] Ligar o roteiro completo de `montarRoteiro` ao palco e remover o botão "Ver trailer" do CP5. As cenas ainda não construídas (pódio, classificação, final no CP7; desempate no CP8) renderizam `CenaPendente` (só com a toolbar ligada: nome da cena e do passo), que o avanço atravessa normalmente.
- [ ] HUD com auto-ocultação e ajuda.

**Fica fake:** nada novo além do conjunto (o resultado vem do store).

**Pronto quando:** AP16 (parte de trailer e categorias), AP17 a AP20, AP35 a AP38 passam (AP30 removido, rev. 4); nenhuma categoria mostra quem votou em quem; sair e voltar continua da cena certa; desqualificar um candidato (Etapa 6) depois de revelar reinicia a revelação com o aviso na sala; nenhum elemento de interface no palco além da cena (a HUD só aparece com o mouse); a `LiveRegion` não anuncia nomes antes de aparecerem; o DOM só tem o passo atual.

**Entrega:** `VaiVota-E8-CP6.zip`

### CP7 — Pódio, classificação e final estático

**Objetivo:** fechar a revelação.

**Tarefas**
- [ ] `CenaPodio` (suspense → nomes → pontuação final, com `useContagemAnimada` e celebração do 1º em CSS, ambos desligados em reduced motion); posição compartilhada; máximo de 6 nomes e "+N" (D12).
- [ ] `CenaClassificacao` (opcional; páginas de 10; sem destaque negativo; sem desqualificado).
- [ ] `CenaFinal` (pódio e categorias, "Apuração por VaiVota"; **sem animação**) e o estado "Nenhum candidato na disputa".
- [ ] `concluirRevelacao` marca `CONCLUIDA` na **primeira** chegada ao `FINAL`, audita `REVELACAO_CONCLUIDA` e reabrir o palco abre no final estático; **Refazer** (sala) volta ao início.
- [ ] Evento `CONCLUIDO`: abre direto no final estático (D3), sem cerimônia e sem Refazer.
- [ ] Remover `CenaPendente` do pódio, da classificação e do final.

**Pronto quando:** AP16 completo (roteiros sem desempate), AP24, AP28, AP29, AP31, AP34 passam; os números do final estático batem com a aba Resultado e com o CSV da Etapa 7; reabrir depois de revelada abre no final e "Refazer" volta ao início; `RESULTADO_DOIS_CANDIDATOS` mostra o pódio com 2 nomes.

**Entrega:** `VaiVota-E8-CP7.zip`

### CP8 — Empates

**Objetivo:** animação de desempate e posição compartilhada.

**Tarefas**
- [ ] `CenaDesempate`: **lado a lado**, **critério** na tela com os votos no grupo do critério, **vencedor destacado** (com o texto "Vencedor") ou "Posição compartilhada, sem decisão automática"; nota "Módulo do júri desligado" quando o critério aplicado diferir do configurado; limite de 6 nomes.
- [ ] Posições compartilhadas no pódio (1-1-3, 1-2-2-4) e no final estático e na classificação; ordem de exibição dentro do empate estável por `ordem`.
- [ ] Categoria com co-vencedores já mostra a indicação "pontuação final também empata" (CP6); conferir com os cenários.
- [ ] `conferirRoteiro()` cobre as inserções de desempate nos 10 cenários; remover o último uso de `CenaPendente` (o arquivo é apagado).

**Pronto quando:** AP21 a AP27 e AP32 passam; nenhuma tela decide um vencedor onde a regra não decide; o 3º aparece **depois** do 1º compartilhado no cenário persistente e não há 2º lugar; tudo coerente com o `ResultadoOficial` e com a aba Resultado; legível no tema claro do Festival.

**Entrega:** `VaiVota-E8-CP8.zip`

### CP9 — Ensaio e emergência

**Objetivo:** ensaiar sem risco e ter uma saída rápida.

**Tarefas**
- [ ] `obterDadosEnsaio` ligado à sala (seletor de cenário do evento; "Preparando…"; falha na sala).
- [ ] `useMotor("ENSAIO")` (`useReducer` local) e `useTiqueEnsaio` (contador local); `AO_VIVO_ENSAIO` (20 s, total subindo) e `ENCERRADA_ENSAIO`, depois a revelação e o final.
- [ ] `SeloEnsaio` sempre visível; **nenhuma** escrita em `banco`, `resultados`, auditoria, `dev`, relógio ou `ui.apresentacao`.
- [ ] Emergência (`Shift+E`) real e ensaio, em **todas** as cenas, inclusive no desempate e no trailer; real audita `EMERGENCIA_ACIONADA` uma vez.
- [ ] Sair do ensaio (`Q` ou HUD) volta à sala sem confirmação e sem efeito colateral; real depois do ensaio começa do zero.
- [ ] Auditoria das quatro ações **só no modo real**; catálogo da Etapa 7 exibe os rótulos.

**Pronto quando:** AP40 a AP42 passam: o ensaio de ponta a ponta nos **10 cenários** deixa o JSON do inspetor **idêntico**; `Shift+E` funciona em todas as cenas; o ensaio de um cenário **não** fecha nem abre a urna real; a falha de auditoria não trava; **nenhum** `Date.now()`, `performance.now()` nem `setInterval` sem limpeza fora de `relogio.ts`.

**Entrega:** `VaiVota-E8-CP9.zip`

### CP10 — Revisão e fechamento

**Objetivo:** acabamento, revisão geral e verificação.

**Tarefas**
- [ ] Percorrer a **matriz AP1–AP45** (AP30 removido, rev. 4) e marcar cada item (comparar pelo inspetor).
- [ ] Conferir o palco em 1080p, 4K e 800×450; **tema claro do Festival** e **tema escuro da Maratona Tech Tivit** nas cenas de pódio, desempate e categoria (contraste ≥ 4,5:1 e texto ≥ 36 px); comparar com a prévia "Telão" da Etapa 6 e registrar divergências visuais (P5).
- [ ] `prefers-reduced-motion`; acessibilidade da sala (foco, teclado, rótulos, 360, 768 e 1280 px); `LiveRegion` do palco; DOM só com o passo atual.
- [ ] **`grep`s de fronteira:** nenhum acesso a `votos`, `votosJuri`, `historicoVotosJuri`, `votosInfantis` nem `resultados` fora de `store/seletores/**`, `servicos/**`, `store/transicoes.ts` e `mocks/**`; nenhum hex de marca fora de `src/mocks/seed/`, `globals.css` e `components/dev/`; nenhum `<a href>` interno; nenhum `Date.now`, `performance.now` nem `Math.random` fora de `relogio.ts`; nenhum `localStorage`; nenhum import de `@/mocks` em `src/app/**`, `src/components/**` e `src/lib/**`.
- [ ] Revisar textos em pt-BR, neutralidade de gênero e rótulos; nenhum e-mail em tela.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` limpos e **console sem erros nem avisos de hidratação**; `verificarInvariantes`, `conferirApuracao`, `conferirRoteiro`, `conferirMotor` e `conferirFixturesFestival` vazias nos 10 cenários.
- [ ] Atualizar o Contexto (seção 10): `ui.apresentacao`, `dev.simularTrailerFalha`, 3 cenários, 4 ações de auditoria, errata P12 (conferida), matriz AP1–AP45.

**Pronto quando:** a matriz inteira está marcada; os `grep`s não encontram nada (inclusive `CenaPendente` e o botão "Ver trailer"); nenhum controle provisório sobrou.

**Entrega:** `VaiVota-E8-CP10.zip` (final da Etapa 8)

---

## 8. O que fica fake

| Item | Tratamento |
|---|---|
| Persistência | Nenhuma; o F5 e qualquer nova aba voltam ao seed (D18 da Etapa 0). O progresso da revelação vive só em memória |
| "Servidor" | Os serviços rodam no cliente. Na trilha de produção (Prisma + Supabase) as mesmas validações (admin do evento, resultado só depois do encerramento) vão para o servidor, e o resultado só sai pela API |
| Resultado | Gerado de verdade por `apurar` (Etapa 7) sobre votos do volume e dos cenários; o ensaio usa o mesmo caminho sobre uma cópia |
| Hora do servidor | Relógio mock da Etapa 0 (com deslocamento da toolbar). O ensaio usa um contador local |
| Total ao vivo | Lido do store a cada 5 s; votos "chegando" vêm do `SimuladorVotos` da Etapa 7, montado no `GateEvento` (esta etapa só lê) |
| QR Code | Gerado de verdade por `qrcode.react`, mas aponta para o `origin` atual (em `localhost` o celular pode não alcançar) |
| Trailer por link | Sem API do YouTube ou do Vimeo: duração constante e falha por tempo limite (P4) |
| Trailer gerado | CSS e dados do evento, sem vídeo real (no produto também: nunca se armazena vídeo; o trailer real é sempre link/embed, rev. 4) |
| Auditoria | Registro no `banco` mock, só no modo real, com `ipHash` constante |
| Tela cheia | API real do navegador; a validação em outro monitor (estender a tela) é manual |
| Sincronização entre telas, controle remoto, "Ver Apresentação" | Não existe (D18 da Etapa 0) |
| Trilha sonora e efeitos | Não existem |
| `votosPorMinutoSimulados` do ensaio | Derivados do cenário, só para a curva do total ao vivo |

## 9. Critérios de aceitação

- [ ] Só o admin **do evento** acessa a rota; deslogado vai ao login; Ana, Bruno, Davi e Hugo (no evento errado) veem `AcessoRestrito` sem nenhum dado, e os serviços também recusam.
- [ ] A sala **não contém** resultado nem existência de empate; o roteiro da sala lista só nomes de cena; antes da revelação o DOM do palco e da sala não tem vencedor, voto ou pontuação.
- [ ] O palco responde a **todas** as combinações da tabela da seção 5.1, em tempo real, inclusive rascunho, concluído e combinações incoerentes, com a precedência `CONCLUIDO` > `RASCUNHO` > urna.
- [ ] No ao vivo aparecem cards, QR Code (com o endereço em texto), temporizador pelo **relógio simulado** e total geral; **sem votos por candidato** por padrão, e com a flag desligada o dado não existe no DOM.
- [ ] `TEMPO_ESGOTADO` mostra "Tempo esgotado" sem encerrar a urna; com encerramento automático, o palco apenas reage ao encerramento feito pelo relógio.
- [ ] A revelação segue a ordem da seção 5.4 nos 10 cenários, pula categorias sem módulo ou sem vencedor, e `conferirRoteiro()` fica vazio.
- [ ] O trailer cai no gerado se o link falhar, for inválido, ausente ou `usarTrailerGerado` estiver ligado, e pode ser pulado a qualquer momento.
- [ ] O pódio mostra a **pontuação final** (duas casas; quatro se houver colisão) e revela 3º → 2º → 1º; com menos de 3 candidatos mostra os que existirem; com posição compartilhada mostra todos na mesma cena (máximo de 6 e "+N").
- [ ] Empates aparecem com a cena de desempate, critério na tela e vencedor destacado; empate persistente vira "posição compartilhada, sem decisão automática"; categorias empatadas mostram co-vencedores.
- [ ] A classificação completa fica desligada por padrão, entra só com a opção ligada e não mostra candidato fora da disputa.
- [ ] As categorias mostram **só o vencedor** (e seus votos); nenhuma tela do palco mostra quem votou em quem (rev. 4, E21).
- [ ] Dashboard, CSV, relatório e telão mostram **os mesmos números** e leem a **maior versão** do resultado; **nada é recalculado** no palco.
- [ ] Nova versão do resultado depois da revelação (desqualificação, cenário) reinicia a cerimônia com aviso na sala; o final antigo não aparece.
- [ ] O modo ensaio percorre `ao vivo → encerrada → revelação → final` nos 10 cenários **sem alterar** `banco`, `resultados`, auditoria, `ui.apresentacao`, relógio nem `dev`, e com o selo ENSAIO sempre visível.
- [ ] `Shift+E` leva ao final estático **em qualquer cena**, no real (com auditoria) e no ensaio.
- [ ] Atalhos funcionam sem repetir ao segurar a tecla; o palco não mostra controles; sair da tela cheia **pausa** em vez de encerrar; falha de tela cheia não trava.
- [ ] A cerimônia **não espera por serviço** depois de carregada; falha de auditoria ou de leitura não trava o avanço.
- [ ] Palco legível em 1080p, 4K e 800×450, nos dois temas, com texto ≥ 36 px, contraste ≥ 4,5:1, `prefers-reduced-motion` respeitado e informação nunca só por cor ou animação.
- [ ] Os autotestes (`conferirRoteiro`, `conferirMotor`, `conferirFixturesFestival`), `conferirApuracao` e `verificarInvariantes` ficam vazios depois de cada ação.
- [ ] Nenhum texto concorda em gênero com o rótulo do tema; nenhum e-mail aparece.
- [ ] Os `grep`s de fronteira do CP10 não encontram nada; `lint`, `typecheck`, `test` (Vitest de `montarRoteiro`, motor, fase, trailer e assinatura, incluindo o empate triplo) e `build` limpos em todos os checkpoints; console sem erros nem avisos de hidratação.

## 10. Pendências

- **P1 — Teclas:** `Shift+E` (emergência) e `Q` (sair) estão assumidas; confirmar com quem vai operar no dia que não conflitam com o hábito nem com atalhos de teclado do navegador. **[Usuário]**
- **P2 — Modo de avanço padrão:** **Resolvida (rev. 3, B1):** confirmado automático com pausa (`ConfigApresentacao.modoAvanco`), conforme `DocumentDesign.md` §8.4.
- **P3 — Durações:** **Resolvida (rev. 4, E21):** valores de `duracoes.ts` mantidos (sem a duração "categoria do júri com votos", removida); ajustes finos no ensaio.
- **P4 — Fim do trailer por link:** **Resolvida (rev. 3, E20): trilha de produção** (rev. 4, A2) — na versão real, o fim e o erro são detectados pela API do player (YouTube e Vimeo); na Fase 1 seguem a duração fixa e o tempo limite, e um vídeo "indisponível" carregado não é detectado.
- **P5 — Direção visual:** o palco usa os tokens do tema como estão (D8), sem paleta escura derivada; animações e a cena de desempate são uma primeira proposta, a ajustar vendo rodar e comparando com a prévia "Telão" da Etapa 6. Continua pendente (rev. 3 e rev. 4, E22: revisar no ensaio). **[Usuário]**
- **P6 — "Apuração por VaiVota" no final estático (A16):** **Resolvida (rev. 3, E25): confirmado** — discreto, só no final estático; o texto exato entra na revisão única de textos (P9).
- **P7 — Votos do júri no telão:** **Resolvida (rev. 4, E21):** nunca se mostra quem votou em quem; a opção `exibirVotosJuriNoTelao` foi removida e as categorias mostram só o vencedor.
- **P8 — Posição compartilhada no pódio:** **Resolvida (rev. 3, E23):** confirmado mostrar todos os empatados na mesma cena, com limite de 6 e "+N".
- **P9 — Textos finais** do palco, da sala e dos avisos: revisão única de textos com a organização (rev. 3, E30). **[Usuário]**
- **P10 — Persistência da revelação:** **Resolvida (rev. 3, E18): trilha de produção** (rev. 4, A2) — na versão real, o passo da revelação é salvo no servidor; na Fase 1 continua só em memória (reinicia no F5).
- **P11 — `qrcode.react`:** única dependência nova da etapa (aprovada na seção 3.3 da Etapa 0). Se preferir zero dependências, o QR vira um desenho fictício na Fase 1. **[Usuário]**
- **P12 — Errata mínima nas Etapas 0 e 7:** **incorporada na Etapa 0 rev. 2 (Anexo C)**, exceto o catálogo de exibição (Etapa 7) e a instalação de `qrcode.react`, que são feitos no CP1 desta etapa. **[Mescla]**
- **P13 — Empate com três ou mais candidatos:** **Resolvida (rev. 3, E24):** coberto por teste Vitest de empate triplo em `montarRoteiro` (`roteiro.test.ts`, CP1: 1-1-1-4 e 1-2-2-2), sem cenário novo.
- **P14 — Mesma janela (D17):** **Resolvida (rev. 3, E19): trilha de produção** (rev. 4, A2) — na versão real o palco abre em janela própria; na Fase 1 continua na mesma janela (outra aba reinicia o seed).
- **P15 — Cerimônia depois de Concluir:** hoje o evento concluído abre direto no final estático (A8, D3). Se a organização precisar da cerimônia mesmo assim (concluir antes de revelar), a trava teria de permitir. **[Usuário]**
- **P16 — Nova versão depois da revelação:** o palco reinicia a cerimônia (A13). Alternativa: manter o final antigo com aviso de "resultado mudou". **[Usuário]**
- **P17 — Citações do `DocumentDesign.md`:** **Resolvida (rev. 3, B1):** o DD v1.1 existe na raiz; a fórmula, o desempate, o resultado congelado e os padrões de apresentação foram conferidos em §8.1 a §8.4 (P2 fechada por §8.4); textos ficam em P9.
