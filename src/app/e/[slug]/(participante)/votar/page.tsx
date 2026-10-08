import { redirect } from "next/navigation";

/**
 * 08/10/2026: a votação vive na entrada do evento (seção #candidatos). /votar só redireciona, para links antigos,
 * levando o detalhe e o passo (`?candidato=`, `?passo=`).
 */
export default async function PaginaVotar({ params, searchParams }: PageProps<"/e/[slug]/votar">) {
  const { slug } = await params;
  const busca = await searchParams;
  const manter = new URLSearchParams();
  for (const chave of ["candidato", "passo"]) {
    const valor = busca[chave];
    if (typeof valor === "string") manter.set(chave, valor);
  }
  const consulta = manter.size > 0 ? `?${manter}` : "";
  redirect(`/e/${slug}${consulta}#candidatos`);
}
