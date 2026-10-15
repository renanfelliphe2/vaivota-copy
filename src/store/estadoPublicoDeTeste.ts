import type { EstadoPublico } from "@/dominio/estadoPublico";
import type { Candidato, Evento } from "@/dominio/tipos";

// Dados de exemplo do estado público, só para os testes do cliente (nenhum teste do servidor usa).

export const AGORA = "2026-10-19T09:00:00-03:00";

export function evento(sobrescrever: Partial<Evento> = {}): Evento {
  return {
    id: "evt-1",
    slug: "semana-tech",
    nome: "Semana Tech",
    descricao: null,
    local: null,
    linkSobre: null,
    fusoHorario: "America/Sao_Paulo",
    estado: "ATIVO",
    estadoUrna: "ABERTA",
    janelaInicio: AGORA,
    janelaFim: "2026-10-19T22:00:00-03:00",
    encerramentoAutomatico: false,
    metodoIdentificacao: "SOMENTE_EMAIL",
    moduloJuri: false,
    moduloInfantil: false,
    bloquearVotoProprio: false,
    avisoPrivacidadeUrl: null,
    prazoAnonimizacaoDias: 90,
    urnaAbertaEm: AGORA,
    urnaEncerradaEm: null,
    concluidoEm: null,
    criadoEm: AGORA,
    atualizadoEm: AGORA,
    ...sobrescrever,
  };
}

export function candidato(id: string, ordem: number): Candidato {
  return {
    id,
    eventoId: "evt-1",
    titulo: `Projeto ${ordem}`,
    descricao: "d",
    imagemUrl: "https://x.supabase.co/storage/v1/object/public/candidatos/a.png",
    publicado: true,
    desqualificado: false,
    ordem,
    camposExtras: null,
    usuarioVinculadoId: null,
    criadoEm: AGORA,
    atualizadoEm: AGORA,
  };
}

export function publico(sobrescrever: Partial<EstadoPublico> = {}): EstadoPublico {
  return {
    agoraMs: Date.parse(AGORA),
    usuario: { id: "u1", nome: "Ana", email: "ana@exemplo.com", emailVerificado: true },
    eventos: [
      {
        evento: evento(),
        tema: {
          eventoId: "evt-1",
          nomeExibicao: "Semana Tech",
          logoUrl: null,
          capaUrl: null,
          corPrimaria: "#38BDF8",
          corSecundaria: "#A78BFA",
          corFundo: "#0F172A",
          corTexto: "#E2E8F0",
          fonte: "Space Grotesk",
          rotuloCandidato: "Projeto",
          rotuloCandidatos: "Projetos",
          textosEstado: null,
          atualizadoEm: AGORA,
        },
        configPlacar: {
          eventoId: "evt-1",
          pesoPopular: 100,
          pesoJuri: 0,
          pesoInfantil: 0,
          regraDesempate: "PUBLICO",
          modoVotoJuri: "VOTO_UNICO",
          atualizadoEm: AGORA,
        },
        configApresentacao: {
          eventoId: "evt-1",
          trailerUrl: null,
          usarTrailerGerado: false,
          incluirCandidatosTrailer: false,
          classificacaoCompleta: false,
          modoAvanco: "AUTOMATICO",
          rotuloCategoriaPublico: "Queridinho do público",
          rotuloCategoriaInfantil: "Preferido das crianças",
          rotuloCategoriaJuri: "Escolha dos jurados",
          parcialAoVivo: false,
          limiarRetaFinalSegundos: 300,
          atualizadoEm: AGORA,
        },
        camposCandidato: [{ id: "c1", eventoId: "evt-1", chave: "equipe", rotulo: "Equipe", ordem: 1 }],
        candidatos: [candidato("k1", 1), candidato("k2", 2)],
        participacao: { id: "p1", usuarioId: "u1", eventoId: "evt-1", papel: "PUBLICO", votou: false },
      },
    ],
    ...sobrescrever,
  };
}
