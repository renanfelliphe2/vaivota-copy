"use client";

import { Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { CampoCandidato, Candidato } from "@/dominio/tipos";
import type { Travas } from "@/dominio/travas";
import type { TipoCampo } from "@/dominio/tipos";
import { LIMITES, limiteDoCampo, validarCandidato, type DadosCandidato } from "@/dominio/validacoesConfig";
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
  /** D1: o item (ou o novo) está sem categoria, e por isso sem campos extras. */
  semCategoria?: boolean;
  travas: Travas;
  aoSalvar: () => void;
  aoCancelar: () => void;
};

/**
 * O formulário não leva a categoria (24/11/2026): o vínculo do item com a categoria é feito na seção Categorias. Sem o campo, o
 * servidor mantém a categoria que o item já tem.
 */
function inicial(c: Candidato | null): DadosCandidato {
  return { titulo: c?.titulo ?? "", imagemUrl: c?.imagemUrl ?? null, camposExtras: { ...(c?.camposExtras ?? {}) } };
}

/** Dica no lugar do contador (24/11/2026): número e data são curtos; o texto e o link mostram "usados/limite". */
const DICA_TIPO: Partial<Record<TipoCampo, string>> = {
  NUMERO: "Só números, como 2026 ou 12,5.",
  DATA: "",
  VIDEO: "Link do YouTube, do Vimeo ou do Google Drive. O vídeo não fica guardado aqui: a página mostra o player do site.",
};

/** Etapa 6 (CP4): título, imagem e valores dos campos extras. Nunca muda publicação nem ordem. */
export function FormCandidato({ eventoId, candidato, campos, semCategoria = false, travas, aoSalvar, aoCancelar }: FormCandidatoProps) {
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

  const [tocados, setTocados] = useState<ReadonlySet<string>>(new Set());
  const erros = { ...validarCandidato(d, { naVotacao, campos }), ...(servico.erro?.campos ?? {}) };
  const temErros = Object.keys(erros).length > 0;
  // 24/11/2026: passar do limite aparece na hora (o texto não é cortado); os demais erros, ao sair do campo ou ao salvar.
  const mostrar = (c: string, passou = false) => (tentou || passou || tocados.has(c) ? (erros[c] ?? null) : null);
  const tocar = (c: string) => setTocados((t) => (t.has(c) ? t : new Set(t).add(c)));
  const mudarCampo = (chave: string, valor: string) => mudar({ camposExtras: { ...d.camposExtras, [chave]: valor } });
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
        <Campo
          id="cand-titulo"
          rotulo="Título"
          obrigatorio
          erro={mostrar("titulo", d.titulo.trim().length > LIMITES.tituloCandidato)}
          dica={`${d.titulo.length}/${LIMITES.tituloCandidato}`}
        >
          <Input value={d.titulo} onChange={(e) => mudar({ titulo: e.target.value })} onBlur={() => tocar("titulo")} />
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
        {campos.map((campo) => {
          const valor = d.camposExtras[campo.chave] ?? "";
          const limite = limiteDoCampo(campo.chave, campo.tipo);
          const chaveErro = `campo:${campo.chave}`;
          const comum = { value: valor, onBlur: () => tocar(chaveErro) };
          return (
            <Campo
              key={campo.chave}
              id={`cand-campo-${campo.chave}`}
              rotulo={campo.rotulo}
              erro={mostrar(chaveErro, valor.trim().length > limite)}
              dica={DICA_TIPO[campo.tipo] ?? `${valor.length}/${limite}`}
            >
              {campo.tipo === "DATA" ? (
                <Input type="date" {...comum} onChange={(e) => mudarCampo(campo.chave, e.target.value)} className="max-w-48" />
              ) : campo.tipo === "NUMERO" ? (
                <Input inputMode="decimal" {...comum} onChange={(e) => mudarCampo(campo.chave, e.target.value)} className="max-w-48" />
              ) : campo.tipo === "LINK" || campo.tipo === "VIDEO" ? (
                <Input
                  type="url"
                  inputMode="url"
                  placeholder={campo.tipo === "VIDEO" ? "https://www.youtube.com/watch?v=..." : "https://"}
                  {...comum}
                  onChange={(e) => mudarCampo(campo.chave, e.target.value)}
                />
              ) : campo.chave === "descricao" ? (
                <Textarea {...comum} onChange={(e) => mudarCampo(campo.chave, e.target.value)} className="min-h-32" />
              ) : (
                <Input {...comum} onChange={(e) => mudarCampo(campo.chave, e.target.value)} />
              )}
            </Campo>
          );
        })}
        {semCategoria && (
          <p className="text-sm text-tema-texto-suave">
            Os campos extras (como Direção ou Duração) são da categoria. Vincule este item a uma categoria em Configuração &gt; Categorias para preenchê-los.
          </p>
        )}
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
