# VaiVota — Fase 1 · Etapa 3: Login e Registro

> Status: proposta de planner, pronta para revisão.
> Fase: 1 (interface mockup, sem banco, sem persistência).
> Depende de: Etapa 0 (tokens de tema, componentes base, store, dev toolbar) e Etapa 2 (entrada do evento e estados da urna).
> Fontes: `Login.md` (seções 5 a 7), `Jurado.md` (seções 4 e 6), `DocumentDesign.md` (5.4 e 7.1/7.2).
> Stack: Next.js (App Router) + React 19 + Tailwind 4.

## 1. Objetivo

Entregar todas as telas de autenticação do evento, navegáveis e com todos os estados de erro, usando apenas o store em memória. Ao final, é possível percorrer: **entrar**, **criar conta como público**, **criar conta como jurado (com código)**, **verificar e-mail**, **resgatar convite estando logado** e **sair**. Nada é gravado; o F5 volta ao estado seed.

## 2. Escopo

**Dentro:**
- Painel de acesso em `/e/[slug]` com abas Entrar / Criar conta.
- Registro com switch **Público / Jurado** e campo de código de convite.
- Tela "Verifique seu e-mail" (simulada).
- Rota `/e/[slug]/convite` ("Tenho um código de convite").
- Recuperação de senha (tela simulada).
- Cabeçalho com usuário logado e "Sair".
- Roteamento pós-login conforme papel e estado da urna.

**Fora desta etapa:**
- Lista de candidatos e voto (Etapas 4 e 5). Aqui o destino do login é um **stub** da rota `/e/[slug]/votar`.
- Geração e revogação dos códigos (Etapa 6, Configuração → Júri). Aqui os códigos vêm do seed.
- Login de admin com convite de admin e demais telas administrativas (Etapas 6 a 8). O admin do seed entra e cai em stub.
- Totem.
- Autenticação real, hash, rate limiting real, e-mail real, Google real.

## 3. Decisões e premissas

| Tema | Decisão |
|---|---|
| Sessão | Guardada no store (`sessao`), perdida no F5. Sem cookie, sem `localStorage`. |
| Senha | Qualquer senha com 8+ caracteres é aceita. Nada é comparado nem armazenado. |
| Identidade no login | O e-mail define a conta: contas seed (abaixo) entram com seus papéis; e-mail desconhecido mostra "e-mail ou senha incorretos". |
| Registro | Cria usuário em memória com e-mail **não verificado**. |
| Google | Botão presente, ao clicar abre um seletor fake de conta e entra já com e-mail verificado. |
| Verificação | Tela com botão **"Simular verificação"** (substitui o link do e-mail) e "Reenviar" com cooldown de 30 s. |
| Dev toolbar | O seletor de **papel** passa a ser atalho para trocar a sessão (público, jurado, admin, deslogado). Quando o login muda a sessão, a toolbar reflete. |
| Mensagens de erro | Genéricas e sem revelar se o e-mail existe, como em `Login.md` seção 7. |
| Bloqueio por tentativas | Simulado: 5 códigos inválidos seguidos bloqueiam o campo por 60 s (representa o rate limiting). |

### Contas seed

| E-mail | Papel | Verificado | Votou |
|---|---|---|---|
| `publico@demo.com` | público | sim | não |
| `votou@demo.com` | público | sim | sim |
| `naoverificado@demo.com` | público | **não** | não |
| `jurado@demo.com` | jurado | sim | não |
| `admin@demo.com` | admin | sim | não |

### Códigos de convite seed

Alfabeto sem 0/O/1/I, formato `XXXX-XXXX`, comparação sem diferenciar maiúsculas e ignorando o hífen.

| Código | Estado simulado | Resultado esperado |
|---|---|---|
| `JURA-7H3K` | disponível | Resgate com sucesso |
| `JURA-4M9P` | já usado | "Este código já foi utilizado" |
| `JURA-2X8D` | revogado | "Este código não é mais válido" |
| `JURA-6T5N` | expirado | "Este código expirou" |
| qualquer outro | inexistente | "Código inválido" |

> Para o público, as mensagens de revogado, expirado e inexistente podem ser unificadas em "Código inválido ou expirado". O mockup mostra as mensagens distintas para validar o texto; a decisão final entra em Pendências.

## 4. Mapa de telas e rotas

| Rota | Tela | Quem acessa |
|---|---|---|
| `/e/[slug]` | Entrada do evento + painel de acesso (aba Entrar / Criar conta) | Deslogado |
| `/e/[slug]` | Mesma entrada, com variante "Olá, {nome}" e CTA | Logado |
| `/e/[slug]/verificar-email` | Verifique seu e-mail | Logado, não verificado |
| `/e/[slug]/recuperar-senha` | Esqueci minha senha (formulário + confirmação) | Deslogado |
| `/e/[slug]/convite` | Tenho um código de convite | Logado |
| `/e/[slug]/votar` | **Stub** (placeholder até a Etapa 4) | Público, jurado |
| `/e/[slug]/admin` | **Stub** (placeholder até a Etapa 7) | Admin |

## 5. Estrutura de arquivos prevista

```
src/
  mocks/
    auth.seed.ts            # contas e códigos seed
    auth.actions.ts         # entrar, registrar, verificarEmail, resgatarConvite, sair
  components/auth/
    AuthCard.tsx            # container com abas Entrar / Criar conta
    LoginForm.tsx
    RegisterForm.tsx
    RoleSwitch.tsx          # segmented control Público / Jurado
    InviteCodeField.tsx     # máscara, maiúsculas, estado de erro e bloqueio
    GoogleButton.tsx        # abre seletor fake de conta
    PasswordField.tsx       # mostrar/ocultar
    VerifyEmailNotice.tsx
    UserMenu.tsx            # nome, papel e "Sair"
  app/e/[slug]/
    verificar-email/page.tsx
    recuperar-senha/page.tsx
    convite/page.tsx
    votar/page.tsx          # stub
    admin/page.tsx          # stub
```

Componentes genéricos (campo de formulário, botão, alerta) já devem existir na Etapa 0; só criar aqui o que for específico de autenticação.

---

## 6. Checkpoints

### Checkpoint 1 — Contrato do mock de autenticação

**Objetivo:** definir a camada de dados e as ações antes de desenhar qualquer tela.

**Tarefas:**
- Estender o store com `sessao` (usuário, participação, papel) e `convites`.
- Criar `auth.seed.ts` com as contas e códigos da seção 3.
- Criar `auth.actions.ts` com funções assíncronas simuladas (latência de 400 a 800 ms) e retorno tipado de sucesso ou erro (`{ ok: true, ... } | { ok: false, motivo }`).
  - `entrar(email, senha)`
  - `entrarComGoogle(contaEscolhida)`
  - `registrar({ nome, email, senha, papel, codigo? })`
  - `verificarEmail()`
  - `reenviarVerificacao()`
  - `resgatarConvite(codigo)`
  - `sair()`
- Ligar a dev toolbar ao seletor de papel da sessão.
- Criar os stubs `/votar` e `/admin` e um hook `useSessao()` que redireciona conforme a regra de acesso (deslogado em rota protegida volta para `/e/[slug]`).

**Estados cobertos:** todos os `motivo` de erro listados na seção 7.

**Fica fake:** tudo. As funções só alteram o store.

**Pronto quando:**
- [ ] Chamar cada ação pelo console/teste simples altera o store como esperado.
- [ ] Trocar o papel na toolbar muda a sessão e a rota protegida reage.
- [ ] F5 volta ao estado deslogado.

---

### Checkpoint 2 — Painel de acesso e Login

**Objetivo:** tela de entrada com abas e o fluxo de login completo.

**Tarefas:**
- `AuthCard` com abas **Entrar** / **Criar conta** (teclado: setas alternam as abas; `role="tablist"`).
- `LoginForm`: e-mail, senha (`PasswordField`), link "Esqueci minha senha", botão **Entrar**, separador "ou", `GoogleButton`.
- Validação no cliente: e-mail com formato válido, senha preenchida. Erros exibidos por campo, ao sair do campo e ao enviar.
- Estado de carregamento no botão (desabilitado, spinner, `aria-busy`).
- Erro geral em `Alert` no topo do formulário.
- `GoogleButton` abre um modal com 2 ou 3 contas fake para escolher.
- Tema: o painel usa somente tokens (alternar Semana Tech / Festival na toolbar deve trocar cores, logo e nome).

**Estados cobertos:** vazio, erro de formato, enviando, credenciais incorretas, sucesso, conta não verificada (segue para o Checkpoint 3), Google com sucesso.

**Fica fake:** credenciais, Google, bloqueio por tentativas.

**Pronto quando:**
- [ ] `publico@demo.com` + qualquer senha com 8+ caracteres entra e a UI muda para a variante logada.
- [ ] E-mail desconhecido mostra mensagem genérica.
- [ ] `naoverificado@demo.com` entra e é levado à verificação.
- [ ] Navegação completa por teclado, foco visível, labels associados.
- [ ] Layout correto em 360 px e em desktop.

---

### Checkpoint 3 — Registro como Público e verificação de e-mail

**Objetivo:** cadastro do público e a espera pela verificação.

**Tarefas:**
- `RegisterForm` com `RoleSwitch` (padrão **Público**), nome, e-mail, senha e checkbox de ciência do **aviso de privacidade** (texto curto com a finalidade da coleta, conforme `DocumentDesign.md` seção de privacidade).
- Indicador simples de força da senha (apenas visual, sem bloquear acima do mínimo de 8 caracteres).
- Validações: nome obrigatório, e-mail válido, senha 8+, aceite marcado.
- E-mail já cadastrado: mensagem genérica de sucesso seguida de verificação, ou erro? **Proposta:** no mockup mostrar "Não foi possível criar a conta com estes dados" para não revelar existência, com sugestão de entrar.
- Página `/verificar-email` com `VerifyEmailNotice`:
  - texto "Enviamos um link para {email}";
  - botão **Simular verificação** (rotulado como recurso de protótipo);
  - **Reenviar** com cooldown de 30 s e confirmação visual;
  - link "Usar outro e-mail" (sai e volta ao registro).
- Após verificar: tela de sucesso curta e CTA conforme o estado da urna (Checkpoint 6).

**Estados cobertos:** campos inválidos, e-mail repetido, registro com sucesso, aguardando verificação, reenvio em cooldown, verificado.

**Fica fake:** envio e recebimento do e-mail.

**Pronto quando:**
- [ ] Um usuário novo percorre registro → verificação → logado.
- [ ] Usuário não verificado não alcança `/votar` (volta para a verificação).
- [ ] Cooldown do reenvio funciona e é anunciado a leitores de tela (`aria-live`).

---

### Checkpoint 4 — Registro como Jurado (switch + código)

**Objetivo:** o segundo caminho do registro, com validação do código de convite.

**Tarefas:**
- `RoleSwitch` em **Jurado** revela `InviteCodeField` (mesmos demais campos).
- `InviteCodeField`: máscara `XXXX-XXXX`, maiúsculas automáticas, aceita colar com ou sem hífen, texto de ajuda ("Código recebido da organização"), sem caracteres ambíguos aceitos na digitação.
- Troca do switch preserva nome, e-mail e senha já digitados.
- Validação do código ao enviar, conforme tabela da seção 3 (disponível, usado, revogado, expirado, inexistente).
- Bloqueio simulado após 5 tentativas inválidas seguidas (campo desabilitado com contagem regressiva de 60 s).
- Sucesso: conta criada com papel `jurado`, segue para a verificação de e-mail e, depois, para a tela de voto do jurado (stub).
- Marcar o código seed como **usado** no store após o resgate, para que uma segunda tentativa na mesma sessão falhe.

**Estados cobertos:** código vazio, formato incompleto, cada resultado da validação, bloqueio, sucesso.

**Fica fake:** hash, auditoria e rate limiting reais.

**Pronto quando:**
- [ ] `JURA-7H3K` cria um jurado; repetir o código no mesmo carregamento falha com "já foi utilizado".
- [ ] Cada código seed mostra a mensagem correta.
- [ ] O switch alterna sem perder dados e é operável por teclado (`role="radiogroup"`).
- [ ] Após 5 falhas o campo bloqueia e volta sozinho.

---

### Checkpoint 5 — Resgate de convite para quem já tem conta

**Objetivo:** a rota `/e/[slug]/convite`.

**Tarefas:**
- Página protegida (exige sessão com e-mail verificado).
- Formulário com `InviteCodeField` e botão **Resgatar convite**.
- Regras simuladas:
  - usuário **público que ainda não votou**: promove a participação para `jurado`;
  - usuário **que já votou como público** (`votou@demo.com`): **bloqueio** com mensagem explicando o motivo e sem possibilidade de tentar;
  - usuário que **já é jurado**: aviso "Você já é jurado neste evento";
  - admin: aviso de que a conta administrativa não resgata convite.
- Tela de sucesso com o novo papel e CTA para votar.
- Ponto de entrada visível: link "Tenho um código de convite" no `UserMenu` e na variante logada da entrada do evento (apenas para público que ainda não votou).

**Estados cobertos:** deslogado (redireciona), não verificado (redireciona), cada resultado do código, já votou, já é jurado, sucesso.

**Fica fake:** promoção de papel só no store.

**Pronto quando:**
- [ ] `publico@demo.com` + `JURA-7H3K` vira jurado e o `UserMenu` passa a mostrar "Jurado".
- [ ] `votou@demo.com` é bloqueado com texto claro.
- [ ] Reutilizar o mesmo bloqueio de tentativas do Checkpoint 4 (um componente só).

---

### Checkpoint 6 — Sessão, cabeçalho, recuperação de senha e roteamento pós-login

**Objetivo:** costurar as telas ao restante do protótipo.

**Tarefas:**
- `UserMenu` no cabeçalho do evento: nome, papel, "Tenho um código de convite" (quando aplicável) e **Sair** (volta à entrada, deslogado).
- Variante logada da entrada `/e/[slug]` (reaproveitando os estados da Etapa 2):

| Papel | Urna não iniciada | Urna aberta | Urna encerrada |
|---|---|---|---|
| Público (não votou) | Aviso informativo, sem botão | CTA **Ir para a votação** | Aviso de encerrada |
| Público (já votou) | Aviso informativo | Tela "Você já votou" | Aviso de encerrada |
| Jurado | Aviso informativo | CTA **Ir para a votação** | Aviso de encerrada |
| Admin | CTA **Painel do evento** | CTA **Painel do evento** | CTA **Painel do evento** |

- Após login ou registro concluído, redirecionar: público e jurado para `/votar` (stub) quando a urna estiver aberta; senão, para a entrada com o aviso do estado. Admin vai para `/admin` (stub).
- Registro enquanto o **evento está concluído**: aba "Criar conta" desabilitada com explicação. Login continua liberado.
- `/recuperar-senha`: campo de e-mail → tela de confirmação genérica ("Se existir uma conta, enviamos instruções"). Sem tela de redefinição real; incluir botão de protótipo "Simular link de redefinição" que abre um formulário de nova senha (2 campos) e termina em sucesso.
- Atualizar `lang` do layout raiz para `pt-BR` (se ainda não feito na Etapa 0).

**Estados cobertos:** a matriz acima, logout, recuperação (solicitada, confirmada, nova senha, sucesso).

**Fica fake:** envio de instruções e redefinição.

**Pronto quando:**
- [ ] Alternar estado da urna na toolbar com usuário logado muda a entrada conforme a matriz.
- [ ] Sair e entrar com outro papel funciona sem recarregar.
- [ ] Rotas `/votar` e `/admin` bloqueiam papéis indevidos (jurado não acessa `/admin`).

---

### Checkpoint 7 — Fechamento da etapa

**Objetivo:** revisão final e checklist.

**Tarefas:**
- Percorrer os fluxos completos nos dois temas (Semana Tech e Festival) e conferir contraste do texto e dos estados de erro.
- Acessibilidade básica: ordem de foco, foco visível, `aria-invalid` e `aria-describedby` nos erros, mensagens em `role="alert"`/`aria-live`, botões com nome acessível, alvos de toque de 44 px.
- Responsividade: 360 px, 768 px, 1280 px; teclado virtual não cobre o botão principal no formulário de registro.
- Textos: revisar mensagens em português (tom, sem jargão, sem detalhes internos), listar os textos pendentes de aprovação da organização.
- Confirmar que nenhum componente acessa dados fora de `auth.actions.ts` / store (mantém a troca da Fase 2 sem mexer nas telas).
- Registrar no README da Fase 1 as contas e códigos seed.

**Pronto quando:** todos os itens da seção 8 estiverem marcados.

---

## 7. Matriz de erros (`motivo`)

| `motivo` | Onde aparece | Mensagem sugerida |
|---|---|---|
| `credenciais_invalidas` | Login | "E-mail ou senha incorretos." |
| `email_nao_verificado` | Login | Redireciona para a verificação |
| `dados_invalidos` | Registro | Erro por campo |
| `cadastro_nao_concluido` | Registro | "Não foi possível criar a conta com estes dados." |
| `codigo_invalido` | Registro, Convite | "Código inválido." |
| `codigo_usado` | Registro, Convite | "Este código já foi utilizado." |
| `codigo_revogado` | Registro, Convite | "Este código não é mais válido." |
| `codigo_expirado` | Registro, Convite | "Este código expirou." |
| `tentativas_excedidas` | Registro, Convite | "Muitas tentativas. Tente novamente em {n}s." |
| `ja_votou_como_publico` | Convite | "Você já votou como público neste evento e não pode se tornar jurado." |
| `ja_e_jurado` | Convite | "Você já é jurado neste evento." |
| `evento_concluido` | Registro | "Este evento foi concluído e não aceita novos cadastros." |
| `erro_generico` | Todos | "Algo deu errado. Tente novamente." |

## 8. Critérios de aceitação da etapa

- [ ] Login com cada conta seed leva ao destino correto conforme papel e estado da urna.
- [ ] Registro de público: formulário → verificação → logado.
- [ ] Registro de jurado: switch → código válido → jurado; cada código inválido mostra a mensagem certa.
- [ ] Resgate em `/convite`: promove público, bloqueia quem já votou, avisa quem já é jurado.
- [ ] Usuário não verificado não acessa `/votar` nem `/convite`.
- [ ] Recuperação de senha percorre as 4 telas.
- [ ] Sair funciona e limpa a sessão do store.
- [ ] Tema do evento (nome, logo, cores) aparece em todas as telas de autenticação, nos dois temas.
- [ ] Utilizável em celular, com navegação por teclado e foco visível.
- [ ] Nenhuma persistência: F5 restaura o seed.
- [ ] Telas só chamam funções de `auth.actions.ts`.

## 9. Pendências para decisão

1. **Mensagens de código:** manter mensagens distintas (usado, revogado, expirado) ou unificar em "Código inválido ou expirado" para não dar pistas a quem testa códigos? O mockup usa distintas para validar texto.
2. **Registro com evento concluído:** bloquear (proposta deste planner) ou permitir criar conta sem poder votar?
3. **E-mail já cadastrado no registro:** mensagem genérica (proposta) ou orientar a entrar?
4. **Política de verificação por evento:** assumido Google + e-mail verificado como padrão (já listado como pendência em `Login.md`).
5. **Recuperação de senha:** manter no MVP ou remover e priorizar Google e link por e-mail, como o DD sugere?
