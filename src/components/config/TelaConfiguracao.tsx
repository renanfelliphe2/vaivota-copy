"use client";

import { ListChecks } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { checklistTemBloqueio, type SecaoConfig } from "@/dominio/checklistAtivacao";
import { Alerta } from "@/components/ui/Alerta";
import { useChecklist, useTravas } from "@/store/seletores/checklist";
import { useEventoAtivo } from "@/store/seletores/evento";
import { ChecklistAtivacao } from "./ChecklistAtivacao";
import { FormularioSujoProvider } from "./FormularioSujoProvider";
import { SECOES, SecaoNav } from "./SecaoNav";
import { SecaoCandidatos } from "./candidatos/SecaoCandidatos";
import { FormGeral } from "./geral/FormGeral";
import { SecaoJuri } from "./juri/SecaoJuri";
import { SecaoOperacao } from "./operacao/SecaoOperacao";
import { SecaoPlacar } from "./placar/SecaoPlacar";
import { SecaoTema } from "./tema/SecaoTema";

function ehSecao(valor: string | null): valor is SecaoConfig {
  return SECOES.some((s) => s.id === valor);
}

/**
 * /e/[slug]/admin/configuracao (Etapa 6). O RotaGuard(ADMIN) e o AdminShell vêm do layout (painel).
 * A seção vive em ?secao=; valor ausente ou inválido vira `geral` por replace.
 */
export function TelaConfiguracao() {
  const ativo = useEventoAtivo();
  const travas = useTravas();
  const checklist = useChecklist();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const bruto = params.get("secao");
  const secao: SecaoConfig = ehSecao(bruto) ? bruto : "geral";

  useEffect(() => {
    if (!ehSecao(bruto)) router.replace(`${pathname}?secao=geral`, { scroll: false });
  }, [bruto, pathname, router]);

  // Foco no título da seção ao trocar (não na primeira renderização).
  const anterior = useRef<string | null>(null);
  useEffect(() => {
    if (anterior.current !== null && anterior.current !== secao) document.getElementById("titulo-secao")?.focus();
    anterior.current = secao;
  }, [secao]);

  if (!ativo || !travas || !checklist) return null;
  const base = pathname;
  const leitura = travas.fase === "CONCLUIDO";
  const mostrarChecklist = travas.fase === "RASCUNHO" || travas.fase === "ATIVO_NAO_INICIADA";
  const bloqueios = checklist.filter((i) => i.estado === "PENDENTE").length;

  let conteudo;
  if (secao === "geral") conteudo = <FormGeral travas={travas} />;
  else if (secao === "candidatos") conteudo = <SecaoCandidatos travas={travas} />;
  else if (secao === "juri") conteudo = <SecaoJuri travas={travas} />;
  else if (secao === "placar") conteudo = <SecaoPlacar travas={travas} />;
  else if (secao === "tema") conteudo = <SecaoTema travas={travas} />;
  else conteudo = <SecaoOperacao travas={travas} checklist={checklist} />;

  const painelChecklist = <ChecklistAtivacao itens={checklist} base={base} />;

  return (
    <FormularioSujoProvider>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Configuração</h1>
        {leitura && (
          <Alerta variante="informacao" titulo="Somente leitura">
            O evento foi concluído. A configuração pode ser consultada, mas não alterada.
          </Alerta>
        )}
        {travas.incoerente && (
          <Alerta variante="aviso" titulo="Estado incoerente">
            Combinação criada pela toolbar. Use a toolbar para voltar a um estado válido. As ações de Operação ficam desabilitadas.
          </Alerta>
        )}

        {mostrarChecklist && (
          <details className="rounded-2xl border border-tema-borda bg-tema-superficie p-4 xl:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
              <ListChecks aria-hidden className="size-4" />
              Checklist de ativação · {bloqueios === 0 ? "pronto" : `${bloqueios} pendente(s)`}
            </summary>
            <div className="pt-3">{painelChecklist}</div>
          </details>
        )}

        <div className="grid gap-6 lg:grid-cols-[13rem_1fr] xl:grid-cols-[13rem_1fr_18rem]">
          <SecaoNav base={base} atual={secao} rotuloCandidatos={ativo.tema.rotuloCandidatos} />
          <div className="min-w-0">{conteudo}</div>
          {mostrarChecklist && (
            <aside aria-label="Checklist de ativação" className="hidden h-fit flex-col gap-3 rounded-2xl border border-tema-borda bg-tema-superficie p-4 xl:flex">
              <h2 className="flex items-center gap-2 font-semibold">
                <ListChecks aria-hidden className="size-4" />
                Checklist de ativação
              </h2>
              {painelChecklist}
              <p className="text-sm text-tema-texto-suave">
                {checklistTemBloqueio(checklist) ? "Resolva as pendências para ativar." : "Tudo pronto para ativar na Operação."}
              </p>
            </aside>
          )}
        </div>
      </div>
    </FormularioSujoProvider>
  );
}
