import { hashPinTotem } from "@/dominio/totem";
import type { Dispositivo } from "@/dominio/tipos";
import { hashMock } from "@/lib/hash";
import { ID_FESTIVAL } from "./eventos";

// Totens do Festival (rev. 4, A7). Sem votos até um cenário de volume ou um voto pelo totem.
// O pareamento é simulado pela toolbar (seção Totem): não há tela de pareamento nem de gestão ainda.

const CRIADO = "2026-10-06T10:00:00-03:00";

/** PIN de saída do modo quiosque nos totens do seed (só protótipo). */
export const PIN_TOTEM_SEED = "1234";

export const seedDispositivos = [
  {
    id: "disp-fv-hall",
    eventoId: ID_FESTIVAL,
    nome: "Totem Hall",
    hashToken: hashMock("token-disp-fv-hall"),
    hashPin: hashPinTotem("disp-fv-hall", PIN_TOTEM_SEED),
    estado: "ATIVO",
    ultimoUsoEm: null,
    criadoEm: CRIADO,
  },
  {
    id: "disp-fv-patio",
    eventoId: ID_FESTIVAL,
    nome: "Totem Pátio",
    hashToken: hashMock("token-disp-fv-patio"),
    hashPin: hashPinTotem("disp-fv-patio", PIN_TOTEM_SEED),
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
