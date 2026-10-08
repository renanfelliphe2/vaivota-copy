"use client";

import { useMemo, type ReactNode } from "react";
import { montarProps } from "@/dominio/apresentacao/roteiro";
import { interpretarLinkTrailer } from "@/dominio/apresentacao/trailer";
import type { AcaoMotor, CandidatoPalco, Cena, DadosRevelacao, EstadoMotor } from "@/dominio/apresentacao/tipos";
import type { Grupo } from "@/dominio/tipos";
import { lugar, TEXTOS_PALCO } from "@/lib/textosPalco";
import { CenaEncerrada } from "./cenas/CenasFase";
import { CenaRevelacao } from "./cenas/CenasRevelacao";
import { CenaTrailer } from "./cenas/CenaTrailer";

// Etapa 8 (D1): desenha só a cena e o passo atuais a partir de montarProps. O ao vivo do ensaio vem pronto
// do PalcoEnsaio (slot `aoVivoEnsaio`).

const NOME_GRUPO: Record<Grupo, string> = { POPULAR: "do público", JURI: "do júri", INFANTIL: "infantil" };

/** Nome da cena (HUD e LiveRegion): nunca revela vencedores nem pontuações. */
export function nomeDaCena(cena: Cena | undefined): string {
  if (!cena) return "";
  switch (cena.tipo) {
    case "AO_VIVO_ENSAIO":
      return "Votação ao vivo (ensaio)";
    case "ENCERRADA_ENSAIO":
      return TEXTOS_PALCO.votacaoEncerrada;
    case "TRAILER":
      return "Trailer";
    case "CATEGORIA":
      return `Categoria ${NOME_GRUPO[cena.grupo]}`;
    case "DESEMPATE":
      return "Desempate";
    case "PODIO":
      return `Pódio, ${lugar(cena.posicao)}`;
    case "CLASSIFICACAO":
      return "Classificação completa";
    case "FINAL":
      return "Resultado final";
  }
}

export function useCatalogo(candidatos: CandidatoPalco[]) {
  return useMemo(() => {
    const mapa = new Map(candidatos.map((c) => [c.id, c]));
    return (id: string): CandidatoPalco => mapa.get(id) ?? { id, titulo: id, imagemUrl: null, ordem: 0 };
  }, [candidatos]);
}

export function CenaAtual({
  dados,
  roteiro,
  estado,
  despachar,
  nome,
  logoUrl,
  dataEvento,
  simularTrailerFalha,
  aoVivoEnsaio,
}: {
  dados: DadosRevelacao;
  roteiro: Cena[];
  estado: EstadoMotor;
  despachar: (a: AcaoMotor) => void;
  nome: string;
  logoUrl: string | null;
  dataEvento: string;
  simularTrailerFalha: boolean;
  aoVivoEnsaio?: ReactNode;
}) {
  const catalogo = useCatalogo(dados.candidatos);
  const cena = roteiro[estado.cena];
  if (!cena) return null;
  const chave = `${estado.cena}:${estado.passo}`;

  if (cena.tipo === "AO_VIVO_ENSAIO") return <>{aoVivoEnsaio}</>;
  if (cena.tipo === "ENCERRADA_ENSAIO")
    return <CenaEncerrada nome={nome} logoUrl={logoUrl} candidatos={dados.candidatos.filter((c) => !dados.dados.desqualificados.includes(c.id))} />;
  if (cena.tipo === "TRAILER") {
    const { config } = dados;
    return (
      <CenaTrailer
        key={estado.cena}
        estado={estado.trailer}
        embedUrl={interpretarLinkTrailer(config.trailerUrl)}
        forcarGerado={config.usarTrailerGerado || simularTrailerFalha}
        nome={nome}
        logoUrl={logoUrl}
        data={dataEvento}
        candidatos={config.incluirCandidatosTrailer ? dados.candidatos.filter((c) => !dados.dados.desqualificados.includes(c.id)) : []}
        aoPronto={() => despachar({ tipo: "TRAILER_PRONTO" })}
        aoFalhar={() => despachar({ tipo: "TRAILER_FALHOU" })}
      />
    );
  }
  return (
    <div key={chave} className="palco-entrada h-full">
      <CenaRevelacao props={montarProps(dados.dados, cena, estado.passo)} catalogo={catalogo} config={dados.config} />
    </div>
  );
}

