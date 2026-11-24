import type { Categoria, OpcoesTelao } from "./tipos";

// Telão durante a votação (demanda B2, 25/11/2026): a cena da votação ao vivo mostra uma categoria por vez e passa para a
// próxima a cada n segundos, em loop. Funções puras: a tela e o servidor usam as mesmas regras.

export const TELAO_PADRAO = {
  intervaloSegundos: 15,
  mostrar: { candidatos: true, tempo: true, qr: true, link: true } satisfies OpcoesTelao,
};

export const LIMITES_INTERVALO_TELAO = { min: 5, max: 300 } as const;

export const ROTULOS_OPCOES_TELAO: Record<keyof OpcoesTelao, { rotulo: string; dica: string }> = {
  candidatos: { rotulo: "Candidatos", dica: "Os itens da categoria em tela." },
  tempo: { rotulo: "Tempo", dica: "Quanto falta para a votação terminar." },
  qr: { rotulo: "QR Code", dica: "Leva à página da categoria em tela." },
  link: { rotulo: "Link", dica: "O endereço da página da categoria, por extenso, para quem não lê QR Code." },
};

/** Erros por campo (`intervalo`, `mostrar`); vazio quando está tudo certo. */
export function validarConfigTelao(dados: { intervaloSegundos: number; mostrar: OpcoesTelao }): Record<string, string> {
  const erros: Record<string, string> = {};
  const { min, max } = LIMITES_INTERVALO_TELAO;
  if (!Number.isInteger(dados.intervaloSegundos) || dados.intervaloSegundos < min || dados.intervaloSegundos > max)
    erros.intervalo = `Use de ${min} a ${max} segundos.`;
  if (!Object.values(dados.mostrar).some(Boolean)) erros.mostrar = "Marque ao menos uma opção.";
  return erros;
}

/**
 * A categoria em tela agora: entram no ciclo as que têm item (as do totem também), na ordem do evento. O índice sai do relógio
 * (`agoraMs`), não de um estado: telões abertos em aparelhos diferentes mostram a mesma categoria, e recarregar a página não
 * volta para a primeira. null sem nenhuma categoria com item.
 */
export function categoriaDoTelao<T extends Pick<Categoria, "id">>(
  categorias: readonly T[],
  idsComItens: ReadonlySet<string>,
  agoraMs: number,
  intervaloSegundos: number,
): { categoria: T; indice: number; total: number } | null {
  const ciclo = categorias.filter((c) => idsComItens.has(c.id));
  if (ciclo.length === 0) return null;
  const passo = Math.max(1, intervaloSegundos) * 1000;
  const indice = Math.floor(agoraMs / passo) % ciclo.length;
  return { categoria: ciclo[indice], indice, total: ciclo.length };
}

/** "vaivota.space/e/festival/mostra" (sem o protocolo nem a barra final): o link por extenso do telão. */
export function linkPorExtenso(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
