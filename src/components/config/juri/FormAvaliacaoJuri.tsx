"use client";

import { ArrowDown, ArrowUp, Plus, Save, Trash2, Undo2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { DESCRICAO_MODO_JURI, MODOS_VOTO_JURI, NOTA_MAXIMA, NOTA_MINIMA, ROTULO_MODO_JURI, ehModoPorCriterio } from "@/dominio/avaliacaoJuri";
import type { CriterioJuri, ModoVotoJuri } from "@/dominio/tipos";
import type { Travas } from "@/dominio/travas";
import { LIMITES, validarCriteriosJuri } from "@/dominio/validacoesConfig";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input } from "@/components/ui/Campo";
import { cx } from "@/lib/classes";
import { salvarAvaliacaoJuri, type CriterioEditado } from "@/servicos/configJuri";
import { DicaTrava } from "../DicaTrava";
import { useFormularioSujo } from "../FormularioSujoProvider";
import { useServico } from "../useServico";

export type FormAvaliacaoJuriProps = {
  eventoId: string;
  modo: ModoVotoJuri;
  criterios: readonly CriterioJuri[];
  travas: Travas;
};

/** Chave local estável de cada linha (o id do critério ainda não existe nas novas). */
type Linha = CriterioEditado & { chave: string };

/**
 * Forma de votação do júri e critérios (08/10/2026). Os critérios são os campos da tela de avaliação do jurado
 * (/avaliar). Trava com a urna aberta, como o placar. Quem chama remonta por `key` quando o salvo muda.
 */
export function FormAvaliacaoJuri({ eventoId, modo: modoSalvo, criterios: salvos, travas }: FormAvaliacaoJuriProps) {
  const inicial = (): Linha[] => salvos.map((c) => ({ id: c.id, nome: c.nome, chave: c.id }));
  const [modo, setModo] = useState<ModoVotoJuri>(modoSalvo);
  const [linhas, setLinhas] = useState<Linha[]>(inicial);
  const [proximaChave, setProximaChave] = useState(1);
  const [tentou, setTentou] = useState(false);
  const { marcarSujo } = useFormularioSujo();
  const servico = useServico();

  const pode = travas.permite("JURI_AVALIACAO");
  const porCriterio = ehModoPorCriterio(modo);
  const erros = validarCriteriosJuri(
    linhas.map((l) => l.nome),
    porCriterio,
  );
  const temErro = Object.keys(erros).length > 0;
  const alterado =
    modo !== modoSalvo || JSON.stringify(linhas.map((l) => [l.id, l.nome.trim()])) !== JSON.stringify(salvos.map((c) => [c.id, c.nome]));

  function mudarLinhas(novas: Linha[]) {
    setLinhas(novas);
    marcarSujo(true);
  }

  function mover(i: number, delta: -1 | 1) {
    const novas = [...linhas];
    [novas[i], novas[i + delta]] = [novas[i + delta], novas[i]];
    mudarLinhas(novas);
  }

  function adicionar() {
    mudarLinhas([...linhas, { id: null, nome: "", chave: `nova-${proximaChave}` }]);
    setProximaChave((n) => n + 1);
  }

  async function salvar() {
    setTentou(true);
    if (temErro) return;
    const r = await servico.executar(() =>
      salvarAvaliacaoJuri(eventoId, { modoVotoJuri: modo, criterios: linhas.map(({ id, nome }) => ({ id, nome })) }),
    );
    if (r.ok) marcarSujo(false);
  }

  return (
    <section aria-labelledby="titulo-avaliacao-juri" aria-busy={servico.carregando || undefined} className="flex flex-col gap-4 rounded-2xl border border-tema-borda bg-tema-superficie p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <h3 id="titulo-avaliacao-juri" className="text-lg font-bold">
          Forma de votação do júri
        </h3>
        <p className="text-sm text-tema-texto-suave">O público sempre vota em um só favorito. Aqui você escolhe como os jurados votam.</p>
      </div>
      <DicaTrava motivo={pode ? null : travas.motivo("JURI_AVALIACAO")} />

      <fieldset disabled={!pode} className="flex flex-col gap-4">
        <legend className="sr-only">Forma de votação</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {MODOS_VOTO_JURI.map((m) => (
            <label
              key={m}
              className={cx(
                "flex cursor-pointer flex-col gap-1 rounded-xl border p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-tema-primaria",
                modo === m ? "border-tema-primaria bg-tema-fundo" : "border-tema-borda",
                !pode && "cursor-not-allowed opacity-70",
              )}
            >
              <span className="flex items-center gap-2 font-semibold">
                <input
                  type="radio"
                  name="modo-voto-juri"
                  value={m}
                  checked={modo === m}
                  onChange={() => {
                    setModo(m);
                    marcarSujo(true);
                  }}
                  className="size-4 accent-tema-primaria"
                />
                {ROTULO_MODO_JURI[m]}
              </span>
              <span className="text-sm text-tema-texto-suave">{DESCRICAO_MODO_JURI[m]}</span>
            </label>
          ))}
        </div>

        {porCriterio && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h4 className="font-semibold">Critérios de avaliação</h4>
              <p className="text-sm text-tema-texto-suave">
                {modo === "NOTAS_POR_CRITERIO"
                  ? `Cada critério vira uma nota de ${NOTA_MINIMA} a ${NOTA_MAXIMA} na tela do jurado.`
                  : 'Cada critério vira um "Melhor …" na tela do jurado; ele escolhe um candidato por critério.'}{" "}
                Até {LIMITES.maxCriterios} critérios.
              </p>
            </div>
            {tentou && erros.criterios && <Alerta variante="erro">{erros.criterios}</Alerta>}
            <ol className="flex flex-col gap-3">
              {linhas.map((l, i) => (
                <li key={l.chave} className="flex items-start gap-2">
                  <Campo id={`criterio-${l.chave}`} rotulo={`Critério ${i + 1}`} erro={tentou || l.nome ? (erros[`criterio-${i}`] ?? null) : null} className="flex-1">
                    <Input
                      value={l.nome}
                      maxLength={LIMITES.nomeCriterio[1]}
                      placeholder="Ex.: Direção"
                      onChange={(e) => mudarLinhas(linhas.map((x) => (x.chave === l.chave ? { ...x, nome: e.target.value } : x)))}
                    />
                  </Campo>
                  {/* Alinha com o campo, abaixo do rótulo (1,25rem de linha + 0,375rem de espaço). */}
                  <div className="mt-[1.625rem] flex gap-1">
                    <BotaoIcone rotulo={`Subir ${l.nome || `critério ${i + 1}`}`} disabled={i === 0} onClick={() => mover(i, -1)}>
                      <ArrowUp aria-hidden className="size-4" />
                    </BotaoIcone>
                    <BotaoIcone rotulo={`Descer ${l.nome || `critério ${i + 1}`}`} disabled={i === linhas.length - 1} onClick={() => mover(i, 1)}>
                      <ArrowDown aria-hidden className="size-4" />
                    </BotaoIcone>
                    <BotaoIcone rotulo={`Remover ${l.nome || `critério ${i + 1}`}`} onClick={() => mudarLinhas(linhas.filter((x) => x.chave !== l.chave))}>
                      <Trash2 aria-hidden className="size-4" />
                    </BotaoIcone>
                  </div>
                </li>
              ))}
            </ol>
            {linhas.length < LIMITES.maxCriterios && (
              <Botao variante="contorno" tamanho="pequeno" className="self-start" onClick={adicionar} icone={<Plus aria-hidden className="size-4" />}>
                Adicionar critério
              </Botao>
            )}
            {salvos.some((c) => !linhas.some((l) => l.id === c.id)) && (
              <Alerta variante="aviso">Ao salvar, as notas e escolhas dos critérios removidos são apagadas.</Alerta>
            )}
          </div>
        )}
      </fieldset>

      {pode && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Botao
            variante="contorno"
            disabled={!alterado}
            onClick={() => {
              setModo(modoSalvo);
              setLinhas(inicial());
              setTentou(false);
              marcarSujo(false);
            }}
            icone={<Undo2 aria-hidden className="size-4" />}
          >
            Descartar
          </Botao>
          <Botao onClick={() => void salvar()} disabled={!alterado} carregando={servico.carregando} icone={<Save aria-hidden className="size-4" />}>
            Salvar
          </Botao>
        </div>
      )}
    </section>
  );
}

function BotaoIcone({ rotulo, disabled, onClick, children }: { rotulo: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-11 items-center justify-center rounded-full border border-tema-texto-suave hover:bg-tema-fundo disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
