import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { apurar } from "@/dominio/apuracao";
import type { DadosResultado, Grupo, MotivoResultado } from "@/dominio/tipos";
import type { Banco, Transacao } from "./db";

// ST4: a apuração é a MESMA função pura do protótipo (`src/dominio/apuracao.ts`); aqui só se alimentam as entradas com
// as contagens do banco. A leitura nunca recalcula: telas, CSV e relatório leem a maior versão do resultado oficial.

type Cliente = Banco | Transacao;

/** Votos populares por candidato, direto do banco (`COUNT` agrupado). */
export async function contarVotosPopulares(cliente: Cliente, eventoId: string): Promise<Record<string, number>> {
  const linhas = await cliente.voto.groupBy({ by: ["candidatoId"], where: { eventoId }, _count: { _all: true } });
  return Object.fromEntries(linhas.map((l) => [l.candidatoId, l._count._all]));
}

/** Calcula os dados do resultado com o estado atual do banco. Na Semana Tech só o grupo POPULAR conta (peso 100). */
export async function calcularDadosDoResultado(cliente: Cliente, eventoId: string): Promise<{
  dados: DadosResultado;
  pesos: Record<Grupo, number>;
}> {
  const [evento, placar, candidatos, popular] = await Promise.all([
    cliente.evento.findUniqueOrThrow({ where: { id: eventoId }, select: { moduloJuri: true, moduloInfantil: true } }),
    cliente.configPlacar.findUniqueOrThrow({ where: { eventoId } }),
    cliente.candidato.findMany({
      where: { eventoId, publicado: true },
      select: { id: true, ordem: true, desqualificado: true },
      orderBy: [{ ordem: "asc" }, { id: "asc" }],
    }),
    contarVotosPopulares(cliente, eventoId),
  ]);
  const gruposAtivos: Grupo[] = ["POPULAR"];
  if (evento.moduloJuri) gruposAtivos.push("JURI");
  if (evento.moduloInfantil) gruposAtivos.push("INFANTIL");
  const pesos: Record<Grupo, number> = { POPULAR: placar.pesoPopular, JURI: placar.pesoJuri, INFANTIL: placar.pesoInfantil };
  const dados = apurar({
    candidatos,
    // JURI e INFANTIL ficam para o Festival: sem módulo, sem votos.
    votos: { POPULAR: popular, JURI: {}, INFANTIL: {} },
    pesos,
    gruposAtivos,
    criterio: placar.regraDesempate,
  });
  return { dados, pesos };
}

/**
 * Acrescenta o resultado oficial como a versão seguinte (maior + 1). Chamado dentro da transação do encerramento (versão 1,
 * ENCERRAMENTO) e da desqualificação (nova versão, DESQUALIFICACAO). Não audita: quem chamou já audita.
 */
export async function congelarResultado(
  tx: Transacao,
  eventoId: string,
  motivo: MotivoResultado,
  calculadoPorId: string | null,
): Promise<{ versao: number }> {
  const { dados, pesos } = await calcularDadosDoResultado(tx, eventoId);
  const maior = await tx.resultadoOficial.aggregate({ where: { eventoId }, _max: { versao: true } });
  const versao = (maior._max.versao ?? 0) + 1;
  await tx.resultadoOficial.create({
    data: {
      eventoId,
      versao,
      motivo,
      pesoPopular: pesos.POPULAR,
      pesoJuri: pesos.JURI,
      pesoInfantil: pesos.INFANTIL,
      dados: dados as unknown as Prisma.InputJsonValue,
      calculadoPorId,
    },
  });
  return { versao };
}
