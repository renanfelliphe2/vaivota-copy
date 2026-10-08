import type { ConviteJurado } from "@/dominio/tipos";
import { hashMock } from "@/lib/hash";
import { normalizarCodigo } from "@/lib/codigos";
import { ID_FESTIVAL } from "./eventos";

// D12: só o hash fica no estado. Os códigos legíveis abaixo existem apenas no seed e no README.
//   Festival: H4TR-9WNB (usado, Bruno), R5HN-7DCW e T9VB-3JXG (disponíveis; os cenários de resultado os consomem)

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
  convite({
    id: "conv-fv-0",
    eventoId: ID_FESTIVAL,
    codigo: "H4TR-9WNB",
    rotulo: "Jurado 1",
    estado: "USADO",
    participacaoId: "par-bruno-fv",
    resgatadoEm: "2026-10-10T19:00:00-03:00",
  }),
  convite({ id: "conv-fv-1", eventoId: ID_FESTIVAL, codigo: "R5HN-7DCW", rotulo: "Jurado A" }),
  convite({ id: "conv-fv-2", eventoId: ID_FESTIVAL, codigo: "T9VB-3JXG", rotulo: "Jurado B" }),
] satisfies ConviteJurado[];
