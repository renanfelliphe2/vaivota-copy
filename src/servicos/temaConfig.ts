import { PRESETS_TEMA, type PresetTema } from "@/dominio/presetsTema";
import type { DadosTema } from "@/dominio/validacoesConfig";
import { recarregarEstado } from "@/store/servidor";
import { chamar } from "./rpc";
import { sucesso, type Resultado } from "./resultado";

// ST7: presets de paleta (estáticos, no código) e salvar o tema com a política de contraste (no servidor).
// Livre mesmo com a urna aberta.

export type { PresetTema };

export async function listarPresetsTema(): Promise<Resultado<PresetTema[]>> {
  return sucesso(PRESETS_TEMA);
}

export type DadosSalvarTema = DadosTema & { logoUrl: string | null };

export async function salvarTema(eventoId: string, dados: DadosSalvarTema): Promise<Resultado<null>> {
  const r = await chamar<null>("salvarTema", { eventoId, dados });
  if (r.ok) await recarregarEstado();
  return r;
}
