import type { ConviteJurado } from "@/dominio/tipos";
import { hashMock } from "@/lib/hash";
import { normalizarCodigo } from "@/lib/codigos";
import { ID_FESTIVAL, ID_SEMANA_TECH } from "./eventos";

// D12: só o hash fica no estado. Os códigos legíveis abaixo existem apenas no seed e no README.
//   Semana Tech: K7M3-QX9P (disponível), H4TR-9WNB (usado, Bruno), F3WJ-8RNK (usado, Fábio),
//                P8CD-2VXF (revogado), M6ZQ-4KTA (disponível, mas expirado)
//   Festival:    R5HN-7DCW, T9VB-3JXG (disponíveis)

function hashDoCodigo(codigo: string): string {
  return hashMock(normalizarCodigo(codigo));
}

type Base = Pick<ConviteJurado, "id" | "eventoId" | "rotulo"> & Partial<ConviteJurado> & { codigo: string };

function convite({ codigo, ...base }: Base): ConviteJurado {
  return {
    hashCodigo: hashDoCodigo(codigo),
    validadeAte: null,
    estado: "DISPONIVEL",
    participacaoId: null,
    resgatadoEm: null,
    criadoEm: "2026-10-05T10:00:00-03:00",
    ...base,
  };
}

export const seedConvites = [
  convite({ id: "conv-st-1", eventoId: ID_SEMANA_TECH, codigo: "K7M3-QX9P", rotulo: "Jurado 2" }),
  convite({
    id: "conv-st-2",
    eventoId: ID_SEMANA_TECH,
    codigo: "H4TR-9WNB",
    rotulo: "Jurado 1",
    estado: "USADO",
    participacaoId: "par-bruno-st",
    resgatadoEm: "2026-10-10T19:00:00-03:00",
  }),
  convite({
    id: "conv-st-3",
    eventoId: ID_SEMANA_TECH,
    codigo: "F3WJ-8RNK",
    rotulo: "Jurado 3",
    estado: "USADO",
    participacaoId: "par-fabio-st",
    resgatadoEm: "2026-10-11T09:30:00-03:00",
  }),
  convite({ id: "conv-st-4", eventoId: ID_SEMANA_TECH, codigo: "P8CD-2VXF", rotulo: null, estado: "REVOGADO" }),
  convite({
    id: "conv-st-5",
    eventoId: ID_SEMANA_TECH,
    codigo: "M6ZQ-4KTA",
    rotulo: null,
    validadeAte: "2026-10-20T23:59:00-03:00", // anterior a T0: expirado (derivado)
  }),
  convite({ id: "conv-fv-1", eventoId: ID_FESTIVAL, codigo: "R5HN-7DCW", rotulo: "Jurado A" }),
  convite({ id: "conv-fv-2", eventoId: ID_FESTIVAL, codigo: "T9VB-3JXG", rotulo: "Jurado B" }),
] satisfies ConviteJurado[];
