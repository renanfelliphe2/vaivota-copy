import type { Auditoria, HistoricoVotoJuri, Voto, VotoJuri } from "@/dominio/tipos";
import { ID_FESTIVAL } from "./eventos";

// O seed começa sem votos: a demonstração mostra o primeiro voto de cada conta.
// Votos em volume vêm dos cenários de resultado ou do "Simular votos entrando".

export const seedVotos: Voto[] = [];

export const seedVotosJuri: VotoJuri[] = [];

export const seedHistoricoVotosJuri: HistoricoVotoJuri[] = [];

export const seedAuditoria = [
  {
    id: 1,
    eventoId: ID_FESTIVAL,
    atorUsuarioId: "usr-carla",
    atorDispositivoId: null,
    acao: "EVENTO_ATIVADO",
    entidade: "evento",
    entidadeId: ID_FESTIVAL,
    detalhes: null,
    ipHash: null,
    criadoEm: "2026-10-06T10:00:00-03:00",
  },
  {
    id: 2,
    eventoId: ID_FESTIVAL,
    atorUsuarioId: "usr-bruno",
    atorDispositivoId: null,
    acao: "CONVITE_RESGATADO",
    entidade: "convite_jurado",
    entidadeId: "conv-fv-0",
    detalhes: { rotulo: "Jurado 1" },
    ipHash: null,
    criadoEm: "2026-10-10T19:00:00-03:00",
  },
] satisfies Auditoria[];

/** Chave `${usuarioId}:${eventoId}` → Voto.id (só "Resetar meu voto"). */
export const seedVinculosVoto: Record<string, number> = {};
