"use client";

import {
  CircleCheck,
  CircleDashed,
  CirclePause,
  CircleSlash,
  Eye,
  Maximize,
  Minimize,
  RefreshCw,
  Settings,
  Tablet,
  Vote,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TituloPainel } from "@/components/nav/TituloPainel";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Carregando } from "@/components/ui/Carregando";
import { Selo, type VarianteSelo } from "@/components/ui/Selo";
import { useServico } from "@/components/config/useServico";
import { conexaoTotem, SINCRONIZACAO_TOTEM, ultimoContatoMs, type ConexaoTotem, type DispositivoListado, type SituacaoTotem } from "@/dominio/totem";
import type { EstadoDispositivo } from "@/dominio/tipos";
import { formatarNumero, formatarPercentual } from "@/lib/formatar";
import { textoBloqueioTotem } from "@/lib/textosTotem";
import { formatarDataHora, formatarHora, paraMs } from "@/lib/tempo";
import { useConsulta } from "@/lib/useConsulta";
import { forcarSincronizacaoTotens, listarDispositivos } from "@/servicos/dispositivos";
import { useEventoAtivo } from "@/store/seletores/evento";
import { PreviewTotem } from "./PreviewTotem";

/** A lista se atualiza sozinha. Logo depois de "Forçar sincronização", mais rápido, para as respostas aparecerem. */
const INTERVALO_LISTA_MS = 15_000;
const INTERVALO_RAPIDO_MS = 3_000;

const ESTADOS: Record<EstadoDispositivo, { texto: string; variante: VarianteSelo; icone: LucideIcon }> = {
  ATIVO: { texto: "Ativo", variante: "sucesso", icone: CircleCheck },
  PAUSADO: { texto: "Pausado", variante: "aviso", icone: CirclePause },
  REVOGADO: { texto: "Revogado", variante: "erro", icone: CircleSlash },
};

const CONEXOES: Record<ConexaoTotem, { texto: string; variante: VarianteSelo; icone: LucideIcon }> = {
  CONECTADO: { texto: "Conectado", variante: "sucesso", icone: Wifi },
  SINCRONIZANDO: { texto: "Sincronizando…", variante: "info", icone: RefreshCw },
  SEM_RESPOSTA: { texto: "Não respondeu", variante: "erro", icone: WifiOff },
  SEM_SINAL: { texto: "Sem sinal", variante: "erro", icone: WifiOff },
  NUNCA: { texto: "Nunca sincronizou", variante: "neutro", icone: CircleDashed },
  REVOGADO: { texto: "Desligado do evento", variante: "neutro", icone: CircleSlash },
};

/** Relógio de verdade (os horários vêm do servidor), batendo a cada poucos segundos para os "há X min". */
function useAgoraReal(intervaloMs = 5_000): number {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), intervaloMs);
    return () => clearInterval(t);
  }, [intervaloMs]);
  return agora;
}

function haQuanto(ms: number, agora: number): string {
  const s = Math.max(0, Math.round((agora - ms) / 1000));
  if (s < 60) return "agora há pouco";
  const min = Math.floor(s / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h${min % 60 ? ` ${min % 60} min` : ""}`;
  const d = Math.floor(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

/**
 * Página Totens (24/11/2026): o andamento de cada totem do evento: conexão, o que a tela mostra, votos, último voto e categorias,
 * com "Forçar sincronização" (todos ou um) e o preview de cada totem. Cada totem manda um relatório sozinho a cada hora; a gestão
 * (parear, pausar, PIN, revogar) continua em Configuração > Totens.
 */
export function TelaTotens() {
  const ativo = useEventoAtivo();
  const eventoId = ativo?.evento.id ?? "";
  const agora = useAgoraReal();
  const [rapidoAte, setRapidoAte] = useState(0);
  const rapido = agora < rapidoAte;
  const [verificadoEm, setVerificadoEm] = useState<number | null>(null);
  const consulta = useConsulta(
    async () => {
      const r = await listarDispositivos(eventoId);
      // Horário real da resposta (o relógio do app pode ser o simulado).
      if (r.ok) setVerificadoEm(Date.now());
      return r;
    },
    { chave: eventoId, ativo: Boolean(eventoId), intervaloMs: rapido ? INTERVALO_RAPIDO_MS : INTERVALO_LISTA_MS },
  );
  const servico = useServico();
  const [sincronizandoId, setSincronizandoId] = useState<string | "TODOS" | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const dados = consulta.dados;

  if (!ativo) return null;
  const { evento, slug, categorias, tema } = ativo;
  const fuso = evento.fusoHorario;
  const totens = dados ?? [];
  const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]));
  const conexoes = new Map(totens.map((t) => [t.id, conexaoTotem(t, agora)]));
  const emUso = totens.filter((t) => t.estado !== "REVOGADO");
  const conectados = emUso.filter((t) => conexoes.get(t.id) === "CONECTADO").length;
  const comProblema = emUso.filter((t) => ["SEM_SINAL", "SEM_RESPOSTA"].includes(conexoes.get(t.id) ?? "")).length;
  const totalVotos = totens.reduce((s, t) => s + t.votos, 0);
  const preview = totens.find((t) => t.id === previewId) ?? null;
  const configTotens = `/e/${slug}/admin/configuracao?secao=totens`;

  async function sincronizar(dispositivoId?: string) {
    setSincronizandoId(dispositivoId ?? "TODOS");
    const r = await servico.executar(() => forcarSincronizacaoTotens(eventoId, dispositivoId), null);
    setSincronizandoId(null);
    if (!r.ok) return;
    setRapidoAte(Date.now() + SINCRONIZACAO_TOTEM.esperaRespostaMs + INTERVALO_RAPIDO_MS);
    consulta.recarregar();
  }

  function rotuloSituacao(s: SituacaoTotem): string {
    return s === "VOTANDO" ? "Votação aberta" : textoBloqueioTotem(s, tema.rotuloCandidatos).titulo;
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <TituloPainel titulo="Totens" />

      {!evento.moduloInfantil && (
        <Alerta variante="informacao" titulo="Votação infantil desligada">
          Este evento não usa totens. Para usar, ligue a votação infantil em{" "}
          <Link href={configTotens} className="font-semibold underline underline-offset-4">
            Configuração &gt; Totens
          </Link>
          .
        </Alerta>
      )}

      {/* Resumo e sincronização */}
      <section aria-label="Resumo dos totens" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador rotulo="Conectados" valor={`${conectados} de ${emUso.length}`} icone={Wifi} />
        <Indicador rotulo="Com problema de conexão" valor={formatarNumero(comProblema)} icone={WifiOff} destaque={comProblema > 0} />
        <Indicador rotulo="Votos nos totens" valor={formatarNumero(totalVotos)} icone={Vote} />
        <Indicador rotulo="Totens pareados" valor={formatarNumero(totens.length)} icone={Tablet} />
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border border-tema-borda bg-tema-superficie p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-semibold">Sincronização automática a cada 1 hora</p>
          <p className="text-tema-texto-suave">
            Cada totem ligado manda o estado dele sozinho a cada hora, ao abrir e quando a tela muda. &quot;Forçar sincronização&quot; pede o estado agora: um totem
            ligado responde em uns 10 segundos.
            {verificadoEm !== null && <> Lista atualizada às {formatarHora(verificadoEm, fuso)}.</>}
          </p>
        </div>
        <Botao
          className="shrink-0"
          onClick={() => void sincronizar()}
          disabled={emUso.length === 0 || sincronizandoId !== null}
          carregando={sincronizandoId === "TODOS"}
          icone={<RefreshCw aria-hidden className="size-4" />}
        >
          Forçar sincronização
        </Botao>
      </div>

      {consulta.carregando && !dados ? (
        <Carregando />
      ) : consulta.erro && !dados ? (
        <Alerta variante="erro">{consulta.erro.mensagem}</Alerta>
      ) : totens.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-tema-borda p-6">
          <p className="text-tema-texto-suave">Nenhum totem pareado ainda. Pareie os tablets em Configuração &gt; Totens; eles aparecem aqui.</p>
          <Botao href={configTotens} variante="contorno" tamanho="pequeno" icone={<Settings aria-hidden className="size-4" />}>
            Ir para Configuração &gt; Totens
          </Botao>
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {totens.map((t) => (
            <CartaoTotem
              key={t.id}
              totem={t}
              conexao={conexoes.get(t.id) ?? "NUNCA"}
              agora={agora}
              fuso={fuso}
              participacao={totalVotos > 0 ? t.votos / totalVotos : 0}
              categorias={t.categoriaIds.map((id) => nomeCategoria.get(id) ?? "(removida)")}
              rotuloSituacao={rotuloSituacao}
              sincronizando={sincronizandoId === t.id}
              bloqueado={sincronizandoId !== null}
              aoSincronizar={() => void sincronizar(t.id)}
              aoPreview={() => setPreviewId(t.id)}
            />
          ))}
        </ul>
      )}

      {totens.length > 0 && (
        <p className="text-sm text-tema-texto-suave">
          Para parear, pausar, trocar o PIN ou as categorias de um totem, use{" "}
          <Link href={configTotens} className="font-semibold underline underline-offset-4">
            Configuração &gt; Totens
          </Link>
          . Votos de totens pausados ou revogados continuam contando.
        </p>
      )}

      {preview && <PreviewTotem ativo={ativo} totem={preview} aoFechar={() => setPreviewId(null)} />}
    </div>
  );
}

function Indicador({ rotulo, valor, icone: Icone, destaque }: { rotulo: string; valor: string; icone: LucideIcon; destaque?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-tema-borda bg-tema-superficie p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tema-fundo text-tema-primaria-texto">
        <Icone aria-hidden className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className={destaque ? "text-2xl font-bold tabular-nums text-tema-erro" : "text-2xl font-bold tabular-nums"}>{valor}</span>
        <span className="text-sm text-tema-texto-suave">{rotulo}</span>
      </div>
    </div>
  );
}

function CartaoTotem({
  totem: t,
  conexao,
  agora,
  fuso,
  participacao,
  categorias,
  rotuloSituacao,
  sincronizando,
  bloqueado,
  aoSincronizar,
  aoPreview,
}: {
  totem: DispositivoListado;
  conexao: ConexaoTotem;
  agora: number;
  fuso: string;
  participacao: number;
  categorias: string[];
  rotuloSituacao: (s: SituacaoTotem) => string;
  sincronizando: boolean;
  bloqueado: boolean;
  aoSincronizar: () => void;
  aoPreview: () => void;
}) {
  const estado = ESTADOS[t.estado];
  const selo = CONEXOES[conexao];
  const revogado = t.estado === "REVOGADO";
  const contato = ultimoContatoMs(t);
  const sinal = t.ultimoSinalEm ? paraMs(t.ultimoSinalEm) : null;
  const textoConexao =
    conexao === "SEM_SINAL" && contato !== null
      ? `Sem sinal ${haQuanto(contato, agora)}`
      : conexao === "SEM_RESPOSTA"
        ? "Não respondeu à sincronização"
        : selo.texto;

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-tema-borda bg-tema-superficie p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="truncate text-xl font-bold">{t.nome}</h2>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <Selo variante={selo.variante} icone={selo.icone} pulsar={conexao === "SINCRONIZANDO"}>
              {textoConexao}
            </Selo>
            <Selo variante={estado.variante} icone={estado.icone}>
              {estado.texto}
            </Selo>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-3xl font-extrabold tabular-nums">{formatarNumero(t.votos)}</span>
          <span className="text-sm text-tema-texto-suave">
            {t.votos === 1 ? "voto" : "votos"}
            {participacao > 0 && ` · ${formatarPercentual(participacao * 100, 0)} do total`}
          </span>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Dado rotulo="Na tela agora">
          {revogado ? "—" : t.situacaoRelatada ? rotuloSituacao(t.situacaoRelatada) : "Ainda não informado"}
          {!revogado && t.situacaoRelatada && t.telaCheia !== null && (
            <span className="ml-2 inline-flex items-center gap-1 text-tema-texto-suave">
              {t.telaCheia ? <Maximize aria-hidden className="size-3.5" /> : <Minimize aria-hidden className="size-3.5" />}
              {t.telaCheia ? "tela cheia" : "fora da tela cheia"}
            </span>
          )}
        </Dado>
        <Dado rotulo="Última sincronização">
          {sinal !== null ? (
            <span title={formatarDataHora(sinal, fuso)}>
              {haQuanto(sinal, agora)} ({formatarHora(sinal, fuso)})
            </span>
          ) : (
            "Nunca"
          )}
        </Dado>
        <Dado rotulo="Último voto">{t.ultimoUsoEm ? formatarDataHora(paraMs(t.ultimoUsoEm), fuso) : "Nenhum voto ainda"}</Dado>
        <Dado rotulo="Pareado em">{formatarDataHora(paraMs(t.criadoEm), fuso)}</Dado>
        <Dado rotulo="Categorias" largo>
          {categorias.length ? categorias.join(", ") : <span className="font-semibold text-tema-aviso">nenhuma (o totem não mostra nada)</span>}
        </Dado>
      </dl>

      {(conexao === "SEM_SINAL" || conexao === "SEM_RESPOSTA") && (
        <p className="rounded-xl bg-tema-fundo p-3 text-sm text-tema-texto-suave">
          Confira se o tablet está ligado, conectado à internet e com a página do totem aberta.
        </p>
      )}

      <div className="mt-auto flex flex-wrap gap-2">
        <Botao variante="contorno" tamanho="pequeno" onClick={aoPreview} icone={<Eye aria-hidden className="size-4" />} aria-label={`Ver preview de ${t.nome}`}>
          Ver preview
        </Botao>
        {!revogado && (
          <Botao
            variante="fantasma"
            tamanho="pequeno"
            onClick={aoSincronizar}
            disabled={bloqueado}
            carregando={sincronizando}
            icone={<RefreshCw aria-hidden className="size-4" />}
            aria-label={`Sincronizar ${t.nome}`}
          >
            Sincronizar
          </Botao>
        )}
      </div>
    </li>
  );
}

function Dado({ rotulo, children, largo }: { rotulo: string; children: React.ReactNode; largo?: boolean }) {
  return (
    <div className={largo ? "flex flex-col sm:col-span-2" : "flex flex-col"}>
      <dt className="text-tema-texto-suave">{rotulo}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
