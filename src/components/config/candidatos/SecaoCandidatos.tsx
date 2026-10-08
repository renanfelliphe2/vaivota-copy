"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Travas } from "@/dominio/travas";
import { Botao } from "@/components/ui/Botao";
import { DialogoConfirmacao } from "@/components/ui/DialogoConfirmacao";
import { minusculas } from "@/lib/rotulos";
import {
  alterarPublicacao,
  desqualificarCandidato,
  removerCandidato,
  reordenarCandidato,
} from "@/servicos/candidatosAdmin";
import { useCandidatosAdmin } from "@/store/seletores/candidatosAdmin";
import { useEventoAtivo } from "@/store/seletores/evento";
import { BannerTrava } from "../BannerTrava";
import { DicaTrava } from "../DicaTrava";
import { useServico } from "../useServico";
import { CamposExtrasEditor } from "./CamposExtrasEditor";
import { DesqualificarDialog } from "./DesqualificarDialog";
import { ListaCandidatosAdmin } from "./ListaCandidatosAdmin";
import { PainelCandidato } from "./PainelCandidato";

/** Seção Candidatos (Etapa 6, CP3 e CP4). O painel de edição vive em ?editar=<id|novo>. */
export function SecaoCandidatos({ travas }: { travas: Travas }) {
  const ativo = useEventoAtivo();
  const dados = useCandidatosAdmin();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const servico = useServico();
  const [remover, setRemover] = useState<string | null>(null);
  const [desqualificar, setDesqualificar] = useState<string | null>(null);
  if (!ativo || !dados) return null;

  const eventoId = ativo.evento.id;
  const { tema } = ativo;
  const editar = params.get("editar");
  const candidatoEditado = editar && editar !== "novo" ? (dados.itens.find((i) => i.candidato.id === editar)?.candidato ?? null) : null;
  const podeAdicionar = travas.permite("CANDIDATOS_PUBLICACAO");
  const titulo = (id: string | null) => dados.itens.find((i) => i.candidato.id === id)?.candidato.titulo ?? "";

  const abrirPainel = (valor: string) => router.replace(`${pathname}?secao=candidatos&editar=${encodeURIComponent(valor)}`, { scroll: false });
  const fecharPainel = () => router.replace(`${pathname}?secao=candidatos`, { scroll: false });

  return (
    <section aria-labelledby="titulo-secao" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-secao" tabIndex={-1} className="text-2xl font-bold">
          {tema.rotuloCandidatos}
        </h2>
        {podeAdicionar && (
          <Botao
            onClick={() => abrirPainel("novo")}
            aria-label={`Adicionar à lista de ${minusculas(tema.rotuloCandidatos)}`}
            icone={<Plus aria-hidden className="size-4" />}
          >
            Adicionar
          </Botao>
        )}
      </div>
      <BannerTrava travas={travas} acoes={["CANDIDATOS_PUBLICACAO", "CANDIDATOS_CORRIGIR", "CAMPOS_EXTRAS_ESTRUTURA"]} />
      <p className="font-semibold">
        Na votação: {dados.naVotacao} <span className="font-normal text-tema-texto-suave">(mínimo 2 para ativar)</span>
      </p>
      <DicaTrava motivo={podeAdicionar ? null : travas.motivo("CANDIDATOS_PUBLICACAO")} />
      {travas.nivel("CANDIDATOS_CORRIGIR") === "AUDITADO" && (
        <p className="text-sm text-tema-texto-suave">Corrigir texto ou imagem continua possível, com confirmação e registro. Reordenar é livre.</p>
      )}

      {dados.itens.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-tema-borda p-6">
          <p>A lista de {minusculas(tema.rotuloCandidatos)} está vazia.</p>
          {podeAdicionar && (
            <Botao onClick={() => abrirPainel("novo")} icone={<Plus aria-hidden className="size-4" />}>
              Adicionar o primeiro
            </Botao>
          )}
        </div>
      ) : (
        <ListaCandidatosAdmin
          itens={dados.itens}
          travas={travas}
          ocupado={servico.carregando}
          acoes={{
            aoEditar: abrirPainel,
            aoPublicar: (id, publicado) =>
              void servico.executar(() => alterarPublicacao(eventoId, id, publicado), publicado ? "Colocado na votação" : "Tirado da votação"),
            aoReordenar: (id, direcao) => void servico.executar(() => reordenarCandidato(eventoId, id, direcao), null),
            aoRemover: setRemover,
            aoDesqualificar: setDesqualificar,
          }}
        />
      )}

      <CamposExtrasEditor eventoId={eventoId} campos={dados.campos} candidatos={ativo.candidatos} travas={travas} />

      <PainelCandidato
        editar={editar}
        eventoId={eventoId}
        candidato={candidatoEditado}
        campos={dados.campos}
        rotuloCandidato={tema.rotuloCandidato}
        travas={travas}
        aoFechar={fecharPainel}
      />
      <DialogoConfirmacao
        aberto={remover !== null}
        aoFechar={() => setRemover(null)}
        aoConfirmar={async () => {
          const id = remover;
          if (!id) return;
          const r = await servico.executar(() => removerCandidato(eventoId, id), "Removido");
          if (r.ok) setRemover(null);
        }}
        carregando={servico.carregando}
        titulo={`Remover: ${titulo(remover)}`}
        consequencia="O item sai da lista de vez. Se já tiver recebido voto, a remoção é recusada: tire da votação em vez de remover."
        rotuloConfirmar="Remover"
      />
      <DesqualificarDialog
        aberto={desqualificar !== null}
        titulo={titulo(desqualificar)}
        carregando={servico.carregando}
        aoFechar={() => setDesqualificar(null)}
        aoConfirmar={async (motivo) => {
          const id = desqualificar;
          if (!id) return;
          const r = await servico.executar(() => desqualificarCandidato(eventoId, id, motivo), "Tirado da disputa");
          if (r.ok) setDesqualificar(null);
        }}
      />
    </section>
  );
}
