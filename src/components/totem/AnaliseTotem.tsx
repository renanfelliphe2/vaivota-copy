"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input } from "@/components/ui/Campo";
import {
  formatarDuracao,
  INATIVIDADE_SESSAO_MAX,
  INATIVIDADE_SESSAO_MIN,
  type AnaliseTotem as Analise,
  type FunilTotem,
} from "@/dominio/sessaoTotem";
import { funilParaRelatorio, lerLogTotem, limparLogTotem, type EventoLog, type TipoEventoLog } from "@/lib/logTotem";
import { analisarTotem, configurarTotem } from "@/servicos/totem";
import { Funil, hora, Intervalos, Numero, percentual } from "./ResumoSessaoTotem";

// Análise do totem no próprio aparelho (logTotem.md, 26/11/2026), aberta pelo menu do PIN. Quantidades, sessões, intervalos, votos
// a cada 10 min, o funil de toques e o log recente. NUNCA o item mais votado (nem nenhum item): a tela fica à vista na sala.

const ROTULO_EVENTO: Record<TipoEventoLog, string> = {
  COMECOU: "Tocou em começar",
  ESCOLHEU: "Escolheu um filme",
  VOLTOU: "Voltou no \"É esse?\"",
  DESISTIU_ESCOLHA: "Parou na escolha (tempo)",
  DESISTIU_CONFIRMAR: "Parou no \"É esse?\" (tempo)",
  ENVIOU: "Confirmou (enviando)",
  REGISTRADO: "Voto registrado",
  ERRO: "Erro",
  TENTOU_DE_NOVO: "Tentou de novo",
  ERRO_DESCARTADO: "Erro sem nova tentativa",
  SESSAO_ENCERRADA: "Sessão encerrada",
  SESSAO_ABERTA: "Sessão aberta",
};

function descreverEvento(e: EventoLog): string {
  let texto = ROTULO_EVENTO[e.tipo];
  if (e.tipo === "ERRO" && e.codigo) texto += ` (${e.codigo === "REDE" ? "sem rede" : e.codigo.toLowerCase().replace(/_/g, " ")})`;
  if (e.tipo === "REGISTRADO" && e.votosSessao !== undefined) texto += `: ${e.votosSessao}º da sessão`;
  return texto;
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-tema-borda bg-tema-fundo p-4">
      <h2 className="text-lg font-bold">{titulo}</h2>
      {children}
    </section>
  );
}

/** Votos a cada 10 min: colunas finas, uma série só; o valor aparece na dica e embaixo das colunas que têm voto. */
function VotosPorFaixa({ faixas }: { faixas: Analise["faixasAtual"] }) {
  if (faixas.length === 0) return <p className="text-sm text-tema-texto-suave">Sem votos ainda.</p>;
  const maximo = Math.max(...faixas.map((f) => f.votos), 1);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-36 items-end gap-0.5 border-b border-tema-borda" role="img" aria-label="Votos a cada 10 minutos">
        {faixas.map((f) => (
          <div key={f.inicioMs} className="flex h-full min-w-6 flex-1 flex-col items-center justify-end" title={`${hora(new Date(f.inicioMs).toISOString())}: ${f.votos} votos`}>
            <span className="text-xs font-semibold tabular-nums text-tema-texto">{f.votos > 0 ? f.votos : ""}</span>
            <span className="w-full max-w-10 rounded-t bg-tema-primaria" style={{ height: `${(f.votos / maximo) * 85}%` }} />
          </div>
        ))}
      </div>
      <div className="flex gap-0.5">
        {faixas.map((f) => (
          <span key={f.inicioMs} className="min-w-6 flex-1 text-center text-[0.65rem] text-tema-texto-suave">
            {hora(new Date(f.inicioMs).toISOString())}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AnaliseTotem({ pin, aoVoltar }: { pin: string; aoVoltar: () => void }) {
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [minutos, setMinutos] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [log, setLog] = useState(() => lerLogTotem());

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const r = await analisarTotem(pin);
    setCarregando(false);
    setLog(lerLogTotem());
    if (!r.ok) return setErro(r.erro.mensagem);
    setAnalise(r.dados);
    setMinutos(String(r.dados.inatividadeMin));
  }, [pin]);

  useEffect(() => {
    // Espera um instante: o menu acabou de pedir o relatório com o funil mais novo.
    const t = setTimeout(() => void carregar(), 800);
    return () => clearTimeout(t);
  }, [carregar]);

  async function salvarConfiguracao(e: FormEvent) {
    e.preventDefault();
    const n = Number(minutos);
    if (!Number.isInteger(n) || n < INATIVIDADE_SESSAO_MIN || n > INATIVIDADE_SESSAO_MAX)
      return setAviso(`Use de ${INATIVIDADE_SESSAO_MIN} a ${INATIVIDADE_SESSAO_MAX} minutos.`);
    setSalvando(true);
    const r = await configurarTotem(pin, n);
    setSalvando(false);
    setAviso(r.ok ? `Pronto: a sessão encerra sozinha depois de ${r.dados.inatividadeMin} min sem voto.` : r.erro.mensagem);
    if (r.ok) setAnalise((a) => (a ? { ...a, inatividadeMin: r.dados.inatividadeMin } : a));
  }

  const atual = analise?.sessoes[0] ?? null;
  const anterior = analise?.sessoes[1] ?? null;
  // Funil da sessão atual: o do aparelho (mais novo que o último relatório) quando é a mesma sessão; senão, o do servidor.
  const local = funilParaRelatorio(log);
  const funilAtual: FunilTotem | null = atual && local?.sessaoId === atual.id ? local.contagens : (atual?.funil ?? null);
  const recentes = log.eventos.slice(-100).reverse();
  const aberta = atual && atual.encerradaEm === null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-tema-superficie text-tema-texto">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Análise do totem</h1>
            <p className="text-sm text-tema-texto-suave">
              {analise?.nome ?? "…"} · atualizado às {analise ? hora(analise.geradoEm) : "—"} · não mostra em quem se votou
            </p>
          </div>
          <div className="flex gap-2">
            <Botao variante="contorno" onClick={() => void carregar()} carregando={carregando}>
              <RefreshCw aria-hidden className="size-4" /> Atualizar
            </Botao>
            <Botao onClick={aoVoltar}>
              <ArrowLeft aria-hidden className="size-4" /> Voltar ao totem
            </Botao>
          </div>
        </header>

        {erro && <Alerta variante="erro">{erro}</Alerta>}

        {analise && (
          <>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <Numero rotulo="Votos neste totem" valor={analise.votosTotal} destaque />
              <Numero
                rotulo={atual ? `Sessão ${atual.numero}${aberta ? " (aberta)" : " (encerrada)"}` : "Sessão atual"}
                valor={atual?.votos ?? "—"}
                detalhe={
                  atual
                    ? aberta
                      ? `aberta às ${hora(atual.abertaEm)}${atual.ultimoVotoEm ? `, último voto às ${hora(atual.ultimoVotoEm)}` : ""}`
                      : `encerrada às ${hora(atual.encerradaEm)}`
                    : "o próximo voto abre a sessão"
                }
              />
              <Numero
                rotulo="Crianças esperadas"
                valor={atual?.criancasEsperadas ?? "—"}
                detalhe={atual?.percentualEsperadas != null ? `${percentual(atual.percentualEsperadas)} votaram` : "informe ao abrir a sessão"}
              />
              <Numero
                rotulo={anterior ? `Comparado à sessão ${anterior.numero}` : "Comparado à anterior"}
                valor={atual ? percentual(atual.variacaoAnterior, true) : "—"}
                detalhe={anterior ? `${anterior.votos} votos na sessão ${anterior.numero}` : "sem sessão anterior"}
              />
            </div>

            <Secao titulo={atual ? `Funil da sessão ${atual.numero}` : "Funil"}>
              <Funil funil={funilAtual} votosNoServidor={atual?.votos ?? 0} />
            </Secao>

            <div className="grid gap-4 lg:grid-cols-2">
              <Secao titulo={atual ? `Intervalo entre votos (sessão ${atual.numero})` : "Intervalo entre votos"}>
                <Intervalos intervalos={atual?.intervalos ?? analise.intervalosSemSessao} />
              </Secao>
              <Secao titulo={atual ? `Votos a cada 10 min (sessão ${atual.numero})` : "Votos a cada 10 min"}>
                <VotosPorFaixa faixas={analise.faixasAtual} />
              </Secao>
            </div>

            <Secao titulo="Sessões">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="text-tema-texto-suave">
                    <tr className="border-b border-tema-borda">
                      <th className="py-2 pr-3 font-medium">Sessão</th>
                      <th className="py-2 pr-3 font-medium">Horário</th>
                      <th className="py-2 pr-3 font-medium">Encerramento</th>
                      <th className="py-2 pr-3 text-right font-medium">Votos</th>
                      <th className="py-2 pr-3 text-right font-medium">Esperadas</th>
                      <th className="py-2 pr-3 text-right font-medium">vs. anterior</th>
                      <th className="py-2 text-right font-medium">Intervalo (mediana)</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {analise.sessoes.map((s) => (
                      <tr key={s.id} className="border-b border-tema-borda/60">
                        <td className="py-2 pr-3 font-semibold">{s.numero}</td>
                        <td className="py-2 pr-3">
                          {hora(s.abertaEm)} – {s.encerradaEm ? hora(s.encerradaEm) : "agora"}
                        </td>
                        <td className="py-2 pr-3">{s.motivo === "MANUAL" ? "pelo menu" : s.motivo === "INATIVIDADE" ? "sem voto (automático)" : "aberta"}</td>
                        <td className="py-2 pr-3 text-right">{s.votos}</td>
                        <td className="py-2 pr-3 text-right">
                          {s.criancasEsperadas ? `${s.criancasEsperadas} (${percentual(s.percentualEsperadas)})` : "—"}
                        </td>
                        <td className="py-2 pr-3 text-right">{percentual(s.variacaoAnterior, true)}</td>
                        <td className="py-2 text-right">{s.intervalos ? formatarDuracao(s.intervalos.medianaS) : "—"}</td>
                      </tr>
                    ))}
                    {analise.votosSemSessao > 0 && (
                      <tr>
                        <td className="py-2 pr-3 font-semibold">—</td>
                        <td className="py-2 pr-3" colSpan={2}>
                          Antes das sessões existirem
                        </td>
                        <td className="py-2 pr-3 text-right">{analise.votosSemSessao}</td>
                        <td className="py-2 pr-3 text-right">—</td>
                        <td className="py-2 pr-3 text-right">—</td>
                        <td className="py-2 text-right">{analise.intervalosSemSessao ? formatarDuracao(analise.intervalosSemSessao.medianaS) : "—"}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Secao>

            <div className="grid gap-4 lg:grid-cols-2">
              <Secao titulo="Log deste aparelho (últimos 100)">
                {recentes.length === 0 ? (
                  <p className="text-sm text-tema-texto-suave">Nada registrado ainda neste aparelho.</p>
                ) : (
                  <ol className="max-h-80 overflow-y-auto text-sm">
                    {recentes.map((e, i) => (
                      <li key={`${e.t}-${i}`} className="flex gap-3 border-b border-tema-borda/50 py-1">
                        <span className="shrink-0 tabular-nums text-tema-texto-suave">
                          {new Date(e.t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                        <span className={e.tipo === "ERRO" || e.tipo === "ERRO_DESCARTADO" ? "font-semibold text-tema-erro" : ""}>{descreverEvento(e)}</span>
                      </li>
                    ))}
                  </ol>
                )}
                <Botao
                  variante="fantasma"
                  tamanho="pequeno"
                  onClick={() => {
                    if (!window.confirm("Apagar o log deste aparelho? O funil já enviado continua no servidor.")) return;
                    limparLogTotem();
                    setLog(lerLogTotem());
                  }}
                >
                  Apagar o log deste aparelho
                </Botao>
              </Secao>

              <Secao titulo="Encerramento automático">
                <form onSubmit={(e) => void salvarConfiguracao(e)} className="flex flex-col gap-3">
                  <Campo id="totem-inatividade" rotulo="Encerrar a sessão sozinho depois de quantos minutos sem voto?">
                    <Input inputMode="numeric" value={minutos} onChange={(e) => setMinutos(e.target.value.replace(/\D/g, "").slice(0, 4))} />
                  </Campo>
                  <p className="text-sm text-tema-texto-suave">
                    O voto que chegar depois desse tempo parado abre a sessão seguinte. Padrão: 60 min. De {INATIVIDADE_SESSAO_MIN} a{" "}
                    {INATIVIDADE_SESSAO_MAX} min.
                  </p>
                  {aviso && <Alerta variante="informacao">{aviso}</Alerta>}
                  <Botao type="submit" carregando={salvando}>
                    Salvar
                  </Botao>
                </form>
              </Secao>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
