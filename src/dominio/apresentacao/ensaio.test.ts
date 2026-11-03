import { describe, expect, it } from "vitest";
import type { ConfigApresentacao } from "../tipos";
import { CENARIOS_ENSAIO, cenariosDoEnsaio, type ModulosEvento } from "./cenariosEnsaio";
import { MINIMO_ITENS_ENSAIO, montarDadosEnsaio } from "./ensaio";
import { montarRoteiro } from "./roteiro";
import type { CandidatoPalco } from "./tipos";

const CONFIG: ConfigApresentacao = {
  eventoId: "evt",
  trailerUrl: null,
  usarTrailerGerado: false,
  incluirCandidatosTrailer: false,
  classificacaoCompleta: false,
  modoAvanco: "AUTOMATICO",
  rotuloCategoriaPublico: "Público",
  rotuloCategoriaInfantil: "Crianças",
  rotuloCategoriaJuri: "Jurados",
  parcialAoVivo: false,
  limiarRetaFinalSegundos: 300,
  atualizadoEm: "2026-11-02T10:00:00-03:00",
};

const MODULOS: { nome: string; modulos: ModulosEvento }[] = [
  { nome: "só o público", modulos: { juri: false, infantil: false } },
  { nome: "público e júri", modulos: { juri: true, infantil: false } },
  { nome: "público e infantil", modulos: { juri: false, infantil: true } },
  { nome: "os três", modulos: { juri: true, infantil: true } },
];

function candidatos(n: number): CandidatoPalco[] {
  return Array.from({ length: n }, (_, i) => ({ id: `c${String(i + 1).padStart(2, "0")}`, titulo: `Filme ${i + 1}`, imagemUrl: null, ordem: i + 1 }));
}

function ensaio(cenarioId: string, modulos: ModulosEvento, n: number) {
  const dados = montarDadosEnsaio({ cenarioId, candidatos: candidatos(n), modulos, config: CONFIG, calculadoEm: "2026-11-02T10:00:00-03:00" });
  if (!dados) throw new Error(`ensaio ${cenarioId} sem dados`);
  return dados;
}

describe("catálogo do ensaio", () => {
  it("oferece o empate resolvido só com dois ou mais grupos de voto", () => {
    expect(cenariosDoEnsaio({ juri: false, infantil: false })).toEqual(["SEM_EMPATE", "EMPATE_PERSISTENTE", "CO_VENCEDORES"]);
    expect(cenariosDoEnsaio({ juri: true, infantil: false })).toEqual(CENARIOS_ENSAIO.map((c) => c.id));
    expect(cenariosDoEnsaio({ juri: true, infantil: true })).toEqual(CENARIOS_ENSAIO.map((c) => c.id));
  });
});

describe.each(MODULOS)("ensaio com $nome", ({ modulos }) => {
  const ids = cenariosDoEnsaio(modulos);

  it.each([MINIMO_ITENS_ENSAIO, 4, 6, 12])("monta todos os cenários com %i itens e o roteiro sai completo", (n) => {
    for (const id of ids) {
      const d = ensaio(id, modulos, n);
      expect(d.candidatosNaDisputa).toBe(n);
      expect(d.dados.ranking).toHaveLength(n);
      expect(d.totalGeral).toBeGreaterThan(0);
      expect(d.votosPorMinutoSimulados.reduce((s, v) => s + v, 0)).toBe(d.totalGeral);
      const cenas = montarRoteiro(d.dados, { classificacaoCompleta: false, modo: "ENSAIO", candidatosNaDisputa: d.candidatosNaDisputa });
      expect(cenas.at(-1)?.tipo).toBe("FINAL");
      expect(cenas.some((c) => c.tipo === "PODIO")).toBe(true);
    }
  });

  it.each([MINIMO_ITENS_ENSAIO, 6, 12])("SEM_EMPATE: nenhum empate no pódio com %i itens", (n) => {
    const { dados } = ensaio("SEM_EMPATE", modulos, n);
    expect(dados.empates.every((e) => e.posicoes.every((p) => p > 3))).toBe(true);
    expect(dados.ranking.slice(0, 3).map((r) => r.posicao)).toEqual([1, 2, 3]);
  });

  it.each([MINIMO_ITENS_ENSAIO, 6, 12])("EMPATE_PERSISTENTE: o 1º lugar fica dividido com %i itens", (n) => {
    const { dados } = ensaio("EMPATE_PERSISTENTE", modulos, n);
    expect(dados.ranking.slice(0, 2).map((r) => [r.candidatoId, r.posicao])).toEqual([["c01", 1], ["c02", 1]]);
    expect(dados.ranking[2].posicao).toBe(3);
    const empate = dados.empates.find((e) => e.posicoes.includes(1))!;
    expect(empate.resolvido).toBe(false);
  });

  it.each([MINIMO_ITENS_ENSAIO, 6, 12])("CO_VENCEDORES: o 2º lugar fica dividido com %i itens", (n) => {
    const { dados } = ensaio("CO_VENCEDORES", modulos, n);
    expect(dados.ranking[0]).toMatchObject({ candidatoId: "c01", posicao: 1 });
    expect(dados.ranking.slice(1, 3).map((r) => [r.candidatoId, r.posicao])).toEqual([["c02", 2], ["c03", 2]]);
    expect(dados.empates.find((e) => e.posicoes.includes(2))!.resolvido).toBe(false);
  });
});

describe.each(MODULOS.filter((m) => m.modulos.juri || m.modulos.infantil))("empate resolvido com $nome", ({ modulos }) => {
  it.each([MINIMO_ITENS_ENSAIO, 6, 12])("o critério separa o 2º do 3º lugar com %i itens", (n) => {
    const { dados } = ensaio("EMPATE_RESOLVIDO", modulos, n);
    expect(dados.ranking[0]).toMatchObject({ candidatoId: "c01", posicao: 1 });
    expect(dados.ranking.slice(1, 3).map((r) => [r.candidatoId, r.posicao])).toEqual([["c02", 2], ["c03", 3]]);
    const empate = dados.empates.find((e) => e.posicoes.join() === "2,3")!;
    expect(empate).toMatchObject({ resolvido: true, vencedorId: "c02" });
    // O empate é de pontuação exata: os dois têm a mesma pontuação final.
    const [b, c] = dados.ranking.slice(1, 3);
    expect(b.pontuacao).toBe(c.pontuacao);
  });
});

describe("limites do ensaio", () => {
  it("recusa com menos de 3 itens, cenário desconhecido e cenário que o evento não comporta", () => {
    const base = { candidatos: candidatos(2), modulos: { juri: false, infantil: false }, config: CONFIG, calculadoEm: "2026-11-02T10:00:00-03:00" };
    expect(montarDadosEnsaio({ ...base, cenarioId: "SEM_EMPATE" })).toBeNull();
    expect(montarDadosEnsaio({ ...base, candidatos: candidatos(5), cenarioId: "NAO_EXISTE" })).toBeNull();
    expect(montarDadosEnsaio({ ...base, candidatos: candidatos(5), cenarioId: "EMPATE_RESOLVIDO" })).toBeNull();
  });

  it("é determinístico: mesma entrada, mesma assinatura", () => {
    const a = ensaio("SEM_EMPATE", { juri: true, infantil: true }, 6);
    const b = ensaio("SEM_EMPATE", { juri: true, infantil: true }, 6);
    expect(a.assinatura).toBe(b.assinatura);
  });
});
