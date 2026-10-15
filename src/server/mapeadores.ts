import "server-only";
import type * as P from "@/generated/prisma/client";
import type {
  CampoCandidato,
  Candidato,
  ConfigApresentacao,
  ConfigPlacar,
  Evento,
  Instante,
  Participacao,
  TextosEstado,
  Tema,
} from "@/dominio/tipos";
import { FUSO_PADRAO, paraInstante } from "@/lib/tempo";

// Linhas do Prisma → tipos de domínio (`src/dominio/tipos.ts`). As datas viram `Instante` (ISO 8601 com o offset do
// fuso do evento), como o domínio e as telas esperam.

export function instante(data: Date, fuso: string = FUSO_PADRAO): Instante {
  return paraInstante(data.getTime(), fuso);
}

function instanteOuNulo(data: Date | null, fuso: string): Instante | null {
  return data ? instante(data, fuso) : null;
}

export function eventoParaDominio(e: P.Evento): Evento {
  const f = e.fusoHorario;
  return {
    id: e.id,
    slug: e.slug,
    nome: e.nome,
    descricao: e.descricao,
    local: e.local,
    linkSobre: e.linkSobre,
    fusoHorario: f,
    estado: e.estado,
    estadoUrna: e.estadoUrna,
    janelaInicio: instanteOuNulo(e.janelaInicio, f),
    janelaFim: instanteOuNulo(e.janelaFim, f),
    encerramentoAutomatico: e.encerramentoAutomatico,
    metodoIdentificacao: e.metodoIdentificacao,
    moduloJuri: e.moduloJuri,
    moduloInfantil: e.moduloInfantil,
    bloquearVotoProprio: e.bloquearVotoProprio,
    avisoPrivacidadeUrl: e.avisoPrivacidadeUrl,
    prazoAnonimizacaoDias: e.prazoAnonimizacaoDias,
    urnaAbertaEm: instanteOuNulo(e.urnaAbertaEm, f),
    urnaEncerradaEm: instanteOuNulo(e.urnaEncerradaEm, f),
    concluidoEm: instanteOuNulo(e.concluidoEm, f),
    criadoEm: instante(e.criadoEm, f),
    atualizadoEm: instante(e.atualizadoEm, f),
  };
}

export function temaParaDominio(t: P.Tema, fuso: string): Tema {
  return {
    eventoId: t.eventoId,
    nomeExibicao: t.nomeExibicao,
    logoUrl: t.logoUrl,
    capaUrl: t.capaUrl,
    corPrimaria: t.corPrimaria,
    corSecundaria: t.corSecundaria,
    corFundo: t.corFundo,
    corTexto: t.corTexto,
    fonte: t.fonte,
    rotuloCandidato: t.rotuloCandidato,
    rotuloCandidatos: t.rotuloCandidatos,
    textosEstado: (t.textosEstado as TextosEstado | null) ?? null,
    atualizadoEm: instante(t.atualizadoEm, fuso),
  };
}

export function placarParaDominio(c: P.ConfigPlacar, fuso: string): ConfigPlacar {
  return {
    eventoId: c.eventoId,
    pesoPopular: c.pesoPopular,
    pesoJuri: c.pesoJuri,
    pesoInfantil: c.pesoInfantil,
    regraDesempate: c.regraDesempate,
    // Mock-only (Festival): o júri por critério ainda não existe no banco.
    modoVotoJuri: "VOTO_UNICO",
    atualizadoEm: instante(c.atualizadoEm, fuso),
  };
}

export function apresentacaoParaDominio(c: P.ConfigApresentacao, fuso: string): ConfigApresentacao {
  return {
    eventoId: c.eventoId,
    trailerUrl: c.trailerUrl,
    usarTrailerGerado: c.usarTrailerGerado,
    incluirCandidatosTrailer: c.incluirCandidatosTrailer,
    classificacaoCompleta: c.classificacaoCompleta,
    modoAvanco: c.modoAvanco,
    rotuloCategoriaPublico: c.rotuloCategoriaPublico,
    rotuloCategoriaInfantil: c.rotuloCategoriaInfantil,
    rotuloCategoriaJuri: c.rotuloCategoriaJuri,
    // Sem parcial por projeto durante a votação: a flag nunca chega ligada ao cliente (P4 das decisões pendentes).
    parcialAoVivo: false,
    limiarRetaFinalSegundos: c.limiarRetaFinalSegundos,
    atualizadoEm: instante(c.atualizadoEm, fuso),
  };
}

export function campoParaDominio(c: P.CampoCandidato): CampoCandidato {
  return { id: c.id, eventoId: c.eventoId, chave: c.chave, rotulo: c.rotulo, ordem: c.ordem };
}

function camposExtrasDe(valor: P.Candidato["camposExtras"]): Record<string, string> | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  return Object.fromEntries(Object.entries(valor).filter(([, v]) => typeof v === "string")) as Record<string, string>;
}

/**
 * `usuarioVinculadoId` só aparece para o próprio usuário vinculado (a tela usa para avisar "voto em si mesmo"); o servidor
 * revalida no voto. Ninguém recebe o id de outra pessoa.
 */
export function candidatoParaDominio(c: P.Candidato, fuso: string, usuarioId: string | null = null): Candidato {
  return {
    id: c.id,
    eventoId: c.eventoId,
    titulo: c.titulo,
    descricao: c.descricao,
    imagemUrl: c.imagemUrl,
    publicado: c.publicado,
    desqualificado: c.desqualificado,
    ordem: c.ordem,
    camposExtras: camposExtrasDe(c.camposExtras),
    usuarioVinculadoId: usuarioId !== null && c.usuarioVinculadoId === usuarioId ? usuarioId : null,
    criadoEm: instante(c.criadoEm, fuso),
    atualizadoEm: instante(c.atualizadoEm, fuso),
  };
}

export function participacaoParaDominio(p: P.Participacao): Participacao {
  return { id: p.id, usuarioId: p.usuarioId, eventoId: p.eventoId, papel: p.papel, votou: p.votou };
}
