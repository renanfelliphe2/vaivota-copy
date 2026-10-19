import { describe, expect, it } from "vitest";
import { criarEstadoInicial } from "@/mocks/criarEstadoInicial";
import { candidato } from "@/store/estadoPublicoDeTeste";
import { localizarNaOrdem, ordenarParaVotacao } from "./ordemVotacao";
import { candidatoBloqueadoParaVoto } from "./votoProprio";

const FV = "evt-ver-e-fazer-filmes";
const { banco } = criarEstadoInicial();
const ALEATORIA = { id: FV, ordemCandidatos: "ALEATORIA" } as const;

const ids = (lista: { id: string }[]) => lista.map((c) => c.id);

describe("ordenarParaVotacao", () => {
  it("aleatória: a mesma semente (a mesma carga da página) dá a mesma ordem", () => {
    expect(ids(ordenarParaVotacao(banco.candidatos, ALEATORIA, 7))).toEqual(ids(ordenarParaVotacao(banco.candidatos, ALEATORIA, 7)));
  });

  it("aleatória: outra carga embaralha de novo, sempre com os mesmos itens", () => {
    const ordens = [1, 2, 3].map((semente) => ids(ordenarParaVotacao(banco.candidatos, ALEATORIA, semente)));
    // Se duas coincidirem por acaso, a terceira desempata.
    expect(new Set(ordens.map((o) => o.join())).size).toBeGreaterThan(1);
    for (const ordem of ordens) expect([...ordem].sort()).toEqual([...ordens[0]].sort());
  });

  it("alfabética: A–Z pelo título, sem diferenciar maiúsculas e acentos, e não depende da semente", () => {
    const titulos = ["beta", "Zeta", "Projeto 10", "Álvaro", "Projeto 2", "alfa"];
    const lista = titulos.map((titulo, i) => ({ ...candidato(`k${i}`, i + 1), titulo }));
    const evento = { id: "evt-1", ordemCandidatos: "ALFABETICA" } as const;
    expect(ordenarParaVotacao(lista, evento, 1).map((c) => c.titulo)).toEqual(["alfa", "Álvaro", "beta", "Projeto 2", "Projeto 10", "Zeta"]);
    expect(ids(ordenarParaVotacao(lista, evento, 1))).toEqual(ids(ordenarParaVotacao(lista, evento, 99)));
  });

  it("só votáveis do evento pedido", () => {
    const fv = ids(ordenarParaVotacao(banco.candidatos, ALEATORIA, 1));
    expect(fv).toHaveLength(6);
    for (const proibido of ["cand-fv-07", "cand-fv-08"]) expect(fv).not.toContain(proibido);
    expect(fv.every((id) => id.startsWith("cand-fv-"))).toBe(true);
    expect(ordenarParaVotacao(banco.candidatos, { ...ALEATORIA, id: "evt-outro" }, 1)).toEqual([]);
  });

  it("não muta a lista recebida", () => {
    const entrada = [...banco.candidatos];
    const antes = ids(entrada);
    ordenarParaVotacao(entrada, ALEATORIA, 1);
    ordenarParaVotacao(entrada, { ...ALEATORIA, ordemCandidatos: "ALFABETICA" }, 1);
    expect(ids(entrada)).toEqual(antes);
  });
});

describe("localizarNaOrdem", () => {
  const ordem = ordenarParaVotacao(banco.candidatos, ALEATORIA, 1);

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
