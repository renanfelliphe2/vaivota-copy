"use client";

import { CircleCheck, Gavel } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import type { PapelVoto } from "@/dominio/estadoVotar";
import { localizarNaOrdem } from "@/dominio/ordemVotacao";
import { resolverPassoVotar } from "@/dominio/passoVotar";
import { useAnunciar } from "@/components/a11y/LiveRegion";
import { DetalheCandidato } from "@/components/candidato/DetalheCandidato";
import { ListaCandidatos } from "@/components/candidato/ListaCandidatos";
import { Botao } from "@/components/ui/Botao";
import { Carregando } from "@/components/ui/Carregando";
import { Selo } from "@/components/ui/Selo";
import { descartarSucesso, selecionarCandidato } from "@/store/acoesVotacao";
import { useCandidatosParaVotacao, type CandidatosParaVotacao, type ItemLista } from "@/store/seletores/candidatos";
import { useEstadoVotar } from "@/store/seletores/estadoVotar";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSessao } from "@/store/seletores/sessao";
import { useSelecaoVoto } from "@/store/seletores/votacao";
import { AvisoVotacao } from "./AvisoVotacao";
import { BarraSelecao } from "./BarraSelecao";
import { CabecalhoLista } from "./CabecalhoLista";
import { EscolhaCandidato } from "./EscolhaCandidato";
import { TelaEstadoVotar } from "./TelaEstadoVotar";
import { TelaJaVotou } from "./TelaJaVotou";
import { TelaRevisao } from "./TelaRevisao";
import { TelaSucesso } from "./TelaSucesso";
import { useEnviarVoto } from "./useEnviarVoto";
import { useFocoNoTitulo } from "./useFocoNoTitulo";
import { useVotoAtual } from "./useVotoAtual";

/**
 * /e/[slug]/votar (Etapas 4 e 5). A tela vem só de resolverEstadoVotar (gate) e de resolverPassoVotar
 * (passo dentro de LISTA e JA_VOTOU). O detalhe e o passo vivem na URL (`?candidato=`, `?passo=`).
 */
export function TelaVotar() {
  const estado = useEstadoVotar();
  const ativo = useEventoAtivo();
  const sessao = useSessao();
  const lista = useCandidatosParaVotacao();
  const eventoId = ativo?.evento.id ?? null;
  const votacao = useSelecaoVoto(eventoId);
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const tela = estado?.tela ?? "ACESSO_PENDENTE";
  const papelVoto = estado?.papelVoto ?? null;
  // papelVoto só existe com tela = LISTA: a consulta do voto atual roda só para o jurado na lista.
  const { candidatoAtualId, recarregar } = useVotoAtual(eventoId, sessao.usuario?.id ?? null, papelVoto === "JURADO");

  const passoUrl = params.get("passo");
  const itemSelecionado = lista?.itens.find((i) => i.candidato.id === votacao.selecaoId && !i.bloqueadoVotoProprio) ?? null;
  const { passo, normalizarPara } = resolverPassoVotar({
    tela,
    papelVoto,
    passoUrl,
    selecaoValida: itemSelecionado !== null,
    ultimoVotoValido: votacao.ultimoVoto !== null,
    envio: votacao.envio,
  });

  // Normalização da URL: efeito de navegação, nunca setState (D5). O render já usa `passo`.
  const candidatoUrl = params.get("candidato");
  useEffect(() => {
    if (normalizarPara === "SUCESSO") router.replace(`${pathname}?passo=sucesso`, { scroll: false });
    if (normalizarPara === "BASE") {
      const manter = passo === "LISTA" && candidatoUrl ? `?candidato=${encodeURIComponent(candidatoUrl)}` : "";
      router.replace(`${pathname}${manter}`, { scroll: false });
    }
  }, [normalizarPara, passo, candidatoUrl, pathname, router]);

  // Urna fechou com a escolha feita (W12): a seleção é descartada.
  const descartar = tela !== "LISTA" && votacao.selecaoId !== null && votacao.envio === "OCIOSO";
  useEffect(() => {
    if (descartar && eventoId) selecionarCandidato(eventoId, null);
  }, [descartar, eventoId]);

  useFocoNoTitulo(passo ?? tela);

  if (!estado || !ativo || !eventoId) return null;
  if (tela === "ACESSO_PENDENTE") {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center px-6 py-20">
        <Carregando />
      </div>
    );
  }

  if (passo === null) {
    if (tela === "JA_VOTOU") return <TelaJaVotou aviso={votacao.aviso} />;
    return <TelaEstadoVotar estado={estado} aviso={<AvisoVotacao aviso={votacao.aviso === "NAO_REGISTRADO" ? votacao.aviso : null} />} />;
  }

  // JA_VOTOU (sucesso ou envio em andamento) é sempre do público.
  const papel: PapelVoto = papelVoto ?? "PUBLICO";

  if (passo === "SUCESSO" && votacao.ultimoVoto) {
    const titulo = lista?.itens.find((i) => i.candidato.id === votacao.ultimoVoto?.candidatoId)?.candidato.titulo ?? null;
    return (
      <TelaSucesso
        papelVoto={papel}
        resultado={votacao.ultimoVoto.resultado}
        tituloEscolhido={papel === "JURADO" ? titulo : null}
        aoAlterar={() => {
          descartarSucesso(eventoId);
          router.replace(pathname, { scroll: false });
        }}
      />
    );
  }

  if (!lista) return null;
  return (
    <FluxoLista
      eventoId={eventoId}
      estado={estado}
      lista={lista}
      papel={papel}
      passo={passo}
      itemSelecionado={itemSelecionado}
      candidatoAtualId={candidatoAtualId}
      jaVotou={sessao.jaVotou}
      aoConcluirEnvio={recarregar}
    />
  );
}

type FluxoListaProps = {
  eventoId: string;
  estado: NonNullable<ReturnType<typeof useEstadoVotar>>;
  lista: CandidatosParaVotacao;
  papel: PapelVoto;
  passo: "LISTA" | "REVISAO" | "SUCESSO";
  itemSelecionado: ItemLista | null;
  candidatoAtualId: string | null;
  jaVotou: boolean;
  aoConcluirEnvio: () => void;
};

/** Lista, detalhe, barra de seleção e revisão (mesma montagem: as marcas de navegação sobrevivem). */
function FluxoLista(props: FluxoListaProps) {
  const { eventoId, estado, lista, papel, passo, itemSelecionado, candidatoAtualId, jaVotou } = props;
  const votacao = useSelecaoVoto(eventoId);
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const anunciar = useAnunciar();
  const { enviar, verificarNovamente } = useEnviarVoto(eventoId, papel, props.aoConcluirEnvio);

  // Marcas escritas e lidas só em manipuladores (React Compiler).
  const detalhePelaLista = useRef(false);
  const revisaoPelaLista = useRef(false);
  const ultimoExibido = useRef<string | null>(null);

  const candidatoUrl = passo === "LISTA" ? params.get("candidato") : null;
  const posicao = localizarNaOrdem(lista.itens, candidatoUrl);
  const jurado = papel === "JURADO";

  const urlCom = (busca: string) => (busca ? `${pathname}?${busca}` : pathname);

  function abrirDetalhe(candidatoId: string) {
    detalhePelaLista.current = true;
    ultimoExibido.current = candidatoId;
    router.push(urlCom(`candidato=${encodeURIComponent(candidatoId)}`), { scroll: false });
  }

  function navegarDetalhe(candidatoId: string) {
    ultimoExibido.current = candidatoId;
    router.replace(urlCom(`candidato=${encodeURIComponent(candidatoId)}`), { scroll: false });
  }

  function fecharDetalhe() {
    if (posicao) ultimoExibido.current = posicao.item.candidato.id;
    if (detalhePelaLista.current) {
      detalhePelaLista.current = false;
      router.back();
    } else {
      router.replace(pathname, { scroll: false });
    }
  }

  function escolher(candidatoId: string) {
    selecionarCandidato(eventoId, candidatoId);
    const titulo = lista.itens.find((i) => i.candidato.id === candidatoId)?.candidato.titulo;
    if (titulo) anunciar(`Sua escolha: ${titulo}`);
  }

  function limpar() {
    selecionarCandidato(eventoId, null);
    anunciar("Escolha removida");
  }

  function irParaRevisao() {
    revisaoPelaLista.current = true;
    router.push(urlCom("passo=revisao"), { scroll: false });
  }

  /** D4: do detalhe, seleciona e troca a entrada do histórico pela revisão. */
  function escolherERevisar(candidatoId: string) {
    if (votacao.selecaoId !== candidatoId) escolher(candidatoId);
    revisaoPelaLista.current = detalhePelaLista.current;
    detalhePelaLista.current = false;
    router.replace(urlCom("passo=revisao"), { scroll: false });
  }

  function trocarEscolha() {
    if (revisaoPelaLista.current) {
      revisaoPelaLista.current = false;
      router.back();
    } else {
      router.replace(pathname, { scroll: false });
    }
  }

  if (passo === "REVISAO" && itemSelecionado) {
    return (
      <TelaRevisao
        item={itemSelecionado}
        papelVoto={papel}
        primeiroVotoJurado={jurado && !jaVotou}
        ehVotoAtual={jurado && candidatoAtualId === itemSelecionado.candidato.id}
        envio={votacao.envio}
        falhaEnvio={votacao.falhaEnvio}
        aoConfirmar={() => void enviar(itemSelecionado.candidato.id)}
        aoTrocar={trocarEscolha}
        aoVerificar={() => void verificarNovamente()}
      />
    );
  }

  const ehVotoAtual = (item: ItemLista) => jurado && item.candidato.id === candidatoAtualId;

  return (
    <div className={itemSelecionado ? "pb-40 sm:pb-28" : undefined}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <CabecalhoLista estado={estado} total={lista.total} />
        <AvisoVotacao aviso={votacao.aviso && votacao.aviso !== "JA_VOTOU_ANTES" ? votacao.aviso : null} />
        <fieldset className="min-w-0">
          <legend className="sr-only">Sua escolha de voto</legend>
          <ListaCandidatos
            itens={lista.itens}
            campos={lista.campos}
            aoVerDetalhes={abrirDetalhe}
            renderAcao={(item) =>
              item.bloqueadoVotoProprio || ehVotoAtual(item) ? null : (
                <EscolhaCandidato candidato={item.candidato} selecionado={votacao.selecaoId === item.candidato.id} aoEscolher={escolher} />
              )
            }
            renderSelo={(item) =>
              ehVotoAtual(item) ? (
                <Selo variante="sucesso" icone={Gavel} className="bg-tema-fundo">
                  Seu voto atual
                </Selo>
              ) : votacao.selecaoId === item.candidato.id && !item.bloqueadoVotoProprio ? (
                <Selo variante="primaria" icone={CircleCheck} className="bg-tema-fundo">
                  Sua escolha
                </Selo>
              ) : null
            }
          />
        </fieldset>
      </div>

      <DetalheCandidato
        posicao={posicao}
        campos={lista.campos}
        aoFechar={fecharDetalhe}
        aoNavegar={navegarDetalhe}
        focoAoFechar={() =>
          ultimoExibido.current ? document.querySelector<HTMLElement>(`[data-candidato-id="${ultimoExibido.current}"]`) : null
        }
        renderAcoes={(item) => {
          if (item.bloqueadoVotoProprio) return null;
          if (ehVotoAtual(item)) return <p className="self-center text-sm font-medium">Esse já é o seu voto.</p>;
          return (
            <Botao onClick={() => escolherERevisar(item.candidato.id)}>
              {votacao.selecaoId === item.candidato.id ? "Revisar voto" : "Escolher e revisar"}
            </Botao>
          );
        }}
      />

      {itemSelecionado && (
        <BarraSelecao
          titulo={itemSelecionado.candidato.titulo}
          alteracao={jurado && candidatoAtualId !== null}
          aoLimpar={limpar}
          aoRevisar={irParaRevisao}
        />
      )}
    </div>
  );
}
