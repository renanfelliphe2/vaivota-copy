# VaiVota — Funcionalidade 3: Votação Infantil

> Status: definida em conversa, pronta para implementação. Entra no **protótipo** (aparece na demonstração), com planner próprio "Totem" (mock e depois real), e em uso real no **Festival**.
> Revisão 07/10/2026: alinhado às revisões 3 e 4 dos planners.
> Depende de: `Login.md` (evento, urna, candidatos) e `Jurado.md` (fórmula de placar).
> Stack: React/TS + Next.js.

## 1. Objetivo

Permitir que crianças votem de forma simples e rápida em **totens ou tablets dedicados**, sem login e sem guardar dados pessoais. Os votos formam um placar próprio ("Escolha das Crianças") e também entram na fórmula final com um **peso configurável**.

## 2. Escopo

**Dentro:**
- Pareamento e gerenciamento de dispositivos (totens).
- Modo quiosque com fluxo reduzido de voto.
- Apuração infantil separada e peso na fórmula final.

**Fora (por ora):**
- Fila local de votos offline (envio quando a rede voltar): fica para depois.
- Controles técnicos contra votos repetidos (intervalo mínimo, limite por totem, alertas): não serão implementados agora.
- Dashboard e modo apresentação: arquivos próprios.

## 3. Decisões tomadas

| Tema | Decisão |
|---|---|
| Apuração | Placar próprio **"Escolha das Crianças"** (menção/prêmio) **e** peso na fórmula final |
| Pesos | Admin define o peso de **público geral, júri e infantil** por evento |
| Duplicidade | Sem identificação da criança; integridade garantida por **mediador adulto** e pelos pesos. Nenhum controle técnico agora |
| Totem | **Dispositivo pareado**, não conta de usuário |
| Dados guardados | Candidato, horário e **dispositivo** (identificador do totem, nunca da criança) |
| Interface | **Modo quiosque**, confirmação em duas etapas, retorno automático à tela inicial |
| Módulo | Opcional por evento (ligado/desligado na configuração) |

## 4. Dispositivo pareado

1. O admin abre **Dispositivos** no evento e gera um **código de pareamento** (curto, uso único, com validade).
2. No totem, abre a página de pareamento e digita o código uma vez.
3. O totem recebe um **token de longa duração**; só o **hash** fica no banco.
4. A partir daí, o totem vota sem login.

**Gestão pelo admin:**
- Lista de dispositivos com nome (ex.: "Totem Hall"), estado (`ativo` | `pausado` | `revogado`) e último uso.
- **Pausar**, **revogar** e **renomear**.
- Revogar um tablet perdido faz o servidor rejeitar seus votos imediatamente.
- Definir/alterar o **PIN do modo quiosque** ao parear.

> O dispositivo **não** é um `Usuario` e **não** tem `Participacao`. É uma entidade própria do evento.

## 5. Modelo de dados (conceitual)

- **Dispositivo:** id, evento, nome, hash do token, estado, PIN de saída (hash), criado em, último uso.
- **CodigoPareamento:** id, evento, hash do código, validade, estado (`disponivel` | `usado` | `expirado`).
- **VotoInfantil:** id, evento, candidato, horário, dispositivo.
  - Sem referência a usuário ou a qualquer dado da criança.
- **ConfigPlacar** (já existente): ganha o **peso infantil**; ver `Jurado.md`.

## 6. Fluxo do totem (modo quiosque)

1. Tela inicial **"Toque para votar"**.
2. Candidatos em **cartazes grandes**, áreas de toque amplas, pouco texto.
3. Criança toca em um candidato.
4. **Confirmação em duas etapas**: "Você escolheu *X*? **Sim** / **Não**".
5. Grava o voto e mostra **animação de sucesso**.
6. **Retorno automático** à tela inicial em poucos segundos.
7. **Inatividade:** se a criança abandonar no meio, volta ao início sozinho.

**Comportamento do quiosque:**
- Tela cheia, sem barra de navegação, sem seleção de texto, sem zoom.
- Sair do modo só com o **PIN** definido pelo admin.
- Respeita o estado da urna: "A votação ainda não começou" ou "A votação foi encerrada".
- Totem pausado ou revogado mostra uma tela neutra e não aceita votos.

## 7. Apuração e pesos

- O voto infantil gera o placar **"Escolha das Crianças"**, independente dos demais.
- Na fórmula final entra com `peso_infantil`; o admin configura os três pesos (público, júri, infantil) por evento, somando 100%.
- Evento sem voto infantil: módulo desligado, peso 0 e nenhum totem.
- Desempate segue a regra configurada no evento (ver `Jurado.md`).

## 8. Integridade

- **Mediador adulto** por totem é a medida principal contra votos repetidos.
- Os **pesos** limitam o impacto de um eventual excesso de votos infantis.
- Não há identificação da criança, então o sistema **não consegue** detectar duplicidade por pessoa; isso é uma consequência assumida do desenho.
- Guardar dispositivo e horário em cada voto permite análise **posterior** (por totem e por intervalo de tempo), sem novos dados pessoais.

## 9. Regras de negócio

- Só aceita voto com urna aberta e dispositivo `ativo`.
- Cada toque confirmado registra **um** voto; não há edição.
- Votos de dispositivo pausado ou revogado são rejeitados e não contam.
- Encerrar o evento ("Concluir Evento") bloqueia todos os totens.
- Nenhum dado da criança é coletado, nem mesmo temporariamente.

## 10. Segurança

- Validação sempre no servidor (dispositivo, estado, urna).
- Token do dispositivo só como hash no banco; revogável a qualquer momento.
- Código de pareamento de uso único, com validade e rate limiting.
- Auditoria: pareamento, pausa, revogação, alteração de PIN e abertura/encerramento da urna.

## 11. Critérios de aceitação

- [ ] Admin gera código, pareia um tablet e o dispositivo aparece na lista.
- [ ] Criança vota em poucos toques, com confirmação em duas etapas, e a tela volta ao início sozinha.
- [ ] O voto fica salvo com candidato, horário e dispositivo, sem dados pessoais.
- [ ] Sair do modo quiosque exige o PIN.
- [ ] Totem pausado ou revogado para de aceitar votos.
- [ ] Com a urna fechada ou não iniciada, o totem mostra o estado correto.
- [ ] O placar "Escolha das Crianças" aparece separado e entra na fórmula com o peso configurado.
- [ ] Com o módulo desligado, o evento funciona sem voto infantil.

## 12. Pendências

- Peso infantil padrão sugerido.
- **Resolvida (rev. 3, C4):** pesos e regra de desempate ficam **travados ao abrir a urna**, sem exceção, no MVP. Alteração auditada com a urna aberta é evolução futura.
- Tempo de retorno automático e de inatividade.
- Textos e ilustrações das telas do totem (alinhadas ao tema do evento).
- Futuro: fila offline, intervalo mínimo entre votos, limite por totem e alertas de anomalia no dashboard.
