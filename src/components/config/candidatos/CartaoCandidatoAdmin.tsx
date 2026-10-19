"use client";

import { Ban, CircleCheck, EyeOff, FilePen, Pencil, Trash2, Vote } from "lucide-react";
import type { Travas } from "@/dominio/travas";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { Botao } from "@/components/ui/Botao";
import { Selo } from "@/components/ui/Selo";
import { cx } from "@/lib/classes";
import type { CandidatoAdmin } from "@/store/seletores/candidatosAdmin";

const SELOS = {
  NA_VOTACAO: { texto: "Na votação", variante: "sucesso", icone: CircleCheck },
  RASCUNHO: { texto: "Rascunho", variante: "neutro", icone: FilePen },
  FORA_DA_DISPUTA: { texto: "Fora da disputa", variante: "erro", icone: Ban },
} as const;

export type AcoesCartaoAdmin = {
  aoEditar: (id: string) => void;
  aoPublicar: (id: string, publicado: boolean) => void;
  aoRemover: (id: string) => void;
  aoDesqualificar: (id: string) => void;
};

/**
 * Etapa 6 (CP3): estado em texto neutro com ícone; desqualificado riscado e identificado em texto. 19/10/2026: sem
 * posição nem "Subir"/"Descer": a ordem na votação é aleatória ou alfabética, escolhida para todos na seção.
 */
export function CartaoCandidatoAdmin({
  item,
  travas,
  ocupado,
  acoes,
}: {
  item: CandidatoAdmin;
  travas: Travas;
  ocupado: boolean;
  acoes: AcoesCartaoAdmin;
}) {
  const { candidato, estado } = item;
  const selo = SELOS[estado];
  const podePublicar = travas.permite("CANDIDATOS_PUBLICACAO");
  const podeDesqualificar = travas.permite("CANDIDATOS_DESQUALIFICAR");
  const leitura = travas.fase === "CONCLUIDO";
  const fora = estado === "FORA_DA_DISPUTA";

  return (
    <article aria-labelledby={`adm-${candidato.id}`} className="flex flex-col gap-3 rounded-2xl border border-tema-borda bg-tema-superficie p-3 sm:flex-row">
      <div className="w-full shrink-0 overflow-hidden rounded-xl sm:w-36">
        <ImagemCandidato titulo={candidato.titulo} imagemUrl={candidato.imagemUrl} sizes="144px" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Selo variante={selo.variante} icone={selo.icone}>
            {selo.texto}
          </Selo>
        </div>
        <h3 id={`adm-${candidato.id}`} className={cx("line-clamp-2 font-bold", fora && "line-through")}>
          {candidato.titulo}
        </h3>
        {!candidato.imagemUrl && <p className="text-sm font-medium text-tema-aviso">Sem imagem: obrigatória para colocar na votação.</p>}
        {!leitura && (
          <div className="flex flex-wrap gap-2">
            <Botao variante="contorno" tamanho="pequeno" onClick={() => acoes.aoEditar(candidato.id)} icone={<Pencil aria-hidden className="size-4" />} aria-label={`Editar: ${candidato.titulo}`}>
              Editar
            </Botao>
            {!fora && podePublicar && (
              <Botao
                variante="contorno"
                tamanho="pequeno"
                disabled={ocupado}
                onClick={() => acoes.aoPublicar(candidato.id, !candidato.publicado)}
                icone={candidato.publicado ? <EyeOff aria-hidden className="size-4" /> : <Vote aria-hidden className="size-4" />}
              >
                {candidato.publicado ? "Tirar da votação" : "Colocar na votação"}
              </Botao>
            )}
            {podePublicar && (
              <Botao variante="fantasma" tamanho="pequeno" disabled={ocupado} onClick={() => acoes.aoRemover(candidato.id)} aria-label={`Remover: ${candidato.titulo}`} icone={<Trash2 aria-hidden className="size-4" />}>
                Remover
              </Botao>
            )}
            {podeDesqualificar && !fora && candidato.publicado && (
              <Botao variante="fantasma" tamanho="pequeno" disabled={ocupado} onClick={() => acoes.aoDesqualificar(candidato.id)} icone={<Ban aria-hidden className="size-4" />}>
                Tirar da disputa
              </Botao>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
