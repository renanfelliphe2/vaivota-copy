"use client";

import { ArrowDown, ArrowUp, Plus, Save, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import { contarValores } from "@/dominio/camposExtras";
import type { CampoCandidato, Candidato } from "@/dominio/tipos";
import type { Travas } from "@/dominio/travas";
import { LIMITES, validarRotuloCampo } from "@/dominio/validacoesConfig";
import { Botao } from "@/components/ui/Botao";
import { Input } from "@/components/ui/Campo";
import { DialogoConfirmacao } from "@/components/ui/DialogoConfirmacao";
import { salvarCamposExtras, type CampoEditado } from "@/servicos/candidatosAdmin";
import { DialogoMotivo } from "../DialogoMotivo";
import { DicaTrava } from "../DicaTrava";
import { useFormularioSujo } from "../FormularioSujoProvider";
import { useServico } from "../useServico";

type Props = { eventoId: string; campos: CampoCandidato[]; candidatos: Candidato[]; travas: Travas };

/** Etapa 6 (D13): a chave é imutável; remover apaga os valores, depois de confirmar quantos serão afetados. */
export function CamposExtrasEditor(props: Props) {
  return <Editor key={props.campos.map((c) => `${c.chave}:${c.rotulo}`).join("|")} {...props} />;
}

function Editor({ eventoId, campos, candidatos, travas }: Props) {
  const inicial: CampoEditado[] = campos.map((c) => ({ chave: c.chave, rotulo: c.rotulo }));
  const [lista, setLista] = useState<(CampoEditado & { tempId: number })[]>(inicial.map((c, i) => ({ ...c, tempId: i })));
  const [proximoId, setProximoId] = useState(inicial.length);
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const [pedirMotivo, setPedirMotivo] = useState(false);
  const { marcarSujo } = useFormularioSujo();
  const servico = useServico();

  const podeEstrutura = travas.permite("CAMPOS_EXTRAS_ESTRUTURA");
  const podeRotulo = travas.permite("CAMPOS_EXTRAS_ROTULO");
  const auditado = travas.nivel("CAMPOS_EXTRAS_ROTULO") === "AUDITADO";
  const editado = lista.map(({ chave, rotulo }) => ({ chave, rotulo }));
  const alterado = JSON.stringify(editado) !== JSON.stringify(inicial);
  const removidos = campos.filter((c) => !lista.some((l) => l.chave === c.chave));
  const afetados = removidos.reduce((s, c) => s + contarValores(candidatos, eventoId, c.chave), 0);
  const erros = lista.map((c, i) =>
    validarRotuloCampo(
      c.rotulo,
      lista.filter((_, k) => k !== i).map((o) => o.rotulo),
    ),
  );
  const temErros = erros.some(Boolean);

  const mudar = (nova: typeof lista) => {
    setLista(nova);
    marcarSujo(true);
  };
  const mover = (i: number, d: -1 | 1) => {
    const nova = [...lista];
    [nova[i], nova[i + d]] = [nova[i + d], nova[i]];
    mudar(nova);
  };

  async function salvar(motivo?: string) {
    const r = await servico.executar(() => salvarCamposExtras(eventoId, editado, motivo));
    setConfirmarRemocao(false);
    setPedirMotivo(false);
    if (r.ok) marcarSujo(false);
  }

  function aoSalvar() {
    if (temErros || !alterado) return;
    if (removidos.length) setConfirmarRemocao(true);
    else if (auditado) setPedirMotivo(true);
    else void salvar();
  }

  if (travas.fase === "CONCLUIDO" && campos.length === 0) return null;

  return (
    <section aria-labelledby="titulo-campos" className="flex flex-col gap-3 rounded-2xl border border-tema-borda p-4">
      <h3 id="titulo-campos" className="text-lg font-bold">
        Campos extras
      </h3>
      <p className="text-sm text-tema-texto-suave">Aparecem no cartão e no detalhe, na ordem abaixo. Até {LIMITES.maxCampos} campos.</p>
      <DicaTrava motivo={podeEstrutura ? null : travas.motivo("CAMPOS_EXTRAS_ESTRUTURA")} />
      <ul className="flex flex-col gap-2">
        {lista.map((c, i) => (
          <li key={c.tempId} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                aria-label={`Nome do campo ${i + 1}`}
                aria-invalid={erros[i] ? true : undefined}
                value={c.rotulo}
                disabled={!podeRotulo}
                onChange={(e) => mudar(lista.map((x, k) => (k === i ? { ...x, rotulo: e.target.value } : x)))}
                className="max-w-xs flex-1"
                maxLength={30}
              />
              {c.chave && <code className="text-xs text-tema-texto-suave">{c.chave}</code>}
              {podeRotulo && (
                <>
                  <Botao variante="fantasma" tamanho="pequeno" disabled={i === 0} onClick={() => mover(i, -1)} aria-label={`Subir campo ${c.rotulo}`} icone={<ArrowUp aria-hidden className="size-4" />}>
                    Subir
                  </Botao>
                  <Botao variante="fantasma" tamanho="pequeno" disabled={i === lista.length - 1} onClick={() => mover(i, 1)} aria-label={`Descer campo ${c.rotulo}`} icone={<ArrowDown aria-hidden className="size-4" />}>
                    Descer
                  </Botao>
                </>
              )}
              {podeEstrutura && (
                <Botao variante="fantasma" tamanho="pequeno" onClick={() => mudar(lista.filter((_, k) => k !== i))} aria-label={`Remover campo ${c.rotulo}`} icone={<Trash2 aria-hidden className="size-4" />}>
                  Remover
                </Botao>
              )}
            </div>
            {erros[i] && <p className="text-sm font-medium text-tema-erro">{erros[i]}</p>}
          </li>
        ))}
      </ul>
      {(podeEstrutura || podeRotulo) && (
        <div className="flex flex-wrap gap-2">
          {podeEstrutura && (
            <Botao
              variante="contorno"
              tamanho="pequeno"
              disabled={lista.length >= LIMITES.maxCampos}
              onClick={() => {
                mudar([...lista, { rotulo: "", tempId: proximoId }]);
                setProximoId(proximoId + 1);
              }}
              icone={<Plus aria-hidden className="size-4" />}
            >
              Adicionar campo
            </Botao>
          )}
          <Botao
            variante="contorno"
            tamanho="pequeno"
            disabled={!alterado}
            onClick={() => {
              setLista(inicial.map((c, i) => ({ ...c, tempId: i })));
              marcarSujo(false);
            }}
            icone={<Undo2 aria-hidden className="size-4" />}
          >
            Descartar
          </Botao>
          <Botao tamanho="pequeno" disabled={!alterado || temErros} carregando={servico.carregando} onClick={aoSalvar} icone={<Save aria-hidden className="size-4" />}>
            Salvar campos
          </Botao>
        </div>
      )}
      <DialogoConfirmacao
        aberto={confirmarRemocao}
        aoFechar={() => setConfirmarRemocao(false)}
        aoConfirmar={() => salvar()}
        carregando={servico.carregando}
        titulo="Remover campos"
        consequencia={`${removidos.map((c) => c.rotulo).join(", ")}: ${afetados} item(ns) têm valor preenchido, e esses valores serão apagados.`}
        rotuloConfirmar="Remover e salvar"
      />
      <DialogoMotivo
        key={String(pedirMotivo)}
        aberto={pedirMotivo}
        titulo="Corrigir campos"
        consequencia="Com a urna aberta ou encerrada, só nomes e ordem podem mudar. A alteração fica registrada."
        rotuloConfirmar="Salvar"
        carregando={servico.carregando}
        aoFechar={() => setPedirMotivo(false)}
        aoConfirmar={(m) => void salvar(m)}
      />
    </section>
  );
}
