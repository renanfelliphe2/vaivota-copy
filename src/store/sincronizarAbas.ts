import { mesclarEstadoRemoto } from "@/dominio/estadoAbas";
import type { EstadoApp } from "@/dominio/tipos";
import type { Ambiente } from "./ambiente";
import type { FotoRelogio } from "./relogio";

// Abas sincronizadas (08/10/2026): o estado do protótipo vive na memória de cada aba; este canal mantém as abas do
// mesmo navegador iguais, para a apresentação rodar em outra aba (no telão) enquanto o admin opera na primeira.
// Protocolo: a aba que abre pede uma foto; quem já está pronta responde só para ela. Depois, cada mudança local vai
// inteira para as outras (a última escrita vale). Sem resposta na espera, a aba é a primeira e segue com o seed.
// Atualizar uma aba com outra aberta recupera o estado; fechar todas volta ao seed, como antes.

const CANAL = "vaivota-prototipo";
/** Aba aberta sozinha: quase sempre é a única, então espera pouco. */
export const ESPERA_SOZINHA_MS = 200;
/** Aba aberta por outra (a do telão, com window.opener): a mãe existe, então espera a foto com folga. */
export const ESPERA_COM_MAE_MS = 2000;

type Mensagem =
  | { tipo: "PEDIR"; de: string }
  | { tipo: "FOTO"; de: string; para: string; estado: EstadoApp; relogio: FotoRelogio }
  | { tipo: "MUDANCA"; de: string; estado: EstadoApp }
  | { tipo: "RELOGIO"; de: string; relogio: FotoRelogio };

function novoId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `aba-${Date.now()}-${Math.random()}`;
}

/**
 * Liga a aba ao canal. `aoPronto` roda uma vez: com a foto de outra aba ou, sem nenhuma, depois de `esperaMs`.
 * Uma foto atrasada ainda vale se esta aba não mudou nada desde então.
 */
export function sincronizarAbas({ store, relogio }: Ambiente, aoPronto: () => void, esperaMs = ESPERA_SOZINHA_MS): () => void {
  if (typeof BroadcastChannel === "undefined") {
    const t = setTimeout(aoPronto, 0);
    return () => clearTimeout(t);
  }
  const id = novoId();
  const canal = new BroadcastChannel(CANAL);
  let pronto = false;
  let temFoto = false;
  let mudouLocal = false;
  // Mudança vinda de outra aba: aplicada sem reenviar (senão as abas ecoariam para sempre).
  let aplicandoRemoto = false;

  const enviar = (m: Mensagem) => canal.postMessage(m);
  const marcarPronto = () => {
    if (pronto) return;
    pronto = true;
    aoPronto();
  };
  const aplicar = (remoto: EstadoApp, comSessao: boolean) => {
    aplicandoRemoto = true;
    try {
      store.atualizar((local) => mesclarEstadoRemoto(local, remoto, { comSessao }));
    } finally {
      aplicandoRemoto = false;
    }
  };

  canal.onmessage = ({ data }: MessageEvent<Mensagem>) => {
    if (data.de === id) return;
    if (data.tipo === "PEDIR") {
      if (pronto) enviar({ tipo: "FOTO", de: id, para: data.de, estado: store.getState(), relogio: relogio.foto() });
      return;
    }
    if (data.tipo === "FOTO") {
      if (data.para !== id || temFoto || mudouLocal) return;
      temFoto = true;
      aplicar(data.estado, true);
      relogio.sincronizar(data.relogio);
      marcarPronto();
      return;
    }
    // Antes da foto, nada de mudanças avulsas: a foto já traz o estado inteiro.
    if (!pronto) return;
    if (data.tipo === "MUDANCA") aplicar(data.estado, false);
    else relogio.sincronizar(data.relogio);
  };

  const cancelarStore = store.subscribe(() => {
    if (!pronto || aplicandoRemoto) return;
    mudouLocal = true;
    enviar({ tipo: "MUDANCA", de: id, estado: store.getState() });
  });
  const cancelarRelogio = relogio.subscribeSalto(() => {
    if (pronto) enviar({ tipo: "RELOGIO", de: id, relogio: relogio.foto() });
  });

  enviar({ tipo: "PEDIR", de: id });
  const espera = setTimeout(marcarPronto, esperaMs);

  return () => {
    clearTimeout(espera);
    cancelarStore();
    cancelarRelogio();
    canal.close();
  };
}
