import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingVaiVota } from "@/components/plataforma/LandingVaiVota";
import type { VotacaoEncerrada } from "@/dominio/votacoesEncerradas";
import { env } from "@/server/env";
import { listarVotacoesEncerradas } from "@/server/votacoesEncerradas";

// Landing da plataforma em "/". Fica no grupo (plataforma), que não muda o endereço, para que a prévia de compartilhamento
// (./opengraph-image.tsx) valha só para ela: um opengraph-image na raiz desceria para as páginas dos eventos, que têm a
// identidade de cada evento.

const TITULO = "VaiVota · Votação ao vivo para festivais, mostras e premiações";
const DESCRICAO =
  "O público vota pelo celular, o júri por convite e as crianças no totem. Um voto por pessoa, apuração automática e o resultado oficial revelado no telão, com a identidade do seu evento.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: TITULO,
    description: DESCRICAO,
    // Endereço absoluto da imagem de prévia; sem APP_URL, o Next usa o endereço do ambiente.
    metadataBase: urlBase(),
    openGraph: { type: "website", locale: "pt_BR", siteName: "VaiVota", title: TITULO, description: DESCRICAO, url: "/" },
    twitter: { card: "summary_large_image", title: TITULO, description: DESCRICAO },
  };
}

function urlBase(): URL | undefined {
  try {
    return new URL(env.appUrl);
  } catch {
    return undefined;
  }
}

/**
 * Com `EVENTO_PADRAO_SLUG` definido (o evento da vez), a raiz do site leva direto para a página do evento. A landing de
 * cada evento é /e/[slug].
 */
export default async function Home() {
  const padrao = process.env.EVENTO_PADRAO_SLUG?.trim();
  if (padrao) redirect(`/e/${padrao}`);
  return <LandingVaiVota votacoes={await votacoesDaVitrine()} contatoUrl={env.contatoOrganizadoresUrl ?? null} />;
}

/** Se a consulta das votações falhar, a landing sai sem os números e os resultados: o resto da página não depende dela. */
async function votacoesDaVitrine(): Promise<VotacaoEncerrada[]> {
  try {
    return await listarVotacoesEncerradas();
  } catch (erro) {
    console.error("[servidor] não foi possível carregar as votações encerradas:", erro);
    return [];
  }
}
