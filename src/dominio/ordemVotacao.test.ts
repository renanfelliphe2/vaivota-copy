import { describe, expect, it } from "vitest";
import { criarEstadoInicial } from "@/mocks/criarEstadoInicial";
import { localizarNaOrdem, ordenarParaVotacao } from "./ordemVotacao";
import { candidatoBloqueadoParaVoto } from "./votoProprio";

const FV = "evt-ver-e-fazer-filmes";
const { banco } = criarEstadoInicial();

const ids = (lista: { id: string }[]) => lista.map((c) => c.id);

describe("ordenarParaVotacao", () => {
  it("mesma semente dá a mesma ordem", () => {
    expect(ids(ordenarParaVotacao(banco.candidatos, "usr-ana", FV))).toEqual(ids(ordenarParaVotacao(banco.candidatos, "usr-ana", FV)));
  });

  it("usuários diferentes têm ordens diferentes", () => {
    const ana = ids(ordenarParaVotacao(banco.candidatos, "usr-ana", FV));
    const bruno = ids(ordenarParaVotacao(banco.candidatos, "usr-bruno", FV));
    const carla = ids(ordenarParaVotacao(banco.candidatos, "usr-carla", FV));
    // Se Ana e Bruno coincidirem por acaso, compara com Carla (Pronto do CP1).
    expect(ana.join() !== bruno.join() || ana.join() !== carla.join()).toBe(true);
    expect([...ana].sort()).toEqual([...bruno].sort());
  });

  it("só votáveis do evento pedido", () => {
    const fv = ids(ordenarParaVotacao(banco.candidatos, "usr-ana", FV));
    expect(fv).toHaveLength(6);
    for (const proibido of ["cand-fv-07", "cand-fv-08"]) expect(fv).not.toContain(proibido);
    expect(fv.every((id) => id.startsWith("cand-fv-"))).toBe(true);
    expect(ordenarParaVotacao(banco.candidatos, "usr-ana", "evt-outro")).toEqual([]);
  });

  it("não muta a lista recebida", () => {
    const entrada = [...banco.candidatos];
    const antes = ids(entrada);
    ordenarParaVotacao(entrada, "usr-ana", FV);
    expect(ids(entrada)).toEqual(antes);
  });
});

describe("localizarNaOrdem", () => {
  const ordem = ordenarParaVotacao(banco.candidatos, "usr-ana", FV);

  it("devolve vizinhos e total", () => {
    const meio = localizarNaOrdem(ordem, ordem[3].id)!;
    expect(meio).toMatchObject({ indice: 3, total: 6 });
    expect(meio.anterior?.id).toBe(ordem[2].id);
    expect(meio.seguinte?.id).toBe(ordem[4].id);
    expect(localizarNaOrdem(ordem, ordem[0].id)!.anterior).toBeNull();
    expect(localizarNaOrdem(ordem, ordem[5].id)!.seguinte).toBeNull();
  });

  it("null para id de outro evento, rascunho, desqualificado, inexistente ou nulo", () => {
    for (const id of ["cand-outro-evento", "cand-fv-07", "cand-fv-08", "nao-existe", null]) {
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
  const vinculado = { usuarioVinculadoId: "usr-vinculado" };

  it("bloqueia só o vinculado ao usuário, com a flag ligada", () => {
    expect(candidatoBloqueadoParaVoto(vinculado, "usr-vinculado", evento)).toBe(true);
    expect(candidatoBloqueadoParaVoto(vinculado, "usr-ana", evento)).toBe(false);
    expect(candidatoBloqueadoParaVoto(vinculado, null, evento)).toBe(false);
    expect(candidatoBloqueadoParaVoto({ usuarioVinculadoId: null }, "usr-vinculado", evento)).toBe(false);
    expect(candidatoBloqueadoParaVoto(vinculado, "usr-vinculado", { bloquearVotoProprio: false })).toBe(false);
  });
});
