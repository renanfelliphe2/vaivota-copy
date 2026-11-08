import { LogoEvento } from "@/components/evento/LogoEvento";
import { corTextoSobre } from "@/lib/contraste";

/**
 * Logo do evento numa placa branca ou, sem logo, a inicial na cor do evento (texto na cor que passa de 4,5:1 sobre ela).
 * Decorativa: quem usa mostra o nome do evento logo ao lado. Na landing: eventos no ar e resultados.
 */
export function MarcaDoEvento({ nome, corPrimaria, logoUrl }: { nome: string; corPrimaria: string | null; logoUrl: string | null }) {
  if (logoUrl) {
    return (
      <span aria-hidden className="flex h-14 w-20 shrink-0 items-center justify-center rounded-2xl bg-white p-2 ring-1 ring-tema-borda">
        <LogoEvento nome={nome} logoUrl={logoUrl} className="h-auto max-h-10 w-auto max-w-full object-contain" />
      </span>
    );
  }
  const fundo = corPrimaria ?? "#054573";
  return (
    <span
      aria-hidden
      className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold"
      style={{ backgroundColor: fundo, color: corTextoSobre(fundo, ["#ffffff", "#0b1f33"]) }}
    >
      {nome.trim().charAt(0).toLocaleUpperCase("pt-BR") || "?"}
    </span>
  );
}
