# Roteiro de demonstração (cerca de 10 minutos)

## Antes de começar

- Rode em **build de produção**, numa janela só. F5 ou uma aba nova voltam tudo ao início (o protótipo não tem banco).
- **Ensaio** (roteiro completo, com toolbar): `pnpm build && pnpm start`.
- **Público** (roteiro mínimo, sem toolbar): `NEXT_PUBLIC_DEV_TOOLBAR=false pnpm build && pnpm start`. Sem a toolbar não dá para trocar de usuário, forçar estado nem aplicar cenário.
- Login e registro são **sem senha**: e-mail + código **`123456`** (informado na tela), ou "Entrar com Google" (seletor simulado).
- "Celular" é o modo dispositivo do navegador (390 px) **na mesma aba**. Votar num celular de verdade abre outra instância: o voto não aparece no notebook.
- Recolha ou oculte a toolbar (`Alt+D`) nos momentos de público.

## Roteiro completo (ensaio, com toolbar)

| Ato | O que mostrar | Como | Tempo |
|---|---|---|---|
| 1 | Landing e evento no tema da Semana Tech | Toolbar → Evento: Semana Tech; abrir `/` e o evento | 1 min |
| 2 | Votar em 390 px e a tela de sucesso | Modo dispositivo (mesma aba). Entrar como Ana (ou criar conta com código `123456`) → Votar → escolher → revisar → confirmar | 2 min |
| 3 | Jurado: convite, resgate, voto e alteração | Carla → Configuração → Júri → gerar 1 convite e copiar → Sair → criar conta nova com "Sou jurado" e o código → votar → alterar | 2 min |
| 4 | Configuração: tema e pesos | Carla → Tema (cor primária) e Placar (pesos); mostrar o efeito na landing e no evento | 1 min |
| 5 | Painel: votos entrando, encerrar, Resultado | Toolbar → Dashboard → "Simular votos entrando"; painel com polling; Configuração → Operação → Encerrar urna; aba Resultado → "Mostrar resultado" | 1 min |
| 6 | Trocar para o Festival | Toolbar → Cenários → `FESTIVAL_EMPATE_RESOLVIDO` (troca o evento ativo); outro tema, logo e rótulos | 30 s |
| 7 | Apresentação | Painel → Apresentação → Ensaio rápido (cenário do evento) → Sair → Apresentação real → Apresentar → `Enter` inicia a revelação (trailer, categorias, desempate, pódio) | 2 min 30 s |

## Roteiro mínimo (público, sem toolbar)

Sobre o seed da Semana Tech (urna aberta): entrar como `admin@demo.com` (código `123456`) → Painel (Operação) → Configuração → Operação → Encerrar urna → Painel → Resultado → "Mostrar resultado" → Exportar → Relatório → Apresentação → Apresentar → revelação. Para votar antes, entrar como `publico@demo.com` em outra etapa do roteiro (sair e entrar de novo pelo menu do usuário).

## Atalhos do palco

`Espaço` pausa/retoma · `→`/`Enter` avança (inicia a revelação na tela "Votação encerrada") · `←` volta · `T` pula o trailer · `F` tela cheia · `Shift+E` emergência (vai direto ao final) · `Q` sai · `?` ajuda. O HUD aparece ao mover o mouse.

## Contingência

Se algo travar: toolbar → "Resetar mock" (ou F5) e recomece do ato em que parou, aplicando o cenário certo (`PADRAO` para a Semana Tech; `FESTIVAL_EMPATE_RESOLVIDO` para o Festival; reservas `RESULTADO_PADRAO`, `FESTIVAL_ENCERRADO`, `SEM_ENCERRAMENTO_AUTOMATICO`). Na sala, "Recomeçar"/"Refazer revelação" voltam a cerimônia ao início.
