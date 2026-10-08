# Roteiro de demonstração: 9º Festival Ver e Fazer Filmes (cerca de 18 minutos)

Para os organizadores do Festival. Cada ato cita o item do documento de requisitos deles ([`planners/Requisitos-Ver-E-Fazer-Filmes.pdf`](../planners/Requisitos-Ver-E-Fazer-Filmes.pdf)) que ele atende. O protótipo é só do Festival e começa **sem votos**: cada conta faz o seu primeiro voto na frente deles.

## Antes de começar

- Rode em **build de produção**, numa **única aba**: `pnpm build && pnpm start`, e abra `http://localhost:3000`. F5 ou uma aba nova voltam tudo ao início (o protótipo não tem banco). Navegue sempre pelos botões da tela.
- Deixe a toolbar recolhida (**Dev ▲**). `Alt+D` esconde e mostra; no telão e no totem ela some sozinha.
- O relógio começa em **25/11/2026 às 9h30**, meia hora antes da janela do Festival (25/11 10h a 28/11 20h). A urna começa **não iniciada**.
- Login com **e-mail e senha**: as três contas usam **`demo1234`**. "Esqueci minha senha" pede um código: no protótipo é **`123456`** (aparece na tela).
- "Celular" é o modo dispositivo do navegador (F12 → ícone de celular, 390 px) **na mesma aba**. Um celular de verdade lendo o QR abre outra cópia do protótipo e o voto não aparece no notebook.
- Ensaie o roteiro inteiro antes, no notebook e no projetor ou TV que vai usar.

| Conta | Acesso | Papel |
|---|---|---|
| Ana Souza | `publico@demo.com` · senha `demo1234` | Público |
| Bruno Lima | `jurado@demo.com` · senha `demo1234` | Jurado (convite já resgatado) |
| Carla Mendes | `admin@demo.com` · senha `demo1234` | Organização (admin) |

Para trocar de conta: menu do usuário no topo → **Sair** → **Entrar** com o próximo e-mail.

## Roteiro

| Ato | O que mostrar | Como | Requisito | Tempo |
|---|---|---|---|---|
| 1 | **Identidade do Festival.** Landing com logo, laranja e verde, os curtas em cartaz e o aviso "A votação abre durante o festival" | Abrir `/` (VaiVota) e entrar no Festival pela lista, em `/e/ver-e-fazer-filmes`, sem login | §5 identidade; §3.2 estado da votação | 1 min |
| 2 | **A organização prepara o evento.** Painel com a urna não iniciada; cadastro dos curtas (Direção, Duração, rascunho, desqualificado), convites do júri, pesos 50/30/20 com desempate pelo júri, tema | **Entrar** com `admin@demo.com` → **Painel** → **Configuração**: seções Candidatos, Júri, Placar e Tema | §3.1 cadastro; §7.3 gerenciamento; §19 reutilização | 3 min |
| 3 | **Telão antes da abertura.** QR Code, contagem regressiva até as 10h, estado da votação | **Painel** → **Apresentação** → **Apresentar**. `F` tela cheia, `Q` sai | §4.4 Modo Evento | 1 min |
| 4 | **A organização abre a urna.** Botão, confirmação e registro na auditoria | **Configuração** → **Operação** → **Abrir urna** | §7.2 controle da urna; §10 auditoria | 1 min |
| 5 | **Público vota pelo celular.** Login com e-mail e senha, lista de curtas, detalhe, escolha, revisão, confirmação e tela de sucesso. Depois tentar votar de novo: "Seu voto está registrado" | Modo dispositivo (390 px). **Sair** → **Entrar** com `publico@demo.com` → **Votar** → escolher → **Revisar voto** → **Confirmar voto** | §6.1 fluxo do público; §3.2 voto único; §13 celular | 3 min |
| 6 | **Jurado vota e corrige.** Painel próprio do jurado; ele pode trocar o voto, e a troca fica no histórico | Volte ao tamanho normal. **Sair** → **Entrar** com `jurado@demo.com` → **Votar como jurado** → escolher → confirmar → alterar o voto | §3.3 júri separado (ver "O que dizer" abaixo) | 2 min |
| 7 | **Crianças votam no totem.** Tela cheia, cartazes grandes, "Você escolheu…? Sim / Não", estrelas e volta sozinho ao início. Depois mostrar o totem **pausado** | Toolbar → **Totem** → **Abrir totem →** → votar. `Alt+D` → Totem → **Pausado**. Sair do totem com o PIN **`1234`** | §4.2 interface infantil; §6.2 fluxo infantil | 2 min |
| 8 | **Acompanhamento ao vivo.** Votos por grupo, votos por minuto, totens, jurados que votaram e que faltam, auditoria | **Sair** → **Entrar** com `admin@demo.com` → **Painel** (Operação). Toolbar → **Opções avançadas** → **Dashboard** → "Simular votos entrando" para os números se moverem | §7.1 dashboard; §10 auditoria | 2 min |
| 9 | **Resultado, exportação e relatório.** Placar com os três grupos e a regra de empate aplicada; CSV e relatório em PDF | Toolbar → **Opções avançadas** → **Cenários** → `FESTIVAL_EMPATE_RESOLVIDO` → **Aplicar** (Festival encerrado com 240 votos do público, júri e 138 infantis). **Painel** → aba Resultado → **Mostrar resultado** → **Baixar tudo** → **Relatório** (imprimir como PDF) | §8 resultado e relatórios; §17 desempate | 2 min |
| 10 | **Revelação no telão.** Trailer, Queridinho do público, Preferido das crianças, Escolha dos jurados, desempate e pódio | **Apresentação** → **Apresentação real** → **Apresentar** → `F` → `Enter` inicia a revelação | §4.4 revelação; §8 modo telão | 3 min |

O ato 9 usa um cenário pronto porque um resultado com dois ou três votos não mostra o placar nem o desempate. Se preferir mostrar o encerramento ao vivo, use **Configuração** → **Operação** → **Encerrar urna** depois do ato 8 e aplique o cenário em seguida.

## O que dizer sobre o que ainda não existe

- **Júri por critério (Direção, Roteiro, Fotografia, Som).** Hoje o jurado escolhe um curta. As notas por critério são a próxima etapa e dependem das regras deles (perguntas abaixo).
- **Pareamento e gestão de totens.** No protótipo, a toolbar faz o papel do pareamento. No produto, a organização gera um código e digita no tablet.
- **Seis curtas no exemplo.** O concurso tem quatro. O exemplo inclui casos de teste: um título muito longo e um curta em rascunho.
- **Trailer.** O link é um vídeo de exemplo.
- **Identificação.** E-mail e senha, ou conta Google; o código por e-mail serve para recuperar a senha. CPF e SMS foram descartados.
- **Infraestrutura.** Banco de dados real, teste de carga, limite de requisições e monitoramento ficam para a versão de produção.

## Perguntas para levar

- Júri: escala das notas, peso de cada critério, como as notas viram placar e o desempate.
- Empate entre curtas: o desempate pelo júri está bom?
- Totens: quantos aparelhos, de que tipo e onde ficam; quem é o adulto mediador em cada um.
- Público esperado e o pico depois das sessões.
- Materiais dos quatro curtas: cartaz, sinopse, direção, duração, equipe e trailer.
- Texto do aviso de privacidade.

## Atalhos do telão

`Espaço` pausa/retoma · `→`/`Enter` avança (inicia a revelação na tela "Votação encerrada") · `←` volta · `T` pula o trailer · `F` tela cheia · `Shift+E` emergência (vai direto ao final) · `Q` sai · `?` ajuda. O painel de controle aparece ao mover o mouse.

## Contingência

- Algo travou: toolbar → **Resetar mock** (rodapé) (ou F5) e recomece do ato em que parou. Para pular direto ao resultado, aplique `FESTIVAL_EMPATE_RESOLVIDO`; reserva: `FESTIVAL_ENCERRADO`.
- A revelação saiu errada: na sala de controle, **Recomeçar** ou **Refazer revelação** volta a cerimônia ao início.
- A tela cheia não abriu: siga em janela; `F` tenta de novo.
