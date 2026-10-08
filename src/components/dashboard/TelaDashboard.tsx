"use client";

import { RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAnunciar } from "@/components/a11y/LiveRegion";
import { Abas } from "@/components/ui/Abas";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Carregando";
import { resolverFaseConfig } from "@/dominio/travas";
import { formatarHoraCompleta, paraMs } from "@/lib/tempo";
import { useConsulta, type EstadoConsulta } from "@/lib/useConsulta";
import { obterOperacao, obterResultado } from "@/servicos/dashboard";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useVersaoResultado } from "@/store/seletores/resultado";
import { TituloPainel } from "@/components/nav/TituloPainel";
import { BannerPainel } from "./BannerPainel";
import { OperacaoTab } from "./OperacaoTab";
import { ResultadoTab } from "./ResultadoTab";

// Etapa 7 (D5 a D7, D20): /e/[slug]/admin. Aba na URL (?aba=operacao|resultado), padrão Operação mesmo com a
// urna encerrada. Polling de 5 s só na fase URNA_ABERTA e só na aba Operação. Falha de leitura mantém o
// último dado bom. O RotaGuard(ADMIN) e o AdminShell vêm do layout (painel).

type AbaPainel = "operacao" | "resultado";

function ehAba(valor: string | null): valor is AbaPainel {
  return valor === "operacao" || valor === "resultado";
}

function Atualizacao<T extends { geradoEm?: string }>({
  consulta,
  fuso,
  geradoEm,
}: {
  consulta: EstadoConsulta<T>;
  fuso: string;
  geradoEm: string | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      {consulta.erro && consulta.dados && geradoEm && (
        <Alerta variante="aviso">Não foi possível atualizar. Mostrando dados de {formatarHoraCompleta(paraMs(geradoEm), fuso)}.</Alerta>
      )}
      <div className="flex flex-wrap items-center gap-3 text-sm text-tema-texto-suave">
        {consulta.atualizadoEm !== null && consulta.dados && (
          <span aria-live="off">Atualizado às {formatarHoraCompleta(geradoEm ? paraMs(geradoEm) : consulta.atualizadoEm, fuso)}</span>
        )}
        <Botao
          variante="fantasma"
          tamanho="pequeno"
          icone={<RefreshCw aria-hidden className="size-4" />}
          carregando={consulta.carregando && consulta.dados !== null}
          onClick={consulta.recarregar}
        >
          Atualizar agora
        </Botao>
      </div>
    </div>
  );
}

function EsqueletoPainel() {
  return (
    <div aria-busy className="grid gap-4 sm:grid-cols-2">
      <Esqueleto className="h-40" />
      <Esqueleto className="h-40" />
      <Esqueleto className="h-28 sm:col-span-2" />
      <Esqueleto className="h-64 sm:col-span-2" />
    </div>
  );
}

function ErroSemDados({ mensagem, tentar }: { mensagem: string; tentar: () => void }) {
  return (
    <Alerta variante="erro" titulo="Não foi possível carregar o painel">
      <p>{mensagem}</p>
      <Botao variante="contorno" tamanho="pequeno" className="mt-2" onClick={tentar}>
        Tentar de novo
      </Botao>
    </Alerta>
  );
}

export function TelaDashboard() {
  const ativo = useEventoAtivo();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const anunciar = useAnunciar();
  const eventoId = ativo?.evento.id ?? "";
  const versao = useVersaoResultado(eventoId || null);
  const { fase, incoerente } = ativo ? resolverFaseConfig(ativo.evento) : { fase: "RASCUNHO" as const, incoerente: false };
  const resultadoNaFase = fase === "URNA_ENCERRADA" || fase === "CONCLUIDO";

  const bruto = params.get("aba");
  const aba: AbaPainel = ehAba(bruto) && (bruto === "operacao" || resultadoNaFase) ? bruto : "operacao";

  useEffect(() => {
    if (bruto !== aba) router.replace(`${pathname}?aba=${aba}`, { scroll: false });
  }, [bruto, aba, pathname, router]);

  // Refaz a consulta quando muda algo que o painel mostra fora do polling (fase, módulos, flag, versão).
  const assinatura = ativo
    ? [eventoId, fase, ativo.evento.moduloJuri, ativo.evento.moduloInfantil, ativo.configApresentacao.parcialAoVivo, versao].join(":")
    : "";
  const operacao = useConsulta(() => obterOperacao(eventoId), {
    ativo: Boolean(eventoId) && aba === "operacao",
    intervaloMs: fase === "URNA_ABERTA" ? 5000 : undefined,
    chave: assinatura,
  });
  const resultado = useConsulta(() => obterResultado(eventoId), {
    ativo: Boolean(eventoId) && aba === "resultado" && resultadoNaFase,
    chave: assinatura,
  });

  // Anuncia uma vez a passagem para urna encerrada com o painel aberto (D20).
  const faseAnterior = useRef(fase);
  useEffect(() => {
    if (faseAnterior.current === "URNA_ABERTA" && fase === "URNA_ENCERRADA")
      anunciar("Votação encerrada. O resultado oficial está disponível.");
    faseAnterior.current = fase;
  }, [fase, anunciar]);

  if (!ativo) return null;
  const { evento, tema, configApresentacao } = ativo;
  const fuso = evento.fusoHorario;
  const base = `/e/${ativo.slug}/admin`;
  const modulos = { juri: evento.moduloJuri, infantil: evento.moduloInfantil };

  const conteudoOperacao = operacao.dados ? (
    <div className="flex flex-col gap-4">
      <Atualizacao consulta={operacao} fuso={fuso} geradoEm={operacao.dados.geradoEm} />
      <OperacaoTab dados={operacao.dados} fuso={fuso} base={base} rotuloCandidatos={tema.rotuloCandidatos} aoExportar={operacao.recarregar} />
    </div>
  ) : operacao.erro ? (
    <ErroSemDados mensagem={operacao.erro.mensagem} tentar={operacao.recarregar} />
  ) : (
    <EsqueletoPainel />
  );

  const semVersao = resultado.erro?.codigo === "RESULTADO_INDISPONIVEL";
  const conteudoResultado =
    resultado.dados || semVersao ? (
      <ResultadoTab
        visao={semVersao ? null : resultado.dados}
        fase={fase}
        fuso={fuso}
        base={base}
        config={configApresentacao}
        rotuloCandidato={tema.rotuloCandidato}
        modulos={modulos}
        aoExportar={resultado.recarregar}
      />
    ) : resultado.erro ? (
      <ErroSemDados mensagem={resultado.erro.mensagem} tentar={resultado.recarregar} />
    ) : (
      <EsqueletoPainel />
    );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <TituloPainel titulo="Painel" />
      <BannerPainel fase={fase} incoerente={incoerente} base={base} />
      <Abas
        rotulo="Abas do painel"
        valor={aba}
        aoMudar={(id) => router.replace(`${pathname}?aba=${id}`, { scroll: false })}
        abas={[
          { id: "operacao", rotulo: "Operação", conteudo: conteudoOperacao },
          {
            id: "resultado",
            rotulo: "Resultado",
            conteudo: conteudoResultado,
            desabilitada: !resultadoNaFase,
            dica: "Resultado: disponível depois do encerramento.",
          },
        ]}
      />
    </div>
  );
}
