// Etapa 8 (seção 5.5, P3): durações em ms, ajustáveis.

export const DURACOES = {
  /** 08/10/2026: roleta de suspense da categoria (era 2500). */
  suspense: 3500,
  nome: 4000,
  detalhe: 4000,
  desempatePasso: 5000,
  podioPasso: 4000,
  classificacaoPagina: 6000,
  trailerLink: 60000,
  trailerGerado: 12000,
  limiteCargaTrailer: 8000,
  /** 08/10/2026: entrada e saída do trailer passam pelo preto: a cena que sai escurece (e o som baixa)… */
  passagemPreto: 900,
  /** …e o vídeo só clareia depois de o player carregar, um pouco depois do onLoad (o autoplay leva um instante). */
  esperaPlayerTrailer: 700,
  /** Título "Na última edição…" no preto, com o trailer já tocando por baixo (08/10/2026). */
  aberturaTrailer: 4500,
  /** Chamada "E os vencedores deste ano são…" depois do trailer (segundo passo da cena; avança sozinha). */
  chamadaVencedores: 5500,
  mensagemAbertura: 8000,
  paginaCandidatos: 8000,
  ensaioAoVivo: 20000,
  /** Ensaio: a tela de votação encerrada mostra o aviso grande e segura um pouco antes do trailer. */
  ensaioEncerrada: 8000,
  /** Aviso grande "Votação encerrada" no meio da tela, ao entrar na tela inicial da revelação. */
  avisoEncerrada: 4000,
  /** Final da revelação: o pódio só com os vencedores, antes dos cards com o detalhamento (08/10/2026). */
  finalPodio: 7000,
  hudVisivel: 3000,
  ajudaVisivel: 8000,
} as const;

/** Candidatos por página no palco (D19). */
export const CANDIDATOS_POR_PAGINA = 8;
/** Linhas por página da classificação completa. */
export const LINHAS_CLASSIFICACAO = 10;
/** Limite visual de nomes por cena de pódio ou desempate (D12). */
export const LIMITE_NOMES_CENA = 6;
