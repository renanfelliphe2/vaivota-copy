import type { Viewport } from "next";
import { TelaTotem } from "@/components/totem/TelaTotem";
import { metadadosDaTela } from "@/servicos/metadados";

/**
 * Totem (rev. 4, A7): modo quiosque, fora do EventoShell e sem RotaGuard (o totem não tem login; a identidade
 * é o aparelho pareado). Sem zoom só aqui (Base/VotoInfantil.md §6); as telas do participante mantêm o zoom.
 */
export default function PaginaTotem() {
  return <TelaTotem />;
}

export const generateMetadata = metadadosDaTela("Totem");

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
