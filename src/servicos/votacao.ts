import type { ResultadoEnvioVoto } from "@/dominio/tipos";
import { obterAmbiente } from "@/store/ambiente";
import { chamar } from "./rpc";
import { falha, type Resultado } from "./resultado";

// ST3: votação popular. Toda regra (urna, papel, voto único, sigilo) mora no servidor (src/server/votacao.ts). Aqui só a
// chamada e o espelho do `votou` no estado do navegador, para a tela trocar sozinha para "seu voto foi registrado".

type EntradaVoto = { eventoId: string; candidatoId: string };

/** Marca a participação da própria pessoa como "já votou" no estado do navegador (o servidor já gravou). */
function marcarVotou(eventoId: string): void {
  obterAmbiente().store.atualizar((e) => {
    const usuarioId = e.sessao.usuarioId;
    if (!usuarioId) return e;
    const alvo = e.banco.participacoes.find((p) => p.usuarioId === usuarioId && p.eventoId === eventoId);
    if (!alvo || alvo.votou) return e;
    return {
      ...e,
      banco: { ...e.banco, participacoes: e.banco.participacoes.map((p) => (p === alvo ? { ...p, votou: true } : p)) },
    };
  });
}

/**
 * Voto do público. `REDE` (falha de conexão, tempo esgotado ou erro de gateway) significa "pode ter gravado": a tela só
 * reenvia depois de `consultarEstadoVoto`.
 */
export async function votarPopular(entrada: EntradaVoto): Promise<Resultado<{ resultado: "REGISTRADO" }>> {
  const r = await chamar<{ resultado: "REGISTRADO" }>("votarPopular", entrada, { tempoMs: 15_000 });
  if (r.ok) marcarVotou(entrada.eventoId);
  // O servidor já recusou por voto repetido: o estado local também passa a saber.
  else if (r.erro.codigo === "JA_VOTOU") marcarVotou(entrada.eventoId);
  return r;
}

/** Voto do júri: fica para o MVP do Festival. */
export async function votarJuri(entrada: EntradaVoto): Promise<Resultado<{ resultado: ResultadoEnvioVoto }>> {
  void entrada;
  return falha("PAPEL_INVALIDO", { detalhe: "votarJuri não existe no MVP da Maratona Tech Tivit" });
}

/**
 * Estado real do voto (verificação depois de erro de rede). Diz só SE a pessoa votou, nunca em quem
 * (`candidatoAtualId` existe para o jurado do Festival e aqui vem sempre nulo).
 */
export async function consultarEstadoVoto(e: { eventoId: string }): Promise<Resultado<{ votou: boolean; candidatoAtualId: string | null }>> {
  const r = await chamar<{ votou: boolean; candidatoAtualId: string | null }>("consultarEstadoVoto", e, { tempoMs: 10_000 });
  if (r.ok && r.dados.votou) marcarVotou(e.eventoId);
  return r;
}
