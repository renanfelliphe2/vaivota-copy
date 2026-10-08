"use client";

import type { AcaoConfig, Travas } from "@/dominio/travas";
import { Alerta } from "@/components/ui/Alerta";
import { minusculas } from "@/lib/rotulos";
import { useEventoAtivo } from "@/store/seletores/evento";

function textoDaFase(fase: Travas["fase"], rotulos: string): string | null {
  if (fase === "ATIVO_NAO_INICIADA") return "Evento ativo: o endereço já não pode mudar.";
  if (fase === "URNA_ABERTA") return `Urna aberta: ${rotulos} e pesos estão travados.`;
  if (fase === "URNA_ENCERRADA") return "Urna encerrada: a maior parte da configuração está travada.";
  if (fase === "CONCLUIDO") return "Evento concluído: a configuração está somente em leitura.";
  return null;
}

/** Aparece quando há trava ativa na seção atual (seção 5.1). O rótulo vem do tema. */
export function BannerTrava({ travas, acoes }: { travas: Travas; acoes: readonly AcaoConfig[] }) {
  const ativo = useEventoAtivo();
  const algumaTrava = acoes.some((a) => travas.nivel(a) !== "LIVRE");
  const texto = textoDaFase(travas.fase, minusculas(ativo?.tema.rotuloCandidatos ?? "itens"));
  if (!algumaTrava && !travas.incoerente) return null;
  return (
    <Alerta variante={travas.fase === "CONCLUIDO" ? "informacao" : "aviso"}>
      {algumaTrava && texto && <p>{texto}</p>}
      {travas.incoerente && <p>Combinação criada pela toolbar. Use a toolbar para voltar a um estado válido.</p>}
    </Alerta>
  );
}
