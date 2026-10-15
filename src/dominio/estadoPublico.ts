import type { CampoCandidato, Candidato, ConfigApresentacao, ConfigPlacar, Evento, Participacao, Tema } from "./tipos";

// MVP Semana Tech (seção 3): o que o servidor entrega ao navegador. É o "estado público": evento, tema, candidatos
// publicados (o admin recebe também os rascunhos), a participação e o perfil da própria pessoa. Nunca vão ao cliente:
// votos, auditoria, e-mails de terceiros, participações de outras pessoas (tabela 5.11 do FRONTEIRA-DADOS.md).

export type UsuarioPublico = {
  id: string;
  nome: string;
  email: string;
  /** O Better Auth só guarda o booleano; a tela só precisa saber SE o e-mail está verificado. */
  emailVerificado: boolean;
};

export type EventoPublico = {
  evento: Evento;
  tema: Tema;
  configPlacar: ConfigPlacar;
  configApresentacao: ConfigApresentacao;
  camposCandidato: CampoCandidato[];
  candidatos: Candidato[];
  /** Só a da própria pessoa. */
  participacao: Participacao | null;
};

export type EstadoPublico = {
  /** Relógio do servidor (ms desde 1970) no instante da resposta: o navegador se alinha a ele. */
  agoraMs: number;
  usuario: UsuarioPublico | null;
  eventos: EventoPublico[];
};
