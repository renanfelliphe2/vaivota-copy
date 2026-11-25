import { describe, expect, it } from "vitest";
import { CENARIOS } from "@/mocks/cenarios";
import { criarEstadoInicial } from "@/mocks/criarEstadoInicial";
import { T0_MS } from "@/lib/tempo";
import { apurar } from "../apuracao";
import { verificarInvariantes } from "../invariantes";
import { resultadoAtual } from "../resultado";
import { assinaturaDoResultado } from "./assinatura";
import type { OrdemCerimonia } from "../tipos";
import { conferirFixturesFestival, conferirMotor, conferirRoteiro, entradaPadrao, FIXTURES_FESTIVAL, texto } from "./autotestes";
import { ordenarCerimonia } from "./cerimonia";
import { resolverFasePalco } from "./fasePalco";
import { lerRevelacao } from "./revelacao";
import { montarFinal, montarProps, montarRoteiro } from "./roteiro";
import { interpretarLinkTrailer } from "./trailer";

// Etapa 8 (D19 rev. 3): roteiro, motor, fase, trailer, assinatura e revelação.

describe("autotestes", () => {
  it("conferirRoteiro (10 cenários, real, ensaio e casos extremos)", () => expect(conferirRoteiro()).toEqual([]));
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
    const ui = { apresentacao: { chave: "u1:e1", modoSala: "REAL" as const, cenarioEnsaioId: null, modoAvancoLocal: null, categoriaId: null, revelacao } };
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
});

describe("revelação cinematográfica (08/10/2026)", () => {
  const dados = apurar(FIXTURES_FESTIVAL.FESTIVAL_EMPATE_RESOLVIDO.entrada);

  it("trailer mudo: o embed pede início mudo e liga a API do player", () => {
    expect(interpretarLinkTrailer("https://youtu.be/aqz-KE-bpKQ", { mudo: true })).toBe(
      "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1&rel=0&mute=1&playsinline=1&enablejsapi=1",
    );
    expect(interpretarLinkTrailer("https://vimeo.com/76979871", { mudo: true })).toBe("https://player.vimeo.com/video/76979871?autoplay=1&muted=1&playsinline=1");
  });

  it("a posição só traz como revelados os lugares que vieram antes dela", () => {
    const entrada = entradaPadrao(dados);
    const roteiro = montarRoteiro(entrada, { modo: "REAL" });
    const i = roteiro.findIndex((c) => c.tipo === "POSICAO" && c.posicao === 2);
    const props = montarProps(entrada, roteiro, i, 0);
    if (props.tipo !== "POSICAO") throw new Error("esperava POSICAO");
    expect(props.vencedores.map((v) => v.candidatoId)).toEqual(["c02"]);
    expect(props.revelados).toEqual([{ posicao: 3, candidatoIds: ["c03"] }]);
    // Sem configuração gravada, só o 1º lugar mostra os votos.
    expect(props.vencedores[0].contagem).toBeNull();
  });

  it("o resultado traz o pódio, os votos onde a configuração deixa e os troféus da categoria", () => {
    const [r] = montarFinal(entradaPadrao(dados));
    expect(r.podio.map((p) => [p.posicao, p.itens.map((i) => i.candidatoId)])).toEqual([
      [1, ["c01"]],
      [2, ["c02"]],
      [3, ["c03"]],
    ]);
    const c01 = r.podio[0].itens[0].contagem!;
    expect([c01.votos, Math.round(c01.percentual * 10) / 10]).toEqual([40, 16.7]);
    expect(r.podio[1].itens[0].contagem).toBeNull();
    expect(r.premiados.map((p) => [p.titulo, p.candidatoIds])).toEqual([
      ["Queridinho do público", ["c03"]],
      ["Escolha dos jurados", ["c01"]],
      ["Preferido das crianças", ["c01"]],
    ]);
  });
});

describe("cerimônia: ordem da revelação (25/11/2026)", () => {
  const cats = [
    { id: "A", podioTamanho: 3 },
    { id: "B", podioTamanho: 3 },
    { id: "C", podioTamanho: 3 },
  ];
  const doEvento = Object.fromEntries((["POPULAR", "JURI", "INFANTIL"] as const).map((g) => [g, { ativo: true, escopo: "EVENTO", mostrarVotos: true }])) as Parameters<
    typeof ordenarCerimonia
  >[1];
  const todos = ["POPULAR", "JURI", "INFANTIL"] as const;
  const ids = (modelo: OrdemCerimonia["modelo"], extra: Partial<OrdemCerimonia> = {}, trofeus = doEvento, categorias = cats) =>
    ordenarCerimonia(categorias, trofeus, todos, { modelo, ultimoPrimeiro: false, itens: [], mostrarDesempate: true, ...extra }).map((x) => x.id);

  it("por categoria (1º exemplo)", () => {
    expect(ids("CATEGORIA")).toEqual(["T:POPULAR", "T:JURI", "T:INFANTIL", "P:A:1", "P:A:2", "P:A:3", "P:B:1", "P:B:2", "P:B:3", "P:C:1", "P:C:2", "P:C:3"]);
  });
  it("por posição (2º exemplo)", () => {
    expect(ids("POSICAO")).toEqual(["T:POPULAR", "T:JURI", "T:INFANTIL", "P:A:1", "P:B:1", "P:C:1", "P:A:2", "P:B:2", "P:C:2", "P:A:3", "P:B:3", "P:C:3"]);
  });
  it("troféus intercalados (3º exemplo)", () => {
    expect(ids("INTERCALADO")).toEqual(["T:POPULAR", "P:A:1", "P:B:1", "P:C:1", "T:JURI", "P:A:2", "P:B:2", "P:C:2", "T:INFANTIL", "P:A:3", "P:B:3", "P:C:3"]);
  });
  it("do último lugar para o 1º e pódios de tamanhos diferentes", () => {
    const desiguais = [{ id: "A", podioTamanho: 2 }, { id: "B", podioTamanho: 1 }];
    expect(ids("POSICAO", { ultimoPrimeiro: true }, doEvento, desiguais)).toEqual(["T:POPULAR", "T:JURI", "T:INFANTIL", "P:A:2", "P:A:1", "P:B:1"]);
  });
  it("troféu por categoria entra no bloco da categoria; desligado ou de votação desligada, sai", () => {
    const misto = { ...doEvento, JURI: { ativo: true, escopo: "CATEGORIA", mostrarVotos: true }, INFANTIL: { ativo: false, escopo: "EVENTO", mostrarVotos: true } } as typeof doEvento;
    expect(ids("CATEGORIA", {}, misto, cats.slice(0, 2))).toEqual(["T:POPULAR", "T:JURI:A", "P:A:1", "P:A:2", "P:A:3", "T:JURI:B", "P:B:1", "P:B:2", "P:B:3"]);
    expect(ordenarCerimonia(cats.slice(0, 1), doEvento, ["POPULAR"], { modelo: "CATEGORIA", ultimoPrimeiro: false, itens: [], mostrarDesempate: true }).map((x) => x.id)).toEqual([
      "T:POPULAR",
      "P:A:1",
      "P:A:2",
      "P:A:3",
    ]);
  });
  it("personalizada: a lista gravada e, no fim, o que faltar", () => {
    expect(ids("PERSONALIZADA", { itens: ["P:C:3", "T:JURI", "nao-existe", "P:C:3"] }, doEvento, cats.slice(2))).toEqual(["P:C:3", "T:JURI", "T:POPULAR", "T:INFANTIL", "P:C:1", "P:C:2"]);
  });

  it("com categorias: o resultado de cada uma logo depois do último item dela (nenhum na que revela só o vencedor)", () => {
    const lista = (ids: string[], votos: number[]) => ({ ids, votos });
    const grupos = [lista(["a1", "a2", "a3"], [30, 20, 10]), lista(["b1", "b2"], [5, 15])];
    const apurarLista = (l: { ids: string[]; votos: number[] }) =>
      apurar({
        candidatos: l.ids.map((id, i) => ({ id, ordem: i + 1, desqualificado: false })),
        votos: { POPULAR: Object.fromEntries(l.ids.map((id, i) => [id, l.votos[i]])), JURI: {}, INFANTIL: {} },
        pesos: { POPULAR: 100, JURI: 0, INFANTIL: 0 },
        gruposAtivos: ["POPULAR"],
        criterio: "PUBLICO",
      });
    const geral = apurarLista({ ids: [...grupos[0].ids, ...grupos[1].ids], votos: [...grupos[0].votos, ...grupos[1].votos] });
    geral.porCategoria = [
      { categoriaId: "A", nome: "Usina", premio: null, dados: apurarLista(grupos[0]) },
      { categoriaId: "B", nome: "Mostra", premio: null, dados: apurarLista(grupos[1]) },
    ];
    const categorias = [
      { id: "A", nome: "Usina", premio: null, canal: "ONLINE" as const, ordem: 1, podioTamanho: 3, podioVotos: [true, true, true] },
      { id: "B", nome: "Mostra", premio: null, canal: "TOTEM" as const, ordem: 2, podioTamanho: 1, podioVotos: [] },
    ];
    const base = entradaPadrao(geral);
    const entrada = { ...base, categorias, config: { ...base.config, trofeus: { ...base.config.trofeus, POPULAR: { ativo: true, escopo: "EVENTO" as const, mostrarVotos: false } } } };
    const porPosicao = { ...entrada, config: { ...entrada.config, ordemRevelacao: { modelo: "POSICAO" as const, ultimoPrimeiro: true, itens: [], mostrarDesempate: true } } };
    expect(texto(montarRoteiro(porPosicao, { modo: "REAL" }))).toBe("TRAILER, T:POPULAR, P:A:3, P:A:2, P:A:1, R:A, P:B:1, FINAL");
    expect(texto(montarRoteiro(entrada, { modo: "REAL" }))).toBe("TRAILER, T:POPULAR, P:A:3, P:A:2, P:A:1, R:A, P:B:1, FINAL");

    const roteiro = montarRoteiro(entrada, { modo: "REAL" });
    const trofeu = montarProps(entrada, roteiro, 1, 1);
    expect(trofeu.tipo === "TROFEU" && [trofeu.categoria, trofeu.vencedores]).toEqual([null, [{ candidatoId: "a1", contagem: null }]]);
    const segundo = montarProps(entrada, roteiro, 3, 1);
    expect(segundo.tipo === "POSICAO" && segundo.vencedores[0].contagem?.votos).toBe(20);
    const final = montarFinal(entrada);
    expect(final.map((r) => [r.nome, r.unico, r.podio.length])).toEqual([
      ["Usina", false, 3],
      ["Mostra", true, 1],
    ]);
    // O troféu do evento aparece no resultado da categoria do vencedor.
    expect(final.map((r) => r.premiados.map((p) => p.candidatoIds))).toEqual([[["a1"]], []]);
  });
});
