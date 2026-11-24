# Demandas — revisão do sistema (25/11/2026)

Levantadas pelo dono do produto depois de passar pelo sistema, discutidas e fechadas em 25/11/2026. Entregues por fases, não
tudo de uma vez. Cada item diz **o que muda**, **como fica** e o que **não** muda. Marque `[x]` ao entregar.

Pendência anterior, antes de qualquer fase: aplicar a migração `20261125000000_canal_categoria_totem` no Supabase e enviar os
commits `261bd71` e `8732676` aos dois remotos (o push depende da migração).

---

## Fase A — ajustes de tela (sem banco)

### [x] A1. "Seu voto é secreto" (demanda 10)
- Trocar "Seu voto é secreto: ele não fica ligado ao seu nome." por **"Seu voto é secreto."**
- Onde: "Como funciona" (padrão e cinema), revisão do voto (`DialogoRevisao`) e a demonstração da página da plataforma (`DemoDoVoto`).

### [x] A2. Faixa abaixo do cabeçalho mais simples (demanda 5)
- A faixa (`StatusUrna`) passa a ter **só um selo de estado e o tempo**. Saem: "Seu voto foi registrado", "Obrigado por votar",
  o título do estado do tema e o texto de apoio.
- Os estados internos viram quatro selos:

  | Selo | Estados atuais |
  |---|---|
  | Não iniciada | em preparação, não iniciada, aguardando abertura |
  | Aberta | aberta, reta final |
  | Votado | público que já votou em todas as categorias da página |
  | Encerrada | tempo esgotado, encerrada, concluído |

- Tempo: "Abre em…" antes da abertura; "Termina em…" com a votação aberta, **inclusive no "Votado"**; nada depois de encerrada.

### [x] A3. Categoria do totem aparece na landing, sem voto (demanda 6)
- Hoje a categoria TOTEM (ex.: Mostra Infantil) some da landing. Ela volta a aparecer, **com os itens**, para divulgá-los.
- Os itens dela não abrem a revisão do voto. A seção leva um aviso: "Votação só nos totens, no local do evento."
- Ela não conta para "Votado" (A2) nem para "Você votou em X de Y".
- Continua sem página própria e sem QR Code.

### Demanda 2 — ordem das categorias na landing: **já existe**
- As setas ← → em Configuração > Categorias definem a ordem, e a landing a segue. Nada a fazer.

---

## Fase B — votação na landing e telão

### [x] B1. Carrossel por categoria, com voto e busca (demanda 4)
- Cada categoria na landing vira um **carrossel horizontal infinito**: os cartões saem pela esquerda e voltam pela direita, em
  ciclo. Mostra **todos** os itens (hoje mostra até 5 e manda para "Ver mais").
- O carrossel só se move **quando os itens não cabem na tela**. Se cabem, ficam numa linha fixa, sem movimento.
- **Votar pela landing:** tocar num item abre a mesma revisão "Revise seu voto" da página da categoria, com as mesmas regras
  (um voto por categoria, voto confirmado, coração animado, "Seu voto" depois).
- **Busca:** cada categoria tem um botão de pesquisar que abre uma barra de busca e filtra o carrossel pelo título. O botão
  **some quando todos cabem na tela** (todos já estão visíveis).
- A **página da categoria** também ganha o botão de pesquisar (a página continua existindo: é o destino do QR Code).
- Acessibilidade: o movimento para quando o ponteiro ou o foco está no carrossel; com "reduzir movimento" ligado no aparelho, não
  há movimento automático (rolagem manual).
- Categoria do totem (A3): mesmo carrossel e busca, sem voto.

### [x] B2. Telão alternando entre as categorias (demanda 1)
- Durante a votação, o telão (Modo Apresentação, cena da votação ao vivo) mostra **uma categoria por vez** e passa para a próxima
  depois de **n segundos**, em loop. A cada troca mudam os itens e o QR Code (o da categoria em tela).
- Configuração > Apresentação ganha:
  - o **intervalo** da troca, em segundos (padrão sugerido: 15 s);
  - **o que mostrar no telão** (marcar um ou mais): **Candidatos**, **Tempo**, **QR Code**, **Link**.
- "Link" é o endereço da página da categoria escrito por extenso, para quem não lê QR.
- Categoria do totem: entra no ciclo com os itens, sem QR nem link, com o aviso "Votação nos totens".
- A escolha manual de categoria na sala de controle continua para a revelação do resultado.

---

## Fase C — parceiros e "sobre o evento"

### [ ] C1. "Patrocinadores" vira "Parceiros", com grupos (demanda 8)
- Todo texto de "Patrocinadores" passa a "Parceiros" (admin e página).
- Cada evento tem **grupos de parceiros**. Padrão: **Patrocínio** e **Realização**. O admin cria, renomeia, ordena e remove grupos
  (ex.: Apoio Cultural, Parceria).
- Um parceiro pode estar em **mais de um grupo**.
- Remover um grupo é permitido, sempre com **modal de confirmação**. Os parceiros dele continuam cadastrados (só saem do grupo).
- Na página do evento, os parceiros aparecem por grupo, com o nome do grupo como título, na ordem dos grupos.
- Migração: os parceiros atuais (os 6 do Festival) vão para **Patrocínio**.

### [ ] C2. Seção "sobre o evento" no fim da página (demanda 7)
- Seção nova, **no fim da página de todos os eventos**, no modelo do anexo: cartão na cor do tema, imagem à esquerda, título
  e texto à direita. No celular, a imagem vem em cima.
- No admin (Configuração > Geral): **título**, **texto** (parágrafos, com **negrito**) e **imagem** (upload, como as outras imagens).
- Sem título nem texto, a seção não aparece.
- Exemplo (Festival): título "O lugar para quem quer Ver Filmes e Fazer Filmes", três parágrafos e a foto da equipe.

---

## Fase D — campos extras por categoria

### [ ] D1. Campos extras definidos pela categoria (demanda 9)
- Hoje os campos extras (ex.: Direção, Duração) são do evento inteiro. Passam a ser **da categoria**: cada categoria define os
  seus campos, e o item preenche os campos da categoria dele. Categorias diferentes podem ter campos diferentes.
- Migração: os campos atuais do evento são copiados para **todas** as categorias; nenhum valor se perde.
- **Mudar um item de categoria** quando a nova não tem algum campo preenchido: perguntar antes:
  > "Essa categoria não possui os campos [Campo 1] e [Campo 2] e os dados serão perdidos. Tem certeza que deseja fazer a migração?"

  Confirmado, os valores desses campos são apagados.
- **Copiar campos de outra categoria:** disponível ao criar uma categoria **e** em qualquer categoria já criada.
- O formulário do item mostra os campos da categoria dele. O cartão, a página da categoria e o telão mostram os campos da
  categoria do item.

---

## Fase E — resetar o evento

### [ ] E1. Resetar o evento (demanda 3)
- Volta o evento para **rascunho** com a **urna não iniciada**. A configuração fica (itens, categorias, campos, tema, parceiros,
  apresentação, pesos, janela).
- Vale para qualquer estado, **inclusive evento concluído**.
- Antes de resetar, o admin escolhe **o que zerar**, num modal com caixas de marcar:
  - [ ] **Votos**: do público, do júri (votos, notas, escolhas por critério e histórico) e do totem, as marcas de "já votou" e os
    resultados oficiais (a apuração depende dos votos).
  - [ ] **Contas do público**: as participações do público no evento (as pessoas precisam entrar de novo). As contas em si e as
    da organização não são apagadas.
  - [ ] **Jurados**: as participações de jurado e os convites (precisam ser enviados de novo).
  - [ ] **Totens pareados**: os totens e os códigos de pareamento (precisam ser pareados de novo).
- A confirmação pede para digitar o nome do evento, e o reset fica na auditoria (a auditoria nunca é apagada).
- A lista exata de opções pode ser revista na implementação; qualquer opção nova entra neste mesmo modal.

---

## Ordem de entrega

| Fase | Itens | Banco |
|---|---|---|
| A | A1, A2, A3 | não |
| B | B1, B2 | B2: configuração do telão (migração pequena) |
| C | C1, C2 | sim (grupos de parceiros, campos do "sobre") |
| D | D1 | sim (migração de dados) |
| E | E1 | não muda o schema; operação destrutiva, mais testes |
