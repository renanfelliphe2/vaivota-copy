import { obterAmbiente } from "./ambiente";

// Diálogo de acesso do cabeçalho (08/10/2026): única escrita em `ui.acesso`. O cabeçalho abre pelos botões
// Entrar / Criar conta; a entrada do evento abre sozinha quando o visitante chega para entrar (`?de=`, `#acesso`).

export function abrirAcesso(aba: "entrar" | "criar", de?: string): void {
  obterAmbiente().store.atualizar((e) => ({ ...e, ui: { ...e.ui, acesso: { aba, ...(de ? { de } : {}) } } }));
}

export function fecharAcesso(): void {
  obterAmbiente().store.atualizar((e) => (e.ui.acesso === null ? e : { ...e, ui: { ...e.ui, acesso: null } }));
}
