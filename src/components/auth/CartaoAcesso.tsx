"use client";

import { Abas } from "@/components/ui/Abas";
import { useEventoAtivo } from "@/store/seletores/evento";
import { FormularioLogin } from "./FormularioLogin";
import { FormularioRegistro } from "./FormularioRegistro";

export type CartaoAcessoProps = {
  de?: string;
  /** Chamado antes de navegar (fecha o diálogo do menu). */
  aoConcluir?: () => void;
  abaInicial?: "entrar" | "criar";
};

/** Abas Entrar / Criar conta (D7): "Criar conta" fica desabilitada, com explicação, fora do estado ATIVO. */
export function CartaoAcesso({ de, aoConcluir, abaInicial = "entrar" }: CartaoAcessoProps) {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  const { estado } = ativo.evento;
  const criarDesabilitada = estado !== "ATIVO";
  const dica =
    estado === "CONCLUIDO"
      ? "Este evento foi concluído e não aceita novos cadastros."
      : "Este evento ainda não está disponível para novos cadastros.";

  return (
    <Abas
      rotulo="Acesso ao evento"
      valorInicial={criarDesabilitada ? "entrar" : abaInicial}
      abas={[
        { id: "entrar", rotulo: "Entrar", conteudo: <FormularioLogin de={de} aoConcluir={aoConcluir} /> },
        {
          id: "criar",
          rotulo: "Criar conta",
          desabilitada: criarDesabilitada,
          dica: criarDesabilitada ? dica : undefined,
          conteudo: <FormularioRegistro de={de} aoConcluir={aoConcluir} />,
        },
      ]}
    />
  );
}
