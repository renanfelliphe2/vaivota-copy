import { votaveis } from "@/dominio/candidatos";
import { resolverDestinoAcesso, rotaVerificarEmail } from "@/dominio/destinoAcesso";
import type {
  BloqueioTentativas,
  ConviteJurado,
  EstadoApp,
  Evento,
  PapelParticipacao,
  Participacao,
  Usuario,
} from "@/dominio/tipos";
import { resolverVisaoEvento } from "@/dominio/visaoEvento";
import { normalizarCodigo, validarFormatoCodigo } from "@/lib/codigos";
import { hashMock } from "@/lib/hash";
import { paraInstante, paraMs } from "@/lib/tempo";
import {
  CODIGO_LOGIN_PROTOTIPO,
  normalizarEmail,
  validarCodigoLogin,
  validarEmail,
  validarNome,
} from "@/lib/validarAcesso";
import { obterAmbiente } from "@/store/ambiente";
import { registrarAuditoria } from "@/store/auditoria";
import { atraso, falha, simularFalha, sucesso, type CodigoErro, type Resultado } from "./resultado";

// Etapa 3: toda regra de acesso mora aqui; as telas só chamam os serviços e seguem o `destino`.
// Login sem senha (rev. 4, A5): e-mail → código (mock 123456) → sessão, ou Google fake.

const LIMITE_RECUSAS = 5;
const BLOQUEIO_MS = 60_000;
const COOLDOWN_REENVIO_MS = 30_000;
const IP_HASH = hashMock("ip-demo");

type ComDestino = { destino: string };

// ─────────────────────────────────────────────
// Google fake (D8)
// ─────────────────────────────────────────────

export type ContaGoogle = { id: string; nome: string; email: string };

const CONTAS_GOOGLE: ContaGoogle[] = [
  { id: "google-ana", nome: "Ana Souza", email: "publico@demo.com" },
  { id: "google-gabi", nome: "Gabi Torres", email: "equipe@demo.com" },
  { id: "google-marina", nome: "Marina Lopes", email: "marina.lopes@demo.com" },
];

/** Contas do seletor de conta do Google fake (todas com e-mail verificado). */
export function listarContasGoogle(): ContaGoogle[] {
  return CONTAS_GOOGLE;
}

// ─────────────────────────────────────────────
// Auxiliares (puros sobre o estado)
// ─────────────────────────────────────────────

function ambiente() {
  const { store, relogio } = obterAmbiente();
  return { estado: store.getState(), agoraMs: relogio.getAgora(), store };
}

function acharEvento(estado: EstadoApp, eventoId: string): Evento | undefined {
  return estado.banco.eventos.find((e) => e.id === eventoId);
}

function acharUsuarioPorEmail(estado: EstadoApp, email: string): Usuario | undefined {
  const alvo = normalizarEmail(email);
  return estado.banco.usuarios.find((u) => normalizarEmail(u.email) === alvo);
}

function acharParticipacao(estado: EstadoApp, usuarioId: string, eventoId: string): Participacao | undefined {
  return estado.banco.participacoes.find((p) => p.usuarioId === usuarioId && p.eventoId === eventoId);
}

function instante(estado: EstadoApp, eventoId: string, agoraMs: number) {
  return paraInstante(agoraMs, acharEvento(estado, eventoId)?.fusoHorario);
}

/** D2: cria a participação (PUBLICO por padrão) se ela não existir. Nunca junto com o voto (C2). */
function comParticipacao(
  estado: EstadoApp,
  usuarioId: string,
  eventoId: string,
  papel: PapelParticipacao = "PUBLICO",
): EstadoApp {
  if (acharParticipacao(estado, usuarioId, eventoId)) return estado;
  const nova: Participacao = { id: crypto.randomUUID(), usuarioId, eventoId, papel, votou: false };
  return { ...estado, banco: { ...estado.banco, participacoes: [...estado.banco.participacoes, nova] } };
}

function comUi(estado: EstadoApp, mudanca: Partial<EstadoApp["ui"]>): EstadoApp {
  return { ...estado, ui: { ...estado.ui, ...mudanca } };
}

/** Destino pós-acesso calculado com o estado já atualizado (D6). */
function calcularDestino(estado: EstadoApp, eventoId: string, usuarioId: string, agoraMs: number, de?: string | null) {
  const evento = acharEvento(estado, eventoId)!;
  const usuario = estado.banco.usuarios.find((u) => u.id === usuarioId);
  const participacao = acharParticipacao(estado, usuarioId, eventoId);
  const configApresentacao = estado.banco.configsApresentacao.find((c) => c.eventoId === eventoId)!;
  const emailVerificado = Boolean(usuario?.emailVerificadoEm);
  const papel = participacao?.papel ?? null;
  const { acao } = resolverVisaoEvento({
    evento,
    configApresentacao,
    agoraMs,
    sessao: { logado: true, papel, emailVerificado, jaVotou: participacao?.votou ?? false },
    qtdVotaveis: votaveis(estado.banco.candidatos.filter((c) => c.eventoId === eventoId)).length,
  });
  return resolverDestinoAcesso({ slug: evento.slug, de, emailVerificado, papel, acao });
}

/** Segundos que faltam do bloqueio, ou null se não está bloqueado. */
function segundosBloqueado(bloqueio: BloqueioTentativas, agoraMs: number): number | null {
  if (bloqueio.ateMs === null || bloqueio.ateMs <= agoraMs) return null;
  return Math.ceil((bloqueio.ateMs - agoraMs) / 1000);
}

/** Conta uma recusa; na quinta seguida liga o bloqueio de 60 s. Devolve o novo contador e se bloqueou agora. */
function contarRecusa(bloqueio: BloqueioTentativas, agoraMs: number): { bloqueio: BloqueioTentativas; bloqueou: boolean } {
  const anterior = bloqueio.ateMs !== null && bloqueio.ateMs <= agoraMs ? 0 : bloqueio.falhas;
  const falhas = anterior + 1;
  if (falhas >= LIMITE_RECUSAS) return { bloqueio: { falhas: 0, ateMs: agoraMs + BLOQUEIO_MS }, bloqueou: true };
  return { bloqueio: { falhas, ateMs: null }, bloqueou: false };
}

type CodigoRecusado = "CODIGO_INVALIDO" | "CODIGO_USADO" | "CODIGO_REVOGADO" | "CODIGO_EXPIRADO";

/** D13: compara só o hash, entre os convites do mesmo evento. */
function conferirCodigoConvite(
  estado: EstadoApp,
  eventoId: string,
  codigo: string,
  agoraMs: number,
): { ok: true; convite: ConviteJurado } | { ok: false; codigo: CodigoRecusado } {
  const hash = hashMock(normalizarCodigo(codigo));
  const convite = estado.banco.convitesJurado.find((c) => c.eventoId === eventoId && c.hashCodigo === hash);
  if (!convite) return { ok: false, codigo: "CODIGO_INVALIDO" };
  if (convite.estado === "USADO") return { ok: false, codigo: "CODIGO_USADO" };
  if (convite.estado === "REVOGADO") return { ok: false, codigo: "CODIGO_REVOGADO" };
  if (convite.validadeAte && paraMs(convite.validadeAte) < agoraMs) return { ok: false, codigo: "CODIGO_EXPIRADO" };
  return { ok: true, convite };
}

/**
 * Registra a recusa de um código de convite: auditoria com o motivo exato (D4), contador único (D5)
 * e, na quinta seguida, o bloqueio. Só a auditoria e o contador de `ui` mudam.
 */
function recusarCodigoConvite(eventoId: string, usuarioId: string | null, motivo: CodigoRecusado) {
  const { store, agoraMs } = ambiente();
  let bloqueou = false;
  store.atualizar((e) => {
    const contagem = contarRecusa(e.ui.bloqueioCodigo, agoraMs);
    bloqueou = contagem.bloqueou;
    let proximo = registrarAuditoria(comUi(e, { bloqueioCodigo: contagem.bloqueio }), {
      eventoId,
      usuarioId,
      acao: "TENTATIVA_CODIGO_INVALIDA",
      entidade: "convite_jurado",
      detalhes: { motivo },
      ipHash: IP_HASH,
      criadoEm: instante(e, eventoId, agoraMs),
    });
    if (bloqueou) {
      proximo = registrarAuditoria(proximo, {
        eventoId,
        usuarioId,
        acao: "BLOQUEIO_RATE_LIMIT",
        entidade: "convite_jurado",
        detalhes: { alvo: "CODIGO_CONVITE", segundos: BLOQUEIO_MS / 1000 },
        ipHash: IP_HASH,
        criadoEm: instante(e, eventoId, agoraMs),
      });
    }
    return proximo;
  });
  return falha(motivo, { detalhe: `código de convite recusado: ${motivo}${bloqueou ? " (bloqueio ligado)" : ""}` });
}

/** Marca o convite como USADO pela participação e audita CONVITE_RESGATADO (nunca o código). */
function resgatar(estado: EstadoApp, convite: ConviteJurado, participacaoId: string, usuarioId: string, agoraMs: number) {
  const quando = instante(estado, convite.eventoId, agoraMs);
  const proximo: EstadoApp = {
    ...estado,
    banco: {
      ...estado.banco,
      convitesJurado: estado.banco.convitesJurado.map((c) =>
        c.id === convite.id ? { ...c, estado: "USADO", participacaoId, resgatadoEm: quando } : c,
      ),
    },
    ui: { ...estado.ui, bloqueioCodigo: { falhas: 0, ateMs: null } },
  };
  return registrarAuditoria(proximo, {
    eventoId: convite.eventoId,
    usuarioId,
    acao: "CONVITE_RESGATADO",
    entidade: "convite_jurado",
    entidadeId: convite.id,
    detalhes: { rotulo: convite.rotulo },
    criadoEm: quando,
  });
}

function eventoOuFalha(estado: EstadoApp, eventoId: string) {
  const evento = acharEvento(estado, eventoId);
  return evento ? { evento } : { erro: falha("NAO_ENCONTRADO", { detalhe: `evento ${eventoId} não existe` }) };
}

// ─────────────────────────────────────────────
// Serviços
// ─────────────────────────────────────────────

/**
 * Entrar por e-mail (D3): NÃO cria sessão. Guarda o e-mail pendente e leva à tela de código.
 * E-mail desconhecido tem o mesmo comportamento (não revela se a conta existe).
 */
export async function entrar(eventoId: string, email: string, de?: string): Promise<Resultado<ComDestino>> {
  await atraso();
  const erro = simularFalha();
  if (erro) return erro;
  const { estado, agoraMs, store } = ambiente();
  const r = eventoOuFalha(estado, eventoId);
  if (r.erro) return r.erro;

  const erroEmail = validarEmail(email);
  if (erroEmail) return falha("VALIDACAO", { campos: { email: erroEmail } });
  if (r.evento.metodoIdentificacao === "SOMENTE_GOOGLE")
    return falha("VALIDACAO", { campos: { email: "Este evento aceita só a entrada com Google." } });

  store.atualizar((e) =>
    comUi(e, {
      loginPendente: { email: normalizarEmail(email), eventoId, ...(de ? { de } : {}) },
      reenvioVerificacaoAteMs: agoraMs + COOLDOWN_REENVIO_MS,
    }),
  );
  return sucesso({ destino: rotaVerificarEmail(r.evento.slug, de) });
}

/** Google fake (D8): entra ou cria a conta com e-mail já verificado; cria a participação se faltar. */
export async function entrarComGoogle(eventoId: string, contaId: string, de?: string): Promise<Resultado<ComDestino>> {
  await atraso();
  const erro = simularFalha();
  if (erro) return erro;
  const { estado, agoraMs, store } = ambiente();
  const r = eventoOuFalha(estado, eventoId);
  if (r.erro) return r.erro;
  const conta = CONTAS_GOOGLE.find((c) => c.id === contaId);
  if (!conta) return falha("ERRO_INTERNO", { detalhe: `conta Google fake ${contaId} não existe` });
  if (r.evento.metodoIdentificacao === "SOMENTE_EMAIL")
    return falha("ERRO_INTERNO", { detalhe: "evento SOMENTE_EMAIL não aceita Google" });

  const quando = instante(estado, eventoId, agoraMs);
  let proximo = estado;
  let usuario = acharUsuarioPorEmail(estado, conta.email);
  if (!usuario) {
    usuario = {
      id: crypto.randomUUID(),
      nome: conta.nome,
      email: conta.email,
      emailVerificadoEm: quando,
      anonimizadoEm: null,
      criadoEm: quando,
      atualizadoEm: quando,
    };
    proximo = { ...proximo, banco: { ...proximo.banco, usuarios: [...proximo.banco.usuarios, usuario] } };
  } else if (!usuario.emailVerificadoEm) {
    const id = usuario.id;
    proximo = {
      ...proximo,
      banco: {
        ...proximo.banco,
        usuarios: proximo.banco.usuarios.map((u) => (u.id === id ? { ...u, emailVerificadoEm: quando, atualizadoEm: quando } : u)),
      },
    };
  }
  const usuarioId = usuario.id;
  proximo = comParticipacao(proximo, usuarioId, eventoId);
  proximo = comUi({ ...proximo, sessao: { usuarioId } }, { loginPendente: null });
  store.atualizar(() => proximo);
  return sucesso({ destino: calcularDestino(proximo, eventoId, usuarioId, agoraMs, de) });
}

export type DadosRegistro = {
  nome: string;
  email: string;
  papel: "PUBLICO" | "JURADO";
  codigo?: string;
  aceite: boolean;
  de?: string;
};

/**
 * Registro (seção 5.2): campos → evento ATIVO → urna (só Jurado) → e-mail já cadastrado (sem consumir
 * tentativa) → bloqueio (só Jurado) → código (só Jurado) → cria usuário (e-mail não verificado),
 * participação e, no Jurado, marca o convite como USADO. Não cria sessão: leva à tela de código.
 */
export async function registrar(eventoId: string, dados: DadosRegistro): Promise<Resultado<ComDestino>> {
  await atraso();
  const erro = simularFalha();
  if (erro) return erro;
  const { estado, agoraMs, store } = ambiente();
  const r = eventoOuFalha(estado, eventoId);
  if (r.erro) return r.erro;
  const evento = r.evento;
  const jurado = dados.papel === "JURADO";

  const campos: Record<string, string> = {};
  const erroNome = validarNome(dados.nome);
  const erroEmail = validarEmail(dados.email);
  if (erroNome) campos.nome = erroNome;
  if (erroEmail) campos.email = erroEmail;
  if (!dados.aceite) campos.aceite = "Marque a caixa para continuar.";
  if (jurado && !evento.moduloJuri) campos.papel = "Este evento não tem votação do júri.";
  if (jurado && !validarFormatoCodigo(dados.codigo ?? "")) campos.codigo = "Digite o código completo, no formato XXXX-XXXX.";
  if (Object.keys(campos).length > 0) return falha("VALIDACAO", { campos });

  if (evento.estado === "CONCLUIDO") return falha("EVENTO_CONCLUIDO");
  if (evento.estado !== "ATIVO") return falha("EVENTO_INDISPONIVEL");
  if (jurado && evento.estadoUrna === "ENCERRADA") return falha("URNA_ENCERRADA");
  if (acharUsuarioPorEmail(estado, dados.email))
    return falha("CADASTRO_NAO_CONCLUIDO", { detalhe: "e-mail já cadastrado" });

  let convite: ConviteJurado | null = null;
  if (jurado) {
    const restante = segundosBloqueado(estado.ui.bloqueioCodigo, agoraMs);
    if (restante !== null) return falha("LIMITE_TENTATIVAS", { parametros: { n: restante } });
    const conferido = conferirCodigoConvite(estado, eventoId, dados.codigo!, agoraMs);
    if (!conferido.ok) return recusarCodigoConvite(eventoId, null, conferido.codigo);
    convite = conferido.convite;
  }

  const quando = instante(estado, eventoId, agoraMs);
  const usuario: Usuario = {
    id: crypto.randomUUID(),
    nome: dados.nome.trim(),
    email: normalizarEmail(dados.email),
    emailVerificadoEm: null,
    anonimizadoEm: null,
    criadoEm: quando,
    atualizadoEm: quando,
  };
  let proximo: EstadoApp = { ...estado, banco: { ...estado.banco, usuarios: [...estado.banco.usuarios, usuario] } };
  proximo = comParticipacao(proximo, usuario.id, eventoId, jurado ? "JURADO" : "PUBLICO");
  if (convite) {
    const participacao = acharParticipacao(proximo, usuario.id, eventoId)!;
    proximo = resgatar(proximo, convite, participacao.id, usuario.id, agoraMs);
  }
  proximo = comUi(proximo, {
    loginPendente: { email: usuario.email, eventoId, ...(dados.de ? { de: dados.de } : {}) },
    reenvioVerificacaoAteMs: agoraMs + COOLDOWN_REENVIO_MS,
  });
  store.atualizar(() => proximo);
  return sucesso({ destino: rotaVerificarEmail(evento.slug, dados.de) });
}

/** E-mail que aguarda o código: o de `ui.loginPendente` ou, sem ele, o do usuário da sessão (D3). */
function emailPendente(estado: EstadoApp): string | null {
  if (estado.ui.loginPendente) return estado.ui.loginPendente.email;
  const usuario = estado.banco.usuarios.find((u) => u.id === estado.sessao.usuarioId);
  return usuario?.email ?? null;
}

/**
 * Confirma o código de login (substitui `verificarEmail`): `123456` cria a sessão do e-mail pendente,
 * verifica o e-mail e cria a participação se faltar. Código errado ou conta inexistente: mesma mensagem.
 */
export async function confirmarCodigo(
  eventoId: string,
  codigo: string,
  de?: string,
): Promise<Resultado<ComDestino & { contaConfirmada: boolean }>> {
  await atraso();
  const erro = simularFalha();
  if (erro) return erro;
  const { estado, agoraMs, store } = ambiente();
  const r = eventoOuFalha(estado, eventoId);
  if (r.erro) return r.erro;

  const email = emailPendente(estado);
  if (!email) return falha("NAO_AUTORIZADO", { detalhe: "sem e-mail pendente nem sessão" });

  const restante = segundosBloqueado(estado.ui.bloqueioLoginCodigo, agoraMs);
  if (restante !== null) return falha("LIMITE_TENTATIVAS", { parametros: { n: restante } });

  const erroFormato = validarCodigoLogin(codigo);
  if (erroFormato) return falha("VALIDACAO", { campos: { codigo: erroFormato } });

  const usuario = acharUsuarioPorEmail(estado, email);
  if (codigo.trim() !== CODIGO_LOGIN_PROTOTIPO || !usuario) {
    let bloqueou = false;
    store.atualizar((e) => {
      const contagem = contarRecusa(e.ui.bloqueioLoginCodigo, agoraMs);
      bloqueou = contagem.bloqueou;
      const proximo = comUi(e, { bloqueioLoginCodigo: contagem.bloqueio });
      if (!bloqueou) return proximo;
      return registrarAuditoria(proximo, {
        eventoId,
        usuarioId: null,
        acao: "BLOQUEIO_RATE_LIMIT",
        entidade: "codigo_login",
        detalhes: { alvo: "CODIGO_LOGIN", segundos: BLOQUEIO_MS / 1000 },
        ipHash: IP_HASH,
        criadoEm: instante(e, eventoId, agoraMs),
      });
    });
    return falha("CREDENCIAIS_INVALIDAS", {
      detalhe: `${usuario ? "código incorreto" : "conta inexistente"}${bloqueou ? " (bloqueio ligado)" : ""}`,
    });
  }

  const quando = instante(estado, eventoId, agoraMs);
  const usuarioId = usuario.id;
  const deFinal = de ?? estado.ui.loginPendente?.de;
  let proximo: EstadoApp = {
    ...estado,
    sessao: { usuarioId },
    banco: {
      ...estado.banco,
      usuarios: estado.banco.usuarios.map((u) =>
        u.id === usuarioId && !u.emailVerificadoEm ? { ...u, emailVerificadoEm: quando, atualizadoEm: quando } : u,
      ),
    },
  };
  proximo = comParticipacao(proximo, usuarioId, eventoId);
  proximo = comUi(proximo, { loginPendente: null, bloqueioLoginCodigo: { falhas: 0, ateMs: null } });
  store.atualizar(() => proximo);
  return sucesso({
    destino: calcularDestino(proximo, eventoId, usuarioId, agoraMs, deFinal),
    // Primeira confirmação do e-mail (registro, ou cadastro iniciado como o de Davi): a tela mostra o sucesso.
    contaConfirmada: !usuario.emailVerificadoEm,
  });
}

/** Reenvia o código (substitui `reenviarVerificacao`): cooldown de 30 s no relógio simulado. */
export async function reenviarCodigo(eventoId: string): Promise<Resultado<{ ateMs: number }>> {
  await atraso();
  const erro = simularFalha();
  if (erro) return erro;
  const { estado, agoraMs, store } = ambiente();
  const r = eventoOuFalha(estado, eventoId);
  if (r.erro) return r.erro;
  if (!emailPendente(estado)) return falha("NAO_AUTORIZADO", { detalhe: "sem e-mail pendente nem sessão" });
  const ate = estado.ui.reenvioVerificacaoAteMs;
  if (ate !== null && ate > agoraMs) return falha("CONFLITO", { detalhe: "reenvio dentro do cooldown" });
  const ateMs = agoraMs + COOLDOWN_REENVIO_MS;
  store.atualizar((e) => comUi(e, { reenvioVerificacaoAteMs: ateMs }));
  return sucesso({ ateMs });
}

/**
 * Resgate de convite por quem já tem conta (seção 5.2): sessão verificada → evento → urna → módulo júri
 * → papel (antes do código, para não consumir tentativas) → bloqueio → código.
 */
export async function resgatarConvite(
  eventoId: string,
  codigo: string,
): Promise<Resultado<{ papel: PapelParticipacao; destino: string }>> {
  await atraso();
  const erro = simularFalha();
  if (erro) return erro;
  const { estado, agoraMs, store } = ambiente();
  const r = eventoOuFalha(estado, eventoId);
  if (r.erro) return r.erro;
  const evento = r.evento;

  const usuario = estado.banco.usuarios.find((u) => u.id === estado.sessao.usuarioId);
  if (!usuario || !usuario.emailVerificadoEm) return falha("NAO_AUTORIZADO", { detalhe: "sem sessão verificada" });
  if (evento.estado === "CONCLUIDO") return falha("EVENTO_CONCLUIDO");
  if (evento.estadoUrna === "ENCERRADA") return falha("URNA_ENCERRADA");
  if (!evento.moduloJuri) return falha("CODIGO_INVALIDO", { detalhe: "módulo júri desligado" });

  const participacao = acharParticipacao(estado, usuario.id, eventoId);
  const recusaPorPapel: CodigoErro | null =
    participacao?.papel === "ADMIN"
      ? "PAPEL_INVALIDO"
      : participacao?.papel === "JURADO"
        ? "JA_E_JURADO"
        : participacao?.votou
          ? "JA_VOTOU_COMO_PUBLICO"
          : null;
  if (recusaPorPapel) return falha(recusaPorPapel);

  const restante = segundosBloqueado(estado.ui.bloqueioCodigo, agoraMs);
  if (restante !== null) return falha("LIMITE_TENTATIVAS", { parametros: { n: restante } });
  if (!validarFormatoCodigo(codigo)) return falha("VALIDACAO", { campos: { codigo: "Digite o código completo, no formato XXXX-XXXX." } });

  const conferido = conferirCodigoConvite(estado, eventoId, codigo, agoraMs);
  if (!conferido.ok) return recusarCodigoConvite(eventoId, usuario.id, conferido.codigo);

  const usuarioId = usuario.id;
  let proximo = comParticipacao(estado, usuarioId, eventoId, "JURADO");
  proximo = {
    ...proximo,
    banco: {
      ...proximo.banco,
      participacoes: proximo.banco.participacoes.map((p) =>
        p.usuarioId === usuarioId && p.eventoId === eventoId ? { ...p, papel: "JURADO" } : p,
      ),
    },
  };
  const promovida = acharParticipacao(proximo, usuarioId, eventoId)!;
  proximo = resgatar(proximo, conferido.convite, promovida.id, usuarioId, agoraMs);
  store.atualizar(() => proximo);
  return sucesso({ papel: "JURADO", destino: calcularDestino(proximo, eventoId, usuarioId, agoraMs) });
}

/**
 * C2: com sessão e sem participação no evento, cria PUBLICO (vale com e-mail não verificado);
 * com participação, não muda nada. Chamado pelo slot de acesso no EventoShell ao montar.
 */
export async function garantirParticipacao(eventoId: string): Promise<Resultado<{ papel: PapelParticipacao }>> {
  await atraso();
  const erro = simularFalha();
  if (erro) return erro;
  const { estado, store } = ambiente();
  const usuarioId = estado.sessao.usuarioId;
  if (!usuarioId) return falha("NAO_AUTORIZADO", { detalhe: "sem sessão" });
  if (!acharEvento(estado, eventoId)) return falha("NAO_ENCONTRADO", { detalhe: `evento ${eventoId} não existe` });
  const existente = acharParticipacao(estado, usuarioId, eventoId);
  if (existente) return sucesso({ papel: existente.papel });
  store.atualizar((e) => comParticipacao(e, usuarioId, eventoId));
  return sucesso({ papel: "PUBLICO" });
}

/** "Usar outro e-mail": descarta o e-mail pendente (a tela também sai, se houver sessão). */
export function descartarLoginPendente(): void {
  obterAmbiente().store.atualizar((e) => comUi(e, { loginPendente: null }));
}
