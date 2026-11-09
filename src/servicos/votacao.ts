import type { ResultadoEnvioVoto } from "@/dominio/tipos";
import { obterAmbiente } from "@/store/ambiente";
import { chamar } from "./rpc";
import type { Resultado } from "./resultado";

// ST3: votação popular. Toda regra (urna, papel, voto único, sigilo) mora no servidor (src/server/votacao.ts). Aqui só a
// chamada e o espelho do `votou` no estado do navegador, para a tela trocar sozinha para "seu voto foi registrado".
// Evento com categorias (09/11/2026): o servidor tira a categoria do item; aqui ela só serve para o espelho local
// (`categoriasVotadas`), para a página da categoria trocar sozinha para "você já votou nesta categoria".

type EntradaVoto = { eventoId: string; candidatoId: string };

/** O que o servidor diz do voto da própria pessoa: SE votou (e em quais categorias), nunca em quem. */
export type EstadoVoto = { votou: boolean; candidatoAtualId: string | null; categoriasVotadas: string[] };

/**
 * Marca a participação da própria pessoa como "já votou" no estado do navegador (o servidor já gravou). Com categorias,
 * acrescenta as categorias informadas às já votadas.
 */
export function marcarVotou(eventoId: string, categorias: readonly string[] = []): void {
  obterAmbiente().store.atualizar((e) => {
    const usuarioId = e.sessao.usuarioId;
    if (!usuarioId) return e;
    const alvo = e.banco.participacoes.find((p) => p.usuarioId === usuarioId && p.eventoId === eventoId);
    if (!alvo) return e;
    const atuais = alvo.categoriasVotadas ?? [];
    const novas = categorias.filter((c) => !atuais.includes(c));
    if (alvo.votou && novas.length === 0) return e;
    const atualizada = { ...alvo, votou: true, categoriasVotadas: [...atuais, ...novas] };
    return {
      ...e,
      banco: { ...e.banco, participacoes: e.banco.participacoes.map((p) => (p === alvo ? atualizada : p)) },
    };
  });
}

/**
 * Voto do público. `REDE` (falha de conexão, tempo esgotado ou erro de gateway) significa "pode ter gravado": a tela só
 * reenvia depois de `consultarEstadoVoto`. `categoriaId`: a categoria do item, só para o espelho local.
 */
export async function votarPopular(entrada: EntradaVoto, categoriaId: string | null = null): Promise<Resultado<{ resultado: "REGISTRADO" }>> {
  const r = await chamar<{ resultado: "REGISTRADO" }>("votarPopular", entrada, { tempoMs: 15_000 });
  const categorias = categoriaId ? [categoriaId] : [];
  if (r.ok) marcarVotou(entrada.eventoId, categorias);
  // O servidor já recusou por voto repetido: o estado local também passa a saber.
  else if (r.erro.codigo === "JA_VOTOU") marcarVotou(entrada.eventoId, categorias);
  return r;
}

/**
 * Voto único do júri (identificado, alterável com a urna aberta). Salvar é idempotente: repetir o mesmo candidato devolve
 * SEM_ALTERACAO, então reenviar depois de `REDE` é seguro (mesmo assim a tela consulta o estado real antes).
 */
export async function votarJuri(entrada: EntradaVoto): Promise<Resultado<{ resultado: ResultadoEnvioVoto }>> {
  const r = await chamar<{ resultado: ResultadoEnvioVoto }>("votarJuri", entrada, { tempoMs: 15_000 });
  if (r.ok) marcarVotou(entrada.eventoId);
  return r;
}

/**
 * Estado real do voto (verificação depois de erro de rede e "Seu voto atual" do jurado). Para o público diz só SE votou (e,
 * com categorias, em quais), nunca em quem; `candidatoAtualId` é o voto único atual do jurado (nulo para o público e nos
 * modos por critério).
 */
export async function consultarEstadoVoto(e: { eventoId: string }): Promise<Resultado<EstadoVoto>> {
  const r = await chamar<EstadoVoto>("consultarEstadoVoto", e, { tempoMs: 10_000 });
  if (r.ok && r.dados.votou) marcarVotou(e.eventoId, r.dados.categoriasVotadas ?? []);
  return r;
}
