import { Inter, Poppins, Space_Grotesk } from "next/font/google";

// Fontes aprovadas (Etapa 0, seção 5.5). Lista editável pelo dono do produto (rev. 4, E2).
// Cada fonte vira uma variável CSS; lib/tema.ts aponta --tema-fonte para a do evento (variavelDaFonte).

const inter = Inter({ subsets: ["latin"], variable: "--fonte-inter", display: "swap" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--fonte-poppins",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--fonte-space-grotesk", display: "swap" });

/** Lista usada pelo formulário de tema (Etapa 6). */
export const FONTES_APROVADAS = ["Inter", "Poppins", "Space Grotesk"] as const;

/** Classes que expõem as variáveis das fontes; aplicadas no <html> do layout raiz. */
export const classesFontes = [inter.variable, poppins.variable, spaceGrotesk.variable].join(" ");
