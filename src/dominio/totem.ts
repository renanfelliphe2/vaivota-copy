import { hashMock } from "@/lib/hash";
import type { Candidato, Categoria, Dispositivo, Evento, Instante } from "./tipos";
import type { FunilTotem } from "./sessaoTotem";

// Totem (rev. 4, A7; Base/VotoInfantil.md §6 e §9): regras puras do modo quiosque.

/**
 * O que o totem mostra. Só VOTANDO aceita voto; as demais são telas neutras de bloqueio.
 * Ordem de precedência: aparelho, módulo, evento, aparelho pausado, urna, candidatos.
 */
export type SituacaoTotem =
  | "NAO_PAREADO"
  | "DISPOSITIVO_REVOGADO"
  | "MODULO_DESLIGADO"
  | "EVENTO_INDISPONIVEL"
  | "EVENTO_CONCLUIDO"
  | "DISPOSITIVO_PAUSADO"
  | "URNA_NAO_INICIADA"
  | "URNA_ENCERRADA"
  | "SEM_CANDIDATOS"
  | "VOTANDO";

export function situacaoTotem(
  evento: Pick<Evento, "id" | "estado" | "estadoUrna" | "moduloInfantil">,
  dispositivo: Pick<Dispositivo, "eventoId" | "estado"> | null,
  totalVotaveis: number,
): SituacaoTotem {
  // Um aparelho pareado com outro evento não vale aqui.
  if (!dispositivo || dispositivo.eventoId !== evento.id) return "NAO_PAREADO";
  if (dispositivo.estado === "REVOGADO") return "DISPOSITIVO_REVOGADO";
  if (!evento.moduloInfantil) return "MODULO_DESLIGADO";
  if (evento.estado === "RASCUNHO") return "EVENTO_INDISPONIVEL";
  // §9: concluir o evento bloqueia todos os totens.
  if (evento.estado === "CONCLUIDO") return "EVENTO_CONCLUIDO";
  if (dispositivo.estado === "PAUSADO") return "DISPOSITIVO_PAUSADO";
  if (evento.estadoUrna === "NAO_INICIADA") return "URNA_NAO_INICIADA";
  if (evento.estadoUrna === "ENCERRADA") return "URNA_ENCERRADA";
  if (totalVotaveis === 0) return "SEM_CANDIDATOS";
  return "VOTANDO";
}

/** Hash do PIN de saída do quiosque. Só do mock (D12): em produção, hash com sal no servidor. */
export function hashPinTotem(dispositivoId: string, pin: string): string {
  return hashMock(`pin:${dispositivoId}:${pin}`);
}

/** Totem sem PIN definido sai direto; com PIN, só com o PIN certo (§6). */
export function pinConfere(dispositivo: Pick<Dispositivo, "id" | "hashPin">, pin: string): boolean {
  if (dispositivo.hashPin === null) return true;
  return hashPinTotem(dispositivo.id, pin) === dispositivo.hashPin;
}

/**
 * Códigos de pareamento ainda não usados que um evento pode ter ao mesmo tempo. Desde 25/11/2026 o código não vence (vale até ser
 * usado ou descartado pelo admin, que pode vê-lo de novo na tela Totens); os gerados antes mantêm a validade de 15 minutos.
 */
export const MAX_CODIGOS_PENDENTES = 20;

/**
 * O que o próprio totem sabe de si: nunca o hash do token nem o do PIN. `categoriaIds` (25/11/2026): as categorias TOTEM que ele
 * exibe; só os itens delas aparecem no totem.
 */
export type DispositivoDoTotem = Pick<Dispositivo, "id" | "eventoId" | "nome" | "estado"> & { categoriaIds: string[] };

/** Linha da lista de totens do admin (§4): nome, estado, último uso, votos e categorias. O PIN só aparece como "tem ou não tem". */
export type DispositivoListado = Pick<Dispositivo, "id" | "nome" | "estado" | "ultimoUsoEm" | "criadoEm"> & {
  votos: number;
  temPin: boolean;
  categoriaIds: string[];
  /** Último relatório do aparelho (sincronização) e o que ele contou. */
  ultimoSinalEm: Instante | null;
  situacaoRelatada: SituacaoTotem | null;
  telaCheia: boolean | null;
  /** Último "Forçar sincronização" do admin; pendente enquanto for mais novo que o último sinal. */
  sincronizacaoPedidaEm: Instante | null;
};

// ─────────────────────────────────────────────
// Sincronização (página Totens, 24/11/2026)
// ─────────────────────────────────────────────

export const SITUACOES_TOTEM = [
  "NAO_PAREADO",
  "DISPOSITIVO_REVOGADO",
  "MODULO_DESLIGADO",
  "EVENTO_INDISPONIVEL",
  "EVENTO_CONCLUIDO",
  "DISPOSITIVO_PAUSADO",
  "URNA_NAO_INICIADA",
  "URNA_ENCERRADA",
  "SEM_CANDIDATOS",
  "VOTANDO",
] as const satisfies readonly SituacaoTotem[];

export function ehSituacaoTotem(valor: string | null): valor is SituacaoTotem {
  return valor !== null && (SITUACOES_TOTEM as readonly string[]).includes(valor);
}

/** O que o totem conta de si a cada sincronização. Nada da criança nem do voto. `funil`: as contagens de toques da sessão atual. */
export type RelatorioTotem = { situacao: SituacaoTotem; telaCheia: boolean; funil?: { sessaoId: string; contagens: FunilTotem } };

export const SINCRONIZACAO_TOTEM = {
  /** O totem manda um relatório sozinho a cada hora (e ao abrir). */
  intervaloMs: 60 * 60_000,
  /** Folga além da hora antes de dizer "sem sinal" (o relatório pode atrasar um pouco). */
  toleranciaMs: 5 * 60_000,
  /** Depois de "Forçar sincronização", quanto esperar a resposta: o totem consulta o servidor a cada 10 s. */
  esperaRespostaMs: 45_000,
} as const;

export type ConexaoTotem =
  /** Respondeu dentro da última hora (relatório ou voto). */
  | "CONECTADO"
  /** Sincronização pedida, esperando a resposta. */
  | "SINCRONIZANDO"
  /** Sincronização pedida e o totem não respondeu a tempo: desligado, sem rede ou com a página fechada. */
  | "SEM_RESPOSTA"
  /** Passou da hora sem relatório. */
  | "SEM_SINAL"
  /** Pareado, mas nunca mandou relatório (aparelho antigo ou página nunca aberta depois desta versão). */
  | "NUNCA"
  | "REVOGADO";

/** Último contato do aparelho: o relatório ou o voto, o que for mais novo. */
export function ultimoContatoMs(t: Pick<DispositivoListado, "ultimoSinalEm" | "ultimoUsoEm">): number | null {
  const ms = [t.ultimoSinalEm, t.ultimoUsoEm].flatMap((i) => (i ? [Date.parse(i)] : [])).filter((n) => !Number.isNaN(n));
  return ms.length ? Math.max(...ms) : null;
}

export function conexaoTotem(
  t: Pick<DispositivoListado, "estado" | "ultimoSinalEm" | "ultimoUsoEm" | "sincronizacaoPedidaEm">,
  agoraMs: number,
): ConexaoTotem {
  if (t.estado === "REVOGADO") return "REVOGADO";
  const contato = ultimoContatoMs(t);
  const pedido = t.sincronizacaoPedidaEm ? Date.parse(t.sincronizacaoPedidaEm) : null;
  const sinal = t.ultimoSinalEm ? Date.parse(t.ultimoSinalEm) : null;
  // Pedido mais novo que o último relatório: ainda não respondeu.
  if (pedido !== null && (sinal === null || sinal < pedido)) return agoraMs - pedido <= SINCRONIZACAO_TOTEM.esperaRespostaMs ? "SINCRONIZANDO" : "SEM_RESPOSTA";
  if (contato === null) return "NUNCA";
  return agoraMs - contato <= SINCRONIZACAO_TOTEM.intervaloMs + SINCRONIZACAO_TOTEM.toleranciaMs ? "CONECTADO" : "SEM_SINAL";
}

/**
 * Categorias escolhidas para um totem (25/11/2026): ao menos uma, todas TOTEM e do evento. Devolve a mensagem do erro ou null.
 * O servidor confere de novo dentro da transação.
 */
export function validarCategoriasTotem(categoriaIds: readonly string[], categorias: readonly Pick<Categoria, "id" | "canal">[]): string | null {
  if (categoriaIds.length === 0) return "Escolha ao menos uma categoria para o totem.";
  const doTotem = new Set(categorias.filter((c) => c.canal === "TOTEM").map((c) => c.id));
  if (categoriaIds.some((id) => !doTotem.has(id))) return "Escolha só categorias votadas no totem.";
  return null;
}

/** Itens que o totem mostra: os votáveis das categorias que ele exibe (e que seguem sendo do totem), na ordem das categorias. */
export function itensDoTotem<T extends Pick<Candidato, "categoriaId">>(
  candidatos: readonly T[],
  categorias: readonly Pick<Categoria, "id" | "canal">[],
  categoriaIds: readonly string[],
): T[] {
  const exibidas = categorias.filter((c) => c.canal === "TOTEM" && categoriaIds.includes(c.id)).map((c) => c.id);
  return exibidas.flatMap((id) => candidatos.filter((c) => c.categoriaId === id));
}

/** Resposta da geração do código. */
export type CodigoPareamentoGerado = { codigo: string; nome: string };

/**
 * Um código de pareamento esperando o tablet (25/11/2026): o admin pode vê-lo de novo ou descartá-lo. `codigo` é null nos gerados
 * antes de o código ficar guardado (só o hash existia): esses só podem ser descartados.
 */
export type CodigoPendente = { id: string; codigo: string | null; nome: string; categoriaIds: string[]; criadoEm: Instante; validadeAte: Instante | null };

/**
 * Chave aleatória de uma tentativa de voto (128 bits em hexadecimal). `getRandomValues` funciona também fora de HTTPS (um tablet na
 * rede do local), onde `randomUUID` não existe. Não tem relação com a criança nem com o aparelho.
 */
export function novoIdEnvio(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** §6 (pendência §12: tempos provisórios). */
export const TEMPOS_TOTEM = {
  /** Sucesso → escolha do próximo voto (26/11/2026: as crianças votam em fila; antes voltava à tela inicial). */
  retornoMs: 6_000,
  /** Sem toque na escolha ou na confirmação → tela inicial. */
  inatividadeMs: 30_000,
  /** Escolha aberta depois de um voto, sem ninguém escolher um cartaz → tela inicial (26/11/2026, pedido do usuário). */
  esperaProximoMs: 15_000,
  /** Erro → tela inicial. */
  erroMs: 8_000,
} as const;
