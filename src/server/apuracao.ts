import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { apurarComCategorias, arredondar6 } from "@/dominio/apuracao";
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

/**
 * Placar bruto do júri pelo modo ativo (mesma regra de `contarJuri`, em `src/dominio/avaliacaoJuri.ts`, agregada no banco).
 * VOTO_UNICO: a escolha atual de cada jurado. MELHOR_POR_CRITERIO: 1 por escolha. NOTAS_POR_CRITERIO: média simples de todas as
 * notas que o candidato recebeu (todos os critérios e jurados), com 6 casas. Só o modo ativo conta; os dados dos outros ficam.
 */
export async function contarVotosJuri(cliente: Cliente, eventoId: string): Promise<Record<string, number>> {
  const placar = await cliente.configPlacar.findUnique({ where: { eventoId }, select: { modoVotoJuri: true } });
  const modo = placar?.modoVotoJuri ?? "VOTO_UNICO";
  if (modo === "NOTAS_POR_CRITERIO") {
    const linhas = await cliente.notaJuri.groupBy({ by: ["candidatoId"], where: { eventoId }, _sum: { nota: true }, _count: { _all: true } });
    return Object.fromEntries(linhas.map((l) => [l.candidatoId, arredondar6((l._sum.nota ?? 0) / l._count._all)]));
  }
  const linhas =
    modo === "MELHOR_POR_CRITERIO"
      ? await cliente.escolhaCriterioJuri.groupBy({ by: ["candidatoId"], where: { eventoId }, _count: { _all: true } })
      : await cliente.votoJuri.groupBy({ by: ["candidatoId"], where: { eventoId }, _count: { _all: true } });
  return Object.fromEntries(linhas.map((l) => [l.candidatoId, l._count._all]));
}

/**
 * Votos infantis por candidato (placar "Escolha das Crianças"). Contam todos os votos do evento, de qualquer totem: o voto de um
 * totem pausado ou revogado depois continua valendo (foi aceito enquanto o aparelho estava ativo).
 */
export async function contarVotosInfantis(cliente: Cliente, eventoId: string): Promise<Record<string, number>> {
  const linhas = await cliente.votoInfantil.groupBy({ by: ["candidatoId"], where: { eventoId }, _count: { _all: true } });
  return Object.fromEntries(linhas.map((l) => [l.candidatoId, l._count._all]));
}

/** Calcula os dados do resultado com o estado atual do banco. */
export async function calcularDadosDoResultado(cliente: Cliente, eventoId: string): Promise<{
  dados: DadosResultado;
  pesos: Record<Grupo, number>;
}> {
  const [evento, placar, candidatos, popular, categorias] = await Promise.all([
    cliente.evento.findUniqueOrThrow({ where: { id: eventoId }, select: { moduloJuri: true, moduloInfantil: true } }),
    cliente.configPlacar.findUniqueOrThrow({ where: { eventoId } }),
    cliente.candidato.findMany({
      where: { eventoId, publicado: true },
      select: { id: true, ordem: true, desqualificado: true, categoriaId: true },
      orderBy: [{ ordem: "asc" }, { id: "asc" }],
    }),
    contarVotosPopulares(cliente, eventoId),
    // Evento com categorias (09/11/2026): o resultado leva também a apuração de cada uma.
    cliente.categoria.findMany({ where: { eventoId }, select: { id: true, nome: true, premio: true }, orderBy: [{ ordem: "asc" }, { id: "asc" }] }),
  ]);
  const gruposAtivos: Grupo[] = ["POPULAR"];
  if (evento.moduloJuri) gruposAtivos.push("JURI");
  if (evento.moduloInfantil) gruposAtivos.push("INFANTIL");
  const pesos: Record<Grupo, number> = { POPULAR: placar.pesoPopular, JURI: placar.pesoJuri, INFANTIL: placar.pesoInfantil };
  const juri = evento.moduloJuri ? await contarVotosJuri(cliente, eventoId) : {};
  const infantil = evento.moduloInfantil ? await contarVotosInfantis(cliente, eventoId) : {};
  const dados = apurarComCategorias(
    {
      candidatos,
      votos: { POPULAR: popular, JURI: juri, INFANTIL: infantil },
      pesos,
      gruposAtivos,
      criterio: placar.regraDesempate,
    },
    categorias,
  );
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
