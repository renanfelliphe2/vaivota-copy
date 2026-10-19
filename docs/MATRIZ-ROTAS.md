# Matriz de rotas

Matrizes A (rotas × papel) e B (telas × fase) da Etapa 9 e o mapa de entradas e saídas. A coluna **Conferido** marca o que já foi visto no navegador; nesta máquina o navegador automatizado não roda (ver [ACHADOS.md](ACHADOS.md), A-006), então a conferência de tela é manual. O comportamento esperado foi conferido no código (guardas, `resolverAcesso`, `resolverVisaoEvento`, `resolverEstadoVotar`, `resolverFaseConfig`, `resolverFasePalco`) e, onde há função pura, por teste.

Legenda: **VER** tela normal · **LOGIN** vai para `/e/{slug}?de={rota}` · **VERIF** vai para `/e/{slug}/verificar-email` · **RESTRITO** `AcessoRestrito` sem dado da tela · **REDIR** redireciona · **AVISO** tela informativa sem formulário.

## MVP Maratona Tech Tivit: o que muda (15/10/2026)

- **Fora do MVP, 404:** `/dev/ui`, `/e/[slug]/avaliar/[id]`, `/e/[slug]/convite`, `/e/[slug]/totem`, `/e/[slug]/admin/apresentar` e `/e/[slug]/admin/apresentar/palco` (com `NEXT_PUBLIC_MODULOS_FESTIVAL` diferente de `true`). O atalho "Apresentação", a seção Júri/Parceiros da Configuração e o botão "Abrir apresentação" somem.
- **Rotas novas:** `/e/[slug]/continuar` (volta do Google: cria a participação e segue ao destino) e as de API: `POST /api/servico/[nome]` (todos os serviços; exige `Origin` do próprio site), `/api/auth/*` (só `get-session`, `sign-out`, `sign-in/social`, `callback/*`, `ok` e `error`; cadastro, login por e-mail e códigos passam pelos serviços, que têm bloqueio e auditoria) e `POST /api/candidatos/imagem` (upload, só admin).
- **Cadastro:** criar conta **não abre sessão**: leva a `/e/[slug]/verificar-email`, onde o código do e-mail abre a sessão. Antes de o evento ser ativado, só e-mail com convite de admin cria conta.
- `/` leva direto a `/e/<EVENTO_PADRAO_SLUG>` se a variável existir.
- Os papéis da matriz abaixo valem para o Festival (contas seed do protótipo). Na Maratona Tech Tivit: visitante, público (qualquer pessoa com e-mail confirmado) e admin (por `promover-admin`).

## Matriz A: rotas × papel

| Rota | Deslogado | Davi | Ana | Bruno | Carla | Hugo (Maratona Tech Tivit) | Conferido |
|---|---|---|---|---|---|---|---|
| `/` | VER | VER | VER | VER | VER | VER | ☐ |
| `/e/[slug]` | VER (página única; "Votar" pede login) | VER ("Votar" leva à verificação) | VER (vota na lista) | VER (vota na lista como jurado) | VER (só leitura) | VER (vota na lista, usuário comum) | ☐ |
| `/e/[slug]/verificar-email` | LOGIN; com login pendente: VER | VER | REDIR | REDIR | REDIR | REDIR | ☐ |
| `/e/[slug]/convite` | LOGIN | VERIF | VER | AVISO "Você já é jurado" | AVISO "Contas administrativas não resgatam convite" | VER | ☐ |
| `/e/[slug]/votar` | REDIR `#candidatos` | REDIR | REDIR | REDIR | REDIR | REDIR | ☐ |
| `/e/[slug]/avaliar/[candidatoId]` | LOGIN | VERIF | AVISO "Só para jurados" | VER (júri por critério e urna aberta; senão AVISO) | AVISO "Só para jurados" | AVISO "Só para jurados" | ☐ |
| `/e/[slug]/admin` | LOGIN | RESTRITO | RESTRITO | RESTRITO | VER | RESTRITO | ☐ |
| `/e/[slug]/admin/configuracao` | LOGIN | RESTRITO | RESTRITO | RESTRITO | VER | RESTRITO | ☐ |
| `/e/[slug]/admin/relatorio` | LOGIN | RESTRITO | RESTRITO | RESTRITO | VER (com resultado; senão explicação) | RESTRITO | ☐ |
| `/e/[slug]/admin/apresentar` | LOGIN | RESTRITO | RESTRITO | RESTRITO | VER | RESTRITO | ☐ |
| `/e/[slug]/admin/apresentar/palco` | LOGIN | RESTRITO | RESTRITO | RESTRITO | VER (aba do telão) | RESTRITO | ☐ |
| `/dev/ui` | VER com a toolbar ligada; 404 com `NEXT_PUBLIC_DEV_TOOLBAR=false` | | | | | | ☐ |
| `/xyz`, `/e/maratona-tech-tivit/xyz` | `not-found` global | | | | | | ☐ |
| `/e/inexistente/...` | `EventoNaoEncontrado` (gate) | | | | | | ☐ |

Hugo no Festival é admin (VER nas rotas de admin). Além da guarda da tela, todo serviço de admin recusa com `NAO_AUTORIZADO` (conferido por teste com Ana e com Hugo na Maratona Tech Tivit).

## Matriz B: telas × fase

| Tela | `RASCUNHO` | `ATIVO_NAO_INICIADA` | `URNA_ABERTA` | `URNA_ENCERRADA` | `CONCLUIDO` |
|---|---|---|---|---|---|
| Evento (landing) | Em preparação; "Em breve" desabilitado | Abre em… / aguardando abertura; "Criar conta" | Votação aberta; "Quero votar" | Votação encerrada | Evento concluído |
| Evento | Não admin: indisponível; admin: banner de rascunho | Abre em; sem voto | Botão conforme papel | Sem voto; agradecimento | Concluído |
| Convite | Comportamento real a registrar na conferência | Formulário | Formulário | Aviso | Aviso |
| Votar | Indisponível | Não iniciada | Lista / já votou / júri desligado / sem candidatos; vota em tempo esgotado | Encerrada | Concluído |
| Painel | Estado vazio + link para Configuração; só `auditoria` exportável | Zeros; exportações de operação | Operação com polling de 5 s; Resultado desabilitado | Operação estática; Resultado (números ocultos até "Mostrar resultado"); todas as exportações; relatório | Leitura; exportações auditadas |
| Configuração | Livre; ativar com checklist | Livre menos slug; abrir urna | Travas da urna aberta; encerrar | Concluir digitando o nome | Leitura |
| Palco | Pré-votação "Em breve" | Pré-votação com contagem | Ao vivo (QR, temporizador, total; sem voto por candidato) | Aguardando → revelação → final | Final estático (sem resultado: aviso) |

Combinações só da toolbar seguem `CONCLUIDO` > `RASCUNHO` > urna e mostram "Combinação criada pela toolbar…" no painel, na Configuração e na sala.

## Entradas e saídas

| Rota | Como se chega | Como se sai |
|---|---|---|
| `/` | Início (landing do VaiVota); "Voltar ao início" do `not-found` e do `error` | Lista de eventos |
| `/e/[slug]` | Lista de eventos de `/`; logo do cabeçalho; nome do evento no `AdminShell` | Votar, convite, painel (admin), menu do usuário |
| `/e/[slug]/verificar-email` | Entrar, criar conta | Destino de `resolverDestinoAcesso` (`?de=` seguro) |
| `/e/[slug]/convite` | "Sou jurado"/"Tenho um código" | Votar como jurado, evento |
| `/e/[slug]#candidatos` | Botão de voto do evento, atalho "Votar", destino pós-login | Revisão e sucesso em modais na própria entrada; jurado por critério: "Avaliar" |
| `/e/[slug]/avaliar/[candidatoId]` | "Avaliar"/"Rever avaliação" no cartão ou no detalhe (jurado com o júri por critério); "Votar" do visitante que volta do login como jurado | "Voltar para a lista"; salvar volta à lista ou vai ao próximo sem avaliação; "Anterior"/"Seguinte" |
| `/e/[slug]/admin` | `PAINEL_ADMIN` no evento; `AdminShell` | `AdminShell` (Configuração, Apresentação, evento); "Ver relatório"; "Abrir apresentação" |
| `/e/[slug]/admin/configuracao` | `AdminShell`; links do painel (`?secao=operacao`, `?secao=juri`) | `AdminShell` |
| `/e/[slug]/admin/relatorio` | "Ver relatório" na aba Resultado | "Voltar ao painel"; `AdminShell` |
| `/e/[slug]/admin/apresentar` | `AdminShell`; "Abrir apresentação" | "Voltar ao painel" na sala (acrescentado na Etapa 9, A-012); "Apresentar" abre o palco na aba do telão |
| `/e/[slug]/admin/apresentar/palco` | "Apresentar" da sala (aba própria, reaproveitada) | `Q`/Sair fecha a aba (se o navegador não fechar, fica "Apresentação encerrada") |

## Títulos (`<title>`)

| Rota | Título |
|---|---|
| `/` | Do evento padrão (`{nome} \| VaiVota`) |
| `/e/[slug]` | `{nome} \| VaiVota` |
| `/e/[slug]/verificar-email` | `Código de acesso · {nome}` |
| `/e/[slug]/convite` | `Convite de jurado · {nome}` |
| `/e/[slug]/votar` | (redireciona; sem título próprio) |
| `/e/[slug]/avaliar/[candidatoId]` | `Avaliação do júri · {nome}` |
| `/e/[slug]/admin` | `Painel · {nome}` |
| `/e/[slug]/admin/configuracao` | `Configuração · {nome}` |
| `/e/[slug]/admin/relatorio` | `Relatório · {nome}` |
| `/e/[slug]/admin/apresentar` | `Apresentação · {nome}` |
| `/e/[slug]/admin/apresentar/palco` | `Telão · {nome}` |
| `not-found` | `Página não encontrada · VaiVota` |

O nome vem do seed (o servidor não conhece o estado do cliente): um evento renomeado na Configuração mantém o título do seed até o F5.
