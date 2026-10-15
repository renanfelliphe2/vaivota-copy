import type { Metadata } from "next";
import { headers } from "next/headers";
import { LiveRegionProvider } from "@/components/a11y/LiveRegion";
import { SkipLink } from "@/components/a11y/SkipLink";
import { TemaEvento } from "@/components/evento/TemaEvento";
import { ToastProvider } from "@/components/ui/Toast";
import type { EstadoPublico } from "@/dominio/estadoPublico";
import { classesFontes } from "@/lib/fontes";
import { montarEstadoPublico } from "@/server/estadoPublico";
import { usuarioDaSessao } from "@/server/sessao";
import { AppProvider } from "@/store/AppProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "VaiVota",
  description: "Votações em eventos, com a identidade de cada evento.",
};

/** Página de contingência: o banco não respondeu. Sem o estado público não há o que mostrar (nem tema nem evento). */
function Indisponivel() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold">Estamos com um problema temporário</h1>
      <p className="text-base">Não conseguimos carregar a página agora. Aguarde alguns instantes e tente de novo.</p>
      {/* Link comum (não next/link): recarrega a página inteira para buscar o estado de novo. */}
      <a href="" className="rounded-full border border-current px-5 py-2.5 font-semibold">
        Tentar de novo
      </a>
    </main>
  );
}

/**
 * Layout raiz (servidor): monta o estado público (evento, tema, candidatos publicados, a própria pessoa) uma vez por
 * requisição e entrega ao AppProvider. Por isso toda rota é dinâmica: o estado depende da sessão (cookie).
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  // `headers()` fica FORA do try: é ele que avisa o Next que a rota é dinâmica (a exceção não pode ser engolida).
  const cabecalhos = await headers();
  let estado: EstadoPublico | null = null;
  try {
    // Cache assinado no cookie basta para pintar a página; ações sensíveis conferem a sessão no banco (rpc.ts).
    const usuario = await usuarioDaSessao(cabecalhos, { estrita: false });
    estado = await montarEstadoPublico(usuario);
  } catch (erro) {
    console.error("[servidor] não foi possível montar o estado público:", erro);
  }

  return (
    <html lang="pt-BR" className={`${classesFontes} h-full antialiased`}>
      <body className="min-h-full">
        {estado ? (
          <AppProvider estadoInicial={estado}>
            <LiveRegionProvider>
              <TemaEvento className="flex min-h-dvh flex-col">
                <ToastProvider>
                  <SkipLink />
                  {children}
                </ToastProvider>
              </TemaEvento>
            </LiveRegionProvider>
          </AppProvider>
        ) : (
          <Indisponivel />
        )}
      </body>
    </html>
  );
}
