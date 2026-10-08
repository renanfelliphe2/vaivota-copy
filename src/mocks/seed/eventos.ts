import type { Evento } from "@/dominio/tipos";

// Datas absolutas (D6). As da Semana Tech são placeholders dentro da semana real (18/10/2026; rev. 4, E3).

export const ID_SEMANA_TECH = "evt-semana-tech";
export const ID_FESTIVAL = "evt-ver-e-fazer-filmes";

export const seedEventos = [
  {
    id: ID_SEMANA_TECH,
    slug: "semana-tech",
    nome: "Semana Tech",
    descricao:
      "Uma semana de projetos, oficinas e demonstrações feitas por estudantes. Conheça os projetos finalistas e escolha o seu favorito.",
    local: "Cataguases · MG", // mock-only (placeholder)
    linkSobre: null, // mock-only
    fusoHorario: "America/Sao_Paulo",
    estado: "ATIVO",
    estadoUrna: "ABERTA",
    janelaInicio: "2026-10-22T13:00:00-03:00",
    janelaFim: "2026-10-22T17:00:00-03:00",
    encerramentoAutomatico: true,
    metodoIdentificacao: "GOOGLE_OU_EMAIL",
    moduloJuri: true,
    moduloInfantil: false,
    bloquearVotoProprio: true,
    avisoPrivacidadeUrl: null,
    prazoAnonimizacaoDias: 90,
    urnaAbertaEm: "2026-10-22T13:00:00-03:00",
    urnaEncerradaEm: null,
    concluidoEm: null,
    criadoEm: "2026-09-01T10:00:00-03:00",
    atualizadoEm: "2026-10-22T13:00:00-03:00",
  },
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
