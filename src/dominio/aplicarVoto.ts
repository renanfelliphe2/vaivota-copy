import { hashMock } from "@/lib/hash";
import { paraInstante } from "@/lib/tempo";
import type { EstadoApp, Participacao } from "./tipos";

// Etapa 5 (D6): mutações puras do voto. Mantêm as invariantes 3 e 4 numa única receita.
// Nunca criam participação (D14, rev. 3 C2): sem ela, devolvem o mesmo estado (o serviço já recusou).
// A Etapa 7 reaproveita estas funções no seed de volume e em "Simular votos entrando".

export type EntradaVoto = {
  eventoId: string;
  usuarioId: string;
  candidatoId: string;
  agoraMs: number;
};

function acharParticipacao(estado: EstadoApp, usuarioId: string, eventoId: string): Participacao | undefined {
  return estado.banco.participacoes.find((p) => p.usuarioId === usuarioId && p.eventoId === eventoId);
}

function fusoDoEvento(estado: EstadoApp, eventoId: string): string | undefined {
  return estado.banco.eventos.find((e) => e.id === eventoId)?.fusoHorario;
}

function marcarVotou(participacoes: Participacao[], participacaoId: string): Participacao[] {
  return participacoes.map((p) => (p.id === participacaoId ? { ...p, votou: true } : p));
}

/** Chave de `dev.vinculosVoto` (D16 da Etapa 5). */
export function chaveVinculo(usuarioId: string, eventoId: string): string {
  return `${usuarioId}:${eventoId}`;
}

/** Voto popular: `Voto` sem usuário + `votou` + `sequencias.voto` + `dev.vinculosVoto`. */
export function aplicarVotoPopular(estado: EstadoApp, entrada: EntradaVoto): EstadoApp {
  const { eventoId, usuarioId, candidatoId, agoraMs } = entrada;
  const participacao = acharParticipacao(estado, usuarioId, eventoId);
  if (!participacao) return estado;
  const id = estado.banco.sequencias.voto + 1;
  return {
    ...estado,
    banco: {
      ...estado.banco,
      sequencias: { ...estado.banco.sequencias, voto: id },
      votos: [
        ...estado.banco.votos,
        {
          id,
          eventoId,
          candidatoId,
          // Só do mock: em produção é aleatório de 32 bytes, nunca derivado de sequência (rev. 3, C20).
          hashRecibo: hashMock(`recibo:${eventoId}:${id}`),
          criadoEm: paraInstante(agoraMs, fusoDoEvento(estado, eventoId)),
        },
      ],
      participacoes: marcarVotou(estado.banco.participacoes, participacao.id),
    },
    dev: { ...estado.dev, vinculosVoto: { ...estado.dev.vinculosVoto, [chaveVinculo(usuarioId, eventoId)]: id } },
  };
}

export type EntradaVotoInfantil = {
  eventoId: string;
  dispositivoId: string;
  candidatoId: string;
  agoraMs: number;
};

/** Voto infantil (totem): `VotoInfantil` com candidato, horário e dispositivo + `ultimoUsoEm` do totem. Nenhum dado da criança. */
export function aplicarVotoInfantil(estado: EstadoApp, entrada: EntradaVotoInfantil): EstadoApp {
  const { eventoId, dispositivoId, candidatoId, agoraMs } = entrada;
  const id = estado.banco.sequencias.votoInfantil + 1;
  const agora = paraInstante(agoraMs, fusoDoEvento(estado, eventoId));
  return {
    ...estado,
    banco: {
      ...estado.banco,
      sequencias: { ...estado.banco.sequencias, votoInfantil: id },
      votosInfantis: [...estado.banco.votosInfantis, { id, eventoId, candidatoId, dispositivoId, criadoEm: agora }],
      dispositivos: estado.banco.dispositivos.map((d) => (d.id === dispositivoId ? { ...d, ultimoUsoEm: agora } : d)),
    },
  };
}

/** Id do `VotoJuri` de uma participação (único por participação e evento). */
export function idVotoJuri(participacaoId: string): string {
  return `vj-${participacaoId}`;
}

/**
 * Voto do júri: cria ou atualiza o `VotoJuri`, acrescenta a entrada de histórico (anterior nulo no primeiro
 * voto; D10) e marca `votou`. O id da entrada nova é `sequencias.historicoVotoJuri` do estado devolvido.
 */
export function aplicarVotoJuri(estado: EstadoApp, entrada: EntradaVoto): EstadoApp {
  const { eventoId, usuarioId, candidatoId, agoraMs } = entrada;
  const participacao = acharParticipacao(estado, usuarioId, eventoId);
  if (!participacao) return estado;
  const agora = paraInstante(agoraMs, fusoDoEvento(estado, eventoId));
  const existente = estado.banco.votosJuri.find((v) => v.participacaoId === participacao.id && v.eventoId === eventoId);
  const votoJuriId = existente?.id ?? idVotoJuri(participacao.id);
  const historicoId = estado.banco.sequencias.historicoVotoJuri + 1;

  const votosJuri = existente
    ? estado.banco.votosJuri.map((v) => (v.id === existente.id ? { ...v, candidatoId, atualizadoEm: agora } : v))
    : [
        ...estado.banco.votosJuri,
        { id: votoJuriId, eventoId, participacaoId: participacao.id, candidatoId, criadoEm: agora, atualizadoEm: agora },
      ];

  return {
    ...estado,
    banco: {
      ...estado.banco,
      sequencias: { ...estado.banco.sequencias, historicoVotoJuri: historicoId },
      votosJuri,
      historicoVotosJuri: [
        ...estado.banco.historicoVotosJuri,
        {
          id: historicoId,
          votoJuriId,
          candidatoAnteriorId: existente?.candidatoId ?? null,
          candidatoNovoId: candidatoId,
          criadoEm: agora,
        },
      ],
      participacoes: marcarVotou(estado.banco.participacoes, participacao.id),
    },
  };
}
