"use client";

import Link from "next/link";
import { chamadaDaSituacao } from "@/dominio/situacaoEvento";
import { LogoEvento } from "@/components/evento/LogoEvento";
import { Botao } from "@/components/ui/Botao";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSituacaoEvento } from "@/store/seletores/situacao";

/** D6: o CTA do header acompanha o principal (mesmo rótulo e destino) e fica visível no mobile. */
export function LandingHeader() {
  const ativo = useEventoAtivo();
  const situacao = useSituacaoEvento();
  if (!ativo || !situacao) return null;
  const { slug, evento, tema } = ativo;
  const chamada = chamadaDaSituacao(situacao);

  return (
    <header className="w-full border-b border-tema-borda">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
        <Link href="/" className="rounded-md">
          <LogoEvento nome={tema.nomeExibicao ?? evento.nome} logoUrl={tema.logoUrl} prioridade />
        </Link>
        {chamada.rotulo && !chamada.desabilitado && (
          <Botao href={`/e/${slug}`} tamanho="pequeno">
            {chamada.rotulo}
          </Botao>
        )}
      </div>
    </header>
  );
}
