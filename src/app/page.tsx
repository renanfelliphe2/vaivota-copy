import { redirect } from "next/navigation";
import { LandingVaiVota } from "@/components/plataforma/LandingVaiVota";

/**
 * Landing da plataforma. Com `EVENTO_PADRAO_SLUG` definido (o evento da vez, como a Maratona Tech Tivit), a raiz do site leva
 * direto para a página do evento. A landing de cada evento é /e/[slug]; o título vem do layout raiz.
 */
export default function Home() {
  const padrao = process.env.EVENTO_PADRAO_SLUG?.trim();
  if (padrao) redirect(`/e/${padrao}`);
  return <LandingVaiVota />;
}
