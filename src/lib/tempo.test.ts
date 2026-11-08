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
  descreverPeriodo,
} from "./tempo";

describe("descreverPeriodo (página do evento)", () => {
  const SP = "America/Sao_Paulo";
  const ms = (iso: string) => Date.parse(iso);

  it("dias seguidos no mesmo mês: só o mês no fim", () => {
    expect(descreverPeriodo(ms("2026-11-25T10:00:00-03:00"), ms("2026-11-28T20:00:00-03:00"), SP)).toBe("25 a 28 de novembro");
  });

  it("um dia só: o dia e o horário, com os minutos quando não fecham a hora", () => {
    expect(descreverPeriodo(ms("2026-11-28T19:00:00-03:00"), ms("2026-11-28T21:00:00-03:00"), SP)).toBe("28 de novembro, das 19h às 21h");
    expect(descreverPeriodo(ms("2026-11-28T09:30:00-03:00"), ms("2026-11-28T21:05:00-03:00"), SP)).toBe("28 de novembro, das 9h30 às 21h05");
  });

  it("meses diferentes e o primeiro dia do mês com ordinal", () => {
    expect(descreverPeriodo(ms("2026-11-30T10:00:00-03:00"), ms("2026-12-02T20:00:00-03:00"), SP)).toBe("30 de novembro a 2 de dezembro");
    expect(descreverPeriodo(ms("2026-12-01T10:00:00-03:00"), ms("2026-12-03T20:00:00-03:00"), SP)).toBe("1º a 3 de dezembro");
  });

  it("anos diferentes: o ano aparece nas duas pontas", () => {
    expect(descreverPeriodo(ms("2026-12-30T10:00:00-03:00"), ms("2027-01-02T20:00:00-03:00"), SP)).toBe(
      "30 de dezembro de 2026 a 2 de janeiro de 2027",
    );
  });

  it("vale a data no fuso do evento, não em UTC", () => {
    // 28/11 23h em São Paulo já é 29/11 em UTC.
    expect(descreverPeriodo(ms("2026-11-28T19:00:00-03:00"), ms("2026-11-29T02:00:00Z"), SP)).toBe("28 de novembro, das 19h às 23h");
  });
});

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
