import type { EstadoApp, EstadoDev } from "@/dominio/tipos";
import { criarConfigSimuladorInicial, criarUiInicial } from "@/store/estadoInicial";

export { criarApresentacaoInicial, criarConfigSimuladorInicial, criarUiInicial, criarVotacaoInicial } from "@/store/estadoInicial";
import {
  seedAuditoria,
  seedCamposCandidato,
  seedCandidatos,
  seedConfigsApresentacao,
  seedConfigsPlacar,
  seedConvites,
  seedCriteriosJuri,
  seedParceiros,
  seedDispositivos,
  seedEventos,
  seedHistoricoVotosJuri,
  seedParticipacoes,
  seedTemas,
  seedUsuarios,
  seedVinculosVoto,
  seedVotos,
  seedVotosJuri,
} from "./seed";

function criarDevInicial(): EstadoDev {
  return {
    slugPadrao: "ver-e-fazer-filmes",
    latenciaMs: 400,
    simularErroRede: false,
    falhaProxima: "NENHUMA",
    simularVotosEntrando: false,
    simuladorVotos: criarConfigSimuladorInicial(),
    toolbarModo: "AUTO",
    toolbarRecolhida: true,
    toolbarAvancadas: false,
    vinculosVoto: { ...seedVinculosVoto },
    simularTrailerFalha: false,
  };
}

/** Seeds do núcleo (Etapa 0). Pura: devolve uma cópia nova e independente a cada chamada. */
export function criarEstadoNucleo(): EstadoApp {
  const banco: EstadoApp["banco"] = structuredClone({
    sequencias: {
      voto: seedVotos.length,
      historicoVotoJuri: seedHistoricoVotosJuri.length,
      votoInfantil: 0,
      auditoria: seedAuditoria.length,
    },
    eventos: seedEventos,
    temas: seedTemas,
    configsPlacar: seedConfigsPlacar,
    configsApresentacao: seedConfigsApresentacao,
    camposCandidato: seedCamposCandidato,
    candidatos: seedCandidatos,
    usuarios: seedUsuarios,
    participacoes: seedParticipacoes,
    convitesJurado: seedConvites,
    votos: seedVotos,
    votosJuri: seedVotosJuri,
    historicoVotosJuri: seedHistoricoVotosJuri,
    criteriosJuri: seedCriteriosJuri,
    notasJuri: [],
    escolhasCriterioJuri: [],
    parceiros: seedParceiros,
    dispositivos: seedDispositivos,
    votosInfantis: [],
    resultados: [],
    auditoria: seedAuditoria,
  });
  return { banco, sessao: { usuarioId: null }, ui: criarUiInicial(), dev: criarDevInicial() };
}
