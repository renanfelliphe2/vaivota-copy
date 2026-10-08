"use client";

import { ArrowLeft, ChartColumn, Gavel, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { EstadoVotar } from "@/dominio/estadoVotar";
import { UrnaStatusCard } from "@/components/evento/UrnaStatusCard";
import { Botao } from "@/components/ui/Botao";
import { Cartao } from "@/components/ui/Cartao";
import { Selo } from "@/components/ui/Selo";
import { textoDoEstado } from "@/lib/textosEstado";
import { useEventoAtivo } from "@/store/seletores/evento";

/**
 * Telas de estado da gate de /votar (Etapa 4, seção 5.2). Textos por textoDoEstado; nenhuma lista.
 * `JA_VOTOU` tem tela própria (TelaJaVotou, Etapa 5) e ACESSO_PENDENTE só mostra Carregando.
 */
export function TelaEstadoVotar({ estado, aviso }: { estado: EstadoVotar; aviso?: ReactNode }) {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  const base = `/e/${ativo.slug}`;

  let conteudo: ReactNode;
  if (estado.tela === "ADMIN_NAO_VOTA") {
    const texto = textoDoEstado("ADMIN_NAO_VOTA", ativo.tema);
    conteudo = (
      <Cartao role="status" className="flex flex-col gap-3">
        <Selo variante="info" icone={ShieldCheck}>
          Administração
        </Selo>
        <h1 className="text-xl font-bold">{texto.titulo}</h1>
        <p className="text-tema-texto-suave">{texto.corpo}</p>
      </Cartao>
    );
  } else if (estado.tela === "JURI_DESLIGADO") {
    conteudo = (
      <Cartao role="status" className="flex flex-col gap-3">
        <Selo variante="aviso" icone={Gavel}>
          Júri inativo
        </Selo>
        <h1 className="text-xl font-bold">A votação do júri não está ativa neste evento.</h1>
      </Cartao>
    );
  } else {
    conteudo = <UrnaStatusCard visao={estado.visao} tituloComoH1 />;
  }

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-10 sm:px-6">
      {aviso}
      {conteudo}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Botao href={base} variante="contorno" icone={<ArrowLeft aria-hidden className="size-4" />}>
          Voltar ao evento
        </Botao>
        {estado.tela === "ADMIN_NAO_VOTA" && (
          <Botao href={`${base}/admin`} icone={<ChartColumn aria-hidden className="size-4" />}>
            Ir para o painel
          </Botao>
        )}
      </div>
    </section>
  );
}
