import type { CampoCandidato, ConfigApresentacao, ConfigPlacar, CriterioJuri, Parceiro } from "@/dominio/tipos";
import { ID_FESTIVAL } from "./eventos";

export const seedConfigsPlacar = [
  {
    eventoId: ID_FESTIVAL,
    pesoPopular: 50,
    pesoJuri: 30,
    pesoInfantil: 20,
    regraDesempate: "JURI",
    modoVotoJuri: "VOTO_UNICO",
    atualizadoEm: "2026-10-01T09:00:00-03:00",
  },
] satisfies ConfigPlacar[];

export const seedConfigsApresentacao = [
  {
    eventoId: ID_FESTIVAL,
    trailerUrl: "https://www.youtube.com/watch?v=U4GmYqhTJgk",
    usarTrailerGerado: false,
    incluirCandidatosTrailer: false,
    classificacaoCompleta: false,
    modoAvanco: "MANUAL",
    rotuloCategoriaPublico: "Queridinho do público",
    rotuloCategoriaInfantil: "Preferido das crianças",
    rotuloCategoriaJuri: "Escolha dos jurados",
    parcialAoVivo: false,
    limiarRetaFinalSegundos: 300,
    atualizadoEm: "2026-10-01T09:00:00-03:00",
  },
] satisfies ConfigApresentacao[];

export const seedCamposCandidato = [
  { id: "campo-fv-direcao", eventoId: ID_FESTIVAL, chave: "direcao", rotulo: "Direção", ordem: 1 },
  { id: "campo-fv-duracao", eventoId: ID_FESTIVAL, chave: "duracao", rotulo: "Duração", ordem: 2 },
] satisfies CampoCandidato[];

/** Critérios do júri do Festival (documento de requisitos, §3.3). O modo começa em VOTO_UNICO; a toolbar troca. */
export const seedCriteriosJuri = [
  { id: "crit-fv-direcao", eventoId: ID_FESTIVAL, nome: "Direção", ordem: 1 },
  { id: "crit-fv-roteiro", eventoId: ID_FESTIVAL, nome: "Roteiro", ordem: 2 },
  { id: "crit-fv-fotografia", eventoId: ID_FESTIVAL, nome: "Fotografia", ordem: 3 },
  { id: "crit-fv-som", eventoId: ID_FESTIVAL, nome: "Som", ordem: 4 },
] satisfies CriterioJuri[];

// 08/10/2026: parceiros do Festival (logos em public/parceiros).
export const seedParceiros = [
  { id: "parc-fv-icc", eventoId: ID_FESTIVAL, nome: "Instituto Cidade de Cataguases", logoUrl: "/parceiros/instituto-cidade-de-cataguases.png", ordem: 1 },
  { id: "parc-fv-fabrica", eventoId: ID_FESTIVAL, nome: "Instituto Fábrica do Futuro", logoUrl: "/parceiros/instituto-fabrica-do-futuro.png", ordem: 2 },
  { id: "parc-fv-animaparque", eventoId: ID_FESTIVAL, nome: "Animaparque", logoUrl: "/parceiros/animaparque.png", ordem: 3 },
  { id: "parc-fv-inst-energisa", eventoId: ID_FESTIVAL, nome: "Instituto Energisa", logoUrl: "/parceiros/instituto-energisa.png", ordem: 4 },
  { id: "parc-fv-energisa", eventoId: ID_FESTIVAL, nome: "Energisa", logoUrl: "/parceiros/energisa.png", ordem: 5 },
  { id: "parc-fv-mg", eventoId: ID_FESTIVAL, nome: "Cultura e Turismo de Minas Gerais", logoUrl: "/parceiros/cultura-e-turismo-mg.png", ordem: 6 },
  // A plataforma como parceira de tecnologia do Festival; a organização pode tirar em Configuração → Parceiros.
  { id: "parc-fv-vaivota", eventoId: ID_FESTIVAL, nome: "VaiVota", logoUrl: "/vaivota-logo.png", ordem: 7 },
] satisfies Parceiro[];
