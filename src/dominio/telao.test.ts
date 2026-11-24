import { describe, expect, it } from "vitest";
import { categoriaDoTelao, linkPorExtenso, TELAO_PADRAO, validarConfigTelao } from "./telao";

const cats = [{ id: "a" }, { id: "b" }, { id: "c" }];
const todas = new Set(["a", "b", "c"]);

describe("categoria do telão (B2)", () => {
  it("troca a cada intervalo, em loop, pelo relógio", () => {
    const em = (s: number) => categoriaDoTelao(cats, todas, s * 1000, 15)?.categoria.id;
    expect([em(0), em(14), em(15), em(30), em(44), em(45)]).toEqual(["a", "a", "b", "c", "c", "a"]);
  });

  it("pula as categorias sem item e diz a posição no ciclo", () => {
    const r = categoriaDoTelao(cats, new Set(["a", "c"]), 15_000, 15);
    expect(r).toEqual({ categoria: { id: "c" }, indice: 1, total: 2 });
  });

  it("sem categoria com item: nada", () => {
    expect(categoriaDoTelao(cats, new Set(), 0, 15)).toBeNull();
    expect(categoriaDoTelao([], todas, 0, 15)).toBeNull();
  });

  it("uma categoria só: fica nela", () => {
    expect(categoriaDoTelao([{ id: "a" }], todas, 999_999, 5)?.categoria.id).toBe("a");
  });
});

describe("configuração do telão", () => {
  it("o padrão é válido", () => {
    expect(validarConfigTelao(TELAO_PADRAO)).toEqual({});
  });

  it("intervalo de 5 a 300 s, inteiro", () => {
    for (const s of [4, 301, 7.5, Number.NaN]) expect(validarConfigTelao({ ...TELAO_PADRAO, intervaloSegundos: s }).intervalo).toBeTruthy();
    for (const s of [5, 300]) expect(validarConfigTelao({ ...TELAO_PADRAO, intervaloSegundos: s })).toEqual({});
  });

  it("ao menos uma opção marcada", () => {
    const nada = { candidatos: false, tempo: false, qr: false, link: false };
    expect(validarConfigTelao({ intervaloSegundos: 15, mostrar: nada }).mostrar).toBeTruthy();
    expect(validarConfigTelao({ intervaloSegundos: 15, mostrar: { ...nada, link: true } })).toEqual({});
  });
});

it("link por extenso, sem protocolo nem barra final", () => {
  expect(linkPorExtenso("https://vaivota.space/e/festival/mostra-infantil/")).toBe("vaivota.space/e/festival/mostra-infantil");
  expect(linkPorExtenso("http://localhost:3000/e/x")).toBe("localhost:3000/e/x");
});
