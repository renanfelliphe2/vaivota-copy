"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { DURACOES } from "@/dominio/apresentacao/duracoes";
import { estadoInicialMotor, reduzirMotor } from "@/dominio/apresentacao/motor";
import { montarRoteiro } from "@/dominio/apresentacao/roteiro";
import type { AcaoMotor, DadosEnsaio, EstadoMotor } from "@/dominio/apresentacao/tipos";
import type { ModoAvanco } from "@/dominio/tipos";
import { formatarContagem } from "@/lib/tempo";
import { useDev } from "@/store/seletores/dev";
import { useEventoAtivo } from "@/store/seletores/evento";
import { CenaAtual, nomeDaCena } from "./CenaAtual";
import { CenaAoVivo } from "./cenas/CenasFase";
import { usePalcoTeclado, useTelaCheia, useTemporizadorDoPasso, useTique } from "./hooks";
import { Palco } from "./Palco";

// Etapa 8 (D5, 5.10): ensaio 100% local. Motor num useReducer, tempo por contador de tiques; nada vai ao
// banco, aos resultados, à auditoria nem a ui.apresentacao. O selo ENSAIO nunca some.

const SEGUNDOS_AO_VIVO = DURACOES.ensaioAoVivo / 1000;

export function PalcoEnsaio({
  dados,
  modoInicial,
  urlQr,
  alternarTelaCheia,
  aoSair,
  aoDesligar,
  iniciarPausado = false,
}: {
  dados: DadosEnsaio;
  modoInicial: ModoAvanco;
  urlQr: string;
  alternarTelaCheia: () => void;
  aoSair: () => void;
  /** "Desligar" do controle remoto. O ensaio é local: ao religar, recomeça do início. */
  aoDesligar: () => void;
  /** "Ligar" do controle remoto: volta pausado. */
  iniciarPausado?: boolean;
}) {
  const ativo = useEventoAtivo()!;
  const dev = useDev();
  const nome = ativo.tema.nomeExibicao ?? ativo.evento.nome;
  const roteiro = useMemo(
    () => montarRoteiro(dados.dados, { classificacaoCompleta: dados.config.classificacaoCompleta, modo: "ENSAIO", candidatosNaDisputa: dados.candidatosNaDisputa }),
    [dados],
  );
  const [estado, despachar] = useReducer((e: EstadoMotor, a: AcaoMotor) => reduzirMotor(e, a, roteiro), modoInicial, (modo) => ({
    ...estadoInicialMotor(modo),
    pausado: iniciarPausado,
  }));
  const [ajuda, setAjuda] = useState(false);
  const [foraDaTelaCheia, setForaDaTelaCheia] = useState(false);
  const cena = roteiro[estado.cena];
  const noAoVivo = cena?.tipo === "AO_VIVO_ENSAIO";
  const tiques = useTique(1000, noAoVivo && !estado.pausado);

  useTemporizadorDoPasso(estado, roteiro, despachar);
  useTelaCheia(() => {
    setForaDaTelaCheia(true);
    despachar({ tipo: "PAUSAR" });
  });
  usePalcoTeclado({
    espaco: () => despachar({ tipo: estado.pausado ? "RETOMAR" : "PAUSAR" }),
    avancar: () => despachar({ tipo: "AVANCAR" }),
    voltar: () => despachar({ tipo: "VOLTAR" }),
    trailer: () => despachar({ tipo: "PULAR_TRAILER" }),
    emergencia: () => despachar({ tipo: "IR_PARA_FINAL" }),
    telaCheia: () => {
      setForaDaTelaCheia(false);
      alternarTelaCheia();
    },
    sair: aoSair,
    ajuda: () => setAjuda((v) => !v),
  });
  useEffect(() => {
    if (!ajuda) return;
    const t = setTimeout(() => setAjuda(false), DURACOES.ajudaVisivel);
    return () => clearTimeout(t);
  }, [ajuda]);

  // Ao vivo simulado: o total sobe do 0 ao total do cenário seguindo a curva de votos.
  const progresso = Math.min(1, tiques / SEGUNDOS_AO_VIVO);
  const curva = dados.votosPorMinutoSimulados;
  const pontos = Math.floor(progresso * curva.length);
  const totalAoVivo = curva.slice(0, pontos).reduce((s, n) => s + n, 0);
  const candidatos = dados.candidatos.filter((c) => !dados.dados.desqualificados.includes(c.id));

  return (
    <Palco
      ensaio
      nomeCena={nomeDaCena(cena)}
      progresso={{ cena: estado.cena + 1, total: roteiro.length }}
      aoDesligar={aoDesligar}
      mensagem={null}
      ajudaVisivel={ajuda}
      avisoPausa={estado.pausado && foraDaTelaCheia}
      controles={{
        pausado: estado.pausado,
        alternarPausa: () => despachar({ tipo: estado.pausado ? "RETOMAR" : "PAUSAR" }),
        voltar: () => despachar({ tipo: "VOLTAR" }),
        avancar: () => despachar({ tipo: "AVANCAR" }),
        emergencia: () => despachar({ tipo: "IR_PARA_FINAL" }),
        reiniciar: () => despachar({ tipo: "REINICIAR" }),
        modoAvanco: estado.modoAvanco,
        alternarModo: () => despachar({ tipo: "DEFINIR_MODO", modo: estado.modoAvanco === "AUTOMATICO" ? "MANUAL" : "AUTOMATICO" }),
      }}
    >
      <CenaAtual
        dados={dados}
        roteiro={roteiro}
        estado={estado}
        despachar={despachar}
        nome={nome}
        logoUrl={ativo.tema.logoUrl}
        dataEvento=""
        simularTrailerFalha={dev.simularTrailerFalha}
        aoVivoEnsaio={
          <CenaAoVivo
            nome={nome}
            logoUrl={ativo.tema.logoUrl}
            candidatos={candidatos}
            urlQr={urlQr}
            contagem={<span>{formatarContagem(Math.max(0, SEGUNDOS_AO_VIVO - tiques) * 1000)}</span>}
            totalGeral={totalAoVivo}
            parcial={null}
            subestado={tiques === 0 ? "ABERTURA" : SEGUNDOS_AO_VIVO - tiques <= 5 ? "RETA_FINAL" : null}
          />
        }
      />
    </Palco>
  );
}
