"use client";

import { Save, Undo2 } from "lucide-react";
import { useState } from "react";
import type { Pesos } from "@/dominio/placar";
import type { ConfigPlacar, Evento, Grupo, RegraDesempate } from "@/dominio/tipos";
import type { Travas } from "@/dominio/travas";
import { validarPesos } from "@/dominio/validacoesConfig";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Select } from "@/components/ui/Campo";
import { salvarPlacar } from "@/servicos/placarConfig";
import { useEventoAtivo } from "@/store/seletores/evento";
import { BannerTrava } from "../BannerTrava";
import { DicaTrava } from "../DicaTrava";
import { useFormularioSujo } from "../FormularioSujoProvider";
import { useServico } from "../useServico";
import { BarraPesos } from "./BarraPesos";
import { EditorPesos } from "./EditorPesos";
import { ExemploPlacar } from "./ExemploPlacar";

/** Seção Placar (Etapa 6, CP6). Remonta por `key` quando o salvo (ou os módulos) muda. */
export function SecaoPlacar({ travas }: { travas: Travas }) {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  const { evento, configPlacar } = ativo;
  return (
    <FormPlacar
      key={`${configPlacar.atualizadoEm}:${configPlacar.pesoPopular}/${configPlacar.pesoJuri}/${configPlacar.pesoInfantil}:${evento.moduloJuri}:${evento.moduloInfantil}`}
      evento={evento}
      placar={configPlacar}
      travas={travas}
    />
  );
}

const PRESETS: Record<number, Pesos[]> = {
  1: [{ POPULAR: 100, JURI: 0, INFANTIL: 0 }],
  2: [
    { POPULAR: 70, JURI: 30, INFANTIL: 0 },
    { POPULAR: 50, JURI: 50, INFANTIL: 0 },
  ],
  3: [
    { POPULAR: 50, JURI: 30, INFANTIL: 20 },
    { POPULAR: 40, JURI: 40, INFANTIL: 20 },
  ],
};

function FormPlacar({ evento, placar, travas }: { evento: Evento; placar: ConfigPlacar; travas: Travas }) {
  const salvo: Pesos = { POPULAR: placar.pesoPopular, JURI: placar.pesoJuri, INFANTIL: placar.pesoInfantil };
  const [pesos, setPesos] = useState<Pesos>(salvo);
  const [regra, setRegra] = useState<RegraDesempate>(placar.regraDesempate);
  const { marcarSujo } = useFormularioSujo();
  const servico = useServico();

  const ligados: Record<Grupo, boolean> = { POPULAR: true, JURI: evento.moduloJuri, INFANTIL: evento.moduloInfantil };
  const ativos = (Object.keys(ligados) as Grupo[]).filter((g) => ligados[g]);
  const pode = travas.permite("PLACAR");
  const leitura = travas.fase === "CONCLUIDO";
  const erro = validarPesos(pesos, ligados);
  const soma = pesos.POPULAR + pesos.JURI + pesos.INFANTIL;
  const alterado = JSON.stringify(pesos) !== JSON.stringify(salvo) || regra !== placar.regraDesempate;
  const motivoJuri = !evento.moduloJuri
    ? travas.nivel("MODULO_JURI_DESLIGAR") === "TRAVADO"
      ? travas.motivo("MODULO_JURI_DESLIGAR") ?? undefined
      : "Módulo júri desligado (toolbar): peso 0."
    : undefined;

  const aplicar = (novos: Pesos) => {
    setPesos(novos);
    marcarSujo(true);
  };

  function distribuir() {
    const base = Math.floor(100 / ativos.length);
    const novos: Pesos = { POPULAR: 0, JURI: 0, INFANTIL: 0 };
    for (const g of ativos) novos[g] = base;
    novos.POPULAR += 100 - base * ativos.length; // o resto vai ao popular
    aplicar(novos);
  }

  async function salvar() {
    const r = await servico.executar(() =>
      salvarPlacar(evento.id, { pesoPopular: pesos.POPULAR, pesoJuri: pesos.JURI, pesoInfantil: pesos.INFANTIL, regraDesempate: regra }),
    );
    if (r.ok) marcarSujo(false);
  }

  return (
    <section aria-labelledby="titulo-secao" aria-busy={servico.carregando || undefined} className="flex flex-col gap-5">
      <h2 id="titulo-secao" tabIndex={-1} className="text-2xl font-bold">
        Placar
      </h2>
      <BannerTrava travas={travas} acoes={["PLACAR"]} />
      <DicaTrava motivo={pode ? null : travas.motivo("PLACAR")} />
      <fieldset disabled={!pode} className="flex flex-col gap-5">
        <legend className="sr-only">Pesos e desempate</legend>
        <BarraPesos pesos={pesos} />
        <p role="status" className={erro ? "font-semibold text-tema-erro" : "font-semibold text-tema-sucesso"}>
          {erro ?? `Soma ${soma}%`}
        </p>
        <EditorPesos
          pesos={pesos}
          ligados={ligados}
          disabled={!pode}
          motivoDesligado={{ JURI: motivoJuri, INFANTIL: "Módulo infantil desligado (toolbar): peso 0." }}
          aoMudar={(g, v) => aplicar({ ...pesos, [g]: v })}
        />
        {evento.moduloJuri && travas.nivel("MODULO_JURI_DESLIGAR") === "TRAVADO" && (
          <DicaTrava motivo={`Módulo júri não pode ser desligado. ${travas.motivo("MODULO_JURI_DESLIGAR")}`} />
        )}
        {pode && (
          <div className="flex flex-wrap gap-2">
            <Botao variante="contorno" tamanho="pequeno" onClick={distribuir}>
              Distribuir igualmente
            </Botao>
            {(PRESETS[ativos.length] ?? []).map((p) => (
              <Botao key={`${p.POPULAR}/${p.JURI}/${p.INFANTIL}`} variante="contorno" tamanho="pequeno" onClick={() => aplicar(p)}>
                {ativos.map((g) => p[g]).join(" / ")}
              </Botao>
            ))}
          </div>
        )}
        <Campo id="placar-desempate" rotulo="Desempate" dica="Critério usado quando dois itens têm a mesma pontuação final.">
          <Select
            value={regra}
            onChange={(e) => {
              setRegra(e.target.value as RegraDesempate);
              marcarSujo(true);
            }}
          >
            <option value="JURI">Maior votação do júri</option>
            <option value="PUBLICO">Maior votação do público</option>
          </Select>
        </Campo>
        {regra === "JURI" && !evento.moduloJuri && (
          <Alerta variante="aviso">O júri está desligado. Esse critério não terá efeito; a regra de apuração decide o desempate.</Alerta>
        )}
      </fieldset>
      {!leitura && pode && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Botao
            variante="contorno"
            disabled={!alterado}
            onClick={() => {
              setPesos(salvo);
              setRegra(placar.regraDesempate);
              marcarSujo(false);
            }}
            icone={<Undo2 aria-hidden className="size-4" />}
          >
            Descartar
          </Botao>
          <Botao onClick={() => void salvar()} disabled={!alterado || erro !== null} carregando={servico.carregando} icone={<Save aria-hidden className="size-4" />}>
            Salvar
          </Botao>
        </div>
      )}
      <ExemploPlacar pesos={pesos} />
    </section>
  );
}
