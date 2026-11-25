"use client";

import { Save, Undo2 } from "lucide-react";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Campo, Checkbox, Input } from "@/components/ui/Campo";
import { LIMITES_INTERVALO_TELAO, ROTULOS_OPCOES_TELAO, validarConfigTelao } from "@/dominio/telao";
import type { ConfigApresentacao, OpcoesTelao } from "@/dominio/tipos";
import type { Travas } from "@/dominio/travas";
import { salvarApresentacao } from "@/servicos/apresentacaoConfig";
import { useEventoAtivo } from "@/store/seletores/evento";
import { BannerTrava } from "../BannerTrava";
import { DicaTrava } from "../DicaTrava";
import { useFormularioSujo } from "../FormularioSujoProvider";
import { useServico } from "../useServico";

const OPCOES = Object.keys(ROTULOS_OPCOES_TELAO) as (keyof OpcoesTelao)[];

/**
 * Seção Apresentação (demanda B2, 25/11/2026): o telão da votação ao vivo mostra uma categoria por vez e troca a cada n segundos;
 * aqui o admin escolhe o intervalo e o que aparece na tela. Remonta por `key` quando o salvo muda.
 */
export function SecaoApresentacao({ travas }: { travas: Travas }) {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  const { configApresentacao } = ativo;
  return <FormTelao key={configApresentacao.atualizadoEm} config={configApresentacao} travas={travas} qtdCategorias={ativo.categorias.length} />;
}

function FormTelao({ config, travas, qtdCategorias }: { config: ConfigApresentacao; travas: Travas; qtdCategorias: number }) {
  const [intervalo, setIntervalo] = useState(String(config.telaoIntervaloSegundos));
  const [mostrar, setMostrar] = useState<OpcoesTelao>(config.telaoMostrar);
  const { marcarSujo } = useFormularioSujo();
  const servico = useServico();
  const eventoId = config.eventoId;

  const pode = travas.permite("APRESENTACAO");
  const leitura = travas.fase === "CONCLUIDO";
  const dados = { intervaloSegundos: Number(intervalo), mostrar };
  const erros = validarConfigTelao(dados);
  const errosServidor = servico.erro?.campos ?? {};
  const alterado = dados.intervaloSegundos !== config.telaoIntervaloSegundos || JSON.stringify(mostrar) !== JSON.stringify(config.telaoMostrar);

  async function salvar() {
    const r = await servico.executar(() => salvarApresentacao(eventoId, dados));
    if (r.ok) marcarSujo(false);
  }

  return (
    <section aria-labelledby="titulo-secao" aria-busy={servico.carregando || undefined} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 id="titulo-secao" tabIndex={-1} className="text-2xl font-bold">
          Apresentação
        </h2>
        <p className="max-w-2xl text-tema-texto-suave">
          Durante a votação, o telão mostra uma categoria por vez e passa para a próxima depois do intervalo, em loop. A cada troca
          mudam os itens e o QR Code. As categorias do totem entram no ciclo com os itens, sem QR Code nem link: no lugar, a frase de
          cada uma (padrão &quot;Vote nos totens&quot;, em Configuração &gt; Categorias). Os troféus, o pódio e a ordem da revelação também
          ficam em Categorias.
          {qtdCategorias <= 1 && " Com uma categoria só, o telão fica nela."}
        </p>
      </div>
      <BannerTrava travas={travas} acoes={["APRESENTACAO"]} />
      <DicaTrava motivo={pode ? null : travas.motivo("APRESENTACAO")} />

      <fieldset disabled={!pode || leitura} className="flex flex-col gap-5 rounded-2xl border border-tema-borda bg-tema-superficie p-5">
        <legend className="sr-only">Telão da votação</legend>
        <Campo
          id="telao-intervalo"
          rotulo="Intervalo da troca (segundos)"
          dica={`Quanto tempo cada categoria fica no telão. De ${LIMITES_INTERVALO_TELAO.min} a ${LIMITES_INTERVALO_TELAO.max} segundos.`}
          erro={erros.intervalo ?? errosServidor.intervalo ?? null}
          className="max-w-xs"
        >
          <Input
            type="number"
            inputMode="numeric"
            min={LIMITES_INTERVALO_TELAO.min}
            max={LIMITES_INTERVALO_TELAO.max}
            step={1}
            value={intervalo}
            onChange={(e) => {
              setIntervalo(e.target.value);
              marcarSujo(true);
            }}
          />
        </Campo>

        <fieldset className="flex flex-col gap-1" aria-describedby={erros.mostrar ? "telao-mostrar-erro" : undefined}>
          <legend className="text-sm font-semibold">O que mostrar no telão</legend>
          <div className="grid gap-x-6 sm:grid-cols-2">
            {OPCOES.map((op) => (
              <Checkbox
                key={op}
                id={`telao-mostrar-${op}`}
                checked={mostrar[op]}
                onChange={() => {
                  setMostrar({ ...mostrar, [op]: !mostrar[op] });
                  marcarSujo(true);
                }}
                rotulo={
                  <>
                    <span className="font-semibold">{ROTULOS_OPCOES_TELAO[op].rotulo}</span>
                    <span className="block text-tema-texto-suave">{ROTULOS_OPCOES_TELAO[op].dica}</span>
                  </>
                }
              />
            ))}
          </div>
          {(erros.mostrar ?? errosServidor.mostrar) && (
            <p id="telao-mostrar-erro" role="alert" className="text-sm font-medium text-tema-erro">
              {erros.mostrar ?? errosServidor.mostrar}
            </p>
          )}
        </fieldset>
      </fieldset>

      {!leitura && pode && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Botao
            variante="contorno"
            disabled={!alterado}
            onClick={() => {
              setIntervalo(String(config.telaoIntervaloSegundos));
              setMostrar(config.telaoMostrar);
              marcarSujo(false);
            }}
            icone={<Undo2 aria-hidden className="size-4" />}
          >
            Descartar
          </Botao>
          <Botao
            onClick={() => void salvar()}
            disabled={!alterado || Object.keys(erros).length > 0}
            carregando={servico.carregando}
            icone={<Save aria-hidden className="size-4" />}
          >
            Salvar
          </Botao>
        </div>
      )}
    </section>
  );
}
