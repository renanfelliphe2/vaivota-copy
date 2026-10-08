import { semAvaliacoesDoEvento } from "@/dominio/avaliacaoJuri";
import { votaveis } from "@/dominio/candidatos";
import type { EstadoApp, Evento } from "@/dominio/tipos";
import { DIA, HORA, paraInstante, paraMs } from "@/lib/tempo";
import { forcarEstadoEvento, forcarEstadoUrna } from "@/store/transicoes";
import type { Cenario, ContextoCenario } from "../cenarios";

// Etapa 6 (seção 5.9): cenários de estado da configuração. Puros, agem sobre o evento ativo e deixam
// verificarInvariantes vazia (os pesos continuam somando 100: D21).

function alterarEvento(atual: EstadoApp, eventoId: string, mudanca: Partial<Evento>): EstadoApp {
  return {
    ...atual,
    banco: { ...atual.banco, eventos: atual.banco.eventos.map((e) => (e.id === eventoId ? { ...e, ...mudanca } : e)) },
  };
}

/** Zera os votos do evento (popular, júri, notas e escolhas do júri, histórico, `votou` e vínculos) e o resultado congelado. */
function zerarVotos(atual: EstadoApp, eventoId: string): EstadoApp {
  const votosJuriIds = new Set(atual.banco.votosJuri.filter((v) => v.eventoId === eventoId).map((v) => v.id));
  const sufixo = `:${eventoId}`;
  return {
    ...atual,
    banco: {
      ...semAvaliacoesDoEvento(atual.banco, eventoId),
      votos: atual.banco.votos.filter((v) => v.eventoId !== eventoId),
      votosJuri: atual.banco.votosJuri.filter((v) => v.eventoId !== eventoId),
      historicoVotosJuri: atual.banco.historicoVotosJuri.filter((h) => !votosJuriIds.has(h.votoJuriId)),
      votosInfantis: atual.banco.votosInfantis.filter((v) => v.eventoId !== eventoId),
      resultados: atual.banco.resultados.filter((r) => r.eventoId !== eventoId),
      participacoes: atual.banco.participacoes.map((p) => (p.eventoId === eventoId ? { ...p, votou: false } : p)),
    },
    dev: {
      ...atual.dev,
      vinculosVoto: Object.fromEntries(Object.entries(atual.dev.vinculosVoto).filter(([chave]) => !chave.endsWith(sufixo))),
    },
  };
}

/** Evento em RASCUNHO com a urna NAO_INICIADA e sem marcas de abertura, encerramento ou conclusão. */
function voltarAoRascunho(atual: EstadoApp, eventoId: string): EstadoApp {
  return alterarEvento(zerarVotos(atual, eventoId), eventoId, {
    estado: "RASCUNHO",
    estadoUrna: "NAO_INICIADA",
    urnaAbertaEm: null,
    urnaEncerradaEm: null,
    concluidoEm: null,
  });
}

function rascunhoIncompleto(atual: EstadoApp, { eventoId, agoraMs }: ContextoCenario): EstadoApp {
  const evento = atual.banco.eventos.find((e) => e.id === eventoId);
  if (!evento) return atual;
  let proximo = voltarAoRascunho(atual, eventoId);
  const unico = votaveis(proximo.banco.candidatos.filter((c) => c.eventoId === eventoId))[0]?.id ?? null;
  const juradosIds = new Set(
    proximo.banco.participacoes.filter((p) => p.eventoId === eventoId && p.papel === "JURADO").map((p) => p.id),
  );
  proximo = {
    ...proximo,
    banco: {
      ...proximo.banco,
      candidatos: proximo.banco.candidatos.map((c) =>
        c.eventoId === eventoId && c.id !== unico ? { ...c, publicado: false } : c,
      ),
      convitesJurado: proximo.banco.convitesJurado.filter((c) => c.eventoId !== eventoId),
      participacoes: proximo.banco.participacoes.filter((p) => !juradosIds.has(p.id)),
    },
  };
  // Janela inteira no passado: início e fim anteriores ao agora.
  const inicio = agoraMs - 3 * DIA;
  return alterarEvento(proximo, eventoId, {
    janelaInicio: paraInstante(inicio, evento.fusoHorario),
    janelaFim: paraInstante(inicio + 4 * HORA, evento.fusoHorario),
  });
}

function rascunhoPronto(atual: EstadoApp, { eventoId, agoraMs }: ContextoCenario): EstadoApp {
  const evento = atual.banco.eventos.find((e) => e.id === eventoId);
  if (!evento) return atual;
  const proximo = voltarAoRascunho(atual, eventoId);
  const noFuturo = evento.janelaInicio && evento.janelaFim && paraMs(evento.janelaInicio) > agoraMs;
  if (noFuturo) return proximo;
  const inicio = agoraMs + DIA;
  return alterarEvento(proximo, eventoId, {
    janelaInicio: paraInstante(inicio, evento.fusoHorario),
    janelaFim: paraInstante(inicio + 4 * HORA, evento.fusoHorario),
  });
}

function urnaEncerrada(atual: EstadoApp, { eventoId, agoraMs }: ContextoCenario): EstadoApp {
  const ctx = { agoraMs, usuarioId: null };
  const evento = atual.banco.eventos.find((e) => e.id === eventoId);
  if (!evento) return atual;
  // Rascunho é ativado; concluído volta a ATIVO (só o estado muda; a urna fica como está).
  const ativo = evento.estado === "ATIVO" ? atual : forcarEstadoEvento(atual, eventoId, "ATIVO", ctx);
  return forcarEstadoUrna(ativo, eventoId, "ENCERRADA", ctx);
}

function eventoConcluido(atual: EstadoApp, contexto: ContextoCenario): EstadoApp {
  return forcarEstadoEvento(urnaEncerrada(atual, contexto), contexto.eventoId, "CONCLUIDO", {
    agoraMs: contexto.agoraMs,
    usuarioId: null,
  });
}

export const CENARIOS_CONFIGURACAO: Cenario[] = [
  {
    id: "RASCUNHO_INCOMPLETO",
    nome: "Rascunho incompleto",
    grupo: "ESTADO",
    descricao:
      "Evento ativo em rascunho, sem votos, com um só item na votação, sem convites e com a janela no passado (checklist com 3 bloqueios).",
    aplicar: rascunhoIncompleto,
  },
  {
    id: "RASCUNHO_PRONTO",
    nome: "Rascunho pronto",
    grupo: "ESTADO",
    descricao: "Evento ativo em rascunho, sem votos, com candidatos, convites e pesos do seed e janela no futuro (checklist sem bloqueios).",
    aplicar: rascunhoPronto,
  },
  {
    id: "URNA_ENCERRADA",
    nome: "Urna encerrada",
    grupo: "ESTADO",
    descricao: "Ativa o evento se preciso e encerra a urna (congela o resultado), mantendo os votos do seed.",
    aplicar: urnaEncerrada,
  },
  {
    id: "EVENTO_CONCLUIDO",
    nome: "Evento concluído",
    grupo: "ESTADO",
    descricao: "Urna encerrada e evento concluído (tudo em leitura).",
    aplicar: eventoConcluido,
  },
];
