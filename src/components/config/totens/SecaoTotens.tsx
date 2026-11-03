"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import type { DispositivoListado } from "@/dominio/totem";
import type { Travas } from "@/dominio/travas";
import { validarNomeDispositivo, validarPinTotem } from "@/dominio/validacoesConfig";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input } from "@/components/ui/Campo";
import { Carregando } from "@/components/ui/Carregando";
import { DialogoConfirmacao } from "@/components/ui/DialogoConfirmacao";
import { Selo } from "@/components/ui/Selo";
import { useConsulta } from "@/lib/useConsulta";
import {
  alterarPinDispositivo,
  alternarModuloInfantil,
  gerarCodigoPareamento,
  listarDispositivos,
  pausarDispositivo,
  reativarDispositivo,
  renomearDispositivo,
  revogarDispositivo,
} from "@/servicos/dispositivos";
import { useEventoAtivo } from "@/store/seletores/evento";
import { BannerTrava } from "../BannerTrava";
import { DialogoMotivo } from "../DialogoMotivo";
import { DicaTrava } from "../DicaTrava";
import { useServico } from "../useServico";
import { AlterarPinDialog } from "./AlterarPinDialog";
import { CodigoPareamentoDialog, type CodigoParaMostrar } from "./CodigoPareamentoDialog";
import { TabelaTotens } from "./TabelaTotens";

/** O admin acompanha os votos e o último uso dos totens: a lista se atualiza sozinha. */
const INTERVALO_LISTA_MS = 10_000;

/**
 * Seção Totens (Base/VotoInfantil.md §3 e §4): liga o módulo infantil, gera o código de pareamento (com o nome e o PIN do totem)
 * e gerencia os aparelhos pareados. O pareamento em si é feito no tablet, na página de pareamento.
 */
export function SecaoTotens({ travas }: { travas: Travas }) {
  const ativo = useEventoAtivo();
  const eventoId = ativo?.evento.id ?? "";
  const consulta = useConsulta(() => listarDispositivos(eventoId), { chave: eventoId, ativo: Boolean(eventoId), intervaloMs: INTERVALO_LISTA_MS });
  const servico = useServico();
  const idForm = useId();
  const [nome, setNome] = useState("");
  const [pin, setPin] = useState("");
  const [tentou, setTentou] = useState(false);
  const [codigo, setCodigo] = useState<CodigoParaMostrar | null>(null);
  const [desligando, setDesligando] = useState(false);
  const [trocandoPin, setTrocandoPin] = useState<DispositivoListado | null>(null);
  const [revogando, setRevogando] = useState<DispositivoListado | null>(null);
  if (!ativo) return null;
  const { evento, configPlacar, slug } = ativo;

  const ligado = evento.moduloInfantil;
  const totens = consulta.dados ?? [];
  const podeModulo = travas.permite("PLACAR");
  const podeParear = ligado && travas.permite("DISPOSITIVOS_PAREAR");
  const podeGerir = travas.permite("DISPOSITIVOS_GERIR");
  const erroNome = validarNomeDispositivo(nome);
  const erroPin = validarPinTotem(pin);

  async function gerar(e: FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (erroNome || erroPin || servico.carregando) return;
    const r = await servico.executar(() => gerarCodigoPareamento(eventoId, { nome, pin }), null);
    if (!r.ok) return;
    setCodigo({ ...r.dados, url: `${window.location.origin}/e/${slug}/totem/parear` });
    setNome("");
    setPin("");
    setTentou(false);
    consulta.recarregar();
  }

  /** Executa a ação do totem e recarrega a lista quando dá certo. */
  async function agir(chamada: () => ReturnType<typeof pausarDispositivo>, sucesso: string | null): Promise<boolean> {
    const r = await servico.executar(chamada, sucesso);
    if (r.ok) consulta.recarregar();
    return r.ok;
  }

  return (
    <section aria-labelledby="titulo-secao" className="flex flex-col gap-5">
      <h2 id="titulo-secao" tabIndex={-1} className="text-2xl font-bold">
        Totens
      </h2>
      <BannerTrava travas={travas} acoes={["PLACAR", "DISPOSITIVOS_PAREAR", "DISPOSITIVOS_GERIR"]} />

      <div className="flex flex-col gap-3 rounded-xl border border-tema-borda bg-tema-superficie p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold">Votação infantil</h3>
            <p className="text-sm text-tema-texto-suave">
              Crianças votam em totens ou tablets dedicados, sem login e sem dados pessoais. O placar &quot;Escolha das Crianças&quot; é separado e entra
              na fórmula final com o peso infantil.
            </p>
          </div>
          <Selo variante={ligado ? "sucesso" : "neutro"}>{ligado ? "Ligada" : "Desligada"}</Selo>
        </div>
        {travas.fase !== "CONCLUIDO" && (
          <div className="flex flex-col items-start gap-2">
            <DicaTrava motivo={podeModulo ? null : travas.motivo("PLACAR")} />
            {ligado ? (
              <Botao variante="contorno" disabled={!podeModulo} onClick={() => setDesligando(true)}>
                Desligar votação infantil
              </Botao>
            ) : (
              <Botao disabled={!podeModulo} carregando={servico.carregando} onClick={() => void servico.executar(() => alternarModuloInfantil(eventoId, true), "Votação infantil ligada")}>
                Ligar votação infantil
              </Botao>
            )}
          </div>
        )}
        {ligado && configPlacar.pesoInfantil === 0 && (
          <Alerta variante="aviso">
            O peso infantil está em 0%: os votos das crianças não contam na fórmula final. Defina o peso na seção{" "}
            <Link href="?secao=placar" scroll={false} className="font-semibold underline underline-offset-4">
              Placar
            </Link>
            .
          </Alerta>
        )}
      </div>

      {ligado && travas.fase !== "CONCLUIDO" && (
        <form onSubmit={(e) => void gerar(e)} noValidate className="flex flex-col gap-4 rounded-xl border border-tema-borda p-4">
          <h3 className="text-lg font-bold">Parear um novo totem</h3>
          <p className="text-sm text-tema-texto-suave">
            Defina o nome e o PIN de saída do modo totem e gere o código. No tablet, abra a página de pareamento e digite o código uma vez.
          </p>
          <DicaTrava motivo={podeParear ? null : travas.motivo("DISPOSITIVOS_PAREAR")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id={`${idForm}-nome`} rotulo="Nome do totem" erro={servico.erro?.campos?.nome ?? (tentou ? erroNome : null)} dica="Ex.: Totem Hall.">
              <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} autoComplete="off" disabled={!podeParear} />
            </Campo>
            <Campo id={`${idForm}-pin`} rotulo="PIN de saída" erro={servico.erro?.campos?.pin ?? (tentou ? erroPin : null)} dica="De 4 a 8 números. Só a organização deve saber.">
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                disabled={!podeParear}
              />
            </Campo>
          </div>
          <Botao type="submit" disabled={!podeParear} carregando={servico.carregando} icone={<Plus aria-hidden className="size-4" />} className="self-start">
            Gerar código de pareamento
          </Botao>
        </form>
      )}

      <h3 className="text-lg font-bold">Totens pareados</h3>
      {consulta.carregando && !consulta.dados ? (
        <Carregando />
      ) : consulta.erro && !consulta.dados ? (
        <Alerta variante="erro">{consulta.erro.mensagem}</Alerta>
      ) : totens.length === 0 ? (
        <p className="rounded-xl border border-dashed border-tema-borda p-6 text-tema-texto-suave">
          Nenhum totem pareado ainda. {ligado ? "Gere um código acima e digite-o no tablet." : "Ligue a votação infantil para parear tablets."}
        </p>
      ) : (
        <>
          <TabelaTotens
            totens={totens}
            fuso={evento.fusoHorario}
            podeGerir={podeGerir}
            aoRenomear={(id, novo) => agir(() => renomearDispositivo(eventoId, id, novo), "Nome salvo")}
            aoPausar={(t) => void agir(() => pausarDispositivo(eventoId, t.id), `${t.nome} pausado`)}
            aoReativar={(t) => void agir(() => reativarDispositivo(eventoId, t.id), `${t.nome} voltou a receber votos`)}
            aoTrocarPin={(t) => {
              servico.limparErro();
              setTrocandoPin(t);
            }}
            aoRevogar={setRevogando}
          />
          <p className="text-sm text-tema-texto-suave">Votos de totens pausados ou revogados continuam contando: foram registrados antes da pausa ou da revogação.</p>
        </>
      )}

      <CodigoPareamentoDialog codigo={codigo} fuso={evento.fusoHorario} aoFechar={() => setCodigo(null)} />
      <AlterarPinDialog
        key={trocandoPin?.id ?? "fechado"}
        nome={trocandoPin?.nome ?? null}
        aberto={trocandoPin !== null}
        carregando={servico.carregando}
        erro={servico.erro?.campos?.pin ?? null}
        aoFechar={() => setTrocandoPin(null)}
        aoConfirmar={async (novo) => {
          if (!trocandoPin) return;
          if (await agir(() => alterarPinDispositivo(eventoId, trocandoPin.id, novo), "PIN alterado")) setTrocandoPin(null);
        }}
      />
      <DialogoMotivo
        key={revogando?.id ?? "fechado"}
        aberto={revogando !== null}
        titulo={`Revogar: ${revogando?.nome ?? "totem"}`}
        consequencia="O servidor deixa de aceitar os votos deste aparelho na hora, e não há como desfazer. Os votos já registrados continuam contando."
        rotuloConfirmar="Revogar"
        perigo
        carregando={servico.carregando}
        aoFechar={() => setRevogando(null)}
        aoConfirmar={async (motivo) => {
          if (!revogando) return;
          if (await agir(() => revogarDispositivo(eventoId, revogando.id, motivo || undefined), `${revogando.nome} revogado`)) setRevogando(null);
        }}
      />
      <DialogoConfirmacao
        aberto={desligando}
        aoFechar={() => setDesligando(false)}
        titulo="Desligar a votação infantil?"
        consequencia="O peso infantil volta a 0% e o resto se redistribui. Os totens pareados continuam na lista, mas deixam de receber votos. Só é possível desligar se ainda não houver nenhum voto infantil."
        rotuloConfirmar="Desligar"
        carregando={servico.carregando}
        aoConfirmar={async () => {
          if (await agir(() => alternarModuloInfantil(eventoId, false), "Votação infantil desligada")) setDesligando(false);
        }}
      />
    </section>
  );
}
