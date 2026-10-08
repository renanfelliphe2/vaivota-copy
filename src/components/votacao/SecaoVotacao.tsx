"use client";

import { CircleCheck, Gavel, Vote } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { rotaVerificarEmail } from "@/dominio/destinoAcesso";
import type { PapelVoto } from "@/dominio/estadoVotar";
import { localizarNaOrdem } from "@/dominio/ordemVotacao";
import { resolverPassoVotar } from "@/dominio/passoVotar";
import { votacaoAberta } from "@/dominio/situacaoEvento";
import { useAnunciar } from "@/components/a11y/LiveRegion";
import { DetalheCandidato } from "@/components/candidato/DetalheCandidato";
import { ListaCandidatos } from "@/components/candidato/ListaCandidatos";
import { Botao } from "@/components/ui/Botao";
import { Selo } from "@/components/ui/Selo";
import { textoContador } from "@/lib/textosEstado";
import { abrirAcesso } from "@/store/acoesAcesso";
import { descartarSucesso, selecionarCandidato } from "@/store/acoesVotacao";
import { useCandidatosParaVotacao, type ItemLista } from "@/store/seletores/candidatos";
import { useEstadoVotar } from "@/store/seletores/estadoVotar";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSessao } from "@/store/seletores/sessao";
import { useSelecaoVoto } from "@/store/seletores/votacao";
import { AvisoVotacao } from "./AvisoVotacao";
import { BarraSelecao } from "./BarraSelecao";
import { DialogoRevisao } from "./DialogoRevisao";
import { DialogoSucesso } from "./DialogoSucesso";

import { useEnviarVoto } from "./useEnviarVoto";
import { useVotoAtual } from "./useVotoAtual";

const ID_TITULO = "titulo-candidatos";

/**
 * Votação na entrada do evento (08/10/2026: substitui a página /votar e a vitrine de 6 candidatos). Todos os
 * votáveis, sempre; o que muda é o modo:
 * - VISITANTE (sem sessão ou sem e-mail verificado): "Ver detalhes" e, com a urna aberta, "Votar" pedem o acesso e
 *   voltam com o detalhe aberto ou direto na revisão (`?votar=`).
 * - ESCOLHA (gate LISTA): "Votar" no cartão escolhe e abre a revisão; detalhe, barra de seleção, revisão e sucesso em modais.
 * - LEITURA (demais telas da gate: já votou, admin, urna fechada…): lista e detalhe, sem escolher. Nunca mostra
 *   em quem o público votou nem resultado.
 * A tela vem de resolverEstadoVotar e o passo de resolverPassoVotar; detalhe e passo vivem na URL (`?candidato=`, `?passo=`).
 */
export function SecaoVotacao() {
  const estado = useEstadoVotar();
  const ativo = useEventoAtivo();
  const sessao = useSessao();
  const lista = useCandidatosParaVotacao();
  const eventoId = ativo?.evento.id ?? null;
  const votacao = useSelecaoVoto(eventoId);
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const anunciar = useAnunciar();

  const tela = estado?.tela ?? "ACESSO_PENDENTE";
  const papelVoto = estado?.papelVoto ?? null;
  // papelVoto só existe com tela = LISTA: a consulta do voto atual roda só para o jurado na lista.
  const { candidatoAtualId, recarregar } = useVotoAtual(eventoId, sessao.usuario?.id ?? null, papelVoto === "JURADO");
  // JA_VOTOU (sucesso ou envio em andamento) é sempre do público.
  const papel: PapelVoto = papelVoto ?? "PUBLICO";
  const { enviar, verificarNovamente } = useEnviarVoto(eventoId ?? "", papel, recarregar);

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

  // "Votar" do visitante volta do acesso com `?votar=`: na gate LISTA, escolhe e abre a revisão; noutra tela
  // definitiva (já votou, urna fechou…), só limpa a URL. Escrita na store em efeito, como o descarte acima.
  const votarUrl = params.get("votar");
  const itemVotarUrl = lista?.itens.find((i) => i.candidato.id === votarUrl && !i.bloqueadoVotoProprio) ?? null;
  useEffect(() => {
    if (!votarUrl || !eventoId || tela === "ACESSO_PENDENTE") return;
    if (tela === "LISTA" && itemVotarUrl && itemVotarUrl.candidato.id !== candidatoAtualId) {
      selecionarCandidato(eventoId, itemVotarUrl.candidato.id);
      router.replace(`${pathname}?passo=revisao`, { scroll: false });
    } else {
      router.replace(pathname, { scroll: false });
    }
  }, [votarUrl, itemVotarUrl, candidatoAtualId, eventoId, tela, pathname, router]);

  // Marcas escritas e lidas só em manipuladores (React Compiler).
  const detalhePelaLista = useRef(false);
  const revisaoPelaLista = useRef(false);
  const ultimoExibido = useRef<string | null>(null);

  if (!estado || !ativo || !eventoId || !lista || lista.total === 0) return null;
  const { slug, tema } = ativo;
  const idEvento = eventoId;
  const itens = lista.itens;

  const visitante = !sessao.logado || !sessao.emailVerificado;
  const modo = visitante ? "VISITANTE" : tela === "LISTA" ? "ESCOLHA" : "LEITURA";
  const jurado = papel === "JURADO";
  const emModal = passo === "REVISAO" || passo === "SUCESSO";
  const posicao = visitante || emModal ? null : localizarNaOrdem(lista.itens, candidatoUrl);
  const urlCom = (busca: string) => (busca ? `${pathname}?${busca}` : pathname);
  const ehVotoAtual = (item: ItemLista) => jurado && item.candidato.id === candidatoAtualId;

  /** Visitante: pede o acesso (ou a verificação do e-mail) e volta com o detalhe aberto ou direto na revisão. */
  function pedirAcesso(candidatoId: string, intencao: "candidato" | "votar") {
    const de = `/e/${slug}?${intencao}=${encodeURIComponent(candidatoId)}#candidatos`;
    if (!sessao.logado) abrirAcesso("entrar", de);
    else router.push(rotaVerificarEmail(slug, de));
  }

  /** "Votar" do cartão: escolhe e abre a revisão (um toque a menos que escolher e depois revisar). */
  function votar(candidatoId: string) {
    if (visitante) return pedirAcesso(candidatoId, "votar");
    if (votacao.selecaoId !== candidatoId) escolher(candidatoId);
    irParaRevisao();
  }

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
    selecionarCandidato(idEvento, candidatoId);
    const titulo = itens.find((i) => i.candidato.id === candidatoId)?.candidato.titulo;
    if (titulo) anunciar(`Sua escolha: ${titulo}`);
  }

  function limpar() {
    selecionarCandidato(idEvento, null);
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

  const tituloSecao = () => document.getElementById(ID_TITULO);
  const escolhendo = modo === "ESCOLHA" && itemSelecionado !== null;
  // "Votar" só com o evento ativo e a urna aberta; aí, o visitante vê (e o botão pede o acesso) e o logado, na gate LISTA.
  const mostraVotar =
    votacaoAberta(ativo.evento) && (modo === "ESCOLHA" || (modo === "VISITANTE" && estado.visao.variante === "ABERTA"));
  // Mesmo texto para todos (08/10/2026); só depende de o "Votar" estar na tela.
  const instrucao = mostraVotar
    ? 'Toque em "Votar" no seu favorito, ou em "Ver detalhes" para conhecer melhor antes de decidir.'
    : 'Use "Ver detalhes" para conhecer melhor cada um.';
  // Na leitura, só os avisos que explicam por que não há escolha (JA_VOTOU_ANTES, NAO_REGISTRADO).
  const aviso =
    modo === "ESCOLHA"
      ? votacao.aviso !== "JA_VOTOU_ANTES"
        ? votacao.aviso
        : null
      : votacao.aviso === "JA_VOTOU_ANTES" || votacao.aviso === "NAO_REGISTRADO"
        ? votacao.aviso
        : null;
  const tituloSucesso = lista.itens.find((i) => i.candidato.id === votacao.ultimoVoto?.candidatoId)?.candidato.titulo ?? null;

  return (
    <section
      id="candidatos"
      aria-labelledby={ID_TITULO}
      className={`w-full scroll-mt-40 border-t border-tema-borda bg-tema-superficie ${escolhendo ? "pb-40 sm:pb-28" : ""}`}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-16 sm:px-6">
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id={ID_TITULO} tabIndex={-1} className="text-2xl font-bold sm:text-3xl">
              {tema.rotuloCandidatos}
            </h2>
            <p className="text-sm font-semibold text-tema-primaria-texto">{textoContador(lista.total, tema)}</p>
          </div>
          <p className="text-tema-texto-suave">{instrucao}</p>
        </header>
        <AvisoVotacao aviso={aviso} />
        <ListaCandidatos
          itens={lista.itens}
          campos={lista.campos}
          aoVerDetalhes={visitante ? (id) => pedirAcesso(id, "candidato") : abrirDetalhe}
          renderAcao={(item) =>
            !mostraVotar || item.bloqueadoVotoProprio || ehVotoAtual(item) ? null : (
              <Botao
                tamanho="pequeno"
                aria-label={`Votar: ${item.candidato.titulo}`}
                icone={<Vote aria-hidden className="size-4" />}
                onClick={() => votar(item.candidato.id)}
              >
                Votar
              </Botao>
            )
          }
          renderSelo={(item) =>
            modo !== "ESCOLHA" ? null : ehVotoAtual(item) ? (
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
          if (modo !== "ESCOLHA" || item.bloqueadoVotoProprio) return null;
          if (ehVotoAtual(item)) return <p className="self-center text-sm font-medium">Esse já é o seu voto.</p>;
          return (
            <Botao onClick={() => escolherERevisar(item.candidato.id)}>
              {votacao.selecaoId === item.candidato.id ? "Revisar voto" : "Escolher e revisar"}
            </Botao>
          );
        }}
      />

      <DialogoRevisao
        item={passo === "REVISAO" ? itemSelecionado : null}
        papelVoto={papel}
        primeiroVotoJurado={jurado && !sessao.jaVotou}
        ehVotoAtual={jurado && itemSelecionado !== null && candidatoAtualId === itemSelecionado.candidato.id}
        envio={votacao.envio}
        falhaEnvio={votacao.falhaEnvio}
        aoConfirmar={() => itemSelecionado && void enviar(itemSelecionado.candidato.id)}
        aoTrocar={trocarEscolha}
        aoVerificar={() => void verificarNovamente()}
      />

      <DialogoSucesso
        resultado={passo === "SUCESSO" ? (votacao.ultimoVoto?.resultado ?? null) : null}
        papelVoto={papel}
        tituloEscolhido={jurado ? tituloSucesso : null}
        aoFechar={() => router.replace(pathname, { scroll: false })}
        aoAlterar={() => {
          descartarSucesso(eventoId);
          router.replace(pathname, { scroll: false });
        }}
        focoAoFechar={tituloSecao}
      />

      {escolhendo && itemSelecionado && passo === "LISTA" && (
        <BarraSelecao
          titulo={itemSelecionado.candidato.titulo}
          alteracao={jurado && candidatoAtualId !== null}
          aoLimpar={limpar}
          aoRevisar={irParaRevisao}
        />
      )}
    </section>
  );
}
