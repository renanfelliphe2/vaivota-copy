import type { ConfigTrofeu, Grupo, OpcoesTelao, OrdemCerimonia } from "@/dominio/tipos";
import { recarregarEstado } from "@/store/servidor";
import { chamar } from "./rpc";
import type { Resultado } from "./resultado";

// Telão da votação (demanda B2, 25/11/2026): intervalo da troca de categoria e o que a cena mostra. Livre em toda fase.

export type DadosTelao = { intervaloSegundos: number; mostrar: OpcoesTelao };

export async function salvarApresentacao(eventoId: string, dados: DadosTelao): Promise<Resultado<null>> {
  const r = await chamar<null>("salvarApresentacao", { eventoId, dados });
  if (r.ok) await recarregarEstado();
  return r;
}

/** Cerimônia no telão (25/11/2026): troféus (ligado, nome, escopo, votos) e a ordem da revelação. Livre em toda fase. */
export type DadosCerimonia = {
  trofeus: Record<Grupo, ConfigTrofeu>;
  rotulos: Record<Grupo, string>;
  ordem: OrdemCerimonia;
};

export async function salvarCerimonia(eventoId: string, dados: DadosCerimonia): Promise<Resultado<null>> {
  const r = await chamar<null>("salvarCerimonia", { eventoId, dados });
  if (r.ok) await recarregarEstado();
  return r;
}
