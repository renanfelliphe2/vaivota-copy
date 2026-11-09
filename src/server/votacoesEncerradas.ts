import "server-only";
import type { DadosResultado } from "@/dominio/tipos";
import { comTotal, idsDosVencedores, idsDosVencedoresPorCategoria, ordenarVotacoes, type VotacaoEncerrada } from "@/dominio/votacoesEncerradas";
import { db } from "./db";

// Landing da plataforma (07/11/2026): participantes e votos de cada evento com a urna ENCERRADA e, com o evento CONCLUIDO,
// o vencedor, para qualquer visitante. Sai só o agregado: totais por grupo e o primeiro lugar do resultado oficial (maior
// versão, sem recalcular). Nunca a contagem por candidato, nomes de quem votou ou de jurados. Com a urna encerrada e o
// evento ainda ativo, o vencedor fica de fora: a organização pode estar guardando o resultado para a revelação no telão
// (ver dominio/votacoesEncerradas.ts).
//
// Cache curto por instância, como o do estado público: a landing não vira cinco consultas por visita. Uma urna recém-
// encerrada ou um evento recém-concluído aparecem em até um minuto.

const CACHE_MS = 60_000;

type Foto = { geradoEm: number; votacoes: VotacaoEncerrada[] };

const global = globalThis as unknown as { __vaivotaVotacoesEncerradas?: Foto };

export async function listarVotacoesEncerradas(agoraMs = Date.now()): Promise<VotacaoEncerrada[]> {
  const atual = global.__vaivotaVotacoesEncerradas;
  if (atual && agoraMs - atual.geradoEm < CACHE_MS) return atual.votacoes;
  const votacoes = await carregar();
  global.__vaivotaVotacoesEncerradas = { geradoEm: agoraMs, votacoes };
  return votacoes;
}

/** Para os testes e para quem acabou de encerrar a urna ou concluir um evento nesta instância. */
export function invalidarVotacoesEncerradas(): void {
  global.__vaivotaVotacoesEncerradas = undefined;
}

async function carregar(): Promise<VotacaoEncerrada[]> {
  const eventos = await db().evento.findMany({
    where: { estado: { not: "RASCUNHO" }, estadoUrna: "ENCERRADA", tema: { isNot: null } },
    select: {
      id: true,
      slug: true,
      nome: true,
      local: true,
      estado: true,
      fusoHorario: true,
      moduloJuri: true,
      moduloInfantil: true,
      concluidoEm: true,
      urnaEncerradaEm: true,
      atualizadoEm: true,
      tema: { select: { nomeExibicao: true, logoUrl: true, corPrimaria: true, corSecundaria: true, rotuloCandidato: true } },
      resultados: { orderBy: { versao: "desc" }, take: 1, select: { dados: true } },
    },
  });
  if (eventos.length === 0) return [];

  const ids = eventos.map((e) => e.id);
  // O vencedor só é lido de evento concluído: o do ainda ativo nem sai do banco. Evento com categorias (09/11/2026): o primeiro
  // lugar de cada categoria (`vencedores` junta todos, para as imagens).
  const concluidos = eventos.filter((e) => e.estado === "CONCLUIDO");
  const dadosDe = (e: (typeof eventos)[number]) => (e.resultados[0]?.dados as DadosResultado | null) ?? null;
  const porCategoriaDe = new Map(concluidos.map((e) => [e.id, idsDosVencedoresPorCategoria(dadosDe(e))]));
  const vencedoresDe = new Map<string, string[]>(
    concluidos.map((e) => {
      const porCategoria = porCategoriaDe.get(e.id);
      return [e.id, porCategoria ? [...new Set(porCategoria.flatMap((c) => c.ids))] : idsDosVencedores(dadosDe(e)?.ranking)];
    }),
  );
  const [participacoes, votos, infantis, candidatos] = await Promise.all([
    db().participacao.groupBy({
      by: ["eventoId", "papel", "votou"],
      where: { eventoId: { in: ids }, papel: { in: ["PUBLICO", "JURADO"] } },
      _count: { _all: true },
    }),
    db().voto.groupBy({ by: ["eventoId"], where: { eventoId: { in: ids } }, _count: { _all: true } }),
    db().votoInfantil.groupBy({ by: ["eventoId"], where: { eventoId: { in: ids } }, _count: { _all: true } }),
    vencedoresDe.size
      ? db().candidato.findMany({
          where: { id: { in: [...vencedoresDe.values()].flat() } },
          select: { id: true, eventoId: true, titulo: true, imagemUrl: true },
        })
      : Promise.resolve([]),
  ]);

  const votacoes: VotacaoEncerrada[] = [];
  for (const e of eventos) {
    if (!e.tema) continue;
    const doEvento = participacoes.filter((p) => p.eventoId === e.id);
    const idsVencedores = vencedoresDe.get(e.id);
    const encerradaEm = e.urnaEncerradaEm ?? e.atualizadoEm;
    votacoes.push({
      eventoId: e.id,
      slug: e.slug,
      nome: e.tema.nomeExibicao?.trim() || e.nome,
      local: e.local,
      encerradaEmMs: encerradaEm.getTime(),
      concluidaEmMs: e.estado === "CONCLUIDO" ? (e.concluidoEm ?? encerradaEm).getTime() : null,
      fusoHorario: e.fusoHorario,
      tema: { corPrimaria: e.tema.corPrimaria, corSecundaria: e.tema.corSecundaria, logoUrl: e.tema.logoUrl },
      rotuloCandidato: e.tema.rotuloCandidato,
      participantes: doEvento.reduce((s, p) => s + p._count._all, 0),
      votos: comTotal({
        publico: votos.find((v) => v.eventoId === e.id)?._count._all ?? 0,
        juri: doEvento.filter((p) => p.papel === "JURADO" && p.votou).reduce((s, p) => s + p._count._all, 0),
        infantil: infantis.find((v) => v.eventoId === e.id)?._count._all ?? 0,
      }),
      modulos: { juri: e.moduloJuri, infantil: e.moduloInfantil },
      vencedores: idsVencedores
        ? idsVencedores
            .map((id) => candidatos.find((c) => c.id === id && c.eventoId === e.id))
            .filter((c) => c !== undefined)
            .map((c) => ({ id: c.id, titulo: c.titulo, imagemUrl: c.imagemUrl }))
        : null,
      vencedoresPorCategoria:
        porCategoriaDe.get(e.id)?.map((c) => ({
          categoria: c.categoria,
          vencedores: c.ids
            .map((id) => candidatos.find((x) => x.id === id && x.eventoId === e.id))
            .filter((x) => x !== undefined)
            .map((x) => ({ id: x.id, titulo: x.titulo, imagemUrl: x.imagemUrl })),
        })) ?? null,
    });
  }
  return ordenarVotacoes(votacoes);
}
