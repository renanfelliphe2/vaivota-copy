"use client";

import { CircleCheck, ClipboardPen, Gavel, Trophy, Vote } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { candidatoAvaliado, ehModoPorCriterio, mediaDasNotas } from "@/dominio/avaliacaoJuri";
import { rotaAvaliacao, rotaVerificarEmail } from "@/dominio/destinoAcesso";
import type { PapelVoto } from "@/dominio/estadoVotar";
import { localizarNaOrdem } from "@/dominio/ordemVotacao";
import { resolverPassoVotar } from "@/dominio/passoVotar";
import { votacaoAberta } from "@/dominio/situacaoEvento";
import { useAnunciar } from "@/components/a11y/LiveRegion";
import { PainelAvaliacaoJuri, filtrarPorAvaliacao, type FiltroAvaliacao } from "@/components/avaliacao/PainelAvaliacaoJuri";
import { useAvaliacaoJuri } from "@/components/avaliacao/useAvaliacaoJuri";
import { DetalheCandidato } from "@/components/candidato/DetalheCandidato";
import { ListaCandidatos } from "@/components/candidato/ListaCandidatos";
import { Botao } from "@/components/ui/Botao";
import { Selo } from "@/components/ui/Selo";
import { formatarDecimal } from "@/lib/formatar";
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
 * Jurado com o júri por critério (08/10/2026): "Avaliar" leva à página do candidato (/avaliar/[id]); a lista mostra
 * o progresso, quem já foi avaliado (ou o melhor de cada critério) e, nas notas, um filtro. Sem revisão nem sucesso.
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
  const modoJuri = ativo?.configPlacar.modoVotoJuri ?? "VOTO_UNICO";
  // Só o jurado na lista avalia por critério; o público sempre vota em um só.
  const porCriterio = papelVoto === "JURADO" && ehModoPorCriterio(modoJuri);
  // papelVoto só existe com tela = LISTA: a consulta do voto atual roda só para o jurado na lista.
  const { candidatoAtualId, recarregar } = useVotoAtual(eventoId, sessao.usuario?.id ?? null, papelVoto === "JURADO" && !porCriterio);
  const juri = useAvaliacaoJuri(eventoId, sessao.usuario?.id ?? null, modoJuri, porCriterio);
  const [filtro, setFiltro] = useState<FiltroAvaliacao>("TODOS");
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
    if (porCriterio && itemVotarUrl && ativo) {
      router.replace(rotaAvaliacao(ativo.slug, itemVotarUrl.candidato.id));
    } else if (tela === "LISTA" && itemVotarUrl && itemVotarUrl.candidato.id !== candidatoAtualId) {
      selecionarCandidato(eventoId, itemVotarUrl.candidato.id);
      router.replace(`${pathname}?passo=revisao`, { scroll: false });
    } else {
      router.replace(pathname, { scroll: false });
    }
  }, [votarUrl, itemVotarUrl, candidatoAtualId, eventoId, tela, pathname, router, porCriterio, ativo]);

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
  const ehVotoAtual = (item: ItemLista) => jurado && !porCriterio && item.candidato.id === candidatoAtualId;
  const criterios = ativo.criteriosJuri;
  const avaliado = (item: ItemLista) => candidatoAvaliado(juri.avaliacao.notas[item.candidato.id], criterios);
  const melhorEm = (item: ItemLista) => criterios.filter((c) => juri.avaliacao.escolhas[c.id] === item.candidato.id);
  const avaliaveis = itens.filter((i) => !i.bloqueadoVotoProprio);
  const itensVisiveis = porCriterio && modoJuri === "NOTAS_POR_CRITERIO" ? filtrarPorAvaliacao(itens, filtro, juri.avaliacao, criterios) : itens;

  /** "Avaliar" do jurado por critério: a página do candidato. */
  function botaoAvaliar(item: ItemLista, tamanho: "pequeno" | "medio") {
    const revisar = modoJuri === "NOTAS_POR_CRITERIO" ? avaliado(item) : melhorEm(item).length > 0;
    return (
      <Botao
        tamanho={tamanho}
        href={rotaAvaliacao(slug, item.candidato.id)}
        aria-label={`${revisar ? "Rever avaliação" : "Avaliar"}: ${item.candidato.titulo}`}
        icone={<ClipboardPen aria-hidden className="size-4" />}
      >
        {revisar ? "Rever avaliação" : "Avaliar"}
      </Botao>
    );
  }

  /** Selo do jurado por critério: avaliado (com a média das próprias notas) ou melhor em quais critérios. */
  function seloCriterio(item: ItemLista) {
    if (modoJuri === "NOTAS_POR_CRITERIO") {
      if (!avaliado(item)) return null;
      const media = mediaDasNotas(criterios.map((c) => juri.avaliacao.notas[item.candidato.id][c.id]));
      return (
        <Selo variante="sucesso" icone={CircleCheck} className="bg-tema-fundo">
          Avaliado{media !== null && ` · média ${formatarDecimal(media, 1)}`}
        </Selo>
      );
    }
    const melhores = melhorEm(item);
    if (melhores.length === 0) return null;
    return (
      <Selo variante="sucesso" icone={Trophy} className="bg-tema-fundo">
        Melhor {melhores.map((c) => c.nome.toLocaleLowerCase("pt-BR")).join(", ")}
      </Selo>
    );
  }

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
  // Mesmo texto para todos (08/10/2026); só depende de o "Votar" estar na tela. O jurado por critério tem o seu.
  const instrucao =
    mostraVotar && porCriterio
      ? modoJuri === "NOTAS_POR_CRITERIO"
        ? 'Toque em "Avaliar" em cada um e dê uma nota de 0 a 10 em cada critério.'
        : 'Toque em "Avaliar" para dizer em quais critérios cada um é o melhor.'
      : mostraVotar
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
        {porCriterio && modo === "ESCOLHA" && modoJuri !== "VOTO_UNICO" && (
          <PainelAvaliacaoJuri
            modo={modoJuri}
            criterios={criterios}
            itens={avaliaveis}
            avaliacao={juri.avaliacao}
            carregando={juri.carregando}
            filtro={filtro}
            aoFiltrar={setFiltro}
          />
        )}
        {itensVisiveis.length === 0 && (
          <p className="rounded-xl border border-dashed border-tema-borda p-6 text-tema-texto-suave">
            {filtro === "AVALIADOS" ? "Você ainda não avaliou nenhum." : "Você já avaliou todos. Pode rever qualquer avaliação até o encerramento."}
          </p>
        )}
        <ListaCandidatos
          itens={itensVisiveis}
          campos={lista.campos}
          aoVerDetalhes={visitante ? (id) => pedirAcesso(id, "candidato") : abrirDetalhe}
          renderAcao={(item) =>
            !mostraVotar || item.bloqueadoVotoProprio || ehVotoAtual(item) ? null : porCriterio ? (
              botaoAvaliar(item, "pequeno")
            ) : (
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
            modo !== "ESCOLHA" ? null : porCriterio ? (
              seloCriterio(item)
            ) : ehVotoAtual(item) ? (
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
          if (porCriterio) return botaoAvaliar(item, "medio");
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
