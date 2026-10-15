import type { Tema } from "./tipos";

// Predefinições de paleta da configuração de tema (Etapa 6, D18). Valores de marca só vivem aqui e no seed do banco.

export type PresetTema = {
  id: string;
  nome: string;
  paleta: Pick<Tema, "corPrimaria" | "corSecundaria" | "corFundo" | "corTexto">;
  fonte: string;
};

export const PRESETS_TEMA: PresetTema[] = [
  {
    id: "festival",
    nome: "Festival",
    paleta: { corPrimaria: "#F15A29", corSecundaria: "#8DC63F", corFundo: "#FFFFFF", corTexto: "#18181B" },
    fonte: "Inter",
  },
  {
    id: "escuro",
    nome: "Escuro",
    paleta: { corPrimaria: "#38BDF8", corSecundaria: "#A78BFA", corFundo: "#0F172A", corTexto: "#E2E8F0" },
    fonte: "Space Grotesk",
  },
];
