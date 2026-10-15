import type { ConfigSimulador, EstadoUi, EstadoUiApresentacao, EstadoUiVotacao } from "@/dominio/tipos";

// Valores iniciais do estado de tela (`ui`). Ficam fora de `mocks/` para o estado real não puxar os dados do protótipo.

export function criarApresentacaoInicial(): EstadoUiApresentacao {
  return { chave: null, modoSala: "REAL", cenarioEnsaioId: null, modoAvancoLocal: null, revelacao: null };
}

export function criarVotacaoInicial(): EstadoUiVotacao {
  return { chave: null, selecaoId: null, envio: "OCIOSO", falhaEnvio: null, ultimoVoto: null, aviso: null };
}

export function criarUiInicial(): EstadoUi {
  return {
    palcoAtivo: false,
    apresentacao: criarApresentacaoInicial(),
    bloqueioCodigo: { falhas: 0, ateMs: null },
    bloqueioLoginCodigo: { falhas: 0, ateMs: null },
    bloqueioSenha: { falhas: 0, ateMs: null },
    loginPendente: null,
    reenvioVerificacaoAteMs: null,
    votacao: criarVotacaoInicial(),
    dashboard: { resultadoVisivel: null },
    acesso: null,
    totem: { dispositivoId: null, quiosqueAtivo: false },
  };
}

/** "Simular votos entrando" (08/10/2026): por padrão só o público, 2 votos a cada 3 s (o ritmo de antes). */
export function criarConfigSimuladorInicial(): ConfigSimulador {
  return {
    POPULAR: { ligado: true, votos: 2, intervaloMs: 3000 },
    JURI: { ligado: true, votos: 1, intervaloMs: 5000 },
    INFANTIL: { ligado: true, votos: 1, intervaloMs: 2000 },
  };
}
