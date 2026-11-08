import { Arvo, Inter, Montserrat, Poppins, Space_Grotesk } from "next/font/google";

// Fontes aprovadas (Etapa 0, seção 5.5). Lista editável pelo dono do produto (rev. 4, E2).
// Cada fonte vira uma variável CSS; lib/tema.ts aponta --tema-fonte para a do evento (variavelDaFonte).
// 19/10/2026: Montserrat fica fora da lista do tema; é só a fonte de títulos da página do evento (font-display),
// a mesma das artes da Maratona Tech Tivit.

const inter = Inter({ subsets: ["latin"], variable: "--fonte-inter", display: "swap" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--fonte-poppins",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--fonte-space-grotesk", display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--fonte-montserrat", display: "swap" });
// 07/11/2026: Arvo (slab geométrica, como as letras do logo do Festival Ver e Fazer Filmes) também fica fora da lista do
// tema; é a fonte de títulos do estilo cinema da página do evento (font-cine). Sem preload: só baixa onde aparece.
const arvo = Arvo({ subsets: ["latin"], weight: ["400", "700"], variable: "--fonte-arvo", display: "swap", preload: false });

export { FONTES_APROVADAS } from "./fontesAprovadas";

/** Classes que expõem as variáveis das fontes; aplicadas no <html> do layout raiz. */
export const classesFontes = [inter.variable, poppins.variable, spaceGrotesk.variable, montserrat.variable, arvo.variable].join(" ");
