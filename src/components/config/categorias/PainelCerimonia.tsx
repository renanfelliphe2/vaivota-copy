"use client";

import { ArrowDown, ArrowUp, CornerDownRight, Save, Undo2 } from "lucide-react";
import { useState } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Input } from "@/components/ui/Campo";
import { GRUPOS_TROFEU, ordenarCerimonia, ORIGEM_TROFEU } from "@/dominio/apresentacao/cerimonia";
import { rotuloDoItem } from "@/dominio/apresentacao/roteiroPublico";
import type { Categoria, ConfigApresentacao, ConfigTrofeu, Evento, Grupo, ModeloOrdemCerimonia, OrdemCerimonia } from "@/dominio/tipos";
import type { Travas } from "@/dominio/travas";
import { cx } from "@/lib/classes";
import { salvarCerimonia } from "@/servicos/apresentacaoConfig";
import { DicaTrava } from "../DicaTrava";
import { useFormularioSujo } from "../FormularioSujoProvider";
import { useServico } from "../useServico";

// Cerimônia no telão (25/11/2026; protótipo aprovado, quadro 12): os troféus por tipo de votação (ligado, nome, por categoria ou no
// evento todo, com ou sem os votos) e a ordem da revelação. A lista mostra exatamente a ordem que o telão segue (as mesmas funções
// do roteiro); o resultado de cada categoria entra sozinho depois do último item dela. Remonta por `key` quando o salvo muda.

const MODELOS: { valor: ModeloOrdemCerimonia; rotulo: string }[] = [
  { valor: "CATEGORIA", rotulo: "Por categoria" },
  { valor: "POSICAO", rotulo: "Por posição" },
  { valor: "INTERCALADO", rotulo: "Troféus intercalados" },
  { valor: "PERSONALIZADA", rotulo: "Personalizada" },
];

const SETA =
  "inline-flex size-10 items-center justify-center rounded-lg border border-tema-borda bg-tema-fundo hover:border-tema-primaria focus-visible:outline-3 focus-visible:outline-tema-foco disabled:cursor-not-allowed disabled:opacity-40";

export function PainelCerimonia({ evento, config, categorias, travas }: { evento: Evento; config: ConfigApresentacao; categorias: readonly Categoria[]; travas: Travas }) {
  return <Form key={config.atualizadoEm} evento={evento} config={config} categorias={categorias} travas={travas} />;
}

function Escolha({ ativo, children, aoEscolher, disabled }: { ativo: boolean; children: React.ReactNode; aoEscolher: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      disabled={disabled}
      onClick={aoEscolher}
      className={cx(
        "min-h-10 px-3 text-sm font-semibold transition focus-visible:outline-3 focus-visible:outline-tema-foco disabled:cursor-not-allowed disabled:opacity-50",
        ativo ? "bg-tema-primaria text-tema-sobre-primaria" : "bg-tema-fundo hover:bg-tema-superficie",
      )}
    >
      {children}
    </button>
  );
}

function Form({ evento, config, categorias, travas }: { evento: Evento; config: ConfigApresentacao; categorias: readonly Categoria[]; travas: Travas }) {
  const [trofeus, setTrofeus] = useState<Record<Grupo, ConfigTrofeu>>(config.trofeus);
  const [rotulos, setRotulos] = useState<Record<Grupo, string>>({ POPULAR: config.rotuloCategoriaPublico, JURI: config.rotuloCategoriaJuri, INFANTIL: config.rotuloCategoriaInfantil });
  const [ordem, setOrdem] = useState<OrdemCerimonia>(config.ordemRevelacao);
  const { marcarSujo } = useFormularioSujo();
  const servico = useServico();
  const pode = travas.permite("APRESENTACAO") && travas.fase !== "CONCLUIDO";

  const ligado: Record<Grupo, boolean> = { POPULAR: true, JURI: evento.moduloJuri, INFANTIL: evento.moduloInfantil };
  const gruposAtivos = GRUPOS_TROFEU.filter((g) => ligado[g]);
  const cats = categorias.map((c) => ({ id: c.id, nome: c.nome, podioTamanho: c.podioTamanho }));
  const configAtual = { trofeus, ordemRevelacao: ordem, rotuloCategoriaPublico: rotulos.POPULAR, rotuloCategoriaJuri: rotulos.JURI, rotuloCategoriaInfantil: rotulos.INFANTIL };
  const itens = ordenarCerimonia(cats, trofeus, gruposAtivos, ordem);
  const ultimoDa = new Map<string, number>();
  itens.forEach((x, i) => x.categoriaId && ultimoDa.set(x.categoriaId, i));

  const salvo = JSON.stringify([config.trofeus, config.ordemRevelacao, config.rotuloCategoriaPublico, config.rotuloCategoriaJuri, config.rotuloCategoriaInfantil]);
  const alterado = JSON.stringify([trofeus, ordem, rotulos.POPULAR, rotulos.JURI, rotulos.INFANTIL]) !== salvo;
  const erroRotulo = (g: Grupo) => (rotulos[g].trim().length < 2 || rotulos[g].trim().length > 60 ? "Use de 2 a 60 caracteres." : (servico.erro?.campos?.[`rotulo-${g}`] ?? null));
  const temErro = GRUPOS_TROFEU.some((g) => erroRotulo(g));

  function mudarTrofeu(g: Grupo, mudanca: Partial<ConfigTrofeu>) {
    setTrofeus((t) => ({ ...t, [g]: { ...t[g], ...mudanca } }));
    marcarSujo(true);
  }
  function mudarOrdem(mudanca: Partial<OrdemCerimonia>) {
    setOrdem((o) => ({ ...o, ...mudanca }));
    marcarSujo(true);
  }
  /** Mexer num item fixa a lista atual como personalizada. */
  function mover(i: number, delta: number) {
    const ids = itens.map((x) => x.id);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    mudarOrdem({ modelo: "PERSONALIZADA", itens: ids });
  }

  async function salvar() {
    const r = await servico.executar(() => salvarCerimonia(evento.id, { trofeus, rotulos, ordem }));
    if (r.ok) marcarSujo(false);
  }

  return (
    <section aria-labelledby="titulo-cerimonia" aria-busy={servico.carregando || undefined} className="flex flex-col gap-5 rounded-2xl border border-tema-borda bg-tema-superficie p-5">
      <div className="flex flex-col gap-1">
        <h3 id="titulo-cerimonia" className="text-xl font-bold">
          Cerimônia no telão
        </h3>
        <p className="max-w-3xl text-sm text-tema-texto-suave">
          Os troféus por tipo de votação e a ordem em que tudo é revelado. O pódio de cada categoria (quantos lugares e onde aparecem os
          votos) fica no &quot;Editar&quot; da categoria. Aqui só muda o que o telão mostra: a apuração é a mesma.
        </p>
      </div>
      <DicaTrava motivo={pode ? null : travas.motivo("APRESENTACAO")} />

      <fieldset disabled={!pode} className="flex flex-col gap-3">
        <legend className="mb-1 font-semibold">Troféus</legend>
        <ul className="flex flex-col divide-y divide-tema-borda rounded-xl border border-tema-borda bg-tema-fundo">
          {GRUPOS_TROFEU.map((g) => {
            const t = trofeus[g];
            const erro = erroRotulo(g);
            return (
              <li key={g} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-3">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={t.ativo && ligado[g]} disabled={!ligado[g]} onChange={(e) => mudarTrofeu(g, { ativo: e.target.checked })} className="size-5 accent-tema-primaria" />
                  <span className="sr-only">Entregar o troféu da {ORIGEM_TROFEU[g]}</span>
                </label>
                <div className="flex min-w-48 flex-1 flex-col gap-1">
                  <Input
                    aria-label={`Nome do troféu da ${ORIGEM_TROFEU[g]}`}
                    aria-invalid={erro ? true : undefined}
                    value={rotulos[g]}
                    maxLength={60}
                    onChange={(e) => {
                      setRotulos((r) => ({ ...r, [g]: e.target.value }));
                      marcarSujo(true);
                    }}
                  />
                  {erro && <span className="text-sm font-medium text-tema-erro">{erro}</span>}
                </div>
                <span className="rounded-full bg-tema-superficie px-2.5 py-1 text-xs font-bold">{ligado[g] ? ORIGEM_TROFEU[g] : `${ORIGEM_TROFEU[g]} desligada`}</span>
                <div role="group" aria-label={`Onde o troféu da ${ORIGEM_TROFEU[g]} é entregue`} className="inline-flex overflow-hidden rounded-xl border border-tema-borda">
                  <Escolha ativo={t.escopo === "CATEGORIA"} disabled={!t.ativo || !ligado[g]} aoEscolher={() => mudarTrofeu(g, { escopo: "CATEGORIA" })}>
                    Por categoria
                  </Escolha>
                  <Escolha ativo={t.escopo === "EVENTO"} disabled={!t.ativo || !ligado[g]} aoEscolher={() => mudarTrofeu(g, { escopo: "EVENTO" })}>
                    No evento todo
                  </Escolha>
                </div>
                <div role="group" aria-label={`O que mostrar do vencedor da ${ORIGEM_TROFEU[g]}`} className="inline-flex overflow-hidden rounded-xl border border-tema-borda">
                  <Escolha ativo={t.mostrarVotos} disabled={!t.ativo || !ligado[g]} aoEscolher={() => mudarTrofeu(g, { mostrarVotos: true })}>
                    Com votos e %
                  </Escolha>
                  <Escolha ativo={!t.mostrarVotos} disabled={!t.ativo || !ligado[g]} aoEscolher={() => mudarTrofeu(g, { mostrarVotos: false })}>
                    Só o vencedor
                  </Escolha>
                </div>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset disabled={!pode} className="flex flex-col gap-3">
        <legend className="mb-1 font-semibold">Ordem da apresentação</legend>
        <p className="-mt-1 text-sm text-tema-texto-suave">Comece por um modelo e ajuste com as setas. O resultado de cada categoria entra logo depois do último item dela (menos nas que revelam só o vencedor). No fim, uma tela com os vencedores de todas.</p>
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Modelo da ordem" className="inline-flex flex-wrap overflow-hidden rounded-xl border border-tema-borda">
            {MODELOS.map((m) => (
              <Escolha
                key={m.valor}
                ativo={ordem.modelo === m.valor}
                aoEscolher={() => mudarOrdem(m.valor === "PERSONALIZADA" ? { modelo: m.valor, itens: itens.map((x) => x.id) } : { modelo: m.valor })}
              >
                {m.rotulo}
              </Escolha>
            ))}
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={ordem.ultimoPrimeiro} onChange={(e) => mudarOrdem({ ultimoPrimeiro: e.target.checked })} className="size-5 accent-tema-primaria" />
            Do último lugar para o 1º
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={ordem.mostrarDesempate} onChange={(e) => mudarOrdem({ mostrarDesempate: e.target.checked })} className="size-5 accent-tema-primaria" />
            Mostrar a tela do critério de desempate
          </label>
        </div>
        {!ordem.mostrarDesempate && (
          <p className="-mt-1 text-sm text-tema-texto-suave">Em caso de empate, a revelação vai direto para quem ficou com a posição.</p>
        )}
        {itens.length === 0 ? (
          <Alerta variante="informacao">Nenhum item para revelar: ligue um troféu ou crie uma categoria.</Alerta>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {itens.map((x, i) => {
              const r = rotuloDoItem(x, cats, configAtual);
              // Só o vencedor: sem tela de resultado (ele acabou de aparecer; volta no final, com os de todas as categorias).
              const fim = x.categoriaId && ultimoDa.get(x.categoriaId) === i ? cats.find((c) => c.id === x.categoriaId && c.podioTamanho > 1) : null;
              return (
                <li key={x.id} className="flex flex-col gap-1.5">
                  <div className={cx("grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-tema-borda py-1.5 pr-1.5 pl-3", x.tipo === "TROFEU" ? "bg-tema-superficie" : "bg-tema-fundo")}>
                    <span className="text-sm font-bold text-tema-texto-suave tabular-nums">{i + 1}</span>
                    <span className="flex min-w-0 flex-wrap items-baseline gap-x-3">
                      <b className="truncate">{r.titulo}</b>
                      <span className="text-sm text-tema-texto-suave">{x.tipo === "TROFEU" ? `Troféu · ${r.detalhe}` : r.detalhe}</span>
                    </span>
                    <span className="flex gap-1">
                      <button type="button" className={SETA} aria-label={`Subir ${r.titulo} (${r.detalhe})`} disabled={i === 0} onClick={() => mover(i, -1)}>
                        <ArrowUp aria-hidden className="size-4" />
                      </button>
                      <button type="button" className={SETA} aria-label={`Descer ${r.titulo} (${r.detalhe})`} disabled={i === itens.length - 1} onClick={() => mover(i, 1)}>
                        <ArrowDown aria-hidden className="size-4" />
                      </button>
                    </span>
                  </div>
                  {fim && (
                    <span className="flex items-center gap-2 pl-12 text-sm font-semibold text-tema-sucesso">
                      <CornerDownRight aria-hidden className="size-4" /> Resultado de {fim.nome}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </fieldset>

      {servico.erro && !servico.erro.campos && <Alerta variante="erro">{servico.erro.mensagem}</Alerta>}
      {pode && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Botao
            variante="contorno"
            disabled={!alterado}
            onClick={() => {
              setTrofeus(config.trofeus);
              setRotulos({ POPULAR: config.rotuloCategoriaPublico, JURI: config.rotuloCategoriaJuri, INFANTIL: config.rotuloCategoriaInfantil });
              setOrdem(config.ordemRevelacao);
              marcarSujo(false);
            }}
            icone={<Undo2 aria-hidden className="size-4" />}
          >
            Descartar
          </Botao>
          <Botao onClick={() => void salvar()} disabled={!alterado || temErro} carregando={servico.carregando} icone={<Save aria-hidden className="size-4" />}>
            Salvar cerimônia
          </Botao>
        </div>
      )}
    </section>
  );
}
