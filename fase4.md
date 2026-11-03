# Fase 4: Final (depois do Festival)

VaiVota · registro do escopo candidato · 3 de novembro de 2026

## 1. Contexto

O DocumentDesign (seção 13) prevê quatro fases sequenciais: Demonstração, Maratona Tech Tivit, Festival e Final. Da fase Final diz apenas "depois do Festival, restante das funcionalidades", e o Anexo B do MVP registra que o MVP do Festival é "praticamente a versão final".

O conteúdo da fase 4 não está definido em nenhum documento do projeto. Este arquivo reúne:

- o que já está marcado como futuro ou fora do escopo;
- o que a especificação prevê e ainda não tem tela;
- o que apareceu na leitura do código.

É uma proposta de escopo para decisão do dono do produto, não um compromisso.

Fontes: `DocumentDesign.md` (seções 3.3, 7.6, 13 e 17), `MVP-MaratonaTechTivit.md` (Anexo B), `docs/ACHADOS.md`, `docs/DECISOES-PENDENTES.md` e a leitura do código em 03/11/2026.

## 2. Já marcado como futuro ou fora do escopo

| Item | Situação hoje | Origem |
| --- | --- | --- |
| Painel de super admin e criação de eventos pela interface | O evento e o primeiro admin vêm de seed e script. | DocumentDesign 3.3 e 7.6 |
| Tela para convidar admins adicionais | O modelo `ConviteAdmin` existe, mas só o script `db:promover-admin` o preenche. | DocumentDesign 3.3 |
| Duplicar a configuração entre eventos | Não existe. | DocumentDesign 3.3 e 7.6 |
| Página pública com o resultado depois do evento | A página do evento só diz que o resultado será divulgado. | DocumentDesign 17 |
| PDF gerado no servidor | O relatório é impressão do navegador. | DocumentDesign 3.3 |
| Lista de impedimentos de jurados (conflito de interesse) | Não existe. | DocumentDesign 3.3 |
| Alterar os pesos com a urna aberta, com auditoria | Hoje há trava total dos pesos e do desempate. | DocumentDesign 7.6 |
| Campos extras de candidato mais ricos | Só texto livre, com rótulo definido pelo evento. | DocumentDesign 7.6 |
| Fila offline de votos no totem | Fora de propósito. O "tentar de novo" reenvia uma chave de tentativa, para não contar o voto duas vezes. | DocumentDesign 3.3 |
| Controles contra repetição de voto infantil | Fora de propósito. A medida principal é o mediador adulto. | DocumentDesign 3.3 |
| Controle remoto do telão entre aparelhos | Só funciona entre abas do mesmo navegador. | DocumentDesign 3.3 |

## 3. Configuração prevista que ainda não tem tela

A seção 7.6 do DocumentDesign lista as seções da tela de configuração. Estas ainda são feitas por seed ou SQL:

| Seção | O que falta | Situação hoje |
| --- | --- | --- |
| Votação | Método de identificação (Google, e-mail ou os dois) e regra de candidato votar em si mesmo. | Definidos por seed. |
| Vínculo candidato e usuário | Tela para ligar um candidato a uma pessoa. | Sem tela: a regra de voto em si mesmo não tem efeito real. |
| Encerramento automático | Rotina agendada que feche a urna ao fim da janela. | O controle existe, mas o servidor recusa ligá-lo. |
| Apresentação | Link do trailer, parcial ao vivo, classificação completa, rótulos das categorias e modo de avanço. | Só por seed ou SQL. |
| Privacidade | Aviso próprio do evento e prazo de anonimização. | Só por seed. |
| Tema | Imagem de capa e textos das telas de estado. | Sem tela. |

## 4. Robustez e operação

- Conferência em navegador real de tudo o que foi feito (telão, totem, configuração), incluindo acessibilidade (axe, Lighthouse, teclado). Nunca foi feita (`docs/ACHADOS.md`, A-006).
- Testes de ponta a ponta no navegador e integração contínua. Não existe nenhum fluxo de CI no repositório.
- Ensaio de carga no pico esperado. O número de votantes ainda está em aberto na especificação (seção 17).
- Backup automático e alertas. Hoje o backup é um script manual e o Sentry só liga com DSN.

## 5. Limpeza de código

- Código do protótipo ainda no repositório: cerca de 2.500 linhas em `src/mocks` e `src/components/dev`, mais cerca de 1.100 linhas em ações do armazenamento (`store/acoes.ts`, `simularVotos.ts`, `transicoes.ts`, `persistirDemo.ts`, `sincronizarAbas.ts`) e nos mocks de serviços (`votacaoMock.ts`, `dashboardMock.ts`, `entrarComo`). A toolbar de desenvolvimento nem é mais montada. Parte desse código é usada pelos testes de domínio, então a remoção pede cuidado.
- O servidor sempre considera o trailer "não configurado" no checklist de ativação. Hoje isso só gera aviso e não bloqueia.

## 6. Decisões que continuam com o dono do produto

- **E30:** revisão única dos textos finais (avisos, confirmações, textos do palco e do totem).
- **E22:** direção visual do telão.
- **E29:** texto do aviso de privacidade da plataforma.
- **A8 e P21:** regra de notas do júri por critério (escala, peso por critério, como vira placar, desempate).
- **P4:** onde o admin liga o parcial por candidato.

## 7. Ordem sugerida

1. Fechar o que o Festival já tocou: tela de Apresentação, vínculo entre candidato e usuário e encerramento automático.
2. Página pública de resultado e tela de convite de admin.
3. Super admin, duplicar evento e limpeza do protótipo.
