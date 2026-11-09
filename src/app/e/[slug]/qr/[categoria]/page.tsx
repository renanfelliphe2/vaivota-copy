import type { Metadata } from "next";
import { TelaQrCategoria } from "@/components/categorias/TelaQrCategoria";
import { obterMetadadosCategoria } from "@/server/metadados";

/**
 * QR Code de uma categoria em tela cheia, para o telão (09/11/2026, Festival). Fora do EventoShell e sem login: só mostra
 * o endereço público da página da categoria. O cabeçalho do evento some nesta rota (CabecalhoEvento).
 */
export default function PaginaQrCategoria() {
  return <TelaQrCategoria />;
}

export async function generateMetadata({ params }: PageProps<"/e/[slug]/qr/[categoria]">): Promise<Metadata> {
  const { slug, categoria } = await params;
  const base = await obterMetadadosCategoria(slug, categoria);
  return { ...base, title: `QR Code · ${String(base.title ?? "VaiVota")}`, robots: { index: false } };
}
