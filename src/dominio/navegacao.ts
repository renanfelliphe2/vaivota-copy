import { rotaVotacao } from "./destinoAcesso";
import type { PapelParticipacao } from "./tipos";

// Cabeçalho fixo (08/10/2026): atalhos por papel no evento. Só links para as páginas, nunca ações.

export type IdAtalho = "DASHBOARD" | "CONFIGURACOES" | "APRESENTACAO" | "VOTAR";
export type Atalho = { id: IdAtalho; href: string; rotulo: string };

/** `votacaoAberta`: "Votar" só aparece com o evento ativo e a urna aberta (votacaoAberta, em situacaoEvento). */
export function atalhosDoPapel(slug: string, papel: PapelParticipacao | null, votacaoAberta: boolean): Atalho[] {
  const admin = `/e/${slug}/admin`;
  if (papel === "ADMIN")
    return [
      { id: "DASHBOARD", href: admin, rotulo: "Dashboard" },
      { id: "CONFIGURACOES", href: `${admin}/configuracao`, rotulo: "Configurações" },
      { id: "APRESENTACAO", href: `${admin}/apresentar`, rotulo: "Apresentação" },
    ];
  if ((papel === "PUBLICO" || papel === "JURADO") && votacaoAberta)
    return [{ id: "VOTAR", href: rotaVotacao(slug), rotulo: "Votar" }];
  return [];
}

/** Dashboard e Votar (seção da entrada) só valem na própria página; os demais valem também nas subpáginas. */
export function atalhoAtual(atalho: Atalho, pathname: string): boolean {
  const caminho = atalho.href.split("#")[0];
  if (atalho.id === "DASHBOARD" || atalho.id === "VOTAR") return pathname === caminho;
  return pathname === caminho || pathname.startsWith(`${caminho}/`);
}
