"use client";

import { Eye, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { FluxoTotem } from "@/components/totem/FluxoTotem";
import { LogoTotem, MolduraTotem } from "@/components/totem/MolduraTotem";
import { TotemBloqueado } from "@/components/totem/TotemBloqueado";
import { Botao } from "@/components/ui/Botao";
import { situacaoTotem, type DispositivoListado } from "@/dominio/totem";
import { textoBloqueioTotem } from "@/lib/textosTotem";
import { sucesso } from "@/servicos/resultado";
import type { votarInfantil } from "@/servicos/totem";
import type { EventoAtivo } from "@/store/seletores/evento";
import { montarVisaoTotem } from "@/store/seletores/totem";

/**
 * O "voto" do preview: nenhum servidor é chamado e nada é contado. A pausa imita o envio, para a tela "Guardando…" aparecer. O
 * contador (logTotem.md) é de mentira, só para o admin ver a animação: sobe a cada voto de teste, nesta aba.
 */
let votosDoPreview = 0;
const registrarNoPreview: typeof votarInfantil = async () => {
  await new Promise((r) => setTimeout(r, 700));
  votosDoPreview += 1;
  return sucesso({ resultado: "REGISTRADO" as const, sessaoId: "preview", numeroSessao: 1, votosSessao: votosDoPreview, votosTotal: votosDoPreview });
};

/**
 * Preview do totem (página Totens, 24/11/2026): o mesmo fluxo do tablet, com as categorias deste totem, para o admin testar sem o
 * aparelho em mãos. Estritamente visual: o voto não sai daqui. O fluxo roda mesmo com a urna fechada ou o totem pausado (é para
 * testar); a faixa de cima diz o que o aparelho de verdade mostra agora.
 */
export function PreviewTotem({ ativo, totem, aoFechar }: { ativo: EventoAtivo; totem: DispositivoListado; aoFechar: () => void }) {
  const visao = useMemo(
    () => montarVisaoTotem(ativo, { id: totem.id, eventoId: ativo.evento.id, nome: totem.nome, estado: "ATIVO", categoriaIds: totem.categoriaIds }),
    [ativo, totem.id, totem.nome, totem.categoriaIds],
  );
  // O que o aparelho de verdade mostra (com o estado real do totem: pausado, revogado...).
  const real = situacaoTotem(ativo.evento, { eventoId: ativo.evento.id, estado: totem.estado }, visao.candidatos.length);
  const { tema, evento } = ativo;
  const nome = tema.nomeExibicao ?? evento.nome;
  const textoReal = real === "VOTANDO" ? "a votação aberta" : `"${textoBloqueioTotem(real, tema.rotuloCandidatos).titulo}"`;

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = rolagem;
    };
  }, [aoFechar]);

  const logo = <LogoTotem nome={nome} logoUrl={tema.logoUrl} />;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titulo-preview-totem" className="fixed inset-0 z-50 flex flex-col bg-black/80">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-tema-superficie px-4 py-3 text-tema-texto sm:px-6">
        <Eye aria-hidden className="size-5 shrink-0 text-tema-primaria-texto" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 id="titulo-preview-totem" className="truncate font-bold">
            Preview: {totem.nome}
          </h2>
          <p className="text-sm text-tema-texto-suave">
            Só para testar. Os votos daqui não são enviados nem contados. No aparelho, agora aparece {textoReal}.
          </p>
        </div>
        <Botao autoFocus variante="contorno" tamanho="pequeno" onClick={aoFechar} icone={<X aria-hidden className="size-4" />}>
          Fechar preview
        </Botao>
      </div>

      {/* A moldura imita o tablet deitado; o conteúdo é o mesmo do quiosque (MolduraTotem mede tudo pelo próprio tamanho). */}
      <div className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6">
        <div className="relative flex aspect-[4/3] max-h-full w-full max-w-5xl overflow-hidden rounded-[2rem] border-[10px] border-neutral-900 shadow-2xl">
          <MolduraTotem className="relative flex-1">
            {visao.candidatos.length > 0 ? (
              <FluxoTotem
                eventoId={evento.id}
                candidatos={visao.candidatos}
                grupos={visao.grupos}
                logo={logo}
                logoPequeno={<LogoTotem nome={nome} logoUrl={tema.logoUrl} pequeno />}
                aoComecar={() => {}}
                aoFalhar={() => {}}
                registrar={registrarNoPreview}
                gravarLog={false}
              />
            ) : (
              <TotemBloqueado situacao="SEM_CANDIDATOS" rotuloCandidatos={tema.rotuloCandidatos} logo={logo} />
            )}
            <p aria-hidden className="pointer-events-none absolute bottom-1 left-3 text-xs text-tema-texto-suave opacity-60">
              {totem.nome} · preview
            </p>
          </MolduraTotem>
        </div>
      </div>
    </div>
  );
}
