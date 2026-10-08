import { modoVotoJuriDoEvento } from "@/dominio/avaliacaoJuri";
import type { EstadoApp, EstadoEvento, EstadoUrna, ModoVotoJuri } from "@/dominio/tipos";
import type { Ambiente } from "./ambiente";
import { definirModoVotoJuri } from "./acoes";
import { definirConfigSimulador } from "./acoesDashboard";
import { forcarEstadoEvento, forcarEstadoUrna } from "./transicoes";

// Demonstração (08/10/2026): o estado do protótipo vive na memória e volta ao seed ao fechar as abas. Para não
// refazer o preparo a cada demonstração, alguns ajustes ficam no localStorage deste navegador: por evento, o estado
// do evento, o da urna e o modo do júri; e a configuração do "Simular votos entrando". Só a primeira aba aplica
// (as outras recebem a foto dela). "Resetar mock" volta ao seed, e o seed passa a ser o salvo.

const CHAVE = "vaivota:demo";

type PorEvento = { estado: EstadoEvento; estadoUrna: EstadoUrna; modoVotoJuri: ModoVotoJuri };
type Salvo = { eventos: Record<string, PorEvento>; simulador?: EstadoApp["dev"]["simuladorVotos"] };

function foto(estado: EstadoApp): Salvo {
  const eventos: Record<string, PorEvento> = {};
  for (const e of estado.banco.eventos)
    eventos[e.id] = { estado: e.estado, estadoUrna: e.estadoUrna, modoVotoJuri: modoVotoJuriDoEvento(estado.banco, e.id) };
  return { eventos, simulador: estado.dev.simuladorVotos };
}

function ler(): Salvo | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as Salvo) : null;
  } catch {
    return null;
  }
}

/** Primeira aba: aplica o que foi salvo (urna antes do evento: concluir encerra a urna aberta). */
export function restaurarDemo({ store, relogio }: Ambiente): void {
  const salvo = ler();
  if (!salvo) return;
  const ctx = { agoraMs: relogio.getAgora(), usuarioId: null };
  for (const [eventoId, s] of Object.entries(salvo.eventos ?? {})) {
    const atual = store.getState().banco.eventos.find((e) => e.id === eventoId);
    if (!atual) continue;
    store.atualizar((e) => forcarEstadoUrna(e, eventoId, s.estadoUrna, ctx));
    store.atualizar((e) => forcarEstadoEvento(e, eventoId, s.estado, ctx));
    if (modoVotoJuriDoEvento(store.getState().banco, eventoId) !== s.modoVotoJuri) definirModoVotoJuri(eventoId, s.modoVotoJuri);
  }
  if (salvo.simulador) definirConfigSimulador(salvo.simulador);
}

/** Grava a cada mudança (só quando o que é salvo mudou). Devolve o cancelamento. */
export function salvarDemo({ store }: Ambiente): () => void {
  let ultimo = "";
  const gravar = () => {
    const texto = JSON.stringify(foto(store.getState()));
    if (texto === ultimo) return;
    ultimo = texto;
    try {
      window.localStorage.setItem(CHAVE, texto);
    } catch {
      // Sem armazenamento (aba privada, bloqueio): a demonstração segue, só não lembra.
    }
  };
  gravar();
  return store.subscribe(gravar);
}
