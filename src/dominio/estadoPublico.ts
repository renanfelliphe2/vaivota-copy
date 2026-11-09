import type {
  CampoCandidato,
  Categoria,
  Candidato,
  ConfigApresentacao,
  ConfigPlacar,
  ConviteJurado,
  CriterioJuri,
  Dispositivo,
  Evento,
  Parceiro,
  Participacao,
  Tema,
} from "./tipos";

// MVP Maratona Tech Tivit (seção 3): o que o servidor entrega ao navegador. É o "estado público": evento, tema, candidatos
// publicados (o admin recebe também os rascunhos), a participação e o perfil da própria pessoa. Nunca vão ao cliente:
// votos, auditoria, e-mails de terceiros, participações de outras pessoas (tabela 5.11 do FRONTEIRA-DADOS.md).

export type UsuarioPublico = {
  id: string;
  nome: string;
  email: string;
  /** O Better Auth só guarda o booleano; a tela só precisa saber SE o e-mail está verificado. */
  emailVerificado: boolean;
};

/** Convite como o admin o vê no estado público: sem o hash do código e sem o vínculo com a participação de quem resgatou. */
export type ConvitePublico = Omit<ConviteJurado, "hashCodigo" | "participacaoId">;

/** Totem como o admin o vê no estado público: sem o hash do token e sem o do PIN. */
export type DispositivoPublico = Omit<Dispositivo, "hashToken" | "hashPin">;

export type EventoPublico = {
  evento: Evento;
  tema: Tema;
  configPlacar: ConfigPlacar;
  configApresentacao: ConfigApresentacao;
  camposCandidato: CampoCandidato[];
  /** Categorias do evento (09/11/2026), na ordem. Vazio em evento sem categorias (urna única). */
  categorias: Categoria[];
  candidatos: Candidato[];
  /** Critérios de avaliação do júri (Festival). Vazio com o módulo júri desligado. Só nomes: nenhuma nota chega aqui. */
  criteriosJuri: CriterioJuri[];
  /** Parceiros do evento, na ordem da faixa do telão e da página do evento. Evento em rascunho: só o admin os recebe. */
  parceiros: Parceiro[];
  /** Só o admin do evento recebe (checklist de ativação e trava do módulo júri); para os demais, vazio. */
  convitesJurado: ConvitePublico[];
  /** Só o admin do evento recebe (checklist de ativação do totem); para os demais, vazio. */
  dispositivos: DispositivoPublico[];
  /** Só a da própria pessoa (com as categorias em que ela já votou, nunca em quem). */
  participacao: Participacao | null;
};

export type EstadoPublico = {
  /** Relógio do servidor (ms desde 1970) no instante da resposta: o navegador se alinha a ele. */
  agoraMs: number;
  usuario: UsuarioPublico | null;
  eventos: EventoPublico[];
};
