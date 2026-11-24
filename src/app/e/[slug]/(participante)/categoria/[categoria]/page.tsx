import { redirect } from "next/navigation";
import { rotaCategoria } from "@/dominio/categorias";
import { db } from "@/server/db";

/**
 * Endereço antigo da categoria (/e/[slug]/categoria/[categoria], até 24/11/2026), que pode estar num QR Code já impresso. Leva
 * ao endereço novo (/e/[slug]/[categoria]). Na correção dos endereços para o nome inteiro, o antigo pode ter virado o começo do
 * novo ("usina-criativa" → "usina-criativa-de-cinema"): se só uma categoria do evento começa assim, vai para ela. Sem nenhuma,
 * vai para a página do evento.
 */
export default async function EnderecoAntigoDaCategoria({ params }: PageProps<"/e/[slug]/categoria/[categoria]">) {
  const { slug, categoria } = await params;
  const antigo = decodeURIComponent(categoria);
  const categorias = await db().categoria.findMany({ where: { evento: { slug } }, select: { slug: true } });
  const exata = categorias.find((c) => c.slug === antigo);
  const comecaAssim = categorias.filter((c) => c.slug.startsWith(`${antigo}-`));
  const destino = exata ?? (comecaAssim.length === 1 ? comecaAssim[0] : null);
  redirect(destino ? rotaCategoria(slug, destino.slug) : `/e/${slug}`);
}
