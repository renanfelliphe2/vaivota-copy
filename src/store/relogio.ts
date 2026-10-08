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
  /** Instante exato agora (sem esperar o tique) e se está pausado: o que outra aba precisa para se alinhar. */
  foto: () => FotoRelogio;
  /** Alinha com a foto de outra aba. Não avisa os ouvintes de salto (não ecoa de volta). */
  sincronizar: (foto: FotoRelogio) => void;
  /** Avisado só nos saltos (avançar, ir para, pausar, retomar, reiniciar), nunca no tique. */
  subscribeSalto: (ouvinte: () => void) => () => void;
};

export type FotoRelogio = { agora: number; pausado: boolean };

function agoraReal(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function criarRelogio(inicialMs: number): Relogio {
  let baseSimulada = inicialMs;
  let baseReal = agoraReal();
  let pausado = false;
  let agora = inicialMs;
  const ouvintes = new Set<() => void>();
  const ouvintesSalto = new Set<() => void>();

  const notificar = () => {
    for (const ouvinte of ouvintes) ouvinte();
  };
  const saltou = () => {
    for (const ouvinte of ouvintesSalto) ouvinte();
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
      saltou();
    },
    irPara(ms) {
      definir(ms);
      saltou();
    },
    pausar() {
      if (pausado) return;
      ancorar();
      pausado = true;
      agora = baseSimulada;
      notificar();
      saltou();
    },
    retomar() {
      if (!pausado) return;
      baseReal = agoraReal();
      pausado = false;
      notificar();
      saltou();
    },
    reiniciar() {
      definir(inicialMs);
      saltou();
    },
    foto: () => ({ agora: calcular(), pausado }),
    sincronizar(foto) {
      pausado = foto.pausado;
      definir(foto.agora);
    },
    subscribeSalto(ouvinte) {
      ouvintesSalto.add(ouvinte);
      return () => {
        ouvintesSalto.delete(ouvinte);
      };
    },
  };
}
