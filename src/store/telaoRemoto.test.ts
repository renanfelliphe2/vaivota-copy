import { describe, expect, it } from "vitest";
import type { EstadoUiApresentacao } from "@/dominio/tipos";
import { criarStore } from "./criarStore";
import { criarEstadoDoServidor } from "./estadoReal";
import { publico } from "./estadoPublicoDeTeste";
import { criarEspelhoApresentacao, textoEstavel } from "./telaoRemoto";

// Espelho de ui.apresentacao entre o controle e o telão pareado (25/11/2026), com um "servidor" de mentira: a versão sobe a cada
// escrita e a última vale.

const BASE: EstadoUiApresentacao = { chave: "u1:e1", modoSala: "REAL", cenarioEnsaioId: null, modoAvancoLocal: null, categoriaId: null, revelacao: null };
const com = (mudanca: Partial<EstadoUiApresentacao>): EstadoUiApresentacao => ({ ...BASE, ...mudanca });

function cenario() {
  const store = criarStore(criarEstadoDoServidor(publico()));
  const servidor = { versao: 0, dados: null as unknown, envios: 0 };
  let liberar: (() => void) | null = null;
  let segurar = false;
  const espelho = criarEspelhoApresentacao(store, {
    enviar: async (dados) => {
      servidor.envios++;
      if (segurar) await new Promise<void>((r) => (liberar = r));
      servidor.versao++;
      servidor.dados = dados;
      return servidor.versao;
    },
    podeEnviar: () => true,
  });
  const gravar = (a: EstadoUiApresentacao) => store.atualizar((e) => ({ ...e, ui: { ...e.ui, apresentacao: a } }));
  const local = () => store.getState().ui.apresentacao;
  return {
    store,
    servidor,
    espelho,
    gravar,
    local,
    segurarEnvios: () => (segurar = true),
    soltar: () => {
      segurar = false;
      liberar?.();
    },
  };
}

const tique = () => new Promise((r) => setTimeout(r, 0));

describe("textoEstavel", () => {
  it("ignora a ordem das chaves", () => {
    expect(textoEstavel({ a: 1, b: { c: 2, d: 3 } })).toBe(textoEstavel({ b: { d: 3, c: 2 }, a: 1 }));
  });
});

describe("criarEspelhoApresentacao", () => {
  it("nada vai ao servidor antes da primeira leitura (o guardado neste navegador pode ser de outra apresentação)", async () => {
    const c = cenario();
    c.gravar(com({ modoAvancoLocal: "MANUAL" }));
    await tique();
    expect(c.servidor.envios).toBe(0);
  });

  it("pareado: aplica a cópia mais nova; depois, a mudança daqui vai ao servidor e a própria escrita não volta", async () => {
    const c = cenario();
    c.espelho.receber({ versao: 3, dados: com({ modoAvancoLocal: "MANUAL" }) }, true);
    expect(c.local().modoAvancoLocal).toBe("MANUAL");
    expect(c.servidor.envios).toBe(0);

    c.servidor.versao = 3;
    c.gravar(com({ modoAvancoLocal: "AUTOMATICO" }));
    await tique();
    expect(c.servidor).toMatchObject({ envios: 1, versao: 4 });
    expect(c.espelho.versao()).toBe(4);
    // A mesma cópia de novo (ou mais velha) não mexe em nada.
    c.espelho.receber({ versao: 3, dados: com({ modoAvancoLocal: "MANUAL" }) }, true);
    expect(c.local().modoAvancoLocal).toBe("AUTOMATICO");
  });

  it("à espera do aparelho: o daqui vale e vai ao servidor se for diferente", async () => {
    const c = cenario();
    c.gravar(com({ categoriaId: "cat-2" }));
    c.espelho.receber({ versao: 1, dados: BASE }, false);
    await tique();
    expect(c.local().categoriaId).toBe("cat-2");
    expect(c.servidor.dados).toMatchObject({ categoriaId: "cat-2" });
  });

  it("com um envio a caminho, uma cópia antiga não desfaz a mudança (e a versão do envio vence)", async () => {
    const c = cenario();
    c.espelho.receber(null, true);
    c.segurarEnvios();
    c.gravar(com({ modoAvancoLocal: "MANUAL" }));
    c.espelho.receber({ versao: 1, dados: com({ modoAvancoLocal: "AUTOMATICO" }) }, true);
    expect(c.local().modoAvancoLocal).toBe("MANUAL");
    c.soltar();
    await tique();
    expect(c.servidor.dados).toMatchObject({ modoAvancoLocal: "MANUAL" });
  });

  it("um envio por vez, sempre do estado mais recente", async () => {
    const c = cenario();
    c.espelho.receber(null, true);
    c.segurarEnvios();
    c.gravar(com({ categoriaId: "a" }));
    c.gravar(com({ categoriaId: "b" }));
    c.gravar(com({ categoriaId: "c" }));
    c.soltar();
    for (let i = 0; i < 5; i++) await tique();
    expect(c.servidor.envios).toBe(2);
    expect(c.servidor.dados).toMatchObject({ categoriaId: "c" });
  });

  it("cancelado, para de ouvir", async () => {
    const c = cenario();
    c.espelho.receber(null, true);
    await tique();
    const antes = c.servidor.envios;
    c.espelho.cancelar();
    c.gravar(com({ categoriaId: "x" }));
    await tique();
    expect(c.servidor.envios).toBe(antes);
  });
});
