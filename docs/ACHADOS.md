# Achados

Registro da Etapa 9 (seção 5.1): uma linha por desvio. Classes: `BLOQUEIA_FASE2` (bloqueia a troca do mock pelo banco real; corrigir), `PODE_ESPERAR` (backlog) e `DECISAO` (depende do dono do produto). Também registra as divergências de nome e de número achadas ao implementar as Etapas 7 e 8 (08/10/2026).

| ID | CP | Onde | O que acontece / O que era esperado | Classe | Etapa dona | Status |
|---|---|---|---|---|---|---|
| A-001 | 9/CP2 | Rotas `/e/[slug]/*` e `/admin/*` | Todas as rotas do evento tinham o mesmo `<title>` (ou nenhum, no admin). / Título distinto por rota (5.6) | PODE_ESPERAR | 9 | CORRIGIDO (CP2: `metadadosDaTela`) |
| A-002 | 9/CP6 | `components/relatorio/relatorio.print.css` | Cores de impressão em hex. / Hex só em seed, `globals.css` e `components/dev/` (5.9) | BLOQUEIA_FASE2 | 7 | CORRIGIDO (CP6: palavras-chave `black`/`white`) |
| A-003 | 7/CP1 | `dominio/invariantes.ts` | A "I8" da Etapa 7 (apuração) é a invariante **9** no código, porque a 8 já é a da imagem obrigatória (rev. 3, C5). / Planner fala em I1 a I8 | PODE_ESPERAR | 7 (planner) | ABERTO: ajustar o planner (nome, não código) |
| A-004 | 7/CP2 | Seed de volume da Semana Tech | A auditoria do `PADRAO` tem **27** entradas da Semana Tech (9 `CONVITE_RESGATADO`, um por convite usado). / A tabela de metas pedia 25 com 7 resgates, o que contradiz os 9 convites usados | PODE_ESPERAR | 7 (planner) | ABERTO: ajustar a meta para 27 (coerência com os dados) |
| A-005 | 7/CP2 | Série do `PADRAO` | Pico no minuto 35 (15 votos). / "Por volta do 40º minuto" | PODE_ESPERAR | 7 | BACKLOG |
| A-006 | 9/CP2–CP5, CP8 | Todas as telas | Nada foi conferido em navegador: o navegador automatizado é encerrado nesta máquina (Cold Turkey). Matrizes A, B e X, responsividade, Lighthouse/axe, teclado, impressão do relatório, palco em tela cheia e roteiro em `next start` ficam para conferência manual. As regras puras e os serviços foram conferidos por teste | — | 9 | ABERTO (conferência manual) |
| A-007 | 8/CP1 | `components/apresentacao/` | Estrutura consolidada: as cenas ficaram em `cenas/CenasFase.tsx`, `CenaTrailer.tsx` e `CenasRevelacao.tsx`; os hooks em `hooks.ts`; sala, avisos, escolha de modo e revelação num só `SalaControle.tsx`. / Planner lista um arquivo por componente | PODE_ESPERAR | 8 | BACKLOG |
| A-008 | 7/CP3 | `TelaDashboard` (Abas) | Ao trocar de aba pelas setas o foco fica na aba (padrão WAI-ARIA das `Abas` da Etapa 0). / 5.13 da Etapa 7 pedia o foco no painel | DECISAO | 7 | ABERTO |
| A-009 | 8/CP2 | `lib/textosPalco.ts` | "Nenhum candidato na disputa" tem o rótulo fixo "candidato" (texto da lista 5.13 da Etapa 8). / Busca 5.9: rótulo vem do tema | PODE_ESPERAR | 8 | BACKLOG (revisão única de textos, E30) |
| A-010 | 7/CP2 | Cenários de resultado | Além dos passos da 5.12, os cenários registram `URNA_ENCERRADA` (Semana Tech: manual por Carla; Festival: automático) e, no Festival, `URNA_ABERTA`, para a auditoria ficar coerente com o estado | PODE_ESPERAR | 7 (planner) | ABERTO: registrar no planner |
| A-011 | 7/V28 | Toolbar | V28 (desligar o júri depois do `RESULTADO_EMPATE_PERSISTENTE`) não é reproduzível: a toolbar recusa desligar o júri com convite usado (D24 da Etapa 6). O caso está coberto pela fixture `JURI_DESLIGADO` de `conferirApuracao` | DECISAO | 6/7 | ABERTO |
| A-012 | 9/CP2 | `/e/[slug]/admin/apresentar` | A sala (fora do `AdminShell`) não tinha caminho de volta ao painel. / X1: nenhuma rota exige digitar URL para sair | BLOQUEIA_FASE2 | 8 | CORRIGIDO (CP2: "Voltar ao painel") |
| A-013 | 7/CP1 | `dominio/resultado.ts` | `congelarResultado` (domínio) lê o relógio por `store/ambiente` quando `calculadoEm` não é passado. Todos os gatilhos atuais passam o instante | PODE_ESPERAR | 7 | BACKLOG |
| A-014 | 9/CP9 | Repositório | Tag `fase1-prototipo` e zip final não criados: nenhum commit foi pedido nesta sessão | — | 9 | ABERTO (fazer na aprovação) |

Nenhum `BLOQUEIA_FASE2` aberto entre os achados de código. A-006 impede marcar a Fase 1 como aprovada até a conferência manual.
