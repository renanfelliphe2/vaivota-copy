import type { Metadata } from "next";
import { LiveRegionProvider } from "@/components/a11y/LiveRegion";
import { SkipLink } from "@/components/a11y/SkipLink";
import { ControleRemoto } from "@/components/apresentacao/ControleRemoto";
import { DevToolbar } from "@/components/dev/DevToolbar";
import { TemaEvento } from "@/components/evento/TemaEvento";
import { ToastProvider } from "@/components/ui/Toast";
import { classesFontes } from "@/lib/fontes";
import { AppProvider } from "@/store/AppProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "VaiVota",
  description: "Votações em eventos, com a identidade de cada evento.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${classesFontes} h-full antialiased`}>
      <body className="min-h-full">
        <AppProvider>
          <LiveRegionProvider>
            <TemaEvento className="flex min-h-dvh flex-col">
              <ToastProvider>
                <SkipLink />
                {children}
              </ToastProvider>
            </TemaEvento>
            <ControleRemoto />
            <DevToolbar />
          </LiveRegionProvider>
        </AppProvider>
      </body>
    </html>
  );
}
