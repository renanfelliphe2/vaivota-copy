import { describe, expect, it } from "vitest";
import { aplicarTroca, cartazesIniciais, filmesDaFita, proximaTroca, type Troca, type UltimaTroca } from "./rotacaoCartazes";

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

/** Roda `vezes` trocas, guardando em `ultima` a fita que correu e os filmes que saíram dela. */
function girar(
  todos: string[],
  vezes: number,
  sorteio: () => number,
  aoTrocar: (troca: Troca, antes: string[], atuais: string[], ultima: UltimaTroca | null) => void,
) {
  let atuais = cartazesIniciais(todos);
  let ultima: UltimaTroca | null = null;
  for (let i = 0; i < vezes; i++) {
    const troca = proximaTroca(atuais, todos, sorteio, ultima);
    expect(troca).not.toBeNull();
    const antes = filmesDaFita(atuais, troca!.fita);
    const anterior = ultima;
    atuais = aplicarTroca(atuais, troca!);
    ultima = { fita: troca!.fita, saiu: antes.filter((id) => !troca!.ids.includes(id)) };
    aoTrocar(troca!, antes, atuais, anterior);
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

  it("com dois filmes livres ou mais, os dois quadros da fita mudam e só ela muda", () => {
    for (const total of [8, 14, 40]) {
      girar(filmes(total), 500, semente(total + 1), (troca, antes) => {
        expect(troca.ids).toHaveLength(2);
        expect(troca.ids.some((id) => antes.includes(id))).toBe(false);
      });
    }
    const atuais = filmes(6);
    const troca = proximaTroca(atuais, filmes(14), semente(2), null)!;
    const depois = aplicarTroca(atuais, troca);
    depois.forEach((id, i) => {
      if (Math.floor(i / 2) !== troca.fita) expect(id).toBe(atuais[i]);
    });
  });

  it("com um filme livre só, a fita anda um quadro: o de baixo sobe e o novo entra por baixo", () => {
    const troca = proximaTroca(filmes(6), filmes(7), semente(3), null)!;
    const [cima, baixo] = filmesDaFita(filmes(6), troca.fita);
    expect(cima).toBeDefined();
    expect(troca.ids).toEqual([baixo, "f7"]);
  });

  it("não corre a mesma fita duas vezes seguidas nem devolve filmes que acabaram de sair (havendo outros livres)", () => {
    girar(filmes(14), 1000, semente(7), (troca, _, __, anterior) => {
      if (!anterior) return;
      expect(troca.fita).not.toBe(anterior.fita);
      expect(troca.ids.some((id) => anterior.saiu.includes(id))).toBe(false);
    });
  });

  it("com todos os filmes já nas casas, não há troca", () => {
    expect(proximaTroca(filmes(6), filmes(6), semente(1), null)).toBeNull();
    expect(proximaTroca(filmes(3), filmes(3), semente(1), null)).toBeNull();
  });

  it("com poucos filmes livres, os que acabaram de sair voltam (a rotação não trava)", () => {
    const troca = proximaTroca(["f1", "f2", "f3", "f4", "f7", "f8"], filmes(8), semente(3), { fita: 2, saiu: ["f5", "f6"] });
    expect(troca?.fita).not.toBe(2);
    expect([...(troca?.ids ?? [])].sort()).toEqual(["f5", "f6"]);
  });

  it("todas as fitas e todos os filmes aparecem com o tempo", () => {
    const fitas = new Set<number>();
    const vistos = new Set(cartazesIniciais(filmes(14)));
    girar(filmes(14), 400, semente(11), (troca) => {
      fitas.add(troca.fita);
      troca.ids.forEach((id) => vistos.add(id));
    });
    expect(fitas.size).toBe(3);
    expect(vistos.size).toBe(14);
  });
});
