# Matriz de rotas

Matrizes A (rotas × papel) e B (telas × fase) da Etapa 9 e o mapa de entradas e saídas. A coluna **Conferido** marca o que já foi visto no navegador; nesta máquina o navegador automatizado não roda (ver [ACHADOS.md](ACHADOS.md), A-006), então a conferência de tela é manual. O comportamento esperado foi conferido no código (guardas, `resolverAcesso`, `resolverVisaoEvento`, `resolverEstadoVotar`, `resolverFaseConfig`, `resolverFasePalco`) e, onde há função pura, por teste.

Legenda: **VER** tela normal · **LOGIN** vai para `/e/{slug}?de={rota}` · **VERIF** vai para `/e/{slug}/verificar-email` · **RESTRITO** `AcessoRestrito` sem dado da tela · **REDIR** redireciona · **AVISO** tela informativa sem formulário.

## Matriz A: rotas × papel

| Rota | Deslogado | Davi | Ana | Bruno | Carla | Hugo (Semana Tech) | Conferido |
|---|---|---|---|---|---|---|---|
| `/` | VER | VER | VER | VER | VER | VER | ☐ |
| `/e/[slug]` | VER (acesso) | VER (verificar e-mail) | VER (votar) | VER (votar como jurado) | VER (painel) | VER (votar, usuário comum) | ☐ |
| `/e/[slug]/verificar-email` | LOGIN; com login pendente: VER | VER | REDIR | REDIR | REDIR | REDIR | ☐ |
| `/e/[slug]/convite` | LOGIN | VERIF | VER | AVISO "Você já é jurado" | AVISO "Contas administrativas não resgatam convite" | VER | ☐ |
| `/e/[slug]/votar` | LOGIN | VERIF | VER | VER (sem contagens) | AVISO "Administradores não votam" | VER | ☐ |
| `/e/[slug]/admin` | LOGIN | RESTRITO | RESTRITO | RESTRITO | VER | RESTRITO | ☐ |
| `/e/[slug]/admin/configuracao` | LOGIN | RESTRITO | RESTRITO | RESTRITO | VER | RESTRITO | ☐ |
| `/e/[slug]/admin/relatorio` | LOGIN | RESTRITO | RESTRITO | RESTRITO | VER (com resultado; senão explicação) | RESTRITO | ☐ |
| `/e/[slug]/admin/apresentar` | LOGIN | RESTRITO | RESTRITO | RESTRITO | VER | RESTRITO | ☐ |
| `/dev/ui` | VER com a toolbar ligada; 404 com `NEXT_PUBLIC_DEV_TOOLBAR=false` | | | | | | ☐ |
| `/xyz`, `/e/semana-tech/xyz` | `not-found` global | | | | | | ☐ |
| `/e/inexistente/...` | `EventoNaoEncontrado` (gate) | | | | | | ☐ |

Hugo no Festival é admin (VER nas rotas de admin). Além da guarda da tela, todo serviço de admin recusa com `NAO_AUTORIZADO` (conferido por teste com Ana e com Hugo na Semana Tech).

## Matriz B: telas × fase

| Tela | `RASCUNHO` | `ATIVO_NAO_INICIADA` | `URNA_ABERTA` | `URNA_ENCERRADA` | `CONCLUIDO` |
|---|---|---|---|---|---|
| Landing | Em preparação; "Em breve" desabilitado | Abre em… / aguardando abertura; "Criar conta" | Votação aberta; "Quero votar" | Votação encerrada | Evento concluído |
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
| `/` | Início; logo da casca do evento; "Voltar ao início" do `not-found` e do `error` | CTA do evento |
| `/e/[slug]` | CTA da landing; nome do evento no `AdminShell` | Landing, votar, convite, painel (admin), menu do usuário |
| `/e/[slug]/verificar-email` | Entrar, criar conta | Destino de `resolverDestinoAcesso` (`?de=` seguro) |
| `/e/[slug]/convite` | "Sou jurado"/"Tenho um código" | Votar como jurado, evento |
| `/e/[slug]/votar` | Botão de voto do evento | Evento (casca), sucesso |
| `/e/[slug]/admin` | `PAINEL_ADMIN` no evento; `AdminShell` | `AdminShell` (Configuração, Apresentação, evento); "Ver relatório"; "Abrir apresentação" |
| `/e/[slug]/admin/configuracao` | `AdminShell`; links do painel (`?secao=operacao`, `?secao=juri`) | `AdminShell` |
| `/e/[slug]/admin/relatorio` | "Ver relatório" na aba Resultado | "Voltar ao painel"; `AdminShell` |
| `/e/[slug]/admin/apresentar` | `AdminShell`; "Abrir apresentação" | "Voltar ao painel" na sala (acrescentado na Etapa 9, A-012); `Q`/Sair no palco volta à sala |

## Títulos (`<title>`)

| Rota | Título |
|---|---|
| `/` | Do evento padrão (`{nome} \| VaiVota`) |
| `/e/[slug]` | `{nome} \| VaiVota` |
| `/e/[slug]/verificar-email` | `Código de acesso · {nome}` |
| `/e/[slug]/convite` | `Convite de jurado · {nome}` |
| `/e/[slug]/votar` | `Votação · {nome}` |
| `/e/[slug]/admin` | `Painel · {nome}` |
| `/e/[slug]/admin/configuracao` | `Configuração · {nome}` |
| `/e/[slug]/admin/relatorio` | `Relatório · {nome}` |
| `/e/[slug]/admin/apresentar` | `Apresentação · {nome}` |
| `not-found` | `Página não encontrada · VaiVota` |

O nome vem do seed (o servidor não conhece o estado do cliente): um evento renomeado na Configuração mantém o título do seed até o F5.
