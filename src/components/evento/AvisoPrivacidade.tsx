"use client";

import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Dialogo } from "@/components/ui/Dialogo";
import { cx } from "@/lib/classes";

/**
 * Aviso de privacidade da plataforma VaiVota (controladora dos dados; rev. 4, E29). Sempre disponível.
 * Texto provisório (rascunho a partir do DD §10.4), pendente de revisão jurídica. Sem rota própria no
 * protótipo: abre num diálogo.
 */
export function AvisoPrivacidade({ className, rotulo = "Aviso de privacidade" }: { className?: string; rotulo?: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={cx("inline-flex min-h-11 items-center underline underline-offset-2 hover:no-underline", className)}
      >
        {rotulo}
      </button>
      <Dialogo
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo="Aviso de privacidade"
        descricao="VaiVota · texto provisório, em revisão"
        rodape={<Botao onClick={() => setAberto(false)}>Entendi</Botao>}
      >
        <div className="flex flex-col gap-3 text-sm leading-relaxed">
          <p>
            A <strong>VaiVota</strong> é a controladora dos dados tratados nesta plataforma. Coletamos apenas o mínimo
            para identificar sua participação em cada evento: <strong>nome e e-mail</strong>.
          </p>
          <p>
            <strong>Seu voto é sigiloso.</strong> O voto do público não fica ligado aos seus dados: registramos só que
            você votou, nunca em quem. Votos de jurados são identificados apenas para a organização do evento.
          </p>
          <p>
            Depois que o evento é concluído, nome e e-mail são anonimizados após o prazo definido pela organização,
            mantendo os votos para a integridade do resultado.
          </p>
          <p className="text-tema-texto-suave">
            Alguns eventos têm também um aviso próprio, complementar a este, indicado no rodapé da página do evento.
          </p>
        </div>
      </Dialogo>
    </>
  );
}
