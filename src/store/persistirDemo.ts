import { modoVotoJuriDoEvento } from "@/dominio/avaliacaoJuri";
import type { EstadoApp, EstadoEvento, EstadoUrna, ModoVotoJuri, Parceiro } from "@/dominio/tipos";
import type { Ambiente } from "./ambiente";
import { definirModoVotoJuri } from "./acoes";
import { definirConfigSimulador } from "./acoesDashboard";
import { forcarEstadoEvento, forcarEstadoUrna } from "./transicoes";

// Demonstração (08/10/2026): o estado do protótipo vive na memória e volta ao seed ao fechar as abas. Para não
// refazer o preparo a cada demonstração, alguns ajustes ficam no localStorage deste navegador: por evento, o estado
// do evento, o da urna e o modo do júri; a configuração do "Simular votos entrando"; e a sessão (quem está logado,
// para não entrar de novo a cada abertura); e os parceiros, numa chave própria (logos enviados vêm em data: e podem
// estourar a cota sem levar o resto junto). Só a primeira aba aplica (as outras recebem a foto dela). "Resetar mock" volta ao seed, e o seed passa a ser o salvo.

const CHAVE = "vaivota:demo";
const CHAVE_PARCEIROS = "vaivota:demo:parceiros";

type PorEvento = { estado: EstadoEvento; estadoUrna: EstadoUrna; modoVotoJuri: ModoVotoJuri };
type Salvo = {
  eventos: Record<string, PorEvento>;
  simulador?: EstadoApp["dev"]["simuladorVotos"];
  usuarioId?: string | null;
};

function foto(estado: EstadoApp): Salvo {
  const eventos: Record<string, PorEvento> = {};
  for (const e of estado.banco.eventos)
    eventos[e.id] = { estado: e.estado, estadoUrna: e.estadoUrna, modoVotoJuri: modoVotoJuriDoEvento(estado.banco, e.id) };
  return { eventos, simulador: estado.dev.simuladorVotos, usuarioId: estado.sessao.usuarioId };
}

function ler<T>(chave: string): T | null {
  try {
    const bruto = window.localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, texto: string): void {
  try {
    window.localStorage.setItem(chave, texto);
  } catch {
    // Sem armazenamento (aba privada, bloqueio, cota): a demonstração segue, só não lembra.
  }
}

/** Primeira aba: aplica o que foi salvo (urna antes do evento: concluir encerra a urna aberta). */
export function restaurarDemo({ store, relogio }: Ambiente): void {
  const parceiros = ler<Parceiro[]>(CHAVE_PARCEIROS);
  // 09/10/2026: o VaiVota saiu dos parceiros (fica só no rodapé e no final da apresentação); listas salvas antes ainda o trazem.
  if (Array.isArray(parceiros))
    store.atualizar((e) => ({ ...e, banco: { ...e.banco, parceiros: parceiros.filter((p) => p.id !== "parc-fv-vaivota") } }));
  const salvo = ler<Salvo>(CHAVE);
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
  // Só contas do seed voltam: as criadas na hora (Google, cadastro) somem ao fechar as abas.
  const { usuarioId } = salvo;
  if (usuarioId && store.getState().banco.usuarios.some((u) => u.id === usuarioId))
    store.atualizar((e) => ({ ...e, sessao: { usuarioId } }));
}

/** Grava a cada mudança (só quando o que é salvo mudou). Devolve o cancelamento. */
export function salvarDemo({ store }: Ambiente): () => void {
  let ultimo = "";
  let ultimosParceiros: Parceiro[] | null = null;
  const aoMudar = () => {
    const estado = store.getState();
    const texto = JSON.stringify(foto(estado));
    if (texto !== ultimo) {
      ultimo = texto;
      gravar(CHAVE, texto);
    }
    // Por referência: os logos podem ser grandes, então só serializa quando a lista muda.
    if (estado.banco.parceiros !== ultimosParceiros) {
      ultimosParceiros = estado.banco.parceiros;
      gravar(CHAVE_PARCEIROS, JSON.stringify(ultimosParceiros));
    }
  };
  aoMudar();
  return store.subscribe(aoMudar);
}
