import type { Metadata } from "next";
import { EventoShell } from "@/components/evento/EventoShell";
import { obterMetadadosEvento } from "@/server/metadados";

/** D11 (Etapa 2): metadata no layout de servidor; slug desconhecido do servidor cai no título genérico. */
export async function generateMetadata({ params }: LayoutProps<"/e/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return obterMetadadosEvento(slug);
}

export default function LayoutParticipante({ children }: LayoutProps<"/e/[slug]">) {
  return <EventoShell>{children}</EventoShell>;
}
