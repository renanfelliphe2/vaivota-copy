"use client";

import { Campo, Input } from "@/components/ui/Campo";
import { ContagemRegressiva } from "@/components/ui/ContagemRegressiva";
import { formatarCodigo, limparCodigoDigitado } from "@/lib/codigos";
import { useUi } from "@/store/seletores/dev";
import { useAgora } from "@/store/seletores/relogio";

export type CampoCodigoConviteProps = {
  id: string;
  /** Valor normalizado (sem hífen). */
  valor: string;
  aoMudar: (valor: string) => void;
  erro?: string | null;
  autoFocus?: boolean;
};

/**
 * Código de convite: máscara XXXX-XXXX, maiúsculas, aceita colar com ou sem hífen e descarta caracteres
 * ambíguos. Com o bloqueio de tentativas ativo (um só contador, D5), fica desabilitado com a contagem.
 */
export function CampoCodigoConvite({ id, valor, aoMudar, erro, autoFocus }: CampoCodigoConviteProps) {
  const { bloqueioCodigo } = useUi();
  const agora = useAgora();
  const bloqueado = bloqueioCodigo.ateMs !== null && bloqueioCodigo.ateMs > agora;

  return (
    <Campo
      id={id}
      rotulo="Código de convite"
      dica={
        bloqueado ? (
          <span>
            Muitas tentativas. Tente novamente em{" "}
            <ContagemRegressiva alvoMs={bloqueioCodigo.ateMs!} rotulo="Liberado em" textoZerado="instantes" />.
          </span>
        ) : (
          "Código recebido da organização"
        )
      }
      erro={bloqueado ? null : erro}
    >
      <Input
        value={formatarCodigo(valor)}
        onChange={(e) => aoMudar(limparCodigoDigitado(e.target.value))}
        placeholder="XXXX-XXXX"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={9}
        disabled={bloqueado}
        autoFocus={autoFocus}
        className="font-mono uppercase tracking-widest"
      />
    </Campo>
  );
}
