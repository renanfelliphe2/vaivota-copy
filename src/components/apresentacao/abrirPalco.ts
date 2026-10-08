// 08/10/2026: "Apresentar" abre o palco numa aba própria, que vai para o monitor do telão (tela estendida), enquanto
// a sala de controle e o resto do sistema seguem na aba do admin. As abas ficam sincronizadas (store/sincronizarAbas).

import { idDestaAba } from "@/store/sincronizarAbas";

/** Nome da aba do telão: "Apresentar" sempre usa a mesma, em vez de abrir uma nova a cada clique. */
export const NOME_ABA_PALCO = "vaivota-telao";

export type AberturaPalco = "ABERTA" | "FOCADA" | "BLOQUEADA";

/** Rota do palco. O modo (e o cenário do ensaio) vão na URL: trocar de modo na sala e apresentar de novo recarrega o telão. */
export function rotaPalco(slug: string, modo: { tipo: "REAL" } | { tipo: "ENSAIO"; cenarioId: string }): string {
  const busca = modo.tipo === "REAL" ? "modo=real" : `modo=ensaio&cenario=${encodeURIComponent(modo.cenarioId)}`;
  return `/e/${slug}/admin/apresentar/palco?${busca}`;
}

/**
 * Abre o palco na aba do telão. Se ela já mostra este mesmo palco, só a traz para a frente: navegar de novo
 * recarregaria a página e tiraria o telão da tela cheia no meio da cerimônia.
 */
export function abrirPalco(href: string): AberturaPalco {
  // O nome da janela sobrevive à navegação: uma aba que já foi o telão e voltou a ser usada como sala (ex.: caiu no
  // login e o admin entrou por ela) ainda se chama assim. Sem largar o nome, o window.open devolveria esta própria
  // aba, que recarregaria, perderia o estado em memória e voltaria ao login a cada "Apresentar".
  if (window.name === NOME_ABA_PALCO) window.name = "";
  const aba = window.open("", NOME_ABA_PALCO);
  if (!aba) return "BLOQUEADA";
  const destino = new URL(href, window.location.href);
  let mesmoPalco = false;
  try {
    mesmoPalco = aba.location.pathname + aba.location.search === destino.pathname + destino.search;
  } catch {
    // Outra origem na aba (não acontece no protótipo): navega.
  }
  // A aba do telão pega o estado (e a sessão) desta aba, não de outra que responda antes (sincronizarAbas).
  const mae = idDestaAba();
  if (mae) destino.hash = `mae=${encodeURIComponent(mae)}`;
  if (!mesmoPalco) aba.location.href = destino.href;
  aba.focus();
  return mesmoPalco ? "FOCADA" : "ABERTA";
}
