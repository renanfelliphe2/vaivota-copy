# VaiVota — Design Document

> Versão: 1.1 (planners 1 a 5 consolidados + configuração do evento)
> Stack definida: React/TS + Next.js
> Fontes: `Login.md`, `Jurado.md`, `VotoInfantil.md`, `ModoApresentacao.md`, `Dashboard.md` e o documento de requisitos original do 9º Festival Ver e Fazer Filmes.
> Funcionalidade 6 (configuração do evento): incorporada na seção 7.6, sem planner separado.
>
> Convenção: itens marcados **[Decidido]** foram definidos em conversa; itens marcados **[Proposta]** são sugestões a validar.

---

## 1. Visão geral

O **VaiVota** é uma plataforma web **white-label** de votação para eventos. Cada evento (um festival de cinema, um torneio de projetos de TI, um campeonato de música, um torneio de jogos) tem sua própria votação, candidatos, regras e identidade visual, usando o mesmo software.

**Primeiros usos:**

| Evento | Quando | Papel |
|---|---|---|
| Semana Tech (torneio de projetos de TI) | Outubro/2026 | Primeiro uso real; funciona como ensaio |
| 9º Festival Ver e Fazer Filmes (Cataguases-MG, 25 a 28/nov/2026) | Novembro/2026 | Uso com público maior, voto infantil e foco cinematográfico |

**Direção do produto [Decidido]:** núcleo único com **tema configurável por evento**. O layout e os fluxos são fixos; mudam nome, logo, cores, tipografia, imagens e rótulos. O VaiVota aparece de forma discreta ("powered by"), e o evento parece ser o dono da experiência.

## 2. Objetivos e princípios

**Objetivos**
- Votação popular simples, segura e confiável.
- Voto do júri e voto infantil como módulos opcionais por evento.
- Apresentação cinematográfica do resultado para o telão.
- Dashboard com acompanhamento e exportação dos dados.
- Reutilização entre eventos sem alterar código.

**Princípios** (herdados do documento de requisitos: experiência, confiabilidade e identidade)
1. **Integridade primeiro:** nenhum voto válido duplicado, perdido ou alterado indevidamente.
2. **Sigilo proporcional ao grupo:** voto popular secreto, voto do júri identificado para o admin, voto infantil sem identidade.
3. **Simplicidade para votar:** poucos passos, feedback claro, mobile-first.
4. **Configurável, não customizável:** tema e regras por evento, sem editor visual.
5. **Escopo enxuto:** nada além do necessário para o evento (sem funcionalidades sociais, curtidas ou gamificação).

## 3. Escopo

### 3.1 Funcionalidades

| # | Funcionalidade | Documento |
|---|---|---|
| 1 | Login, registro e votação popular | `Login.md` |
| 2 | Votação do júri | `Jurado.md` |
| 3 | Votação infantil (totens) | `VotoInfantil.md` |
| 4 | Modo apresentação (telão) | `ModoApresentacao.md` |
| 5 | Dashboard e exportação | `Dashboard.md` |
| 6 | Configuração do evento | Seção 7.6 deste documento |

### 3.2 Módulos por evento [Decidido]

| Módulo | Semana Tech | Festival |
|---|---|---|
| Interface personalizada por evento | Sim | Sim |
| Votação popular | Sim | Sim |
| Votação do júri | Sim | Disponível (uso a critério da organização) |
| Votação infantil | Não | Sim |
| Modo apresentação | Sim | Sim |
| Dashboard simples | Sim | Sim |

O voto infantil só será implementado depois da Semana Tech, mas o modelo de dados já o prevê.

### 3.3 Fora do escopo desta versão
- Sincronização da apresentação entre várias telas e controle remoto.
- Notas por critério do júri (Direção, Roteiro, Fotografia, Som): modelo preparado, não implementado.
- Fila offline de votos nos totens.
- Controles técnicos contra repetição de voto infantil (intervalo mínimo, limite por totem, alertas).
- Upload de vídeo próprio e trilha sonora.
- Geração de PDF no servidor.
- Lista de impedimentos (conflito de interesse) de jurados.
- Painel de super admin e criação de eventos por interface (no início, eventos e primeiro admin são criados por seed/script).
- Duplicar configuração entre eventos (melhoria futura).
- Funcionalidades sociais, comentários e gamificação.

## 4. Atores e papéis

| Ator | Como acessa | O que faz |
|---|---|---|
| **Público** | Conta de usuário (Google ou e-mail verificado) | Vê candidatos e vota uma vez |
| **Jurado** | Conta de usuário + código de convite individual | Vota (identificado), pode alterar até o fim da urna |
| **Totem (dispositivo)** | Pareado por código; sem conta | Registra votos infantis |
| **Admin do evento** | Conta de usuário com papel de admin | Configura, opera a urna, apresenta, consulta e exporta |
| **Super admin da plataforma** | Sem painel no MVP | Eventos e o primeiro admin são criados por seed/script **[Decidido]**; o painel entra quando houver mais eventos |

**Papéis por evento:** o papel (público, jurado, admin) pertence à **participação** do usuário no evento, não à conta. Um mesmo usuário pode ter papéis diferentes em eventos diferentes.

## 5. Arquitetura

### 5.1 Experiências (frontends)

1. **Pública:** login/registro, lista de candidatos, voto, estados da urna.
2. **Jurado:** mesma interface do público, com resgate de código e voto do júri.
3. **Totem:** modo quiosque em tela cheia (voto infantil).
4. **Admin:** configuração, dashboard, convites, dispositivos e **modo apresentação**.

Todas compartilham dados e regras de negócio; o servidor valida tudo.

### 5.2 Camadas

- **Apresentação:** páginas e componentes React/Next.js, tema por variáveis de design.
- **Aplicação:** regras de votação, autenticação e autorização, controle da urna, apuração, resultado congelado e exportação (route handlers/server actions).
- **Dados:** banco relacional com restrições de unicidade e transações.
- **Infraestrutura:** rate limiting, cache curto, logs estruturados e monitoramento.

### 5.3 Stack [Proposta a validar]

| Item | Proposta | Observação |
|---|---|---|
| Framework | Next.js + TypeScript | **Decidido** |
| Banco | PostgreSQL | Transações e restrições únicas são essenciais para voto único |
| Acesso a dados | ORM com migrações (Prisma ou Drizzle) | Escolher o que você domina |
| Autenticação | Biblioteca com Google e e-mail verificado (Auth.js ou Better Auth) | Evitar implementação própria |
| Rate limiting | Por IP e por usuário (em memória/Redis ou no banco) | Depende da hospedagem |
| Hospedagem | A definir | Se serverless, usar pool de conexões do banco |
| Testes de carga | Ferramenta como k6 | Antes de cada evento |
| Monitoramento | Logs estruturados e alerta de erros | Separar log técnico de auditoria |

### 5.3.1 Multi-evento (multi-tenancy)
- Todo dado de domínio carrega o **evento** (`eventoId`).
- Um admin só acessa o evento ao qual pertence; eventos não se enxergam.
- URLs por evento: `/e/{slug}`.

### 5.4 Mapa de rotas e telas [Proposta]

| Rota | Quem | Descrição |
|---|---|---|
| `/e/{slug}` | Todos | Entrada do evento com tema, login/registro |
| `/e/{slug}/votar` | Público, jurado | Lista de candidatos, revisão e confirmação |
| `/e/{slug}/convite` | Logado | "Tenho um código de convite" |
| `/e/{slug}/admin` | Admin | Dashboard (abas Operação e Resultado) |
| `/e/{slug}/admin/configuracao` | Admin | Configuração do evento (seção 7.6) |
| `/e/{slug}/admin/apresentar` | Admin | Modo apresentação |
| `/totem/parear` | Dispositivo | Pareamento com código |
| `/totem` | Dispositivo | Modo quiosque de voto infantil |

## 6. Modelo de dados consolidado

### 6.1 Diagrama conceitual

```mermaid
erDiagram
  EVENTO ||--o{ CANDIDATO : possui
  EVENTO ||--o{ PARTICIPACAO : tem
  USUARIO ||--o{ PARTICIPACAO : participa
  EVENTO ||--o{ VOTO : recebe
  CANDIDATO ||--o{ VOTO : escolhido
  PARTICIPACAO ||--o| VOTOJURI : registra
  CANDIDATO ||--o{ VOTOJURI : escolhido
  VOTOJURI ||--o{ HISTORICOVOTOJURI : historico
  EVENTO ||--o{ CONVITEJURADO : emite
  EVENTO ||--o{ DISPOSITIVO : pareia
  DISPOSITIVO ||--o{ VOTOINFANTIL : registra
  CANDIDATO ||--o{ VOTOINFANTIL : escolhido
  EVENTO ||--o{ CODIGOPAREAMENTO : emite
  EVENTO ||--|| CONFIGPLACAR : define
  EVENTO ||--|| CONFIGAPRESENTACAO : define
  EVENTO ||--o{ RESULTADOOFICIAL : congela
  EVENTO ||--o{ AUDITORIA : registra
  EVENTO ||--o| TEMA : usa
  EVENTO ||--o{ CAMPOCANDIDATO : define
  EVENTO ||--o{ CONVITEADMIN : emite
```

### 6.2 Entidades

| Entidade | Campos principais | Observações |
|---|---|---|
| **Usuario** | id, nome, e-mail, e-mail verificado, método de login, criado em | Global |
| **Evento** | id, slug, nome, descrição, fuso horário, estado, estado da urna, janela de votação, encerramento automático, método de identificação, módulos ativos, prazo de anonimização | Estado do evento: ver seção 9; configuração: seção 7.6 |
| **Candidato** | id, evento, título, descrição, mídia/imagem, publicado, desqualificado, campos extras | Genérico (filme, projeto, música); campos extras definidos pelo evento |
| **Participacao** | id, usuário, evento, papel, votou | **Único `(usuario, evento)`**; sem horário exato do voto |
| **Voto** (popular) | id, evento, candidato, horário, hash de recibo | **Sem referência ao usuário** |
| **ConviteJurado** | id, evento, hash do código, rótulo, validade, estado, participação, resgatado em | Estados: disponível, usado, revogado |
| **VotoJuri** | id, evento, participação, candidato, atualizado em | **Único `(participacao, evento)`**; identificado |
| **HistoricoVotoJuri** | id, voto do júri, candidato anterior, candidato novo, horário | Alimenta auditoria |
| **Dispositivo** | id, evento, nome, hash do token, estado, hash do PIN, criado em, último uso | Estados: ativo, pausado, revogado |
| **CodigoPareamento** | id, evento, hash do código, validade, estado | Uso único |
| **VotoInfantil** | id, evento, candidato, horário, dispositivo | Sem dado da criança |
| **ConfigPlacar** | evento, peso popular, peso júri, peso infantil, regra de desempate, exibir votos do júri no telão | Pesos somam 100% |
| **ConfigApresentacao** | evento, link do trailer, usar trailer gerado, incluir candidatos no trailer, classificação completa, modo de avanço, rótulos das categorias, parcial ao vivo, limiar "reta final" | Padrões na seção 8 |
| **Tema** | evento, nome de exibição, logo, paleta, tipografia, capa, rótulos, textos das telas de estado | Contraste validado; fontes pré-aprovadas |
| **CampoCandidato** | evento, rótulo, tipo (texto), ordem | Define os campos extras dos candidatos do evento |
| **ConviteAdmin** | evento, e-mail, estado, resgatado em | Admin adicional entra ao autenticar com o e-mail verificado |
| **ResultadoOficial** | evento, calculado em, pesos usados, placares por grupo, pontuação final, posições, categorias, empates e critério | **Congelado** no encerramento; correções geram novo registro |
| **Auditoria** | id, evento, ator, ação, detalhes, horário | Ver seção 10 |

> Futuro sem alterar o existente: `Criterio` e `NotaJuri` (participação, candidato, critério, nota).

### 6.3 Restrições essenciais
- `Participacao`: único `(usuario, evento)`.
- `VotoJuri`: único `(participacao, evento)`.
- Voto popular: marca `Participacao.votou` e grava `Voto` **na mesma transação**, com atualização condicional (`votou = falso`) para impedir duplicidade sob concorrência.
- Códigos e tokens: apenas **hash** no banco.

## 7. Funcionalidades

### 7.1 Votação popular (F1)

**Fluxo:** entrada em `/e/{slug}` → login ou registro → checagem de estado → lista de candidatos → seleção e revisão → confirmação → sucesso.

- **Identificação [Decidido]:** usuário global (Google ou e-mail verificado) com participação por evento. Só e-mail verificado vota. Método configurável por evento no futuro.
- **Estados:** urna não iniciada, encerrada, "já votou" e aberta.
- **Candidatos:** apenas publicados, em **ordem embaralhada por usuário**, estável durante a sessão.
- **Voto:** irrevogável, um por usuário por evento, com revisão antes de confirmar.
- **Erros tratados:** duplo clique e reenvio (idempotência), queda de rede na confirmação, urna fechada durante a confirmação, link direto com urna fechada, nenhum candidato publicado.
- **Sigilo [Decidido]:** quem votou (`Participacao`) e em quem votou (`Voto`) ficam desvinculados.
- **Pendências:** regra para candidato que também é participante votar em si mesmo.

### 7.2 Votação do júri (F2)

**Fluxo:** registro com switch **Jurado** + código → participação com papel `jurado` → mesma tela de voto, sem contagens → confirmação → alteração permitida enquanto a urna estiver aberta.

- **Convites [Decidido]:** códigos **individuais, de uso único**, gerados em lote pelo admin (n jurados), com rótulo opcional, validade, revogação e exportação em CSV. Só o hash fica no banco; o código aparece uma vez.
- **Resgate:** no registro ou, para quem já tem conta, em "Tenho um código de convite". Quem já votou como público no evento **não pode** resgatar.
- **Voto [Decidido]:** simples (um candidato); modelo preparado para notas por critério.
- **Sigilo [Decidido]:** voto **identificado para o admin**, com histórico de alterações; opção de exibir no telão (desligada por padrão). Jurados devem ser **informados** de que o voto é identificado.
- **Painel do jurado:** sem contagens (evita viés).
- **Urna:** mesma urna e mesma janela do público.

### 7.3 Votação infantil (F3)

**Fluxo:** admin gera código de pareamento → totem é pareado → modo quiosque ("Toque para votar") → seleção → confirmação em duas etapas → sucesso → retorno automático.

- **Totem [Decidido]:** dispositivo pareado (token de longa duração, só hash no banco), com estado ativo, pausado ou revogado, nome e **PIN de saída do quiosque**.
- **Dados [Decidido]:** candidato, horário e dispositivo; nenhum dado da criança.
- **Integridade [Decidido]:** mediador adulto por totem e pesos na fórmula; nenhum controle técnico adicional agora.
- **Placar [Decidido]:** próprio, "Escolha das Crianças", **e** peso na fórmula final.
- **Módulo opcional** por evento; entra no Festival.

### 7.4 Modo apresentação (F4)

**Fluxo:** o admin abre a tela, espelha ou estende no telão e clica em **Apresentar**. A tela corresponde ao estado do evento:

1. Antes da votação: nome, logo, candidatos e contagem.
2. Votação aberta: cards, **QR Code**, temporizador (hora do servidor) e **total geral**.
3. Encerrada: "Votação encerrada", aguardando o admin.
4. Revelação (sequência abaixo).
5. Resultado final estático.

**Sequência da revelação [Decidido]:** trailer do evento → **Queridinho do público** (mais votado pelo público geral) → **Preferido das crianças** → **Escolha dos jurados** → **pódio** com pontuação final (3º, 2º, 1º) → classificação completa (opcional, desligada por padrão).

- **Trailer [Decidido]:** um só para o evento, por link de vídeo; fallback para trailer gerado no navegador com a identidade do evento; pular a qualquer momento.
- **Empates [Decidido]:** revelados ao vivo, com animação que mostra o critério e destaca o vencedor do desempate. Se persistir, a posição é compartilhada.
- **Operação:** tela cheia com atalhos de teclado, modo de avanço automático ou manual, **modo ensaio** com dados simulados, botão de emergência para o resultado estático e pré-carregamento de mídia.
- **Aviso:** ao espelhar, tudo o que o admin faz vai para o telão; recomenda-se estender a tela.
- **Segurança:** o resultado só chega ao admin autenticado, depois do encerramento.

### 7.5 Dashboard e exportação (F5)

- **Abas [Decidido]:** **Operação** (ao vivo) e **Resultado** (após o encerramento).
- **Operação:** estado da urna, tempo restante, totais por grupo, votos por minuto, participantes, jurados pendentes, totens, códigos de jurado e resumo de auditoria. **Sem votos por candidato** durante a votação (opção por evento).
- **Resultado:** o resultado oficial congelado (mesma fonte do telão).
- **Exportação [Decidido]:** CSVs (`resumo_evento`, `resultado_candidatos`, `votos_por_minuto`, `jurados`, `dispositivos`, `auditoria`) e relatório imprimível (PDF pelo navegador). Sem e-mails; votos identificados do júri só para o admin; toda exportação é auditada.
- **Desempenho:** consultas agregadas com cache curto e polling a cada poucos segundos.

### 7.6 Configuração do evento (F6)

**Objetivo:** permitir que o admin prepare, opere e conclua o evento sem alterar código.

**Criação do evento [Decidido]:** no início, o evento e o primeiro admin são criados por **seed/script**. Não há painel de super admin no MVP; ele entra quando houver mais eventos.

**Admins adicionais [Proposta]:** o admin cadastra o e-mail da pessoa; ao entrar com esse e-mail verificado, ela recebe o papel de admin do evento.

**Seções da tela de configuração [Proposta]**

| Seção | O que configura |
|---|---|
| **Geral** | Nome, slug da URL, descrição, datas, fuso horário |
| **Módulos** | Júri e infantil ligados ou desligados (apresentação e dashboard sempre existem) |
| **Votação** | Janela de início e fim, encerramento automático ao fim da janela, método de identificação, regra de candidato votar em si mesmo |
| **Candidatos** | Cadastro, edição, publicar e despublicar, imagem/cartaz, campos extras |
| **Júri** | Quantidade, geração de convites em lote, validade, revogação |
| **Infantil** | Dispositivos, códigos de pareamento, PIN do quiosque |
| **Placar** | Três pesos (somando 100%), regra de desempate, exibir votos do júri no telão |
| **Apresentação** | Trailer, rótulos das categorias, classificação completa, modo de avanço |
| **Tema** | Nome de exibição, logo, cores, tipografia, capa, rótulos, textos das telas de estado |
| **Privacidade** | Aviso de privacidade e prazo de anonimização |
| **Operação** | Abrir urna, encerrar urna, Concluir Evento |

**Campos extras de candidato [Proposta]:** título, descrição e imagem são obrigatórios; o evento define alguns campos extras de texto com seu próprio rótulo (ex.: "Direção" e "Duração" em um festival de cinema; "Equipe" e "Tecnologias" em um torneio de TI).

**Tema com limites [Proposta]:** a paleta passa por **checagem automática de contraste**, a tipografia vem de uma lista de **fontes pré-aprovadas**, e uma **pré-visualização** mostra login, votação e telão antes de salvar.

**Checklist de ativação (Rascunho → Ativo) [Proposta]**
- Pelo menos 2 candidatos publicados.
- Pesos somando 100%, considerando só os módulos ligados.
- Janela de votação válida.
- Júri ligado: convites gerados.
- Infantil ligado: ao menos um totem pareado (aviso, não bloqueio).
- Tema com contraste aprovado.
- Trailer testado (aviso).

**O que muda depois que a urna abre [Proposta]**

| Situação | O que se aplica |
|---|---|
| **Trava total** | Módulos, pesos, regra de desempate, método de identificação; adicionar, remover ou despublicar candidatos |
| **Permitido com auditoria** | Estender o fim da janela, pausar ou revogar totens, revogar convites, corrigir texto ou imagem de um candidato |
| **Livre** | Tema, trailer, rótulos e opções da apresentação |

**Ação excepcional: desqualificar candidato [Proposta]:** se um candidato precisar sair depois de receber votos, a ação auditada o marca como desqualificado e o retira do ranking, **mantendo os votos no banco**; o resultado oficial é recalculado como novo registro.

**Versão mínima (MVP) [Decidido em parte]:** Geral, Candidatos, Júri (convites), Placar, Tema básico (nome, logo e cores) e Operação; o restante é configurado por seed.

**Futuro:** painel de super admin, duplicar configuração entre eventos (atende o requisito de reutilização), campos extras mais ricos.

## 8. Apuração e resultado

### 8.1 Fórmula [Decidido]

```
pontuação(candidato) =
    peso_popular   × (votos_populares ÷ total_popular)
  + peso_juri      × (votos_juri      ÷ total_juri)
  + peso_infantil  × (votos_infantis  ÷ total_infantil)
```

- Cada grupo é **normalizado** antes de aplicar o peso.
- Os pesos somam 100%; grupo desativado no evento entra com peso 0.
- Os **placares por grupo** ficam sempre disponíveis, além da pontuação final.
- Votos rejeitados ou bloqueados não são contabilizados.

### 8.2 Desempate [Decidido]
- Ranking final: critério configurável por evento (maior votação do **júri** ou do **público**).
- Se o desempate também empatar: posição compartilhada, sem decisão automática.
- Categorias (queridinho, preferido, escolha): desempate pela pontuação final; se persistir, co-vencedores.

### 8.3 Resultado oficial congelado
- Gerado no **encerramento da urna** e não recalculado depois.
- Contém pesos usados, placares por grupo, pontuação final, posições, categorias, empates e critério aplicado.
- Telão, dashboard e exportação leem a **mesma fonte**.
- Correções só por ação administrativa auditada, com novo registro.

### 8.4 Configurações de apresentação (padrões) [Proposta]
- Classificação completa: desligada.
- Votos por candidato ao vivo: desligado.
- Trailer gerado sem candidatos.
- Modo de avanço: automático com pausa disponível.

## 9. Estados do sistema

### 9.1 Ciclo de vida do evento [Proposta]
`Rascunho → Ativo → Concluído`

- **Rascunho:** em configuração; nada é público. A passagem para **Ativo** exige o checklist da seção 7.6.
- **Ativo:** a votação opera conforme o estado da urna.
- **Concluído:** ação **Concluir Evento** do admin, depois da apresentação do resultado.
  - Bloqueia novas votações (popular, júri e totens).
  - Papéis de jurado permanecem como histórico (**não** são convertidos em público).
  - Dashboard em somente leitura, com exportações.

### 9.2 Estados da urna [Decidido]

```mermaid
stateDiagram-v2
  [*] --> NaoIniciada
  NaoIniciada --> Aberta : abrir
  Aberta --> Encerrada : encerrar ou fim da janela
  Encerrada --> [*]
```

- A urna só aceita votos quando **Aberta**.
- Encerrar bloqueia todos os votos de imediato.
- A hora do servidor é a referência para janela e temporizador.
- O encerramento automático ao fim da janela é configurável (seção 7.6); encerrar manualmente é sempre possível.
- Reabertura não é prevista; se necessária, seria uma ação excepcional auditada **[pendente]**.

## 10. Segurança, privacidade e auditoria

### 10.1 Sigilo por tipo de voto

| Voto | Quem pode saber em quem votou | Motivo |
|---|---|---|
| Popular | Ninguém (sem vínculo no banco) | Sigilo do voto |
| Júri | Admin do evento (identificado) | Júri pequeno; permite auditar contestações |
| Infantil | Ninguém (sem identificação da criança) | Não coletar dados de crianças |

### 10.2 Controles
- Validações **sempre no servidor** (estado da urna, papel, unicidade, dispositivo).
- Rate limiting em login, registro, resgate de código, pareamento e voto.
- Senhas com hash seguro; preferência por login social e código por e-mail.
- Códigos e tokens apenas como hash; revogação imediata.
- Mensagens de erro genéricas ao usuário; detalhes só no log técnico.
- Credenciais de admin individuais e mínimo privilégio; abrir e encerrar a urna exigem permissão de admin.
- Resultado e votos identificados só para admin autenticado.

### 10.3 Auditoria
Registrar: abertura e encerramento da urna; geração, resgate e revogação de códigos; pareamento, pausa e revogação de dispositivos; alteração de pesos e configuração; alterações de voto do júri; bloqueios por rate limit; revelação e recálculo de resultado; exportações; conclusão do evento. **Separar** logs técnicos dos registros de auditoria.

### 10.4 Privacidade e LGPD [Proposta]
- Coletar o mínimo (nome, e-mail); informar finalidade em aviso de privacidade no registro.
- Informar os jurados de que o voto é identificado ao admin.
- Exportações trazem apenas contagens de participantes, sem e-mails.
- **Retenção [Proposta]:** após **Concluir Evento**, nome e e-mail dos participantes são **anonimizados** depois de um prazo configurável por evento (sugestão: 90 dias), mantendo participações e votos para a integridade do resultado. O admin exporta o que precisar antes.

## 11. Desempenho, confiabilidade e operação

- **Pico:** concentração de votos logo após as sessões e a revelação. Registrar o voto deve ser leve (transação curta) e idempotente.
- **Dashboard e apresentação** usam agregações com cache curto, sem competir com o registro de votos.
- **Teste de carga** antes de cada evento, com cenários de usuários simultâneos, observando latência, taxa de erro, throughput e comportamento do banco.
- **Observabilidade:** logs estruturados, monitoramento de erros e disponibilidade, indicadores de operação durante a votação.
- **Backups** do banco antes do evento e procedimento de recuperação.
- **Contingência:** plano para indisponibilidade temporária, sem dupla contagem; responsável com acesso admin disponível no dia; ensaio completo da apresentação no modo ensaio.
- **Rede no evento:** conectividade estável para o telão e para os totens (fila offline fica para depois).

## 12. Acessibilidade, responsividade e identidade visual

- **Mobile-first** (votação por QR Code), com tablets nos totens e 16:9 para telão (1080p e 4K).
- Contraste adequado, tipografia legível, foco visível, áreas de toque amplas, navegação por teclado e leitores de tela.
- Informação nunca só por cor ou animação; texto e ícones acompanham os estados.
- Respeitar `prefers-reduced-motion`; animações mais expressivas apenas no modo apresentação.
- **Interface infantil:** poucos elementos, cartazes grandes, mínimo de texto, feedback imediato.
- **Tema por evento:** nome, logo, paleta, tipografia, imagem de capa e rótulos (ex.: "filme", "projeto", "música"; nomes das categorias do telão), via variáveis de design. Sem layouts diferentes por evento.

## 13. Plano de entrega [Proposta]

> Datas exatas da Semana Tech a confirmar.

| Fase | Conteúdo | Resultado |
|---|---|---|
| **0. Fundação** | Projeto Next.js/TS, banco, migrações, autenticação (Google e e-mail verificado), multi-evento, tema por variáveis, auditoria básica, seed de evento e admin | Base pronta para os módulos |
| **1. Semana Tech (MVP)** | Evento e candidatos (configuração mínima), votação popular, júri com convites, apresentação, dashboard com exportação | Evento de outubro operando |
| **2. Endurecimento** | Teste de carga, ensaio da apresentação, contingência, backups, revisão de segurança | Confiança no uso real |
| **3. Festival** | Voto infantil com totens, tema do festival (cartazes em destaque), ajustes vindos da Semana Tech, relatório | Evento de novembro |

**Sugestão de ordem de implementação na Fase 1:** auth e participação → candidatos e urna → voto popular → júri e convites → resultado congelado e apuração → dashboard → modo apresentação.

**Redução de risco [Decidido]:** no primeiro evento, o evento e o primeiro admin são criados por **seed/script** (sem painel de super admin). A tela de configuração do MVP cobre só **Geral, Candidatos, Júri (convites), Placar, Tema básico e Operação**; o restante é configurado por seed e entra na fase seguinte (ver 7.6).

## 14. Critérios de aceitação consolidados

**Votação popular**
- [ ] Usuário se registra, verifica o e-mail, vota em poucos passos e vê a confirmação.
- [ ] Segundo voto é impedido, inclusive com requisições simultâneas.
- [ ] Com a urna fechada ou não iniciada, não é possível votar, nem por link direto.
- [ ] Não existe vínculo entre usuário e candidato escolhido.
- [ ] A ordem dos cards varia entre usuários.

**Júri**
- [ ] Admin gera n códigos individuais e baixa a lista; código usado ou revogado é rejeitado.
- [ ] Quem já votou como público não resgata código.
- [ ] Jurado vota, altera até o fim da urna e o histórico fica registrado.
- [ ] O painel do jurado não exibe contagens.

**Voto infantil**
- [ ] Totem é pareado, vota com confirmação em duas etapas e volta ao início sozinho.
- [ ] Sair do quiosque exige PIN; totem pausado ou revogado não aceita votos.
- [ ] O voto guarda candidato, horário e dispositivo, sem dado pessoal.

**Apresentação**
- [ ] A tela corresponde ao estado do evento; ao vivo mostra cards, QR Code, temporizador e total geral.
- [ ] A revelação segue a ordem definida e pula categorias sem módulo.
- [ ] Empates aparecem com critério e destaque; empate persistente vira posição compartilhada.
- [ ] Trailer cai no gerado se o link falhar; modo ensaio e botão de emergência funcionam.
- [ ] Nenhum dado de resultado chega ao navegador antes da revelação.

**Dashboard e exportação**
- [ ] Durante a votação, não aparecem votos por candidato.
- [ ] Os números do dashboard e do telão batem (resultado congelado).
- [ ] Exportações geram os CSVs sem e-mails; a exportação do júri é restrita e auditada.
- [ ] Evento concluído abre em somente leitura.

**Configuração do evento**
- [ ] Evento e primeiro admin criados por seed/script e acessíveis em `/e/{slug}/admin`.
- [ ] Admin cadastra candidatos com campos extras definidos pelo evento.
- [ ] O tema é aplicado e a paleta é validada por contraste.
- [ ] A ativação do evento exige o checklist (candidatos, pesos, janela).
- [ ] Depois que a urna abre, módulos, pesos, desempate, identificação e lista de candidatos ficam travados.
- [ ] Mudanças permitidas após a abertura ficam auditadas.

**Transversais**
- [ ] O tema do evento aparece em login, votação, totem e apresentação.
- [ ] Interfaces utilizáveis em celular, com foco visível e navegação por teclado.
- [ ] O sistema suporta o teste de carga definido para o cenário esperado.
- [ ] Ações administrativas relevantes ficam auditáveis.

## 15. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Pico de votos após as sessões | Transação curta, idempotência, cache curto no dashboard, teste de carga |
| Contas falsas | Google ou e-mail verificado, rate limiting, restrição única por evento |
| Código de jurado vazado | Códigos individuais, uso único, validade, revogação, auditoria |
| Resultado vazando por espelhamento da tela | Atalhos de teclado, tela cheia, recomendação de estender a tela, dados só após a revelação |
| Voto infantil repetido | Mediador adulto, pesos na fórmula, dados de dispositivo e horário para análise posterior |
| Falha de internet no evento | Plano de contingência, conectividade testada, resultado congelado, botão de emergência |
| Totem perdido ou comprometido | Revogação imediata e PIN de saída |
| Animações pesadas travam no telão | Pré-carregamento, modo ensaio, resultado estático de emergência |
| Escopo e prazo curto | Fases, seed para o primeiro evento, configuração mínima |
| Contestação do júri | Voto identificado, histórico de alterações, auditoria |
| Dados pessoais | Coleta mínima, aviso de privacidade, retenção configurável |
| Mudança de configuração com votos registrados | Trava de módulos, pesos, desempate e candidatos ao abrir a urna; alterações permitidas auditadas |
| Tema com baixo contraste ou ilegível | Validação automática de contraste, fontes pré-aprovadas e pré-visualização |

## 16. Decisões registradas

1. VaiVota é **white-label**: núcleo único com tema por evento.
2. Stack: **React/TS + Next.js**.
3. Conta global + **participação por evento** com papel; login Google e e-mail verificado.
4. Voto popular único (restrição no banco), irrevogável, sem vínculo com o usuário; ordem embaralhada.
5. Júri: convites individuais de uso único em lote; voto simples; **identificado** ao admin; alterável até o fim da urna.
6. Placar por **percentual ponderado** com três pesos (popular, júri, infantil), configuráveis; desempate configurável (júri ou público).
7. Infantil: totem como **dispositivo pareado**; placar próprio "Escolha das Crianças" **e** peso; mediador adulto; fila offline depois.
8. Apresentação **só do admin**, local; trailer único do evento; revelação por categorias, pódio e empates ao vivo; classificação completa opcional.
9. Dashboard em **duas abas**; sem votos por candidato durante a votação; exportação sem e-mails.
10. **Resultado oficial congelado** no encerramento, fonte única para telão, dashboard e exportação.
11. "Concluir Evento" bloqueia votos e mantém o histórico de papéis.
12. Eventos e o primeiro admin são criados por **seed/script**; **sem painel de super admin** por enquanto.
13. A configuração do evento segue a estrutura da seção 7.6 (seções, checklist, travas, retenção); itens marcados como [Proposta] seguem sujeitos a revisão.

## 17. Pendências consolidadas

**Regras de negócio**
- Candidato que também é participante votar em si mesmo: a opção existe na configuração; falta o padrão (recomendado: bloquear quando o candidato estiver vinculado a um usuário).
- Grupo ativo **sem nenhum voto** na fórmula: parcela zero ou redistribuição dos pesos? [recomendação: definir antes do evento]
- Reabertura excepcional da urna depois de encerrada.
- Se o jurado pode ver o próprio voto depois do evento.
- Desqualificação de candidato: confirmar o tratamento (votos preservados, fora do ranking, novo resultado oficial).

**Configuração e plataforma**
- Confirmar o mecanismo de admins adicionais por e-mail verificado.
- Prazo padrão de anonimização (sugestão: 90 dias) e texto do aviso de privacidade.
- Lista de fontes pré-aprovadas e limiar de contraste do tema.
- Painel de super admin e duplicar configuração (futuro).

**Técnicas**
- Escolha de ORM, biblioteca de autenticação, hospedagem, rate limiting e monitoramento.
- Número esperado de votantes por evento (para dimensionar os testes de carga).
- Formato exato dos CSVs e layout do relatório imprimível.

**Experiência**
- Modo de avanço padrão da apresentação, duração das etapas e do trailer gerado.
- Direção visual das animações (incluindo o efeito de desempate).
- Textos e ilustrações das telas de estado e do totem.
- Tela pública de resultado estático após o evento (futuro).

## 18. Glossário

- **Evento:** uma votação com seus candidatos, regras, tema e participantes.
- **Candidato:** item votado (filme, projeto, música, jogo).
- **Urna:** controle que determina quando se pode votar (não iniciada, aberta, encerrada).
- **Participação:** vínculo de um usuário com um evento, com papel e indicação de que votou.
- **Placar:** contagem de votos de um grupo (popular, júri ou infantil).
- **Pontuação final:** resultado da fórmula ponderada que define o ranking.
- **Resultado oficial:** cálculo congelado no encerramento, fonte única de telão e exportação.
- **Totem:** dispositivo pareado para voto infantil.
- **Convite:** código individual de uso único que habilita o registro como jurado.
- **Modo ensaio:** execução da apresentação com dados simulados.
