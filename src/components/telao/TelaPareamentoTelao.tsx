"use client";

import { MonitorSmartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { LogoEvento } from "@/components/evento/LogoEvento";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input } from "@/components/ui/Campo";
import { Cartao } from "@/components/ui/Cartao";
import { formatarCodigo, limparCodigoDigitado, validarFormatoCodigo } from "@/lib/codigos";
import { parearTelao } from "@/servicos/telaoRemoto";
import { useEventoAtivo } from "@/store/seletores/evento";

// Telão em outro aparelho (25/11/2026), como o /totem/parear: quem está no aparelho do telão digita o código que aparece no palco
// do admin ("Abrir em outro aparelho"). O servidor grava o token num cookie HttpOnly e este aparelho vira o telão, comandado pelo
// controle remoto do computador que gerou o código. Sem login: o código é a prova.

const ERROS_DE_CODIGO = ["CODIGO_INVALIDO", "CODIGO_USADO", "CODIGO_REVOGADO", "CODIGO_EXPIRADO", "LIMITE_TENTATIVAS", "VALIDACAO"];

export function TelaPareamentoTelao() {
  const ativo = useEventoAtivo();
  const router = useRouter();
  const id = useId();
  const [codigo, setCodigo] = useState("");
  const [erroCodigo, setErroCodigo] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  if (!ativo) return null;
  const { evento, tema, slug } = ativo;
  const nome = tema.nomeExibicao ?? evento.nome;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setErroGeral(null);
    if (!validarFormatoCodigo(codigo)) {
      setErroCodigo("Digite o código completo, no formato XXXX-XXXX.");
      return;
    }
    setErroCodigo(null);
    setEnviando(true);
    const r = await parearTelao({ eventoId: evento.id, codigo });
    if (!r.ok) {
      setEnviando(false);
      if (ERROS_DE_CODIGO.includes(r.erro.codigo)) setErroCodigo(r.erro.campos?.codigo ?? r.erro.mensagem);
      else setErroGeral(r.erro.mensagem);
      return;
    }
    router.replace(`/e/${slug}/telao`);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 px-4 py-10 sm:px-6">
      <div className="flex justify-center">
        <LogoEvento nome={nome} logoUrl={tema.logoUrl} className="h-12 sm:h-16" prioridade />
      </div>
      <Cartao className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <MonitorSmartphone aria-hidden className="size-9 text-tema-primaria-texto" />
          <h1 className="text-2xl font-bold">Abrir a apresentação neste aparelho</h1>
          <p className="text-tema-texto-suave">
            No computador que vai comandar, abra a apresentação e clique em “Abrir em outro aparelho”. Digite aqui o código que aparecer. O
            controle remoto continua naquele computador.
          </p>
        </div>
        {erroGeral && <Alerta variante="erro">{erroGeral}</Alerta>}
        <form onSubmit={(e) => void enviar(e)} noValidate className="flex flex-col gap-4">
          <Campo id={`${id}-codigo`} rotulo="Código da apresentação" erro={erroCodigo}>
            <Input
              value={formatarCodigo(codigo)}
              onChange={(e) => setCodigo(limparCodigoDigitado(e.target.value))}
              placeholder="XXXX-XXXX"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={9}
              autoFocus
              className="font-mono uppercase tracking-widest"
            />
          </Campo>
          <Botao type="submit" larguraTotal carregando={enviando}>
            Abrir a apresentação
          </Botao>
        </form>
      </Cartao>
    </div>
  );
}
