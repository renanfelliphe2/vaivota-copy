"use client";

import { ArrowLeft, MonitorPlay } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Cartao } from "@/components/ui/Cartao";
import { DialogoConfirmacao } from "@/components/ui/DialogoConfirmacao";
import { Selo } from "@/components/ui/Selo";
import { cenariosDoEnsaio } from "@/dominio/apresentacao/cenariosEnsaio";
import { resolverFasePalco, ROTULO_FASE_PALCO } from "@/dominio/apresentacao/fasePalco";
import { descreverRoteiroPublico } from "@/dominio/apresentacao/roteiroPublico";
import { votaveis } from "@/dominio/candidatos";
import { resolverFaseConfig } from "@/dominio/travas";
import type { ModoAvanco } from "@/dominio/tipos";
import { ROTULO_ESTADO_EVENTO, ROTULO_ESTADO_URNA } from "@/lib/rotulos";
import { useConsulta } from "@/lib/useConsulta";
import { listarCenarios } from "@/store/acoes";
import { obterStatusResultado, registrarAcaoApresentacao } from "@/servicos/apresentacao";
import { definirCenarioEnsaio, definirModoAvancoLocal, definirModoSala, refazerRevelacao } from "@/store/acoesApresentacao";
import { usePreferenciasSala, useRevelacao } from "@/store/seletores/apresentacao";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useVersaoResultado } from "@/store/seletores/resultado";
import { ListaAtalhos } from "./Palco";

// Etapa 8 (D2, 5.6): a sala nunca mostra resultado. Só pergunta obterStatusResultado (existe? assinatura?).

const LIMITE_IMAGEM_MS = 8000;
const semInscricao = () => () => {};

/** Pré-carrega imagens de public/ ou blob: (placeholder: e null não usam rede, D16). */
function usePreCarregamento(urls: string[]) {
  const chave = urls.join("|");
  const [estado, setEstado] = useState<{ chave: string; feitas: number; falhas: number }>({ chave, feitas: 0, falhas: 0 });
  useEffect(() => {
    const lista = chave ? chave.split("|") : [];
    let cancelado = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const url of lista) {
      const img = new Image();
      let terminou = false;
      const fim = (ok: boolean) => {
        if (terminou || cancelado) return;
        terminou = true;
        setEstado((e) => (e.chave === chave ? { ...e, feitas: e.feitas + 1, falhas: e.falhas + (ok ? 0 : 1) } : { chave, feitas: 1, falhas: ok ? 0 : 1 }));
      };
      img.onload = () => fim(true);
      img.onerror = () => fim(false);
      timers.push(setTimeout(() => fim(false), LIMITE_IMAGEM_MS));
      img.src = url;
    }
    return () => {
      cancelado = true;
      timers.forEach(clearTimeout);
    };
  }, [chave]);
  const atual = estado.chave === chave ? estado : { feitas: 0, falhas: 0 };
  return { total: urls.length, feitas: atual.feitas, falhas: atual.falhas, pronto: atual.feitas >= urls.length };
}

export function SalaControle({ aoApresentar, preparando, erroEnsaio }: { aoApresentar: () => void; preparando: boolean; erroEnsaio: string | null }) {
  const ativo = useEventoAtivo()!;
  const { evento, tema, configApresentacao, slug } = ativo;
  const eventoId = evento.id;
  const idCenario = useId();
  const versao = useVersaoResultado(eventoId);
  const status = useConsulta(() => obterStatusResultado(eventoId), { chave: `${eventoId}:${versao}` });
  const assinatura = status.dados?.assinatura ?? null;
  const existe = status.dados?.existe ?? false;
  const { revelacao, motivoDescartada } = useRevelacao(eventoId, assinatura);
  const prefs = usePreferenciasSala(eventoId);
  const { fase, incoerente } = resolverFaseConfig(evento);
  const fasePalco = resolverFasePalco({ fase, resultadoExiste: existe, revelacao });
  const [confirmar, setConfirmar] = useState(false);
  const origem = useSyncExternalStore(semInscricao, () => window.location.origin, () => "");

  const cenarios = cenariosDoEnsaio(eventoId);
  const nomesCenarios = new Map(listarCenarios().map((c) => [c.id, c]));
  const cenarioId = prefs.cenarioEnsaioId && cenarios.includes(prefs.cenarioEnsaioId) ? prefs.cenarioEnsaioId : cenarios[0];
  const modoAvanco: ModoAvanco = prefs.modoAvancoLocal ?? configApresentacao.modoAvanco;
  const urlQr = `${origem}/e/${slug}`;
  const local = /\/\/(localhost|127\.0\.0\.1)/.test(origem);

  const imagens = votaveis(ativo.candidatos)
    .map((c) => c.imagemUrl)
    .concat(tema.logoUrl)
    .filter((u): u is string => Boolean(u) && (u!.startsWith("/") || u!.startsWith("blob:")));
  const pre = usePreCarregamento(imagens);
  const concluidoEvento = fase === "CONCLUIDO";

  async function refazer() {
    setConfirmar(false);
    refazerRevelacao(eventoId);
    if (status.dados?.versao) registrarAcaoApresentacao(eventoId, "REVELACAO_REFEITA", { versao: status.dados.versao });
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-3">
        <Link href={`/e/${slug}/admin`} className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-tema-primaria-texto underline">
          <ArrowLeft aria-hidden className="size-4" /> Voltar ao painel
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Apresentação</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{tema.nomeExibicao ?? evento.nome}</span>
          <Selo>{ROTULO_ESTADO_EVENTO[evento.estado]}</Selo>
          <Selo>{ROTULO_ESTADO_URNA[evento.estadoUrna]}</Selo>
        </div>
        <p className="text-sm">
          Vai abrir em: <strong>{ROTULO_FASE_PALCO[fasePalco]}</strong>
          {fase === "RASCUNHO" && " (evento em preparação)"}
        </p>
      </header>

      {incoerente && <Alerta variante="aviso">Combinação criada pela toolbar. Use a toolbar para voltar a um estado válido.</Alerta>}
      {motivoDescartada === "RESULTADO_MUDOU" && (
        <Alerta variante="aviso">O resultado mudou desde a última revelação. A cerimônia recomeça do início.</Alerta>
      )}
      {fase === "URNA_ENCERRADA" && !existe && status.dados && <Alerta variante="informacao">O resultado oficial ainda não foi calculado.</Alerta>}
      <Alerta variante="informacao" titulo="Antes de apresentar">
        <ul className="list-disc pl-5">
          <li>Recomenda-se estender a tela e deixar a apresentação no monitor do telão. Com a tela espelhada, o público vê esta sala.</li>
          <li>Abra a apresentação nesta mesma janela. Em outra aba ou depois de atualizar a página, os dados voltam ao início.</li>
          <li>
            O QR Code vai apontar para <strong className="break-all">{urlQr}</strong>.{local && " Celulares podem não alcançar este endereço."}
          </li>
        </ul>
      </Alerta>

      <Cartao className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Modo</h2>
        <div role="radiogroup" aria-label="Modo da apresentação" className="flex flex-wrap gap-2">
          {(["REAL", "ENSAIO"] as const).map((m) => (
            <Botao key={m} variante={prefs.modoSala === m ? "primaria" : "contorno"} tamanho="pequeno" role="radio" aria-checked={prefs.modoSala === m} onClick={() => definirModoSala(eventoId, m)}>
              {m === "REAL" ? "Apresentação real" : "Ensaio"}
            </Botao>
          ))}
        </div>
        {prefs.modoSala === "ENSAIO" && (
          <div className="flex flex-col gap-1">
            <label htmlFor={idCenario} className="text-sm font-semibold">
              Cenário do ensaio
            </label>
            <select
              id={idCenario}
              value={cenarioId}
              onChange={(e) => definirCenarioEnsaio(eventoId, e.target.value)}
              className="min-h-11 rounded-xl border border-tema-borda bg-tema-fundo px-3 text-sm"
            >
              {cenarios.map((id) => (
                <option key={id} value={id}>
                  {nomesCenarios.get(id)?.nome ?? id}
                </option>
              ))}
            </select>
            <p className="text-sm text-tema-texto-suave">{nomesCenarios.get(cenarioId)?.descricao} O ensaio não altera nada do evento real.</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Avanço:</span>
          {(["AUTOMATICO", "MANUAL"] as const).map((m) => (
            <Botao key={m} variante={modoAvanco === m ? "primaria" : "contorno"} tamanho="pequeno" aria-pressed={modoAvanco === m} onClick={() => definirModoAvancoLocal(eventoId, m)}>
              {m === "AUTOMATICO" ? "Automático" : "Manual"}
            </Botao>
          ))}
        </div>
      </Cartao>

      {prefs.modoSala === "REAL" && existe && (
        <Cartao className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Revelação</h2>
          <p className="text-sm">
            {!revelacao ? "Ainda não iniciada." : revelacao.situacao === "EM_ANDAMENTO" ? "Em andamento: Apresentar continua de onde parou." : "Concluída."}
          </p>
          {revelacao && (
            <div className="flex flex-col gap-1">
              <Botao variante="contorno" tamanho="pequeno" className="self-start" disabled={concluidoEvento} onClick={() => setConfirmar(true)}>
                {revelacao.situacao === "EM_ANDAMENTO" ? "Recomeçar" : "Refazer revelação"}
              </Botao>
              {concluidoEvento && <p className="text-sm text-tema-texto-suave">Evento concluído: o resultado abre direto no final, sem cerimônia.</p>}
            </div>
          )}
        </Cartao>
      )}

      <Cartao className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Roteiro</h2>
        <ol className="list-decimal pl-5 text-sm">
          {descreverRoteiroPublico({
            modulos: { juri: evento.moduloJuri, infantil: evento.moduloInfantil },
            classificacaoCompleta: configApresentacao.classificacaoCompleta,
            modo: prefs.modoSala,
          }).map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ol>
      </Cartao>

      <Cartao className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Atalhos no palco</h2>
        <ListaAtalhos />
      </Cartao>

      <div className="flex flex-col gap-2">
        {pre.total > 0 && (
          <label className="flex flex-col gap-1 text-sm">
            Pré-carregamento de imagens ({pre.feitas} de {pre.total})
            <progress max={pre.total} value={pre.feitas} aria-valuenow={pre.feitas} className="w-full" />
          </label>
        )}
        {pre.falhas > 0 && <p className="text-sm text-tema-aviso">{pre.falhas} imagens não carregaram: o palco usa o cartaz padrão.</p>}
        {erroEnsaio && <Alerta variante="erro">{erroEnsaio}</Alerta>}
        <Botao tamanho="grande" icone={<MonitorPlay aria-hidden className="size-5" />} disabled={!pre.pronto} carregando={preparando} onClick={aoApresentar}>
          {preparando ? "Preparando…" : "Apresentar"}
        </Botao>
      </div>

      <DialogoConfirmacao
        aberto={confirmar}
        aoFechar={() => setConfirmar(false)}
        aoConfirmar={refazer}
        titulo={revelacao?.situacao === "EM_ANDAMENTO" ? "Recomeçar a revelação?" : "Refazer a revelação?"}
        consequencia="A cerimônia volta ao início (trailer). A ação fica registrada na auditoria."
        rotuloConfirmar={revelacao?.situacao === "EM_ANDAMENTO" ? "Recomeçar" : "Refazer"}
      />
    </div>
  );
}
