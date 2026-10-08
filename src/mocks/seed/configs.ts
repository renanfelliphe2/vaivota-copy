import type { CampoCandidato, ConfigApresentacao, ConfigPlacar } from "@/dominio/tipos";
import { ID_FESTIVAL } from "./eventos";

export const seedConfigsPlacar = [
  {
    eventoId: ID_FESTIVAL,
    pesoPopular: 50,
    pesoJuri: 30,
    pesoInfantil: 20,
    regraDesempate: "JURI",
    atualizadoEm: "2026-10-01T09:00:00-03:00",
  },
] satisfies ConfigPlacar[];

export const seedConfigsApresentacao = [
  {
    eventoId: ID_FESTIVAL,
    trailerUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", // placeholder
    usarTrailerGerado: false,
    incluirCandidatosTrailer: false,
    classificacaoCompleta: false,
    modoAvanco: "AUTOMATICO",
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
