# Decisões pendentes

Consolidação da Etapa 9 (CP9). Detalhes de cada item na seção 10 do planner da etapa citada (`planners/EtapaN Final.md`).

## Continuam com o dono do produto

| Item | Origem | Pergunta |
|---|---|---|
| E30 | Etapas 7 (P18) e 8 (P9) | Revisão única dos textos finais (avisos, confirmações, descrições de auditoria, textos do palco) |
| E22 | Etapa 8 (P5) | Direção visual do palco (hoje usa os tokens do tema como estão) |
| E29 | Etapa 9 | Texto do aviso de privacidade da plataforma (controladora: VaiVota) |
| A6 | Etapa 9 | Número esperado de votantes e pico (planner "Endurecimento") |
| A8 / P21 | Etapa 7 | Voto do júri por critério no Festival: escala da nota, peso por critério, como vira placar, desempate |
| E3 | Etapa 9 | Dia e horário exatos da Semana Tech (o seed usa placeholders) |
| P1 | Etapa 7 | Gráficos em SVG próprio (adotado) ou Recharts |
| P3 | Etapa 7 | Relatório em rota própria (adotado) ou impressão da aba Resultado |
| P4 | Etapa 7 | Onde o admin liga o parcial por candidato de verdade (hoje só a toolbar) e se ele existe no MVP |
| P5 | Etapa 7 | "Baixar tudo" em sequência (adotado) ou `.zip` (dependência nova) |
| P6 | Etapa 7 | Retenção e anonimização: confirmar que o painel não precisa de tela de apoio |
| P20 | Etapa 7 | Série do Festival por hora (janela de mais de 80 h) |
| P3, P4 | Etapa 8 | Durações das cenas; fim do trailer de link por API do player |
| A-008 | ACHADOS | Foco ao trocar de aba no painel (fica na aba, padrão das `Abas`) |
| A-011 | ACHADOS | V28: permitir desligar o júri com convite usado na toolbar, só para validação? |
| Etapas 0 a 6 | Seção 10 de cada planner | Pendências **[Usuário]** que não foram reabertas nesta implementação |

## Resolvidas (registro)

- Rev. 3: E4 (build do público sem toolbar), E25 ("Apuração por VaiVota" só no final estático), E26 (concluir não redireciona), E28 (meta de acessibilidade), C3 (redistribuição de peso), C15 a C18 (sigilo no painel), D11/D12 (cenários `RESULTADO_*` registrados pela Etapa 7).
- Rev. 4: A1 (Semana Tech é uso real; demonstração para o Festival antes), A2/A3 (sem BD fake; trilha de produção), A4 (Supabase PostgreSQL), A5 (Better Auth sem senha, Vercel, Resend, Sentry), A7 (totem por planner próprio), A9 (CPF nunca; admins por seed), E21 (sem votos do júri no telão), E27 (equipamentos do dia).

## Mudanças em fontes fora dos planners (todas aprovadas e aplicadas na rev. 4)

F-1 `Participacao.criadoEm` removido do schema · F-2 Base `Jurado.md` §12 e `VotoInfantil.md` §12 (trava total) · F-3 DD §7.6 e §8.1 (desqualificado, imagem obrigatória, redistribuição de peso) · F-4 pesos `Int` com CHECK · F-5 `Evento.local`/`linkSobre` · F-6 Base `Dashboard.md` · F-7 DD §13 (4 fases) · F-8 `Login.md` sem senha e schema sem `senhaHash` · F-9 DD §3.3 (CPF e SMS descartados; voto por critério no Festival) · F-10 remoção de `exibirVotosJuriNoTelao` · F-11 DD §5.3 (stack) e comentário no schema · F-12 DD §3.2/§3.3/§10.4.

## Fora da Fase 1

Totem (pareamento, quiosque com PIN, voto infantil real) → planner "Totem". Persistência, autenticação real, rate limiting no servidor, e-mail, upload de mídia → planner "Trilha de Produção". Carga, alertas, backup → planner "Endurecimento".
