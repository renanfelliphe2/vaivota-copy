"use client";

import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { cx } from "@/lib/classes";
import { ProvedorPapel, usePapelNaPassagem, type PapelNaPassagem } from "../Cinema";
import { useMovimentoReduzido } from "../hooks";

// Telão (25/11/2026): as transições entre as telas são cortes de cinema, cada um com um sentido na cerimônia (telao.css, "Cortes"):
// - PUXADA: o quadro é puxado para cima, com a linha entre os fotogramas e o tranco da garra no fim (mesma categoria);
// - QUEIMA: a película queima no projetor e a cena nova esfria do branco (troca de capítulo: trailer, outra categoria);
// - CASADO: o cartaz do vencedor sai do quadro e vai para o lugar dele no resultado, com as luzes da sala acendendo;
// - TRANCO: o projetor engasga e o quadro salta (desempate);
// - IRIS: a íris fecha no preto e abre na cena nova (o final);
// - APAGAR: a lâmpada do projetor falha e apaga; a nova aquece do escuro (fim da votação);
// - PRETO: escurece até o preto com a nova já montada por baixo (o trailer começa a tocar no escuro);
// - VOLTA: a puxada ao contrário (o operador voltou uma tela);
// - FOCO: o foco desliza de uma cena para a outra (categorias do ao vivo, páginas do final);
// - VIRAR: o ingresso vira (categoria online ↔ totem);
// - FUSAO: fusão curta (voltas entre capítulos e casos sem corte próprio).
// A cena que sai continua montada até o corte terminar (o vídeo do trailer segue tocando e baixa o som pelo papel SAINDO). As
// camadas têm chave e ordem fixas: a que fica nunca muda de lugar no DOM (mover um iframe o recarrega). Sem movimento
// (prefers-reduced-motion), corte seco.

export type Corte = "PUXADA" | "VOLTA" | "QUEIMA" | "CASADO" | "TRANCO" | "IRIS" | "APAGAR" | "PRETO" | "FOCO" | "VIRAR" | "FUSAO";

/**
 * `duracao`: quanto a cena que sai fica montada (o mesmo das animações em telao.css). `entrada`: quando as animações de entrada
 * da cena nova começam (--tc-entrada), para elas não acontecerem escondidas atrás do corte.
 */
export const CORTES: Record<Corte, { duracao: number; entrada: number }> = {
  PUXADA: { duracao: 1150, entrada: 750 },
  VOLTA: { duracao: 900, entrada: 550 },
  QUEIMA: { duracao: 1800, entrada: 950 },
  CASADO: { duracao: 1500, entrada: 800 },
  TRANCO: { duracao: 800, entrada: 350 },
  IRIS: { duracao: 1800, entrada: 1150 },
  APAGAR: { duracao: 1700, entrada: 1350 },
  PRETO: { duracao: 900, entrada: 900 },
  FOCO: { duracao: 1100, entrada: 450 },
  VIRAR: { duracao: 900, entrada: 500 },
  FUSAO: { duracao: 550, entrada: 250 },
};

/**
 * Depois do início da entrada, por quanto tempo o atraso ainda vale: as cascatas de entrada terminam antes disso, e o vencedor
 * revelado (depois da contagem, DURACOES.contagem) já surge sem ele.
 */
const FOLGA_ENTRADA_MS = 3000;

type EntradaDaCena = { corte: Corte | null; entrada: number };

const TransicaoContext = createContext<EntradaDaCena>({ corte: null, entrada: 0 });

/** Por qual corte a cena entrou e quando as animações dela começam (fixo desde a montagem). */
export function useEntradaDaCena(): EntradaDaCena {
  const atual = useContext(TransicaoContext);
  const [naMontagem] = useState(atual);
  return naMontagem;
}

type Camada<M> = { chave: string; meta: M; conteudo: ReactNode; corte: Corte | null; entrada: number };

export function Transicao<M>({
  chave,
  meta,
  escolher,
  className,
  classeCamada,
  children,
}: {
  /** Quando muda, a cena atual sai pelo corte que `escolher` devolver (null: corte seco). */
  chave: string;
  /** O que `escolher` precisa saber de cada cena (guardado junto com ela). */
  meta: M;
  escolher: (de: M, para: M) => Corte | null;
  className?: string;
  classeCamada?: string;
  children: ReactNode;
}) {
  const reduzido = useMovimentoReduzido();
  const papelExterno = usePapelNaPassagem();
  const externo = useContext(TransicaoContext);
  const [atual, setAtual] = useState<Camada<M>>({ chave, meta, conteudo: children, corte: null, entrada: 0 });
  const [saida, setSaida] = useState<{ camada: Camada<M>; corte: Corte } | null>(null);

  // Estado derivado no render: guarda o último conteúdo de cada chave, para a cena que sai continuar a mesma.
  if (chave !== atual.chave) {
    const corte = reduzido ? null : escolher(atual.meta, meta);
    // Voltar à chave que ainda está saindo (cliques rápidos): corte seco, sem duas camadas com a mesma chave.
    const valido = corte !== null && saida?.camada.chave !== chave;
    setSaida(valido ? { camada: atual, corte } : null);
    setAtual({ chave, meta, conteudo: children, corte: valido ? corte : null, entrada: valido ? CORTES[corte].entrada : 0 });
  } else if (children !== atual.conteudo || meta !== atual.meta) {
    setAtual({ ...atual, conteudo: children, meta });
  }

  useEffect(() => {
    if (!saida) return;
    const t = setTimeout(() => setSaida(null), CORTES[saida.corte].duracao);
    return () => clearTimeout(t);
  }, [saida]);

  // O atraso de entrada sai quando as entradas já terminaram: elementos que surgirem depois (o vencedor revelado) não esperam.
  const chaveAtual = atual.chave;
  const corteAtual = atual.corte;
  useEffect(() => {
    if (!corteAtual) return;
    const t = setTimeout(() => setAtual((a) => (a.chave === chaveAtual ? { ...a, entrada: 0 } : a)), CORTES[corteAtual].entrada + FOLGA_ENTRADA_MS);
    return () => clearTimeout(t);
  }, [chaveAtual, corteAtual]);

  const nome = saida?.corte.toLowerCase();
  const camadas: (Camada<M> & { papel: PapelNaPassagem })[] = [
    ...(saida ? [{ ...saida.camada, papel: "SAINDO" as const }] : []),
    { ...atual, conteudo: children, papel: saida ? ("ENTRANDO" as const) : ("EM_CENA" as const) },
  ];
  return (
    <div className={cx("tc-transicao relative grid size-full", className)} data-corte={nome}>
      {camadas.map((c) => {
        const papel = papelExterno !== "EM_CENA" ? papelExterno : c.papel;
        const entrada = c.entrada || (c.papel === "SAINDO" ? 0 : externo.entrada);
        return (
          <div
            key={c.chave}
            className={cx("tc-camada", classeCamada, saida && `tc-${nome}-${c.papel === "SAINDO" ? "sai" : "entra"}`)}
            style={c.entrada ? ({ "--tc-entrada": `${c.entrada}ms` } as CSSProperties) : undefined}
          >
            <TransicaoContext.Provider value={{ corte: c.corte ?? (c.papel === "SAINDO" ? null : externo.corte), entrada }}>
              <ProvedorPapel value={papel}>{c.conteudo}</ProvedorPapel>
            </TransicaoContext.Provider>
          </div>
        );
      })}
      {saida && <EfeitoDoCorte key={`${saida.camada.chave}>${atual.chave}`} corte={saida.corte} />}
    </div>
  );
}

/** O que passa por cima das duas cenas durante o corte (a película queimando). */
function EfeitoDoCorte({ corte }: { corte: Corte }) {
  if (corte === "QUEIMA")
    return (
      <div aria-hidden className="tc-queima">
        {[
          { left: "64%", top: "36%", tam: 760, atraso: 0 },
          { left: "28%", top: "68%", tam: 640, atraso: 140 },
          { left: "86%", top: "86%", tam: 520, atraso: 260 },
          { left: "12%", top: "14%", tam: 460, atraso: 330 },
        ].map((m) => (
          <span key={m.left} className="tc-queima-mancha" style={{ left: m.left, top: m.top, width: m.tam, height: m.tam, animationDelay: `${m.atraso}ms` }} />
        ))}
      </div>
    );
  return null;
}
