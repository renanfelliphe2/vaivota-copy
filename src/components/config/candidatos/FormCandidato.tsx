"use client";

import { Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { CampoCandidato, Candidato } from "@/dominio/tipos";
import type { Travas } from "@/dominio/travas";
import { validarCandidato, type DadosCandidato } from "@/dominio/validacoesConfig";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input, Textarea } from "@/components/ui/Campo";
import { criarCandidato, salvarCandidato } from "@/servicos/candidatosAdmin";
import { DialogoMotivo } from "../DialogoMotivo";
import { useFormularioSujo } from "../FormularioSujoProvider";
import { useServico } from "../useServico";
import { SeletorImagem } from "./SeletorImagem";

export type FormCandidatoProps = {
  eventoId: string;
  /** null = novo. */
  candidato: Candidato | null;
  campos: CampoCandidato[];
  travas: Travas;
  aoSalvar: () => void;
  aoCancelar: () => void;
};

function inicial(c: Candidato | null): DadosCandidato {
  return { titulo: c?.titulo ?? "", descricao: c?.descricao ?? "", imagemUrl: c?.imagemUrl ?? null, camposExtras: { ...(c?.camposExtras ?? {}) } };
}

/** Etapa 6 (CP4): título, descrição, imagem e valores dos campos extras. Nunca muda publicação nem ordem. */
export function FormCandidato({ eventoId, candidato, campos, travas, aoSalvar, aoCancelar }: FormCandidatoProps) {
  const salvo = inicial(candidato);
  const [d, setD] = useState<DadosCandidato>(salvo);
  const [tentou, setTentou] = useState(false);
  const [pedirMotivo, setPedirMotivo] = useState(false);
  const { marcarSujo } = useFormularioSujo();
  const servico = useServico();
  const naVotacao = candidato?.publicado ?? false;
  const nivel = travas.nivel("CANDIDATOS_CORRIGIR");
  const auditado = candidato !== null && nivel === "AUDITADO";
  const pode = candidato ? travas.permite("CANDIDATOS_CORRIGIR") : travas.permite("CANDIDATOS_PUBLICACAO");

  const erros = { ...validarCandidato(d, { naVotacao }), ...(servico.erro?.campos ?? {}) };
  const temErros = Object.keys(erros).length > 0;
  const mostrar = (c: string) => (tentou ? (erros[c] ?? null) : null);
  const alterado = JSON.stringify(d) !== JSON.stringify(salvo);

  const mudar = (mudanca: Partial<DadosCandidato>) => {
    setD((atual) => ({ ...atual, ...mudanca }));
    marcarSujo(true);
  };

  /** Revoga o `blob:` do rascunho que for descartado; o salvo nunca (D12). */
  const revogarSeDescartado = (url: string | null) => {
    if (url?.startsWith("blob:") && url !== salvo.imagemUrl) URL.revokeObjectURL(url);
  };

  async function salvar(motivo?: string) {
    const r = await servico.executar(() =>
      candidato ? salvarCandidato(eventoId, candidato.id, d, motivo) : criarCandidato(eventoId, d).then((x) => (x.ok ? { ok: true as const, dados: null } : x)),
    );
    setPedirMotivo(false);
    if (r.ok) {
      marcarSujo(false);
      aoSalvar();
    }
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (temErros || !alterado) return;
    if (auditado) setPedirMotivo(true);
    else void salvar();
  }

  function cancelar() {
    revogarSeDescartado(d.imagemUrl);
    aoCancelar();
  }

  return (
    <form onSubmit={enviar} noValidate aria-busy={servico.carregando || undefined} className="flex flex-col gap-4">
      {auditado && (
        <Alerta variante="aviso">Com a urna {travas.fase === "URNA_ABERTA" ? "aberta" : "encerrada"}, a correção pede confirmação e fica registrada.</Alerta>
      )}
      {tentou && temErros && <Alerta variante="erro">Confira os campos destacados.</Alerta>}
      <fieldset disabled={!pode} className="flex flex-col gap-4">
        <Campo id="cand-titulo" rotulo="Título" obrigatorio erro={mostrar("titulo")} dica={`${d.titulo.length}/150`}>
          <Input value={d.titulo} onChange={(e) => mudar({ titulo: e.target.value })} maxLength={150} />
        </Campo>
        <Campo id="cand-descricao" rotulo="Descrição" obrigatorio erro={mostrar("descricao")} dica={`${d.descricao.length}/1500`}>
          <Textarea value={d.descricao} onChange={(e) => mudar({ descricao: e.target.value })} maxLength={1500} className="min-h-32" />
        </Campo>
        <SeletorImagem
          titulo={d.titulo}
          valor={d.imagemUrl}
          podeRemover={!naVotacao}
          erro={mostrar("imagemUrl")}
          aoMudar={(url) => {
            revogarSeDescartado(d.imagemUrl);
            mudar({ imagemUrl: url });
          }}
        />
        {campos.map((campo) => (
          <Campo key={campo.chave} id={`cand-campo-${campo.chave}`} rotulo={campo.rotulo} erro={mostrar(`campo:${campo.chave}`)}>
            <Input
              value={d.camposExtras[campo.chave] ?? ""}
              onChange={(e) => mudar({ camposExtras: { ...d.camposExtras, [campo.chave]: e.target.value } })}
              maxLength={200}
            />
          </Campo>
        ))}
      </fieldset>
      <div className="flex flex-col-reverse gap-2 border-t border-tema-borda pt-4 sm:flex-row sm:justify-end">
        <Botao variante="contorno" onClick={cancelar} disabled={servico.carregando}>
          Cancelar
        </Botao>
        {pode && (
          <Botao type="submit" disabled={!alterado} carregando={servico.carregando} icone={<Save aria-hidden className="size-4" />}>
            Salvar
          </Botao>
        )}
      </div>
      <DialogoMotivo
        key={String(pedirMotivo)}
        aberto={pedirMotivo}
        titulo="Confirmar correção"
        consequencia="A correção aparece na hora para quem está votando e fica registrada na auditoria."
        rotuloConfirmar="Salvar correção"
        carregando={servico.carregando}
        aoFechar={() => setPedirMotivo(false)}
        aoConfirmar={(motivo) => void salvar(motivo)}
      />
    </form>
  );
}
