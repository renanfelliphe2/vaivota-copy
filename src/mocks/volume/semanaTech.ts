import type { EstadoApp } from "@/dominio/tipos";
import { hashMock } from "@/lib/hash";
import { T0 } from "@/lib/tempo";
import { registrarAuditoria, type EntradaAuditoria } from "@/store/auditoria";
import { ID_SEMANA_TECH } from "../seed";
import { DISTRIBUICOES } from "./distribuicoes";
import { gerarVolume } from "./gerarVolume";

// Etapa 7 (D10, metas da seção 5.7): volume da Semana Tech no PADRAO (urna aberta das 13h a T0).

export const ABERTURA_SEMANA_TECH = "2026-10-22T13:00:00-03:00";

const IP_HASH = hashMock("ip-demo");

/** Auditoria de configuração e segurança do seed (as de júri vêm do gerador). Ordenada no tempo. */
const AUDITORIA_EXTRA: EntradaAuditoria[] = [
  {
    eventoId: ID_SEMANA_TECH,
    usuarioId: "usr-carla",
    acao: "CONFIG_ALTERADA",
    entidade: "evento",
    entidadeId: ID_SEMANA_TECH,
    detalhes: { campos: ["descricao"] },
    criadoEm: "2026-10-06T10:00:00-03:00",
  },
  {
    eventoId: ID_SEMANA_TECH,
    usuarioId: "usr-carla",
    acao: "TEMA_ALTERADO",
    entidade: "tema",
    entidadeId: ID_SEMANA_TECH,
    detalhes: { campos: ["corSecundaria"], logoTrocado: false },
    criadoEm: "2026-10-07T10:00:00-03:00",
  },
  {
    eventoId: ID_SEMANA_TECH,
    usuarioId: "usr-carla",
    acao: "CONVITE_REVOGADO",
    entidade: "convite_jurado",
    entidadeId: "conv-st-4",
    detalhes: { rotulo: null, substituto: false },
    criadoEm: "2026-10-09T10:00:00-03:00",
  },
  ...[0, 1, 2].map(
    (i): EntradaAuditoria => ({
      eventoId: ID_SEMANA_TECH,
      usuarioId: null,
      acao: "TENTATIVA_CODIGO_INVALIDA",
      entidade: "convite_jurado",
      detalhes: { motivo: "CODIGO_INVALIDO" },
      criadoEm: `2026-10-12T20:0${i}:00-03:00`,
    }),
  ),
  {
    eventoId: ID_SEMANA_TECH,
    usuarioId: null,
    acao: "BLOQUEIO_RATE_LIMIT",
    entidade: "convite_jurado",
    detalhes: { alvo: "CODIGO_CONVITE", segundos: 60 },
    criadoEm: "2026-10-12T20:03:00-03:00",
  },
];

export function aplicarVolumeSemanaTech(estado: EstadoApp): EstadoApp {
  let proximo = gerarVolume(estado, {
    eventoId: ID_SEMANA_TECH,
    distribuicao: DISTRIBUICOES.PADRAO,
    incluirNucleo: true,
    publicos: { cadastrados: 511 },
    jurados: { convidados: 9, convites: "CRIAR" },
    infantil: null,
    auditoria: true,
    janela: { inicio: ABERTURA_SEMANA_TECH, fim: T0 },
    semente: "semana-tech-padrao",
  });
  for (const entrada of AUDITORIA_EXTRA) proximo = registrarAuditoria(proximo, { ...entrada, ipHash: IP_HASH });
  return proximo;
}
