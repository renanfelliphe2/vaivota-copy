import { formatarData } from "@/lib/tempo";
import { votacaoAberta } from "./situacaoEvento";
import type { Evento } from "./tipos";

// Vitrine de eventos da landing da plataforma (04/11/2026): o que a pessoa precisa saber antes de entrar na página do
// evento. Não olha relógio nem sessão (a landing é pública): usa só o estado do evento e da urna.

export type StatusVitrine = {
  rotulo: string;
  /** Define o ícone e a cor do selo. */
  tom: "aberta" | "breve" | "encerrada";
  /** Menor aparece primeiro: votação aberta, depois a que ainda vai abrir, depois as encerradas. */
  prioridade: 0 | 1 | 2;
};

/**
 * Votação que já aconteceu ou está acontecendo (vitrine "A cara do seu evento", 07/11/2026): a urna já abriu alguma vez,
 * ou o evento foi concluído. Rascunho nunca.
 */
export function votacaoJaAconteceu(evento: Pick<Evento, "estado" | "estadoUrna">): boolean {
  if (evento.estado === "RASCUNHO") return false;
  return evento.estado === "CONCLUIDO" || evento.estadoUrna !== "NAO_INICIADA";
}

type Momentos = Pick<Evento, "urnaAbertaEm" | "urnaEncerradaEm" | "concluidoEm" | "janelaInicio">;

/** Onde a votação fica na linha do tempo: encerramento da urna, abertura, conclusão ou início da janela (ms; 0 sem nenhum). */
export function momentoDaVotacao(evento: Momentos): number {
  const instante = evento.urnaEncerradaEm ?? evento.urnaAbertaEm ?? evento.concluidoEm ?? evento.janelaInicio;
  return instante ? Date.parse(instante) || 0 : 0;
}

/** Legenda curta da votação na vitrine: "Votação aberta agora", "Votação encerrada em 22/10/2026", "Concluída em …". */
export function legendaDaVotacao(evento: Pick<Evento, "estado" | "estadoUrna" | "fusoHorario"> & Momentos): string {
  if (votacaoAberta(evento)) return "Votação aberta agora";
  if (evento.estado === "CONCLUIDO") {
    const quando = evento.concluidoEm ?? evento.urnaEncerradaEm;
    return quando ? `Concluída em ${formatarData(Date.parse(quando), evento.fusoHorario)}` : "Concluída";
  }
  if (evento.estadoUrna === "ENCERRADA" && evento.urnaEncerradaEm) {
    return `Votação encerrada em ${formatarData(Date.parse(evento.urnaEncerradaEm), evento.fusoHorario)}`;
  }
  return statusNaVitrine(evento).rotulo;
}

/** Rascunho não entra na vitrine (nada do evento é público antes de ele ser ativado). */
export function statusNaVitrine(evento: Pick<Evento, "estado" | "estadoUrna">): StatusVitrine {
  if (evento.estado === "CONCLUIDO" || evento.estadoUrna === "ENCERRADA") {
    return { rotulo: "Votação encerrada", tom: "encerrada", prioridade: 2 };
  }
  if (votacaoAberta(evento)) return { rotulo: "Votação aberta", tom: "aberta", prioridade: 0 };
  return { rotulo: "Votação em breve", tom: "breve", prioridade: 1 };
}
