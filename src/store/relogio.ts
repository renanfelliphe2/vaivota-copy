// Relógio simulado e determinístico (D6). Store próprio: o tique de 1 s não invalida quem lê o banco (D2).
// Único lugar do protótipo que lê o tempo real.

export type Relogio = {
  /** Instante simulado em ms (estável entre tiques, para o useSyncExternalStore). */
  getAgora: () => number;
  getPausado: () => boolean;
  subscribe: (ouvinte: () => void) => () => void;
  /** Recalcula o instante a partir do tempo real; chamado pelo tique do AppProvider. */
  tique: () => void;
  avancar: (ms: number) => void;
  irPara: (ms: number) => void;
  pausar: () => void;
  retomar: () => void;
  /** Volta ao instante inicial (T0). */
  reiniciar: () => void;
};

function agoraReal(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function criarRelogio(inicialMs: number): Relogio {
  let baseSimulada = inicialMs;
  let baseReal = agoraReal();
  let pausado = false;
  let agora = inicialMs;
  const ouvintes = new Set<() => void>();

  const notificar = () => {
    for (const ouvinte of ouvintes) ouvinte();
  };

  const calcular = () => (pausado ? baseSimulada : baseSimulada + Math.floor(agoraReal() - baseReal));

  /** Fixa a base no instante atual (antes de pular ou pausar). */
  const ancorar = () => {
    baseSimulada = calcular();
    baseReal = agoraReal();
  };

  const definir = (ms: number) => {
    baseSimulada = ms;
    baseReal = agoraReal();
    agora = ms;
    notificar();
  };

  return {
    getAgora: () => agora,
    getPausado: () => pausado,
    subscribe(ouvinte) {
      ouvintes.add(ouvinte);
      return () => {
        ouvintes.delete(ouvinte);
      };
    },
    tique() {
      const proximo = calcular();
      if (proximo !== agora) {
        agora = proximo;
        notificar();
      }
    },
    avancar(ms) {
      ancorar();
      definir(baseSimulada + ms);
    },
    irPara(ms) {
      definir(ms);
    },
    pausar() {
      if (pausado) return;
      ancorar();
      pausado = true;
      agora = baseSimulada;
      notificar();
    },
    retomar() {
      if (!pausado) return;
      baseReal = agoraReal();
      pausado = false;
      notificar();
    },
    reiniciar() {
      definir(inicialMs);
    },
  };
}
