"use client";

import { useMemo, type ReactNode } from "react";
import { montarProps } from "@/dominio/apresentacao/roteiro";
import type { AcaoMotor, CandidatoPalco, Cena, DadosRevelacao, EstadoMotor } from "@/dominio/apresentacao/tipos";
import type { Grupo } from "@/dominio/tipos";
import { lugar, TEXTOS_PALCO } from "@/lib/textosPalco";
import { CenaEncerrada } from "./cenas/CenasFase";
import { CenaRevelacao } from "./cenas/CenasRevelacao";
import { CenaTrailer } from "./cenas/CenaTrailer";
import { Cortina } from "./Cinema";

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
  const naDisputa = dados.candidatos.filter((c) => !dados.dados.desqualificados.includes(c.id));

  if (cena.tipo === "AO_VIVO_ENSAIO") return <>{aoVivoEnsaio}</>;
  if (cena.tipo === "ENCERRADA_ENSAIO")
    return (
      <CenaEncerrada
        nome={nome}
        logoUrl={logoUrl}
        candidatos={naDisputa}
        totalGeral={
          dados.dados.totais.POPULAR + (dados.modulos.juri ? dados.dados.totais.JURI : 0) + (dados.modulos.infantil ? dados.dados.totais.INFANTIL : 0)
        }
      />
    );
  if (cena.tipo === "TRAILER") {
    const { config } = dados;
    return (
      <div key={estado.cena} className="relative h-full">
        <CenaTrailer
          estado={estado.trailer}
          linkTrailer={config.trailerUrl}
          forcarGerado={config.usarTrailerGerado || simularTrailerFalha}
          nome={nome}
          logoUrl={logoUrl}
          data={dataEvento}
          candidatos={config.incluirCandidatosTrailer ? naDisputa : []}
          aoPronto={() => despachar({ tipo: "TRAILER_PRONTO" })}
          aoFalhar={() => despachar({ tipo: "TRAILER_FALHOU" })}
        />
        <Cortina />
      </div>
    );
  }
  // 08/10/2026: a chave é só a cena; os passos acontecem sobre a cena montada (CenasRevelacao). Cada cena sai do
  // preto, menos quando o pódio continua (pódio → pódio, pódio → final).
  const anterior = roteiro[estado.cena - 1];
  const continuaPodio = anterior?.tipo === "PODIO" && (cena.tipo === "PODIO" || cena.tipo === "FINAL");
  return (
    <div key={estado.cena} className="relative h-full">
      <CenaRevelacao props={montarProps(dados.dados, cena, estado.passo)} catalogo={catalogo} config={dados.config} candidatos={naDisputa} />
      {!continuaPodio && <Cortina />}
    </div>
  );
}

