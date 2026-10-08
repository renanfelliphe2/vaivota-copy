import { describe, expect, it } from "vitest";
import {
  anoNoFuso,
  descreverContagem,
  formatarContagem,
  formatarDataHora,
  HORA,
  MINUTO,
  paraInstante,
  paraMs,
  restanteAte,
  T0,
  T0_MS,
} from "./tempo";

describe("tempo", () => {
  it("T0 é 25/11/2026 09:30 em São Paulo (30 min antes da janela do Festival)", () => {
    expect(T0_MS).toBe(paraMs("2026-11-25T12:30:00Z"));
    expect(formatarDataHora(T0_MS, "America/Sao_Paulo")).toBe("25/11/2026, 09:30");
  });

  it("paraInstante devolve ISO com o offset do fuso", () => {
    expect(paraInstante(T0_MS, "America/Sao_Paulo")).toBe(T0);
    expect(paraInstante(T0_MS, "UTC")).toBe("2026-11-25T12:30:00+00:00");
    expect(paraMs(paraInstante(T0_MS + 1234 * MINUTO))).toBe(T0_MS + 1234 * MINUTO);
  });

  it("restanteAte nunca é negativo", () => {
    expect(restanteAte(T0_MS + HORA, T0_MS)).toBe(HORA);
    expect(restanteAte(T0_MS - HORA, T0_MS)).toBe(0);
  });

  it("formatarContagem", () => {
    expect(formatarContagem(3 * HORA + 15 * MINUTO + 20_000)).toBe("03:15:20");
    expect(formatarContagem(2 * 24 * HORA + 3 * HORA + 15 * MINUTO)).toBe("2d 03h 15min");
    expect(formatarContagem(-5)).toBe("00:00:00");
  });

  it("descreverContagem por extenso", () => {
    expect(descreverContagem(3 * HORA + 15 * MINUTO)).toBe("3 horas e 15 minutos");
    expect(descreverContagem(24 * HORA + HORA + MINUTO)).toBe("1 dia, 1 hora e 1 minuto");
    expect(descreverContagem(30_000)).toBe("0 minutos");
  });

  it("anoNoFuso", () => {
    expect(anoNoFuso(paraMs("2027-01-01T01:00:00Z"), "America/Sao_Paulo")).toBe(2026);
  });

  it("paraMs rejeita texto inválido", () => {
    expect(() => paraMs("ontem")).toThrow();
  });
});
