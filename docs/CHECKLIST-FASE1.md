# Checklist da Fase 1

Critérios de aceitação da Etapa 9 (seção 9). ✔ feito e conferido · ☐ pendente · (auto) conferido por teste, lint ou build, sem navegador. Responsável pela conferência manual: dono do produto.

## Contrato e rotas

- ✔ Inventário conferido: 21 cenários, 21 ações de auditoria, 26 códigos de erro, invariantes 1 a 9 (I1 a I8 dos planners), 5 autotestes ([CATALOGO.md](CATALOGO.md)). (auto)
- ✔ Errata das Etapas 5 a 8 presentes: `dev.vinculosVoto` por `usuarioId:eventoId`, `simularFalha({ consumirPontual: false })`, `OrigemEncerramento`, `AcaoAuditoria` com 21 ações, `congelarResultado(estado, eventoId, motivo, opcoes)`, `data-print="ocultar"`, `Abas` controlada com aba desabilitada, `criarEstadoNucleo`, `ui.apresentacao`, `dev.simularTrailerFalha`, `--qr-*`. (auto)
- ✔ Os 21 cenários aplicam e deixam as invariantes vazias; `conferirApuracao`, `conferirRoteiro`, `conferirMotor` e `conferirFixturesFestival` vazios. (auto)
- ☐ Matriz A e matriz B conferidas nos dois eventos e nos dois temas ([MATRIZ-ROTAS.md](MATRIZ-ROTAS.md)).
- ✔ `not-found` e `error` globais com tema (código); ☐ conferidos na tela.

## Comportamento

- ☐ Matriz X (X1 a X29) e fluxos F1 a F3 no navegador.
- ✔ Sem voto por candidato com a urna aberta e a flag desligada: os serviços devolvem `parcial = null` e o resultado só sai depois do encerramento. (auto)
- ✔ Mesmos números: Operação, Resultado, CSV, relatório e palco leem a mesma maior versão; convites usam `resumirConvites` nas duas telas. (auto)
- ☐ Latência 1500 ms e erro de rede sem `error.tsx`, travamento nem duplo envio (leituras mantêm o último dado: conferido por teste).

## Tema, responsividade e acessibilidade

- ✔ Buscas da 5.9 (hex, `@/mocks`, tabelas sigilosas, `Date.now`, armazenamento, rede, `console.log`, `dangerouslySetInnerHTML`, `repo.ts`). Exceção registrada: A-009. (auto)
- ☐ 360 a 1920 px; palco em 1080p e 4K.
- ☐ Lighthouse ≥ 90 e axe sem `critical`/`serious`; teclado; movimento reduzido.

## Qualidade e fechamento

- ✔ `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` limpos. (auto)
- ☐ Console sem erro nem aviso de hidratação (navegador).
- ✔ `docs/` completo: FRONTEIRA-DADOS, DIVERGENCIAS-SCHEMA, CATALOGO, MATRIZ-ROTAS, ROTEIRO-DEMO, CHECKLIST-FASE1, ACHADOS, DECISOES-PENDENTES.
- ✔ Build sem toolbar não expõe `forcarEstadoUrna` (só chamado em `components/dev/`, que não renderiza com a flag desligada; `/dev/ui` dá 404). (auto) ☐ Roteiro em `next start` com e sem toolbar.
- ☐ Tag `fase1-prototipo` (A-014) e Contexto atualizado.
