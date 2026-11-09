"use client";

import { Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { CampoCandidato, Candidato, Categoria } from "@/dominio/tipos";
import type { Travas } from "@/dominio/travas";
import { validarCandidato, type DadosCandidato } from "@/dominio/validacoesConfig";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input, Select, Textarea } from "@/components/ui/Campo";
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
  /** Categorias do evento (09/11/2026). Vazio: sem o campo de categoria. */
  categorias: Categoria[];
  travas: Travas;
  aoSalvar: () => void;
  aoCancelar: () => void;
};

/** Com categorias, o formulário manda a categoria (null = sem); sem categorias, nem leva o campo (o servidor não muda nada). */
function inicial(c: Candidato | null, comCategorias: boolean): DadosCandidato {
  const base = { titulo: c?.titulo ?? "", imagemUrl: c?.imagemUrl ?? null, camposExtras: { ...(c?.camposExtras ?? {}) } };
  return comCategorias ? { ...base, categoriaId: c?.categoriaId ?? null } : base;
}

/** Etapa 6 (CP4): título, imagem e valores dos campos extras. Nunca muda publicação nem ordem. */
export function FormCandidato({ eventoId, candidato, campos, categorias, travas, aoSalvar, aoCancelar }: FormCandidatoProps) {
  const comCategorias = categorias.length > 0;
  const salvo = inicial(candidato, comCategorias);
  // Mudar de categoria trava com a urna aberta (o voto de cada pessoa é por categoria).
  const podeCategoria = candidato === null || travas.permite("CATEGORIAS_ESTRUTURA");
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
        {comCategorias && (
          <Campo
            id="cand-categoria"
            rotulo="Categoria"
            erro={servico.erro?.campos?.categoriaId ?? null}
            dica={
              podeCategoria
                ? "Cada categoria tem a sua página e o seu voto. Sem categoria, o item não entra na votação."
                : "Com a votação aberta, o item não muda de categoria."
            }
          >
            <Select
              value={d.categoriaId ?? ""}
              disabled={!podeCategoria}
              onChange={(e) => mudar({ categoriaId: e.target.value || null })}
            >
              <option value="">Sem categoria</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.premio ? `${c.nome} · ${c.premio}` : c.nome}
                </option>
              ))}
            </Select>
          </Campo>
        )}
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
          <Campo
            key={campo.chave}
            id={`cand-campo-${campo.chave}`}
            rotulo={campo.rotulo}
            erro={mostrar(`campo:${campo.chave}`)}
            dica={campo.chave === "descricao" ? `${(d.camposExtras[campo.chave] ?? "").length}/1500` : undefined}
          >
            {campo.chave === "descricao" ? (
              <Textarea
                value={d.camposExtras[campo.chave] ?? ""}
                onChange={(e) => mudar({ camposExtras: { ...d.camposExtras, [campo.chave]: e.target.value } })}
                maxLength={1500}
                className="min-h-32"
              />
            ) : (
              <Input
                value={d.camposExtras[campo.chave] ?? ""}
                onChange={(e) => mudar({ camposExtras: { ...d.camposExtras, [campo.chave]: e.target.value } })}
                maxLength={200}
              />
            )}
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
