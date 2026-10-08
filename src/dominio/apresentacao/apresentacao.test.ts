import { describe, expect, it } from "vitest";
import { CENARIOS } from "@/mocks/cenarios";
import { criarEstadoInicial } from "@/mocks/criarEstadoInicial";
import { T0_MS } from "@/lib/tempo";
import { apurar } from "../apuracao";
import { verificarInvariantes } from "../invariantes";
import { resultadoAtual } from "../resultado";
import { assinaturaDoResultado } from "./assinatura";
import { conferirFixturesFestival, conferirMotor, conferirRoteiro, FIXTURES_FESTIVAL } from "./autotestes";
import { CENARIOS_ENSAIO } from "./cenariosEnsaio";
import { resolverFasePalco } from "./fasePalco";
import { lerRevelacao } from "./revelacao";
import { montarFinal, montarProps } from "./roteiro";
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
    const yt = "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1&rel=0&enablejsapi=1";
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
  const aplicar = (id: string, estado = base) => CENARIOS.find((c) => c.id === id)!.aplicar(estado, { eventoId: "evt-ver-e-fazer-filmes", agoraMs: T0_MS });

  it("muda com calculadoEm e é estável para o mesmo resultado", () => {
    const r = resultadoAtual(aplicar("FESTIVAL_ENCERRADO").banco.resultados, "evt-ver-e-fazer-filmes")!;
    expect(assinaturaDoResultado(r)).toBe(assinaturaDoResultado(structuredClone(r)));
    expect(assinaturaDoResultado({ ...r, calculadoEm: "2026-11-28T20:00:01-03:00" })).not.toBe(assinaturaDoResultado(r));
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

describe("revelação cinematográfica (08/10/2026)", () => {
  const dados = apurar(FIXTURES_FESTIVAL.FESTIVAL_EMPATE_RESOLVIDO.entrada);

  it("trailer mudo: o embed pede início mudo e liga a API do player", () => {
    expect(interpretarLinkTrailer("https://youtu.be/aqz-KE-bpKQ", { mudo: true })).toBe(
      "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1&rel=0&mute=1&playsinline=1&enablejsapi=1",
    );
    expect(interpretarLinkTrailer("https://vimeo.com/76979871", { mudo: true })).toBe("https://player.vimeo.com/video/76979871?autoplay=1&muted=1&playsinline=1");
  });

  it("o pódio de uma posição só traz os nomes já revelados (ela e as piores)", () => {
    const props = montarProps(dados, { tipo: "PODIO", posicao: 2, passos: 3 }, 0);
    if (props.tipo !== "PODIO") throw new Error("esperava PODIO");
    expect(props.degraus.map((d) => [d.posicao, d.candidatos?.itens.map((c) => c.candidatoId) ?? null])).toEqual([
      [1, null],
      [2, ["c02"]],
      [3, ["c03"]],
    ]);
  });

  it("o final traz votos, percentuais e selos de cada candidato do pódio", () => {
    const final = montarFinal(dados);
    const c01 = final.podio[0].candidatos.itens[0];
    expect(c01.candidatoId).toBe("c01");
    expect(c01.detalhe.selos).toEqual(["INFANTIL", "JURI"]);
    expect(c01.detalhe.votos.map((v) => [v.grupo, v.votos, Math.round(v.percentual * 10) / 10])).toEqual([
      ["POPULAR", 40, 16.7],
      ["INFANTIL", 60, 43.5],
      ["JURI", 1, 50],
    ]);
    expect(final.podio[2].candidatos.itens[0].detalhe.selos).toEqual(["POPULAR"]);
    expect(final.destaques).toEqual([]);
  });
});
