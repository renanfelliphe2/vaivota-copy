import type { ComponentType } from "react";
import { SecaoApresentacao } from "./SecaoApresentacao";
import { SecaoDashboard } from "./SecaoDashboard";
import { SecaoTotem } from "./SecaoTotem";
import { SecaoVotacao } from "./SecaoVotacao";

// Registro de seções da toolbar (D17). Cada etapa acrescenta a sua aqui sem editar o núcleo:
// Votação (Etapa 5), Dashboard (Etapa 7), Apresentação (Etapa 8), Totem (rev. 4, A7).
// `grupo` decide se a seção aparece no básico ou dentro de "Opções avançadas" (08/10/2026).

export type SecaoToolbar = {
  id: string;
  titulo: string;
  grupo: "BASICO" | "AVANCADO";
  Componente: ComponentType;
};

export const SECOES_TOOLBAR: SecaoToolbar[] = [
  { id: "votacao", titulo: "Votação", grupo: "AVANCADO", Componente: SecaoVotacao },
  { id: "totem", titulo: "Totem", grupo: "BASICO", Componente: SecaoTotem },
  { id: "dashboard", titulo: "Dashboard", grupo: "AVANCADO", Componente: SecaoDashboard },
  { id: "apresentacao", titulo: "Apresentação", grupo: "AVANCADO", Componente: SecaoApresentacao },
];
