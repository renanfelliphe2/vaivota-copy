import type { DadosCandidato } from "@/dominio/validacoesConfig";
import { recarregarEstado } from "@/store/servidor";
import { chamar } from "./rpc";
import { falha, type Resultado } from "./resultado";

// ST2: candidatos (os "projetos") e campos extras do evento. Só o admin do evento chama; o servidor revalida tudo
// (src/server/candidatos.ts). Depois de cada ação o estado público é recarregado: a lista da tela e a do público
// mudam na hora.

async function comRecarga<T>(chamada: Promise<Resultado<T>>): Promise<Resultado<T>> {
  const r = await chamada;
  if (r.ok) await recarregarEstado();
  return r;
}

export function criarCandidato(eventoId: string, dados: DadosCandidato): Promise<Resultado<{ id: string }>> {
  return comRecarga(chamar<{ id: string }>("criarCandidato", { eventoId, dados }));
}

/** Nunca altera `publicado`, `desqualificado` nem `ordem`. Com a urna aberta ou encerrada, o servidor audita a correção. */
export function salvarCandidato(eventoId: string, candidatoId: string, dados: DadosCandidato, motivo?: string): Promise<Resultado<null>> {
  return comRecarga(chamar<null>("salvarCandidato", { eventoId, candidatoId, dados, motivo }));
}

/** Colocar ou tirar da votação. Colocar exige imagem. */
export function alterarPublicacao(eventoId: string, candidatoId: string, publicado: boolean): Promise<Resultado<null>> {
  return comRecarga(chamar<null>("alterarPublicacao", { eventoId, candidatoId, publicado }));
}

/** Troca a `ordem` com o vizinho e reindexa (1..n). Livre até concluir. */
export function reordenarCandidato(eventoId: string, candidatoId: string, direcao: "SUBIR" | "DESCER"): Promise<Resultado<null>> {
  return comRecarga(chamar<null>("reordenarCandidato", { eventoId, candidatoId, direcao }));
}

/** Recusa (CONFLITO) se o candidato tem qualquer voto. */
export function removerCandidato(eventoId: string, candidatoId: string): Promise<Resultado<null>> {
  return comRecarga(chamar<null>("removerCandidato", { eventoId, candidatoId }));
}

/** Irreversível. Com a urna encerrada, gera nova versão do resultado (DESQUALIFICACAO). */
export function desqualificarCandidato(eventoId: string, candidatoId: string, motivo: string): Promise<Resultado<null>> {
  return comRecarga(chamar<null>("desqualificarCandidato", { eventoId, candidatoId, motivo }));
}

export type CampoEditado = { chave?: string; rotulo: string };

/** Cria, renomeia, reordena e remove campos extras. Remover apaga os valores nos candidatos na mesma operação. */
export function salvarCamposExtras(eventoId: string, campos: CampoEditado[], motivo?: string): Promise<Resultado<null>> {
  return comRecarga(chamar<null>("salvarCamposExtras", { eventoId, campos, motivo }));
}

/**
 * Envia a imagem de um candidato (PNG, JPG ou WebP, até 2 MB). O servidor confere tipo e tamanho e grava no Storage;
 * devolve a URL pública para o formulário guardar em `imagemUrl`.
 */
export async function enviarImagemCandidato(eventoId: string, arquivo: File): Promise<Resultado<{ url: string }>> {
  const corpo = new FormData();
  corpo.set("eventoId", eventoId);
  corpo.set("arquivo", arquivo);
  try {
    const resposta = await fetch("/api/candidatos/imagem", {
      method: "POST",
      body: corpo,
      credentials: "same-origin",
      signal: AbortSignal.timeout(45_000),
    });
    const json = (await resposta.json().catch(() => null)) as Resultado<{ url: string }> | null;
    if (json && (json.ok === true || json.ok === false)) return json;
    return falha("ERRO_INTERNO", { detalhe: `upload: HTTP ${resposta.status}` });
  } catch {
    return falha("REDE");
  }
}
