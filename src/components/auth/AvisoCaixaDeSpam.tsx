import { Alerta } from "@/components/ui/Alerta";

/**
 * Nas telas de código: domínio novo cai no spam com frequência (sobretudo no Outlook/Hotmail), e a pessoa acharia que o
 * código não veio. O remetente leva o nome do evento (src/lib/remetente.ts), que é o que ela vai procurar na caixa.
 */
export function AvisoCaixaDeSpam({ nomeEvento }: { nomeEvento: string }) {
  return (
    <Alerta variante="informacao" role={null}>
      Não chegou em 1 minuto? Confira a caixa de <strong>spam</strong> ou <strong>lixo eletrônico</strong>. O e-mail vem de{" "}
      <strong className="text-tema-texto">{nomeEvento}</strong>.
    </Alerta>
  );
}
