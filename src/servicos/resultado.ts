import type { ModoFalha } from "@/dominio/tipos";
import { obterAmbiente } from "@/store/ambiente";
import { mensagemDe, type ParametrosMensagem } from "./mensagens";

export type { ModoFalha };

/** Cada etapa pode acrescentar códigos aqui (a Etapa 4 acrescenta VOTO_PROPRIO). */
export type CodigoErro =
  // Genéricos
  | "VALIDACAO"
  | "NAO_ENCONTRADO"
  | "NAO_AUTORIZADO"
  | "CONFLITO"
  | "REDE"
  | "ERRO_INTERNO"
  // Autenticação (rev. 4: CREDENCIAIS_INVALIDAS = código de login incorreto)
  | "CREDENCIAIS_INVALIDAS"
  | "EMAIL_NAO_VERIFICADO"
  | "CADASTRO_NAO_CONCLUIDO"
  // Convite
  | "CODIGO_INVALIDO"
  | "CODIGO_USADO"
  | "CODIGO_REVOGADO"
  | "CODIGO_EXPIRADO"
  | "LIMITE_TENTATIVAS"
  | "JA_VOTOU_COMO_PUBLICO"
  | "JA_E_JURADO"
  // Estado do evento
  | "EVENTO_INDISPONIVEL"
  | "EVENTO_CONCLUIDO"
  | "URNA_NAO_ABERTA"
  | "URNA_ENCERRADA"
  | "RESULTADO_INDISPONIVEL"
  | "TRAVADO"
  // Voto
  | "JA_VOTOU"
  | "PAPEL_INVALIDO"
  | "CANDIDATO_INDISPONIVEL"
  // Etapa 4 (validado nos serviços de voto da Etapa 5)
  | "VOTO_PROPRIO";

export type ErroServico = {
  codigo: CodigoErro;
  mensagem: string;
  /** Só vai ao console. */
  detalhe?: string;
  /** Erros por campo (VALIDACAO). */
  campos?: Record<string, string>;
};

export type Resultado<T> = { ok: true; dados: T } | { ok: false; erro: ErroServico };

export function sucesso<T>(dados: T): Resultado<T> {
  return { ok: true, dados };
}

export function falha(
  codigo: CodigoErro,
  opcoes: {
    detalhe?: string;
    parametros?: ParametrosMensagem;
    campos?: Record<string, string>;
    /** Mensagem específica do contexto (ex.: CONFLITO na configuração); sem ela, a genérica do código. */
    mensagem?: string;
  } = {},
): { ok: false; erro: ErroServico } {
  if (opcoes.detalhe) registrarLog(`${codigo}: ${opcoes.detalhe}`);
  return {
    ok: false,
    erro: {
      codigo,
      mensagem: opcoes.mensagem ?? mensagemDe(codigo, opcoes.parametros),
      ...(opcoes.detalhe ? { detalhe: opcoes.detalhe } : {}),
      ...(opcoes.campos ? { campos: opcoes.campos } : {}),
    },
  };
}

/** Detalhe técnico só no console (regra 4). */
export function registrarLog(mensagem: string, dados?: unknown): void {
  if (dados === undefined) console.info("[mock:log]", mensagem);
  else console.info("[mock:log]", mensagem, dados);
}

/** Latência global simulada (D5). */
export async function atraso(): Promise<void> {
  const ms = obterAmbiente().store.getState().dev.latenciaMs;
  if (ms > 0) await new Promise((resolver) => setTimeout(resolver, ms));
}

/** Devolve o modo pontual pendente e volta a NENHUMA. */
export function consumirFalhaProxima(): ModoFalha {
  const { store } = obterAmbiente();
  const modo = store.getState().dev.falhaProxima;
  if (modo !== "NENHUMA") store.atualizar((e) => ({ ...e, dev: { ...e.dev, falhaProxima: "NENHUMA" } }));
  return modo;
}

/**
 * Regra 3: trata `simularErroRede` (persistente) e os modos pontuais REDE_NAO_GRAVOU e ERRO_INTERNO.
 * Com `{ consumirPontual: false }` obedece só a `simularErroRede` (leituras de servidor).
 * Os demais modos são interpretados pelos serviços de voto (Etapa 5).
 */
export function simularFalha(opcoes: { consumirPontual?: boolean } = {}): { ok: false; erro: ErroServico } | null {
  const { dev } = obterAmbiente().store.getState();
  if (dev.simularErroRede) return falha("REDE", { detalhe: "simularErroRede ligado" });
  if (opcoes.consumirPontual === false) return null;
  if (dev.falhaProxima === "REDE_NAO_GRAVOU") {
    consumirFalhaProxima();
    return falha("REDE", { detalhe: "falha pontual REDE_NAO_GRAVOU" });
  }
  if (dev.falhaProxima === "ERRO_INTERNO") {
    consumirFalhaProxima();
    return falha("ERRO_INTERNO", { detalhe: "falha pontual ERRO_INTERNO" });
  }
  return null;
}
