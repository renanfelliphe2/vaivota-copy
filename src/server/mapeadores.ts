import "server-only";
import type * as P from "@/generated/prisma/client";
import { lerOrdem, lerTrofeus, tamanhoDoPodio } from "@/dominio/apresentacao/cerimonia";
import type { ConvitePublico, DispositivoPublico } from "@/dominio/estadoPublico";
import type {
  CampoCandidato,
  Categoria,
  Candidato,
  ConfigApresentacao,
  ConfigPlacar,
  CriterioJuri,
  Evento,
  Instante,
  GrupoParceiro,
  Parceiro,
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

export function instanteOuNulo(data: Date | null, fuso: string): Instante | null {
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
    ordemCandidatos: e.ordemCandidatos,
    avisoPrivacidadeUrl: e.avisoPrivacidadeUrl,
    sobreTitulo: e.sobreTitulo,
    sobreTexto: e.sobreTexto,
    sobreImagemUrl: e.sobreImagemUrl,
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
    modoVotoJuri: c.modoVotoJuri,
    atualizadoEm: instante(c.atualizadoEm, fuso),
  };
}

export function criterioParaDominio(c: P.CriterioJuri): CriterioJuri {
  return { id: c.id, eventoId: c.eventoId, nome: c.nome, ordem: c.ordem };
}

/** Convite para o admin no estado público: nunca o hash do código nem a participação de quem resgatou. */
export function parceiroParaDominio(p: P.Parceiro): Parceiro {
  return { id: p.id, eventoId: p.eventoId, nome: p.nome, logoUrl: p.logoUrl, linkUrl: p.linkUrl, ordem: p.ordem };
}

/** Grupos de parceiros (C1), na ordem; os parceiros de cada um na ordem da lista de parceiros. */
export function gruposParaDominio(
  grupos: readonly (P.GrupoParceiro & { parceiros: { parceiroId: string }[] })[],
  parceiros: readonly P.Parceiro[],
): GrupoParceiro[] {
  const ordem = new Map(parceiros.map((p) => [p.id, p.ordem]));
  return [...grupos]
    .sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id))
    .map((g) => ({
      id: g.id,
      eventoId: g.eventoId,
      nome: g.nome,
      ordem: g.ordem,
      parceiroIds: g.parceiros
        .map((p) => p.parceiroId)
        .filter((id) => ordem.has(id))
        .sort((a, b) => (ordem.get(a) ?? 0) - (ordem.get(b) ?? 0) || a.localeCompare(b)),
    }));
}

export function convitePublicoParaDominio(c: P.ConviteJurado, fuso: string): ConvitePublico {
  return {
    id: c.id,
    eventoId: c.eventoId,
    rotulo: c.rotulo,
    validadeAte: instanteOuNulo(c.validadeAte, fuso),
    estado: c.estado,
    resgatadoEm: instanteOuNulo(c.resgatadoEm, fuso),
    criadoEm: instante(c.criadoEm, fuso),
  };
}

/** Totem para o admin no estado público: nunca o hash do token nem o do PIN. */
export function dispositivoPublicoParaDominio(d: P.Dispositivo & { categorias?: { categoriaId: string }[] }, fuso: string): DispositivoPublico {
  return {
    id: d.id,
    eventoId: d.eventoId,
    nome: d.nome,
    estado: d.estado,
    ultimoUsoEm: instanteOuNulo(d.ultimoUsoEm, fuso),
    criadoEm: instante(d.criadoEm, fuso),
    categoriaIds: d.categorias?.map((c) => c.categoriaId) ?? [],
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
    telaoIntervaloSegundos: c.telaoIntervaloSegundos,
    telaoMostrar: { candidatos: c.telaoMostrarCandidatos, tempo: c.telaoMostrarTempo, qr: c.telaoMostrarQr, link: c.telaoMostrarLink },
    trofeus: lerTrofeus(c.trofeus),
    ordemRevelacao: lerOrdem(c.ordemRevelacao),
    atualizadoEm: instante(c.atualizadoEm, fuso),
  };
}

export function categoriaParaDominio(c: P.Categoria): Categoria {
  return {
    id: c.id,
    eventoId: c.eventoId,
    slug: c.slug,
    nome: c.nome,
    premio: c.premio,
    descricao: c.descricao,
    canal: c.canal,
    ordem: c.ordem,
    podioTamanho: tamanhoDoPodio(c.podioTamanho),
    podioVotos: c.podioVotos ?? [],
    mensagemTelao: c.mensagemTelao,
  };
}

export function campoParaDominio(c: P.CampoCandidato): CampoCandidato {
  return { id: c.id, eventoId: c.eventoId, categoriaId: c.categoriaId, chave: c.chave, rotulo: c.rotulo, tipo: c.tipo, ordem: c.ordem };
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
    imagemUrl: c.imagemUrl,
    publicado: c.publicado,
    desqualificado: c.desqualificado,
    ordem: c.ordem,
    camposExtras: camposExtrasDe(c.camposExtras),
    usuarioVinculadoId: usuarioId !== null && c.usuarioVinculadoId === usuarioId ? usuarioId : null,
    categoriaId: c.categoriaId,
    criadoEm: instante(c.criadoEm, fuso),
    atualizadoEm: instante(c.atualizadoEm, fuso),
  };
}

/** `categoriasVotadas`: ids das categorias em que a pessoa já votou (evento com categorias); nunca em quem. */
export function participacaoParaDominio(p: P.Participacao, categoriasVotadas: string[] = []): Participacao {
  return { id: p.id, usuarioId: p.usuarioId, eventoId: p.eventoId, papel: p.papel, votou: p.votou, categoriasVotadas };
}
