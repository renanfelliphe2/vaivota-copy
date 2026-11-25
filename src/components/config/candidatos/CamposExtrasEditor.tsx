"use client";

import { ArrowDown, ArrowUp, Copy, Plus, Save, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import { camposDaCategoria, contarValores, TIPOS_CAMPO } from "@/dominio/camposExtras";
import type { CampoCandidato, Candidato, Categoria, TipoCampo } from "@/dominio/tipos";
import type { Travas } from "@/dominio/travas";
import { LIMITES, validarRotuloCampo } from "@/dominio/validacoesConfig";
import { Botao } from "@/components/ui/Botao";
import { Input, Select } from "@/components/ui/Campo";
import { DialogoConfirmacao } from "@/components/ui/DialogoConfirmacao";
import { salvarCamposExtras, type CampoEditado } from "@/servicos/candidatosAdmin";
import { DialogoMotivo } from "../DialogoMotivo";
import { DicaTrava } from "../DicaTrava";
import { useFormularioSujo } from "../FormularioSujoProvider";
import { useServico } from "../useServico";

type Props = {
  eventoId: string;
  categoria: Categoria;
  /** Todas as categorias do evento (para copiar os campos de outra). */
  categorias: readonly Categoria[];
  /** Os campos do evento inteiro; o editor usa os da categoria. */
  campos: readonly CampoCandidato[];
  candidatos: readonly Candidato[];
  travas: Travas;
  aoSalvar?: () => void;
};

/**
 * Etapa 6 (D13): a chave é imutável; remover apaga os valores, depois de confirmar quantos serão afetados.
 * D1 (25/11/2026): os campos são de UMA categoria. "Copiar de" traz os campos de outra categoria que esta ainda não tem, com a
 * mesma chave (o valor continua valendo quando um item muda entre as duas).
 */
export function CamposExtrasEditor(props: Props) {
  const meus = camposDaCategoria(props.campos, props.categoria.id);
  return <Editor key={`${props.categoria.id}|${meus.map((c) => `${c.chave}:${c.rotulo}:${c.tipo}`).join("|")}`} meus={meus} {...props} />;
}

type Linha = CampoEditado & { tempId: number; copiado?: boolean };

function Editor({ eventoId, categoria, categorias, campos, candidatos, travas, aoSalvar, meus }: Props & { meus: CampoCandidato[] }) {
  const inicial: CampoEditado[] = meus.map((c) => ({ chave: c.chave, rotulo: c.rotulo, tipo: c.tipo }));
  const [lista, setLista] = useState<Linha[]>(inicial.map((c, i) => ({ ...c, tempId: i })));
  const [proximoId, setProximoId] = useState(inicial.length);
  const outras = categorias.filter((c) => c.id !== categoria.id && camposDaCategoria(campos, c.id).length > 0);
  const [origem, setOrigem] = useState(outras[0]?.id ?? "");
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const [pedirMotivo, setPedirMotivo] = useState(false);
  const { marcarSujo } = useFormularioSujo();
  const servico = useServico();

  const podeEstrutura = travas.permite("CAMPOS_EXTRAS_ESTRUTURA");
  const podeRotulo = travas.permite("CAMPOS_EXTRAS_ROTULO");
  const auditado = travas.nivel("CAMPOS_EXTRAS_ROTULO") === "AUDITADO";
  const editado: CampoEditado[] = lista.map(({ chave, rotulo, tipo }) => (chave ? { chave, rotulo, tipo } : { rotulo, tipo }));
  const alterado = JSON.stringify(editado) !== JSON.stringify(inicial);
  const removidos = meus.filter((c) => !lista.some((l) => l.chave === c.chave));
  const afetados = removidos.reduce((s, c) => s + contarValores(candidatos, categoria.id, c.chave), 0);
  const erros = lista.map((c, i) =>
    validarRotuloCampo(
      c.rotulo,
      lista.filter((_, k) => k !== i).map((o) => o.rotulo),
    ),
  );
  const temErros = erros.some(Boolean);
  const errosServidor = servico.erro?.campos ?? {};
  // O tipo é estrutura, como adicionar e remover: trava com a urna aberta.
  const tipoDe = (c: Linha): TipoCampo => c.tipo ?? "TEXTO";

  // O que "Copiar" traria da categoria escolhida: os campos que esta ainda não tem (pela chave ou pelo nome).
  const mesmoNome = (a: string, b: string) => a.trim().toLocaleLowerCase("pt-BR") === b.trim().toLocaleLowerCase("pt-BR");
  const aCopiar = camposDaCategoria(campos, origem).filter((c) => !lista.some((l) => l.chave === c.chave || mesmoNome(l.rotulo, c.rotulo)));
  const vagas = LIMITES.maxCampos - lista.length;

  const mudar = (nova: Linha[]) => {
    setLista(nova);
    marcarSujo(true);
  };
  const mover = (i: number, d: -1 | 1) => {
    const nova = [...lista];
    [nova[i], nova[i + d]] = [nova[i + d], nova[i]];
    mudar(nova);
  };
  function copiar() {
    const trazidos = aCopiar
      .slice(0, Math.max(0, vagas))
      .map((c, k) => ({ chave: c.chave, rotulo: c.rotulo, tipo: c.tipo, tempId: proximoId + k, copiado: true }));
    if (!trazidos.length) return;
    mudar([...lista, ...trazidos]);
    setProximoId(proximoId + trazidos.length);
  }

  async function salvar(motivo?: string) {
    const r = await servico.executar(() => salvarCamposExtras(eventoId, categoria.id, editado, motivo), "Campos salvos");
    setConfirmarRemocao(false);
    setPedirMotivo(false);
    if (r.ok) {
      marcarSujo(false);
      aoSalvar?.();
    }
  }

  function aoClicarSalvar() {
    if (temErros || !alterado) return;
    if (removidos.length) setConfirmarRemocao(true);
    else if (auditado) setPedirMotivo(true);
    else void salvar();
  }

  return (
    <section aria-labelledby={`titulo-campos-${categoria.id}`} className="flex flex-col gap-3">
      <h3 id={`titulo-campos-${categoria.id}`} className="sr-only">
        Campos extras de {categoria.nome}
      </h3>
      <p className="text-sm text-tema-texto-suave">
        Os itens de {categoria.nome} preenchem estes campos. Aparecem no cartão e no detalhe, na ordem abaixo. Até {LIMITES.maxCampos} campos.
      </p>
      <DicaTrava motivo={podeEstrutura ? null : travas.motivo("CAMPOS_EXTRAS_ESTRUTURA")} />
      {servico.erro && <p className="text-sm font-medium text-tema-erro">{servico.erro.mensagem}</p>}
      {lista.length === 0 ? (
        <p className="rounded-xl border border-dashed border-tema-borda p-4 text-sm text-tema-texto-suave">Nenhum campo nesta categoria.</p>
      ) : (
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
                <Select
                  aria-label={`Tipo do campo ${c.rotulo || i + 1}`}
                  value={tipoDe(c)}
                  disabled={!podeEstrutura}
                  onChange={(e) => mudar(lista.map((x, k) => (k === i ? { ...x, tipo: e.target.value as TipoCampo } : x)))}
                  className="w-32"
                >
                  {TIPOS_CAMPO.map((t) => (
                    <option key={t.tipo} value={t.tipo}>
                      {t.nome}
                    </option>
                  ))}
                </Select>
                {c.chave && <code className="text-xs text-tema-texto-suave">{c.chave}</code>}
                {c.copiado && <span className="text-xs font-semibold text-tema-primaria-texto">copiado</span>}
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
              {errosServidor[`tipo:${i}`] && <p className="text-sm font-medium text-tema-erro">{errosServidor[`tipo:${i}`]}</p>}
            </li>
          ))}
        </ul>
      )}

      {podeEstrutura && outras.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-tema-borda bg-tema-superficie p-3">
          <label htmlFor={`copiar-de-${categoria.id}`} className="text-sm font-semibold">
            Copiar campos de outra categoria
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Select id={`copiar-de-${categoria.id}`} value={origem} onChange={(e) => setOrigem(e.target.value)} className="max-w-xs flex-1">
              {outras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({camposDaCategoria(campos, c.id).map((k) => k.rotulo).join(", ")})
                </option>
              ))}
            </Select>
            <Botao variante="contorno" tamanho="pequeno" disabled={aCopiar.length === 0 || vagas <= 0} onClick={copiar} icone={<Copy aria-hidden className="size-4" />}>
              Copiar
            </Botao>
          </div>
          <p className="text-xs text-tema-texto-suave">
            {aCopiar.length === 0
              ? "Esta categoria já tem todos os campos dela."
              : vagas < aCopiar.length
                ? `Cabem só mais ${vagas} campo(s): os primeiros entram.`
                : `Entram: ${aCopiar.map((c) => c.rotulo).join(", ")}. Os que esta categoria já tem ficam como estão.`}
          </p>
        </div>
      )}

      {(podeEstrutura || podeRotulo) && (
        <div className="flex flex-wrap gap-2">
          {podeEstrutura && (
            <Botao
              variante="contorno"
              tamanho="pequeno"
              disabled={lista.length >= LIMITES.maxCampos}
              onClick={() => {
                mudar([...lista, { rotulo: "", tipo: "TEXTO", tempId: proximoId }]);
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
          <Botao tamanho="pequeno" disabled={!alterado || temErros} carregando={servico.carregando} onClick={aoClicarSalvar} icone={<Save aria-hidden className="size-4" />}>
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
        consequencia={`${removidos.map((c) => c.rotulo).join(", ")}: ${afetados} item(ns) de ${categoria.nome} têm valor preenchido, e esses valores serão apagados.`}
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
