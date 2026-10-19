import type { Evento } from "@/dominio/tipos";

// Datas absolutas (D6). Protótipo só do Festival: a Maratona Tech Tivit trabalha direto com dados reais (fora do mock).

export const ID_FESTIVAL = "evt-ver-e-fazer-filmes";

export const seedEventos = [
  {
    id: ID_FESTIVAL,
    slug: "ver-e-fazer-filmes",
    nome: "9º Festival Ver e Fazer Filmes",
    descricao:
      "Uma plataforma feita para o público viver o concurso de curtas-metragens de pertinho: assista, vote e acompanhe seus favoritos em tempo real.",
    local: "Cataguases · MG", // mock-only
    linkSobre: "https://festivalverefazerfilmes.org.br/", // mock-only
    fusoHorario: "America/Sao_Paulo",
    estado: "ATIVO",
    estadoUrna: "NAO_INICIADA",
    janelaInicio: "2026-11-25T10:00:00-03:00",
    janelaFim: "2026-11-28T20:00:00-03:00",
    encerramentoAutomatico: true,
    metodoIdentificacao: "GOOGLE_OU_EMAIL",
    moduloJuri: true,
    moduloInfantil: true,
    bloquearVotoProprio: true,
    avisoPrivacidadeUrl: "https://festivalverefazerfilmes.org.br/privacidade", // placeholder externo
    prazoAnonimizacaoDias: 90,
    urnaAbertaEm: null,
    urnaEncerradaEm: null,
    concluidoEm: null,
    criadoEm: "2026-09-15T10:00:00-03:00",
    atualizadoEm: "2026-10-01T09:00:00-03:00",
  },
] satisfies Evento[];
