import { describe, expect, it } from "vitest";
import { aplicarAvaliacaoJuri, contarJuri } from "@/dominio/avaliacaoJuri";
import { verificarInvariantes } from "@/dominio/invariantes";
import type { EstadoApp, ModoVotoJuri } from "@/dominio/tipos";
import { paraInstante, T0_MS } from "@/lib/tempo";
import { criarEstadoInicial } from "@/mocks/criarEstadoInicial";
import { ID_FESTIVAL } from "@/mocks/seed/eventos";
import { forcarEstadoUrna } from "@/store/transicoes";
import { criarVotosInfantisSimulados, criarVotosJuriSimulados, criarVotosSimulados } from "@/store/simularVotos";

// 08/10/2026: "Simular votos entrando" por tipo de voto. Sempre com as invariantes de pé.

function urnaAberta(modo: ModoVotoJuri = "VOTO_UNICO"): EstadoApp {
  let e = forcarEstadoUrna(criarEstadoInicial(), ID_FESTIVAL, "ABERTA", { agoraMs: T0_MS });
  const criterios = modo === "VOTO_UNICO" ? [] : [{ id: null, nome: "Direção" }, { id: null, nome: "Roteiro" }];
  e = aplicarAvaliacaoJuri(e, ID_FESTIVAL, { modoVotoJuri: modo, criterios }, paraInstante(T0_MS));
  return e;
}

describe("simulador de votos", () => {
  it("público: cria os votos pedidos", () => {
    const antes = urnaAberta();
    const depois = criarVotosSimulados(antes, ID_FESTIVAL, 3, T0_MS);
    expect(depois.banco.votos.length - antes.banco.votos.length).toBe(3);
    expect(verificarInvariantes(depois)).toEqual([]);
  });

  for (const modo of ["VOTO_UNICO", "NOTAS_POR_CRITERIO", "MELHOR_POR_CRITERIO"] as const) {
    it(`júri (${modo}): um jurado novo por voto, que entra no placar`, () => {
      const antes = urnaAberta(modo);
      const depois = criarVotosJuriSimulados(antes, ID_FESTIVAL, 2, T0_MS);
      const jurados = (e: EstadoApp) => e.banco.participacoes.filter((p) => p.eventoId === ID_FESTIVAL && p.papel === "JURADO" && p.votou).length;
      expect(jurados(depois) - jurados(antes)).toBe(2);
      const total = (e: EstadoApp) => Object.values(contarJuri(e.banco, ID_FESTIVAL)).reduce((s, n) => s + n, 0);
      expect(total(depois)).toBeGreaterThan(total(antes));
      expect(verificarInvariantes(depois)).toEqual([]);
    });
  }

  it("infantil: votos no totem ativo", () => {
    const antes = urnaAberta();
    const depois = criarVotosInfantisSimulados(antes, ID_FESTIVAL, 4, T0_MS);
    expect(depois.banco.votosInfantis.length - antes.banco.votosInfantis.length).toBe(4);
    expect(verificarInvariantes(depois)).toEqual([]);
  });

  it("urna fechada: nada muda", () => {
    const e = criarEstadoInicial();
    expect(criarVotosSimulados(e, ID_FESTIVAL, 3, T0_MS)).toBe(e);
    expect(criarVotosJuriSimulados(e, ID_FESTIVAL, 3, T0_MS)).toBe(e);
    expect(criarVotosInfantisSimulados(e, ID_FESTIVAL, 3, T0_MS)).toBe(e);
  });
});
