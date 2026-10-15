import type { RegraDesempate } from "@/dominio/tipos";
import { recarregarEstado } from "@/store/servidor";
import { chamar } from "./rpc";
import type { Resultado } from "./resultado";

// ST7: pesos inteiros, soma 100 nos módulos ligados, desligado = 0. Trava total com a urna aberta.

export type DadosPlacar = { pesoPopular: number; pesoJuri: number; pesoInfantil: number; regraDesempate: RegraDesempate };

export async function salvarPlacar(eventoId: string, dados: DadosPlacar): Promise<Resultado<null>> {
  const r = await chamar<null>("salvarPlacar", { eventoId, dados });
  if (r.ok) await recarregarEstado();
  return r;
}
