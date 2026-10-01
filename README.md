# VaiVota

Plataforma web **white-label de votação para eventos**. Um mesmo software atende festivais, torneios e campeonatos: cada evento tem seus candidatos, regras e identidade visual, sem alterar código.

> **Status:** em desenvolvimento. O planejamento e o modelo de dados estão concluídos (ver [Documentação](#documentação)); a implementação está começando. Os comandos de instalação abaixo descrevem o fluxo previsto e devem ser ajustados conforme o projeto for criado.

---

## Sumário

- [O que é](#o-que-é)
- [Recursos](#recursos)
- [Conceitos](#conceitos)
- [Princípios de design](#princípios-de-design)
- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Modelo de dados](#modelo-de-dados)
- [Primeiros passos](#primeiros-passos)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Segurança e privacidade](#segurança-e-privacidade)
- [Documentação](#documentação)
- [Roadmap](#roadmap)
- [Licença](#licença)

## O que é

O VaiVota resolve o ciclo completo de uma votação presencial e online: o público vota pelo celular (por QR Code), jurados votam em um painel próprio, crianças votam em totens, e a organização acompanha tudo, apresenta o resultado em um telão e exporta os dados.

O produto é **configurável, não customizável**: o layout e os fluxos são fixos, e cada evento muda nome, logo, cores, tipografia, rótulos e regras por configuração. O VaiVota aparece de forma discreta e o evento é o dono da experiência.

## Recursos

| Recurso | Descrição |
|---|---|
| **Votação popular** | Login com Google ou e-mail verificado, lista de candidatos, revisão e confirmação. Um voto por pessoa, irrevogável e sigiloso |
| **Votação do júri** | Convites individuais de uso único, voto simples identificado para o admin, alterável enquanto a urna estiver aberta |
| **Votação infantil** | Totens pareados em modo quiosque, sem login e sem dados pessoais |
| **Modo apresentação** | Tela cinematográfica para telão: andamento ao vivo, QR Code, temporizador e revelação do resultado com categorias, pódio e empates |
| **Dashboard** | Acompanhamento da operação (aba Operação) e resultado oficial (aba Resultado), com exportação em CSV e relatório imprimível |
| **Configuração do evento** | Candidatos, módulos, janela de votação, pesos do placar, tema, convites e dispositivos |
| **Multi-evento** | Vários eventos isolados no mesmo sistema, cada um em `/e/{slug}` |

Os módulos de júri e infantil são opcionais por evento.

## Conceitos

- **Evento:** uma votação com seus candidatos, regras, tema e participantes.
- **Candidato:** o item votado (filme, projeto, música, jogo). Título, descrição e imagem são obrigatórios; o evento pode definir campos extras.
- **Urna:** controla quando se pode votar (`NAO_INICIADA`, `ABERTA`, `ENCERRADA`).
- **Participação:** vínculo de um usuário com um evento, com papel (`PUBLICO`, `JURADO`, `ADMIN`).
- **Placar:** contagem de votos de um grupo (popular, júri ou infantil).
- **Pontuação final:** resultado da fórmula ponderada que define o ranking.
- **Resultado oficial:** cálculo congelado no encerramento da urna; fonte única do telão, do dashboard e da exportação.
- **Totem:** dispositivo pareado para o voto infantil.

### Apuração

```
pontuação(candidato) =
    peso_popular   × (votos_populares ÷ total_popular)
  + peso_juri      × (votos_juri      ÷ total_juri)
  + peso_infantil  × (votos_infantis  ÷ total_infantil)
```

Cada grupo é normalizado antes de receber o peso; os pesos somam 100% e são configuráveis por evento. O desempate também é configurável (maior votação do júri ou do público).

## Princípios de design

1. **Integridade primeiro:** nenhum voto válido duplicado, perdido ou alterado indevidamente.
2. **Sigilo proporcional ao grupo:** voto popular secreto, voto do júri identificado para o admin, voto infantil sem identidade.
3. **Simples para votar:** poucos passos, feedback claro, mobile-first.
4. **Configurável, não customizável:** tema e regras por evento, sem editor visual.
5. **Escopo enxuto:** sem recursos sociais, curtidas ou gamificação.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js + React + TypeScript |
| Banco de dados | MySQL 8.0.16+ (InnoDB) |
| ORM e migrações | Prisma |
| Autenticação | Google e e-mail verificado (biblioteca a definir) |
| Hospedagem, rate limiting e monitoramento | A definir |

## Arquitetura

O sistema tem quatro experiências sobre os mesmos dados e regras de negócio, e o servidor valida tudo.

```mermaid
flowchart LR
  P["Público e jurado"] --> A["Next.js"]
  T["Totem (quiosque)"] --> A
  AD["Admin e apresentação"] --> A
  A --> S["Serviços de domínio"]
  S --> DB[("MySQL via Prisma")]
```

| Rota | Quem | Descrição |
|---|---|---|
| `/e/{slug}` | Todos | Entrada do evento, login e registro |
| `/e/{slug}/votar` | Público, jurado | Candidatos, revisão e confirmação do voto |
| `/e/{slug}/convite` | Usuário logado | Resgate de código de convite de jurado |
| `/e/{slug}/admin` | Admin | Dashboard (Operação e Resultado) |
| `/e/{slug}/admin/configuracao` | Admin | Configuração do evento |
| `/e/{slug}/admin/apresentar` | Admin | Modo apresentação |
| `/totem/parear` e `/totem` | Dispositivo | Pareamento e voto infantil |

### Decisões de arquitetura

- **Multi-evento:** todo dado de domínio carrega o evento; um admin só acessa o seu.
- **Tema por variáveis de design:** cores, tipografia e rótulos vêm da configuração do evento.
- **Resultado congelado:** gerado no encerramento da urna e versionado; correções criam uma nova versão.
- **Voto único no banco:** `UPDATE ... WHERE votou = 0` e `INSERT` do voto na mesma transação.
- **Apresentação local:** roda no navegador do admin, sem sincronização entre telas.

## Modelo de dados

O schema completo está em [`prisma/schema.prisma`](prisma/schema.prisma), com uma versão de referência em SQL em [`docs/schema.sql`](docs/schema.sql). Principais pontos:

- **Voto popular sem usuário:** a tabela `voto` não referencia o usuário; `participacao` guarda apenas se a pessoa votou, sem horário.
- **FKs compostas `(id, evento_id)`:** votos só apontam para candidato, participação ou dispositivo do mesmo evento.
- **Votos e históricos nunca são apagados:** dados pessoais são anonimizados, não excluídos.
- **Códigos e tokens:** apenas o hash fica no banco.
- **CHECK dos pesos** (somam 100): o Prisma não expressa; deve ser adicionado manualmente à migration (ver `docs/schema.sql`).

## Primeiros passos

### Pré-requisitos

- Node.js (versão LTS)
- MySQL 8.0.16 ou superior (necessário para `CHECK` e valores padrão por expressão)
- Um gerenciador de pacotes (npm, pnpm ou yarn)

### Instalação

```bash
git clone <url-do-repositorio> vaivota
cd vaivota
npm install
cp .env.example .env        # preencha as variáveis (ver abaixo)
```

### Banco de dados

```bash
# cria o banco
mysql -u root -p -e "CREATE DATABASE vaivota CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# aplica as migrations e gera o client do Prisma
npx prisma migrate dev

# cria o primeiro evento e o primeiro admin (seed)
npx prisma db seed
```

> Eventos e o primeiro admin são criados por **seed/script**. Não há painel de super admin nesta versão.

### Execução

```bash
npm run dev
```

A aplicação sobe em `http://localhost:3000`. O evento criado pelo seed fica em `/e/{slug}`.

## Variáveis de ambiente

Os nomes finais dependem da biblioteca de autenticação escolhida.

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | URL de conexão do MySQL, ex.: `mysql://usuario:senha@localhost:3306/vaivota` |
| `AUTH_SECRET` | Segredo usado pela autenticação |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Credenciais do login com Google |
| `APP_URL` | URL pública da aplicação (QR Codes e links de convite) |

## Estrutura do projeto

Proposta inicial, a ajustar na implementação:

```
vaivota/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── docs/                    # Design Document e planners
├── src/
│   ├── app/                 # rotas (Next.js App Router)
│   │   ├── e/[slug]/        # público, jurado e admin
│   │   └── totem/           # pareamento e quiosque
│   ├── components/          # interface e componentes de tema
│   ├── server/              # regras de negócio
│   │   ├── votacao/         # voto popular e voto do júri
│   │   ├── infantil/        # dispositivos e voto infantil
│   │   ├── apuracao/        # fórmula, desempate e resultado oficial
│   │   └── exportacao/      # CSVs e relatório
│   └── lib/                 # banco, autenticação, hash, rate limit
└── tests/
```

## Segurança e privacidade

- Validações **sempre no servidor** (estado da urna, papel, unicidade, dispositivo).
- Rate limiting em login, registro, resgate de código, pareamento e voto.
- Códigos de convite, tokens de dispositivo e PINs guardados apenas como **hash**.
- Resultado e votos identificados disponíveis só para o admin autenticado, e só depois do encerramento.
- **Auditoria** de ações administrativas, convites, dispositivos, alterações de voto do júri, bloqueios e exportações, separada dos logs técnicos.
- **Privacidade (LGPD):** coleta mínima (nome e e-mail); exportações trazem só contagens de participantes; anonimização dos dados pessoais depois do evento, com prazo configurável (sugestão: 90 dias).
- O voto do jurado é identificado para o admin, e o jurado é informado disso no registro.

## Documentação

| Documento | Conteúdo |
|---|---|
| [`DocumentDesign.md`](docs/DocumentDesign.md) | Design Document completo: escopo, arquitetura, modelo de dados, regras, segurança, plano de entrega, riscos e pendências |
| [`Login.md`](docs/Login.md) | Login, registro e votação popular |
| [`Jurado.md`](docs/Jurado.md) | Votação do júri |
| [`VotoInfantil.md`](docs/VotoInfantil.md) | Votação infantil (totens) |
| [`ModoApresentacao.md`](docs/ModoApresentacao.md) | Modo apresentação (telão) |
| [`Dashboard.md`](docs/Dashboard.md) | Dashboard e exportação |

## Roadmap

| Fase | Conteúdo |
|---|---|
| **0. Fundação** | Projeto Next.js/TS, banco e migrações, autenticação, multi-evento, tema por variáveis, auditoria básica, seed |
| **1. MVP** | Candidatos, votação popular, júri com convites, apuração e resultado congelado, dashboard com exportação, modo apresentação |
| **2. Endurecimento** | Teste de carga, ensaio da apresentação, contingência, backups, revisão de segurança |
| **3. Voto infantil** | Totens pareados, modo quiosque, placar próprio e peso na fórmula |

**Fora do escopo por ora:** painel de super admin, sincronização da apresentação entre telas, notas por critério do júri, fila offline nos totens, upload de vídeo, geração de PDF no servidor e duplicar configuração entre eventos.

## Licença

A definir.