import { CandidatosPrevia } from "@/components/landing/CandidatosPrevia";
import { ComoFunciona } from "@/components/landing/ComoFunciona";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { StatusUrna } from "@/components/landing/StatusUrna";
import { obterMetadadosEvento } from "@/servicos/metadados";

export const generateMetadata = () => obterMetadadosEvento();

export default function Home() {
  return (
    <>
      <LandingHeader />
      <main id="conteudo" className="flex flex-1 flex-col">
        <StatusUrna />
        <LandingHero />
        <ComoFunciona />
        <CandidatosPrevia />
      </main>
      <LandingFooter />
    </>
  );
}
