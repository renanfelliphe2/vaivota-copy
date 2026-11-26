"use client";

import { Menu, WifiOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TEXTOS_TOTEM } from "@/lib/textosTotem";
import { definirQuiosqueAtivo } from "@/store/acoesTotem";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useVisaoTotem } from "@/store/seletores/totem";
import { recarregarEstado } from "@/store/servidor";
import { AnaliseTotem } from "./AnaliseTotem";
import { DialogoPinTotem } from "./DialogoPinTotem";
import { FluxoTotem } from "./FluxoTotem";
import { MenuTotem } from "./MenuTotem";
import { AvisoTotem, LogoTotem, MolduraTotem } from "./MolduraTotem";
import { TotemBloqueado } from "./TotemBloqueado";
import { useDispositivoDoTotem } from "./useDispositivoDoTotem";
import { useSinalTotem } from "./useSinalTotem";

// Totem (Base/VotoInfantil.md §6): modo quiosque. Sem login: a identidade é o aparelho pareado (token no cookie do tablet).
// Tela cheia no primeiro toque, sem seleção de texto, sem menu de contexto; o menu (Analisar votos, Encerrar sessão, Sair) só
// com o PIN (logTotem.md).
// Fora de VOTANDO mostra uma tela neutra; o fluxo desmonta e volta ao início quando a situação muda.
// O estado do aparelho (ativo, pausado, revogado) vem do servidor a cada poucos segundos e a cada voto recusado.
// 26/11/2026: refeito no estilo cinema do Festival, claro (MolduraTotem), e tudo cabe na tela sem rolagem.

export function TelaTotem() {
  const ativoDoEvento = useEventoAtivo();
  const aparelho = useDispositivoDoTotem(ativoDoEvento?.evento.id ?? null);
  const visao = useVisaoTotem(aparelho.dispositivo);
  const router = useRouter();
  const raiz = useRef<HTMLDivElement>(null);
  const [pinAberto, setPinAberto] = useState(false);
  // Menu do PIN (logTotem.md): o PIN conferido abre o menu; a análise usa o mesmo PIN enquanto está aberta.
  const [pinDoMenu, setPinDoMenu] = useState<string | null>(null);
  const [pinDaAnalise, setPinDaAnalise] = useState<string | null>(null);

  // Relatório para a página Totens do admin (ao abrir, a cada hora e quando o admin pede). Só com o aparelho pareado e respondendo.
  useSinalTotem({
    pareado: visao?.dispositivo != null && !aparelho.semConexao,
    situacao: visao?.situacao ?? "NAO_PAREADO",
    sincronizar: aparelho.sincronizar,
    respostaEm: aparelho.respostaEm,
  });

  // A toolbar some em AUTO enquanto o quiosque está montado (Alt+D traz de volta).
  useEffect(() => {
    definirQuiosqueAtivo(true);
    return () => definirQuiosqueAtivo(false);
  }, []);

  if (!visao) return null;
  const { ativo, dispositivo, candidatos, grupos, situacao } = visao;
  const { tema, evento } = ativo;
  const nome = tema.nomeExibicao ?? evento.nome;

  function pedirTelaCheia() {
    const el = raiz.current;
    if (!el?.requestFullscreen || document.fullscreenElement) return;
    // Sem tela cheia o quiosque segue em janela (navegador sem suporte ou gesto recusado).
    el.requestFullscreen().catch(() => {});
  }

  function sair() {
    setPinAberto(false);
    if (document.fullscreenElement) void document.exitFullscreen();
    router.push(`/e/${ativo.slug}`);
  }

  /** Voto recusado ou sem rede: confere de novo o aparelho e o evento, para a tela virar a neutra certa sem esperar o polling. */
  function atualizar() {
    aparelho.recarregar();
    void recarregarEstado();
  }

  const logo = <LogoTotem nome={nome} logoUrl={tema.logoUrl} prioridade />;

  return (
    <MolduraTotem ref={raiz} onContextMenu={(e) => e.preventDefault()} className="fixed inset-0 z-40">
      <button
        type="button"
        onClick={() => (dispositivo ? setPinAberto(true) : sair())}
        aria-label={TEXTOS_TOTEM.menu}
        title={TEXTOS_TOTEM.menu}
        className="absolute right-2 top-2 z-10 inline-flex size-11 items-center justify-center rounded-full text-tema-texto-suave opacity-40 hover:bg-tema-fundo hover:opacity-100 focus-visible:opacity-100"
      >
        <Menu aria-hidden className="size-5" />
      </button>

      {/* Nunca rola de lado (2ª sessão, 26/11/2026: aparecia uma barra horizontal na escolha). */}
      <main id="conteudo" className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        {aparelho.carregando ? (
          <p role="status" className="m-auto font-cine text-[clamp(1.25rem,4cqmin,2.25rem)] font-bold text-tema-texto-suave">
            {TEXTOS_TOTEM.carregando}
          </p>
        ) : aparelho.semConexao ? (
          <AvisoTotem
            logo={logo}
            papel="alert"
            icone={<WifiOff aria-hidden strokeWidth={1.75} />}
            titulo={TEXTOS_TOTEM.semConexaoTitulo}
            corpo={TEXTOS_TOTEM.semConexaoCorpo}
          />
        ) : situacao === "VOTANDO" ? (
          <FluxoTotem
            eventoId={evento.id}
            candidatos={candidatos}
            grupos={grupos}
            logo={logo}
            logoPequeno={<LogoTotem nome={nome} logoUrl={tema.logoUrl} pequeno />}
            aoComecar={pedirTelaCheia}
            aoFalhar={atualizar}
          />
        ) : (
          <TotemBloqueado situacao={situacao} rotuloCandidatos={tema.rotuloCandidatos} logo={logo}>
            {situacao === "NAO_PAREADO" && (
              <Link
                href={`/e/${ativo.slug}/totem/parear`}
                className="mt-[2cqh] inline-flex min-h-14 items-center rounded-full border-4 border-tema-texto-suave bg-tema-fundo px-8 text-[clamp(1.1rem,3cqmin,1.5rem)] font-bold"
              >
                {TEXTOS_TOTEM.parearAparelho}
              </Link>
            )}
          </TotemBloqueado>
        )}
      </main>

      {dispositivo && (
        <p aria-hidden className="pointer-events-none absolute bottom-1 left-3 text-xs text-tema-texto-suave opacity-60">
          {dispositivo.nome}
        </p>
      )}

      <DialogoPinTotem
        aberto={pinAberto}
        pareado={dispositivo !== null}
        aoFechar={() => setPinAberto(false)}
        aoConfirmar={(pin) => {
          setPinAberto(false);
          if (dispositivo === null) return sair();
          setPinDoMenu(pin);
        }}
      />
      <MenuTotem
        pin={pinDoMenu}
        aoFechar={() => setPinDoMenu(null)}
        aoAnalisar={() => setPinDaAnalise(pinDoMenu)}
        aoSair={sair}
      />
      {/* Dentro da moldura: em tela cheia, só o que está dentro dela aparece. */}
      {pinDaAnalise !== null && <AnaliseTotem pin={pinDaAnalise} aoVoltar={() => setPinDaAnalise(null)} />}
    </MolduraTotem>
  );
}
