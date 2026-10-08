# VaiVota — Funcionalidade 1: Login, Registro e Votação Popular

> Status: definida em conversa, pronta para implementação.
> Revisão 07/10/2026: alinhado às revisões 3 e 4 dos planners.
> Stack: React/TS + Next.js.
> Dependências: Evento (tema e configuração) e Candidatos (cadastro), tratados em arquivos próprios.

## 1. Objetivo

Permitir que uma pessoa acesse um evento, crie conta ou entre, veja os candidatos e registre **um único voto popular** de forma segura, sigilosa e com feedback claro. A interface carrega o tema do evento (white-label).

## 2. Escopo

**Dentro:**
- Entrada no evento por URL/QR Code.
- Registro e login.
- Listagem de candidatos.
- Seleção, revisão e confirmação do voto.
- Tela de sucesso e estado "já votou".
- Estados da urna (não iniciada, aberta, encerrada).

**Fora (outros arquivos):**
- Lógica do jurado (código de convite, peso) → fluxo 2.
- Conta infantil / totem → fluxo 3.
- Modo apresentação → fluxo 4.
- Dashboard → fluxo 5.
- Configuração do evento e cadastro de candidatos → fluxo 6.

> O formulário de registro já terá o switch **[Público / Jurado]**. Nesta funcionalidade, só o caminho **Público** é implementado; o comportamento do jurado está descrito no fluxo 2.

## 3. Decisões tomadas

| Tema | Decisão |
|---|---|
| Modelo de conta | **Usuário global** (e-mail/login) + **Participação por evento** com papel (público, jurado) |
| Identificação | Login **sem senha**: Google ou **código enviado por e-mail** (o código confirmado verifica o e-mail). Sem recuperação de senha. Método configurável por evento (por seed). Biblioteca: Better Auth |
| Voto único | Restrição única `(usuário, evento)` no banco, gravada na mesma transação do voto |
| Sigilo | Participação (quem votou) e Voto (em quem) em tabelas separadas, sem vínculo direto |
| Imutabilidade | Voto confirmado não pode ser editado nem desfeito |
| Ordem dos cards | Embaralhada por usuário, estável durante a sessão |
| "Concluir Evento" | Encerra o evento para votação. O papel de jurado permanece como histórico (sem conversão de contas) |

## 4. Modelo de dados (conceitual)

- **Usuario:** id, nome, e-mail, e-mail verificado, criado em. **Sem senha.** O método de login fica nas tabelas da biblioteca de autenticação (Better Auth: conta, sessão, verificação), que entram na trilha de produção; `Usuario` não o guarda.
- **Evento:** id, slug, nome, estado da urna, janela de votação, tema (ver Evento).
- **Participacao:** id, usuário, evento, papel (`publico` | `jurado`), `votou` (booleano).
  - Restrição única: `(usuario, evento)`.
  - Não guarda **nenhum horário** (nem do voto, nem da criação da participação).
- **Candidato:** id, evento, título, descrição, mídia, publicado (ver Candidatos).
- **Voto:** id, evento, candidato, horário, hash de recibo.
  - **Sem** referência ao usuário.

> Cuidado de sigilo: o horário do voto fica só em `Voto`. A `Participacao` registra apenas *que* votou, evitando cruzar horários para descobrir escolhas.

## 5. Fluxo

1. **Entrada:** acesso a `/e/{slug}` (normalmente via QR Code). A página carrega o tema do evento.
2. **Login ou registro:** formulário único com switch Público/Jurado (somente Público nesta funcionalidade).
   - Registro: nome e e-mail, ou Google. **Sem senha.** No caminho por e-mail, a pessoa recebe um código e o confirma; o código confirmado verifica o e-mail (só e-mail verificado vota).
   - Login: Google, ou e-mail → "Enviar código" → tela de código. Sem senha e sem recuperação de senha.
3. **Criação/recuperação da Participação** do usuário no evento.
4. **Checagem de estado:**
   - Urna **não iniciada** → tela informativa (com contagem, se houver).
   - Urna **encerrada** → tela informativa, sem botão de voto.
   - Usuário **já votou** → tela "Você já votou".
   - Urna **aberta** e usuário ainda não votou → segue.
5. **Lista de candidatos:** cards dos projetos publicados, ordem embaralhada por usuário.
6. **Seleção e revisão:** "Você está votando em *X*". Permite voltar e trocar antes de confirmar.
7. **Confirmação:** grava `Voto` e marca `Participacao.votou` na mesma transação.
8. **Sucesso:** confirmação visual e textual. Resultado só aparece quando liberado pela organização.

## 6. Regras de negócio

- A urna só aceita votos quando estiver aberta.
- Um voto popular válido por usuário por evento.
- Voto confirmado não é editável.
- Votos rejeitados ou bloqueados não entram na contagem.
- Candidatos não publicados não aparecem no fluxo.
- Encerrar a urna impede novos votos imediatamente, inclusive de quem já estava na tela de confirmação.
- Só usuários com e-mail verificado votam.

## 7. Estados, erros e concorrência

- **Duplo clique / reenvio:** o voto deve ser idempotente; a restrição única impede duplicidade.
- **Queda de rede na confirmação:** ao voltar, o sistema consulta o estado real antes de permitir nova tentativa.
- **Urna fecha durante a confirmação:** a transação rejeita e mostra mensagem clara.
- **Acesso direto por link com urna fechada:** o servidor valida, não só a interface.
- **Sem candidatos publicados:** tela informativa.
- **Erros:** mensagens genéricas ao usuário, sem expor detalhes internos; detalhes vão para o log técnico.

## 8. Segurança

- Validações sempre no servidor (estado da urna, voto único, papel).
- Rate limiting em login (envio e confirmação do código), registro e voto.
- **Sem senha:** login só por Google ou código por e-mail; não há senha guardada nem recuperação de senha.
- Código de login com validade curta e limite de tentativas; e-mail desconhecido recebe a mesma resposta (não revela se a conta existe).
- Registro de auditoria: abertura/encerramento da urna, bloqueios por rate limit e eventos de processamento de voto (sem ligar usuário à escolha).

## 9. Critérios de aceitação

- [ ] Usuário novo consegue se registrar (nome e e-mail, sem senha), confirmar o código recebido por e-mail e entrar.
- [ ] Login por Google ou por código por e-mail; não existe campo de senha nem tela de recuperação de senha.
- [ ] Usuário consegue ver os candidatos e votar em poucos passos.
- [ ] Segundo voto do mesmo usuário é impedido, inclusive com requisições simultâneas.
- [ ] Com a urna fechada ou não iniciada, não é possível votar (nem por link direto).
- [ ] Não existe relação direta entre usuário e candidato escolhido no banco.
- [ ] Ordem dos cards varia entre usuários.
- [ ] Tema do evento aparece em login, lista e confirmação.
- [ ] Interface utilizável em celular, com foco visível e navegação por teclado.

## 10. Pendências

- **Resolvida (rev. 3, E5):** candidato vinculado a um usuário não vota em si mesmo (bloqueado por padrão, configurado por seed).
- **Resolvida (rev. 4, A5):** login sem senha, por Google ou código por e-mail; método por evento configurado por seed (Google + e-mail é o padrão). Recuperação de senha removida.
- **Resolvida (rev. 4, A4/A5):** biblioteca de autenticação Better Auth; banco Supabase (PostgreSQL).
- Textos finais das telas de estado (não iniciada, encerrada, já votou) e da tela de código.
