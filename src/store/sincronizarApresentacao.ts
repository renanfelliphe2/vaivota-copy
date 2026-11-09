import type { EstadoUiApresentacao } from "@/dominio/tipos";
import type { Ambiente } from "./ambiente";
import { criarApresentacaoInicial } from "./estadoInicial";

// Apresentação entre abas: a sala de controle fica numa aba do admin e o telão (palco) em outra, e as duas precisam enxergar a mesma
// revelação (cena, passo, pausa) e as mesmas preferências (modo, cenário, avanço). O resto do estado vem do servidor e cada aba o
// busca sozinha; só `ui.apresentacao` mora no navegador, então só ela é espelhada: por um BroadcastChannel entre as abas abertas e
// no localStorage, para a revelação continuar de onde parou se o telão for recarregado ou fechado e aberto de novo.
// Cada mudança local vai inteira para as outras abas (a última escrita vale). Uma mudança vinda de fora é aplicada sem reenviar,
// senão as abas ecoariam para sempre.

const CANAL = "vaivota-apresentacao";
export const CHAVE_APRESENTACAO = "vaivota:apresentacao";

type Mensagem = { de: string; apresentacao: EstadoUiApresentacao };

function novoId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `aba-${Date.now()}-${Math.random()}`;
}

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Lê o que veio do localStorage ou de outra aba. Qualquer coisa fora do formato (versão antiga, JSON mexido à mão) vira `null`
 * em vez de entrar no estado: o resto cai nos valores iniciais.
 */
export function lerApresentacao(bruto: unknown): EstadoUiApresentacao | null {
  if (!ehObjeto(bruto)) return null;
  const inicial = criarApresentacaoInicial();
  const { chave, modoSala, cenarioEnsaioId, modoAvancoLocal, categoriaId, revelacao } = bruto;
  if (chave !== null && typeof chave !== "string") return null;
  if (modoSala !== "REAL" && modoSala !== "ENSAIO") return null;
  if (cenarioEnsaioId !== null && typeof cenarioEnsaioId !== "string") return null;
  if (modoAvancoLocal !== null && modoAvancoLocal !== "AUTOMATICO" && modoAvancoLocal !== "MANUAL") return null;
  // 09/11/2026: a categoria apresentada; o que foi salvo antes dela existir vem sem o campo (vale a primeira categoria).
  if (categoriaId !== undefined && categoriaId !== null && typeof categoriaId !== "string") return null;
  let revelacaoLida: EstadoUiApresentacao["revelacao"] = inicial.revelacao;
  if (revelacao !== null) {
    if (!ehObjeto(revelacao)) return null;
    const r = revelacao;
    const valida =
      typeof r.eventoId === "string" &&
      typeof r.assinatura === "string" &&
      (r.situacao === "EM_ANDAMENTO" || r.situacao === "CONCLUIDA") &&
      Number.isInteger(r.cena) &&
      Number.isInteger(r.passo) &&
      typeof r.pausado === "boolean" &&
      typeof r.emergencia === "boolean" &&
      typeof r.iniciadaEm === "string";
    if (!valida) return null;
    revelacaoLida = r as unknown as EstadoUiApresentacao["revelacao"];
  }
  return {
    chave: chave as string | null,
    modoSala,
    cenarioEnsaioId: cenarioEnsaioId as string | null,
    modoAvancoLocal: modoAvancoLocal as EstadoUiApresentacao["modoAvancoLocal"],
    categoriaId: typeof categoriaId === "string" ? categoriaId : null,
    revelacao: revelacaoLida,
  };
}

function lerSalva(): EstadoUiApresentacao | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE_APRESENTACAO);
    return bruto ? lerApresentacao(JSON.parse(bruto)) : null;
  } catch {
    return null;
  }
}

function gravar(apresentacao: EstadoUiApresentacao): void {
  try {
    window.localStorage.setItem(CHAVE_APRESENTACAO, JSON.stringify(apresentacao));
  } catch {
    // Sem armazenamento (aba privada, bloqueio, cota): a apresentação segue, só não sobrevive a recarregar.
  }
}

/** Liga a aba ao espelho da apresentação. Devolve o cancelamento. */
export function sincronizarApresentacao({ store }: Pick<Ambiente, "store">): () => void {
  const id = novoId();
  let aplicandoRemoto = false;
  const aplicar = (apresentacao: EstadoUiApresentacao) => {
    aplicandoRemoto = true;
    try {
      store.atualizar((e) => (e.ui.apresentacao === apresentacao ? e : { ...e, ui: { ...e.ui, apresentacao } }));
    } finally {
      aplicandoRemoto = false;
    }
  };

  const salva = lerSalva();
  if (salva) aplicar(salva);

  const canal = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CANAL);
  if (canal)
    canal.onmessage = ({ data }: MessageEvent<Mensagem>) => {
      if (!ehObjeto(data) || data.de === id) return;
      const lida = lerApresentacao(data.apresentacao);
      if (lida) aplicar(lida);
    };

  let ultima = store.getState().ui.apresentacao;
  const cancelar = store.subscribe(() => {
    const atual = store.getState().ui.apresentacao;
    if (atual === ultima) return;
    ultima = atual;
    if (aplicandoRemoto) return;
    gravar(atual);
    canal?.postMessage({ de: id, apresentacao: atual } satisfies Mensagem);
  });

  return () => {
    cancelar();
    canal?.close();
  };
}
