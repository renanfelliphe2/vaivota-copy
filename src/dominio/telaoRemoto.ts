import type { ModoAvanco } from "./tipos";

// Telão e controle remoto (08/10/2026; em outro aparelho desde 25/11/2026). Tipos comuns ao navegador e ao servidor: o controle
// remoto comanda o palco e o palco conta o que está mostrando, pelo BroadcastChannel (abas do mesmo navegador) ou pelo servidor
// (telão pareado por código, em outro aparelho).

/** Os botões do controle remoto. Só por clique: o controle aparece em todas as abas e não usa teclado. */
export type ComandoTelao = "AVANCAR" | "VOLTAR" | "ALTERNAR_PAUSA" | "ALTERNAR_MODO" | "EMERGENCIA" | "REINICIAR" | "DESLIGAR" | "LIGAR";

export const COMANDOS_TELAO = ["AVANCAR", "VOLTAR", "ALTERNAR_PAUSA", "ALTERNAR_MODO", "EMERGENCIA", "REINICIAR", "DESLIGAR", "LIGAR"] as const satisfies readonly ComandoTelao[];

/** Comandos que dependem da cena (o palco diz quais valem agora). */
export type ComandoDoPalco = Exclude<ComandoTelao, "DESLIGAR" | "LIGAR">;

export type EstadoTelao =
  /** Aba aberta, esperando o clique em "Entrar em tela cheia" na própria janela do telão. */
  | { situacao: "AGUARDANDO_CLIQUE"; ensaio: boolean }
  /** Desligado pelo controle: tela preta com a logo; a revelação fica pausada onde estava. */
  | { situacao: "DESLIGADO"; ensaio: boolean }
  | {
      situacao: "LIGADO";
      ensaio: boolean;
      nomeCena: string;
      /** Só durante a revelação: cena atual (1…) e total. */
      progresso: { cena: number; total: number } | null;
      /** APRESENTANDO e PAUSADO: revelação em curso. PARADO: tela sem cenas para conduzir (candidatos, final). */
      andamento: "APRESENTANDO" | "PAUSADO" | "PARADO";
      modoAvanco: ModoAvanco | null;
      /**
       * Quando a tela avança sozinha (Date.now, em ms); null sem avanço automático no passo atual. No caminho pelo servidor vai
       * como os ms que faltavam no sinal: os relógios dos dois aparelhos não batem.
       */
      proximoAvancoEm: number | null;
      telaCheia: boolean;
      mensagem: string | null;
      pode: Record<ComandoDoPalco, boolean>;
    };

/** O que o palco do telão pareado mostra: a apresentação real ou um cenário de ensaio (o palco de quem gerou o código decide). */
export type ModoPalco = { tipo: "REAL" } | { tipo: "ENSAIO"; cenarioId: string };

export function chaveDoModo(modo: ModoPalco): string {
  return modo.tipo === "REAL" ? "REAL" : `ENSAIO:${modo.cenarioId}`;
}

export type SituacaoTelaoRemoto = "AGUARDANDO" | "PAREADO" | "ENCERRADO";

/** A cópia de `ui.apresentacao` guardada no servidor; a versão sobe a cada escrita (a última vale). */
export type CopiaApresentacao = { versao: number; dados: unknown };

/** A sessão vista pelo admin: o código (só enquanto espera o aparelho) e há quanto tempo o telão deu sinal. */
export type StatusTelaoRemoto = {
  id: string;
  situacao: SituacaoTelaoRemoto;
  codigo: string | null;
  /** ms desde o último sinal do aparelho pareado (null antes do primeiro). */
  sinalHaMs: number | null;
};

/** Consulta do controle: o status, o que o telão mostra (null sem sinal recente) e a apresentação, se mudou. */
export type ConsultaTelaoRemoto = StatusTelaoRemoto & { palco: EstadoTelao | null; apresentacao: CopiaApresentacao | null };

/** O que o telão pareado recebe a cada sinal. */
export type SinalTelaoPareado = {
  eventoId: string;
  /** O admin que gerou o código: a apresentação deste aparelho é a dele (`ui.donoApresentacao`). */
  dono: string;
  modo: ModoPalco;
  /** Os botões apertados desde o último sinal, na ordem. */
  comandos: ComandoTelao[];
  /** O último comando já entregue (o próximo sinal pede os que vierem depois dele). */
  ultimoComando: number;
  apresentacao: CopiaApresentacao | null;
};

/** Sem sinal por este tempo, o controle mostra o telão do outro aparelho como sem sinal. */
export const SEM_SINAL_REMOTO_MS = 5000;
