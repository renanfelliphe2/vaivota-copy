import Link from "next/link";
import { Alerta } from "@/components/ui/Alerta";
import type { FaseConfig } from "@/dominio/travas";

// Etapa 7 (5.1, D6): avisos de fase do painel. A fase vem de resolverFaseConfig (nunca de estado/estadoUrna).

export function BannerPainel({ fase, incoerente, base }: { fase: FaseConfig; incoerente: boolean; base: string }) {
  return (
    <>
      {incoerente && (
        <Alerta variante="aviso" titulo="Estado incoerente">
          Combinação criada pela toolbar. Use a toolbar para voltar a um estado válido.
        </Alerta>
      )}
      {fase === "CONCLUIDO" && (
        <Alerta variante="informacao" titulo="Somente leitura">
          O evento foi concluído. O painel pode ser consultado e os arquivos continuam disponíveis para exportação.
        </Alerta>
      )}
      {fase === "RASCUNHO" && (
        <Alerta variante="informacao" titulo="O evento ainda não foi ativado">
          Os indicadores aparecem depois da ativação.{" "}
          <Link href={`${base}/configuracao?secao=operacao`} className="font-semibold underline">
            Ir para Configuração, seção Operação
          </Link>
        </Alerta>
      )}
    </>
  );
}
