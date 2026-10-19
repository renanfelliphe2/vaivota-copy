import { votaveis } from "@/dominio/candidatos";
import { resolverDestinoAcesso, rotaRecuperarSenha, rotaVerificarEmail } from "@/dominio/destinoAcesso";
import type { EstadoApp, PapelParticipacao } from "@/dominio/tipos";
import { resolverVisaoEvento } from "@/dominio/visaoEvento";
import { normalizarEmail } from "@/lib/validarAcesso";
import { obterAmbiente } from "@/store/ambiente";
import { recarregarEstado } from "@/store/servidor";
import { chamar } from "./rpc";
import { falha, sucesso, type ErroServico, type Resultado } from "./resultado";

// ST1: acesso por e-mail e senha (com código por e-mail) e Google. Toda regra mora no servidor (src/server/acesso.ts);
// aqui ficam só a chamada, a atualização do estado público e o destino pós-acesso, que usa as mesmas funções puras de
// sempre (`resolverVisaoEvento` e `resolverDestinoAcesso`) sobre o estado já atualizado.

type ComDestino = { destino: string };

const COOLDOWN_REENVIO_MS = 30_000;

// ─────────────────────────────────────────────
// Apoio
// ─────────────────────────────────────────────

function ambiente() {
  const { store, relogio } = obterAmbiente();
  return { estado: store.getState(), agoraMs: relogio.getAgora(), store };
}

function slugDoEvento(estado: EstadoApp, eventoId: string): string | null {
  return estado.banco.eventos.find((e) => e.id === eventoId)?.slug ?? null;
}

/** Destino pós-acesso calculado com o estado já atualizado. */
export function destinoAposAcesso(eventoId: string, de?: string | null): string {
  const { estado, agoraMs } = ambiente();
  const evento = estado.banco.eventos.find((e) => e.id === eventoId);
  if (!evento) return "/";
  const usuario = estado.banco.usuarios.find((u) => u.id === estado.sessao.usuarioId);
  const participacao = estado.banco.participacoes.find((p) => p.usuarioId === usuario?.id && p.eventoId === eventoId);
  const configApresentacao = estado.banco.configsApresentacao.find((c) => c.eventoId === eventoId);
  const emailVerificado = Boolean(usuario?.emailVerificadoEm);
  const papel = participacao?.papel ?? null;
  const { acao } = resolverVisaoEvento({
    evento,
    configApresentacao: configApresentacao ?? { limiarRetaFinalSegundos: 300 },
    agoraMs,
    sessao: { logado: Boolean(usuario), papel, emailVerificado, jaVotou: participacao?.votou ?? false },
    qtdVotaveis: votaveis(estado.banco.candidatos.filter((c) => c.eventoId === eventoId)).length,
  });
  return resolverDestinoAcesso({ slug: evento.slug, de, emailVerificado, papel, acao });
}

/** O bloqueio é do servidor; o cliente só o exibe (contagem regressiva). */
function mostrarBloqueio(erro: ErroServico, campo: "bloqueioSenha" | "bloqueioLoginCodigo"): void {
  if (erro.codigo !== "LIMITE_TENTATIVAS" || !erro.retryAposSegundos) return;
  const { store, agoraMs } = ambiente();
  store.atualizar((e) => ({ ...e, ui: { ...e.ui, [campo]: { falhas: 0, ateMs: agoraMs + erro.retryAposSegundos! * 1000 } } }));
}

function limparBloqueios(): void {
  ambiente().store.atualizar((e) => ({
    ...e,
    ui: {
      ...e.ui,
      loginPendente: null,
      bloqueioSenha: { falhas: 0, ateMs: null },
      bloqueioLoginCodigo: { falhas: 0, ateMs: null },
    },
  }));
}

function guardarPendente(eventoId: string, email: string, tipo: "verificacao" | "recuperacao", de?: string): void {
  const { store, agoraMs } = ambiente();
  store.atualizar((e) => ({
    ...e,
    ui: {
      ...e.ui,
      loginPendente: { email: normalizarEmail(email), eventoId, tipo, ...(de ? { de } : {}) },
      reenvioVerificacaoAteMs: agoraMs + COOLDOWN_REENVIO_MS,
    },
  }));
}

// ─────────────────────────────────────────────
// Serviços
// ─────────────────────────────────────────────

/**
 * Login com e-mail e senha. Cria a sessão e a participação se faltar. Conta com e-mail ainda não confirmado segue para a
 * tela do código (o servidor já mandou um novo). Cinco senhas erradas seguidas bloqueiam o e-mail por 60 s.
 */
export async function entrar(eventoId: string, email: string, senha: string, de?: string): Promise<Resultado<ComDestino>> {
  const r = await chamar<{ emailVerificado: true }>("entrar", { eventoId, email, senha });
  if (!r.ok) {
    mostrarBloqueio(r.erro, "bloqueioSenha");
    if (r.erro.codigo === "EMAIL_NAO_VERIFICADO") {
      const slug = slugDoEvento(ambiente().estado, eventoId);
      if (slug) {
        guardarPendente(eventoId, email, "verificacao", de);
        return sucesso({ destino: rotaVerificarEmail(slug, de) });
      }
    }
    return r;
  }
  await recarregarEstado();
  limparBloqueios();
  return sucesso({ destino: destinoAposAcesso(eventoId, de) });
}

/**
 * Entrar com Google: pede ao Better Auth o endereço do consentimento e devolve para a tela redirecionar. A volta cai em
 * /e/[slug]/continuar, que cria a participação e segue para o destino certo.
 */
export async function entrarComGoogle(eventoId: string, de?: string): Promise<Resultado<{ url: string }>> {
  const slug = slugDoEvento(ambiente().estado, eventoId);
  if (!slug) return falha("NAO_ENCONTRADO", { detalhe: `evento ${eventoId} não está no estado` });
  const volta = `/e/${slug}/continuar${de ? `?de=${encodeURIComponent(de)}` : ""}`;
  try {
    const resposta = await fetch("/api/auth/sign-in/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ provider: "google", callbackURL: volta, errorCallbackURL: `/e/${slug}?erro=google` }),
      signal: AbortSignal.timeout(15_000),
    });
    const corpo = (await resposta.json().catch(() => null)) as { url?: string } | null;
    if (!resposta.ok || !corpo?.url) return falha("ERRO_INTERNO", { detalhe: `Google: HTTP ${resposta.status}` });
    return sucesso({ url: corpo.url });
  } catch {
    return falha("REDE");
  }
}

export type DadosRegistro = {
  nome: string;
  email: string;
  senha: string;
  confirmacaoSenha: string;
  papel: "PUBLICO" | "JURADO";
  codigo?: string;
  aceite: boolean;
  de?: string;
};

/**
 * Cria a conta e manda o código de confirmação por e-mail. Ainda NÃO entra: a sessão só nasce quando o código é
 * confirmado (sem isso, contas falsas permitiriam votos repetidos). Segue para a tela do código.
 */
export async function registrar(eventoId: string, dados: DadosRegistro): Promise<Resultado<ComDestino>> {
  if (dados.papel === "JURADO") return falha("VALIDACAO", { campos: { papel: "Este evento não tem votação do júri." } });
  const r = await chamar<{ email: string }>("registrar", {
    eventoId,
    nome: dados.nome,
    email: dados.email,
    senha: dados.senha,
    confirmacaoSenha: dados.confirmacaoSenha,
    aceite: dados.aceite,
  });
  if (!r.ok) {
    mostrarBloqueio(r.erro, "bloqueioLoginCodigo");
    return r;
  }
  const slug = slugDoEvento(ambiente().estado, eventoId);
  if (!slug) return falha("NAO_ENCONTRADO", { detalhe: `evento ${eventoId} não está no estado` });
  guardarPendente(eventoId, r.dados.email, "verificacao", dados.de);
  return sucesso({ destino: rotaVerificarEmail(slug, dados.de) });
}

/** E-mail que aguarda o código: o de `ui.loginPendente` ou, sem ele, o do usuário da sessão. */
function emailPendente(estado: EstadoApp): { email: string; tipo: "verificacao" | "recuperacao" } | null {
  const pendente = estado.ui.loginPendente;
  if (pendente) return { email: pendente.email, tipo: pendente.tipo ?? "verificacao" };
  const usuario = estado.banco.usuarios.find((u) => u.id === estado.sessao.usuarioId);
  return usuario ? { email: usuario.email, tipo: "verificacao" } : null;
}

/** Confirma o e-mail de quem acabou de se cadastrar com o código recebido; abre a sessão e cria a participação. */
export async function confirmarCodigo(
  eventoId: string,
  codigo: string,
  de?: string,
): Promise<Resultado<ComDestino & { contaConfirmada: boolean }>> {
  const pendente = emailPendente(ambiente().estado);
  if (!pendente) return falha("NAO_AUTORIZADO", { detalhe: "confirmação de e-mail sem e-mail pendente" });
  const r = await chamar<{ emailVerificado: true }>("confirmarCodigo", { eventoId, email: pendente.email, codigo });
  if (!r.ok) {
    mostrarBloqueio(r.erro, "bloqueioLoginCodigo");
    return r;
  }
  await recarregarEstado();
  limparBloqueios();
  return sucesso({ destino: destinoAposAcesso(eventoId, de), contaConfirmada: true });
}

/** Reenvia o código (verificação ou recuperação): cooldown de 30 s por e-mail, controlado pelo servidor. */
export async function reenviarCodigo(eventoId: string): Promise<Resultado<{ ateMs: number }>> {
  const pendente = emailPendente(ambiente().estado);
  if (!pendente) return falha("NAO_AUTORIZADO", { detalhe: "sem e-mail pendente nem sessão" });
  const r = await chamar<{ ateMs: number }>("reenviarCodigo", { eventoId, email: pendente.email, tipo: pendente.tipo });
  if (!r.ok) {
    mostrarBloqueio(r.erro, "bloqueioLoginCodigo");
    return r;
  }
  const { store } = ambiente();
  store.atualizar((e) => ({ ...e, ui: { ...e.ui, reenvioVerificacaoAteMs: r.dados.ateMs } }));
  return r;
}

/** "Esqueci minha senha", passo 1: envia o código por e-mail. E-mail desconhecido tem o mesmo comportamento. */
export async function solicitarRecuperacao(eventoId: string, email: string, de?: string): Promise<Resultado<ComDestino>> {
  const r = await chamar<{ email: string; ateMs: number }>("solicitarRecuperacao", { eventoId, email });
  if (!r.ok) {
    mostrarBloqueio(r.erro, "bloqueioLoginCodigo");
    return r;
  }
  const slug = slugDoEvento(ambiente().estado, eventoId);
  if (!slug) return falha("NAO_ENCONTRADO", { detalhe: `evento ${eventoId} não está no estado` });
  guardarPendente(eventoId, r.dados.email, "recuperacao", de);
  ambiente().store.atualizar((e) => ({ ...e, ui: { ...e.ui, reenvioVerificacaoAteMs: r.dados.ateMs } }));
  return sucesso({ destino: rotaRecuperarSenha(slug, de) });
}

/** "Esqueci minha senha", passo 2: código + senha nova. Grava a senha, confirma o e-mail e entra. */
export async function redefinirSenha(
  eventoId: string,
  dados: { codigo: string; senha: string; confirmacaoSenha: string; de?: string },
): Promise<Resultado<ComDestino>> {
  const { estado } = ambiente();
  const pendente = estado.ui.loginPendente?.eventoId === eventoId ? estado.ui.loginPendente : null;
  if (!pendente) return falha("NAO_AUTORIZADO", { detalhe: "sem e-mail pendente de recuperação" });
  const r = await chamar<{ emailVerificado: true }>("redefinirSenha", {
    eventoId,
    email: pendente.email,
    codigo: dados.codigo,
    senha: dados.senha,
    confirmacaoSenha: dados.confirmacaoSenha,
  });
  if (!r.ok) {
    mostrarBloqueio(r.erro, "bloqueioLoginCodigo");
    return r;
  }
  await recarregarEstado();
  limparBloqueios();
  return sucesso({ destino: destinoAposAcesso(eventoId, dados.de ?? pendente.de) });
}

/** Resgate de convite de jurado: fica para o MVP do Festival (júri). */
export async function resgatarConvite(eventoId: string, codigo: string): Promise<Resultado<{ papel: PapelParticipacao; destino: string }>> {
  void eventoId;
  void codigo;
  return falha("CODIGO_INVALIDO", { detalhe: "convite de jurado não existe no MVP da Maratona Tech Tivit" });
}

/**
 * Com sessão e sem participação no evento, cria PUBLICO (ou ADMIN, se há convite de admin); com participação, não muda
 * nada. Chamado pelo slot de acesso no EventoShell ao montar (quem voltou do Google, por exemplo).
 */
export async function garantirParticipacao(eventoId: string): Promise<Resultado<{ papel: PapelParticipacao }>> {
  const r = await chamar<{ papel: PapelParticipacao }>("garantirParticipacao", { eventoId });
  if (r.ok) await recarregarEstado();
  return r;
}

/** "Usar outro e-mail": descarta o e-mail pendente (a tela também sai, se houver sessão). */
export function descartarLoginPendente(): void {
  obterAmbiente().store.atualizar((e) => ({ ...e, ui: { ...e.ui, loginPendente: null } }));
}
