import { argumento, temFlag } from "./_ambiente";
import { db, desconectarBanco } from "@/server/db";

// ST6: remove os dados do ensaio antes do evento e devolve o evento ao estado inicial (rascunho, urna não iniciada).
// `pnpm db:limpar-ensaio --slug maratona-tech-tivit --confirmar`
//   apaga: votos, resultados oficiais, auditoria, participações do público e as contas que ficaram sem participação
//          (as do ensaio), mais os contadores de limite de taxa e os códigos de e-mail pendentes.
//   mantém: o evento, o tema, os campos extras, os admins (e suas contas) e os candidatos (a menos que --remover-candidatos).
// Sem --confirmar, só mostra o que seria apagado.

async function main() {
  const slug = argumento("slug") ?? process.env.SEED_SLUG ?? "maratona-tech-tivit";
  const confirmar = temFlag("confirmar");
  const removerCandidatos = temFlag("remover-candidatos");
  const evento = await db().evento.findUnique({ where: { slug }, select: { id: true, estado: true, estadoUrna: true } });
  if (!evento) throw new Error(`Evento "${slug}" não existe.`);

  // Proteção: este script é só do ENSAIO. Com a urna aberta ou o evento concluído (ou seja, com votos reais possíveis), recusa.
  if ((evento.estadoUrna === "ABERTA" || evento.estado === "CONCLUIDO") && !temFlag("forcar-mesmo-com-votos-reais"))
    throw new Error(
      `Recusado: o evento está com a urna ${evento.estadoUrna} e estado ${evento.estado}. Isto apagaria votos que podem ser REAIS. Se tem certeza, use --forcar-mesmo-com-votos-reais.`,
    );

  const contagens = {
    votos: await db().voto.count({ where: { eventoId: evento.id } }),
    resultados: await db().resultadoOficial.count({ where: { eventoId: evento.id } }),
    auditoria: await db().auditoria.count({ where: { eventoId: evento.id } }),
    participacoesDoPublico: await db().participacao.count({ where: { eventoId: evento.id, papel: { not: "ADMIN" } } }),
    candidatos: removerCandidatos ? await db().candidato.count({ where: { eventoId: evento.id } }) : 0,
  };
  console.info(`Evento ${slug} (${evento.estado}, urna ${evento.estadoUrna}). Seria apagado:`, contagens);
  if (!confirmar) {
    console.info("Nada foi apagado. Rode de novo com --confirmar para limpar.");
    return;
  }

  const apagadas = await db().$transaction(async (tx) => {
    await tx.voto.deleteMany({ where: { eventoId: evento.id } });
    await tx.resultadoOficial.deleteMany({ where: { eventoId: evento.id } });
    await tx.auditoria.deleteMany({ where: { eventoId: evento.id } });
    await tx.participacao.deleteMany({ where: { eventoId: evento.id, papel: { not: "ADMIN" } } });
    if (removerCandidatos) await tx.candidato.deleteMany({ where: { eventoId: evento.id } });
    else await tx.candidato.updateMany({ where: { eventoId: evento.id }, data: { desqualificado: false } });
    // Contas do ensaio: sem nenhuma participação e sem ser dono de resultado. Sessões e contas saem em cascata.
    const contas = await tx.usuario.deleteMany({ where: { participacoes: { none: {} } } });
    await tx.rateLimit.deleteMany({});
    await tx.verification.deleteMany({});
    await tx.evento.update({
      where: { id: evento.id },
      data: { estado: "RASCUNHO", estadoUrna: "NAO_INICIADA", urnaAbertaEm: null, urnaEncerradaEm: null, concluidoEm: null },
    });
    return contas.count;
  });
  console.info(`Pronto. Contas de ensaio removidas: ${apagadas}. O evento voltou a rascunho com a urna não iniciada.`);
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => desconectarBanco());
