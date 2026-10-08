import type { EstadoApp, EstadoDev, EstadoUi, EstadoUiApresentacao, EstadoUiVotacao } from "@/dominio/tipos";
import {
  seedAuditoria,
  seedCamposCandidato,
  seedCandidatos,
  seedConfigsApresentacao,
  seedConfigsPlacar,
  seedConvites,
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

export function criarApresentacaoInicial(): EstadoUiApresentacao {
  return { chave: null, modoSala: "REAL", cenarioEnsaioId: null, modoAvancoLocal: null, revelacao: null };
}

export function criarVotacaoInicial(): EstadoUiVotacao {
  return { chave: null, selecaoId: null, envio: "OCIOSO", falhaEnvio: null, ultimoVoto: null, aviso: null };
}

export function criarUiInicial(): EstadoUi {
  return {
    palcoAtivo: false,
    apresentacao: criarApresentacaoInicial(),
    bloqueioCodigo: { falhas: 0, ateMs: null },
    bloqueioLoginCodigo: { falhas: 0, ateMs: null },
    bloqueioSenha: { falhas: 0, ateMs: null },
    loginPendente: null,
    reenvioVerificacaoAteMs: null,
    votacao: criarVotacaoInicial(),
    dashboard: { resultadoVisivel: null },
    acesso: null,
    totem: { dispositivoId: null, quiosqueAtivo: false },
  };
}

function criarDevInicial(): EstadoDev {
  return {
    slugPadrao: "ver-e-fazer-filmes",
    latenciaMs: 400,
    simularErroRede: false,
    falhaProxima: "NENHUMA",
    simularVotosEntrando: false,
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
    dispositivos: seedDispositivos,
    votosInfantis: [],
    resultados: [],
    auditoria: seedAuditoria,
  });
  return { banco, sessao: { usuarioId: null }, ui: criarUiInicial(), dev: criarDevInicial() };
}
