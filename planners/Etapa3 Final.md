# VaiVota — Fase 1 · Etapa 3: Login e Registro

> **Rotas:** `/e/[slug]` (painel de acesso), `/e/[slug]/convite`, `/e/[slug]/verificar-email` (tela de código)
> **Depende de:** Etapa 0 (Fundação) e Etapa 2 (`EventoShell`, `resolverVisaoEvento`, `AcessoEvento`, `MenuUsuario` provisório)
> **Alimenta:** Etapa 4 e Etapa 5 (sessão, participação e guarda de e-mail verificado), Etapa 6 (convites resgatados), Etapa 7 (auditoria de resgates e bloqueios), Etapa 9
> **Fontes:** `Login.md` (seções 5 a 8), `Jurado.md` (seções 4, 6, 9 e 10), `schema.prisma` (`Usuario`, `Participacao`, `ConviteJurado`, `Evento.metodoIdentificacao`), `DocumentDesign.md` v1.1
> **Status:** versão final consolidada. Substitui `Etapa3 LoginRegistro.md`. **Revisão 3 (07/10/2026):** aplica as decisões do documento de pendências (itens B1, C2, C6, C7, C8, C9, D2, D5, D6, D7, D19, E6, E31). **Revisão 4 (07/10/2026):** A2, A5 (autenticação sem senha: login por Google ou código por e-mail), C7, E29.

---

## 1. Objetivo

Entregar todas as telas de acesso ao evento, navegáveis e com todos os estados de erro, usando apenas o store em memória: **entrar (código por e-mail ou Google)**, **criar conta como público**, **criar conta como jurado (com código de convite)**, **confirmar o código enviado por e-mail**, **resgatar convite estando logado** e **sair**. **Não existe senha** em nenhuma tela nem serviço (rev. 4, A5/C7).

Esta etapa precisa garantir:
- **Toda regra de acesso mora em `servicos/auth.ts`**; as telas só chamam serviços e seguem o `destino` devolvido.
- **Os códigos de convite funcionam como no desenho real**: só o hash existe no estado, o código é validado por evento e o resgate marca o convite como usado.
- **Quem entra ganha a participação do evento** (`Login.md`, passo 3; no login, ao confirmar o código), mas só quem verificou o e-mail alcança `/votar` e `/convite`. Quem já está logado e chega a outro evento ganha a participação por `garantirParticipacao`; **a participação nunca nasce junto com o voto** (C2).
- **Nenhuma regra de visibilidade se repete**: o link de convite e o destino pós-acesso vêm das funções da Etapa 2.

## 2. Escopo

**Dentro**
- Painel de acesso com abas **Entrar** e **Criar conta**, inline na entrada do evento e também num diálogo aberto pelo menu do usuário.
- Registro com seletor **Público / Jurado** e campo de código de convite.
- Login por código enviado por e-mail (e-mail → "Enviar código" → tela de código) e login com Google (seletor de conta fake).
- Tela de código (`/verificar-email`), usada no login e no registro, com código mock `123456`, reenvio e cooldown.
- Resgate de convite para quem já tem conta (`/convite`).
- `MenuUsuario` completo (assume o provisório da Etapa 2) e roteamento pós-acesso.
- Bloqueio simulado por tentativas (código de convite e código de login), auditoria dos resgates e das tentativas.

**Fora**
- Lista de candidatos e voto (Etapas 4 e 5). O destino do login para votar é a rota `/votar`, já existente como stub.
- Geração e revogação de códigos (Etapa 6). Aqui os códigos vêm do seed da Etapa 0.
- Convite de admin e demais telas administrativas (Etapas 6 a 8).
- Totem.
- Autenticação, hash, rate limiting, e-mail e Google reais (trilha de produção: Better Auth com Google e código por e-mail, Resend para o e-mail; rev. 4, A5).
- Senha e recuperação de senha: não existem (rev. 4, C7).

---

## 3. Contrato com as outras etapas

### 3.1 O que esta etapa recebe

| Item | Dono |
|---|---|
| `Resultado<T>`, `CodigoErro`, `atraso`, `simularFalha`, `mensagens.ts`, `registrarAuditoria`, `useConsulta` | Etapa 0 |
| `servicos/sessao.ts` (`entrarComo`, `sair`), `useSessao()`, `useAgora()`, `useEventoAtivo()` | Etapa 0 |
| `hashMock`, `lib/codigos.ts` (`normalizarCodigo`, `formatarCodigo`, `validarFormatoCodigo`), `lib/tempo.ts` | Etapa 0 |
| `Abas`, `Campo`, `Input`, `Checkbox`, `Botao`, `Alerta`, `Dialogo`, `Toast`, `ContagemRegressiva` | Etapa 0 |
| `RotaGuard`, `resolverAcesso` (com `?de=`), stubs de `convite`, `verificar-email`, `votar` e `admin` | Etapa 0 |
| Seed: oito usuários, participações, convites de jurado em todos os estados, `metodoIdentificacao` | Etapa 0 |
| Toolbar ("Entrar como", e-mail verificado, relógio, cenários) | Etapa 0 |
| `EventoShell`, `AcessoEvento` (slot `#acesso`), `MenuUsuario` provisório, `RodapeEvento` | Etapa 2 |
| `resolverVisaoEvento` (ação, `mostrarCodigoConvite`) e `lib/textosEstado.ts` | Etapa 2 |

### 3.2 O que esta etapa entrega

| Item | Consumidor |
|---|---|
| `servicos/auth.ts` (`entrar`, `entrarComGoogle`, `registrar`, `confirmarCodigo`, `reenviarCodigo`, `resgatarConvite`, `garantirParticipacao`) | Etapas 4 e 5 (participação criada no login ou ao chegar ao evento), Etapa 9 |
| `garantirParticipacao(eventoId): Promise<Resultado<{ papel: PapelParticipacao }>>`: com sessão e sem participação no evento, cria `PUBLICO` (mesma regra da D2: vale com e-mail não verificado; não cria para quem já tem). Chamado pelo slot de acesso no `EventoShell` ao montar, quando há sessão e não há participação no evento ativo (caso: já logado, chega a outro evento) (C2) | Etapa 4 (gate de `/votar` trata a ausência como carregamento transitório), Etapa 5 (o voto não cria participação) |
| `dominio/destinoAcesso.ts` (`resolverDestinoAcesso`) | Etapas 4 e 5 (voltar de um login a `/votar`) |
| Participação `PUBLICO` ou `JURADO` criada no login, no registro e por `garantirParticipacao`; **nunca** no voto | Etapas 4 e 5 |
| Página `/e/[slug]/verificar-email` como **tela de código** do login e do registro (rev. 4, A5); quem já está logado e verificado é redirecionado para o `?de=` (se interno) ou para a entrada do evento (item D2 da rev. 3) | Etapa 0 (guarda `EMAIL_VERIFICADO`), Etapas 4 e 5 |
| Convites marcados `USADO` com `participacaoId` e `resgatadoEm` | Etapa 6 (lista de convites) e Etapa 7 (contagens) |
| Entradas de auditoria `CONVITE_RESGATADO`, `TENTATIVA_CODIGO_INVALIDA`, `BLOQUEIO_RATE_LIMIT` | Etapa 7 (resumo de auditoria) |
| `MenuUsuario` completo | Etapas 4 e 5 (já dentro do `EventoShell`) |
| `CampoCodigoConvite` | reutilizável por qualquer tela que peça código |
| Cenários `SOMENTE_GOOGLE` e `SOMENTE_EMAIL` | Etapa 9 |
| Matriz de verificação de fluxos | Etapa 9 |

---

## 4. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | **Serviços em `servicos/auth.ts`**, devolvendo `Resultado<T>`. Todos os serviços recebem `eventoId` (inclusive `confirmarCodigo` e `reenviarCodigo`); quem devolve `destino` recebe também `de?` (rev. 3, D5; rev. 4, A5). Os serviços que levam a outra tela devolvem o `destino` já calculado. | Mesma fronteira que a trilha de produção (Better Auth) trocará; a tela não decide rota. |
| D2 | **Entrar (ao confirmar o código) ou registrar cria a participação do evento** (`PUBLICO`, ou `JURADO` no registro com código de convite) se ela não existir; no registro ela nasce com o e-mail ainda não verificado. Quem não verificou continua sem acesso a `/votar` e `/convite`. Admin de outro evento que entra num evento onde não tem participação vira `PUBLICO` ali. Quem já está logado e chega a outro evento ganha a participação pelo serviço `garantirParticipacao`, chamado pelo slot de acesso no `EventoShell` ao montar (rev. 3, C2). **O voto nunca cria participação** (Etapa 5). | `Login.md`, passo 3; coerente com a D5 da Etapa 2. A participação separada do voto preserva o sigilo (C2). |
| D3 | **Login sem senha, por código (rev. 4, A5/C7).** Entrar: e-mail → "Enviar código" → tela de código. `entrar` **não cria sessão**: guarda `ui.loginPendente` (`{ email, de, eventoId }`) e devolve o destino da tela de código; e-mail desconhecido tem o mesmo comportamento. `confirmarCodigo` com o código mock `123456` cria a sessão do e-mail pendente. **O e-mail define a conta:** procura-se o e-mail em `banco.usuarios`, inclusive contas criadas na sessão (registro ou Google); as contas seed entram com os seus papéis (rev. 3, D7). Código errado ou conta inexistente recebem a mesma mensagem (`CREDENCIAIS_INVALIDAS`, "Código incorreto ou expirado."). Sem `ui.loginPendente` (caso de quem foi forçado pela toolbar a uma sessão não verificada), o e-mail pendente é o do usuário da sessão. | Simula o login por código da trilha de produção sem backend, sem revelar se o e-mail existe (`Login.md`, seção 7). |
| D4 | **Mensagem única ao usuário para qualquer código recusado** (usado, revogado, expirado, inexistente, de outro evento): "Código inválido ou expirado. Fale com a organização." Os `CodigoErro` `CODIGO_*` continuam existindo internamente; o motivo exato vai só em `detalhes` da auditoria `TENTATIVA_CODIGO_INVALIDA`. As mensagens por **papel** (`JA_E_JURADO`, `JA_VOTOU_COMO_PUBLICO`, `PAPEL_INVALIDO`) continuam distintas (rev. 3, C8). | Não dar pistas a quem testa códigos; a organização ainda vê o motivo na auditoria. |
| D5 | **Bloqueio simulado:** 5 códigos recusados seguidos bloqueiam o campo por 60 s, nos dois pontos de entrada (registro e convite) com **um só contador**, no relógio simulado. Cada recusa e cada bloqueio vão para a auditoria. O **código de login** tem bloqueio próprio, no mesmo padrão: 5 recusas em 60 s → `LIMITE_TENTATIVAS` por 60 s, contador `ui.bloqueioLoginCodigo` (rev. 4, A5). | Representa o rate limiting de `Jurado.md` (seção 4) e alimenta o resumo de auditoria da Etapa 7. |
| D6 | **O destino pós-acesso vem de uma função pura** (`resolverDestinoAcesso`), que respeita `?de=` e reaproveita a ação de `resolverVisaoEvento`. | Um só lugar para a regra; a Etapa 2 e as Etapas 4 e 5 não repetem. |
| D7 | **Acesso em qualquer estado do evento pelo menu:** "Entrar" no `MenuUsuario` abre um `Dialogo` com o painel de acesso. O painel inline só aparece quando a Etapa 2 manda `ENTRAR_OU_CRIAR`. A aba "Criar conta" fica desabilitada, com explicação, quando o evento não está `ATIVO`. | Admin precisa entrar mesmo com o evento concluído ou em rascunho; cadastro novo nesses estados não faz sentido. |
| D8 | **Google fake:** modal com três contas (Ana Souza e Gabi Torres, existentes, e Marina Lopes, que cria uma conta nova), todas com e-mail verificado. No seletor **Jurado** o botão fica desabilitado, com a dica de resgatar o código depois em "Tenho um código de convite". Respeita `metodoIdentificacao`: `SOMENTE_GOOGLE` esconde o formulário de e-mail e `SOMENTE_EMAIL` esconde o botão Google. O método é definido **por seed** (sem tela na Etapa 6); os cenários `SOMENTE_GOOGLE` e `SOMENTE_EMAIL` continuam (rev. 3, C6). | O código de convite não viaja pelo Google. A Etapa 0 já traz o campo no schema. |
| D9 | **O seletor Público / Jurado só existe se `moduloJuri` estiver ligado.** | Evento sem júri não oferece o caminho. |
| D10 | **Resgate de convite** (seção 5.4): promove a participação existente, bloqueia quem já votou como público e indisponibiliza a tela com módulo júri desligado, urna encerrada ou evento concluído. | `Jurado.md`, seções 6 e 9. |
| D11 | **Código simulado (rev. 4, A5):** a tela de código aceita só `123456`, informado na própria tela em modo protótipo ("Protótipo: use 123456") e no README; confirmar o código cria a sessão e preenche `emailVerificadoEm`. "Reenviar código" com cooldown de 30 s no relógio simulado. | Substitui o e-mail com o código sem enviar nada. |
| D12 | **Sem recuperação de senha** (rev. 4, C7): não existe senha, logo não há `solicitarRecuperacao`, `redefinirSenha`, rota `/e/[slug]/recuperar-senha` nem as 4 telas. | Login por Google ou código por e-mail, sem senha (A5). |
| D13 | **O código legível nunca fica no estado.** O resgate compara `hashMock(normalizarCodigo(codigo))` com os convites do **mesmo evento**. | D12 da Etapa 0. |

---

## 5. Modelo e regras

### 5.1 Serviços

Todos seguem as regras de serviço da Etapa 0 (latência global, falha simulável, validação antes de mutar, estado relido depois de cada `await`).

| Serviço | Entrada | Efeitos | Erros possíveis |
|---|---|---|---|
| `entrar` | `eventoId`, `email`, `de?` | **Não cria sessão.** Guarda `ui.loginPendente = { email, de, eventoId }` e devolve `{ destino }` = `/e/{slug}/verificar-email?de=…`. E-mail desconhecido: mesmo comportamento (não revela se existe) (D3) | `VALIDACAO` |
| `entrarComGoogle` | `eventoId`, `contaId`, `de?` | Entra (ou cria o usuário, para Marina) com e-mail já verificado; cria participação se faltar. Devolve `{ destino }` | `ERRO_INTERNO`, `REDE` |
| `registrar` | `eventoId`, `nome`, `email`, `papel`, `codigo?` | Cria `Usuario` (e-mail **não verificado**) e `Participacao` (D2); com `JURADO`, marca o convite como `USADO` na mesma operação; guarda `ui.loginPendente` (não cria sessão). Devolve `{ destino }` = tela de código | `VALIDACAO`, `EVENTO_INDISPONIVEL`, `EVENTO_CONCLUIDO`, `CADASTRO_NAO_CONCLUIDO`, `URNA_ENCERRADA` (só Jurado), `LIMITE_TENTATIVAS`, `CODIGO_*` |
| `confirmarCodigo` (substitui `verificarEmail`) | `eventoId`, `codigo`, `de?` | Código `123456`: cria a sessão do e-mail pendente (D3), `emailVerificadoEm = agora`, cria participação se faltar (D2), limpa `ui.loginPendente` e zera `ui.bloqueioLoginCodigo`. Devolve `{ destino }` | `VALIDACAO`, `CREDENCIAIS_INVALIDAS` (código errado ou conta inexistente), `LIMITE_TENTATIVAS`, `NAO_AUTORIZADO` (sem e-mail pendente nem sessão) |
| `reenviarCodigo` (substitui `reenviarVerificacao`) | `eventoId` | Define o cooldown de 30 s em `ui` | `NAO_AUTORIZADO` (sem e-mail pendente nem sessão), `CONFLITO` (dentro do cooldown) |
| `resgatarConvite` | `eventoId`, `codigo` | Promove a participação para `JURADO` (ou a cria); convite `USADO`, `participacaoId`, `resgatadoEm`. Devolve `{ papel, destino }` | `NAO_AUTORIZADO`, `EVENTO_CONCLUIDO`, `URNA_ENCERRADA`, `PAPEL_INVALIDO`, `JA_E_JURADO`, `JA_VOTOU_COMO_PUBLICO`, `LIMITE_TENTATIVAS`, `CODIGO_*` |
| `garantirParticipacao` | `eventoId` | Com sessão e sem participação no evento, cria `PUBLICO` (vale com e-mail não verificado); com participação, não muda nada. Devolve `{ papel }` (C2) | `NAO_AUTORIZADO`, `NAO_ENCONTRADO` |

`sair` é o serviço da Etapa 0. `solicitarRecuperacao` e `redefinirSenha` não existem (rev. 4, C7).

**Auditoria.** `resgatarConvite` e o registro de jurado registram `CONVITE_RESGATADO` (ator: o usuário; detalhes: rótulo do convite, nunca o código). Cada recusa de código registra `TENTATIVA_CODIGO_INVALIDA`, com o motivo exato (o `CodigoErro` `CODIGO_*`) em `detalhes` (D4), e o bloqueio registra `BLOQUEIO_RATE_LIMIT`, ambos com `ipHash = hashMock("ip-demo")`. O bloqueio do código de login (D5) também registra `BLOQUEIO_RATE_LIMIT`.

### 5.2 Ordem das validações

**Registro** (`registrar`): campos → evento disponível (`ATIVO`, senão `EVENTO_INDISPONIVEL` ou `EVENTO_CONCLUIDO`) → urna (`URNA_ENCERRADA`, só no caminho Jurado; rev. 3, D6) → e-mail já cadastrado (`CADASTRO_NAO_CONCLUIDO`, **sem consumir tentativa**) → bloqueio (`LIMITE_TENTATIVAS`, só no caminho Jurado) → código (só Jurado) → cria tudo e guarda `ui.loginPendente`. Código recusado não cria nada. Não há campo de senha (rev. 4, A5).

**Código de login** (`confirmarCodigo`): e-mail pendente (`ui.loginPendente` ou, sem ele, o usuário da sessão; senão `NAO_AUTORIZADO`) → bloqueio (`LIMITE_TENTATIVAS`, contador `ui.bloqueioLoginCodigo`) → formato (6 dígitos, senão `VALIDACAO`, sem consumir tentativa) → código `123456` **e** conta existente (senão `CREDENCIAIS_INVALIDAS`, conta uma recusa; 5 recusas em 60 s ligam o bloqueio de 60 s) → cria a sessão, `emailVerificadoEm = agora`, participação se faltar.

**Resgate** (`resgatarConvite`): sessão com e-mail verificado → evento (`EVENTO_CONCLUIDO`) → urna (`URNA_ENCERRADA`) → módulo júri desligado (`CODIGO_INVALIDO`) → papel (`ADMIN` → `PAPEL_INVALIDO`; `JURADO` → `JA_E_JURADO`; `PUBLICO` com `votou` → `JA_VOTOU_COMO_PUBLICO`) → bloqueio → código. O papel é checado **antes** do código para que o bloqueio de quem já votou não consuma tentativas.

**Código** (comum): `hashMock(normalizarCodigo(codigo))` procurado nos convites **do evento**:

| Resultado | Código de erro |
|---|---|
| Não encontrado (inclui código de outro evento) | `CODIGO_INVALIDO` |
| `estado = USADO` | `CODIGO_USADO` |
| `estado = REVOGADO` | `CODIGO_REVOGADO` |
| `DISPONIVEL` com `validadeAte` anterior ao relógio simulado | `CODIGO_EXPIRADO` |
| `DISPONIVEL` e dentro da validade | sucesso |

Os quatro códigos de recusa ficam internos (auditoria e log); a tela mostra a mesma mensagem para todos (D4). As quatro recusas incrementam o contador (D5). O quinto erro seguido liga o bloqueio de 60 s; enquanto durar, o serviço devolve `LIMITE_TENTATIVAS` sem consultar o código. Um sucesso zera o contador. Formato incompleto é barrado no cliente e **não** chama o serviço.

### 5.3 Destino pós-acesso

`resolverDestinoAcesso` (`src/dominio/destinoAcesso.ts`, pura) recebe o slug, o `?de=`, o e-mail verificado, o papel e a ação de `resolverVisaoEvento` calculada com o estado já atualizado. Avalia nesta ordem:

| # | Condição | Destino |
|---|---|---|
| 1 | E-mail não verificado | `/e/{slug}/verificar-email` (mantendo `?de=`) |
| 2 | `?de=` presente e interno (começa com `/`, não com `//`) | O próprio `de` |
| 3 | Papel `ADMIN` | `/e/{slug}/admin` |
| 4 | Ação `VOTAR`, `VOTAR_JURADO`, `ALTERAR_VOTO_JURADO` ou `VER_CONFIRMACAO` | `/e/{slug}/votar` |
| 5 | Qualquer outra | `/e/{slug}` |

Login por e-mail e registro sempre passam pela tela de código antes (`entrar` e `registrar` já devolvem o destino da tela de código); `resolverDestinoAcesso` é aplicado na saída de `confirmarCodigo`, `entrarComGoogle` e `resgatarConvite`. A linha 1 cobre a sessão não verificada forçada pela toolbar.

**Davi (`naoverificado@demo.com`)** representa "cadastro iniciado, código nunca confirmado" (rev. 4, A5): pelo formulário, ao entrar, vai à tela de código e, ao confirmar `123456`, fica verificado. Pela toolbar ("Entrar como"), o estado impossível (sessão sem e-mail verificado) continua forçável, e a guarda `EMAIL_VERIFICADO` o leva à tela de código. A ação `VERIFICAR_EMAIL` da Etapa 2 continua e leva à tela de código.

### 5.4 Resgate de convite: quem pode

| Situação do usuário | Resultado |
|---|---|
| Público que ainda não votou, ou verificado sem participação | Vira `JURADO`; tela de sucesso com CTA conforme a urna |
| Público que já votou (Eva) | Bloqueio explicativo, **sem formulário** |
| Já é jurado (Bruno, Fábio) | Aviso "Você já é jurado neste evento." |
| Admin (Carla) | Aviso "Contas administrativas não resgatam convite." |
| Evento com módulo júri desligado, urna encerrada ou evento concluído | Tela informativa, **sem formulário** |

### 5.5 Telas e rotas

| Rota | Tela | Quem acessa |
|---|---|---|
| `/e/[slug]` | Painel de acesso inline (abas Entrar / Criar conta), quando a ação é `ENTRAR_OU_CRIAR` | Deslogado |
| Qualquer rota do evento | Diálogo de acesso aberto pelo "Entrar" do menu | Deslogado |
| `/e/[slug]/verificar-email` | Tela de código ("Digite o código enviado para {email}"), no login e no registro; mantém `?de=` (rev. 4, A5) | Quem tem `ui.loginPendente` deste evento ou está logado sem e-mail verificado; sem nenhum dos dois, volta à entrada `/e/[slug]`; quem já está logado e verificado é redirecionado para o `?de=` (se interno) ou para a entrada `/e/[slug]` (rev. 3, D2) |
| `/e/[slug]/convite` | Tenho um código de convite | Logado com e-mail verificado (guarda da Etapa 0) |
| `/e/[slug]/votar`, `/e/[slug]/admin` | Stubs da Etapa 0 | Conforme a guarda |

### 5.6 Matriz de erros

| `CodigoErro` | Onde aparece | Mensagem |
|---|---|---|
| `CREDENCIAIS_INVALIDAS` | Tela de código (código de login incorreto ou conta inexistente; rev. 4, A5) | "Código incorreto ou expirado." |
| `EMAIL_NAO_VERIFICADO` | Guarda | Sem mensagem: o destino leva à tela de código |
| `VALIDACAO` | Registro, login, tela de código | Erro por campo |
| `CADASTRO_NAO_CONCLUIDO` | Registro | "Não foi possível criar a conta com estes dados. Se você já tem conta, entre." |
| `CODIGO_INVALIDO`, `CODIGO_USADO`, `CODIGO_REVOGADO`, `CODIGO_EXPIRADO` | Registro, convite | "Código inválido ou expirado. Fale com a organização." (mensagem única; o motivo exato vai só em `detalhes` da auditoria `TENTATIVA_CODIGO_INVALIDA`, D4) |
| `LIMITE_TENTATIVAS` | Registro, convite, tela de código | "Muitas tentativas. Tente novamente em {n}s." |
| `JA_VOTOU_COMO_PUBLICO` | Convite | "Você já votou como público neste evento e não pode se tornar jurado." |
| `JA_E_JURADO` | Convite | "Você já é jurado neste evento." |
| `PAPEL_INVALIDO` | Convite | "Contas administrativas não resgatam convite." |
| `EVENTO_CONCLUIDO` | Registro, convite | "Este evento foi concluído e não aceita novos cadastros nem convites." |
| `EVENTO_INDISPONIVEL` | Registro | "Este evento ainda não está disponível." |
| `URNA_ENCERRADA` | Registro (caminho Jurado), convite | "A votação deste evento foi encerrada." |
| `CONFLITO` | Reenvio do código | "Aguarde alguns segundos para reenviar." |
| `REDE` | Todos | "Não foi possível conectar. Tente novamente." |
| `ERRO_INTERNO` | Todos | "Algo deu errado. Tente novamente." |

Os textos entram em `servicos/mensagens.ts` (Etapa 0). Erro de serviço vai num `Alerta` no topo do formulário; erro de campo, junto ao campo. Nenhum `CodigoErro` novo nem removido nesta revisão (total continua 26).

### 5.7 Textos de apoio

| Onde | Texto |
|---|---|
| Aceite do registro | "Li e concordo que meu nome e e-mail sejam usados só para identificar minha participação neste evento. Meu voto é sigiloso: ele não fica ligado aos meus dados." (com link do **aviso de privacidade da plataforma VaiVota**, sempre; e, quando houver `avisoPrivacidadeUrl`, também o aviso próprio do evento, complementar; rev. 4, E29) |
| Ajuda do código | "Código recebido da organização" |
| Tela de código | "Digite o código enviado para {email}." |
| Recurso de protótipo | "Protótipo: use 123456" |
| Aba desabilitada | Explicação conforme o estado do evento (matriz 5.6) |
| Dica do Google no seletor Jurado | "Para entrar como jurado, crie a conta com seu e-mail, ou entre com Google e resgate o código depois em 'Tenho um código de convite'." |

Os textos são provisórios e dependem de aprovação da organização (pendência P6).

### 5.8 Estado de UI acrescentado

Esta etapa estende `EstadoUi` (transitório, some no F5):

```ts
bloqueioCodigo: { falhas: number; ateMs: number | null }        // código de convite
bloqueioLoginCodigo: { falhas: number; ateMs: number | null }   // código de login (rev. 4, A5)
loginPendente: { email: string; de?: string; eventoId: string } | null   // rev. 4, A5
reenvioVerificacaoAteMs: number | null                          // cooldown de reenviarCodigo
```

---

## 6. Estrutura de arquivos

| Arquivo | Ação |
|---|---|
| `src/servicos/auth.ts` | Novo |
| `src/servicos/mensagens.ts` | Acrescenta os textos da seção 5.6 |
| `src/dominio/destinoAcesso.ts` | Novo (`resolverDestinoAcesso`) |
| `src/lib/validarAcesso.ts` | Novo (formato de e-mail, regras de nome, formato do código de login de 6 dígitos; sem regras de senha, rev. 4, C7) |
| `src/dominio/tipos.ts` | Estende `EstadoUi` |
| `src/mocks/cenarios.ts` | Registra `SOMENTE_GOOGLE` e `SOMENTE_EMAIL` |
| `src/components/auth/CartaoAcesso.tsx` | Novo (abas Entrar / Criar conta; recebe quais abas estão disponíveis) |
| `src/components/auth/FormularioLogin.tsx` | Novo |
| `src/components/auth/FormularioRegistro.tsx` | Novo |
| `src/components/auth/SeletorPapel.tsx` | Novo (`role="radiogroup"`: Público / Jurado) |
| `src/components/auth/CampoCodigoConvite.tsx` | Novo (máscara, maiúsculas, bloqueio com contagem) |
| `src/components/auth/BotaoGoogle.tsx` | Novo (abre o seletor de conta fake em `Dialogo`) |
| `src/components/auth/AvisoVerificacaoEmail.tsx` | Novo (tela de código: campo de 6 dígitos, dica "Protótipo: use 123456", "Reenviar código", "Usar outro e-mail"; bloqueio com `ContagemRegressiva`) |
| `src/components/auth/FormularioConvite.tsx` | Novo (tela `/convite`) |
| `src/components/evento/MenuUsuario.tsx` | Assume o provisório da Etapa 2 |
| `src/components/evento/AcessoEvento.tsx` | Troca o aviso provisório pelo `CartaoAcesso` (id `#acesso`); ao montar, com sessão e sem participação no evento ativo, chama `garantirParticipacao` (C2) |
| `src/dominio/destinoAcesso.test.ts`, `src/lib/validarAcesso.test.ts` | Novos: testes Vitest das funções puras (D19 da Etapa 0) |
| `src/app/e/[slug]/(participante)/verificar-email/page.tsx` | Substitui o stub |
| `src/app/e/[slug]/(participante)/convite/page.tsx` | Substitui o stub |

Não há `CampoSenha`, `FluxoRecuperacaoSenha` nem página `recuperar-senha` (rev. 4, C7). Componentes genéricos (`Campo`, `Input`, `Botao`, `Alerta`, `Abas`, `Dialogo`) já existem na Etapa 0; só se cria aqui o que é específico de acesso. `votar` e `admin` continuam como stubs.

---

## 7. Checkpoints

### CP1 — Serviços de acesso e regras puras

**Objetivo:** definir a camada de dados e as regras antes de desenhar qualquer tela.

**Tarefas**
- [ ] `servicos/auth.ts` com os sete serviços da seção 5.1 (inclui `confirmarCodigo`, `reenviarCodigo` e `garantirParticipacao`; nenhum serviço de senha), seguindo as ordens da seção 5.2.
- [ ] `dominio/destinoAcesso.ts` (seção 5.3) e `lib/validarAcesso.ts`.
- [ ] Testes Vitest ao lado dos módulos (`destinoAcesso.test.ts` cobrindo as 5 linhas da tabela 5.3, inclusive `?de=` externo; `validarAcesso.test.ts`); `pnpm test` verde.
- [ ] Estender `EstadoUi` (seção 5.8) e registrar as mensagens da seção 5.6.
- [ ] Auditoria dos resgates, recusas e bloqueios (seção 5.1).
- [ ] Registrar os cenários `SOMENTE_GOOGLE` e `SOMENTE_EMAIL` (alteram só `metodoIdentificacao` do evento ativo).
- [ ] Nenhuma tela criada ou alterada.

**Fica fake:** tudo; os serviços só alteram o store.

**Pronto quando:** chamar cada serviço por um componente temporário (ou pelo console) produz o efeito esperado no estado e no `InspetorEstado`; cada código de erro da seção 5.6 é alcançável; `verificarInvariantes` fica vazia depois de cada chamada (inclusive após o resgate de `K7M3-QX9P`); `garantirParticipacao` cria `PUBLICO` para Ana no Festival e não muda nada na segunda chamada; `entrar` só preenche `ui.loginPendente` (sem sessão, inclusive com e-mail desconhecido) e `confirmarCodigo` com `123456` cria a sessão, enquanto outro código devolve `CREDENCIAIS_INVALIDAS` e a quinta recusa em 60 s devolve `LIMITE_TENTATIVAS`; F5 volta ao seed.

**Entrega:** `VaiVota-E3-CP1.zip`

### CP2 — Painel de acesso e login

**Objetivo:** tela de entrada com abas e o fluxo de login completo (e-mail → código, ou Google).

**Tarefas**
- [ ] `CartaoAcesso` com `Abas` (setas alternam, `role="tablist"`), usado inline pelo `AcessoEvento` e dentro de um `Dialogo` aberto pelo "Entrar" do `MenuUsuario` (D7). A aba "Criar conta" fica desabilitada com a explicação do estado.
- [ ] `FormularioLogin`: e-mail, botão "Enviar código", separador "ou" e `BotaoGoogle` (sem senha, rev. 4). Validação no cliente (formato do e-mail), erro por campo ao sair do campo e ao enviar; botão com `aria-busy` durante o envio; erro de serviço em `Alerta`.
- [ ] `BotaoGoogle` com o seletor de três contas (D8), respeitando `metodoIdentificacao`.
- [ ] `/verificar-email` com `AvisoVerificacaoEmail` (tela de código, seção 5.5): "Digite o código enviado para {email}.", campo de 6 dígitos, dica "Protótipo: use 123456", "Reenviar código" com cooldown de 30 s anunciado em `aria-live`, "Usar outro e-mail" (limpa `ui.loginPendente`, sai se houver sessão e volta ao painel de acesso) e bloqueio do código de login com `ContagemRegressiva` (D5). Quem já está logado e verificado é redirecionado para o `?de=` (se interno) ou para a entrada.
- [ ] Ao concluir (`entrar`, `confirmarCodigo`, Google), `router.push(destino)`.
- [ ] Só tokens de tema: alternar Maratona Tech Tivit e Festival troca cores, logo e nome.

**Fica fake:** envio do código (fixo `123456`) e Google.

**Pronto quando:** `publico@demo.com` → "Enviar código" → tela de código → `123456` entra, e o menu e a entrada mudam para a variante logada; código errado mostra "Código incorreto ou expirado." e cinco recusas em 60 s bloqueiam o campo por 60 s; e-mail desconhecido também vai à tela de código e qualquer código recebe a mesma mensagem; `naoverificado@demo.com` (Davi) entra pelo código e fica verificado; `admin@demo.com` entra pelo código e vai ao stub do painel; abrir `/verificar-email` sem e-mail pendente e sem sessão volta à entrada; com `SOMENTE_GOOGLE` o formulário de e-mail some, e com `SOMENTE_EMAIL` o botão Google some; o "Entrar" do menu funciona com o evento concluído; navegação completa por teclado, foco visível e layout correto em 360 px.

**Entrega:** `VaiVota-E3-CP2.zip`

### CP3 — Registro como público e confirmação do código

**Objetivo:** cadastro do público, sem senha, seguido da tela de código.

**Tarefas**
- [ ] `FormularioRegistro` com `SeletorPapel` (padrão **Público**; o seletor só aparece com `moduloJuri` ligado, D9), nome, e-mail e checkbox do aviso de privacidade com link do aviso da plataforma VaiVota (seção 5.7; rev. 4, E29). Sem campo de senha.
- [ ] Validações no cliente: nome obrigatório, e-mail válido, aceite marcado.
- [ ] E-mail já cadastrado: `CADASTRO_NAO_CONCLUIDO` (mensagem genérica com sugestão de entrar).
- [ ] Depois de registrar, segue para a tela de código (CP2); confirmar `123456` verifica o e-mail e cria a sessão.
- [ ] Depois de confirmar: tela de sucesso curta e CTA conforme `destino`.

**Fica fake:** envio e recebimento do e-mail com o código.

**Pronto quando:** um usuário novo percorre registro, tela de código e acesso logado; registrar, sair e entrar de novo com o mesmo e-mail (por código) funciona (D3); quem já está logado e verificado e abre `/verificar-email` é redirecionado; um usuário não verificado forçado pela toolbar (Davi) que tenta abrir `/votar` ou `/convite` vai para a tela de código; o cooldown do reenvio funciona (e acompanha o botão do relógio da toolbar); a participação `PUBLICO` aparece no inspetor depois do registro.

**Entrega:** `VaiVota-E3-CP3.zip`

### CP4 — Registro como jurado (seletor e código)

**Objetivo:** o segundo caminho do registro, com validação do código.

**Tarefas**
- [ ] `SeletorPapel` em **Jurado** revela o `CampoCodigoConvite` (demais campos iguais); trocar o seletor preserva nome e e-mail.
- [ ] `CampoCodigoConvite`: máscara `XXXX-XXXX`, maiúsculas automáticas, aceita colar com ou sem hífen, descarta caracteres ambíguos, ajuda "Código recebido da organização". Com bloqueio ativo, o campo fica desabilitado com `ContagemRegressiva` até `ateMs`.
- [ ] Validação do código ao enviar, conforme a seção 5.2. Sucesso cria a conta com papel `JURADO`, marca o convite como `USADO` e segue para a tela de código e, depois, para o destino.
- [ ] Botão Google desabilitado no modo Jurado, com a dica da seção 5.7.

**Fica fake:** hash, auditoria e rate limiting reais.

**Pronto quando:** `K7M3-QX9P` cria um jurado na Maratona Tech Tivit; repetir o código, `H4TR-9WNB` (usado), `P8CD-2VXF` (revogado), `M6ZQ-4KTA` (expirado), um código aleatório e um código do Festival usado na Maratona Tech Tivit mostram todos "Código inválido ou expirado. Fale com a organização.", e a auditoria do inspetor traz o motivo exato em `detalhes` (D4); com a urna encerrada, o registro como Jurado recusa com `URNA_ENCERRADA` sem consumir tentativa; cinco recusas seguidas bloqueiam o campo por 60 s e ele volta sozinho (inclusive ao avançar o relógio pela toolbar); o seletor alterna sem perder dados e é operável por teclado; recusas e bloqueio aparecem na auditoria do inspetor.

**Entrega:** `VaiVota-E3-CP4.zip`

### CP5 — Resgate de convite para quem já tem conta

**Objetivo:** a rota `/e/[slug]/convite`.

**Tarefas**
- [ ] `FormularioConvite` com `CampoCodigoConvite` e botão "Resgatar convite", reutilizando o bloqueio do CP4 (um só contador, D5).
- [ ] Regras da seção 5.4: promoção, bloqueio de quem já votou (sem formulário), aviso de quem já é jurado, aviso para admin e tela informativa com módulo desligado, urna encerrada ou evento concluído.
- [ ] Tela de sucesso com o novo papel e CTA conforme o `destino`.
- [ ] A guarda de e-mail verificado vem do `RotaGuard` da Etapa 0 (nada de redirecionamento próprio).

**Fica fake:** a promoção só altera o store.

**Pronto quando:** Ana com `K7M3-QX9P` vira jurado e o menu passa a mostrar "Jurado"; Eva é bloqueada com texto claro e sem formulário; Bruno recebe o aviso de que já é jurado; Carla recebe o aviso de conta administrativa; na Maratona Tech Tivit com módulo júri desligado a tela é informativa; deslogado e não verificado são redirecionados pela guarda; o invariante de convites segue verde.

**Entrega:** `VaiVota-E3-CP5.zip`

### CP6 — Menu do usuário e roteamento pós-acesso

**Objetivo:** costurar as telas ao restante do protótipo.

**Tarefas**
- [ ] `MenuUsuario` completo: nome, papel, "Tenho um código de convite" (somente quando `mostrarCodigoConvite` da Etapa 2), "Sair" (volta à entrada, deslogado) e, deslogado, "Entrar" (diálogo do CP2).
- [ ] `resolverDestinoAcesso` aplicado na confirmação do código (login e registro), no Google e no resgate, incluindo o retorno por `?de=` (que atravessa a tela de código).
- [ ] Conferir que a entrada da Etapa 2 reage à sessão sem nova regra aqui.
- [ ] Slot de acesso (`AcessoEvento`) no `EventoShell`: ao montar, com sessão e sem participação no evento ativo, chama `garantirParticipacao` (C2).

**Fica fake:** nada além do já descrito.

**Pronto quando:** a tabela 5.3 se cumpre para cada seed (Ana vai a `/votar` com a urna aberta; Carla, ao painel; Davi forçado pela toolbar, à tela de código; Ana na urna não iniciada fica na entrada); deslogado abrindo `/votar` volta ao login e, depois de entrar pelo código, retorna a `/votar`; alternar a urna na toolbar com um usuário logado muda a entrada sem recarregar; sair e entrar com outro papel funciona sem recarregar; Ana logada na Maratona Tech Tivit, ao trocar para o Festival pela toolbar, ganha participação `PUBLICO` ali (`garantirParticipacao`, visível no inspetor); jurado não acessa `/admin`.

**Entrega:** `VaiVota-E3-CP6.zip`

### CP7 — Revisão e fechamento

**Objetivo:** fechar a etapa com evidência.

**Tarefas**
- [ ] Percorrer todos os fluxos nos dois temas e conferir contraste do texto e dos estados de erro (≥ 4,5:1).
- [ ] Acessibilidade: ordem de foco, foco visível, `aria-invalid` e `aria-describedby` nos erros, mensagens em `role="alert"` ou `aria-live`, nome acessível nos botões, alvos de 44 px, foco devolvido ao botão "Entrar" ao fechar o diálogo.
- [ ] Responsividade: 360, 768 e 1280 px; o teclado virtual não cobre o botão principal do registro.
- [ ] Revisar os textos em português (tom, sem jargão, sem detalhes internos) e listar os que dependem de aprovação.
- [ ] `grep`: nenhum componente de `auth/` importa de `@/mocks` ou lê `banco` direto; só serviços e seletores.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` sem erros; sem warnings de hidratação.
- [ ] Contas, códigos seed e o código de login do protótipo (`123456`) conferidos no README da Fase 1.

| Fluxo \ Tema | Maratona Tech Tivit | Festival |
|---|---|---|
| Login por código (público, jurado, admin, não verificado) | ☐ | ☐ |
| Código de login errado e bloqueio da tela de código | ☐ | ☐ |
| Login com Google (existente e nova conta) | ☐ | ☐ |
| Registro público + tela de código | ☐ | ☐ |
| Registro jurado (cada código da seção 7, CP4: mensagem única na tela, motivo na auditoria) | ☐ | ☐ |
| Registro jurado com urna encerrada (`URNA_ENCERRADA`) | ☐ | ☐ |
| Registrar, sair e entrar de novo com a conta criada na sessão | ☐ | ☐ |
| Já logado, chega a outro evento (`garantirParticipacao` cria `PUBLICO`) | ☐ | ☐ |
| `/verificar-email` com e-mail já verificado (redireciona) | ☐ | ☐ |
| Bloqueio por tentativas de código de convite | ☐ | ☐ |
| Resgate em `/convite` (cada papel da seção 5.4) | ☐ | ☐ |
| Evento concluído, em rascunho e `SOMENTE_GOOGLE` / `SOMENTE_EMAIL` | ☐ | ☐ |

**Pronto quando:** a matriz está inteira marcada e a seção 9 atendida.

**Entrega:** `VaiVota-E3-CP7.zip` (final da Etapa 3)

---

## 8. O que fica fake

| Item | Tratamento |
|---|---|
| Código de login | Fixo `123456`, informado na tela ("Protótipo: use 123456") e no README; não existe senha (rev. 4, A5/C7) |
| Google | Seletor de três contas fake |
| E-mail com o código | Não é enviado (na trilha de produção: Better Auth + Resend, rev. 4, A5) |
| Hash dos códigos | `hashMock` |
| Rate limiting | Contador simulado no relógio simulado |
| Sessão | No store; some no F5 |
| `ipHash` da auditoria | Constante do mock |

## 9. Critérios de aceitação

- [ ] Login por código (`123456`) com cada conta seed leva ao destino previsto na seção 5.3; `entrar` não cria sessão antes da confirmação do código.
- [ ] Registro de público: formulário (sem senha, com link do aviso de privacidade da plataforma VaiVota), tela de código e acesso logado.
- [ ] Registro de jurado: código válido cria jurado; todo código recusado mostra a mensagem única e o motivo exato fica só na auditoria (D4).
- [ ] Usuário logado que chega a um evento sem participação ganha `PUBLICO` por `garantirParticipacao`; nenhuma participação nasce no voto.
- [ ] Resgate em `/convite` promove o público, bloqueia quem já votou, avisa quem já é jurado e o admin.
- [ ] Usuário não verificado não acessa `/votar` nem `/convite`.
- [ ] Código de um evento não funciona em outro.
- [ ] Cinco recusas seguidas bloqueiam o campo por 60 s, e o bloqueio é um só para registro e convite.
- [ ] Não existe campo de senha nem recuperação de senha (rev. 4, C7); código de login errado mostra "Código incorreto ou expirado." e 5 recusas em 60 s bloqueiam a tela de código por 60 s.
- [ ] Sair limpa a sessão no store; entrar com outra conta funciona sem recarregar.
- [ ] Acesso e "Entrar" disponíveis com o evento em qualquer estado; "Criar conta" só com o evento `ATIVO`.
- [ ] Tema do evento (nome, logo, cores) em todas as telas, nos dois temas; utilizável em celular, com teclado e foco visível.
- [ ] `verificarInvariantes` vazia depois de cada fluxo.
- [ ] Telas só chamam serviços e seletores; nenhuma persistência (F5 volta ao seed).

## 10. Pendências

- **P1 — Mensagens de código:** **Resolvida (rev. 3, C8):** mensagem única "Código inválido ou expirado. Fale com a organização." para qualquer código recusado; o motivo exato vai só na auditoria (D4).
- **P2 — Registro com evento concluído:** bloquear (assumido) ou permitir criar conta sem poder votar?
- **P3 — E-mail já cadastrado no registro:** mensagem genérica (assumido) ou orientar a entrar?
- **P4 — Política de identificação por evento:** **Resolvida (rev. 3, C6):** o método de identificação fica por seed (sem tela na Etapa 6); os cenários `SOMENTE_GOOGLE` e `SOMENTE_EMAIL` continuam.
- **P5 — Recuperação de senha:** **Resolvida (rev. 4, C7/A5):** não existe senha; o login é por Google ou código por e-mail (Better Auth na trilha de produção). Recuperação de senha removida: sem `solicitarRecuperacao`, `redefinirSenha`, rota `recuperar-senha` nem as 4 telas (D12).
- **P6 — Textos finais:** aviso de privacidade (revisão jurídica; é o aviso da plataforma VaiVota, controladora dos dados, com rascunho a partir do DD §10.4; rev. 4, E29), mensagens de erro e tela de código dependem de aprovação da organização.
- **P7 — Parâmetros do bloqueio:** **Resolvida (rev. 3, E31/C9): trilha de produção.** 5 recusas e 60 s são do protótipo (código de convite e, desde a rev. 4, código de login); o rate limiting real (PostgreSQL ou Upstash Redis, rev. 4, A5) e os parâmetros de bloqueio vão para o planner "Trilha de Produção" (A3).
- **P8 — Participação criada no login:** **Resolvida (rev. 3, E6/C2):** a participação nasce no login, no registro ou por `garantirParticipacao` ao chegar ao evento já logado; nunca junto com o voto.
