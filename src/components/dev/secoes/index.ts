import type { ComponentType } from "react";
import { SecaoApresentacao } from "./SecaoApresentacao";
import { SecaoDashboard } from "./SecaoDashboard";
import { SecaoVotacao } from "./SecaoVotacao";

// Registro de seções da toolbar (D17). Cada etapa acrescenta a sua aqui sem editar o núcleo:
// Votação (Etapa 5), Dashboard (Etapa 7), Apresentação (Etapa 8).

export type SecaoToolbar = {
  id: string;
  titulo: string;
  Componente: ComponentType;
};

export const SECOES_TOOLBAR: SecaoToolbar[] = [
  { id: "votacao", titulo: "Votação", Componente: SecaoVotacao },
  { id: "dashboard", titulo: "Dashboard", Componente: SecaoDashboard },
  { id: "apresentacao", titulo: "Apresentação", Componente: SecaoApresentacao },
];
