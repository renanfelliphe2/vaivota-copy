import type { Dispositivo } from "@/dominio/tipos";
import { hashMock } from "@/lib/hash";
import { ID_FESTIVAL } from "./eventos";

// Somente leitura (dashboard) até o planner "Totem" (rev. 4, A7). Sem votos até um cenário de volume.

const CRIADO = "2026-10-06T10:00:00-03:00";

export const seedDispositivos = [
  {
    id: "disp-fv-hall",
    eventoId: ID_FESTIVAL,
    nome: "Totem Hall",
    hashToken: hashMock("token-disp-fv-hall"),
    hashPin: hashMock("pin-disp-fv-hall"),
    estado: "ATIVO",
    ultimoUsoEm: null,
    criadoEm: CRIADO,
  },
  {
    id: "disp-fv-patio",
    eventoId: ID_FESTIVAL,
    nome: "Totem Pátio",
    hashToken: hashMock("token-disp-fv-patio"),
    hashPin: hashMock("pin-disp-fv-patio"),
    estado: "PAUSADO",
    ultimoUsoEm: null,
    criadoEm: CRIADO,
  },
  {
    id: "disp-fv-oficinas",
    eventoId: ID_FESTIVAL,
    nome: "Totem Oficinas",
    hashToken: hashMock("token-disp-fv-oficinas"),
    hashPin: null,
    estado: "REVOGADO",
    ultimoUsoEm: null,
    criadoEm: CRIADO,
  },
] satisfies Dispositivo[];
