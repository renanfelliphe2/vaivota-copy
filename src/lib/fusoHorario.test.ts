import { describe, expect, it } from "vitest";
import { descreverDeslocamento, ehFusoSuportado, FUSOS_SUPORTADOS, instanteParaLocal, localParaInstante } from "./fusoHorario";
import { paraMs } from "./tempo";

describe("fusoHorario", () => {
  it("lista fechada de ids IANA", () => {
    expect(FUSOS_SUPORTADOS.map((f) => f.id)).toEqual(["America/Sao_Paulo", "America/Manaus", "America/Rio_Branco", "America/Noronha"]);
    expect(ehFusoSuportado("America/Sao_Paulo")).toBe(true);
    expect(ehFusoSuportado("UTC")).toBe(false);
  });

  it("local ↔ instante no fuso", () => {
    expect(localParaInstante("2026-10-22T13:00", "America/Sao_Paulo")).toBe("2026-10-22T13:00:00-03:00");
    expect(localParaInstante("2026-10-22T13:00", "America/Manaus")).toBe("2026-10-22T13:00:00-04:00");
    expect(localParaInstante("2026-10-22T13:00", "America/Rio_Branco")).toBe("2026-10-22T13:00:00-05:00");
    expect(localParaInstante("2026-10-22T13:00", "America/Noronha")).toBe("2026-10-22T13:00:00-02:00");
    expect(localParaInstante("22/10/2026", "America/Sao_Paulo")).toBeNull();
    expect(instanteParaLocal("2026-10-22T13:00:00-03:00", "America/Sao_Paulo")).toBe("2026-10-22T13:00");
    expect(instanteParaLocal("2026-10-22T13:00:00-03:00", "America/Manaus")).toBe("2026-10-22T12:00");
  });

  it("trocar o fuso muda só o relógio exibido, não o instante", () => {
    const ms = paraMs("2026-10-22T13:00:00-03:00");
    expect(paraMs(localParaInstante(instanteParaLocal(ms, "America/Manaus"), "America/Manaus")!)).toBe(ms);
    expect(descreverDeslocamento(ms, "America/Manaus")).toBe("GMT-04:00");
  });
});
