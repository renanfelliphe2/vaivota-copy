import { describe, expect, it } from "vitest";
import { funilVazio } from "@/dominio/sessaoTotem";
import {
  aplicarAbertura,
  aplicarEncerramento,
  aplicarEvento,
  aplicarVoto,
  estadoLogVazio,
  funilParaRelatorio,
  MAXIMO_EVENTOS_LOG,
  type EstadoLogTotem,
  type TipoEventoLog,
} from "./logTotem";

function eventos(estado: EstadoLogTotem, tipos: TipoEventoLog[], t = 0) {
  return tipos.reduce((e, tipo, i) => aplicarEvento(e, tipo, t + i), estado);
}

describe("log do totem", () => {
  it("toques antes do 1º voto vão para a sessão que o voto informar", () => {
    let e = eventos(estadoLogVazio(), ["COMECOU", "ESCOLHEU", "DESISTIU_CONFIRMAR", "COMECOU", "ESCOLHEU", "ENVIOU"]);
    expect(funilParaRelatorio(e)).toBeNull(); // sessão ainda desconhecida
    e = aplicarVoto(e, { sessaoId: "s1", numeroSessao: 1, votosSessao: 1, votosTotal: 1 }, 10);
    expect(e.sessaoAtual).toEqual({ id: "s1", numero: 1 });
    expect(e.funis.s1).toMatchObject({ comecou: 2, escolheu: 2, desistiuConfirmar: 1, enviou: 1, registrado: 1 });
    expect(e.pendente).toEqual(funilVazio());
    expect(e.eventos.at(-1)).toMatchObject({ tipo: "REGISTRADO", sessao: 1, votosSessao: 1 });
  });

  it("erros contam por código; o relatório soma a sessão e os pendentes", () => {
    let e = aplicarVoto(estadoLogVazio(), { sessaoId: "s1", numeroSessao: 1, votosSessao: 1 }, 0);
    e = eventos(e, ["COMECOU", "ESCOLHEU", "ENVIOU"]);
    e = aplicarEvento(e, "ERRO", 5, { codigo: "REDE" });
    e = aplicarEvento(e, "ERRO", 6, { codigo: "nao é código" });
    e = aplicarEvento(e, "TENTOU_DE_NOVO", 7);
    const r = funilParaRelatorio(e)!;
    expect(r.sessaoId).toBe("s1");
    expect(r.contagens).toMatchObject({ registrado: 1, comecou: 1, tentouDeNovo: 1, erros: { REDE: 1, DESCONHECIDO: 1 } });
  });

  it("voto que cai em sessão nova (encerrada por inatividade) leva os pendentes para ela", () => {
    let e = aplicarVoto(estadoLogVazio(), { sessaoId: "s1", numeroSessao: 1, votosSessao: 1 }, 0);
    e = eventos(e, ["COMECOU", "ESCOLHEU", "ENVIOU"], 100);
    e = aplicarVoto(e, { sessaoId: "s2", numeroSessao: 2, votosSessao: 1 }, 200);
    expect(e.funis.s1).toMatchObject({ registrado: 1, comecou: 0 });
    expect(e.funis.s2).toMatchObject({ registrado: 1, comecou: 1 });
  });

  it("encerrar pelo menu deixa os pendentes com a sessão encerrada; abrir define a próxima", () => {
    let e = aplicarVoto(estadoLogVazio(), { sessaoId: "s1", numeroSessao: 1, votosSessao: 1 }, 0);
    e = eventos(e, ["COMECOU", "DESISTIU_ESCOLHA"], 10);
    e = aplicarEncerramento(e, 20);
    expect(e.funis.s1).toMatchObject({ comecou: 1, desistiuEscolha: 1 });
    e = aplicarAbertura(e, { id: "s2", numero: 2 }, 30);
    expect(funilParaRelatorio(e)).toEqual({ sessaoId: "s2", contagens: funilVazio() });
    expect(e.eventos.map((x) => x.tipo).slice(-2)).toEqual(["SESSAO_ENCERRADA", "SESSAO_ABERTA"]);
  });

  it("guarda no máximo os últimos eventos, sem nenhum item escolhido", () => {
    let e = estadoLogVazio();
    for (let i = 0; i < MAXIMO_EVENTOS_LOG + 50; i++) e = aplicarEvento(e, "COMECOU", i);
    expect(e.eventos).toHaveLength(MAXIMO_EVENTOS_LOG);
    expect(e.eventos[0]!.t).toBe(50);
    expect(e.pendente.comecou).toBe(MAXIMO_EVENTOS_LOG + 50);
    expect(Object.keys(e.eventos[0]!).sort()).toEqual(["t", "tipo"]);
  });
});
