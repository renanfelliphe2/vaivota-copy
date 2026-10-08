import { EyeOff } from "lucide-react";
import { BarChart } from "@/components/charts/BarChart";
import { Alerta } from "@/components/ui/Alerta";
import { Cartao } from "@/components/ui/Cartao";
import type { OperacaoDados } from "@/dominio/painel";
import { formatarNumero } from "@/lib/formatar";

// Etapa 7 (5.5, D8): só existe com parcialAoVivo ligado E urna aberta (o serviço omite os números).
// Sem a flag, uma faixa fixa avisa que o placar por candidato está oculto.

export function ParcialPorCandidato({
  parcial,
  rotuloCandidatos,
  titulo,
}: {
  parcial: OperacaoDados["parcial"];
  rotuloCandidatos: string;
  titulo: (id: string) => string;
}) {
  if (!parcial) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-dashed border-tema-borda px-4 py-3 text-sm text-tema-texto-suave">
        <EyeOff aria-hidden className="size-4 shrink-0" />
        Placar por candidato oculto durante a votação
      </p>
    );
  }
  const itens = [...parcial].sort((a, b) => b.votos - a.votos).map((p) => ({ rotulo: titulo(p.candidatoId), valor: p.votos }));
  return (
    <Cartao className="flex flex-col gap-4">
      <Alerta variante="aviso" titulo="Parcial ao vivo">
        Esta tela mostra votos por candidato. Não espelhe no telão.
      </Alerta>
      <BarChart
        titulo={`Votos do público por ${rotuloCandidatos}`}
        itens={itens}
        formato={formatarNumero}
        alt={itens.map((i) => `${i.rotulo}: ${i.valor}`).join("; ")}
      />
    </Cartao>
  );
}
