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
import { PainelParceiros } from "./PainelParceiros";
import { PainelSobre } from "./PainelSobre";
import { SECOES, SecaoNav } from "./SecaoNav";
import { SecaoCandidatos } from "./candidatos/SecaoCandidatos";
import { SecaoCategoriasConfig } from "./categorias/SecaoCategoriasConfig";
import { FormGeral } from "./geral/FormGeral";
import { SecaoJuri } from "./juri/SecaoJuri";
import { SecaoOperacao } from "./operacao/SecaoOperacao";
import { SecaoPlacar } from "./placar/SecaoPlacar";
import { SecaoTema } from "./tema/SecaoTema";
import { SecaoApresentacao } from "./apresentacao/SecaoApresentacao";
import { SecaoTotens } from "./totens/SecaoTotens";
import { TituloPainel } from "@/components/nav/TituloPainel";

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
  if (secao === "geral")
    conteudo = (
      <div className="flex flex-col gap-8">
        <FormGeral travas={travas} />
        <PainelSobre travas={travas} />
        <PainelParceiros travas={travas} />
      </div>
    );
  else if (secao === "categorias") conteudo = <SecaoCategoriasConfig travas={travas} />;
  else if (secao === "candidatos") conteudo = <SecaoCandidatos travas={travas} />;
  else if (secao === "juri") conteudo = <SecaoJuri travas={travas} />;
  else if (secao === "totens") conteudo = <SecaoTotens travas={travas} />;
  else if (secao === "placar") conteudo = <SecaoPlacar travas={travas} />;
  else if (secao === "tema") conteudo = <SecaoTema travas={travas} />;
  else if (secao === "apresentacao") conteudo = <SecaoApresentacao travas={travas} />;
  else conteudo = <SecaoOperacao travas={travas} checklist={checklist} />;

  const painelChecklist = <ChecklistAtivacao itens={checklist} base={base} />;

  return (
    <FormularioSujoProvider>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
        <TituloPainel titulo="Configuração" />
        {leitura && (
          <Alerta variante="informacao" titulo="Somente leitura">
            O evento foi concluído. A configuração pode ser consultada, mas não alterada.
          </Alerta>
        )}
        {travas.incoerente && (
          <Alerta variante="aviso" titulo="Estado incoerente">
            Combinação de estados inválida (fora do fluxo normal). Fale com a equipe técnica. As ações de Operação ficam desabilitadas.
          </Alerta>
        )}

        {mostrarChecklist && (
          <details className="rounded-2xl border border-tema-borda bg-tema-superficie p-4 lg:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
              <ListChecks aria-hidden className="size-4" />
              Checklist de ativação · {bloqueios === 0 ? "pronto" : `${bloqueios} pendente(s)`}
            </summary>
            <div className="pt-3">{painelChecklist}</div>
          </details>
        )}

        {/* 24/11/2026: duas colunas só. À esquerda, o menu de seções e, abaixo dele, o checklist de ativação (antes numa terceira
            coluna à direita); o conteúdo fica com o resto da largura. Abaixo de lg, o checklist é o <details> do topo. */}
        <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
          <div className="flex min-w-0 flex-col gap-6">
            <SecaoNav base={base} atual={secao} rotuloCandidatos={ativo.tema.rotuloCandidatos} />
            {mostrarChecklist && (
              <aside aria-label="Checklist de ativação" className="hidden h-fit flex-col gap-3 rounded-2xl border border-tema-borda bg-tema-superficie p-4 lg:flex">
                <h2 className="flex items-center gap-2 font-semibold">
                  <ListChecks aria-hidden className="size-4" />
                  Checklist de ativação
                  <span className={bloqueios === 0 ? "ml-auto text-xs font-medium text-tema-sucesso" : "ml-auto text-xs font-medium text-tema-erro"}>
                    {bloqueios === 0 ? "pronto" : `${bloqueios} pendente(s)`}
                  </span>
                </h2>
                {painelChecklist}
                <p className="text-sm text-tema-texto-suave">
                  {checklistTemBloqueio(checklist) ? "Resolva as pendências para ativar." : "Tudo pronto para ativar na Operação."}
                </p>
              </aside>
            )}
          </div>
          <div className="min-w-0">{conteudo}</div>
        </div>
      </div>
    </FormularioSujoProvider>
  );
}
