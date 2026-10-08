import type { Auditoria, HistoricoVotoJuri, Voto, VotoJuri } from "@/dominio/tipos";
import { hashMock } from "@/lib/hash";
import { ID_FESTIVAL, ID_SEMANA_TECH } from "./eventos";

// Votos do núcleo (Semana Tech): 1 Voto (Eva) e 1 VotoJuri (Fábio). O Festival não tem votos.
// O Voto não tem usuário (sigilo); o vínculo de Eva fica só em dev.vinculosVoto ("Resetar meu voto").

export const ID_VOTO_EVA = 1;

export const seedVotos = [
  {
    id: ID_VOTO_EVA,
    eventoId: ID_SEMANA_TECH,
    candidatoId: "cand-st-02",
    hashRecibo: hashMock("recibo-1"),
    criadoEm: "2026-10-22T13:20:00-03:00",
  },
] satisfies Voto[];

export const seedVotosJuri = [
  {
    id: "vj-fabio-st",
    eventoId: ID_SEMANA_TECH,
    participacaoId: "par-fabio-st",
    candidatoId: "cand-st-04",
    criadoEm: "2026-10-22T13:35:00-03:00",
    atualizadoEm: "2026-10-22T13:35:00-03:00",
  },
] satisfies VotoJuri[];

export const seedHistoricoVotosJuri = [
  {
    id: 1,
    votoJuriId: "vj-fabio-st",
    candidatoAnteriorId: null, // primeiro voto (A11)
    candidatoNovoId: "cand-st-04",
    criadoEm: "2026-10-22T13:35:00-03:00",
  },
] satisfies HistoricoVotoJuri[];

export const seedAuditoria = [
  {
    id: 1,
    eventoId: ID_SEMANA_TECH,
    atorUsuarioId: "usr-carla",
    atorDispositivoId: null,
    acao: "EVENTO_ATIVADO",
    entidade: "evento",
    entidadeId: ID_SEMANA_TECH,
    detalhes: null,
    ipHash: null,
    criadoEm: "2026-10-05T10:00:00-03:00",
  },
  {
    id: 2,
    eventoId: ID_FESTIVAL,
    atorUsuarioId: "usr-hugo",
    atorDispositivoId: null,
    acao: "EVENTO_ATIVADO",
    entidade: "evento",
    entidadeId: ID_FESTIVAL,
    detalhes: null,
    ipHash: null,
    criadoEm: "2026-10-06T10:00:00-03:00",
  },
  {
    id: 3,
    eventoId: ID_SEMANA_TECH,
    atorUsuarioId: "usr-bruno",
    atorDispositivoId: null,
    acao: "CONVITE_RESGATADO",
    entidade: "convite_jurado",
    entidadeId: "conv-st-2",
    detalhes: { rotulo: "Jurado 1" },
    ipHash: null,
    criadoEm: "2026-10-10T19:00:00-03:00",
  },
  {
    id: 4,
    eventoId: ID_SEMANA_TECH,
    atorUsuarioId: "usr-fabio",
    atorDispositivoId: null,
    acao: "CONVITE_RESGATADO",
    entidade: "convite_jurado",
    entidadeId: "conv-st-3",
    detalhes: { rotulo: "Jurado 3" },
    ipHash: null,
    criadoEm: "2026-10-11T09:30:00-03:00",
  },
  {
    id: 5,
    eventoId: ID_SEMANA_TECH,
    atorUsuarioId: "usr-carla",
    atorDispositivoId: null,
    acao: "URNA_ABERTA",
    entidade: "evento",
    entidadeId: ID_SEMANA_TECH,
    detalhes: null,
    ipHash: null,
    criadoEm: "2026-10-22T13:00:00-03:00",
  },
] satisfies Auditoria[];

/** Chave `${usuarioId}:${eventoId}` → Voto.id. */
export const seedVinculosVoto: Record<string, number> = {
  [`usr-eva:${ID_SEMANA_TECH}`]: ID_VOTO_EVA,
};
