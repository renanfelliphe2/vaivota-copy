"use client";

import { useMemo, type ReactNode } from "react";
import { ORIGEM_TROFEU } from "@/dominio/apresentacao/cerimonia";
import { montarProps } from "@/dominio/apresentacao/roteiro";
import type { AcaoMotor, CandidatoPalco, CategoriaPalco, Cena, DadosRevelacao, EstadoMotor } from "@/dominio/apresentacao/tipos";
import { TEXTOS_PALCO } from "@/lib/textosPalco";
import { CenaTrailer } from "./cenas/CenaTrailer";
import { CenaDesempate, CenaFinal, CenaResultado, CenaVencedor, type ContextoCerimonia, type CreditosParceiros } from "./telao/CenasCerimonia";
import { CenaEncerrada } from "./telao/CenasVotacao";

// Etapa 8 (D1) e cerimônia (25/11/2026): desenha só a cena e o passo atuais a partir de montarProps. O ao vivo do ensaio vem
// pronto do PalcoEnsaio (slot `aoVivoEnsaio`).

/** Nome da cena (controle remoto e LiveRegion): nunca revela vencedores nem pontuações. */
export function nomeDaCena(cena: Cena | undefined, categorias: readonly Pick<CategoriaPalco, "id" | "nome">[] = []): string {
  if (!cena) return "";
  const nomeCategoria = (id: string | null) => (id ? (categorias.find((c) => c.id === id)?.nome ?? "") : "");
  const com = (texto: string, id: string | null) => (nomeCategoria(id) ? `${texto} · ${nomeCategoria(id)}` : texto);
  switch (cena.tipo) {
    case "AO_VIVO_ENSAIO":
      return "Votação ao vivo (ensaio)";
    case "ENCERRADA_ENSAIO":
      return TEXTOS_PALCO.votacaoEncerrada;
    case "TRAILER":
      return "Trailer";
    case "TROFEU":
      return com(`Troféu da ${ORIGEM_TROFEU[cena.grupo]}`, cena.categoriaId);
    case "POSICAO":
      return com(`${cena.posicao}º lugar`, cena.categoriaId);
    case "DESEMPATE":
      return com("Desempate", cena.categoriaId);
    case "RESULTADO":
      return com("Resultado", cena.categoriaId);
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

/** O catálogo e a categoria de cada item, para as cenas da cerimônia. */
export function useContextoCerimonia(candidatos: CandidatoPalco[], categorias: readonly CategoriaPalco[]): ContextoCerimonia {
  const catalogo = useCatalogo(candidatos);
  return useMemo(
    () => ({ catalogo, categoriaDoItem: (id: string) => categorias.find((c) => c.id === catalogo(id).categoriaId) ?? null }),
    [catalogo, categorias],
  );
}

export function CenaAtual({
  dados,
  roteiro,
  estado,
  despachar,
  nome,
  logoUrl,
  dataEvento,
  rotuloCandidatos,
  creditos,
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
  rotuloCandidatos: string;
  creditos: CreditosParceiros;
  simularTrailerFalha: boolean;
  aoVivoEnsaio?: ReactNode;
}) {
  const ctx = useContextoCerimonia(dados.candidatos, dados.categorias);
  const cena = roteiro[estado.cena];
  if (!cena) return null;
  const naDisputa = dados.candidatos.filter((c) => !dados.dados.desqualificados.includes(c.id));

  if (cena.tipo === "AO_VIVO_ENSAIO") return <>{aoVivoEnsaio}</>;
  if (cena.tipo === "ENCERRADA_ENSAIO")
    return (
      <CenaEncerrada
        nome={nome}
        logoUrl={logoUrl}
        totalGeral={dados.dados.totais.POPULAR + (dados.modulos.juri ? dados.dados.totais.JURI : 0) + (dados.modulos.infantil ? dados.dados.totais.INFANTIL : 0)}
        itens={naDisputa.length}
        categorias={dados.categorias.length}
        rotuloCandidatos={rotuloCandidatos}
      />
    );
  if (cena.tipo === "TRAILER") {
    const { config } = dados;
    return (
      <div key={estado.cena} className="relative h-full">
        <CenaTrailer
          estado={estado.trailer}
          passo={estado.passo}
          linkTrailer={config.trailerUrl}
          forcarGerado={config.usarTrailerGerado || simularTrailerFalha}
          nome={nome}
          logoUrl={logoUrl}
          data={dataEvento}
          candidatos={config.incluirCandidatosTrailer ? naDisputa : []}
          aoPronto={() => despachar({ tipo: "TRAILER_PRONTO" })}
          aoFalhar={() => despachar({ tipo: "TRAILER_FALHOU" })}
        />
      </div>
    );
  }
  // A chave é a cena: os passos (contagem → vencedor) acontecem sobre a cena montada.
  const props = montarProps(dados, roteiro, estado.cena, estado.passo);
  let conteudo: ReactNode = null;
  if (props.tipo === "TROFEU" || props.tipo === "POSICAO") conteudo = <CenaVencedor props={props} ctx={ctx} />;
  else if (props.tipo === "DESEMPATE") conteudo = <CenaDesempate props={props} ctx={ctx} />;
  else if (props.tipo === "RESULTADO") conteudo = <CenaResultado resultado={props} ctx={ctx} nome={nome} logoUrl={logoUrl} creditos={creditos} />;
  else if (props.tipo === "FINAL") conteudo = <CenaFinal resultados={props.resultados} ctx={ctx} nome={nome} logoUrl={logoUrl} creditos={creditos} />;
  return (
    <div key={estado.cena} className="relative h-full">
      {conteudo}
    </div>
  );
}
