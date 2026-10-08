import { describe, expect, it } from "vitest";
import { criarEstadoInicial } from "@/mocks/criarEstadoInicial";
import { mesclarEstadoRemoto } from "./estadoAbas";

function abas() {
  const local = criarEstadoInicial();
  local.sessao.usuarioId = "usr-bruno";
  local.ui.palcoAtivo = true;
  local.ui.totem = { dispositivoId: "disp-hall", quiosqueAtivo: true };
  local.dev.toolbarModo = "OCULTA";

  const remoto = criarEstadoInicial();
  remoto.sessao.usuarioId = "usr-carla";
  remoto.banco.eventos[0].estadoUrna = "ABERTA";
  remoto.ui.apresentacao.modoSala = "ENSAIO";
  remoto.dev.latenciaMs = 0;
  return { local, remoto };
}

describe("mesclarEstadoRemoto", () => {
  it("leva banco, apresentação e flags de simulação da outra aba", () => {
    const { local, remoto } = abas();
    const r = mesclarEstadoRemoto(local, remoto, { comSessao: false });
    expect(r.banco.eventos[0].estadoUrna).toBe("ABERTA");
    expect(r.ui.apresentacao.modoSala).toBe("ENSAIO");
    expect(r.dev.latenciaMs).toBe(0);
  });

  it("mantém o que é da janela: palco, totem, toolbar e a sessão depois de aberta", () => {
    const { local, remoto } = abas();
    const r = mesclarEstadoRemoto(local, remoto, { comSessao: false });
    expect(r.sessao.usuarioId).toBe("usr-bruno");
    expect(r.ui.palcoAtivo).toBe(true);
    expect(r.ui.totem).toEqual({ dispositivoId: "disp-hall", quiosqueAtivo: true });
    expect(r.dev.toolbarModo).toBe("OCULTA");
  });

  it("ao abrir a aba, herda a sessão (o telão abre já como admin)", () => {
    const { local, remoto } = abas();
    expect(mesclarEstadoRemoto(local, remoto, { comSessao: true }).sessao.usuarioId).toBe("usr-carla");
  });
});
