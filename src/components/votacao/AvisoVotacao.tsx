import type { AvisoVotacao as TipoAviso } from "@/dominio/tipos";
import { Alerta } from "@/components/ui/Alerta";
import { mensagemDe } from "@/servicos/mensagens";

const TEXTOS: Record<TipoAviso, { variante: "aviso" | "erro" | "informacao"; texto: string }> = {
  NAO_REGISTRADO: { variante: "aviso", texto: "Sua escolha não foi registrada: a votação não estava aberta." },
  ESCOLHA_INDISPONIVEL: { variante: "aviso", texto: "A escolha anterior não está mais disponível. Escolha novamente." },
  VOTO_PROPRIO: { variante: "aviso", texto: mensagemDe("VOTO_PROPRIO") },
  JA_VOTOU_ANTES: {
    variante: "informacao",
    texto: "Seu voto já tinha sido registrado em outra sessão. A escolha desta tela não foi usada.",
  },
};

/** Etapa 5 (seção 5.6): aviso pós-envio, na lista, em TelaJaVotou ou na tela de estado. */
export function AvisoVotacao({ aviso, className }: { aviso: TipoAviso | null; className?: string }) {
  if (!aviso) return null;
  const { variante, texto } = TEXTOS[aviso];
  return (
    <Alerta variante={variante} role="alert" className={className}>
      {texto}
    </Alerta>
  );
}
