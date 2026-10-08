// Etapa 8 (seção 5.5, P3): durações em ms, ajustáveis.

export const DURACOES = {
  suspense: 2500,
  nome: 4000,
  detalhe: 4000,
  desempatePasso: 5000,
  podioPasso: 4000,
  classificacaoPagina: 6000,
  trailerLink: 60000,
  trailerGerado: 12000,
  limiteCargaTrailer: 8000,
  mensagemAbertura: 8000,
  paginaCandidatos: 8000,
  ensaioAoVivo: 20000,
  /** Ensaio: a tela de votação encerrada mostra o aviso grande e segura um pouco antes do trailer. */
  ensaioEncerrada: 8000,
  /** Aviso grande "Votação encerrada" no meio da tela, ao entrar na tela inicial da revelação. */
  avisoEncerrada: 4000,
  hudVisivel: 3000,
  ajudaVisivel: 8000,
} as const;

/** Candidatos por página no palco (D19). */
export const CANDIDATOS_POR_PAGINA = 8;
/** Linhas por página da classificação completa. */
export const LINHAS_CLASSIFICACAO = 10;
/** Limite visual de nomes por cena de pódio ou desempate (D12). */
export const LIMITE_NOMES_CENA = 6;
