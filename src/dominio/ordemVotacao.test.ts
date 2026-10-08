import { describe, expect, it } from "vitest";
import { criarEstadoInicial } from "@/mocks/criarEstadoInicial";
import { localizarNaOrdem, ordenarParaVotacao } from "./ordemVotacao";
import { candidatoBloqueadoParaVoto } from "./votoProprio";

const ST = "evt-semana-tech";
const FV = "evt-ver-e-fazer-filmes";
const { banco } = criarEstadoInicial();

const ids = (lista: { id: string }[]) => lista.map((c) => c.id);

describe("ordenarParaVotacao", () => {
  it("mesma semente dá a mesma ordem", () => {
    expect(ids(ordenarParaVotacao(banco.candidatos, "usr-ana", ST))).toEqual(ids(ordenarParaVotacao(banco.candidatos, "usr-ana", ST)));
  });

  it("usuários diferentes têm ordens diferentes", () => {
    const ana = ids(ordenarParaVotacao(banco.candidatos, "usr-ana", ST));
    const bruno = ids(ordenarParaVotacao(banco.candidatos, "usr-bruno", ST));
    const eva = ids(ordenarParaVotacao(banco.candidatos, "usr-eva", ST));
    // Se Ana e Bruno coincidirem por acaso, compara com Eva (Pronto do CP1).
    expect(ana.join() !== bruno.join() || ana.join() !== eva.join()).toBe(true);
    expect([...ana].sort()).toEqual([...bruno].sort());
  });

  it("só votáveis do evento pedido", () => {
    const st = ids(ordenarParaVotacao(banco.candidatos, "usr-ana", ST));
    const fv = ids(ordenarParaVotacao(banco.candidatos, "usr-ana", FV));
    expect(st).toHaveLength(8);
    expect(fv).toHaveLength(6);
    for (const proibido of ["cand-st-09", "cand-st-10", "cand-fv-07", "cand-fv-08"]) {
      expect(st).not.toContain(proibido);
      expect(fv).not.toContain(proibido);
    }
    expect(st.every((id) => id.startsWith("cand-st-"))).toBe(true);
  });

  it("não muta a lista recebida", () => {
    const entrada = [...banco.candidatos];
    const antes = ids(entrada);
    ordenarParaVotacao(entrada, "usr-ana", ST);
    expect(ids(entrada)).toEqual(antes);
  });
});

describe("localizarNaOrdem", () => {
  const ordem = ordenarParaVotacao(banco.candidatos, "usr-ana", ST);

  it("devolve vizinhos e total", () => {
    const meio = localizarNaOrdem(ordem, ordem[3].id)!;
    expect(meio).toMatchObject({ indice: 3, total: 8 });
    expect(meio.anterior?.id).toBe(ordem[2].id);
    expect(meio.seguinte?.id).toBe(ordem[4].id);
    expect(localizarNaOrdem(ordem, ordem[0].id)!.anterior).toBeNull();
    expect(localizarNaOrdem(ordem, ordem[7].id)!.seguinte).toBeNull();
  });

  it("null para id de outro evento, rascunho, desqualificado, inexistente ou nulo", () => {
    for (const id of ["cand-fv-01", "cand-st-09", "cand-st-10", "nao-existe", null]) {
      expect(localizarNaOrdem(ordem, id)).toBeNull();
    }
  });

  it("funciona com um só item e com itens que embrulham o candidato", () => {
    const um = localizarNaOrdem([ordem[0]], ordem[0].id)!;
    expect([um.anterior, um.seguinte, um.total]).toEqual([null, null, 1]);
    const itens = ordem.map((candidato) => ({ candidato, bloqueadoVotoProprio: false }));
    expect(localizarNaOrdem(itens, ordem[1].id)?.item.candidato.id).toBe(ordem[1].id);
  });
});

describe("candidatoBloqueadoParaVoto", () => {
  const evento = { bloquearVotoProprio: true };
  const vinculado = { usuarioVinculadoId: "usr-gabi" };

  it("bloqueia só o vinculado ao usuário, com a flag ligada", () => {
    expect(candidatoBloqueadoParaVoto(vinculado, "usr-gabi", evento)).toBe(true);
    expect(candidatoBloqueadoParaVoto(vinculado, "usr-ana", evento)).toBe(false);
    expect(candidatoBloqueadoParaVoto(vinculado, null, evento)).toBe(false);
    expect(candidatoBloqueadoParaVoto({ usuarioVinculadoId: null }, "usr-gabi", evento)).toBe(false);
    expect(candidatoBloqueadoParaVoto(vinculado, "usr-gabi", { bloquearVotoProprio: false })).toBe(false);
  });
});
