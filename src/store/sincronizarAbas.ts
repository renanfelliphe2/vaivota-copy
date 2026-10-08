import { mesclarEstadoRemoto } from "@/dominio/estadoAbas";
import type { EstadoApp } from "@/dominio/tipos";
import type { Ambiente } from "./ambiente";
import type { FotoRelogio } from "./relogio";

// Abas sincronizadas (08/10/2026): o estado do protótipo vive na memória de cada aba; este canal mantém as abas do
// mesmo navegador iguais, para a apresentação rodar em outra aba (no telão) enquanto o admin opera na primeira.
// Protocolo: a aba que abre pede uma foto; quem já está pronta responde só para ela. Depois, cada mudança local vai
// inteira para as outras (a última escrita vale). Sem resposta na espera, a aba é a primeira e segue com o seed.
// Atualizar uma aba com outra aberta recupera o estado; fechar todas volta ao seed, como antes.
// Aba mãe (08/10/2026): a aba aberta por outra (o telão, aberto pelo "Apresentar") prefere a foto de quem a abriu.
// Todas as abas respondem ao pedido, e a primeira foto podia vir de uma aba deslogada: o telão nascia sem sessão e
// o RotaGuard o mandava para o login. A mãe vem no #mae= da URL (abrirPalco) ou pela janela que a abriu.

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

const CHAVE_ID = "__vaivotaAba";
type JanelaComAba = Window & { [CHAVE_ID]?: string };

/** Id desta aba no canal (null antes de sincronizar). */
export function idDestaAba(): string | null {
  return (window as JanelaComAba)[CHAVE_ID] ?? null;
}

/** Id da aba que abriu esta: o #mae= da URL ou, sem ele, o da janela que a abriu. */
export function idDaAbaMae(): string | null {
  const daUrl = /(?:^#|&)mae=([^&]+)/.exec(window.location.hash);
  if (daUrl) return decodeURIComponent(daUrl[1]);
  try {
    return (window.opener as JanelaComAba | null)?.[CHAVE_ID] ?? null;
  } catch {
    return null;
  }
}

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
  const mae = idDaAbaMae();
  (window as JanelaComAba)[CHAVE_ID] = id;
  // O #mae= só serve à abertura: some da URL (um F5 no telão volta a valer pela janela que o abriu).
  if (window.location.hash.includes("mae=")) window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  const canal = new BroadcastChannel(CANAL);
  let pronto = false;
  let temFoto = false;
  let mudouLocal = false;
  /** Foto de outra aba que não a mãe: usada só se a mãe não responder na espera. */
  let reserva: { estado: EstadoApp; relogio: FotoRelogio } | null = null;
  // Mudança vinda de outra aba: aplicada sem reenviar (senão as abas ecoariam para sempre).
  let aplicandoRemoto = false;

  const enviar = (m: Mensagem) => canal.postMessage(m);
  const aceitarFoto = (foto: { estado: EstadoApp; relogio: FotoRelogio }) => {
    temFoto = true;
    aplicar(foto.estado, true);
    relogio.sincronizar(foto.relogio);
    marcarPronto();
  };
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
      if (mae && data.de !== mae) {
        reserva ??= data;
        return;
      }
      aceitarFoto(data);
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
  const espera = setTimeout(() => {
    if (reserva && !temFoto && !mudouLocal) aceitarFoto(reserva);
    marcarPronto();
  }, esperaMs);

  return () => {
    clearTimeout(espera);
    cancelarStore();
    cancelarRelogio();
    canal.close();
  };
}
