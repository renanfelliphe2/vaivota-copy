import { funilVazio, type ContagemVotoTotem, type FunilTotem } from "@/dominio/sessaoTotem";

// Log do totem no próprio aparelho (logTotem.md, 26/11/2026): cada toque, desistência e erro, para explicar a diferença entre as
// crianças na sala e os votos no banco. Fica no localStorage do aparelho (é o que nunca chega ao servidor sozinho) e vai resumido
// (o funil) no relatório de sincronização. NUNCA guarda o item escolhido nem nada da criança.
//
// A sessão é do servidor: o aparelho só a conhece pela resposta do voto (ou pelo menu do PIN). Por isso os toques desde o último
// voto ficam "pendentes" e entram no funil da sessão em que o PRÓXIMO voto cair (ou da sessão encerrada pelo menu).

export type TipoEventoLog =
  | "COMECOU"
  | "ESCOLHEU"
  | "VOLTOU"
  | "DESISTIU_ESCOLHA"
  | "DESISTIU_CONFIRMAR"
  | "ENVIOU"
  | "REGISTRADO"
  | "ERRO"
  | "TENTOU_DE_NOVO"
  | "ERRO_DESCARTADO"
  | "SESSAO_ENCERRADA"
  | "SESSAO_ABERTA";

export type EventoLog = {
  /** Horário (ms). */
  t: number;
  tipo: TipoEventoLog;
  /** Número da sessão (quando conhecido). */
  sessao?: number;
  /** ERRO: o código (REDE, DISPOSITIVO_INATIVO...). */
  codigo?: string;
  /** REGISTRADO: votos da sessão depois deste. */
  votosSessao?: number;
};

export type EstadoLogTotem = {
  versao: 1;
  eventos: EventoLog[];
  sessaoAtual: { id: string; numero: number } | null;
  /** Funil por sessão (id do servidor). */
  funis: Record<string, FunilTotem>;
  /** Toques desde o último voto, ainda sem sessão. */
  pendente: FunilTotem;
  /** O funil mudou desde o último relatório. */
  alterado: boolean;
};

export const MAXIMO_EVENTOS_LOG = 2000;
const MAXIMO_FUNIS = 30;

export function estadoLogVazio(): EstadoLogTotem {
  return { versao: 1, eventos: [], sessaoAtual: null, funis: {}, pendente: funilVazio(), alterado: false };
}

const CHAVE_DO_FUNIL: Partial<Record<TipoEventoLog, Exclude<keyof FunilTotem, "erros">>> = {
  COMECOU: "comecou",
  ESCOLHEU: "escolheu",
  VOLTOU: "voltou",
  DESISTIU_ESCOLHA: "desistiuEscolha",
  DESISTIU_CONFIRMAR: "desistiuConfirmar",
  ENVIOU: "enviou",
  REGISTRADO: "registrado",
  TENTOU_DE_NOVO: "tentouDeNovo",
  ERRO_DESCARTADO: "erroDescartado",
};

function somar(a: FunilTotem, b: FunilTotem): FunilTotem {
  const r = funilVazio();
  for (const chave of Object.keys(r) as (keyof FunilTotem)[]) {
    if (chave === "erros") continue;
    r[chave] = a[chave] + b[chave];
  }
  for (const [codigo, n] of [...Object.entries(a.erros), ...Object.entries(b.erros)]) r.erros[codigo] = (r.erros[codigo] ?? 0) + n;
  return r;
}

function contar(funil: FunilTotem, evento: EventoLog): FunilTotem {
  const f = { ...funil, erros: { ...funil.erros } };
  if (evento.tipo === "ERRO") {
    const codigo = /^[A-Z_]{1,40}$/.test(evento.codigo ?? "") ? evento.codigo! : "DESCONHECIDO";
    f.erros[codigo] = (f.erros[codigo] ?? 0) + 1;
  } else {
    const chave = CHAVE_DO_FUNIL[evento.tipo];
    if (chave) f[chave] += 1;
  }
  return f;
}

/** Junta os toques pendentes no funil da sessão e esquece os funis mais antigos. */
function descarregar(estado: EstadoLogTotem, sessaoId: string): EstadoLogTotem {
  const funis = { ...estado.funis, [sessaoId]: somar(estado.funis[sessaoId] ?? funilVazio(), estado.pendente) };
  const ids = Object.keys(funis);
  for (const id of ids.slice(0, Math.max(0, ids.length - MAXIMO_FUNIS))) delete funis[id];
  return { ...estado, funis, pendente: funilVazio() };
}

function anotar(estado: EstadoLogTotem, evento: EventoLog): EstadoLogTotem {
  const eventos = estado.eventos.length >= MAXIMO_EVENTOS_LOG ? estado.eventos.slice(-(MAXIMO_EVENTOS_LOG - 1)) : estado.eventos.slice();
  eventos.push(evento);
  return { ...estado, eventos };
}

/** Um toque, uma desistência ou um erro: entra no log e nos toques pendentes. */
export function aplicarEvento(estado: EstadoLogTotem, tipo: TipoEventoLog, agora: number, extra: { codigo?: string } = {}): EstadoLogTotem {
  const evento: EventoLog = { t: agora, tipo, ...(estado.sessaoAtual ? { sessao: estado.sessaoAtual.numero } : {}), ...extra };
  return { ...anotar(estado, evento), pendente: contar(estado.pendente, evento), alterado: true };
}

/** Voto registrado: a resposta diz em que sessão ele caiu; os toques pendentes vão para essa sessão. */
export function aplicarVoto(estado: EstadoLogTotem, contagem: Partial<ContagemVotoTotem> | undefined, agora: number): EstadoLogTotem {
  const sessao = contagem?.sessaoId && contagem.numeroSessao ? { id: contagem.sessaoId, numero: contagem.numeroSessao } : estado.sessaoAtual;
  let e = { ...estado, sessaoAtual: sessao };
  const evento: EventoLog = {
    t: agora,
    tipo: "REGISTRADO",
    ...(sessao ? { sessao: sessao.numero } : {}),
    ...(contagem?.votosSessao !== undefined ? { votosSessao: contagem.votosSessao } : {}),
  };
  e = { ...anotar(e, evento), pendente: contar(e.pendente, evento), alterado: true };
  return sessao ? descarregar(e, sessao.id) : e;
}

/** Menu do PIN encerrou a sessão: os toques pendentes ficam com ela. */
export function aplicarEncerramento(estado: EstadoLogTotem, agora: number): EstadoLogTotem {
  if (!estado.sessaoAtual) return anotar(estado, { t: agora, tipo: "SESSAO_ENCERRADA" });
  const e = descarregar(estado, estado.sessaoAtual.id);
  return { ...anotar(e, { t: agora, tipo: "SESSAO_ENCERRADA", sessao: estado.sessaoAtual.numero }), alterado: true };
}

/** Menu do PIN abriu a sessão: ela passa a ser a atual. */
export function aplicarAbertura(estado: EstadoLogTotem, sessao: { id: string; numero: number }, agora: number): EstadoLogTotem {
  return anotar({ ...estado, sessaoAtual: sessao }, { t: agora, tipo: "SESSAO_ABERTA", sessao: sessao.numero });
}

/** O funil que vai no relatório: o da sessão atual somado aos toques pendentes (que, quase sempre, são dela). */
export function funilParaRelatorio(estado: EstadoLogTotem): { sessaoId: string; contagens: FunilTotem } | null {
  if (!estado.sessaoAtual) return null;
  const id = estado.sessaoAtual.id;
  return { sessaoId: id, contagens: somar(estado.funis[id] ?? funilVazio(), estado.pendente) };
}

// ─────────────────────────────────────────────
// Guarda no aparelho (localStorage; sem ele, só na memória)
// ─────────────────────────────────────────────

const CHAVE = "vaivota-log-totem-v1";
let memoria: EstadoLogTotem | null = null;

function lerGuardado(): EstadoLogTotem {
  if (memoria) return memoria;
  try {
    const bruto = typeof localStorage !== "undefined" ? localStorage.getItem(CHAVE) : null;
    const lido = bruto ? (JSON.parse(bruto) as EstadoLogTotem) : null;
    memoria = lido && lido.versao === 1 && Array.isArray(lido.eventos) ? { ...estadoLogVazio(), ...lido } : estadoLogVazio();
  } catch {
    memoria = estadoLogVazio();
  }
  return memoria;
}

function guardar(estado: EstadoLogTotem) {
  memoria = estado;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch {
    // Sem espaço ou sem localStorage: o log segue na memória até recarregar a página.
  }
}

export function lerLogTotem(): EstadoLogTotem {
  return lerGuardado();
}

export function registrarEventoTotem(tipo: TipoEventoLog, extra: { codigo?: string } = {}) {
  guardar(aplicarEvento(lerGuardado(), tipo, Date.now(), extra));
}

export function registrarVotoNoLog(contagem: Partial<ContagemVotoTotem> | undefined) {
  guardar(aplicarVoto(lerGuardado(), contagem, Date.now()));
}

export function registrarEncerramentoNoLog() {
  guardar(aplicarEncerramento(lerGuardado(), Date.now()));
}

export function registrarAberturaNoLog(sessao: { id: string; numero: number }) {
  guardar(aplicarAbertura(lerGuardado(), sessao, Date.now()));
}

/** O funil para o relatório, e se ele mudou desde o último envio (marca como enviado). */
export function funilDoLogParaEnvio(): { funil: { sessaoId: string; contagens: FunilTotem } | null; mudou: boolean } {
  const estado = lerGuardado();
  const mudou = estado.alterado;
  if (mudou) guardar({ ...estado, alterado: false });
  return { funil: funilParaRelatorio(estado), mudou };
}

/** Apaga o log deste aparelho (o funil já enviado continua no servidor). */
export function limparLogTotem() {
  const atual = lerGuardado();
  guardar({ ...estadoLogVazio(), sessaoAtual: atual.sessaoAtual });
}

/** Pede um relatório agora (o useSinalTotem escuta): ao encerrar a sessão e ao abrir a análise. */
export const EVENTO_PEDIR_RELATORIO = "vaivota:relatorio-totem";
export function pedirRelatorioTotem() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_PEDIR_RELATORIO));
}
