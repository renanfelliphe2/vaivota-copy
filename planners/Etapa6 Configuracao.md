# VaiVota — Fase 1 · Etapa 6: Configuração do Evento (mockup)

> Status: proposta de planner, pronta para revisão.
> Depende de: Etapa 0 (tokens de tema, componentes base, store, dev toolbar), Etapa 2 (estados da urna) e Etapa 3 (papéis).
> Alimenta: Etapa 7 (Dashboard lê a auditoria e os convites) e Etapa 8 (Apresentação lê pesos, rótulos e tema).
> Fontes: `DocumentDesign.md` seção 7.6, `Jurado.md` (seção 4, convites), `schema.prisma`.
> Stack: Next.js (App Router) + React/TS + Tailwind 4. **Sem banco, sem persistência: o estado vive no store em memória e o F5 reseta.**

## 1. Objetivo

Entregar a tela `/e/[slug]/admin/configuracao` completa e navegável, com as seções do MVP: **Geral, Candidatos, Júri (convites), Placar, Tema e Operação**. Cada seção edita o store, e o resto do protótipo (landing, evento, votação, dashboard, telão) reage a essas edições.

O foco é mostrar **como a tela deve ficar e se comportar**, incluindo validações, travas por estado da urna e checklist de ativação. Nada é gravado fora da memória.

## 2. Escopo

**Dentro:**
- Layout da tela com navegação entre as 6 seções.
- CRUD de candidatos (criar, editar, publicar/despublicar, remover, campos extras, imagem).
- Geração, listagem, cópia, exportação e revogação de convites de jurado.
- Pesos do placar (soma 100%), desempate, exibir votos do júri no telão.
- Tema básico (nome, logo, cores) com checagem de contraste e pré-visualização.
- Operação: checklist de ativação, abrir urna, encerrar urna, Concluir Evento.
- Travas por estado, auditoria fake e estados de erro/vazio.

**Fora (configurado por seed, como no DD):**
- Seções Módulos, Votação (janela avançada), Infantil, Apresentação e Privacidade.
- Admins adicionais por e-mail, super admin, duplicar configuração.
- Upload real de arquivos (a imagem é um preview local, perdido no F5).

> **Módulos ligados/desligados** ficam no seletor da dev toolbar (Etapa 0), não numa seção da tela. A seção Placar apenas **reage** a eles.

## 3. O que fica fake

| Ação na tela | Comportamento no mockup |
|---|---|
| Salvar qualquer seção | Atualiza o store, mostra toast "Salvo" e registra na auditoria fake |
| Upload de logo/imagem | `URL.createObjectURL` ou escolha entre imagens de exemplo; some no F5 |
| Gerar convites | Códigos aleatórios gerados no navegador; "hash" é só um campo simulado |
| Exportar convites (CSV) | **Gera o arquivo de verdade** via `Blob` (é barato e valida o formato) |
| Abrir/encerrar urna | Muda `estadoUrna` no store; reflete em todas as telas |
| Concluir Evento | Muda `estadoEvento` para `concluido`; configuração fica somente leitura |
| Autosave / concorrência | Não existe |

## 4. Estado esperado do store (vem da Etapa 0)

Esta etapa assume que o store já expõe (ajustar nomes se a Etapa 0 divergir):

- `evento`: nome, slug, descrição, início, fim, fuso, `estadoEvento` (`rascunho | ativo | concluido`), `estadoUrna` (`nao_iniciada | aberta | encerrada`), `encerramentoAutomatico`, `modulos { juri, infantil }`.
- `candidatos[]`: id, título, descrição, imagem, `camposExtras`, `publicado`, `desqualificado`, ordem.
- `convitesJurado[]`: id, rótulo, código (visível só na criação), `hashFake`, validade, `estado` (`disponivel | usado | revogado`), resgatado por/em.
- `configPlacar`: pesos popular/júri/infantil, desempate (`juri | publico`), `exibirVotosJuriNoTelao`.
- `tema`: nome de exibição, logo, paleta (primária, secundária, fundo, texto), fonte, rótulos.
- `auditoria[]`: tipo, ator, horário, detalhe.
- Ações novas desta etapa: `salvarGeral`, `salvarCandidato`, `removerCandidato`, `alternarPublicacao`, `gerarConvites`, `revogarConvite`, `salvarPlacar`, `salvarTema`, `abrirUrna`, `encerrarUrna`, `concluirEvento`, `desqualificarCandidato`, `registrarAuditoria`.

## 5. Estrutura de arquivos

```
src/app/e/[slug]/admin/configuracao/
  page.tsx                      # shell + roteamento de seção (?secao=)
  _components/
    ConfigShell.tsx             # layout, navegação, banner de estado
    SecaoNav.tsx                # sidebar (desktop) / abas rolável (mobile)
    ChecklistAtivacao.tsx       # painel lateral, derivado do store
    BannerTrava.tsx             # aviso "bloqueado após abrir a urna"
    secoes/
      Geral.tsx
      Candidatos/
        ListaCandidatos.tsx
        FormCandidato.tsx
        CamposExtrasEditor.tsx
        DesqualificarDialog.tsx
      Juri/
        GerarConvitesForm.tsx
        TabelaConvites.tsx
        CodigosGeradosDialog.tsx
      Placar.tsx
      Tema/
        TemaForm.tsx
        PreviaTema.tsx
        ContrasteBadge.tsx
      Operacao.tsx
src/lib/
  contraste.ts                  # razão de contraste WCAG
  codigos.ts                    # gerador de códigos sem caracteres ambíguos
  csv.ts                        # montar e baixar CSV
  travas.ts                     # regras de bloqueio por estado (função pura)
```

## 6. Matriz de travas (fonte única: `travas.ts`)

| Item | Rascunho | Urna aberta | Urna encerrada | Evento concluído |
|---|---|---|---|---|
| Geral: nome, descrição, datas | Livre | Livre\* | Livre\* | Leitura |
| Geral: slug | Livre | Travado | Travado | Leitura |
| Janela: estender o fim | Livre | Com auditoria | Travado | Leitura |
| Candidatos: adicionar/remover/despublicar | Livre | **Travado** | Travado | Leitura |
| Candidatos: corrigir texto/imagem | Livre | Com auditoria | Com auditoria | Leitura |
| Candidatos: desqualificar | Indisponível | Ação excepcional | Ação excepcional | Leitura |
| Convites: gerar | Livre | Livre | Travado | Leitura |
| Convites: revogar | Livre | Com auditoria | Travado | Leitura |
| Placar: pesos, desempate | Livre | **Travado** | Travado | Leitura |
| Placar: exibir votos do júri | Livre | **Travado** | Travado | Leitura |
| Tema | Livre | Livre | Livre | Leitura |
| Operação | Conforme estado | Conforme estado | Conforme estado | Leitura |

\* Marcar como "Livre" apenas campos não ligados à apuração; o DD só trava explicitamente módulos, pesos, desempate, identificação e candidatos.

"Com auditoria" significa: pedir confirmação com motivo opcional e gravar em `auditoria[]`.

## 7. Checkpoints

Cada checkpoint termina com a tela rodando e commitável. A ordem minimiza retrabalho: shell primeiro, seções simples depois, a mais complexa (Candidatos) com tempo, e Operação por último porque consome todas as outras.

---

### CP1 — Shell, navegação e guarda de papel

**Objetivo:** a rota existe, tem layout, navega entre as 6 seções e já respeita papel e estado.

**Tarefas**
- Criar a rota e o `ConfigShell` com cabeçalho (nome do evento, chips de estado do evento e da urna).
- `SecaoNav`: sidebar no desktop, abas roláveis no mobile; seção ativa via `?secao=geral|candidatos|juri|placar|tema|operacao` (linkável, sobrevive à navegação interna).
- Guarda de papel: só `admin` acessa. Público/jurado veem a tela "Acesso restrito" com link de volta. Não logado vê o convite para entrar.
- `BannerTrava`: faixa fixa quando houver bloqueios ativos ("Urna aberta: candidatos e pesos estão travados").
- Estado "Evento concluído": toda a tela em modo leitura (inputs `disabled`, aviso no topo).
- Painel `ChecklistAtivacao` vazio (só o esqueleto; as regras entram no CP7).
- Implementar `travas.ts` com a matriz da seção 6 e testes simples (funções puras).

**Estados a cobrir:** admin / jurado / público / deslogado; rascunho / ativo-urna aberta / encerrada / concluído.

**Pronto quando**
- [ ] Trocar o papel na dev toolbar muda o acesso à tela.
- [ ] As 6 seções abrem com placeholder e a URL reflete a seção.
- [ ] O banner e o modo leitura aparecem conforme o estado da urna/evento.
- [ ] `travas.ts` cobre toda a matriz e é usado pelos CPs seguintes (nenhuma regra de bloqueio duplicada em componentes).
- [ ] Layout funciona em 360px e em 1280px.

---

### CP2 — Seção Geral

**Objetivo:** primeira seção real, definindo o padrão de formulário que as outras vão repetir.

**Tarefas**
- Campos: nome, slug (com prévia da URL `/e/{slug}`), descrição, início e fim da votação, fuso horário, "encerrar automaticamente ao fim da janela".
- Padrão de formulário reutilizável: rótulo, ajuda, erro inline, botão **Salvar** desabilitado sem alterações, **Descartar**, aviso de alterações não salvas ao trocar de seção.
- Validações: nome obrigatório; slug em minúsculas, números e hífen, único entre os eventos seed; fim posterior ao início; início no futuro só em rascunho.
- Toast "Salvo" e registro na auditoria fake.
- Mudar o nome reflete no cabeçalho e na página do evento.

**Estados a cobrir:** vazio, com erro, salvo, travado (slug com urna aberta), somente leitura.

**Pronto quando**
- [ ] Editar e salvar atualiza o nome em landing, evento e cabeçalho da config.
- [ ] Mudar o slug navega para a nova URL sem quebrar a sessão.
- [ ] Trocar de seção com alteração pendente pergunta antes de descartar.
- [ ] Slug fica travado com a urna aberta e mostra o motivo.

---

### CP3 — Candidatos: lista

**Objetivo:** ver e organizar os candidatos antes de editar um.

**Tarefas**
- `ListaCandidatos`: cartões com imagem/cartaz, título, status (Publicado, Rascunho, Desqualificado) e ações.
- Reordenar (botões subir/descer; arrastar fica opcional) e filtro por status.
- Ação rápida **Publicar/Despublicar**.
- Contador "N publicados (mínimo 2 para ativar)" ligado ao checklist.
- Estado vazio com chamada para "Adicionar primeiro candidato".
- Aplicar a trava: com a urna aberta, esconder/desabilitar adicionar, remover e despublicar, com o motivo visível (tooltip + texto, nunca só cor).
- Seed com candidatos suficientes para testar lista longa (8+) e candidato sem imagem.

**Pronto quando**
- [ ] A ordem escolhida aparece igual na votação (Etapa 4/5).
- [ ] Publicar/despublicar muda a lista pública e o contador do checklist.
- [ ] Urna aberta: ações travadas e explicadas.

---

### CP4 — Candidatos: formulário, campos extras e remoção

**Objetivo:** criar e editar um candidato completo.

**Tarefas**
- `FormCandidato` (página ou painel lateral): título, descrição, imagem/cartaz (preview + trocar + remover), publicar.
- Campos obrigatórios conforme o DD: título, descrição e imagem.
- `CamposExtrasEditor`: o admin define campos de texto com **rótulo próprio** (ex.: "Direção", "Duração" ou "Equipe", "Tecnologias"). Os rótulos valem para o evento inteiro; os valores, por candidato.
- Remover com confirmação (só em rascunho; com urna aberta, só desqualificar).
- `DesqualificarDialog`: ação excepcional, exige motivo, avisa que os votos permanecem e o resultado será recalculado como novo registro; grava na auditoria. Disponível só com urna aberta ou encerrada.
- Edição de texto/imagem com urna aberta: permitida, mas pede confirmação e vai para a auditoria.

**Estados a cobrir:** novo, edição, erro de validação, imagem inválida (tipo/tamanho simulado), travado, desqualificado (aparece riscado e fora do ranking mockado).

**Pronto quando**
- [ ] Criar um candidato o faz aparecer na votação e no dashboard fake.
- [ ] Campos extras definidos aqui aparecem no detalhe do candidato (Etapa 4).
- [ ] Desqualificar remove o candidato da votação e registra auditoria, sem apagar o registro.
- [ ] Remoção só existe em rascunho.

---

### CP5 — Júri: convites

**Objetivo:** fluxo completo de convites de jurado, reproduzindo o que `Jurado.md` define.

**Tarefas**
- `GerarConvitesForm`: quantidade (n), rótulo base opcional, validade (data). Validar n entre 1 e um teto razoável (ex.: 50).
- `codigos.ts`: formato curto, sem caracteres ambíguos (sem 0/O, 1/I/L), com agrupamento legível (ex.: `K7M4-X9PQ`).
- `CodigosGeradosDialog`: mostra os códigos **uma única vez**, com copiar tudo e **baixar CSV**; aviso claro "depois de fechar, não será possível ver os códigos novamente".
- `TabelaConvites`: rótulo, estado (Disponível, Usado, Revogado, Expirado), validade, resgatado por/em. Editar rótulo, filtrar por estado.
- Revogar com confirmação e opção "gerar substituto"; grava auditoria.
- Resumo no topo: disponíveis / usados / revogados (os mesmos números que a aba Operação mostra no Dashboard).
- Seção só aparece completa quando o módulo Júri está ligado; desligado, mostra estado vazio explicativo.
- Integração com a Etapa 3: um código gerado aqui **funciona** no registro/convite, e o convite passa a "Usado".

**Estados a cobrir:** módulo desligado, sem convites, lote recém-gerado, convite usado/revogado/expirado, travado após encerrar.

**Pronto quando**
- [ ] Gerar 5 convites, copiar um e resgatá-lo na tela de convite muda seu estado para Usado.
- [ ] Revogado ou expirado é rejeitado no resgate (mensagem da Etapa 3).
- [ ] O CSV baixado abre corretamente (UTF-8 com BOM, separador `;` ou `,` definido).
- [ ] Os códigos não reaparecem depois de fechar o diálogo.

---

### CP6 — Placar

**Objetivo:** configurar a fórmula de apuração com validação clara.

**Tarefas**
- Três campos de peso (popular, júri, infantil) com sliders sincronizados a inputs numéricos e barra empilhada mostrando a divisão.
- Módulo desligado: peso do grupo vira **0**, campo desabilitado com a explicação "módulo desligado" (DD seção 8: grupo desativado entra com peso 0).
- Soma obrigatória de 100% considerando só módulos ligados; indicador "faltam X%" / "excede X%" e botão de salvar bloqueado.
- Atalho "Distribuir igualmente" e presets de exemplo (ex.: 70/30).
- Regra de desempate: Júri **ou** Público.
- Opção "Exibir votos do júri no telão" (desligada por padrão), com texto de ajuda sobre sigilo.
- Texto explicando a fórmula (normalização por grupo) com um **exemplo numérico fixo**, para o admin entender o efeito.
- Trava total com a urna aberta, com `BannerTrava`.

**Estados a cobrir:** só popular; popular + júri; os três; soma inválida; travado.

**Pronto quando**
- [ ] Salvar pesos altera a ordem do ranking mockado no Dashboard e no telão (Etapas 7 e 8).
- [ ] Desligar o Júri na toolbar zera e trava o peso correspondente.
- [ ] Não é possível salvar com soma diferente de 100%.
- [ ] Com a urna aberta, nada é editável.

---

### CP7 — Tema básico, contraste e pré-visualização

**Objetivo:** mostrar o white-label funcionando de ponta a ponta.

**Tarefas**
- `TemaForm`: nome de exibição, logo (preview local), cor primária, secundária, fundo e texto, fonte (lista fechada de fontes pré-aprovadas) e rótulos principais (ex.: "candidato" → "filme"/"projeto").
- `contraste.ts`: razão de contraste WCAG; limiar inicial de 4,5:1 para texto normal (**o DD deixa o limiar como pendência; adotar este como padrão do protótipo**).
- `ContrasteBadge`: mostra a razão, aprovado/reprovado com texto e ícone (nunca só cor). Pares verificados: texto sobre fundo, texto sobre primária, texto sobre secundária.
- Salvar bloqueado enquanto algum par reprovar; sugerir cor corrigida mais próxima (opcional).
- `PreviaTema`: pré-visualização ao vivo com abas **Login**, **Votação** e **Telão**, usando as mesmas CSS variables da Etapa 0, escopadas ao contêiner da prévia (não altera o app inteiro até salvar).
- Presets "Semana Tech" e "Festival" para voltar ao padrão.
- Ao salvar, o tema vale para landing, evento, votação e telão. O tema é **livre** mesmo com a urna aberta.

**Estados a cobrir:** contraste ok, contraste reprovado, fonte carregando, logo ausente, rótulo vazio.

**Pronto quando**
- [ ] Mudar a cor primária atualiza a prévia na hora, sem afetar a tela real antes de salvar.
- [ ] Combinação com baixo contraste não pode ser salva e explica o motivo.
- [ ] Depois de salvar, as outras telas assumem o novo tema.
- [ ] O preset do Festival reproduz o visual atual da landing.

---

### CP8 — Operação, checklist de ativação e fechamento

**Objetivo:** o painel que conduz o evento de Rascunho até Concluído, usando tudo o que foi feito antes.

**Tarefas**
- Completar `ChecklistAtivacao` (visível também na seção Operação), cada item derivado do store com link para a seção que resolve:
  - ≥ 2 candidatos publicados (bloqueia);
  - pesos somam 100% nos módulos ligados (bloqueia);
  - janela de votação válida (bloqueia);
  - júri ligado: convites gerados (bloqueia);
  - infantil ligado: ao menos um totem pareado (**aviso**, não bloqueia);
  - tema com contraste aprovado (bloqueia);
  - trailer testado (**aviso**).
- `Operacao`: linha do tempo visual `Rascunho → Ativo → Concluído` e `Não iniciada → Aberta → Encerrada`, com a ação disponível em cada momento:
  - **Ativar evento** (só com checklist verde);
  - **Abrir urna** (confirmação; aplica as travas);
  - **Encerrar urna** (confirmação mais forte; efeito imediato; mostra quantos votos há no mockup);
  - **Concluir Evento** (só após encerrar; confirmação digitando o nome do evento; deixa tudo somente leitura).
- Cada ação grava auditoria (abertura, encerramento, conclusão) e muda o estado em todas as telas.
- Diálogo de confirmação reutilizável (título, consequência em texto claro, botão de perigo).
- Ação **"Resetar protótipo"** (somente dev toolbar, não na tela do admin) para voltar ao seed.
- **Revisão final da etapa:** passar por todas as seções verificando travas, mensagens de erro, foco e navegação por teclado.

**Estados a cobrir:** checklist incompleto / completo, rascunho, ativo-não iniciada, aberta, encerrada, concluído; avisos que não bloqueiam.

**Pronto quando**
- [ ] Com o seed "rascunho incompleto", o botão de ativar está bloqueado e cada pendência leva à seção certa.
- [ ] Fluxo completo: preencher pendências → ativar → abrir → votar em outra aba do navegador (mesma sessão) → encerrar → concluir.
- [ ] Depois de abrir a urna, candidatos, pesos e desempate ficam travados em toda a tela.
- [ ] Depois de concluir, a tela inteira fica em leitura.
- [ ] Todas as ações relevantes aparecem na auditoria fake e na aba Operação do Dashboard.

---

## 8. Cenários de seed necessários

A dev toolbar deve oferecer pelo menos estes cenários para validar a etapa:

| Cenário | Para testar |
|---|---|
| **Rascunho incompleto** (1 candidato, pesos 50/30, sem convites) | Checklist bloqueando a ativação |
| **Rascunho pronto** | Ativar e abrir urna |
| **Urna aberta** | Todas as travas e ações com auditoria |
| **Urna encerrada** | Concluir Evento |
| **Concluído** | Somente leitura |
| **Festival** (tema, infantil ligado, júri opcional) | Tema alternativo e módulo infantil refletindo no Placar |

## 9. Critérios de aceitação da etapa

- [ ] As 6 seções do MVP estão implementadas e navegáveis, em mobile e desktop.
- [ ] Nenhuma ação persiste após F5; nenhuma chamada a banco ou API externa.
- [ ] Toda regra de trava vem de `travas.ts` e bate com a matriz da seção 6.
- [ ] As edições feitas aqui se refletem nas demais telas (nome, tema, candidatos, pesos, convites, estado da urna).
- [ ] Contraste do tema é validado e impede salvar combinações reprovadas.
- [ ] Convites gerados funcionam no resgate da Etapa 3.
- [ ] Ativação respeita o checklist; abertura da urna aplica as travas.
- [ ] Ações sensíveis têm confirmação e auditoria fake.
- [ ] Acessibilidade básica: foco visível, rótulos em todos os campos, erros anunciados, estado nunca só por cor.

## 10. Pendências e decisões assumidas

| Item | Assumido neste planner | Precisa confirmar? |
|---|---|---|
| Limiar de contraste | 4,5:1 (WCAG AA, texto normal) | Sim, o DD deixa em aberto |
| Fontes pré-aprovadas | 4 a 6 fontes do Google Fonts carregadas via `next/font` na Etapa 0 | Sim: quais? |
| Grupo ativo sem nenhum voto na fórmula | Fora do escopo da config; vira regra de apuração (Etapas 7/8) | Decidir antes do evento (pendência do DD) |
| Candidato votar em si mesmo | Fora desta etapa (seção Votação é por seed) | Pode entrar na Fase 2 |
| Formato do CSV de convites | UTF-8 com BOM, separador `;`, cabeçalho `rotulo;codigo;validade` | Sim, o DD lista como pendência |
| Teto de convites por lote | 50 | Ajustável |
| Ativar evento e abrir urna | Duas ações separadas (Rascunho→Ativo, depois NaoIniciada→Aberta) | Confirmar se isso deve ser um passo só |
