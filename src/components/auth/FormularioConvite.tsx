"use client";

import { CircleCheck, Gavel, Info } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Cartao } from "@/components/ui/Cartao";
import { validarFormatoCodigo } from "@/lib/codigos";
import { resgatarConvite } from "@/servicos/auth";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSessao } from "@/store/seletores/sessao";
import { CampoCodigoConvite } from "./CampoCodigoConvite";

const ERROS_DE_CODIGO = ["CODIGO_INVALIDO", "CODIGO_USADO", "CODIGO_REVOGADO", "CODIGO_EXPIRADO", "LIMITE_TENTATIVAS", "VALIDACAO"];

function Informativo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const ativo = useEventoAtivo();
  return (
    <Cartao className="flex flex-col items-start gap-4">
      <Info aria-hidden className="size-9 text-tema-info" />
      <h1 className="text-2xl font-bold">{titulo}</h1>
      <p className="text-tema-texto-suave">{children}</p>
      {ativo && (
        <Botao href={`/e/${ativo.slug}`} variante="contorno">
          Voltar para o evento
        </Botao>
      )}
    </Cartao>
  );
}

/** "Tenho um código de convite" (Etapa 3, seção 5.4). A guarda de e-mail verificado é do RotaGuard. */
export function FormularioConvite() {
  const ativo = useEventoAtivo();
  const sessao = useSessao();
  const id = useId();
  const [codigo, setCodigo] = useState("");
  const [erroCodigo, setErroCodigo] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [destino, setDestino] = useState<string | null>(null);
  if (!ativo) return null;
  const { evento, tema } = ativo;

  if (destino) {
    const votar = destino.endsWith("#candidatos");
    return (
      <Cartao className="flex flex-col items-start gap-4">
        <CircleCheck aria-hidden className="size-10 text-tema-sucesso" />
        <h1 className="text-2xl font-bold">Agora você é jurado neste evento</h1>
        <p className="text-tema-texto-suave">
          {votar
            ? `Seu voto de jurado é identificado para a organização e pode ser alterado até o encerramento.`
            : "Quando a votação abrir, volte aqui para votar como jurado."}
        </p>
        <Botao href={destino}>{votar ? "Votar como jurado" : "Voltar para o evento"}</Botao>
      </Cartao>
    );
  }

  if (!evento.moduloJuri || evento.estado === "CONCLUIDO" || evento.estadoUrna === "ENCERRADA") {
    const motivo =
      evento.estado === "CONCLUIDO"
        ? "Este evento foi concluído e não aceita novos convites."
        : evento.estadoUrna === "ENCERRADA"
          ? "A votação deste evento foi encerrada."
          : "Este evento não tem votação do júri.";
    return <Informativo titulo="Convite indisponível">{motivo}</Informativo>;
  }
  // Enquanto envia, o papel pode mudar para JURADO antes do sucesso chegar: mantém o formulário.
  if (!enviando && sessao.papel === "ADMIN")
    return <Informativo titulo="Conta administrativa">Contas administrativas não resgatam convite.</Informativo>;
  if (!enviando && sessao.papel === "JURADO")
    return <Informativo titulo="Você já é jurado">Você já é jurado neste evento.</Informativo>;
  if (!enviando && sessao.jaVotou)
    return (
      <Informativo titulo="Não é possível virar jurado">
        Você já votou como público neste evento e não pode se tornar jurado.
      </Informativo>
    );

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    setErroGeral(null);
    if (!validarFormatoCodigo(codigo)) {
      setErroCodigo("Digite o código completo, no formato XXXX-XXXX.");
      return;
    }
    setErroCodigo(null);
    setEnviando(true);
    const r = await resgatarConvite(evento.id, codigo);
    if (!r.ok) {
      setEnviando(false);
      if (ERROS_DE_CODIGO.includes(r.erro.codigo)) setErroCodigo(r.erro.campos?.codigo ?? r.erro.mensagem);
      else setErroGeral(r.erro.mensagem);
      return;
    }
    setDestino(r.dados.destino);
    setEnviando(false);
  };

  return (
    <Cartao className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Gavel aria-hidden className="size-9 text-tema-primaria-texto" />
        <h1 className="text-2xl font-bold">Tenho um código de convite</h1>
        <p className="text-tema-texto-suave">
          Digite o código que a organização enviou para você votar como jurado de {tema.rotuloCandidatos.toLocaleLowerCase("pt-BR")}.
          O voto do júri é identificado para a organização.
        </p>
      </div>
      {erroGeral && <Alerta variante="erro">{erroGeral}</Alerta>}
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <CampoCodigoConvite id={`${id}-codigo`} valor={codigo} aoMudar={setCodigo} erro={erroCodigo} autoFocus />
        <Botao type="submit" larguraTotal carregando={enviando}>
          Resgatar convite
        </Botao>
      </form>
    </Cartao>
  );
}
