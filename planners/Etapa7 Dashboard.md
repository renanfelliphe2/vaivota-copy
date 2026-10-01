# VaiVota — Fase 1 · Etapa 7: Dashboard

> Status: proposta de planner, pronta para revisão.
> Fase: 1 (interface mockup, sem banco, sem persistência).
> Depende de: Etapa 0 (tokens, store, seed, dev toolbar), Etapa 3 (sessão e papel admin), Etapa 5 (votos alimentam as contagens) e Etapa 6 (módulos, pesos e convites).
> Alimenta: Etapa 8 (Apresentação), que **reutiliza o mesmo resultado oficial** definido aqui.
> Fontes: `Dashboard.md` (seções 3 a 11), `DocumentDesign.md` (5.4, 7.5, 8.3, 9), `Jurado.md` (seções 5 e 8).
> Stack: Next.js (App Router) + React 19 + Tailwind 4.

## 1. Objetivo

Entregar o painel do admin em `/e/[slug]/admin` com as abas **Operação** (ao vivo) e **Resultado** (após o encerramento), a exportação de dados e o relatório imprimível. Todos os números vêm do store em memória, mudam conforme o estado da urna e dos módulos, e podem ser **conferidos entre si** (os totais batem com a soma das partes e com o que o telão da Etapa 8 mostrará).

## 2. Escopo

**Dentro:**
- Casca do painel admin (cabeçalho, estado da urna, abas, aviso de somente leitura).
- Aba **Operação**: totais, votos por minuto, participantes, jurados pendentes, totens, códigos de jurado e resumo de auditoria.
- Aba **Resultado**: resultado oficial congelado, categorias, empates, linha do tempo, classificação completa e votos identificados do júri.
- Exportação em CSV (6 arquivos) com regra de disponibilidade por estado.
- Relatório imprimível (`window.print()` com CSS de impressão).
- Controle de acesso (só admin do evento).
- Atualização "ao vivo" simulada por polling sobre o store.

**Fora desta etapa:**
- Botões de **Abrir urna / Encerrar urna / Concluir Evento** e edição de pesos (Etapa 6). O dashboard só **lê** o estado e oferece atalhos de navegação.
- Telão e revelação (Etapa 8). Aqui só há o atalho "Abrir apresentação".
- Geração de PDF no servidor, retenção/anonimização de dados e super admin (fora do MVP, conforme `Dashboard.md`).
- Gráficos avançados.

## 3. Decisões e premissas

| Tema | Decisão |
|---|---|
| Fonte única dos números | Funções de consulta em `src/mocks/dashboard.queries.ts`, lendo o store. As telas **nunca** calculam nada por conta própria. |
| Resultado oficial | Função pura `calcularResultado(contagens, config)` aplica a fórmula do DD (cada lado normalizado × peso) e o desempate. É chamada uma vez quando a urna passa para **encerrada** e o retorno fica **congelado** no store (`resultadoOficial`). A Etapa 8 lê esse mesmo objeto. |
| Contagens | Seed inicial mais incremento a cada voto feito na Etapa 5. Assim o dashboard reage ao fluxo real de votação do protótipo. |
| Votos ao vivo | Opção "Simular votos entrando" na dev toolbar (+N votos a cada 3 s, só com urna aberta). Desligada por padrão. |
| Polling | Hook `usePolling(consulta, 5000)`. Hoje lê o store; nas fases seguintes troca para `fetch` sem alterar as telas. |
| Gráficos | **SVG próprio** em componentes pequenos (linha e barras), sem biblioteca nova. Se a equipe preferir Recharts, a troca fica isolada em `components/charts/`. |
| Sigilo durante a votação | Sem votos por candidato. Opção por evento "mostrar parcial por candidato" (padrão desligada); quando ligada, aparece faixa de alerta de que a tela pode estar espelhada no telão. |
| Privacidade | Nenhuma tela do dashboard nem CSV contém e-mail. Jurados aparecem por **nome/rótulo**. |
| Módulos | Júri e infantil seguem a configuração: **Semana Tech** = júri ligado, infantil desligado. **Festival** = ambos ligados. O que estiver desligado some do painel. |
| Acesso | Só o admin **daquele evento**. `admin@demo.com` é admin apenas do evento ativo no seed; abrir `/admin` do outro evento mostra "Acesso negado". |
| Rota extra | `/e/[slug]/admin/relatorio` (relatório imprimível). **Proposta**: não consta no mapa de rotas do DD. |

### Estados do painel

| Estado da urna | Aba Operação | Aba Resultado | Exportações |
|---|---|---|---|
| Não iniciada | Zeros e mensagens de estado vazio; contagem para a abertura | Desabilitada ("disponível após o encerramento") | Só `votos_por_minuto`, `dispositivos`, `auditoria` |
| Aberta | Completa, com polling e tempo restante | Desabilitada | Só arquivos de operação (os três acima) |
| Encerrada | Completa, estática, aviso "Votação encerrada" | **Habilitada** (aba padrão) | Todos os 6 |
| Concluído | Somente leitura | Somente leitura | Todos os 6 |

### Seed sugerido (evento ativo)

- 8 candidatos publicados (os mesmos das Etapas 4 e 5).
- Pesos: 70/30 na Semana Tech (popular/júri); 50/30/20 no Festival (popular/júri/infantil).
- Participantes: 520 cadastrados; 412 votos populares; 9 jurados convidados, 7 já votaram, 2 pendentes; 138 votos infantis em 3 totens (Festival).
- Códigos de jurado: 12 gerados, 9 usados, 1 revogado, 2 disponíveis.
- Série de votos por minuto: 90 minutos, pico por volta do minuto 55.
- Auditoria: ~25 entradas (abertura da urna, alterações de voto do júri, bloqueios por tentativas, revogação de convite, exportações).
- Resultado com **um empate resolvido pelo critério** (2º e 3º lugar) e **um empate que persiste** (posição compartilhada, ex.: 6º) para exercitar as duas telas.

---

## 4. Mapa de telas e rotas

| Rota | Tela | Quem acessa |
|---|---|---|
| `/e/[slug]/admin` | Dashboard: abas Operação e Resultado | Admin do evento |
| `/e/[slug]/admin/relatorio` | Relatório imprimível | Admin do evento |
| `/e/[slug]/admin/configuracao` | Atalhos a partir de Códigos e Júri (Etapa 6) | Admin do evento |
| `/e/[slug]/admin/apresentar` | Atalho "Abrir apresentação" (Etapa 8) | Admin do evento |

## 5. Estrutura de arquivos prevista

```
src/
  mocks/
    dashboard.seed.ts        # série por minuto, auditoria, jurados, totens, códigos
    dashboard.queries.ts     # obterOperacao, obterResultado, obterSerie, listarAuditoria, listarJurados
    resultado.ts             # calcularResultado + congelarResultado (compartilhado com Etapa 8)
    exportacao.ts            # gerarCsv(arquivo), arquivosDisponiveis(estado)
  lib/
    csv.ts                   # escape, separador, BOM UTF-8, download via Blob
    usePolling.ts
  components/charts/
    LineChart.tsx            # votos por minuto
    BarChart.tsx             # placar por grupo / classificação
  components/dashboard/
    AdminShell.tsx           # cabeçalho, estado da urna, abas, banner somente leitura
    AcessoNegado.tsx
    KpiCard.tsx
    OperacaoTab.tsx
    ResultadoTab.tsx
    JuradosPendentes.tsx
    TotensTable.tsx
    CodigosResumo.tsx
    AuditoriaList.tsx
    ClassificacaoTable.tsx
    CategoriasCards.tsx
    VotosJuriTable.tsx
    ExportPanel.tsx
    RelatorioView.tsx
  app/e/[slug]/admin/
    page.tsx                 # substitui o stub da Etapa 3
    relatorio/page.tsx
```

---

## 6. Checkpoints

### Checkpoint 1 — Contrato de dados, resultado e casca do painel

**Objetivo:** fixar a camada de dados e o esqueleto navegável antes de desenhar os blocos.

**Tarefas:**
- Estender o store com `contagens` (por grupo e por candidato), `auditoria`, `exportacoesRegistradas` e `resultadoOficial`.
- Criar `dashboard.seed.ts` conforme o seed sugerido.
- Implementar `calcularResultado` e `congelarResultado`:
  - normaliza cada grupo (votos do candidato ÷ total do grupo) e aplica os pesos do evento;
  - ordena pela pontuação final; aplica o desempate configurado (maior votação do júri ou do público);
  - se persistir, marca posição compartilhada e `empate: true`;
  - gera as categorias (queridinho do público, escolha dos jurados, preferido das crianças) com desempate pela pontuação final e co-vencedores se persistir;
  - disparado automaticamente quando a urna muda para **encerrada** (pela toolbar ou pelo botão da Etapa 6).
- Implementar as consultas em `dashboard.queries.ts` (assinaturas assíncronas simuladas, mesmo padrão de `auth.actions.ts`).
- `AdminShell`: cabeçalho com nome do evento, selo do estado da urna, tempo restante (quando aberta), abas Operação / Resultado (Resultado desabilitada fora de encerrada/concluído, com `aria-disabled` e dica), banner de **somente leitura** em concluído.
- Guard de acesso: deslogado vai para a entrada; público/jurado vê "Acesso negado"; admin de outro evento vê "Acesso negado".
- Ligar a toolbar: seletor de estado da urna (já existe) passa a disparar `congelarResultado`; adicionar chaves "Simular votos entrando" e "Mostrar parcial por candidato".

**Fica fake:** tudo vem do store; o congelamento é um cálculo local.

**Pronto quando:**
- [ ] `calcularResultado` com o seed devolve pesos que somam 100%, soma dos votos por candidato igual ao total de cada grupo e pelo menos um empate resolvido e um persistente.
- [ ] Trocar a urna para encerrada gera `resultadoOficial`; voltar para aberta o descarta (só no protótipo).
- [ ] Papéis não admin não alcançam o painel.
- [ ] Abas respondem ao estado conforme a tabela da seção 3.

---

### Checkpoint 2 — Aba Operação: indicadores principais

**Objetivo:** a primeira dobra do painel, o que o admin olha o tempo todo.

**Tarefas:**
- `KpiCard` com valor, rótulo e variação discreta.
- Cards de **totais por grupo**: popular, júri e infantil (este só se o módulo estiver ligado).
- Card de **participantes**: cadastrados, votaram e % por papel (público, jurado).
- Card de **estado da urna**: aberta desde, tempo restante, janela configurada; estado "não iniciada" mostra a contagem para a abertura.
- Atualização com `usePolling` a cada 5 s, com indicador "Atualizado às HH:MM:SS" (`aria-live="polite"`, sem anunciar a cada tick).
- Estados vazios para urna não iniciada (zeros com texto explicativo, sem gráficos quebrados).
- Faixa de aviso fixa: "Placar por candidato oculto durante a votação".

**Estados cobertos:** não iniciada, aberta, encerrada, concluído; júri e infantil ligados/desligados; carregando (esqueleto).

**Pronto quando:**
- [ ] Votar pela Etapa 5 e voltar ao painel incrementa o total popular.
- [ ] Com "Simular votos entrando" ligado, os totais sobem sozinhos.
- [ ] No tema Semana Tech não aparece nada de infantil; no Festival aparece.
- [ ] Nenhuma tela exibe voto por candidato durante a votação.

---

### Checkpoint 3 — Aba Operação: votos por minuto, jurados, totens, códigos e auditoria

**Objetivo:** completar o painel operacional.

**Tarefas:**
- `LineChart` de **votos por minuto** com pico destacado (valor e horário), tooltip por foco/hover, alternativa textual em tabela (`<details>` "Ver dados").
- `JuradosPendentes`: lista de jurados com status **votou / pendente**, nome ou rótulo, quantidade de alterações. **Não mostra em quem votaram.** Ação "Copiar lista de pendentes".
- `TotensTable` (só infantil ligado): nome, estado (ativo, pausado, revogado), último uso, votos por dispositivo.
- `CodigosResumo`: disponíveis, usados, revogados, expirados, com link "Gerenciar convites" para Configuração → Júri.
- `AuditoriaList`: resumo (aberturas e encerramentos, bloqueios por rate limit, alterações de voto do júri) e últimas entradas com tipo, horário e descrição **sem ligar usuário à escolha**; filtro por tipo.
- Parcial por candidato (toolbar ligada): bloco `BarChart` com faixa de alerta de espelhamento no telão.

**Fica fake:** séries, auditoria e estado dos totens são seed; apenas contagens de votos reagem à Etapa 5.

**Pronto quando:**
- [ ] Todos os blocos do item 4 de `Dashboard.md` existem e respeitam os módulos.
- [ ] Jurados pendentes batem com a contagem do card de participantes.
- [ ] Gráfico tem rótulos legíveis em 360 px e alternativa textual.
- [ ] Ligar o parcial exibe o alerta; desligar remove o bloco.

---

### Checkpoint 4 — Aba Resultado

**Objetivo:** mostrar o resultado oficial congelado.

**Tarefas:**
- Cabeçalho com "Resultado oficial", data/hora do cálculo e **pesos usados**.
- `ClassificacaoTable`: posição, candidato, votos e pontuação por grupo, pontuação final, indicador de empate (ícone + texto, não só cor), posição compartilhada quando houver.
- `BarChart` da pontuação final.
- **Empates:** painel que explica o critério aplicado ("desempatado pela maior votação do júri") e mostra os valores que decidiram; empate persistente sinalizado como "posição compartilhada, sem decisão automática".
- `CategoriasCards`: Queridinho do público, Escolha dos jurados e Preferido das crianças (cada um só se o módulo existir), com co-vencedores quando necessário.
- Linha do tempo (reuso do `LineChart`) com horário do pico e totais do evento (candidatos, período, totais).
- `VotosJuriTable` (**só admin**): jurado, candidato escolhido, atualizado em, e histórico de alterações expansível; aviso de confidencialidade e nota de que a exportação será auditada.
- Atalho **Abrir apresentação** (Etapa 8) e **Ver relatório** (Checkpoint 6).
- Em concluído: tudo igual, com selo de somente leitura.

**Fica fake:** o resultado vem de `calcularResultado` sobre o seed.

**Pronto quando:**
- [ ] A soma dos votos por candidato, por grupo, bate com os totais da aba Operação.
- [ ] Os dois tipos de empate aparecem corretamente.
- [ ] Sem júri ligado, a tabela de votos do júri e a categoria do júri não existem.
- [ ] Tabelas com `<caption>`, cabeçalhos associados e rolagem horizontal contida em 360 px.

---

### Checkpoint 5 — Exportação CSV com auditoria

**Objetivo:** download real dos arquivos gerados a partir do seed.

**Tarefas:**
- `lib/csv.ts`: separador `;`, codificação UTF-8 com BOM (abre direto no Excel em pt-BR), escape de aspas e quebras, vírgula decimal. **Proposta** a validar, pois o formato dos CSV é pendência em `Dashboard.md` seção 12.
- `exportacao.ts` gera os 6 arquivos:

| Arquivo | Conteúdo no mockup | Disponível |
|---|---|---|
| `resumo_evento.csv` | Evento, período, totais por grupo, pesos usados | Encerrada, concluído |
| `resultado_candidatos.csv` | Votos por grupo, pontuação final, posição, empate | Encerrada, concluído |
| `votos_por_minuto.csv` | Série temporal | Sempre |
| `jurados.csv` | Voto identificado e histórico de alterações, **sem e-mail** | Encerrada, concluído |
| `dispositivos.csv` | Votos por totem | Sempre (só infantil ligado) |
| `auditoria.csv` | Eventos administrativos e bloqueios | Sempre |

- `ExportPanel`: lista os arquivos com descrição e botão **Baixar**; indisponíveis aparecem desabilitados com o motivo; botão "Baixar tudo" quando houver mais de um disponível (vários downloads sequenciais).
- Antes de baixar `jurados.csv`: confirmação ("Este arquivo contém votos identificados. A exportação será registrada em auditoria.").
- Cada download registra uma entrada em `auditoria` (arquivo, horário, admin) e atualiza a lista na aba Operação.
- Teste simples (script ou verificação manual documentada) de que nenhum CSV contém `@`.

**Fica fake:** os dados; o download em si é real (`Blob` + link temporário).

**Pronto quando:**
- [ ] Cada arquivo abre corretamente no Excel/LibreOffice com acentos preservados.
- [ ] Durante a votação, só os arquivos de operação estão habilitados.
- [ ] Nenhum arquivo contém e-mails.
- [ ] Cada exportação aparece na auditoria.

---

### Checkpoint 6 — Relatório imprimível

**Objetivo:** página formatada que o navegador salva como PDF.

**Tarefas:**
- Rota `/e/[slug]/admin/relatorio` (mesmo guard do painel; disponível só com resultado congelado, caso contrário mostra explicação e link de volta).
- `RelatorioView`: capa com logo e nome do evento (tema), resumo do evento, pesos, classificação completa, categorias, empates com critério, gráfico de votos por minuto e rodapé com data de geração. **Sem** votos identificados do júri e sem e-mails.
- CSS de impressão (`@media print`): A4, margens, quebras de página antes de cada seção grande, tabelas sem corte de linha, cores com boa legibilidade em P&B, ocultar navegação.
- Barra de ações (some na impressão): **Imprimir / Salvar como PDF** (`window.print()`) e Voltar.
- Registrar a geração do relatório em auditoria.

**Pronto quando:**
- [ ] A pré-visualização de impressão do Chrome mostra páginas bem quebradas e sem elementos de interface.
- [ ] Funciona nos dois temas e o contraste é adequado em P&B.
- [ ] Relatório não é acessível com urna aberta.

---

### Checkpoint 7 — Ao vivo, estados transversais e fechamento

**Objetivo:** validar o painel em todos os cenários e fechar a etapa.

**Tarefas:**
- Percorrer a matriz **estado da urna × módulos × tema × papel** (4 × 2 × 2 × 4) e corrigir inconsistências.
- Verificar o polling: pausa quando a aba do navegador está oculta (`visibilitychange`), sem acumular timers ao navegar, sem re-render de blocos que não mudaram.
- Conferir consistência numérica entre Operação, Resultado, CSV e Relatório com o seed e após votos feitos na Etapa 5.
- Garantir que o `resultadoOficial` esteja pronto para ser consumido pela Etapa 8 (tipo exportado e documentado).
- Acessibilidade: ordem de foco, abas com `role="tablist"`, tabelas semânticas, gráficos com alternativa textual, contraste dos selos de estado nos dois temas, tecla `Esc` fecha diálogos.
- Responsividade: 360 px, 768 px, 1280 px e tela grande (1920 px) para o caso de espelhamento.
- Revisar textos em português (estado vazio, avisos de sigilo, confirmação de exportação) e listar os pendentes de aprovação.
- Confirmar que nenhuma tela importa de `mocks/` fora de `dashboard.queries.ts` e `exportacao.ts`.
- Atualizar o README da Fase 1 com o que a dev toolbar controla no dashboard.

**Pronto quando:** todos os itens da seção 7 estiverem marcados.

---

## 7. Critérios de aceitação da etapa

- [ ] Durante a votação, o admin vê totais, votos por minuto, participantes, jurados pendentes, totens, códigos e auditoria, **sem votos por candidato**.
- [ ] Após o encerramento, a aba Resultado exibe o resultado oficial congelado, com pesos, empates e critério.
- [ ] Os números de Operação, Resultado, CSV e Relatório são consistentes entre si.
- [ ] O objeto `resultadoOficial` é o mesmo que a Etapa 8 consumirá.
- [ ] Os 6 CSV são gerados, respeitam a disponibilidade por estado e não contêm e-mails.
- [ ] Exportar o voto identificado do júri pede confirmação e fica registrado em auditoria.
- [ ] O relatório imprimível salva como PDF em boa qualidade.
- [ ] Apenas o admin do evento acessa; jurado, público, deslogado e admin de outro evento são barrados.
- [ ] Evento concluído abre em somente leitura, com exportações.
- [ ] Júri e infantil desligados somem do painel.
- [ ] Funciona nos dois temas, em celular e desktop, com teclado e foco visível.
- [ ] Nada persiste: F5 restaura o seed.

## 8. Pendências para decisão

1. **Biblioteca de gráficos:** SVG próprio (proposta, sem dependência) ou Recharts?
2. **Formato dos CSV:** separador `;` com BOM e vírgula decimal (proposta para Excel pt-BR) ou padrão internacional (`,` e ponto)?
3. **Rota do relatório:** `/admin/relatorio` (proposta) ou impressão da própria aba Resultado com CSS de impressão, sem rota nova?
4. **Admin multi-evento no seed:** manter `admin@demo.com` como admin só do evento ativo, para demonstrar o "Acesso negado" entre eventos?
5. **Parcial por candidato:** manter no mockup como opção por evento (padrão desligada) ou remover do MVP?
6. **Quantidade de downloads:** "Baixar tudo" como vários arquivos sequenciais ou como um único `.zip`? (O zip exigiria dependência.)
7. **Política de retenção de dados pessoais:** continua fora da Fase 1; confirmar que não precisa de tela de apoio no painel.
