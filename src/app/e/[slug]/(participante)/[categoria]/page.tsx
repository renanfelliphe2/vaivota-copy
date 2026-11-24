import type { Metadata } from "next";
import { Suspense } from "react";
import { PaginaCategoria } from "@/components/categorias/PaginaCategoria";
import { obterMetadadosCategoria } from "@/server/metadados";

/**
 * Página de uma categoria (09/11/2026, Festival): os filmes dela e o voto. Também o destino do QR Code da categoria
 * (/e/[slug]/qr/[categoria]). 24/11/2026: o endereço é o do evento seguido do nome da categoria (/e/[slug]/[categoria]); as
 * outras páginas do evento (votar, admin...) têm pasta própria e vêm antes, e nenhuma categoria recebe esses nomes
 * (ENDERECOS_RESERVADOS). Endereço que não é de categoria nenhuma cai no aviso de categoria não encontrada. A validade do slug e da categoria é resolvida no cliente, como a do evento (D14).
 */
export default function PaginaDaCategoria() {
  return (
    <Suspense>
      <PaginaCategoria />
    </Suspense>
  );
}

export async function generateMetadata({ params }: PageProps<"/e/[slug]/[categoria]">): Promise<Metadata> {
  const { slug, categoria } = await params;
  return obterMetadadosCategoria(slug, categoria);
}
