import { describe, expect, it } from "vitest";
import type { EstadoPublico } from "@/dominio/estadoPublico";
import { criarEstadoDoServidor } from "./estadoReal";
import { evento, publico } from "./estadoPublicoDeTeste";
import { intervaloDePollingMs } from "./servidor";

// O polling do estado público custa uma função serverless por consulta: o intervalo acompanha o que cada pessoa precisa ver.

function estado(opcoes: { urna?: "NAO_INICIADA" | "ABERTA" | "ENCERRADA"; concluido?: boolean; votou?: boolean; papel?: "PUBLICO" | "ADMIN"; visitante?: boolean }) {
  const base: EstadoPublico = publico();
  const e = evento({
    estadoUrna: opcoes.urna ?? "ABERTA",
    ...(opcoes.concluido ? { estado: "CONCLUIDO", estadoUrna: "ENCERRADA" } : {}),
  });
  base.eventos[0] = {
    ...base.eventos[0],
    evento: e,
    participacao: opcoes.visitante ? null : { id: "p1", usuarioId: "u1", eventoId: "evt-1", papel: opcoes.papel ?? "PUBLICO", votou: opcoes.votou ?? false },
  };
  return criarEstadoDoServidor(opcoes.visitante ? { ...base, usuario: null } : base);
}

// sorteio 0.5 = o centro da faixa (sem variação)
const centro = 0.5;

describe("intervaloDePollingMs", () => {
  it("quem espera a urna abrir ou ainda vai votar consulta a cada 10 s", () => {
    expect(intervaloDePollingMs(estado({ urna: "NAO_INICIADA" }), centro)).toBe(10_000);
    expect(intervaloDePollingMs(estado({ urna: "ABERTA", votou: false }), centro)).toBe(10_000);
    expect(intervaloDePollingMs(estado({ urna: "ABERTA", visitante: true }), centro)).toBe(10_000);
  });

  it("quem já votou ou administra consulta a cada 30 s com a urna aberta", () => {
    expect(intervaloDePollingMs(estado({ urna: "ABERTA", votou: true }), centro)).toBe(30_000);
    expect(intervaloDePollingMs(estado({ urna: "ABERTA", papel: "ADMIN" }), centro)).toBe(30_000);
  });

  it("com a urna encerrada ou o evento concluído, a cada 60 s", () => {
    expect(intervaloDePollingMs(estado({ urna: "ENCERRADA" }), centro)).toBe(60_000);
    expect(intervaloDePollingMs(estado({ concluido: true }), centro)).toBe(60_000);
  });

  it("varia ±20% para ninguém sincronizar", () => {
    const e = estado({ urna: "ABERTA" });
    expect(intervaloDePollingMs(e, 0)).toBe(8_000);
    expect(intervaloDePollingMs(e, 1)).toBe(12_000);
  });

  it("sem evento no estado, a cada 30 s", () => {
    expect(intervaloDePollingMs(criarEstadoDoServidor({ ...publico(), eventos: [] }), centro)).toBe(30_000);
  });
});
