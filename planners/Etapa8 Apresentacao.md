# VaiVota — Fase 1 · Etapa 8: Apresentação (Telão)

> Status: planejada, pronta para implementação.
> Depende de: Etapa 0 (fundação), Etapa 2 (estados da urna e tema), Etapa 4 (candidatos e cartazes), Etapa 6 (pesos, desempate, módulos), Etapa 7 (resultado oficial usado pelo dashboard).
> Fontes: `ModoApresentacao.md` §1–11, `DocumentDesign.md` §5.4, §7.4, §8 e §12, `Dashboard.md` (fonte única do resultado).
> Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4, pnpm.

## 1. Objetivo

Entregar, como mockup navegável, a **tela de apresentação do admin** em `/e/[slug]/admin/apresentar`: sala de controle, palco em tela cheia, fases conforme o estado da urna, trailer, revelação por categorias, pódio, empates, resultado estático, modo ensaio e controles de emergência.

É a tela mais complexa da Fase 1 e a que mais pesa na Semana Tech. Por isso a etapa separa três coisas:

- **Apuração** (função pura que calcula pontuação, posições e empates);
- **Motor da revelação** (roteiro + máquina de estados, sem JSX);
- **Cenas** (componentes visuais que só desenham o que o motor manda).

Nada é salvo em banco. O estado vive em memória (o F5 reinicia tudo).

## 2. Escopo

**Dentro:**
- Sala de controle: aviso de espelhamento, estado do evento, pré-carregamento, escolha entre apresentação real e ensaio, modo de avanço, botão **Apresentar**.
- Palco 16:9 em tela cheia, com atalhos de teclado e sem elementos de interface no telão.
- Fases por estado da urna: antes, ao vivo (cards, QR Code, temporizador, total geral), encerrada aguardando e final estático.
- Trailer (link com fallback gerado, tempo limite e "pular").
- Revelação: categorias (queridinho, preferido, escolha), pódio 3º → 1º, classificação completa opcional.
- Empates (no ranking e nas categorias).
- Modo ensaio e botão de emergência.
- Apuração real em função pura, alimentando também o dashboard (mesma fonte).

**Fora:**
- Sincronização entre telas, controle remoto e "Ver Apresentação" para outros usuários.
- Trailer por candidato (descartado) e vídeo hospedado (futuro).
- Trilha sonora e efeitos (futuro, por licenciamento).
- Tela pública de resultado estático (futuro).
- Tela de configuração da apresentação (o MVP configura por seed; ver §4).

## 3. Premissas das etapas anteriores

Nada disso existe ainda no zip (só a landing e os planners). Se uma etapa anterior sair diferente, o CP1 faz o **ajuste mínimo**, sem refazer a etapa.

| Item | Esperado |
|---|---|
| Store | Context + `useReducer` em `src/mocks/`, montado no `layout` de `/e/[slug]` |
| Sessão mock | papel (`publico` \| `jurado` \| `admin`) |
| Evento mock | slug, nome, logo, estado da urna, janela de votação, módulos ligados, tema e rótulos |
| Candidatos | publicados, com título e cartaz (imagem) |
| Config do placar | três pesos somando 100%, regra de desempate (`juri` \| `publico`) |
| Resultado oficial (Etapa 7) | já existe um mock lido pelo dashboard; o CP1 o **estende** (empates, categorias) sem quebrar o dashboard |
| Dev toolbar | seletores de urna, papel, módulos e tema |
| Layout admin | se a Etapa 6/7 criou um layout com menu lateral em `/admin`, o CP2 move `page.tsx` e `configuracao` para um route group `(painel)`; **as URLs não mudam** |

> Convenção de pastas: abaixo uso `src/features/apresentacao/` e `src/mocks/`. Ajuste ao que a Etapa 0 definir.

## 4. Decisões tomadas

| Tema | Decisão |
|---|---|
| Rota | `/e/[slug]/admin/apresentar`, fora do menu do admin (route group), em tela própria |
| Acesso | Só `admin`. Sem sessão redireciona para o login; outro papel vê "Acesso restrito" e **nenhum dado de resultado** |
| Lógica separada da tela | `apurar()` e `montarRoteiro()` são funções puras; as cenas não calculam nada |
| Apuração real | A fórmula ponderada é implementada de verdade e roda sobre votos fixture. O dashboard (Etapa 7) e o telão leem o mesmo `ResultadoOficial` |
| Resultado congelado | Gerado na ação `encerrarUrna` e **nunca recalculado**; refazer só pela ação "Refazer revelação" (auditoria fake) |
| Palco | Canvas lógico de **1920×1080**, escalado para caber na tela (letterbox). Funciona igual em 1080p, 4K e janela pequena |
| Estados do palco | Dependem do estado da urna e de `resultadoRevelado` (tabela do §5) |
| Roteiro real × ensaio | **Real:** só a revelação (as fases ao vivo seguem o estado da urna). **Ensaio:** percorre ao vivo → encerrada → revelação → final, com dados simulados |
| Ensaio não grava | Não altera `banco`, não marca `resultadoRevelado`, tem selo "ENSAIO" sempre visível |
| Cenário do ensaio | Escolhido na sala de controle (inclui os empates, para ensaiar a cena) |
| Cenário do resultado real | Escolhido na dev toolbar e aplicado quando a urna é encerrada |
| Execução local | O motor roda no navegador, sem consultar nada durante a revelação |
| Antes da revelação | `obterEstadoAoVivo()` devolve só total geral, estado da urna e tempo. O resultado só sai por `obterResultadoOficial()` (admin + urna encerrada) |
| Votos por candidato ao vivo | Desligado por padrão; ligar pela toolbar mostra só o total do candidato nos cards |
| Modo de avanço | Automático com pausa disponível (padrão do DD §8.4); escolhido também na sala de controle |
| Configuração da apresentação | Por seed; a toolbar tem uma seção "Apresentação" para testar as variações (§6) |
| Trailer | Link YouTube/Vimeo em iframe; se não carregar no tempo limite, cai no trailer gerado. A duração do trailer por link é **configurada** (limitação, ver §12) |
| QR Code | Biblioteca `qrcode.react` (única dependência nova da etapa), apontando para `/e/{slug}` |
| Relógio | `useRelogioServidor` com deslocamento ajustável pela toolbar, para provar que o temporizador não usa a hora local |
| Animações | CSS puro (keyframes e transitions), sem biblioteca. `prefers-reduced-motion` troca por fade simples e números sem contagem animada |
| Sigilo da sala | O "roteiro" da sala lista só os **nomes das cenas**, nunca vencedores, para não estragar a cerimônia se a tela estiver espelhada |
| Temas | Palco escuro com tokens derivados do tema; rótulos das categorias vêm do tema |

## 5. Fases do palco

| Urna | Resultado revelado? | Fase |
|---|---|---|
| Não iniciada | — | **Pré-votação:** nome, logo, candidatos, "A votação começa em…" |
| Aberta | — | **Ao vivo:** cards, QR Code, temporizador, total geral, mensagens de abertura e "reta final" |
| Encerrada | Não | **Encerrada:** "Votação encerrada", aguardando o admin iniciar a revelação |
| Encerrada | Em andamento | **Revelação:** roteiro da §7 |
| Encerrada | Sim | **Final estático:** resultado final (pódio e categorias) sem animação |

**Comportamentos da fase ao vivo:**
- A **mensagem de abertura** aparece por alguns segundos ao entrar na fase.
- A mensagem de **reta final** aparece quando o tempo restante cai abaixo do limiar do seed.
- Quando o tempo chega a zero: com encerramento automático ligado, a urna passa para encerrada no store; desligado, mostra "Tempo esgotado, aguardando a organização".
- O palco **reage ao store em tempo real**: mudar a urna na toolbar com a apresentação aberta troca a fase.

## 6. Configuração da apresentação (seed + toolbar)

| Campo | Padrão | Como testar |
|---|---|---|
| Link do trailer | válido | Toolbar: válido / inválido / ausente |
| Usar trailer gerado | não (só se o link falhar) | Toolbar |
| Incluir candidatos no trailer gerado | não | Toolbar |
| Mostrar classificação completa | **não** | Toolbar |
| Modo de avanço | automático | Sala de controle |
| Mostrar votos por candidato ao vivo | não | Toolbar |
| Limiar da "reta final" | 5 min | Toolbar |
| Rótulos das categorias | do tema | Trocar o tema na toolbar |

Rótulos de exemplo para conferir o white-label: Festival → "Queridinho do público", "Preferido das crianças", "Escolha dos jurados"; Semana Tech → rótulos próprios definidos no seed.

## 7. Roteiro da revelação

```
trailer
→ categoria: queridinho do público   (grupo popular)
→ categoria: preferido das crianças  (grupo infantil)   [pulada se o módulo estiver desligado]
→ categoria: escolha dos jurados     (grupo júri)       [pulada se o módulo estiver desligado]
→ pódio: 3º → 2º → 1º  (pontuação final)
→ classificação completa                                [só se ligada]
→ final estático
```

**Regras do roteiro (`montarRoteiro`):**
- Categorias sem módulo no evento são puladas.
- Categoria mostra o vencedor e a **quantidade de votos**; com co-vencedores, mostra todos.
- Pódio mostra **pontuação final**, não votos brutos.
- Pódio inclui **todos os candidatos com posição ≤ 3**, então com posição compartilhada pode haver mais de três nomes.
- Com menos de 3 candidatos, o pódio mostra os que existirem.
- **Cena de desempate** é inserida antes de revelar a pior posição do trecho empatado, sempre que algum dos empatados estiver no pódio.
- Classificação completa mostra só a pontuação, sem destaque negativo.
- Cada cena tem `passos` internos (suspense → nome → detalhe). "Avançar" consome os passos antes de passar à próxima cena.

**Modo ensaio acrescenta no início:** `ao vivo (simulado)` → `encerrada`.

## 8. Apuração e empates

```
pontuação(c) = Σ por grupo ativo:  peso_grupo × (votos_c_no_grupo ÷ total_do_grupo)
```

- Grupo com módulo desligado entra com peso 0; grupo com total 0 contribui 0 (sem dividir por zero).
- Os pesos vêm da Etapa 6 e já somam 100%.
- **Invariante de conferência:** a soma das pontuações de todos os candidatos é igual à soma dos pesos usados.
- **Comparação com tolerância:** arredondar a pontuação (ex.: 6 casas) antes de comparar, para que dois candidatos matematicamente empatados não se separem por erro de ponto flutuante.

**Ranking final:**
1. Ordena por pontuação (desc).
2. Empatados: aplica o critério configurado (maior votação do **júri** ou do **público**).
3. Se ainda empatar: **posição compartilhada** ("1º lugar — empate"), sem decidir sozinho. A posição seguinte pula (1º, 1º, 3º).

**Categorias:** desempata pela pontuação final; se persistir, **co-vencedores**.

```ts
type Grupo = "popular" | "juri" | "infantil";

type ResultadoOficial = {
  geradoEm: string;
  pesos: Record<Grupo, number>;
  criterioDesempate: "juri" | "publico";
  totais: Record<Grupo, number>;
  placares: Record<Grupo, { candidatoId: string; votos: number }[]>;
  ranking: { candidatoId: string; pontuacao: number; posicao: number }[];
  categorias: {
    grupo: Grupo;
    vencedores: { candidatoId: string; votos: number }[];
    desempatadoPorPontuacao: boolean;
  }[];
  empates: {
    posicoes: number[];               // trecho disputado, ex.: [2, 3]
    candidatoIds: string[];
    criterioAplicado: "juri" | "publico";
    resolvido: boolean;               // false = posição compartilhada
    vencedorId?: string;
  }[];
};
```

**Cenários de teste (toolbar e ensaio):**

| # | Cenário | O que exercita |
|---|---|---|
| 1 | Padrão | 6+ candidatos, sem empates, três categorias |
| 2 | Empate no pódio, resolvido pelo critério | Cena de desempate com vencedor destacado |
| 3 | Empate persistente no 1º lugar | Posição compartilhada, "1º lugar — empate" |
| 4 | Co-vencedores em uma categoria | Duas pessoas na mesma categoria |
| 5 | Sem módulo infantil | Categoria pulada, peso 0 |
| 6 | Só 2 candidatos | Pódio com 2 nomes |

## 9. Contratos do motor (pseudotipos)

```ts
type Cena =
  | { tipo: "aoVivo"; simulado: true }
  | { tipo: "encerrada" }
  | { tipo: "trailer" }
  | { tipo: "categoria"; grupo: Grupo; passos: number }
  | { tipo: "desempate"; empateIndex: number; passos: number }
  | { tipo: "podio"; posicao: number; passos: number }
  | { tipo: "classificacao" }
  | { tipo: "final" };

apurar(votos, pesos, criterio): ResultadoOficial                    // pura
montarRoteiro(resultado, config, modo: "real" | "ensaio"): Cena[]   // pura e determinística

// Máquina de estados (reducer)
type EstadoMotor = {
  cenaIndex: number; passo: number;
  pausado: boolean; modoAvanco: "auto" | "manual";
  trailer: "carregando" | "link" | "gerado";
};
// ações: avancar, voltar, pausar, retomar, pularTrailer, trailerFalhou,
//        irParaFinal (emergência), reiniciar

// Funções do "servidor" simulado (mesmas assinaturas na Fase 2)
obterEstadoAoVivo(): Promise<{ urna; totalGeral; agora; fimJanela }>   // sem resultado
obterResultadoOficial(): Promise<ResultadoOficial | { erro: "nao_autorizado" | "urna_nao_encerrada" }>
```

## 10. Controles de teclado

O palco não mostra botões. Os atalhos abaixo valem durante a apresentação e aparecem numa **ajuda** (tecla `?`) que some sozinha.

| Tecla | Ação |
|---|---|
| `Espaço` | Pausar / retomar |
| `→` ou `Enter` | Avançar (passo ou cena; na fase "encerrada", inicia a revelação) |
| `←` | Voltar |
| `T` | Pular trailer |
| `F` | Entrar / sair da tela cheia |
| `Shift+E` | **Emergência:** vai direto ao resultado estático |
| `Q` | Sair da apresentação (com confirmação se estiver no meio da revelação) |
| `?` | Mostrar / esconder a ajuda |

- Sair da tela cheia (Esc nativo) **pausa** a revelação e mostra um aviso; não encerra a apresentação.
- Os controles do admin (barra com os mesmos comandos) existem só na sala de controle e numa HUD que aparece ao mover o mouse e some após alguns segundos.

## 11. Regras de entrega (valem para todos os checkpoints)

- Cada checkpoint termina com `pnpm lint` e `pnpm build` **sem erros**.
- Entrega em **zip cumulativo** (`VaiVota-E8-CP1.zip`, `CP2`, …), sem `node_modules` nem `.next`.
- Só avança para o próximo depois da validação do atual.
- Cada checkpoint lista o que foi feito, o que ficou fake e como validar.
- **React Compiler ativo:** como `babel-plugin-react-compiler` e o lint do Next estão no projeto, timers e animações do motor devem usar assinatura em `useEffect` com limpeza ou handlers de evento, sem `setState` síncrono dentro de efeito e sem ler `ref.current` durante a renderização.

## 12. Checkpoints

### CP1 — Apuração, resultado oficial e motor (sem tela nova)

**Objetivo:** deixar pronta e conferida toda a lógica, para as cenas só desenharem.

**Tarefas:**
- Tipos do §8 e §9.
- `apurar()` pura, com tolerância de ponto flutuante, grupos desligados (peso 0), grupo com total 0 e desempates (ranking e categorias).
- Fixtures de votos para os 6 cenários do §8.
- Ação `encerrarUrna` no store gera e **congela** o `ResultadoOficial`; `obterResultadoOficial()` só responde a admin com urna encerrada.
- Ajuste mínimo no resultado da Etapa 7 para usar o `ResultadoOficial` estendido, sem quebrar o dashboard.
- `montarRoteiro()` pura (regras do §7, incluindo inserção das cenas de desempate) e o reducer do motor.
- `ConfigApresentacao` no seed e rótulos de categoria nos dois temas.
- Toolbar: seção "Apresentação" (cenário do resultado, link do trailer, classificação completa, trailer gerado com candidatos, parcial ao vivo, limiar, deslocamento do relógio, "simular votos chegando") e botão "Resetar apresentação".

**Validação:**
- `pnpm lint` e `pnpm build` limpos.
- Para cada cenário: soma das pontuações = soma dos pesos; ranking e empates conferem com a conta feita à mão.
- Cenário 2 gera o roteiro com a cena de desempate antes do 3º; cenário 3 gera "1º lugar — empate"; cenário 5 não tem a categoria infantil; cenário 6 tem 2 cenas de pódio.
- Os números do dashboard (Etapa 7) continuam iguais aos do `ResultadoOficial`.

**Entrega:** `VaiVota-E8-CP1.zip`

### CP2 — Rota, guarda e sala de controle

**Objetivo:** o admin entra, vê o estado, prepara e clica em **Apresentar**.

**Tarefas:**
- Rota `/e/[slug]/admin/apresentar` fora do menu do admin (route group, se necessário).
- Guarda: sem sessão → login; não admin → "Acesso restrito", sem nenhum dado de resultado.
- Sala de controle: nome e estado do evento, fase em que o palco vai abrir, **aviso de espelhamento** ("recomenda-se estender a tela e deixar a apresentação no monitor do telão"), escolha **Apresentação real / Ensaio**, modo de avanço (auto/manual), cenário do ensaio, roteiro (só nomes das cenas) e lista dos atalhos.
- **Pré-carregamento** dos cartazes e do logo, com barra de progresso; imagem que falha usa placeholder e gera aviso, sem impedir o início.
- Botão **Apresentar**: entra em tela cheia (Fullscreen API), libera o áudio (gesto do clique) e abre o palco; falha de tela cheia mostra aviso, sem travar.
- Esqueleto do palco: canvas 1920×1080 escalado, fundo com o tema, atalhos `F`, `Q` e `?`.

**Validação:**
- Papel `publico` e `jurado` não veem dados; admin entra.
- Preload mostra progresso e tolera imagem quebrada.
- O palco escala corretamente em janela pequena e em tela grande.
- Lint e build limpos.

**Entrega:** `VaiVota-E8-CP2.zip`

### CP3 — Palco e fases por estado da urna

**Objetivo:** pré-votação, ao vivo e encerrada respondendo ao estado.

**Tarefas:**
- Pré-votação: nome, logo, candidatos, "A votação começa em…" com contagem regressiva.
- Ao vivo: cards dos candidatos, **QR Code** (`qrcode.react`), **temporizador** pela hora do servidor simulado, **total geral** atualizado por polling a cada poucos segundos, mensagens de abertura e de reta final.
- Votos por candidato nos cards **só** se a opção da toolbar estiver ligada.
- Tempo zerado: encerra sozinho ou mostra "Tempo esgotado", conforme o seed.
- Encerrada: "Votação encerrada", aguardando o admin (`Enter` inicia a revelação, que só começa no CP5).
- Reação ao store em tempo real; atalhos básicos do palco.

**Validação:**
- Percorrer a tabela do §5 pela toolbar, linha a linha.
- Mudar o deslocamento do relógio altera o temporizador (prova que não usa a hora local).
- Com "simular votos chegando" ligado, o total cresce; sem o parcial ligado, nenhum candidato mostra votos.
- Textos legíveis nos dois temas.

**Entrega:** `VaiVota-E8-CP3.zip`

### CP4 — Trailer

**Objetivo:** abrir a revelação com o trailer do evento, com fallback.

**Tarefas:**
- Interpretação do link (YouTube/Vimeo) para URL de embed; link inválido ou ausente vai direto ao gerado.
- Iframe com `allow="autoplay; fullscreen"` e **tempo limite**: se não carregar, cai no trailer gerado.
- **Trailer gerado** em CSS: nome, logo, data e identidade do evento; com a opção ligada, passa também imagens e nomes dos candidatos.
- Duração do trailer por link vem da configuração (seed); o gerado tem duração fixa em `duracoes.ts`.
- **Pular** (`T`) a qualquer momento e botão equivalente na HUD.
- Simulação de falha pela toolbar (link inválido) para validar o fallback.

**Validação:**
- Link válido, link inválido e ausente: 3 caminhos, sem tela em branco.
- Pular funciona nos dois tipos de trailer.
- Com `prefers-reduced-motion`, o gerado usa fade simples.

**Entrega:** `VaiVota-E8-CP4.zip`

### CP5 — Condução da revelação: categorias e controles

**Objetivo:** o motor roda de verdade, com as três categorias.

**Tarefas:**
- Ligar o reducer ao palco: `Enter` na fase "encerrada" inicia o roteiro real.
- Cena de **categoria** (suspense → nome → votos), com rótulo do tema, co-vencedores e pulo automático das categorias sem módulo.
- Modos **automático** (cada passo roda e segue) e **manual** (espera o admin), pausa nos dois, avançar e voltar.
- Aviso e pausa ao sair da tela cheia.
- Progresso mantido no store: sair e voltar permite "Continuar de onde parei" ou "Recomeçar".
- Ajuda (`?`) e HUD com auto-ocultação.

**Validação:**
- Cenário 4 mostra os co-vencedores; cenário 5 não mostra a categoria infantil.
- Auto, manual, pausar, voltar e avançar funcionam sem pular passos.
- Sair e voltar continua da cena certa.
- Nenhum elemento de interface visível no palco além da cena (a HUD só aparece com o mouse).

**Entrega:** `VaiVota-E8-CP5.zip`

### CP6 — Pódio, classificação completa e final estático

**Objetivo:** fechar a revelação.

**Tarefas:**
- Pódio 3º → 2º → 1º com a **pontuação final** (contagem animada, desligada em reduced motion) e efeito de celebração em CSS no 1º.
- Menos de 3 candidatos mostra os que existirem.
- Classificação completa (opcional, desligada por padrão): lista só a pontuação, sem destaque negativo.
- **Final estático** (sem animação): pódio e categorias na mesma tela.
- Ao concluir a revelação no modo real, marca `resultadoRevelado`; ao reabrir, o palco já abre no final estático.
- "Refazer revelação" na sala de controle, com confirmação e entrada no log de auditoria fake.

**Validação:**
- Cenário 6 mostra pódio com 2 nomes.
- Classificação completa só entra com a opção ligada.
- Os números do final estático batem com os do dashboard.
- Reabrir a apresentação depois de revelada abre no final estático, e "Refazer" volta ao início.

**Entrega:** `VaiVota-E8-CP6.zip`

### CP7 — Empates

**Objetivo:** animação de desempate e posição compartilhada.

**Tarefas:**
- Cena de desempate: candidatos **lado a lado**, **critério** exibido na tela e **vencedor destacado**.
- Empate persistente: "1º lugar — empate" (ou a posição correspondente), sem destacar vencedor e sem decidir sozinho.
- Pódio com posição compartilhada (1º, 1º, 3º) e mais de três nomes quando necessário.
- Empate em categoria: co-vencedores (já do CP5) com a indicação de que a pontuação final foi usada para tentar desempatar.
- Final estático e classificação completa refletem as posições compartilhadas.

**Validação:**
- Cenário 2: desempate resolvido pelo critério (alternar júri/público na Etapa 6 muda o vencedor).
- Cenário 3: nenhuma tela decide o vencedor; o 3º lugar aparece depois do 1º compartilhado.
- Tudo coerente com o `ResultadoOficial` e com o dashboard.

**Entrega:** `VaiVota-E8-CP7.zip`

### CP8 — Modo ensaio e emergência

**Objetivo:** ensaiar sem risco e ter saída rápida.

**Tarefas:**
- Modo ensaio: roteiro `ao vivo (simulado) → encerrada → revelação → final`, com votos simulados, relógio comprimido e cenário escolhido na sala.
- Selo **ENSAIO** sempre visível; o ensaio **não altera** o `banco` nem `resultadoRevelado`.
- Emergência (`Shift+E`): vai direto ao final estático em qualquer cena, inclusive durante um desempate ou trailer.
- Sair do ensaio volta à sala de controle sem efeito colateral.
- Registro de ações (revelar, refazer, emergência, sair) no log de auditoria fake, só em modo real.

**Validação:**
- Rodar o ensaio de ponta a ponta em cada um dos 6 cenários; o contador de depuração e `resultadoRevelado` não mudam.
- Emergência funciona em todas as cenas.
- Apresentação real depois de um ensaio começa do zero.

**Entrega:** `VaiVota-E8-CP8.zip`

### CP9 — Fechamento da Etapa

**Objetivo:** acabamento, revisão geral e checklist.

**Tarefas:**
- Conferir o palco em 1080p, 4K e janela reduzida; textos legíveis a distância (tamanho mínimo no canvas lógico) e contraste adequado para projetor nos dois temas.
- `prefers-reduced-motion`: sem contagens animadas, sem celebração, trocas por fade.
- Acessibilidade da sala de controle (foco visível, teclado, rótulos) e `aria-live` discreto no palco, sem ler a revelação em voz alta antes da hora.
- Revisar textos em pt-BR e uso dos rótulos do tema.
- Percorrer a tabela do §5, os 6 cenários do §8 e os critérios do §14.
- Atualizar o README ou este planner com o que mudou.

**Validação:** `pnpm lint` e `pnpm build` limpos, checklist do §14 marcado.

**Entrega:** `VaiVota-E8-CP9.zip` (final da Etapa 8)

## 13. O que fica fake

- Nenhum dado é persistido: tudo some no F5.
- Votos e totais vêm de fixtures; o total ao vivo é simulado pela toolbar.
- "Hora do servidor" é um relógio mock com deslocamento.
- Trailer por link: sem integração com as APIs do YouTube/Vimeo, então a detecção de falha é só por tempo limite e a duração é configurada.
- Auditoria é um log em memória.
- Sem sincronização entre telas, sem autenticação real, sem trilha sonora.

## 14. Critérios de aceitação

- [ ] Admin clica em Apresentar e a tela corresponde ao estado do evento; outros papéis não recebem dados de resultado.
- [ ] Na fase ao vivo aparecem cards, QR Code, temporizador (pela hora do servidor mock) e total geral; sem votos por candidato por padrão.
- [ ] A revelação segue a ordem do §7 e pula categorias sem módulo.
- [ ] O trailer cai no gerado se o link falhar e pode ser pulado a qualquer momento.
- [ ] O pódio mostra a pontuação final e revela 3º → 2º → 1º; com menos de 3 candidatos mostra os que existirem.
- [ ] Empates aparecem com animação, critério na tela e vencedor destacado; empate persistente vira posição compartilhada sem decisão automática.
- [ ] Categorias empatadas resultam em co-vencedores.
- [ ] Classificação completa fica desligada por padrão e pode ser ativada.
- [ ] Telão, dashboard e exportação mostram os mesmos números (resultado congelado, gerado uma vez ao encerrar).
- [ ] A soma das pontuações bate com a soma dos pesos, e empates matemáticos não se separam por erro de ponto flutuante.
- [ ] Modo ensaio roda por todo o roteiro sem alterar dados e com selo visível; o botão de emergência leva ao resultado estático em qualquer cena.
- [ ] Atalhos de teclado funcionam, o palco não mostra controles, e sair da tela cheia pausa em vez de encerrar.
- [ ] Aviso sobre espelhamento aparece na sala de controle; o roteiro da sala não revela vencedores.
- [ ] Palco legível em 1080p e 4K, com `prefers-reduced-motion` respeitado e informação nunca só por cor ou animação.
- [ ] `pnpm lint` e `pnpm build` limpos em todos os checkpoints.

## 15. Pendências

- **Teclas:** `Shift+E` para emergência e `Q` para sair estão assumidas; confirmar se não conflitam com o hábito de quem vai operar no dia.
- **Durações:** tempos padrão de cada cena, do trailer gerado e das mensagens de abertura e reta final (ficam em `duracoes.ts`, fáceis de ajustar).
- **Modo de avanço padrão:** assumido automático com pausa.
- **Fim do trailer por link:** na versão real, detectar `ENDED` e erro via API do player (YouTube/Vimeo) em vez de duração fixa e tempo limite.
- **Direção visual:** animações e efeito de desempate são uma primeira proposta; ajustar depois de ver rodando.
- **Posição compartilhada com mais de 3 nomes no pódio:** assumido mostrar todos; confirmar se prefere limitar a 3 na tela.
- **Reabrir depois de sair no meio da revelação:** o progresso fica só em memória na Fase 1; decidir se na versão real persiste (localStorage ou servidor).
- **`qrcode.react`:** única dependência nova; se preferir zero dependências, o QR vira um desenho fictício na Fase 1.
