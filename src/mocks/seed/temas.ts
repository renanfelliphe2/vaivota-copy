import type { Tema } from "@/dominio/tipos";
import { ID_FESTIVAL } from "./eventos";

// Cores de marca só existem aqui (e em globals.css / components/dev). D15: texto sobre a marca é derivado.

export const seedTemas = [
  {
    eventoId: ID_FESTIVAL,
    nomeExibicao: null,
    logoUrl: "/festival-ver-e-fazer-filmes-logo.webp",
    capaUrl: null,
    corPrimaria: "#F15A29",
    corSecundaria: "#8DC63F",
    corFundo: "#FFFFFF",
    corTexto: "#18181B",
    fonte: "Inter",
    rotuloCandidato: "Curta",
    rotuloCandidatos: "Curtas",
    textosEstado: {
      NAO_INICIADA: {
        titulo: "A votação abre durante o festival",
        corpo: "Crie sua conta agora. Quando as sessões começarem, é só voltar aqui para escolher seu curta favorito.",
      },
      ENCERRADA: {
        titulo: "Votação encerrada",
        corpo: "Obrigado por participar! O resultado será revelado na cerimônia de encerramento do festival.",
      },
      JA_VOTOU: {
        titulo: "Seu voto está registrado",
        corpo: "Obrigado por fazer parte do festival!",
      },
      SUCESSO: {
        titulo: "Voto confirmado!",
        corpo: "Obrigado por fazer parte do festival. Acompanhe a revelação na cerimônia de encerramento.",
      },
    },
    atualizadoEm: "2026-10-01T09:00:00-03:00",
  },
] satisfies Tema[];

/** Paleta escura oferecida como predefinição na configuração de tema (era a da Maratona Tech Tivit). */
export const PRESET_TEMA_ESCURO = {
  corPrimaria: "#38BDF8",
  corSecundaria: "#A78BFA",
  corFundo: "#0F172A",
  corTexto: "#E2E8F0",
  fonte: "Space Grotesk",
} as const;
