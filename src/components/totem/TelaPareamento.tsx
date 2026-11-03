"use client";

import { CircleCheck, Link2 } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { LogoEvento } from "@/components/evento/LogoEvento";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input } from "@/components/ui/Campo";
import { Cartao } from "@/components/ui/Cartao";
import { formatarCodigo, limparCodigoDigitado, validarFormatoCodigo } from "@/lib/codigos";
import { TEXTOS_TOTEM } from "@/lib/textosTotem";
import { parearTotem, type DispositivoDoTotem } from "@/servicos/totem";
import { useEventoAtivo } from "@/store/seletores/evento";

// Totem (Base/VotoInfantil.md §4): o adulto digita o código de pareamento UMA vez. O servidor devolve o aparelho e grava o token
// de longa duração num cookie HttpOnly; daí em diante o tablet vota sem login. Sem identificação de quem pareia: o código é a prova.

const ERROS_DE_CODIGO = ["CODIGO_INVALIDO", "CODIGO_USADO", "CODIGO_REVOGADO", "CODIGO_EXPIRADO", "LIMITE_TENTATIVAS", "VALIDACAO"];

export function TelaPareamento() {
  const ativo = useEventoAtivo();
  const id = useId();
  const [codigo, setCodigo] = useState("");
  const [erroCodigo, setErroCodigo] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pareado, setPareado] = useState<DispositivoDoTotem | null>(null);
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
    const r = await parearTotem({ eventoId: evento.id, codigo });
    setEnviando(false);
    if (!r.ok) {
      if (ERROS_DE_CODIGO.includes(r.erro.codigo)) setErroCodigo(r.erro.campos?.codigo ?? r.erro.mensagem);
      else setErroGeral(r.erro.mensagem);
      return;
    }
    setCodigo("");
    setPareado(r.dados.dispositivo);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 px-4 py-10 sm:px-6">
      <div className="flex justify-center">
        <LogoEvento nome={nome} logoUrl={tema.logoUrl} className="h-12 sm:h-16" prioridade />
      </div>
      {pareado ? (
        <Cartao className="flex flex-col items-start gap-4">
          <CircleCheck aria-hidden className="size-10 text-tema-sucesso" />
          <h1 className="text-2xl font-bold">{TEXTOS_TOTEM.parearSucessoTitulo}</h1>
          <p role="status" className="text-tema-texto-suave">
            {TEXTOS_TOTEM.parearSucessoCorpo} <strong className="text-tema-texto">{pareado.nome}</strong>.
          </p>
          <Botao href={`/e/${slug}/totem`} larguraTotal>
            {TEXTOS_TOTEM.parearAbrir}
          </Botao>
        </Cartao>
      ) : (
        <Cartao className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Link2 aria-hidden className="size-9 text-tema-primaria-texto" />
            <h1 className="text-2xl font-bold">{TEXTOS_TOTEM.parearTitulo}</h1>
            <p className="text-tema-texto-suave">{TEXTOS_TOTEM.parearDescricao}</p>
          </div>
          {erroGeral && <Alerta variante="erro">{erroGeral}</Alerta>}
          <form onSubmit={(e) => void enviar(e)} noValidate className="flex flex-col gap-4">
            <Campo id={`${id}-codigo`} rotulo={TEXTOS_TOTEM.parearCampo} erro={erroCodigo}>
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
              {TEXTOS_TOTEM.parearConfirmar}
            </Botao>
            <Botao href={`/e/${slug}/totem`} variante="contorno" larguraTotal>
              {TEXTOS_TOTEM.parearVoltar}
            </Botao>
          </form>
        </Cartao>
      )}
    </div>
  );
}
