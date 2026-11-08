import { describe, expect, it } from "vitest";
import { apurar } from "./apuracao";
import {
  comResultado,
  comTotal,
  gruposDaVotacao,
  idsDosVencedores,
  ordenarVotacoes,
  totaisDaVitrine,
  type VotacaoEncerrada,
} from "./votacoesEncerradas";

const candidatos = [
  { id: "a", ordem: 1, desqualificado: false },
  { id: "b", ordem: 2, desqualificado: false },
  { id: "c", ordem: 3, desqualificado: false },
];

function resultado(votos: Record<string, number>, opcoes: { desqualificados?: string[] } = {}) {
  return apurar({
    candidatos: candidatos.map((c) => ({ ...c, desqualificado: opcoes.desqualificados?.includes(c.id) ?? false })),
    votos: { POPULAR: votos, JURI: {}, INFANTIL: {} },
    pesos: { POPULAR: 100, JURI: 0, INFANTIL: 0 },
    gruposAtivos: ["POPULAR"],
    criterio: "PUBLICO",
  });
}

describe("idsDosVencedores", () => {
  it("o primeiro lugar do ranking oficial vence", () => {
    expect(idsDosVencedores(resultado({ a: 3, b: 7, c: 1 }).ranking)).toEqual(["b"]);
  });

  it("empate sem desempate no primeiro lugar: os dois aparecem", () => {
    expect(idsDosVencedores(resultado({ a: 5, b: 5, c: 1 }).ranking)).toEqual(["a", "b"]);
  });

  it("desqualificado não vence, mesmo com mais votos", () => {
    expect(idsDosVencedores(resultado({ a: 9, b: 4, c: 1 }, { desqualificados: ["a"] }).ranking)).toEqual(["b"]);
  });

  it("sem nenhum voto ninguém vence (todos empatam no zero)", () => {
    expect(idsDosVencedores(resultado({}).ranking)).toEqual([]);
  });

  it("dados sem ranking não quebram a página", () => {
    expect(idsDosVencedores(undefined)).toEqual([]);
  });
});

describe("totais e grupos", () => {
  const maratona = { participantes: 459, votos: comTotal({ publico: 438, juri: 0, infantil: 0 }), modulos: { juri: false, infantil: false } };
  const festival = { participantes: 312, votos: comTotal({ publico: 290, juri: 9, infantil: 140 }), modulos: { juri: true, infantil: true } };

  it("o total soma público, júri e crianças", () => {
    expect(festival.votos.total).toBe(439);
  });

  it("os totais da vitrine somam todas as votações", () => {
    expect(totaisDaVitrine([maratona, festival])).toEqual({ votacoes: 2, participantes: 771, votos: 877 });
    expect(totaisDaVitrine([])).toEqual({ votacoes: 0, participantes: 0, votos: 0 });
  });

  it("só mostra os grupos dos módulos ligados no evento", () => {
    expect(gruposDaVotacao(maratona)).toEqual([{ rotulo: "Público", votos: 438 }]);
    expect(gruposDaVotacao(festival).map((g) => g.rotulo)).toEqual(["Público", "Júri", "Crianças"]);
  });
});

describe("ordenarVotacoes", () => {
  it("a mais recente vem primeiro (pelo encerramento da urna); no mesmo instante, pelo nome", () => {
    const lista = [
      { nome: "Bienal", encerradaEmMs: 100 },
      { nome: "Mostra", encerradaEmMs: 300 },
      { nome: "Arena", encerradaEmMs: 100 },
    ];
    expect(ordenarVotacoes(lista).map((v) => v.nome)).toEqual(["Mostra", "Arena", "Bienal"]);
  });
});

describe("comResultado", () => {
  const base: VotacaoEncerrada = {
    eventoId: "e",
    slug: "e",
    nome: "Evento",
    local: null,
    encerradaEmMs: 100,
    concluidaEmMs: null,
    fusoHorario: "America/Sao_Paulo",
    tema: { corPrimaria: "#000000", corSecundaria: "#ffffff", logoUrl: null },
    rotuloCandidato: "Projeto",
    participantes: 3,
    votos: comTotal({ publico: 2, juri: 0, infantil: 0 }),
    modulos: { juri: false, infantil: false },
    vencedores: null,
  };

  it("urna encerrada com o evento ainda ativo: os números aparecem, o resultado ainda não", () => {
    expect(comResultado(base)).toBe(false);
  });

  it("evento concluído: o resultado é público, mesmo sem nenhum voto válido", () => {
    expect(comResultado({ ...base, concluidaEmMs: 200, vencedores: [{ id: "a", titulo: "A", imagemUrl: null }] })).toBe(true);
    expect(comResultado({ ...base, concluidaEmMs: 200, vencedores: [] })).toBe(true);
  });
});
