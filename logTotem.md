# Planner: log e sessões do totem

Criado em 26/11/2026, depois da 1ª sessão da Mostra Infantil (144 crianças informadas, 96 votos no banco).
**Prazo: tudo no ar e conferido antes das 13:00 de 26/11** (a próxima sessão é às 14:00). Este arquivo é o ponto de retomada:
se a conversa acabar no meio, uma nova sessão lê este arquivo, vê a última fase marcada e continua dali.

## Como retomar

1. Leia a seção **Estado** abaixo: a última fase com `[x]` foi concluída; a primeira com `[ ]` é a próxima.
2. Rode `git log --oneline -5` e `git status` para ver o que ficou sem commit.
3. Cada fase termina com testes verdes e um commit próprio (`feat(totem): ... (logTotem fase N)`). Fase sem commit = refazer a
   conferência dela antes de seguir.
4. **Antes de enviar (fase 8) e antes de migrar o Supabase, pergunte ao usuário.** Nada vai ao ar sem a ordem dele.
5. Telas não são abertas em navegador por aqui (o Cold Turkey derruba o navegador headless): quem confere as telas é o usuário,
   pelo **Ver preview** da página Totens e no próprio totem.

## Estado

- [x] Fase 0: backup e linha de base (26/11 10:36: tag `backup/antes-log-totem` em `74677ff`;
      `backups/antes-log-totem-2026-11-26T13-36-37-674Z.json` com evento 1, categoria 3, candidato 13, dispositivo 1,
      dispositivo_categoria 1, voto_infantil 96, voto 0, auditoria 133; 22 migrações em dia; 582 + 269 testes; rotas 200)
- [ ] Fase 1: banco (migração aditiva `sessao_totem`)
- [ ] Fase 2: servidor (sessões no voto, RPCs do menu, funil no relatório)
- [ ] Fase 3: funil e log no aparelho
- [ ] Fase 4: contador animado na tela de sucesso
- [ ] Fase 5: menu do PIN (Analisar votos, Encerrar sessão, Sair)
- [ ] Fase 6: tela de análise no aparelho
- [ ] Fase 7: testes, migração no Supabase, envio
- [ ] Fase 8: conferência com o backup e limpeza

---

## Decisões (combinadas com o usuário em 26/11/2026)

- **O totem nunca mostra qual item é o mais votado.** Nem na análise, nem no log, nem no contador. Só quantidades, tempos e o funil.
- **Sessão só agrupa votos.** Não trava nada: sem sessão aberta, o voto abre uma sozinho. Encerrar sessão não pausa o totem.
- **Sessões e votos ficam no servidor**; o **log de toques fica no aparelho** (é o que não chega ao servidor: desistências, erros de
  rede) e vai resumido (funil) no relatório de sincronização.
- **Encerramento automático por inatividade**: padrão **60 minutos**, configurável na tela de análise do aparelho e guardado no
  servidor (no `dispositivo`). A regra roda no servidor, no voto: se o último voto da sessão aberta (ou a abertura, sem votos) tem
  mais de X minutos, ela é encerrada como `INATIVIDADE` e o voto abre a seguinte. Sem relógio rodando no aparelho.
- **Contador da tela de sucesso vem da resposta do servidor** (nunca contagem local): "votos nesta sessão".
- **Crianças esperadas** (opcional) ao abrir a sessão: o resumo mostra "96 de 144 (67%)", além da comparação com a anterior.
- **Menu inteiro atrás do PIN**: o botão do canto pede o PIN e só então abre Analisar votos, Encerrar sessão e Sair.
- **Funil** (por sessão): toques em "Toque para votar", chegadas ao "É esse?", confirmações, "Voltar", desistências por tempo
  (na escolha e no "É esse?"), erros (por código: `REDE`, `DISPOSITIVO_INATIVO`...), retentativas e retentativas que deram certo,
  votos registrados. Nada da criança, nada do item escolhido.
- Gráficos mais elaborados do painel ficam para uma segunda rodada se faltar tempo. O essencial é o funil, as sessões e o contador.

---

## Fase 0: backup e linha de base

Objetivo: poder voltar exatamente ao estado de agora, no código e nos dados.

- [ ] **Código**: árvore limpa (`git status`), anotar o commit atual aqui: `74677ff`. Criar a tag local
      `backup/antes-log-totem` nesse commit (não enviar a tag).
- [ ] **Banco (Supabase)**: o `pg_dump` não está instalado nesta máquina, então o backup é uma exportação em JSON, só leitura, das
      tabelas que a mudança toca ou de que depende: `evento` (só o Festival), `categoria`, `candidato`, `dispositivo`,
      `dispositivo_categoria`, `voto_infantil`, `voto` e `auditoria` do Festival. Script no scratchpad, saída em
      `backups/antes-log-totem-<data>.json` (a pasta `backups/` está no `.gitignore`).
- [ ] **Linha de base** gravada junto do backup: contagem de cada tabela acima, ids e `criado_em` de todos os `voto_infantil`,
      `prisma migrate status` ("up to date", 22 migrações), resultado de `pnpm test` (582) e `pnpm test:integracao` (269), e o
      status HTTP das rotas: `/`, `/e/ver-e-fazer-filmes`, `/totem`, `/telao/parear`, `/verificar-email`, `/recuperar-senha`.
- [ ] Lembrar ao usuário que o Supabase tem o backup diário próprio (painel > Database > Backups), como segunda rede.

Pronto quando: tag criada, arquivo JSON gravado e a contagem de `voto_infantil` no JSON é 96 (ou o número do momento).

## Fase 1: banco (migração aditiva)

Migração `prisma/migrations/20261204000000_sessao_totem/migration.sql`, **só aditiva** (nada é apagado ou renomeado: o código antigo
continua funcionando com o banco novo, o que permite voltar o código sem voltar o banco).

- [ ] Tabela `sessao_totem`:
      `id` (uuid), `evento_id`, `dispositivo_id` (FK composta com evento, como o voto), `numero` (int, sequência por aparelho),
      `aberta_em`, `encerrada_em` (null = aberta), `motivo_encerramento` (`MANUAL` | `INATIVIDADE`, null enquanto aberta),
      `criancas_esperadas` (int, null), `funil` (jsonb, null: o último funil relatado pelo aparelho para esta sessão).
      Índice único parcial: uma sessão aberta por aparelho (`WHERE encerrada_em IS NULL`). Único (`dispositivo_id`, `numero`).
- [ ] `voto_infantil.sessao_id` (uuid, null, FK). Índice (`sessao_id`, `criado_em`).
- [ ] `dispositivo.inatividade_sessao_min` (int, default 60, CHECK entre 5 e 1440).
- [ ] `schema.prisma` atualizado; `pnpm db:gerar`; migração aplicada **no banco local** (passar `DATABASE_URL`/`DIRECT_URL` do
      `.env.development.local`: a CLI do Prisma lê o `.env.local`, que é o Supabase).
- [ ] Os votos já existentes (sem sessão) continuam válidos. A análise trata `sessao_id` null como "antes das sessões".
      **Opcional, só com o ok do usuário**: script que agrupa os votos antigos em sessões pela regra de inatividade de 60 min
      (hoje daria: sessão 1 = 2 votos às 07:30, o teste; sessão 2 = 94 votos das 09:30 às 09:52). Rodar em simulação primeiro.

Pronto quando: `prisma migrate status` local em dia e `pnpm typecheck` verde.

## Fase 2: servidor

Arquivos: `src/server/totem.ts`, `src/server/rpc.ts`, `src/dominio/totem.ts`, `src/servicos/totem.ts`.

- [ ] `votarInfantil`: dentro da transação que já existe (o aparelho já está travado com `FOR NO KEY UPDATE`, então não há corrida
      entre dois votos do mesmo aparelho):
      1. pega a sessão aberta do aparelho; se não há, ou se o último voto dela (ou a abertura) é mais velho que
         `inatividade_sessao_min`, encerra a antiga como `INATIVIDADE` e abre a próxima (`numero` + 1);
      2. grava o voto com `sessao_id`;
      3. devolve `{ resultado: "REGISTRADO", votosSessao, numeroSessao, votosTotal }`.
      No caminho do reenvio idempotente (mesma `idEnvio`), devolve as contagens atuais sem contar outro voto.
      O formato antigo da resposta continua contido no novo (um totem com a página antiga, sem recarregar, segue funcionando).
- [ ] Autorização do menu: cada chamada nova recebe o `pin` e o servidor confere com `pinConfere` e o mesmo bloqueio de 5 erros do
      `conferirPinTotem` (reaproveitar a função). Sem PIN certo, nada sai.
- [ ] RPC `analisarTotem({ pin })` → resumo do aparelho, **sem candidato**: total de votos, sessões (número, abertura, encerramento,
      motivo, votos, esperadas, intervalos: mediana, média, menor, maior, e faixas <5 s, 5–15 s, 15–60 s, 1–5 min, >5 min),
      votos a cada 10 min da sessão atual e da anterior, funil de cada sessão, configuração (`inatividadeMin`).
- [ ] RPC `encerrarSessaoTotem({ pin })` → encerra a sessão aberta (`MANUAL`) e devolve o resumo dela: votos antes dela,
      votos nela, intervalos, % a mais ou a menos que a sessão anterior, esperadas e % das esperadas. Não abre a próxima.
- [ ] RPC `abrirSessaoTotem({ pin, criancasEsperadas? })` → abre a próxima (se já houver uma aberta, só atualiza as esperadas).
- [ ] RPC `configurarTotem({ pin, inatividadeMin })` (5 a 1440).
- [ ] `sincronizarTotem`: aceita `funil` **opcional** (`{ sessaoId, contagens }`), grava em `sessao_totem.funil` só se a sessão é
      deste aparelho. Continua aceitando o relatório antigo, sem `funil`.
- [ ] Auditoria: `SESSAO_TOTEM_ENCERRADA` (com motivo) e `SESSAO_TOTEM_ABERTA`, `TOTEM_CONFIGURADO`. Nunca a escolha.
- [ ] Testes de integração (`tests/integracao/totem*.test.ts` ou novo `sessaoTotem.test.ts`): sessão aberta pelo 1º voto;
      encerramento por inatividade (avançar o relógio gravando `criado_em` antigo); encerrar manual não trava o voto seguinte;
      reenvio idempotente não conta duas vezes e devolve a contagem; PIN errado recusa e conta para o bloqueio; análise não tem
      nenhum `candidatoId`; funil de outro aparelho é ignorado.

Pronto quando: `pnpm test:integracao` verde. Commit da fase 1 + 2 juntas (o servidor depende da migração).

## Fase 3: funil e log no aparelho

Arquivos novos: `src/lib/logTotem.ts` (+ teste). Mexe em `FluxoTotem.tsx`, `TelaTotem.tsx`, `useSinalTotem.ts`.

- [ ] `logTotem.ts`: registro local em `localStorage` (anel de no máximo 2000 eventos; chave por aparelho), cada evento
      `{ t, tipo, sessaoId?, codigo? }`. Tipos: `COMECOU`, `ESCOLHEU`, `VOLTOU`, `DESISTIU_ESCOLHA`, `DESISTIU_CONFIRMAR`,
      `ENVIOU`, `REGISTRADO`, `ERRO` (com o código), `TENTOU_DE_NOVO`, `ERRO_DESCARTADO` (a tela de erro voltou sozinha).
      **Nenhum evento guarda o item escolhido.** Funções: `registrar`, `funilDaSessao(sessaoId)`, `eventosRecentes(n)`, `limpar`.
- [ ] `FluxoTotem`: emite os eventos (as voltas automáticas por tempo viram `DESISTIU_*` / `ERRO_DESCARTADO`). A sessão atual vem
      da última resposta do voto.
- [ ] `useSinalTotem`: manda o funil da sessão atual no relatório; além do relatório de hora em hora, manda também a cada 5 min
      **se o funil mudou**, ao encerrar a sessão e ao abrir a análise.
- [ ] Preview do admin (`PreviewTotem`): não grava log nem manda funil (o `registrar` falso devolve contagens de mentira).

Pronto quando: testes unitários do `logTotem` verdes e o `FluxoTotem` compila. Commit.

## Fase 4: contador animado na tela de sucesso

Arquivos: `FluxoTotem.tsx` (`TelaSucesso`), `src/app/globals.css` (ou o CSS do totem), `src/lib/textosTotem.ts`.

- [ ] `TelaSucesso` recebe `votosSessao` da resposta: número grande que "sobe" do anterior para o novo (contagem rápida +
      salto/brilho no estilo cinema claro do totem), com o texto curto "votos nesta sessão". Sem número (resposta antiga ou
      preview sem servidor), a tela fica como hoje.
- [ ] `prefers-reduced-motion`: sem a contagem, só o número final.
- [ ] O contador cabe sem rolagem junto do "Obrigado!" (medidas em `cqmin`, como o resto do totem).

Pronto quando: compila e o preview mostra a animação com o número falso. Commit (pode ir junto da fase 3).

## Fase 5: menu do PIN

Arquivos: `TelaTotem.tsx`, `DialogoPinTotem.tsx`, componente novo `MenuTotem.tsx`.

- [ ] O botão do canto (hoje `LogOut`, "Sair") vira um botão de menu discreto (mesmo lugar, mesma opacidade). Ao tocar: pede o PIN
      (o `DialogoPinTotem` atual, que passa a devolver o PIN conferido em vez de sair direto).
- [ ] Com o PIN certo, abre o menu: **Analisar votos**, **Encerrar sessão**, **Sair**. O PIN fica só na memória enquanto o menu
      está aberto (para as RPCs); fechar o menu esquece o PIN.
- [ ] **Encerrar sessão**: confirma ("Encerrar a sessão 3?"), chama `encerrarSessaoTotem` e mostra o resumo: votos antes, votos
      nesta sessão, intervalos, % em relação à anterior, esperadas e % das esperadas. Embaixo, campo opcional "Crianças esperadas
      na próxima" e o botão **[ Abrir próxima sessão ]**. Fechar sem abrir também vale (o próximo voto abre).
- [ ] Aparelho não pareado continua com o "Sair" direto, sem PIN (como hoje).

Pronto quando: compila; o usuário confere no totem (ou no preview, se o menu aparecer lá). Commit.

## Fase 6: tela de análise no aparelho

Arquivo novo: `src/components/totem/AnaliseTotem.tsx` (tela cheia por cima do quiosque, com "Voltar ao totem").

- [ ] Cartões: votos no total, sessão atual (número, votos, aberta há, esperadas e %), sessão anterior.
- [ ] Funil da sessão atual e da anterior, em barras horizontais (começaram → chegaram ao "É esse?" → confirmaram → registrados),
      com desistências, "Voltar", erros e retentativas ao lado. É o que explica a diferença entre crianças e votos.
- [ ] Intervalos entre votos: mediana, média, menor, maior e as faixas.
- [ ] Votos a cada 10 min (barras simples em CSS/SVG, sem biblioteca nova).
- [ ] Tabela das sessões (número, horário, motivo do encerramento, votos, esperadas, %, intervalo mediano).
- [ ] Log recente (os últimos 100 eventos locais, com horário e tipo; sem item).
- [ ] Configuração: "Encerrar a sessão sozinho depois de [60] minutos sem voto" → `configurarTotem`.
- [ ] Nenhum dado de item/candidato em lugar nenhum desta tela (conferir com busca no código antes do commit).

Pronto quando: compila e os dados batem com uma consulta direta ao banco local. Commit.

## Fase 7: testes, migração no Supabase e envio

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integracao` verdes. Anotar os números aqui.
- [ ] **Perguntar ao usuário** e então aplicar a migração no Supabase (`pnpm db:migrar`; se o modo automático barrar, o usuário
      roda). `prisma migrate status` → "up to date" com 23 migrações.
- [ ] **Perguntar ao usuário** e então enviar `main` aos dois remotos (`upstream` e `origin`).
- [ ] Esperar o deploy da Vercel ficar pronto; conferir que o código novo está no ar (buscar um texto novo nos chunks, como foi
      feito com o aviso de spam).
- [ ] Avisar o usuário: **recarregar a página do totem na TV (F5)** antes das 14:00; o pareamento continua (cookie).

## Fase 8: conferência com o backup e limpeza

- [ ] Rodar de novo a consulta da fase 0 e comparar com o JSON do backup:
      - todos os `voto_infantil` do backup continuam no banco, com o mesmo `id`, `candidato_id`, `dispositivo_id` e `criado_em`
        (votos novos depois do backup são esperados e não são diferença);
      - `evento`, `categoria`, `candidato`, `dispositivo`, `dispositivo_categoria` e `voto` iguais (fora `ultimo_uso_em`,
        `ultimo_sinal_em`, `situacao_relatada`, `tela_cheia`, que mudam com o uso);
      - rotas da linha de base com o mesmo status HTTP; testes com os mesmos números ou mais.
- [ ] **Se estiver tudo normal**: apagar o arquivo do backup em `backups/` e a tag local `backup/antes-log-totem`; marcar esta fase.
- [ ] **Se algo estiver diferente**: "sobrepor o atual com o backup" com cuidado, **sem perder votos dados depois do backup**:
      - código: `git revert` dos commits do logTotem (não `reset`: eles já foram enviados) e novo envio aos dois remotos;
      - banco: a migração é aditiva, então **não se desfaz** (o código antigo ignora as colunas novas). Só se dado do backup
        estiver faltando ou diferente, reinserir/corrigir a partir do JSON essas linhas, uma tabela por vez, com o usuário
        acompanhando. Nunca apagar votos novos.
      - depois, repetir a conferência. O backup só é apagado quando a conferência passar.
