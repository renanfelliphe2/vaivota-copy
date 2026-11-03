import { paraMs } from "@/lib/tempo";
import type { ConviteJurado, Instante } from "./tipos";

// Etapa 6 (seção 5.4): estado exibido e resumo dos convites. A aba Operação do Dashboard (Etapa 7)
// usa as mesmas funções, e os números batem por construção.

export type EstadoExibidoConvite = "DISPONIVEL" | "USADO" | "REVOGADO" | "EXPIRADO";

/** Linha da lista de convites do admin. Nunca carrega o hash nem e-mail. */
export type ConviteListado = {
  id: string;
  rotulo: string | null;
  estado: EstadoExibidoConvite;
  validadeAte: Instante | null;
  /** Nome de quem resgatou; nunca e-mail nem hash. */
  resgatadoPor: string | null;
  resgatadoEm: Instante | null;
};

/** O código legível sai só na resposta da geração: no banco fica apenas o hash. */
export type CodigoGerado = { rotulo: string | null; codigo: string; validadeAte: Instante | null };

/** "Expirado" é derivado: DISPONIVEL com validadeAte anterior ao relógio. */
export function estadoExibidoConvite(
  convite: Pick<ConviteJurado, "estado" | "validadeAte">,
  agoraMs: number,
): EstadoExibidoConvite {
  if (convite.estado !== "DISPONIVEL") return convite.estado;
  if (convite.validadeAte && paraMs(convite.validadeAte) < agoraMs) return "EXPIRADO";
  return "DISPONIVEL";
}

export type ResumoConvites = { disponiveis: number; usados: number; revogados: number; expirados: number };

export function resumirConvites(convites: readonly Pick<ConviteJurado, "estado" | "validadeAte">[], agoraMs: number): ResumoConvites {
  const resumo: ResumoConvites = { disponiveis: 0, usados: 0, revogados: 0, expirados: 0 };
  for (const c of convites) {
    const estado = estadoExibidoConvite(c, agoraMs);
    if (estado === "DISPONIVEL") resumo.disponiveis++;
    else if (estado === "USADO") resumo.usados++;
    else if (estado === "REVOGADO") resumo.revogados++;
    else resumo.expirados++;
  }
  return resumo;
}

/** Convite que conta para o checklist: nem revogado nem expirado (usado conta). */
export function conviteUtilizavel(convite: Pick<ConviteJurado, "estado" | "validadeAte">, agoraMs: number): boolean {
  const estado = estadoExibidoConvite(convite, agoraMs);
  return estado === "DISPONIVEL" || estado === "USADO";
}

/** Revogar só vale para convite disponível (inclui o expirado, que é DISPONIVEL no banco). */
export function convitePodeSerRevogado(convite: Pick<ConviteJurado, "estado">): boolean {
  return convite.estado === "DISPONIVEL";
}

/** Próximo número para o rótulo base: "Jurado" com "Jurado 1..3" já usados → 4. */
export function proximoNumeroRotulo(rotulos: readonly (string | null)[], base: string): number {
  const prefixo = `${base.trim()} `;
  let maior = 0;
  for (const r of rotulos) {
    if (!r || !r.startsWith(prefixo)) continue;
    const n = Number(r.slice(prefixo.length));
    if (Number.isInteger(n) && n > maior) maior = n;
  }
  return maior + 1;
}
