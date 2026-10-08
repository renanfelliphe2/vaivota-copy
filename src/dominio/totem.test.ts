import { describe, expect, it } from "vitest";
import { criarEstadoNucleo } from "@/mocks/criarEstadoNucleo";
import { PIN_TOTEM_SEED } from "@/mocks/seed/dispositivos";
import { aplicarVotoInfantil } from "./aplicarVoto";
import { contarVotos } from "./contagens";
import { verificarInvariantes } from "./invariantes";
import { hashPinTotem, pinConfere, situacaoTotem, type SituacaoTotem } from "./totem";
import type { Dispositivo, Evento } from "./tipos";

// Totem (rev. 4, A7; Base/VotoInfantil.md §6 e §9).

const ID = "evt-ver-e-fazer-filmes";
const ABERTO: Pick<Evento, "id" | "estado" | "estadoUrna" | "moduloInfantil"> = {
  id: ID,
  estado: "ATIVO",
  estadoUrna: "ABERTA",
  moduloInfantil: true,
};
const TOTEM: Pick<Dispositivo, "eventoId" | "estado"> = { eventoId: ID, estado: "ATIVO" };

describe("situacaoTotem", () => {
  const casos: [string, Parameters<typeof situacaoTotem>, SituacaoTotem][] = [
    ["aberto e ativo", [ABERTO, TOTEM, 4], "VOTANDO"],
    ["sem aparelho", [ABERTO, null, 4], "NAO_PAREADO"],
    ["aparelho de outro evento", [ABERTO, { ...TOTEM, eventoId: "evt-semana-tech" }, 4], "NAO_PAREADO"],
    ["revogado vence o módulo desligado", [{ ...ABERTO, moduloInfantil: false }, { ...TOTEM, estado: "REVOGADO" }, 4], "DISPOSITIVO_REVOGADO"],
    ["módulo desligado", [{ ...ABERTO, moduloInfantil: false }, TOTEM, 4], "MODULO_DESLIGADO"],
    ["evento em rascunho", [{ ...ABERTO, estado: "RASCUNHO" }, TOTEM, 4], "EVENTO_INDISPONIVEL"],
    ["concluído bloqueia até totem pausado", [{ ...ABERTO, estado: "CONCLUIDO" }, { ...TOTEM, estado: "PAUSADO" }, 4], "EVENTO_CONCLUIDO"],
    ["pausado com a urna aberta", [ABERTO, { ...TOTEM, estado: "PAUSADO" }, 4], "DISPOSITIVO_PAUSADO"],
    ["urna não iniciada", [{ ...ABERTO, estadoUrna: "NAO_INICIADA" }, TOTEM, 4], "URNA_NAO_INICIADA"],
    ["urna encerrada", [{ ...ABERTO, estadoUrna: "ENCERRADA" }, TOTEM, 4], "URNA_ENCERRADA"],
    ["sem candidatos votáveis", [ABERTO, TOTEM, 0], "SEM_CANDIDATOS"],
  ];
  it.each(casos)("%s", (_, args, esperado) => {
    expect(situacaoTotem(...args)).toBe(esperado);
  });
});

describe("PIN do quiosque", () => {
  it("confere só o PIN certo do próprio totem", () => {
    const totem = { id: "disp-fv-hall", hashPin: hashPinTotem("disp-fv-hall", "1234") };
    expect(pinConfere(totem, "1234")).toBe(true);
    expect(pinConfere(totem, "4321")).toBe(false);
    expect(pinConfere({ ...totem, id: "disp-fv-patio" }, "1234")).toBe(false);
  });

  it("sem PIN definido sai direto", () => {
    expect(pinConfere({ id: "x", hashPin: null }, "")).toBe(true);
  });

  it("o seed usa o PIN documentado na toolbar", () => {
    const hall = criarEstadoNucleo().banco.dispositivos.find((d) => d.id === "disp-fv-hall")!;
    expect(pinConfere(hall, PIN_TOTEM_SEED)).toBe(true);
  });
});

describe("aplicarVotoInfantil", () => {
  const AGORA = Date.parse("2026-11-25T15:30:00-03:00");

  it("grava candidato, horário e dispositivo, conta no grupo INFANTIL e mantém as invariantes", () => {
    const antes = criarEstadoNucleo();
    const depois = aplicarVotoInfantil(antes, { eventoId: ID, dispositivoId: "disp-fv-hall", candidatoId: "cand-fv-01", agoraMs: AGORA });

    expect(depois.banco.votosInfantis).toHaveLength(antes.banco.votosInfantis.length + 1);
    const voto = depois.banco.votosInfantis.at(-1)!;
    expect(voto).toEqual({
      id: antes.banco.sequencias.votoInfantil + 1,
      eventoId: ID,
      candidatoId: "cand-fv-01",
      dispositivoId: "disp-fv-hall",
      criadoEm: "2026-11-25T15:30:00-03:00",
    });
    expect(depois.banco.sequencias.votoInfantil).toBe(voto.id);
    expect(depois.banco.dispositivos.find((d) => d.id === "disp-fv-hall")?.ultimoUsoEm).toBe(voto.criadoEm);
    expect(contarVotos(depois.banco, ID).INFANTIL["cand-fv-01"]).toBe(1);
    expect(verificarInvariantes(depois)).toEqual([]);
  });

  it("não guarda nada da criança nem audita a escolha", () => {
    const antes = criarEstadoNucleo();
    const depois = aplicarVotoInfantil(antes, { eventoId: ID, dispositivoId: "disp-fv-hall", candidatoId: "cand-fv-02", agoraMs: AGORA });
    expect(Object.keys(depois.banco.votosInfantis.at(-1)!).sort()).toEqual(["candidatoId", "criadoEm", "dispositivoId", "eventoId", "id"]);
    expect(depois.banco.auditoria).toBe(antes.banco.auditoria);
    expect(depois.banco.participacoes).toBe(antes.banco.participacoes);
  });
});
