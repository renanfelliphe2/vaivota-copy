import "server-only";
import type { EstadoPublico, EventoPublico, UsuarioPublico } from "@/dominio/estadoPublico";
import { db } from "./db";
import { env } from "./env";
import {
  apresentacaoParaDominio,
  campoParaDominio,
  candidatoParaDominio,
  eventoParaDominio,
  participacaoParaDominio,
  placarParaDominio,
  temaParaDominio,
} from "./mapeadores";
import type { UsuarioSessao } from "./sessao";

// MVP Semana Tech (seção 3, "leitura pública"): o servidor monta o estado já filtrado.
//  - Visitante e público: eventos ATIVO e CONCLUIDO com candidatos publicados; rascunho aparece só como "em breve"
//    (tema e nome), sem candidatos.
//  - Admin do evento: também o rascunho completo, com todos os candidatos (inclusive os não publicados).
//  - Sempre só a participação da própria pessoa.
// O trecho comum a todos (eventos e candidatos publicados) fica em cache curto por instância: o polling do público
// não vira uma consulta por pessoa. O trecho do admin e a participação nunca passam pelo cache.

const CACHE_MS = 3000;

type EventoComTudo = Awaited<ReturnType<typeof carregarEventos>>[number];
type Snapshot = { geradoEm: number; eventos: EventoComTudo[]; candidatosPublicados: Awaited<ReturnType<typeof carregarCandidatosPublicados>> };

const global = globalThis as unknown as { __vaivotaSnapshot?: Snapshot };

function carregarEventos(ids?: string[]) {
  return db().evento.findMany({
    ...(ids ? { where: { id: { in: ids } } } : {}),
    include: { tema: true, configPlacar: true, configApresentacao: true, camposCandidato: true },
    orderBy: { criadoEm: "asc" },
  });
}

function carregarCandidatosPublicados(eventoIds: string[]) {
  return db().candidato.findMany({
    where: { eventoId: { in: eventoIds }, publicado: true },
    orderBy: [{ ordem: "asc" }, { id: "asc" }],
  });
}

async function snapshot(agoraMs: number): Promise<Snapshot> {
  const atual = global.__vaivotaSnapshot;
  if (atual && agoraMs - atual.geradoEm < CACHE_MS) return atual;
  const eventos = await carregarEventos();
  const candidatosPublicados = await carregarCandidatosPublicados(eventos.map((e) => e.id));
  global.__vaivotaSnapshot = { geradoEm: agoraMs, eventos, candidatosPublicados };
  return global.__vaivotaSnapshot;
}

/** Depois de qualquer mudança de evento ou candidato nesta instância: a próxima leitura vai ao banco. */
export function invalidarEstadoPublico(): void {
  global.__vaivotaSnapshot = undefined;
}

export async function montarEstadoPublico(usuario: UsuarioSessao | null, agoraMs = Date.now()): Promise<EstadoPublico> {
  const [participacoes, fotoComum] = await Promise.all([
    usuario ? db().participacao.findMany({ where: { usuarioId: usuario.id } }) : Promise.resolve([]),
    snapshot(agoraMs),
  ]);
  const adminDe = new Set(participacoes.filter((p) => p.papel === "ADMIN").map((p) => p.eventoId));

  // Admin vê tudo do evento que administra, SEM cache: acabou de abrir a urna ou salvar um candidato e espera ver na hora
  // (outra instância poderia devolver a foto de até 3 s atrás e parecer que a ação falhou).
  const [candidatosDoAdmin, eventosDoAdmin] = adminDe.size
    ? await Promise.all([
        db().candidato.findMany({ where: { eventoId: { in: [...adminDe] } }, orderBy: [{ ordem: "asc" }, { id: "asc" }] }),
        carregarEventos([...adminDe]),
      ])
    : [[], []];
  const frescos = new Map(eventosDoAdmin.map((e) => [e.id, e]));

  const eventos: EventoPublico[] = [];
  for (const doCache of fotoComum.eventos) {
    const e = frescos.get(doCache.id) ?? doCache;
    if (!e.tema || !e.configPlacar || !e.configApresentacao) continue; // evento sem configuração completa não vai ao ar
    const ehAdmin = adminDe.has(e.id);
    const rascunho = e.estado === "RASCUNHO";
    const fuso = e.fusoHorario;
    const linhas = ehAdmin
      ? candidatosDoAdmin.filter((c) => c.eventoId === e.id)
      : rascunho
        ? []
        : fotoComum.candidatosPublicados.filter((c) => c.eventoId === e.id);
    const minha = participacoes.find((p) => p.eventoId === e.id);
    const evento = eventoParaDominio(e);
    // Sem credencial do Google configurada, a tela não oferece o botão (nem trata o evento como "só Google").
    if (!env.googleAtivo && evento.metodoIdentificacao === "GOOGLE_OU_EMAIL") evento.metodoIdentificacao = "SOMENTE_EMAIL";
    eventos.push({
      evento,
      tema: temaParaDominio(e.tema, fuso),
      configPlacar: placarParaDominio(e.configPlacar, fuso),
      configApresentacao: apresentacaoParaDominio(e.configApresentacao, fuso),
      camposCandidato: [...e.camposCandidato].sort((a, b) => a.ordem - b.ordem).map(campoParaDominio),
      candidatos: linhas.map((c) => candidatoParaDominio(c, fuso, usuario?.id ?? null)),
      participacao: minha ? participacaoParaDominio(minha) : null,
    });
  }

  return { agoraMs, usuario: usuario ? perfilDe(usuario) : null, eventos };
}

function perfilDe(usuario: UsuarioSessao): UsuarioPublico {
  return { id: usuario.id, nome: usuario.nome, email: usuario.email, emailVerificado: usuario.emailVerificado };
}
