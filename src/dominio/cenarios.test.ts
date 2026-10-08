import { describe, expect, it } from "vitest";
import { CENARIOS } from "@/mocks/cenarios";
import { criarEstadoInicial } from "@/mocks/criarEstadoInicial";
import { T0_MS } from "@/lib/tempo";
import { votaveis } from "./candidatos";
import { avaliarChecklist } from "./checklistAtivacao";
import { verificarInvariantes } from "./invariantes";
import type { EstadoApp } from "./tipos";
import { montarEntradaChecklist } from "./checklistAtivacao";

// Todo cenário registrado deixa verificarInvariantes vazia (Etapas 4 e 6).

const EVENTOS = ["evt-ver-e-fazer-filmes"];

function aplicar(id: string, eventoId: string, base: EstadoApp = criarEstadoInicial()): EstadoApp {
  const cenario = CENARIOS.find((c) => c.id === id)!;
  return cenario.aplicar(base, { eventoId, agoraMs: T0_MS });
}

function doEvento(estado: EstadoApp, eventoId: string) {
  return estado.banco.eventos.find((e) => e.id === eventoId)!;
}

describe("cenários registrados", () => {
  for (const cenario of CENARIOS) {
    for (const eventoId of EVENTOS) {
      it(`${cenario.id} em ${eventoId} mantém as invariantes`, () => {
        expect(verificarInvariantes(aplicar(cenario.id, eventoId))).toEqual([]);
      });
    }
  }

  it("ids únicos", () => {
    expect(new Set(CENARIOS.map((c) => c.id)).size).toBe(CENARIOS.length);
  });
});

describe("Etapa 4", () => {
  it("MUITOS_CANDIDATOS completa até 24 votáveis, é idempotente e não muda o seed", () => {
    for (const eventoId of EVENTOS) {
      const uma = aplicar("MUITOS_CANDIDATOS", eventoId);
      const duas = aplicar("MUITOS_CANDIDATOS", eventoId, uma);
      expect(votaveis(uma.banco.candidatos.filter((c) => c.eventoId === eventoId))).toHaveLength(24);
      expect(duas.banco.candidatos).toHaveLength(uma.banco.candidatos.length);
      const seed = criarEstadoInicial().banco.candidatos;
      for (const c of seed) expect(uma.banco.candidatos.find((x) => x.id === c.id)).toEqual(c);
      expect(uma.banco.candidatos.filter((c) => c.eventoId === eventoId && c.imagemUrl === null)).toHaveLength(1);
    }
  });
});

describe("Etapa 6", () => {
  it("RASCUNHO_INCOMPLETO bloqueia os itens 1, 3 e 4 do checklist", () => {
    for (const eventoId of EVENTOS) {
      const r = aplicar("RASCUNHO_INCOMPLETO", eventoId);
      const evento = doEvento(r, eventoId);
      expect([evento.estado, evento.estadoUrna]).toEqual(["RASCUNHO", "NAO_INICIADA"]);
      expect(r.banco.votos.filter((v) => v.eventoId === eventoId)).toHaveLength(0);
      const pendentes = avaliarChecklist(montarEntradaChecklist(r, eventoId, T0_MS))
        .filter((i) => i.estado === "PENDENTE")
        .map((i) => i.id);
      expect(pendentes).toEqual(["ITENS", "JANELA", "CONVITES"]);
    }
  });

  it("RASCUNHO_PRONTO deixa o checklist sem bloqueios", () => {
    for (const eventoId of EVENTOS) {
      const r = aplicar("RASCUNHO_PRONTO", eventoId);
      expect(doEvento(r, eventoId).estado).toBe("RASCUNHO");
      const pendentes = avaliarChecklist(montarEntradaChecklist(r, eventoId, T0_MS)).filter((i) => i.estado === "PENDENTE");
      expect(pendentes).toEqual([]);
    }
  });

  it("URNA_ENCERRADA e EVENTO_CONCLUIDO", () => {
    for (const eventoId of EVENTOS) {
      const enc = aplicar("URNA_ENCERRADA", eventoId);
      expect([doEvento(enc, eventoId).estado, doEvento(enc, eventoId).estadoUrna]).toEqual(["ATIVO", "ENCERRADA"]);
      const conc = aplicar("EVENTO_CONCLUIDO", eventoId);
      expect([doEvento(conc, eventoId).estado, doEvento(conc, eventoId).estadoUrna]).toEqual(["CONCLUIDO", "ENCERRADA"]);
    }
  });
});
