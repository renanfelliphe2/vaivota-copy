"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, type ReactNode } from "react";
import { resolverAcesso, type ExigenciaAcesso } from "@/dominio/acesso";
import { Carregando } from "@/components/ui/Carregando";
import { useSlugAtivo } from "@/store/seletores/evento";
import { useSessao } from "@/store/seletores/sessao";
import { AcessoRestrito } from "./AcessoRestrito";

export type RotaGuardProps = {
  exigencia: ExigenciaAcesso;
  /** Fora do EventoShell (painel e telão), as telas de espera e de acesso restrito viram o <main>. */
  comoMain?: boolean;
  children: ReactNode;
};

/** Guarda de acesso central (D21). Volta de login por `?de=<rota atual>`. */
export function RotaGuard(props: RotaGuardProps) {
  return (
    <Suspense fallback={<EsperaGuarda comoMain={props.comoMain} />}>
      <RotaGuardInterno {...props} />
    </Suspense>
  );
}

function EsperaGuarda({ comoMain }: { comoMain?: boolean }) {
  const Raiz = comoMain ? "main" : "div";
  return (
    <Raiz id={comoMain ? "conteudo" : undefined} className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center px-6 py-20">
      <Carregando texto="Verificando acesso…" />
    </Raiz>
  );
}

function RotaGuardInterno({ exigencia, comoMain, children }: RotaGuardProps) {
  const sessao = useSessao();
  const slug = useSlugAtivo();
  const pathname = usePathname();
  const busca = useSearchParams().toString();
  const router = useRouter();
  const acesso = resolverAcesso(exigencia, sessao);
  const motivo = acesso.ok ? null : acesso.motivo;

  useEffect(() => {
    if (motivo !== "DESLOGADO" && motivo !== "EMAIL_NAO_VERIFICADO") return;
    const de = encodeURIComponent(busca ? `${pathname}?${busca}` : pathname);
    router.replace(motivo === "DESLOGADO" ? `/e/${slug}?de=${de}` : `/e/${slug}/verificar-email?de=${de}`);
  }, [motivo, pathname, busca, slug, router]);

  if (acesso.ok) return <>{children}</>;
  if (motivo === "PAPEL_INSUFICIENTE") return <AcessoRestrito comoMain={comoMain} />;
  return <EsperaGuarda comoMain={comoMain} />;
}
