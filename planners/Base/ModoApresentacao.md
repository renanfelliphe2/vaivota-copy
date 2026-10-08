# VaiVota — Funcionalidade 4: Modo Apresentação (Telão)

> Status: definida em conversa, pronta para implementação.
> Revisão 07/10/2026: alinhado às revisões 3 e 4 dos planners.
> Depende de: `Login.md` (evento, urna), `Jurado.md` (fórmula, desempate) e `VotoInfantil.md` (placar infantil).
> Stack: React/TS + Next.js.

## 1. Objetivo

Oferecer ao admin uma tela cinematográfica para o telão: durante a votação, mostra o andamento e o QR Code de voto; depois do encerramento, conduz a **revelação do resultado** com animações, categorias, pódio e tratamento de empates.

## 2. Escopo

**Dentro:**
- Tela de apresentação exclusiva do admin, em tela cheia.
- Fase ao vivo (antes e durante a votação) e fase de revelação (após o encerramento).
- Trailer único do evento.
- Revelação por categorias, pódio e empates.
- Resultado oficial congelado.
- Modo ensaio e controles de emergência.

**Fora:**
- Sincronização entre várias telas e controle remoto.
- "Ver Apresentação" para outros usuários (não existe nesta versão).
- Trailer por candidato (descartado).
- Dashboard e exportação: arquivo próprio.

## 3. Decisões tomadas

| Tema | Decisão |
|---|---|
| Quem usa | **Só o admin**. Ele espelha/estende a tela no telão e clica em **Apresentar** |
| Execução | **Local**, sem sincronização com o servidor durante a apresentação |
| Trailer | **Um único trailer do evento**, por link/embed (nunca vídeo armazenado); não apresenta os candidatos individualmente |
| Revelação | Trailer → categorias → pódio → (opcional) classificação completa |
| Empate | Descoberto **ao vivo**, com animação que destaca o desempate e mostra o critério |
| Classificação completa | Opcional por evento, **desligada por padrão** (evita desanimar quem ficou abaixo) |
| Resultado | **Congelado** no encerramento da urna; telão e dashboard leem a mesma fonte |

## 4. Um botão, várias fases

O botão **Apresentar** abre a tela conforme o estado do evento:

1. **Antes da votação:** nome e logo do evento, candidatos, "A votação começa em…".
2. **Votação aberta (fase ao vivo):**
   - Cards dos candidatos.
   - **QR Code** de acesso à votação.
   - **Temporizador** baseado na hora do servidor.
   - **Total geral** de votos em tempo real.
   - Mensagens de abertura e "reta final".
3. **Urna encerrada, resultado ainda não revelado:** "Votação encerrada" e aguardando o admin.
4. **Revelação:** sequência da seção 5.
5. **Depois da revelação:** resultado final estático.

> Durante a votação, **não** se mostram votos por candidato por padrão, só o total geral (opção por evento). O detalhe fica para a revelação.

## 5. Sequência da revelação

1. **Trailer do evento.**
2. **Queridinho do público:** mais votado pelo **público geral**.
3. **Preferido das crianças:** mais votado pelo voto **infantil**.
4. **Escolha dos jurados:** mais votado pelo **júri**.
5. **Pódio:** **pontuação final** (fórmula ponderada), revelando do 3º ao 1º lugar.
6. **Classificação completa (opcional):** pontuação de todos os candidatos.

**Regras:**
- Categorias sem módulo no evento (ex.: sem voto infantil) são **puladas**.
- Os nomes das categorias são **configuráveis** por evento (white-label).
- As categorias mostram **só o candidato vencedor**, com a **quantidade de votos** (ou pontuação) dele. **Nunca** se mostra quem votou em quem (inclusive na escolha dos jurados: os votos identificados do júri não vão ao telão).
- O pódio mostra a **pontuação final**, não a contagem bruta, porque a colocação vem da fórmula ponderada.
- A classificação completa exibe só a **pontuação**, sem destaque negativo, e fica desligada por padrão. Os números completos ficam no dashboard e na exportação.
- Se o evento tiver menos de 3 candidatos, o pódio mostra os que existirem.

## 6. Empates

**Empate no ranking final (por posição):**
- Aplica-se o **desempate configurado** no evento: maior nota do júri ou do público (ver `Jurado.md`).
- A animação coloca os empatados **lado a lado**, mostra o **critério** na tela e **destaca o vencedor** do desempate.
- Se o desempate também empatar, os candidatos dividem a posição ("1º lugar — empate") e o sistema **não decide sozinho**.

**Empate em categoria (queridinho, preferido, escolha):**
- Desempata-se pela **pontuação final**; se persistir, há **co-vencedores**.

> O resultado congelado já registra quais posições empataram e qual critério resolveu, para a animação ser determinística.

## 7. Trailer do evento

- **Fonte:** link de vídeo (YouTube ou Vimeo) cadastrado na configuração do evento.
- **Fallback:** **trailer gerado** no navegador, com nome, logo, data e identidade visual do evento. Opção de **incluir imagens e nomes dos candidatos** (desligada por padrão).
- Se o link falhar (removido, sem internet, embed bloqueado), cai no trailer gerado após um **tempo limite**.
- **Pular trailer** disponível a qualquer momento.
- O clique em **Apresentar** libera o áudio (navegadores bloqueiam som automático sem interação).
- **Rev. 08/10/2026:** o trailer de link começa sozinho ao entrar na cena. Como o telão é uma aba própria, se ela ainda não recebeu nenhum clique ou tecla o vídeo começa **mudo** (única forma de o navegador deixar rodar); o som volta no primeiro clique ou tecla no telão. Clicar uma vez no telão (ou apertar F para a tela cheia) antes da cerimônia garante o som desde o início.
- **Nunca se armazena vídeo; o trailer é sempre link/embed.** Não existe trailer por candidato.

## 8. Controle e operação no dia

- Tela cheia, com **controles por atalhos de teclado** (pausar, avançar, voltar, pular, sair) e sem elementos de interface visíveis no telão.
- **Modo de avanço** configurável: automático (cada etapa roda e segue) ou manual (espera o admin entre etapas). Pausar é possível nos dois.
- **Aviso sobre espelhamento:** ao espelhar, tudo o que o admin faz na tela vai para o telão. Recomenda-se **estender a tela** e deixar a apresentação no monitor do telão. Se espelhar, evitar sair da tela cheia.
- **Modo ensaio:** roda a apresentação inteira com dados simulados, sem afetar dados reais.
- **Botão de emergência:** pula para o resultado estático se uma animação travar.
- **Pré-carregamento** de imagens e vídeo antes de iniciar.
- Layout 16:9, adaptável a 1080p e 4K; respeita `prefers-reduced-motion` e mantém contraste para projetor.

## 9. Dados e resultado congelado

- Ao **encerrar a urna**, gera-se o **ResultadoOficial** (não é recalculado depois).
- Conteúdo: pesos usados, placares por grupo (popular, júri, infantil), pontuação final por candidato, posições, categorias, empates e critério de desempate aplicado.
- A apresentação e a exportação do dashboard leem **a mesma fonte**.
- Correções só por ação administrativa **auditada** (novo cálculo gera novo registro).

**Configuração do evento (ConfigApresentacao):** link do trailer, usar trailer gerado, incluir candidatos no trailer gerado, mostrar classificação completa, modo de avanço, rótulos das categorias, mostrar votos por candidato ao vivo (padrão: não), limiar da mensagem "reta final".

## 10. Segurança

- O resultado só é entregue ao **admin autenticado**, validado no servidor; nada de resultado chega ao navegador antes da revelação.
- Antes da revelação, o servidor responde apenas com estado ao vivo (total geral, estado da urna, tempo).
- Ações de revelar, refazer e recalcular são registradas em auditoria.

## 11. Critérios de aceitação

- [ ] Admin clica em Apresentar e a tela corresponde ao estado do evento.
- [ ] Na fase ao vivo aparecem cards, QR Code, temporizador e total geral.
- [ ] A revelação segue a ordem definida e pula categorias sem módulo.
- [ ] O trailer cai no gerado se o link falhar, e pode ser pulado.
- [ ] O pódio mostra a pontuação final e revela 3º → 2º → 1º.
- [ ] Empates aparecem com animação, critério na tela e vencedor destacado; empate persistente vira posição compartilhada.
- [ ] Classificação completa fica desligada por padrão e pode ser ativada.
- [ ] Telão e exportação mostram os mesmos números (resultado congelado).
- [ ] Usuário que não é admin não recebe dados de resultado.
- [ ] Modo ensaio roda com dados simulados e o botão de emergência leva ao resultado estático.

## 12. Pendências

- **Resolvida (rev. 3/4):** modo de avanço padrão automático com pausa (DD §8.4), configurável por evento.
- **Resolvida (rev. 4, E21):** durações de cada etapa e do trailer gerado mantidas nas constantes do planner (Etapa 8), ajustadas no ensaio.
- **Resolvida (08/10/2026):** direção visual cinematográfica. Palco escuro tingido pela cor primária, com holofotes e poeira de luz; cada cena abre saindo do preto. Categoria: roleta de suspense → clarão, raios e confete → contagem de votos. Desempate: carimbo "Empate!" → barras de votos do critério → vencedor iluminado. Pódio físico montado do 3º ao 1º (degraus sobem, o candidato pousa no degrau, a pontuação conta). Final em dois atos: o pódio só com os vencedores e, depois de alguns segundos, cards com pontuação, votos e percentual por grupo e selos das categorias vencidas. O resultado estático abre direto nos cards.
- Tela pública de resultado estático após o evento (futuro).
- Trilha sonora e efeitos (futuro, por licenciamento).
