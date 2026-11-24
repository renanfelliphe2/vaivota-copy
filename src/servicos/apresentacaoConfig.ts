import type { OpcoesTelao } from "@/dominio/tipos";
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
