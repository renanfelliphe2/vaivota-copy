import { redistribuirPesos } from "@/dominio/placar";
import { congelarResultado } from "@/dominio/resultado";
import type { EstadoApp, Evento, Instante } from "@/dominio/tipos";
import { hashMock } from "@/lib/hash";
import { registrarAuditoria } from "@/store/auditoria";
import type { Cenario } from "../cenarios";
import { ID_FESTIVAL } from "../seed";
import { DISTRIBUICOES, VOTOS_POR_TOTEM_FESTIVAL, type DistribuicaoAlvo } from "../volume/distribuicoes";
import { adminDoEvento, gerarVolume, type OpcoesVolume } from "../volume/gerarVolume";
import { restaurarNucleo } from "../volume/restaurarNucleo";

// Etapa 7 (D11, seção 5.12): cenários de resultado, puros e idempotentes, com evento-alvo fixo.
// Passos: restaurarNucleo → ajustar o evento → gerarVolume → auditar abertura/encerramento → congelar (v1).
// Não usam forcarEstadoUrna: o relógio não faz parte do estado e os votos precisam cair na janela.

const IP_HASH = hashMock("ip-demo");

export type DefinicaoResultado = {
  eventoId: string;
  slug: string;
  distribuicao: DistribuicaoAlvo;
  incluirNucleo: boolean;
  publicos: number;
  jurados: OpcoesVolume["jurados"];
  infantil: boolean;
  /** Ajuste antes do volume (rascunhos, módulo desligado). */
  preparar?: (estado: EstadoApp) => EstadoApp;
};

function alterarEvento(estado: EstadoApp, eventoId: string, mudanca: Partial<Evento>): EstadoApp {
  return { ...estado, banco: { ...estado.banco, eventos: estado.banco.eventos.map((e) => (e.id === eventoId ? { ...e, ...mudanca } : e)) } };
}

/** Janela dos votos: a janela inteira do evento. */
function janelaDe(evento: Evento): { inicio: Instante; fim: Instante } {
  return { inicio: evento.janelaInicio!, fim: evento.janelaFim! };
}

/** Pura: monta o evento encerrado com a distribuição e o resultado v1. */
export function montarResultado(atual: EstadoApp, def: DefinicaoResultado, semente: string): EstadoApp {
  let estado = restaurarNucleo(atual, def.eventoId);
  const evento = estado.banco.eventos.find((e) => e.id === def.eventoId)!;
  const janela = janelaDe(evento);
  const admin = adminDoEvento(estado, def.eventoId);
  const abriuAgora = evento.urnaAbertaEm === null;

  estado = alterarEvento(estado, def.eventoId, {
    estado: "ATIVO",
    estadoUrna: "ENCERRADA",
    urnaAbertaEm: janela.inicio,
    urnaEncerradaEm: janela.fim,
    concluidoEm: null,
    atualizadoEm: janela.fim,
  });
  if (def.preparar) estado = def.preparar(estado);
  if (abriuAgora)
    estado = registrarAuditoria(estado, {
      eventoId: def.eventoId,
      usuarioId: admin,
      acao: "URNA_ABERTA",
      entidade: "evento",
      entidadeId: def.eventoId,
      ipHash: IP_HASH,
      criadoEm: janela.inicio,
    });

  estado = gerarVolume(estado, {
    eventoId: def.eventoId,
    distribuicao: def.distribuicao,
    incluirNucleo: def.incluirNucleo,
    publicos: { cadastrados: def.publicos },
    jurados: def.jurados,
    infantil: def.infantil ? { votosPorDispositivo: VOTOS_POR_TOTEM_FESTIVAL } : null,
    auditoria: true,
    janela,
    semente,
  });

  const automatico = evento.id === ID_FESTIVAL;
  estado = registrarAuditoria(estado, {
    eventoId: def.eventoId,
    usuarioId: automatico ? null : admin,
    acao: "URNA_ENCERRADA",
    entidade: "evento",
    entidadeId: def.eventoId,
    detalhes: { origem: automatico ? "AUTOMATICO" : "MANUAL" },
    ipHash: IP_HASH,
    criadoEm: janela.fim,
  });
  estado = congelarResultado(estado, def.eventoId, "ENCERRAMENTO", {
    calculadoEm: janela.fim,
    calculadoPorId: automatico ? null : admin,
  });
  return { ...estado, dev: { ...estado.dev, slugPadrao: def.slug } };
}

const FESTIVAL: Pick<DefinicaoResultado, "eventoId" | "slug"> = { eventoId: ID_FESTIVAL, slug: "ver-e-fazer-filmes" };

/** Desliga o módulo infantil antes do cálculo, redistribuindo os pesos (mesma regra da toolbar). */
function semInfantil(estado: EstadoApp): EstadoApp {
  const placar = estado.banco.configsPlacar.find((c) => c.eventoId === ID_FESTIVAL)!;
  const pesos = redistribuirPesos(
    { POPULAR: placar.pesoPopular, JURI: placar.pesoJuri, INFANTIL: placar.pesoInfantil },
    { POPULAR: true, JURI: true, INFANTIL: false },
  );
  const comEvento = alterarEvento(estado, ID_FESTIVAL, { moduloInfantil: false });
  return {
    ...comEvento,
    banco: {
      ...comEvento.banco,
      configsPlacar: comEvento.banco.configsPlacar.map((c) =>
        c.eventoId === ID_FESTIVAL ? { ...c, pesoPopular: pesos.POPULAR, pesoJuri: pesos.JURI, pesoInfantil: pesos.INFANTIL } : c,
      ),
    },
  };
}

export const FESTIVAL_BASE: Omit<DefinicaoResultado, "distribuicao" | "infantil"> = {
  ...FESTIVAL,
  incluirNucleo: false,
  publicos: 260,
  // Bruno (núcleo, pendente) + 2 jurados que votam, pelos dois convites disponíveis do seed.
  jurados: { convidados: 3, convites: "REUSAR" },
};

export const DEFINICOES_RESULTADO: Record<string, DefinicaoResultado> = {
  FESTIVAL_ENCERRADO: { ...FESTIVAL_BASE, distribuicao: DISTRIBUICOES.FESTIVAL, infantil: true },
  RESULTADO_SEM_INFANTIL: { ...FESTIVAL_BASE, distribuicao: DISTRIBUICOES.FESTIVAL_SEM_INFANTIL, infantil: false, preparar: semInfantil },
};

function cenario(id: string, nome: string, descricao: string): Cenario {
  const def = DEFINICOES_RESULTADO[id];
  return { id, nome, grupo: "RESULTADO", descricao, aplicar: (atual) => montarResultado(atual, def, id) };
}

export const CENARIOS_RESULTADO: Cenario[] = [
  cenario("FESTIVAL_ENCERRADO", "Festival encerrado", "Volume do Festival com infantil (138 votos em 3 totens), urna encerrada no fim da janela."),
  cenario("RESULTADO_SEM_INFANTIL", "Festival sem infantil", "Mesma distribuição do Festival com o módulo infantil desligado antes do cálculo."),
];
