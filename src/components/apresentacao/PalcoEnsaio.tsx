"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { MENSAGEM_TOTEM_PADRAO } from "@/dominio/apresentacao/cerimonia";
import { DURACOES } from "@/dominio/apresentacao/duracoes";
import { estadoInicialMotor, reduzirMotor } from "@/dominio/apresentacao/motor";
import { montarRoteiro } from "@/dominio/apresentacao/roteiro";
import type { AcaoMotor, DadosEnsaio, EstadoMotor } from "@/dominio/apresentacao/tipos";
import type { ModoAvanco } from "@/dominio/tipos";
import { formatarContagem } from "@/lib/tempo";
import { useDev } from "@/store/seletores/dev";
import { useEventoAtivo } from "@/store/seletores/evento";
import { CenaAtual, nomeDaCena } from "./CenaAtual";
import { CenaAoVivo } from "./telao/CenasVotacao";
import { creditosDosParceiros } from "./telao/creditos";
import { usePalcoTeclado, useTemporizadorDoPasso, useTique } from "./hooks";
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
    () => montarRoteiro(dados, { modo: "ENSAIO" }),
    [dados],
  );
  const [estado, despachar] = useReducer((e: EstadoMotor, a: AcaoMotor) => reduzirMotor(e, a, roteiro), modoInicial, (modo) => ({
    ...estadoInicialMotor(modo),
    pausado: iniciarPausado,
  }));
  const [ajuda, setAjuda] = useState(false);
  const cena = roteiro[estado.cena];
  const noAoVivo = cena?.tipo === "AO_VIVO_ENSAIO";
  const tiques = useTique(1000, noAoVivo && !estado.pausado);

  const proximoAvancoEm = useTemporizadorDoPasso(estado, roteiro, despachar);
  usePalcoTeclado({
    espaco: () => despachar({ tipo: estado.pausado ? "RETOMAR" : "PAUSAR" }),
    avancar: () => despachar({ tipo: "AVANCAR" }),
    voltar: () => despachar({ tipo: "VOLTAR" }),
    trailer: () => despachar({ tipo: "PULAR_TRAILER" }),
    emergencia: () => despachar({ tipo: "IR_PARA_FINAL" }),
    telaCheia: alternarTelaCheia,
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
  const naDisputa = dados.candidatos.filter((c) => !dados.dados.desqualificados.includes(c.id));
  // O ao vivo simulado mostra a primeira categoria com itens (como o telão faz no começo do ciclo).
  const primeira = dados.categorias.find((c) => naDisputa.some((x) => x.categoriaId === c.id)) ?? null;
  const candidatos = primeira ? naDisputa.filter((c) => c.categoriaId === primeira.id) : naDisputa;
  const categoriaCompleta = primeira ? ativo.categorias.find((c) => c.id === primeira.id) : undefined;
  const categoriaEnsaio = primeira
    ? {
        nome: primeira.nome,
        premio: primeira.premio,
        soTotem: primeira.canal === "TOTEM",
        mensagem: categoriaCompleta?.mensagemTelao ?? MENSAGEM_TOTEM_PADRAO,
        posicao: null,
      }
    : null;

  return (
    <Palco
      ensaio
      nomeCena={nomeDaCena(cena, dados.categorias)}
      progresso={{ cena: estado.cena + 1, total: roteiro.length }}
      proximoAvancoEm={proximoAvancoEm}
      aoDesligar={aoDesligar}
      chaveTransicao={cena?.tipo === "TRAILER" ? "trailer" : "cena"}
      mensagem={null}
      ajudaVisivel={ajuda}
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
        rotuloCandidatos={ativo.tema.rotuloCandidatos}
        creditos={creditosDosParceiros(ativo.parceiros, ativo.gruposParceiros)}
        simularTrailerFalha={dev.simularTrailerFalha}
        aoVivoEnsaio={
          <CenaAoVivo
            nome={nome}
            logoUrl={ativo.tema.logoUrl}
            rotuloCandidato={ativo.tema.rotuloCandidato}
            candidatos={candidatos}
            urlQr={urlQr}
            contagem={<span>{formatarContagem(Math.max(0, SEGUNDOS_AO_VIVO - tiques) * 1000)}</span>}
            fimTexto={null}
            totalGeral={totalAoVivo}
            subestado={tiques === 0 ? "ABERTURA" : SEGUNDOS_AO_VIVO - tiques <= 5 ? "RETA_FINAL" : null}
            intervaloSegundos={ativo.configApresentacao.telaoIntervaloSegundos}
            mostrar={ativo.configApresentacao.telaoMostrar}
            categoria={categoriaEnsaio}
          />
        }
      />
    </Palco>
  );
}
