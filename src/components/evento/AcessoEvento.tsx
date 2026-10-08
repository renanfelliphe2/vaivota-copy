"use client";

import { ArrowRight, ChartColumn, Gavel, MailCheck, Settings, Vote } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { SaidaVisao } from "@/dominio/visaoEvento";
import { CartaoAcesso } from "@/components/auth/CartaoAcesso";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Cartao } from "@/components/ui/Cartao";
import { rotaVerificarEmail } from "@/dominio/destinoAcesso";
import { garantirParticipacao } from "@/servicos/auth";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSessao } from "@/store/seletores/sessao";

/**
 * C2: com sessão e sem participação no evento ativo, cria PUBLICO ao montar (quem já está logado e
 * chega a outro evento). Montado uma vez no EventoShell.
 */
export function GarantiaParticipacao() {
  const ativo = useEventoAtivo();
  const sessao = useSessao();
  const emAndamento = useRef<string | null>(null);
  const eventoId = ativo?.evento.id;
  const usuarioId = sessao.usuario?.id;
  const precisa = Boolean(eventoId && usuarioId && !sessao.participacao);

  useEffect(() => {
    if (!precisa || !eventoId || !usuarioId) return;
    const chave = `${usuarioId}:${eventoId}`;
    if (emAndamento.current === chave) return;
    emAndamento.current = chave;
    void garantirParticipacao(eventoId).finally(() => {
      if (emAndamento.current === chave) emAndamento.current = null;
    });
  }, [precisa, eventoId, usuarioId]);

  return null;
}

/** Slot #acesso da entrada (Etapa 2, preenchido pela Etapa 3): a ação vem de resolverVisaoEvento. */
export function AcessoEvento({ visao, de }: { visao: SaidaVisao; de?: string }) {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  const base = `/e/${ativo.slug}`;
  const slug = ativo.slug;

  let conteudo: React.ReactNode = null;
  switch (visao.acao) {
    case "ENTRAR_OU_CRIAR":
      conteudo = (
        <Cartao>
          <h2 className="mb-4 text-lg font-bold">Entre para participar</h2>
          <CartaoAcesso de={de} />
        </Cartao>
      );
      break;
    case "VERIFICAR_EMAIL":
      conteudo = (
        <Cartao className="flex flex-col items-start gap-3">
          <p>Confirme seu e-mail com o código que enviamos para continuar.</p>
          <Botao href={rotaVerificarEmail(slug, de)} icone={<MailCheck aria-hidden className="size-4" />}>
            Verificar e-mail
          </Botao>
        </Cartao>
      );
      break;
    case "VOTAR":
      conteudo = (
        <Botao href={`${base}/votar`} tamanho="grande" larguraTotal icone={<Vote aria-hidden className="size-5" />}>
          Votar agora
        </Botao>
      );
      break;
    case "VOTAR_JURADO":
      conteudo = (
        <Botao href={`${base}/votar`} tamanho="grande" larguraTotal icone={<Gavel aria-hidden className="size-5" />}>
          Votar como jurado
        </Botao>
      );
      break;
    case "ALTERAR_VOTO_JURADO":
      conteudo = (
        <div className="flex flex-col gap-2">
          <Botao href={`${base}/votar`} tamanho="grande" larguraTotal variante="contorno" icone={<Gavel aria-hidden className="size-5" />}>
            Alterar meu voto
          </Botao>
          <p className="text-center text-sm text-tema-texto-suave">Você pode alterar seu voto até o encerramento da votação.</p>
        </div>
      );
      break;
    case "VER_CONFIRMACAO":
      conteudo = (
        <Botao href={`${base}/votar`} tamanho="grande" larguraTotal variante="contorno" icone={<ArrowRight aria-hidden className="size-5" />}>
          Ver confirmação
        </Botao>
      );
      break;
    case "PAINEL_ADMIN":
      conteudo = (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Botao href={`${base}/admin`} tamanho="grande" icone={<ChartColumn aria-hidden className="size-5" />}>
            Ir para o painel
          </Botao>
          <Botao href={`${base}/admin/configuracao`} tamanho="grande" variante="contorno" icone={<Settings aria-hidden className="size-5" />}>
            Configuração
          </Botao>
        </div>
      );
      break;
    case "NENHUMA":
      break;
  }

  return (
    <section id="acesso" aria-label="Acesso" className="flex scroll-mt-4 flex-col gap-4">
      {visao.avisoJuriDesligado && (
        <Alerta variante="aviso">A votação do júri não está ativa neste evento.</Alerta>
      )}
      {conteudo}
      {visao.mostrarCodigoConvite && (
        <p className="text-center">
          <Link
            href={`${base}/convite`}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-tema-primaria-texto underline underline-offset-4 hover:no-underline"
          >
            <Gavel aria-hidden className="size-4" />
            Tenho um código de convite
          </Link>
        </p>
      )}
      {visao.acao === "NENHUMA" && visao.variante === "NAO_INICIADA" && (
        <p className="text-center text-sm text-tema-texto-suave">Volte aqui quando a votação abrir.</p>
      )}
    </section>
  );
}
