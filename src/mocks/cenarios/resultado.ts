import { redistribuirPesos } from "@/dominio/placar";
import { congelarResultado } from "@/dominio/resultado";
import type { EstadoApp, Evento, Instante } from "@/dominio/tipos";
import { hashMock } from "@/lib/hash";
import { T0 } from "@/lib/tempo";
import { registrarAuditoria } from "@/store/auditoria";
import type { Cenario } from "../cenarios";
import { ID_FESTIVAL, ID_SEMANA_TECH } from "../seed";
import { DISTRIBUICOES, VOTOS_POR_TOTEM_FESTIVAL, type DistribuicaoAlvo } from "../volume/distribuicoes";
import { adminDoEvento, gerarVolume, type OpcoesVolume } from "../volume/gerarVolume";
import { restaurarNucleo } from "../volume/restaurarNucleo";
import { ABERTURA_SEMANA_TECH, aplicarVolumeSemanaTech } from "../volume/semanaTech";

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
  /** Gera o volume no lugar do gerarVolume padrão (RESULTADO_PADRAO reaproveita o seed do PADRAO). */
  gerar?: (estado: EstadoApp) => EstadoApp;
  /** Ajuste antes do volume (rascunhos, módulo desligado). */
  preparar?: (estado: EstadoApp) => EstadoApp;
};

function alterarEvento(estado: EstadoApp, eventoId: string, mudanca: Partial<Evento>): EstadoApp {
  return { ...estado, banco: { ...estado.banco, eventos: estado.banco.eventos.map((e) => (e.id === eventoId ? { ...e, ...mudanca } : e)) } };
}

/** Janela dos votos: Semana Tech das 13h a T0; Festival a janela inteira. */
function janelaDe(evento: Evento): { inicio: Instante; fim: Instante } {
  if (evento.id === ID_SEMANA_TECH) return { inicio: ABERTURA_SEMANA_TECH, fim: T0 };
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

  estado = def.gerar ? def.gerar(estado) : gerarVolume(estado, {
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

const SEMANA_TECH: Pick<DefinicaoResultado, "eventoId" | "slug" | "infantil"> = { eventoId: ID_SEMANA_TECH, slug: "semana-tech", infantil: false };
const FESTIVAL: Pick<DefinicaoResultado, "eventoId" | "slug"> = { eventoId: ID_FESTIVAL, slug: "ver-e-fazer-filmes" };

/** Fixtures de empate: popular 350, júri 6, sem os votos do núcleo (3 jurados pendentes). */
function fixtureSemanaTech(distribuicao: DistribuicaoAlvo): DefinicaoResultado {
  return { ...SEMANA_TECH, distribuicao, incluirNucleo: false, publicos: 511, jurados: { convidados: 9, convites: "CRIAR" } };
}

/** Só c01 e c02 continuam publicados. */
function soDoisCandidatos(estado: EstadoApp): EstadoApp {
  const manter = new Set(["cand-st-01", "cand-st-02"]);
  return {
    ...estado,
    banco: {
      ...estado.banco,
      candidatos: estado.banco.candidatos.map((c) =>
        c.eventoId === ID_SEMANA_TECH && !manter.has(c.id) ? { ...c, publicado: false } : c,
      ),
    },
  };
}

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
  jurados: { convidados: 2, convites: "REUSAR" },
};

export const DEFINICOES_RESULTADO: Record<string, DefinicaoResultado> = {
  RESULTADO_PADRAO: {
    ...SEMANA_TECH,
    distribuicao: DISTRIBUICOES.PADRAO,
    incluirNucleo: true,
    publicos: 511,
    jurados: { convidados: 9, convites: "CRIAR" },
    gerar: aplicarVolumeSemanaTech,
  },
  RESULTADO_EMPATE_RESOLVIDO: fixtureSemanaTech(DISTRIBUICOES.EMPATE_RESOLVIDO),
  RESULTADO_EMPATE_PERSISTENTE: fixtureSemanaTech(DISTRIBUICOES.EMPATE_PERSISTENTE),
  RESULTADO_CO_VENCEDORES: fixtureSemanaTech(DISTRIBUICOES.CO_VENCEDORES),
  RESULTADO_DOIS_CANDIDATOS: {
    ...SEMANA_TECH,
    distribuicao: DISTRIBUICOES.DOIS_CANDIDATOS,
    incluirNucleo: false,
    publicos: 511,
    jurados: { convidados: 9, convites: "CRIAR" },
    preparar: soDoisCandidatos,
  },
  FESTIVAL_ENCERRADO: { ...FESTIVAL_BASE, distribuicao: DISTRIBUICOES.FESTIVAL, infantil: true },
  RESULTADO_SEM_INFANTIL: { ...FESTIVAL_BASE, distribuicao: DISTRIBUICOES.FESTIVAL_SEM_INFANTIL, infantil: false, preparar: semInfantil },
};

function cenario(id: string, nome: string, descricao: string): Cenario {
  const def = DEFINICOES_RESULTADO[id];
  return { id, nome, grupo: "RESULTADO", descricao, aplicar: (atual) => montarResultado(atual, def, id) };
}

export const CENARIOS_RESULTADO: Cenario[] = [
  cenario("RESULTADO_PADRAO", "Resultado padrão (Semana Tech)", "Volume PADRAO com a urna encerrada em T0 (versão 1, sem empates)."),
  cenario(
    "RESULTADO_EMPATE_RESOLVIDO",
    "Empate resolvido (Semana Tech)",
    "c02 e c03 empatam em 17,00; o critério do júri dá o 2º lugar a c02.",
  ),
  cenario(
    "RESULTADO_EMPATE_PERSISTENTE",
    "Empate persistente (Semana Tech)",
    "c01 e c02 empatam em 28,00 e o critério não separa: 1º compartilhado.",
  ),
  cenario("RESULTADO_CO_VENCEDORES", "Co-vencedores (Semana Tech)", "c02 e c03 dividem o 2º lugar e a categoria do júri."),
  cenario("RESULTADO_DOIS_CANDIDATOS", "Dois na disputa (Semana Tech)", "Só c01 e c02 publicados: 61,32 e 38,68."),
  cenario("FESTIVAL_ENCERRADO", "Festival encerrado", "Volume do Festival com infantil (138 votos em 3 totens), urna encerrada no fim da janela."),
  cenario("RESULTADO_SEM_INFANTIL", "Festival sem infantil", "Mesma distribuição do Festival com o módulo infantil desligado antes do cálculo."),
];
