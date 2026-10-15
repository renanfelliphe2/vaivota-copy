import { argumento } from "./_ambiente";
import { db, desconectarBanco } from "@/server/db";

// ST6: depois do teste de carga, confere a integridade: nenhum voto duplicado, votos = participações que votaram, e o
// total por projeto soma o total de votos. `pnpm db:carga-conferir [--slug carga-teste]`.

async function main() {
  const slug = argumento("slug") ?? "carga-teste";
  const evento = await db().evento.findUnique({ where: { slug }, select: { id: true } });
  if (!evento) throw new Error(`Evento ${slug} não existe.`);
  const votos = await db().voto.count({ where: { eventoId: evento.id } });
  const votaram = await db().participacao.count({ where: { eventoId: evento.id, votou: true } });
  const porProjeto = await db().voto.groupBy({ by: ["candidatoId"], where: { eventoId: evento.id }, _count: { _all: true } });
  const somaProjetos = porProjeto.reduce((s, l) => s + l._count._all, 0);
  const repetidos = await db().$queryRaw<{ n: bigint }[]>`
    SELECT count(*)::bigint AS n FROM (SELECT hash_recibo FROM voto GROUP BY hash_recibo HAVING count(*) > 1) t`;

  console.info({ votos, participacoesQueVotaram: votaram, somaPorProjeto: somaProjetos, recibosRepetidos: Number(repetidos[0].n) });
  const ok = votos === votaram && votos === somaProjetos && Number(repetidos[0].n) === 0;
  console.info(ok ? "OK: nenhum voto duplicado ou perdido." : "FALHA: os números não conferem!");
  if (!ok) process.exitCode = 1;
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => desconectarBanco());
