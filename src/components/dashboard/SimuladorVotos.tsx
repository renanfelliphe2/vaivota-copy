"use client";

import { useEffect, useState } from "react";
import type { Grupo } from "@/dominio/tipos";
import { adicionarVotosSimulados } from "@/store/acoesDashboard";
import { useStore } from "@/store/AppProvider";
import { useUrnaAberta } from "@/store/seletores/resultado";

// Etapa 7 (D12, rev. 3 D15): montado UMA vez no GateEvento. Com `dev.simularVotosEntrando` ligado e a urna
// aberta, cria votos no ritmo de `dev.simuladorVotos`. Limpa os timers ao desmontar; nunca acumula.
// 08/10/2026: um timer por tipo de voto (público, júri, infantil), cada um com quantidade e intervalo próprios.
// 08/10/2026: com várias abas (o telão numa delas), só UMA gera votos, a dona da trava "vaivota-simulador"
// (Web Locks); as outras recebem os votos pela sincronização. A aba que fica visível toma a trava (steal), então
// os votos continuam entrando em qualquer aba à frente, inclusive a do telão. Aba de fundo tem os timers
// atrasados pelo navegador: cada tique repõe os intervalos que passaram, para o ritmo não cair.

const GRUPOS: Grupo[] = ["POPULAR", "JURI", "INFANTIL"];
const TRAVA = "vaivota-simulador";

/** true enquanto esta aba for a que gera os votos. */
function useDonoDoSimulador(ativo: boolean): boolean {
  const [dono, setDono] = useState(false);
  useEffect(() => {
    if (!ativo) return;
    const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
    if (!locks) {
      // Sem Web Locks: esta aba gera (como antes).
      const t = setTimeout(() => setDono(true), 0);
      return () => clearTimeout(t);
    }
    let encerrado = false;
    let soltar: (() => void) | null = null;
    const pedir = (roubar: boolean) => {
      soltar?.();
      locks
        .request(TRAVA, roubar ? { steal: true } : {}, () => {
          if (encerrado) return;
          setDono(true);
          return new Promise<void>((resolve) => {
            soltar = () => {
              soltar = null;
              setDono(false);
              resolve();
            };
          });
        })
        .catch(() => {
          // Outra aba tomou a trava: volta para a fila.
          soltar = null;
          setDono(false);
          if (!encerrado) pedir(false);
        });
    };
    pedir(document.visibilityState === "visible");
    const aoMudar = () => {
      if (document.visibilityState === "visible" && !soltar) pedir(true);
    };
    document.addEventListener("visibilitychange", aoMudar);
    return () => {
      encerrado = true;
      document.removeEventListener("visibilitychange", aoMudar);
      soltar?.();
      setDono(false);
    };
  }, [ativo]);
  return ativo && dono;
}

export function SimuladorVotos({ eventoId }: { eventoId: string }) {
  const ligado = useStore((e) => e.dev.simularVotosEntrando);
  const config = useStore((e) => e.dev.simuladorVotos);
  const urnaAberta = useUrnaAberta(eventoId);
  const dono = useDonoDoSimulador(ligado && urnaAberta);

  useEffect(() => {
    if (!dono) return;
    const timers = GRUPOS.filter((g) => config[g].ligado && config[g].votos > 0).map((g) => {
      const { votos, intervaloMs } = config[g];
      let ultimo = Date.now();
      return setInterval(() => {
        const ciclos = Math.floor((Date.now() - ultimo) / intervaloMs);
        if (ciclos <= 0) return;
        ultimo += ciclos * intervaloMs;
        adicionarVotosSimulados(eventoId, votos * ciclos, g);
      }, intervaloMs);
    });
    return () => timers.forEach(clearInterval);
  }, [dono, eventoId, config]);

  return null;
}
