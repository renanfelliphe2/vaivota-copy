import { describe, expect, it } from "vitest";
import { CENARIOS } from "@/mocks/cenarios";
import { criarEstadoInicial } from "@/mocks/criarEstadoInicial";
import { T0_MS } from "@/lib/tempo";
import { verificarInvariantes } from "../invariantes";
import { resultadoAtual } from "../resultado";
import { assinaturaDoResultado } from "./assinatura";
import { conferirFixturesFestival, conferirMotor, conferirRoteiro, FIXTURES_FESTIVAL } from "./autotestes";
import { CENARIOS_ENSAIO } from "./cenariosEnsaio";
import { resolverFasePalco } from "./fasePalco";
import { lerRevelacao } from "./revelacao";
import { interpretarLinkTrailer } from "./trailer";

// Etapa 8 (D19 rev. 3): roteiro, motor, fase, trailer, assinatura e revelação.

describe("autotestes", () => {
  it("conferirRoteiro (10 cenários, real, ensaio, classificação e casos extremos)", () => expect(conferirRoteiro()).toEqual([]));
  it("conferirMotor", () => expect(conferirMotor()).toEqual([]));
  it("conferirFixturesFestival", () => expect(conferirFixturesFestival()).toEqual([]));
});

describe("resolverFasePalco (5.1)", () => {
  const f = (fase: Parameters<typeof resolverFasePalco>[0]["fase"], resultadoExiste = false, situacao: "EM_ANDAMENTO" | "CONCLUIDA" | null = null) =>
    resolverFasePalco({ fase, resultadoExiste, revelacao: situacao ? { situacao } : null });
  it("tabela completa", () => {
    expect(f("RASCUNHO")).toBe("PRE_VOTACAO");
    expect(f("ATIVO_NAO_INICIADA")).toBe("PRE_VOTACAO");
    expect(f("URNA_ABERTA")).toBe("AO_VIVO");
    expect(f("URNA_ENCERRADA")).toBe("ENCERRADA_AGUARDANDO");
    expect(f("URNA_ENCERRADA", true)).toBe("ENCERRADA_AGUARDANDO");
    expect(f("URNA_ENCERRADA", true, "EM_ANDAMENTO")).toBe("REVELACAO");
    expect(f("URNA_ENCERRADA", true, "CONCLUIDA")).toBe("FINAL_ESTATICO");
    expect(f("CONCLUIDO", true)).toBe("FINAL_ESTATICO");
    expect(f("CONCLUIDO")).toBe("SEM_RESULTADO");
  });
});

describe("interpretarLinkTrailer (5.8)", () => {
  it("YouTube e Vimeo, sem mudo", () => {
    const yt = "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1&rel=0";
    expect(interpretarLinkTrailer("https://www.youtube.com/watch?v=aqz-KE-bpKQ")).toBe(yt);
    expect(interpretarLinkTrailer("https://youtu.be/aqz-KE-bpKQ")).toBe(yt);
    expect(interpretarLinkTrailer("https://www.youtube.com/embed/aqz-KE-bpKQ")).toBe(yt);
    expect(interpretarLinkTrailer("https://youtube.com/shorts/aqz-KE-bpKQ")).toBe(yt);
    expect(interpretarLinkTrailer("https://vimeo.com/76979871")).toBe("https://player.vimeo.com/video/76979871?autoplay=1");
    expect(interpretarLinkTrailer("https://player.vimeo.com/video/76979871")).toBe("https://player.vimeo.com/video/76979871?autoplay=1");
  });
  it("inválidos viram null", () => {
    for (const url of [null, "", "https://exemplo.com/nao-e-video", "http://youtu.be/aqz-KE-bpKQ", "https://youtu.be/curto", "nao é url"])
      expect(interpretarLinkTrailer(url)).toBeNull();
  });
});

describe("assinatura e revelação (D4)", () => {
  const base = criarEstadoInicial();
  const aplicar = (id: string, estado = base) => CENARIOS.find((c) => c.id === id)!.aplicar(estado, { eventoId: "evt-semana-tech", agoraMs: T0_MS });

  it("muda com calculadoEm e é estável para o mesmo resultado", () => {
    const r = resultadoAtual(aplicar("RESULTADO_PADRAO").banco.resultados, "evt-semana-tech")!;
    expect(assinaturaDoResultado(r)).toBe(assinaturaDoResultado(structuredClone(r)));
    expect(assinaturaDoResultado({ ...r, calculadoEm: "2026-10-22T14:00:01-03:00" })).not.toBe(assinaturaDoResultado(r));
  });

  it("lerRevelacao filtra por chave e descarta com o resultado mudado", () => {
    const revelacao = {
      eventoId: "e1",
      assinatura: "a",
      situacao: "EM_ANDAMENTO" as const,
      cena: 2,
      passo: 1,
      pausado: false,
      emergencia: false,
      iniciadaEm: "2026-10-22T14:00:00-03:00",
    };
    const ui = { apresentacao: { chave: "u1:e1", modoSala: "REAL" as const, cenarioEnsaioId: null, modoAvancoLocal: null, revelacao } };
    expect(lerRevelacao(ui, "u1", "e1", "a").revelacao).toEqual(revelacao);
    expect(lerRevelacao(ui, "u2", "e1", "a").revelacao).toBeNull();
    expect(lerRevelacao(ui, "u1", "e1", "b")).toEqual({ revelacao: null, motivoDescartada: "RESULTADO_MUDOU" });
  });
});

describe("cenários do Festival (5.11)", () => {
  for (const id of Object.keys(FIXTURES_FESTIVAL)) {
    it(`${id} aplica, é idempotente e mantém as invariantes`, () => {
      const c = CENARIOS.find((x) => x.id === id)!;
      const uma = c.aplicar(criarEstadoInicial(), { eventoId: "evt-ver-e-fazer-filmes", agoraMs: T0_MS });
      const duas = c.aplicar(uma, { eventoId: "evt-ver-e-fazer-filmes", agoraMs: T0_MS });
      expect(duas.banco).toEqual(uma.banco);
      expect(verificarInvariantes(uma)).toEqual([]);
      const r = resultadoAtual(uma.banco.resultados, "evt-ver-e-fazer-filmes")!;
      const esperado = FIXTURES_FESTIVAL[id].pontuacoes;
      expect(r.dados.ranking.map((x) => Math.round(x.pontuacao * 100) / 100).sort((a, b) => b - a)).toEqual([...esperado].sort((a, b) => b - a));
    });
  }

  it("todo cenário do ensaio existe no registro", () => {
    for (const ids of Object.values(CENARIOS_ENSAIO)) for (const id of ids) expect(CENARIOS.some((c) => c.id === id)).toBe(true);
  });
});
