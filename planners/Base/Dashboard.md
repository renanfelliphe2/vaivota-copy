# VaiVota — Funcionalidade 5: Dashboard e Exportação

> Status: definida em conversa, pronta para implementação.
> Revisão 07/10/2026: alinhado às revisões 3 e 4 dos planners.
> Depende de: `Login.md`, `Jurado.md`, `VotoInfantil.md` e `ModoApresentacao.md` (resultado congelado).
> Stack: React/TS + Next.js.

## 1. Objetivo

Dar ao admin duas coisas: **acompanhar a operação** durante a votação e **guardar e exportar os dados** depois do evento. O dashboard é simples, mas confiável, e a exportação é o que permanece depois do telão.

## 2. Escopo

**Dentro:**
- Aba **Operação** (ao vivo) e aba **Resultado** (após o encerramento).
- Exportação em CSV e relatório imprimível.
- Controle de acesso por papel e auditoria das exportações.

**Fora:**
- Gráficos avançados e análises complexas.
- Geração de PDF no servidor (futuro).
- Painel do super admin da plataforma (ver DD §7.6).

## 3. Decisões tomadas

| Tema | Decisão |
|---|---|
| Estrutura | Duas abas: **Operação** e **Resultado** |
| Durante a votação | Só **totais, votos por minuto e saúde da operação**; **sem votos por candidato** (opção por evento) |
| Resultado | Disponível **somente após o encerramento da urna** |
| Fonte do resultado | O mesmo **resultado oficial congelado** usado pelo telão |
| Exportação | **CSV** (vários arquivos) + **relatório imprimível** (salvo como PDF pelo navegador) |
| Privacidade | **Sem e-mails** na exportação; só contagens de participantes |
| Votos do júri | Identificados, **só para o admin**, com exportação auditada |
| Atualização | Polling a cada poucos segundos, com agregação e cache curto |
| Evento concluído | Dashboard em **somente leitura**, exportações disponíveis |

## 4. Aba Operação (ao vivo)

- Estado da urna e tempo restante.
- Total de votos por grupo: popular, júri e infantil.
- **Votos por minuto** (gráfico simples) e pico.
- Participantes cadastrados e quantos já votaram, por papel.
- **Jurados:** quem já votou e quem não (para o admin cobrar quem faltou).
- **Totens:** estado, último uso e votos por dispositivo.
- **Códigos de jurado:** disponíveis, usados, revogados.
- Resumo de auditoria: aberturas e encerramentos, bloqueios por rate limit, alterações de voto do júri.

> Durante a votação, **não** aparece placar por candidato. A tela do admin pode estar espelhada no telão, e mostrar parcial influencia a cerimônia. A opção "mostrar parcial por candidato" pode ser ligada por evento.

## 5. Aba Resultado (após o encerramento)

- **Resultado oficial congelado:** pontuação final, posições, placares por grupo (popular, júri, infantil), pesos aplicados e empates com o critério usado.
- Categorias: queridinho do público, preferido das crianças e escolha dos jurados.
- Linha do tempo da votação (votos por minuto e horário do pico).
- Dados do evento: candidatos, período, totais.
- **Classificação completa** visível ao admin (a exibição no telão é opcional e separada).

## 6. Exportação

| Arquivo (CSV) | Conteúdo | Quando |
|---|---|---|
| `resumo_evento` | Evento, período, totais por grupo, pesos usados | Após encerrar |
| `resultado_candidatos` | Votos por grupo, pontuação final, posição, empates | Após encerrar |
| `votos_por_minuto` | Série temporal da votação | A partir da ativação |
| `jurados` | Voto identificado de cada jurado e histórico de alterações | Após encerrar, só admin |
| `dispositivos` | Votos por totem | A partir da ativação |
| `auditoria` | Eventos administrativos e bloqueios | Sempre |

- **Relatório imprimível:** página formatada com resumo do evento, resultado e gráficos básicos; o navegador salva como PDF.
- Durante a votação, só os arquivos de **operação** ficam disponíveis (sem votos por candidato).
- Cada exportação é **registrada em auditoria** (quem, quando, qual arquivo).

## 7. Privacidade e dados pessoais

- Votos populares e infantis **não têm vínculo** com pessoas, então a exportação não os expõe.
- A exportação traz **apenas contagens** de participantes, não e-mails.
- O voto identificado do júri sai só para o admin.
- **Retenção:** o modelo deve permitir, por evento, manter, anonimizar ou excluir dados pessoais (e-mails e contas) após um prazo; a política exata fica na configuração do evento.

## 8. Acesso e permissões

- Só o admin **do evento** vê o dashboard daquele evento; eventos não se enxergam.
- Jurados, público e totens não têm acesso.
- Validação sempre no servidor.
- Se existir um super admin da plataforma, o escopo dele é definido no DD §7.6.

## 9. Desempenho

- Contagens vêm de **consultas agregadas com cache curto**, sem varrer a tabela de votos a cada atualização.
- Polling a cada poucos segundos; sem WebSocket na primeira versão.
- O dashboard não pode prejudicar o registro de votos durante o pico.

## 10. Regras de negócio

- Resultado e exportações de resultado só existem depois do encerramento da urna.
- Os números do dashboard e do telão vêm da **mesma fonte congelada**.
- Após "Concluir Evento", nada é editável; apenas consulta e exportação.
- Correções de resultado só por ação administrativa auditada, com novo registro.

## 11. Critérios de aceitação

- [ ] Durante a votação, o admin vê totais, votos por minuto, participantes, jurados pendentes, totens e códigos, mas não votos por candidato.
- [ ] Após o encerramento, a aba Resultado exibe o resultado oficial congelado.
- [ ] Os números do dashboard batem com os do modo apresentação.
- [ ] A exportação gera os CSVs listados, sem e-mails.
- [ ] O voto identificado do júri só é exportado por admin, com registro em auditoria.
- [ ] O relatório imprimível pode ser salvo como PDF.
- [ ] Um admin não acessa dados de outro evento.
- [ ] Evento concluído abre em somente leitura, com exportações disponíveis.
- [ ] O dashboard não degrada o registro de votos sob carga.

## 12. Pendências

- **Resolvida (rev. 3/4, E29):** retenção: anonimizar nome e e-mail 90 dias após Concluir Evento; controladora dos dados é a VaiVota.
- **Resolvida (rev. 3, E16):** CSV em UTF-8 com BOM, separador `;`, fim de linha CRLF; colunas definidas no planner do dashboard (Etapa 7).
- Layout do relatório imprimível.
- Geração de PDF no servidor (futuro).
- Existência e escopo do super admin da plataforma.
