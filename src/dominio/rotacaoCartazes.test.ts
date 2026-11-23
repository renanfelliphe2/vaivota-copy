import { describe, expect, it } from "vitest";
import { aplicarTroca, cartazesIniciais, proximaTroca, type Troca } from "./rotacaoCartazes";

/** Sorteio repetível (mulberry32), para o teste não depender do acaso. */
function semente(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const filmes = (n: number) => Array.from({ length: n }, (_, i) => `f${i + 1}`);

/** Roda `vezes` trocas. `ultima` é a casa trocada e o filme que SAIU dela. */
function girar(todos: string[], vezes: number, sorteio: () => number, aoTrocar: (troca: Troca, saiu: string, atuais: string[]) => void) {
  let atuais = cartazesIniciais(todos);
  let ultima: Troca | null = null;
  for (let i = 0; i < vezes; i++) {
    const troca = proximaTroca(atuais, todos, sorteio, ultima);
    expect(troca).not.toBeNull();
    const saiu = atuais[troca!.casa];
    atuais = aplicarTroca(atuais, troca!);
    ultima = { casa: troca!.casa, id: saiu };
    aoTrocar(troca!, saiu, atuais);
  }
}

describe("cartazesIniciais", () => {
  it("leva os seis primeiros, na ordem, sem repetir", () => {
    expect(cartazesIniciais(filmes(14))).toEqual(["f1", "f2", "f3", "f4", "f5", "f6"]);
    expect(cartazesIniciais(["a", "b", "a", "c"])).toEqual(["a", "b", "c"]);
  });

  it("com menos filmes que casas, leva só os que há", () => {
    expect(cartazesIniciais(filmes(3))).toEqual(["f1", "f2", "f3"]);
  });
});

describe("proximaTroca", () => {
  it("nunca deixa o mesmo filme em duas casas, em nenhuma sequência de trocas", () => {
    for (const total of [7, 8, 14, 40]) {
      const todos = filmes(total);
      girar(todos, 2000, semente(total), (_, __, atuais) => {
        expect(atuais).toHaveLength(6);
        expect(new Set(atuais).size).toBe(6);
        expect(atuais.every((id) => todos.includes(id))).toBe(true);
      });
    }
  });

  it("não troca a mesma casa duas vezes seguidas nem devolve o filme que acabou de sair (havendo outro livre)", () => {
    const todos = filmes(14);
    let anterior: { casa: number; saiu: string } | null = null;
    girar(todos, 1000, semente(7), (troca, saiu) => {
      if (anterior) {
        expect(troca.casa).not.toBe(anterior.casa);
        expect(troca.id).not.toBe(anterior.saiu);
      }
      anterior = { casa: troca.casa, saiu };
    });
  });

  it("com todos os filmes já nas casas, não há troca", () => {
    expect(proximaTroca(filmes(6), filmes(6), semente(1), null)).toBeNull();
    expect(proximaTroca(filmes(3), filmes(3), semente(1), null)).toBeNull();
  });

  it("com um filme livre só, ele volta mesmo tendo acabado de sair (a rotação não trava)", () => {
    const troca = proximaTroca(["f1", "f2", "f3", "f4", "f5", "f7"], filmes(7), semente(3), { casa: 5, id: "f6" });
    expect(troca?.id).toBe("f6");
    expect(troca?.casa).not.toBe(5);
  });

  it("todas as casas e todos os filmes aparecem com o tempo", () => {
    const casas = new Set<number>();
    const vistos = new Set(cartazesIniciais(filmes(14)));
    girar(filmes(14), 400, semente(11), (troca) => {
      casas.add(troca.casa);
      vistos.add(troca.id);
    });
    expect(casas.size).toBe(6);
    expect(vistos.size).toBe(14);
  });
});
