"use client";

import { useSearchParams } from "next/navigation";
import { ComoFunciona } from "@/components/landing/ComoFunciona";
import { DestaqueCandidatoProvider } from "@/components/landing/DestaqueCandidato";
import { LandingHero } from "@/components/landing/LandingHero";
import { Parceiros } from "@/components/landing/Parceiros";
import { SecaoVotacao } from "@/components/votacao/SecaoVotacao";
import { Alerta } from "@/components/ui/Alerta";
import { ehRotaInterna } from "@/dominio/acesso";
import { useVisaoEvento } from "@/store/seletores/visao";
import { useSessao } from "@/store/seletores/sessao";
import { AbrirAcessoAutomatico, type IntencaoAcesso } from "./AcessoEvento";
import { BannerRascunho } from "./BannerRascunho";
import { UrnaStatusCard } from "./UrnaStatusCard";

/**
 * Página do evento /e/[slug] (Etapa 2; 08/10/2026: absorveu a landing que ficava em "/", que agora é a do VaiVota).
 * Hero, a votação (SecaoVotacao), "Como funciona" e os parceiros (19/10/2026: a votação subiu para logo depois do hero;
 * mostrar os candidatos e levar ao voto é o objetivo da página). A faixa de status fica presa no cabeçalho (CabecalhoEvento).
 * Mesmo desenho para todos, logado ou não (08/10/2026: o da visita); muda só o que cada botão consegue fazer. As
 * diferenças por papel virão depois. Nunca mostra resultado. `?de=`/`?acesso=` (volta de login) abrem o acesso.
 */
export function EntradaEvento() {
  const visao = useVisaoEvento();
  const { logado } = useSessao();
  const busca = useSearchParams();
  const de = busca.get("de");
  const acesso = busca.get("acesso");
  const erroGoogle = busca.get("erro") === "google";
  const intencao: IntencaoAcesso | undefined = acesso === "entrar" || acesso === "criar" ? acesso : undefined;
  if (!visao) return null;
  const deInterno = ehRotaInterna(de) ? de : undefined;

  if (visao.variante === "INDISPONIVEL") {
    // Casca mínima (D2): sem hero.
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
        <UrnaStatusCard visao={visao} tituloComoH1 />
      </div>
    );
  }

  return (
    <>
      {visao.bannerRascunho && <BannerRascunho />}
      {erroGoogle && !logado && (
        <div className="mx-auto w-full max-w-3xl px-4 pt-4 sm:px-6">
          <Alerta variante="erro">Não foi possível entrar com o Google. Tente de novo ou use seu e-mail e senha.</Alerta>
        </div>
      )}
      {/* 19/10/2026: o mosaico do hero destaca um cartão da lista (os outros em tons de cinza). */}
      <DestaqueCandidatoProvider>
        <LandingHero />
        {!logado && <AbrirAcessoAutomatico de={deInterno} intencao={intencao} />}
        <SecaoVotacao />
      </DestaqueCandidatoProvider>
      <ComoFunciona />
      <Parceiros />
    </>
  );
}
