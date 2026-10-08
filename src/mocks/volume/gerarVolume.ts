import { aplicarVotoJuri, aplicarVotoPopular } from "@/dominio/aplicarVoto";
import { semAvaliacoesDoEvento } from "@/dominio/avaliacaoJuri";
import { contarVotos, contarVotosJuriUnico } from "@/dominio/contagens";
import { estadoExibidoConvite, proximoNumeroRotulo } from "@/dominio/convites";
import type { ConviteJurado, EstadoApp, Grupo, Instante, Participacao, Usuario, VotoInfantil } from "@/dominio/tipos";
import { criarGerador, embaralharComSemente, hashDeTexto, type Gerador } from "@/lib/aleatorio";
import { hashMock } from "@/lib/hash";
import { DIA, HORA, MINUTO, paraInstante, paraMs, SEGUNDO } from "@/lib/tempo";
import { registrarAuditoria } from "@/store/auditoria";
import type { DistribuicaoAlvo } from "./distribuicoes";
import { PRIMEIROS_NOMES, SOBRENOMES } from "./nomes";

// Etapa 7 (D10, seção 5.7): gerador determinístico de volume. Preserva o núcleo (ids e fatos da Etapa 0),
// cria primeiro usuários e participações e só depois aplica os votos (rev. 3, C2), sempre pelas funções
// da Etapa 5 (invariantes 3 e 4). Nada de Math.random nem Date.now.

export type OpcoesVolume = {
  eventoId: string;
  distribuicao: DistribuicaoAlvo;
  /** true: conta e preserva os votos do núcleo; false: parte do núcleo sem votos. */
  incluirNucleo: boolean;
  /** Participações PUBLICO no total (inclui as do núcleo). */
  publicos: { cadastrados: number };
  jurados: { convidados: number; convites: "CRIAR" | "REUSAR" };
  infantil: { votosPorDispositivo: Record<string, number> } | null;
  auditoria: boolean;
  /** Onde caem os instantes dos votos. */
  janela: { inicio: Instante; fim: Instante };
  semente: string;
};

const IP_HASH = hashMock("ip-demo");
export const PREFIXO_USUARIO_VOLUME = "usr-v-";

export function ehUsuarioVolume(usuarioId: string): boolean {
  return usuarioId.startsWith(PREFIXO_USUARIO_VOLUME);
}

function quatroDigitos(n: number): string {
  return String(n).padStart(4, "0");
}

/** Próximo número livre de `usr-v-NNNN` (continua a numeração existente). */
export function proximoNumeroUsuarioVolume(usuarios: readonly Pick<Usuario, "id">[]): number {
  let maior = 0;
  for (const u of usuarios) {
    if (!ehUsuarioVolume(u.id)) continue;
    const n = Number(u.id.slice(PREFIXO_USUARIO_VOLUME.length));
    if (Number.isInteger(n) && n > maior) maior = n;
  }
  return maior + 1;
}

/** Usuário gerado: nome de listas fixas, e-mail único que nunca é exibido, e-mail verificado. */
export function criarUsuarioVolume(numero: number, rng: Gerador, criadoEm: Instante): Usuario {
  const nome = `${PRIMEIROS_NOMES[Math.floor(rng() * PRIMEIROS_NOMES.length)]} ${SOBRENOMES[Math.floor(rng() * SOBRENOMES.length)]}`;
  return {
    id: `${PREFIXO_USUARIO_VOLUME}${quatroDigitos(numero)}`,
    nome,
    email: `vol-${quatroDigitos(numero)}@demo.com`,
    senhaHash: null, // usuários de volume nunca entram
    emailVerificadoEm: criadoEm,
    anonimizadoEm: null,
    criadoEm,
    atualizadoEm: criadoEm,
  };
}

/** Distribuição triangular com moda em 2/3 da janela: o i-ésimo de N cai no quantil (i + 0,5) / N, mais segundos de variação. */
export function instantesTriangulares(n: number, inicioMs: number, fimMs: number, rng: Gerador): number[] {
  const moda = 2 / 3;
  const largura = Math.max(0, fimMs - inicioMs);
  const lista: number[] = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const x = u < moda ? Math.sqrt(u * moda) : 1 - Math.sqrt((1 - u) * (1 - moda));
    const variacao = Math.round((rng() - 0.5) * 40) * SEGUNDO;
    const ms = Math.min(fimMs, Math.max(inicioMs, inicioMs + x * largura + variacao));
    lista.push(Math.floor(ms / SEGUNDO) * SEGUNDO);
  }
  return lista.sort((a, b) => a - b);
}

/** Lista de candidatos repetidos conforme a necessidade, embaralhada (a classificação não vira faixa no tempo). */
function filaDeCandidatos(necessidade: Record<string, number>, semente: string): string[] {
  const fila: string[] = [];
  for (const [id, n] of Object.entries(necessidade)) for (let i = 0; i < n; i++) fila.push(id);
  return embaralharComSemente(fila, semente);
}

/** Remove os votos do evento (popular, júri, notas e escolhas do júri, histórico, infantil), `votou` e vínculos: parte do núcleo sem votos. */
export function zerarVotosDoEvento(estado: EstadoApp, eventoId: string): EstadoApp {
  const ids = new Set(estado.banco.votosJuri.filter((v) => v.eventoId === eventoId).map((v) => v.id));
  const sufixo = `:${eventoId}`;
  return {
    ...estado,
    banco: {
      ...semAvaliacoesDoEvento(estado.banco, eventoId),
      votos: estado.banco.votos.filter((v) => v.eventoId !== eventoId),
      votosJuri: estado.banco.votosJuri.filter((v) => v.eventoId !== eventoId),
      historicoVotosJuri: estado.banco.historicoVotosJuri.filter((h) => !ids.has(h.votoJuriId)),
      votosInfantis: estado.banco.votosInfantis.filter((v) => v.eventoId !== eventoId),
      participacoes: estado.banco.participacoes.map((p) => (p.eventoId === eventoId ? { ...p, votou: false } : p)),
    },
    dev: {
      ...estado.dev,
      vinculosVoto: Object.fromEntries(Object.entries(estado.dev.vinculosVoto).filter(([k]) => !k.endsWith(sufixo))),
    },
  };
}

/** Tira de `dev.vinculosVoto` os usuários gerados (o vínculo só serve ao "Resetar meu voto"). */
export function semVinculosDeVolume(estado: EstadoApp): EstadoApp {
  const vinculos = Object.entries(estado.dev.vinculosVoto).filter(([k]) => !ehUsuarioVolume(k));
  if (vinculos.length === Object.keys(estado.dev.vinculosVoto).length) return estado;
  return { ...estado, dev: { ...estado.dev, vinculosVoto: Object.fromEntries(vinculos) } };
}

function necessidade(alvo: Record<string, number> | undefined, existentes: Record<string, number>): Record<string, number> {
  const r: Record<string, number> = {};
  for (const [id, n] of Object.entries(alvo ?? {})) {
    const falta = n - (existentes[id] ?? 0);
    if (falta < 0) throw new Error(`Seed de volume: alvo de ${id} (${n}) menor que o do núcleo (${existentes[id]})`);
    if (falta > 0) r[id] = falta;
  }
  return r;
}

function soma(r: Record<string, number>): number {
  return Object.values(r).reduce((s, n) => s + n, 0);
}

export function gerarVolume(estadoInicial: EstadoApp, opcoes: OpcoesVolume): EstadoApp {
  const { eventoId } = opcoes;
  const evento = estadoInicial.banco.eventos.find((e) => e.id === eventoId);
  if (!evento) return estadoInicial;
  const fuso = evento.fusoHorario;
  const inst = (ms: number) => paraInstante(ms, fuso);
  const rng = criarGerador(hashDeTexto(opcoes.semente));
  const inicioMs = paraMs(opcoes.janela.inicio);
  const fimMs = paraMs(opcoes.janela.fim);

  let estado = opcoes.incluirNucleo ? estadoInicial : zerarVotosDoEvento(estadoInicial, eventoId);
  // O volume gera votos de voto único do júri: conta só esses, qualquer que seja o modo do evento.
  const existentes = { ...contarVotos(estado.banco, eventoId), JURI: contarVotosJuriUnico(estado.banco, eventoId) };
  const falta: Record<Grupo, Record<string, number>> = {
    POPULAR: necessidade(opcoes.distribuicao.POPULAR, existentes.POPULAR),
    JURI: necessidade(opcoes.distribuicao.JURI, existentes.JURI),
    INFANTIL: necessidade(opcoes.distribuicao.INFANTIL, existentes.INFANTIL),
  };

  // 1. Usuários e participações (antes de qualquer voto; C2).
  const participacoesDoEvento = estado.banco.participacoes.filter((p) => p.eventoId === eventoId);
  const novosPublicos = Math.max(0, opcoes.publicos.cadastrados - participacoesDoEvento.filter((p) => p.papel === "PUBLICO").length);
  const novosJurados = Math.max(0, opcoes.jurados.convidados - participacoesDoEvento.filter((p) => p.papel === "JURADO").length);
  const votosPopulares = soma(falta.POPULAR);
  const votosJuri = soma(falta.JURI);
  if (votosPopulares > novosPublicos) throw new Error("Seed de volume: votos populares acima dos públicos gerados");
  if (votosJuri > novosJurados) throw new Error("Seed de volume: votos do júri acima dos jurados gerados");

  let numero = proximoNumeroUsuarioVolume(estado.banco.usuarios);
  const usuarios: Usuario[] = [];
  const participacoes: Participacao[] = [];
  const criarPessoa = (papel: "PUBLICO" | "JURADO") => {
    const criadoEm = inst(inicioMs - (1 + Math.floor(rng() * 96)) * HORA - Math.floor(rng() * 60) * MINUTO);
    const usuario = criarUsuarioVolume(numero, rng, criadoEm);
    usuarios.push(usuario);
    participacoes.push({ id: `par-v-${quatroDigitos(numero)}`, usuarioId: usuario.id, eventoId, papel, votou: false });
    numero++;
    return usuario;
  };
  const publicos = Array.from({ length: novosPublicos }, () => criarPessoa("PUBLICO"));
  const jurados = Array.from({ length: novosJurados }, () => criarPessoa("JURADO"));

  // Convites dos jurados novos: CRIAR gera USADO com "Jurado N"; REUSAR consome os DISPONIVEL do evento.
  const convitesGeradosEm = inicioMs - 14 * DIA;
  const novosConvites: ConviteJurado[] = [];
  const conviteDe = new Map<string, ConviteJurado>();
  let convites = estado.banco.convitesJurado;
  if (opcoes.jurados.convites === "CRIAR") {
    let proximo = proximoNumeroRotulo(
      convites.filter((c) => c.eventoId === eventoId).map((c) => c.rotulo),
      "Jurado",
    );
    jurados.forEach((u, i) => {
      const id = `conv-v-${u.id.slice(PREFIXO_USUARIO_VOLUME.length)}`;
      const resgatadoEm = inst(convitesGeradosEm + (i + 1) * 20 * HORA);
      const convite: ConviteJurado = {
        id,
        eventoId,
        hashCodigo: hashMock(`convite-volume:${id}`),
        rotulo: `Jurado ${proximo++}`,
        validadeAte: null,
        estado: "USADO",
        participacaoId: participacoes.find((p) => p.usuarioId === u.id)!.id,
        resgatadoEm,
        criadoEm: inst(convitesGeradosEm),
      };
      novosConvites.push(convite);
      conviteDe.set(u.id, convite);
    });
    convites = [...convites, ...novosConvites];
  } else {
    const livres = convites.filter(
      (c) => c.eventoId === eventoId && estadoExibidoConvite(c, inicioMs) === "DISPONIVEL",
    );
    if (livres.length < jurados.length) throw new Error("Seed de volume: convites disponíveis insuficientes");
    const usados = new Map<string, ConviteJurado>();
    jurados.forEach((u, i) => {
      const convite: ConviteJurado = {
        ...livres[i],
        estado: "USADO",
        participacaoId: participacoes.find((p) => p.usuarioId === u.id)!.id,
        resgatadoEm: inst(inicioMs - (jurados.length - i) * DIA),
      };
      usados.set(convite.id, convite);
      conviteDe.set(u.id, convite);
    });
    convites = convites.map((c) => usados.get(c.id) ?? c);
  }

  estado = {
    ...estado,
    banco: {
      ...estado.banco,
      usuarios: [...estado.banco.usuarios, ...usuarios],
      participacoes: [...estado.banco.participacoes, ...participacoes],
      convitesJurado: convites,
    },
  };

  if (opcoes.auditoria) {
    if (novosConvites.length > 0)
      estado = registrarAuditoria(estado, {
        eventoId,
        usuarioId: adminDoEvento(estado, eventoId),
        acao: "CONVITES_GERADOS",
        entidade: "convite_jurado",
        detalhes: { quantidade: novosConvites.length, rotuloBase: "Jurado", validadeAte: null },
        ipHash: IP_HASH,
        criadoEm: inst(convitesGeradosEm),
      });
    for (const u of jurados) {
      const convite = conviteDe.get(u.id)!;
      estado = registrarAuditoria(estado, {
        eventoId,
        usuarioId: u.id,
        acao: "CONVITE_RESGATADO",
        entidade: "convite_jurado",
        entidadeId: convite.id,
        detalhes: { rotulo: convite.rotulo },
        ipHash: IP_HASH,
        criadoEm: convite.resgatadoEm!,
      });
    }
  }

  // 2. Votos populares, em ordem de tempo.
  const filaPopular = filaDeCandidatos(falta.POPULAR, `${opcoes.semente}:popular`);
  const tempos = instantesTriangulares(filaPopular.length, inicioMs, fimMs, rng);
  filaPopular.forEach((candidatoId, i) => {
    estado = aplicarVotoPopular(estado, { eventoId, usuarioId: publicos[i].id, candidatoId, agoraMs: tempos[i] });
  });

  // 3. Júri: floor(n / 3) dos que votaram alteram uma vez (histórico com 2 entradas).
  const filaJuri = filaDeCandidatos(falta.JURI, `${opcoes.semente}:juri`);
  const temposJuri = instantesTriangulares(filaJuri.length, inicioMs, fimMs, rng);
  const alteram = Math.floor(filaJuri.length / 3);
  const candidatosDoEvento = estado.banco.candidatos.filter((c) => c.eventoId === eventoId && c.publicado && !c.desqualificado);
  const votosJuriAuditoria: { usuarioId: string; em: number; alterado: boolean }[] = [];
  filaJuri.forEach((candidatoId, i) => {
    const usuarioId = jurados[i].id;
    const final = temposJuri[i];
    if (i < alteram) {
      const outro = candidatosDoEvento.find((c) => c.id !== candidatoId)?.id ?? candidatoId;
      const primeiro = Math.max(inicioMs, final - (5 + Math.floor(rng() * 10)) * MINUTO);
      estado = aplicarVotoJuri(estado, { eventoId, usuarioId, candidatoId: outro, agoraMs: primeiro });
      votosJuriAuditoria.push({ usuarioId, em: primeiro, alterado: false });
      estado = aplicarVotoJuri(estado, { eventoId, usuarioId, candidatoId, agoraMs: Math.max(final, primeiro + MINUTO) });
      votosJuriAuditoria.push({ usuarioId, em: Math.max(final, primeiro + MINUTO), alterado: true });
    } else {
      estado = aplicarVotoJuri(estado, { eventoId, usuarioId, candidatoId, agoraMs: final });
      votosJuriAuditoria.push({ usuarioId, em: final, alterado: false });
    }
  });

  if (opcoes.auditoria) {
    for (const v of [...votosJuriAuditoria].sort((a, b) => a.em - b.em)) {
      const participacao = estado.banco.participacoes.find((p) => p.usuarioId === v.usuarioId && p.eventoId === eventoId)!;
      const votoJuri = estado.banco.votosJuri.find((vj) => vj.participacaoId === participacao.id)!;
      const historico = estado.banco.historicoVotosJuri.filter((h) => h.votoJuriId === votoJuri.id);
      const entrada = historico.find((h) => paraMs(h.criadoEm) === v.em) ?? historico[historico.length - 1];
      estado = registrarAuditoria(estado, {
        eventoId,
        usuarioId: v.usuarioId,
        acao: v.alterado ? "VOTO_JURI_ALTERADO" : "VOTO_JURI_REGISTRADO",
        entidade: "voto_juri",
        entidadeId: votoJuri.id,
        detalhes: { historicoId: entrada.id },
        ipHash: IP_HASH,
        criadoEm: inst(v.em),
      });
    }
  }

  // 4. Votos infantis por totem (inclusive PAUSADO e REVOGADO: votos históricos, A19).
  if (opcoes.infantil) {
    const filaInfantil = filaDeCandidatos(falta.INFANTIL, `${opcoes.semente}:infantil`);
    const totens: string[] = [];
    for (const [id, n] of Object.entries(opcoes.infantil.votosPorDispositivo)) for (let i = 0; i < n; i++) totens.push(id);
    const filaTotens = embaralharComSemente(totens, `${opcoes.semente}:totens`);
    const temposInfantil = instantesTriangulares(filaInfantil.length, inicioMs, fimMs, rng);
    let seq = estado.banco.sequencias.votoInfantil;
    const novos: VotoInfantil[] = filaInfantil.map((candidatoId, i) => ({
      id: ++seq,
      eventoId,
      candidatoId,
      dispositivoId: filaTotens[i % filaTotens.length],
      criadoEm: inst(temposInfantil[i]),
    }));
    const ultimoUso = new Map<string, Instante>();
    for (const v of novos) ultimoUso.set(v.dispositivoId, v.criadoEm);
    estado = {
      ...estado,
      banco: {
        ...estado.banco,
        sequencias: { ...estado.banco.sequencias, votoInfantil: seq },
        votosInfantis: [...estado.banco.votosInfantis, ...novos],
        dispositivos: estado.banco.dispositivos.map((d) => (ultimoUso.has(d.id) ? { ...d, ultimoUsoEm: ultimoUso.get(d.id)! } : d)),
      },
    };
  }

  return semVinculosDeVolume(estado);
}

/** Primeiro ADMIN do evento (ator das ações de configuração do seed). */
export function adminDoEvento(estado: EstadoApp, eventoId: string): string | null {
  return estado.banco.participacoes.find((p) => p.eventoId === eventoId && p.papel === "ADMIN")?.usuarioId ?? null;
}
