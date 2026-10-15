// Tipos de domínio do protótipo (Fase 1). Espelham prisma/schema.prisma sem importar o Prisma (D10).
// Enums em MAIÚSCULAS, idênticos ao schema. Datas são `Instante` (ISO 8601 com offset).

export type Instante = string;

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export type EstadoEvento = "RASCUNHO" | "ATIVO" | "CONCLUIDO";
export type EstadoUrna = "NAO_INICIADA" | "ABERTA" | "ENCERRADA";
export type MetodoIdentificacao = "GOOGLE_OU_EMAIL" | "SOMENTE_GOOGLE" | "SOMENTE_EMAIL";
export type PapelParticipacao = "PUBLICO" | "JURADO" | "ADMIN";
/** "Expirado" é derivado: DISPONIVEL com validadeAte < agora. */
export type EstadoConvite = "DISPONIVEL" | "USADO" | "REVOGADO";
export type EstadoDispositivo = "ATIVO" | "PAUSADO" | "REVOGADO";
export type RegraDesempate = "JURI" | "PUBLICO";
export type ModoAvanco = "AUTOMATICO" | "MANUAL";
/**
 * Como o jurado vota (08/10/2026). VOTO_UNICO: um candidato (Etapa 5). NOTAS_POR_CRITERIO: nota de 0 a 10 a cada
 * candidato em cada critério. MELHOR_POR_CRITERIO: um candidato por critério. O público sempre vota em um só.
 */
export type ModoVotoJuri = "VOTO_UNICO" | "NOTAS_POR_CRITERIO" | "MELHOR_POR_CRITERIO";

/** Domínio; não existe no schema. */
export type Grupo = "POPULAR" | "JURI" | "INFANTIL";
export type MotivoResultado = "ENCERRAMENTO" | "DESQUALIFICACAO" | "CORRECAO";

/**
 * Catálogo único de ações de auditoria. `Auditoria.acao` é string no schema; no protótipo é esta união.
 * Quem acrescenta uma ação nova edita esta lista e o catálogo de exibição da Etapa 7.
 */
export type AcaoAuditoria =
  // Etapa 0 (transições) e Etapa 3 (convites)
  | "EVENTO_ATIVADO"
  | "URNA_ABERTA"
  | "URNA_ENCERRADA"
  | "EVENTO_CONCLUIDO"
  | "CONVITE_RESGATADO"
  | "TENTATIVA_CODIGO_INVALIDA"
  | "BLOQUEIO_RATE_LIMIT"
  // MVP Semana Tech: admin que ainda não tinha conta entra com o e-mail convidado (script promover-admin)
  | "ADMIN_CONVITE_RESGATADO"
  // Etapa 5 (voto do júri; nunca a escolha do voto popular ou infantil)
  | "VOTO_JURI_REGISTRADO"
  | "VOTO_JURI_ALTERADO"
  // Etapa 6 (configuração)
  | "CONFIG_ALTERADA"
  | "TEMA_ALTERADO"
  | "PARCEIROS_ALTERADOS"
  | "CONVITES_GERADOS"
  | "CONVITE_REVOGADO"
  | "CANDIDATO_DESQUALIFICADO"
  | "CANDIDATO_CORRIGIDO"
  // Etapa 7 (exportação)
  | "EXPORTACAO_CSV"
  | "RELATORIO_GERADO"
  // Etapa 8 (telão; só no modo real)
  | "REVELACAO_INICIADA"
  | "REVELACAO_CONCLUIDA"
  | "REVELACAO_REFEITA"
  | "EMERGENCIA_ACIONADA";

/**
 * Quem encerrou a urna; vai em `detalhes` da auditoria URNA_ENCERRADA.
 * MANUAL = admin (Etapa 6) · AUTOMATICO = relógio (janelaFim) · TOOLBAR = dev toolbar · FALHA_SIMULADA = ModoFalha URNA_ENCERRA (Etapa 5)
 */
export type OrigemEncerramento = "MANUAL" | "AUTOMATICO" | "TOOLBAR" | "FALHA_SIMULADA";

// ─────────────────────────────────────────────
// Textos de estado (Json no schema)
// ─────────────────────────────────────────────

/** Chaves das telas de estado: as da Etapa 0 mais as acrescentadas pela Etapa 2. */
export type ChaveTextoEstado =
  | "NAO_INICIADA"
  | "ENCERRADA"
  | "JA_VOTOU"
  | "SUCESSO"
  // Etapa 2
  | "ABERTA"
  | "CONCLUIDO"
  | "SEM_CANDIDATOS"
  | "INDISPONIVEL"
  | "JURADO_JA_VOTOU"
  // Etapa 4
  | "ADMIN_NAO_VOTA"
  // Etapa 5
  | "VOTO_ATUALIZADO";

export type TextoEstado = { titulo: string; corpo: string };
export type TextosEstado = Partial<Record<ChaveTextoEstado, TextoEstado>>;

// ─────────────────────────────────────────────
// Entidades
// ─────────────────────────────────────────────

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  /**
   * Login por e-mail e senha (decisão do dono do produto, 08/10/2026; revoga a A5 da rev. 4).
   * null = conta criada pelo Google, sem senha (pode criar uma pela recuperação). Só o hash (D12).
   */
  senhaHash: string | null;
  emailVerificadoEm: Instante | null;
  anonimizadoEm: Instante | null;
  criadoEm: Instante;
  atualizadoEm: Instante;
};

export type Evento = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  local: string | null; // mock-only (F-5 aprovada; segue mock-only até a troca pelos tipos do Prisma)
  linkSobre: string | null; // mock-only (F-5 aprovada; segue mock-only até a troca pelos tipos do Prisma)
  fusoHorario: string;
  estado: EstadoEvento;
  estadoUrna: EstadoUrna;
  janelaInicio: Instante | null;
  janelaFim: Instante | null;
  encerramentoAutomatico: boolean;
  metodoIdentificacao: MetodoIdentificacao;
  moduloJuri: boolean;
  moduloInfantil: boolean;
  bloquearVotoProprio: boolean;
  avisoPrivacidadeUrl: string | null;
  prazoAnonimizacaoDias: number;
  urnaAbertaEm: Instante | null;
  urnaEncerradaEm: Instante | null;
  concluidoEm: Instante | null;
  criadoEm: Instante;
  atualizadoEm: Instante;
};

export type Tema = {
  eventoId: string;
  nomeExibicao: string | null;
  logoUrl: string | null;
  capaUrl: string | null;
  corPrimaria: string;
  corSecundaria: string;
  corFundo: string;
  corTexto: string;
  fonte: string;
  rotuloCandidato: string;
  rotuloCandidatos: string;
  textosEstado: TextosEstado | null;
  atualizadoEm: Instante;
};

export type ConfigPlacar = {
  eventoId: string;
  pesoPopular: number; // inteiro
  pesoJuri: number; // inteiro
  pesoInfantil: number; // inteiro
  regraDesempate: RegraDesempate;
  /** Mock-only (08/10/2026): como os votos do júri viram o placar do júri. Trava com a urna aberta, como os pesos. */
  modoVotoJuri: ModoVotoJuri;
  atualizadoEm: Instante;
};

export type ConfigApresentacao = {
  eventoId: string;
  trailerUrl: string | null;
  usarTrailerGerado: boolean;
  incluirCandidatosTrailer: boolean;
  classificacaoCompleta: boolean;
  modoAvanco: ModoAvanco;
  rotuloCategoriaPublico: string;
  rotuloCategoriaInfantil: string;
  rotuloCategoriaJuri: string;
  parcialAoVivo: boolean;
  limiarRetaFinalSegundos: number;
  atualizadoEm: Instante;
};

export type CampoCandidato = {
  id: string;
  eventoId: string;
  chave: string;
  rotulo: string;
  ordem: number;
};

export type Candidato = {
  id: string;
  eventoId: string;
  titulo: string;
  descricao: string | null;
  /** D16: `placeholder:<n>`, caminho de public/, `blob:` ou null (só em rascunho). */
  imagemUrl: string | null;
  publicado: boolean;
  desqualificado: boolean;
  ordem: number;
  camposExtras: Record<string, string> | null;
  usuarioVinculadoId: string | null;
  criadoEm: Instante;
  atualizadoEm: Instante;
};

/** Sigilo: nenhum horário (nem do voto, nem da criação). */
export type Participacao = {
  id: string;
  usuarioId: string;
  eventoId: string;
  papel: PapelParticipacao;
  votou: boolean;
};

/** Voto popular: sem referência ao usuário (sigilo). */
export type Voto = {
  id: number;
  eventoId: string;
  candidatoId: string;
  hashRecibo: string;
  criadoEm: Instante;
};

export type ConviteJurado = {
  id: string;
  eventoId: string;
  hashCodigo: string;
  rotulo: string | null;
  validadeAte: Instante | null;
  estado: EstadoConvite;
  participacaoId: string | null;
  resgatadoEm: Instante | null;
  criadoEm: Instante;
};

export type VotoJuri = {
  id: string;
  eventoId: string;
  participacaoId: string;
  candidatoId: string;
  criadoEm: Instante;
  atualizadoEm: Instante;
};

/** 08/10/2026: parceiro do evento (patrocinador, apoio), na faixa do telão e na página do evento. Sem logo, o nome em texto. */
export type Parceiro = {
  id: string;
  eventoId: string;
  nome: string;
  logoUrl: string | null;
  ordem: number;
};

/** Mock-only (08/10/2026): critério de avaliação do júri (ex.: Direção, Roteiro). Vale para os dois modos por critério. */
export type CriterioJuri = {
  id: string;
  eventoId: string;
  nome: string;
  ordem: number;
};

/** Mock-only (08/10/2026): nota de um jurado a um candidato num critério (NOTAS_POR_CRITERIO). Única por (participação, candidato, critério). */
export type NotaJuri = {
  id: string;
  eventoId: string;
  participacaoId: string;
  candidatoId: string;
  criterioId: string;
  /** Inteiro de 0 a 10. */
  nota: number;
  criadoEm: Instante;
  atualizadoEm: Instante;
};

/** Mock-only (08/10/2026): o melhor candidato de um critério para um jurado (MELHOR_POR_CRITERIO). Única por (participação, critério). */
export type EscolhaCriterioJuri = {
  id: string;
  eventoId: string;
  participacaoId: string;
  criterioId: string;
  candidatoId: string;
  criadoEm: Instante;
  atualizadoEm: Instante;
};

export type HistoricoVotoJuri = {
  id: number;
  votoJuriId: string;
  candidatoAnteriorId: string | null;
  candidatoNovoId: string;
  criadoEm: Instante;
};

export type Dispositivo = {
  id: string;
  eventoId: string;
  nome: string;
  hashToken: string;
  hashPin: string | null;
  estado: EstadoDispositivo;
  ultimoUsoEm: Instante | null;
  criadoEm: Instante;
};

/** Voto infantil: candidato, horário e dispositivo. Nenhum dado da criança. */
export type VotoInfantil = {
  id: number;
  eventoId: string;
  candidatoId: string;
  dispositivoId: string;
  criadoEm: Instante;
};

export type DadosResultado = {
  criterioDesempate: RegraDesempate;
  totais: Record<Grupo, number>;
  placares: Record<Grupo, { candidatoId: string; votos: number }[]>;
  ranking: {
    candidatoId: string;
    pontuacao: number;
    posicao: number;
    /** Contribuição de cada grupo para a pontuação (rev. 3, D16). */
    pontosPorGrupo: Record<Grupo, number>;
  }[];
  /** candidatoIds fora da disputa (rev. 3, D16). */
  desqualificados: string[];
  /** Pesos após redistribuir os grupos ligados com base 0 (rev. 3, D16, C3). */
  pesosEfetivos: Record<Grupo, number>;
  categorias: {
    grupo: Grupo;
    vencedores: { candidatoId: string; votos: number }[];
    desempatadoPorPontuacao: boolean;
  }[];
  empates: {
    /** Trecho disputado, ex.: [2, 3]. */
    posicoes: number[];
    candidatoIds: string[];
    criterioAplicado: RegraDesempate;
    /** false = posição compartilhada. */
    resolvido: boolean;
    vencedorId?: string;
  }[];
};

export type ResultadoOficial = {
  id: string;
  eventoId: string;
  versao: number;
  motivo: MotivoResultado;
  pesoPopular: number;
  pesoJuri: number;
  pesoInfantil: number;
  dados: DadosResultado;
  calculadoPorId: string | null;
  calculadoEm: Instante;
};

export type Auditoria = {
  id: number;
  eventoId: string | null;
  atorUsuarioId: string | null;
  atorDispositivoId: string | null;
  acao: AcaoAuditoria;
  entidade: string | null;
  entidadeId: string | null;
  detalhes: Record<string, unknown> | null;
  ipHash: string | null;
  criadoEm: Instante;
};

// ─────────────────────────────────────────────
// Estado da aplicação
// ─────────────────────────────────────────────

export type Banco = {
  sequencias: { voto: number; historicoVotoJuri: number; votoInfantil: number; auditoria: number };
  eventos: Evento[];
  temas: Tema[];
  configsPlacar: ConfigPlacar[];
  configsApresentacao: ConfigApresentacao[];
  camposCandidato: CampoCandidato[];
  candidatos: Candidato[];
  usuarios: Usuario[];
  participacoes: Participacao[];
  convitesJurado: ConviteJurado[];
  votos: Voto[];
  votosJuri: VotoJuri[];
  historicoVotosJuri: HistoricoVotoJuri[];
  criteriosJuri: CriterioJuri[];
  notasJuri: NotaJuri[];
  escolhasCriterioJuri: EscolhaCriterioJuri[];
  parceiros: Parceiro[];
  dispositivos: Dispositivo[];
  votosInfantis: VotoInfantil[];
  resultados: ResultadoOficial[];
  auditoria: Auditoria[];
};

/** Tipo definido pela Etapa 8 (seção 5.2 dela); valor inicial: tudo nulo, modoSala "REAL". */
export type EstadoUiApresentacao = {
  chave: string | null;
  modoSala: "REAL" | "ENSAIO";
  cenarioEnsaioId: string | null;
  modoAvancoLocal: ModoAvanco | null;
  revelacao: {
    eventoId: string;
    assinatura: string;
    situacao: "EM_ANDAMENTO" | "CONCLUIDA";
    cena: number;
    passo: number;
    pausado: boolean;
    emergencia: boolean;
    iniciadaEm: Instante;
  } | null;
};

export type BloqueioTentativas = { falhas: number; ateMs: number | null };

/** MVP Semana Tech: `tipo` diz se o código aguardado é o de confirmação do e-mail (padrão) ou o de recuperação de senha. */
export type LoginPendente = { email: string; de?: string; eventoId: string; tipo?: "verificacao" | "recuperacao" };

/** Etapa 5 (seção 5.1): avisos do fluxo de voto. */
export type AvisoVotacao = "NAO_REGISTRADO" | "ESCOLHA_INDISPONIVEL" | "VOTO_PROPRIO" | "JA_VOTOU_ANTES";

export type ResultadoEnvioVoto = "REGISTRADO" | "ATUALIZADO" | "SEM_ALTERACAO";

/**
 * Etapa 5 (D1): estado de tela do voto. Todo campo só vale se `chave` = `${usuarioId}:${eventoId}` atual;
 * senão é lido como vazio. A escolha nunca vai ao `banco` ligada à pessoa.
 */
export type EstadoUiVotacao = {
  chave: string | null;
  /** Candidato escolhido, ainda não enviado. */
  selecaoId: string | null;
  envio: "OCIOSO" | "ENVIANDO" | "VERIFICANDO";
  falhaEnvio: "REDE" | "ERRO_INTERNO" | "NAO_CONFIRMADO" | null;
  /** `candidatoId` só é lido pelo sucesso do jurado (sigilo, rev. 3 E8). */
  ultimoVoto: { candidatoId: string; resultado: ResultadoEnvioVoto } | null;
  aviso: AvisoVotacao | null;
};

export type EstadoUi = {
  /** Etapa 8 liga; a toolbar lê. */
  palcoAtivo: boolean;
  apresentacao: EstadoUiApresentacao;
  // Etapa 3
  /** Código de convite (um só contador para registro e convite). */
  bloqueioCodigo: BloqueioTentativas;
  /** Código de recuperação de senha e de confirmação de e-mail. */
  bloqueioLoginCodigo: BloqueioTentativas;
  /** Senha errada no login. */
  bloqueioSenha: BloqueioTentativas;
  /** E-mail aguardando o código de recuperação de senha. */
  loginPendente: LoginPendente | null;
  /** Cooldown de reenviarCodigo. */
  reenvioVerificacaoAteMs: number | null;
  // Etapa 5 (a Etapa 4 não acrescenta campo: o detalhe vive na URL)
  votacao: EstadoUiVotacao;
  // Etapa 7 (rev. 3, C17)
  dashboard: EstadoUiDashboard;
  /** Diálogo de acesso do cabeçalho (08/10/2026): aba aberta e o `?de=` para voltar depois do login. */
  acesso: { aba: "entrar" | "criar"; de?: string } | null;
  // Totem (rev. 4, A7)
  totem: EstadoUiTotem;
};

/**
 * Totem (rev. 4, A7): este aparelho no protótipo. `dispositivoId` faz o papel do token guardado no tablet
 * depois do pareamento; `quiosqueAtivo` esconde a toolbar em AUTO, como o palco.
 */
export type EstadoUiTotem = { dispositivoId: string | null; quiosqueAtivo: boolean };

/** Etapa 7 (D7, C17): resultado já revelado na aba Resultado, por `eventoId:versao`; nova versão volta a ocultar. */
export type EstadoUiDashboard = { resultadoVisivel: string | null };

export type ModoFalha =
  | "NENHUMA"
  | "REDE_NAO_GRAVOU"
  | "REDE_GRAVOU"
  | "URNA_ENCERRA"
  | "JA_VOTOU_OUTRA_SESSAO"
  | "ERRO_INTERNO";

export type ToolbarModo = "AUTO" | "OCULTA" | "FORCADA";

/** Um tipo de voto do simulador: `votos` a cada `intervaloMs`. */
export type RitmoSimulador = { ligado: boolean; votos: number; intervaloMs: number };
export type ConfigSimulador = Record<Grupo, RitmoSimulador>;

export type EstadoDev = {
  /** Evento exibido em "/" e fallback de useEventoAtivo (inicial: "ver-e-fazer-filmes"). */
  slugPadrao: string;
  latenciaMs: 0 | 400 | 1500;
  /** Persistente: todo serviço devolve REDE. */
  simularErroRede: boolean;
  /** Pontual: vale para o próximo serviço que a suporta. */
  falhaProxima: ModoFalha;
  /** Lógica na Etapa 7; usada por 7 e 8. */
  simularVotosEntrando: boolean;
  /** 08/10/2026: o que "Simular votos entrando" cria, por tipo de voto. */
  simuladorVotos: ConfigSimulador;
  toolbarModo: ToolbarModo;
  toolbarRecolhida: boolean;
  /** "Opções avançadas" aberta na toolbar. */
  toolbarAvancadas: boolean;
  /** Chave `${usuarioId}:${eventoId}` → Voto.id; só para "Resetar meu voto"; nunca lido por telas. */
  vinculosVoto: Record<string, number>;
  /** Etapa 8 usa; valor inicial: false. */
  simularTrailerFalha: boolean;
};

export type EstadoApp = {
  banco: Banco;
  sessao: { usuarioId: string | null };
  ui: EstadoUi;
  dev: EstadoDev;
};
