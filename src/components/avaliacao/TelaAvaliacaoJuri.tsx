"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, ClipboardCheck, Save, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import {
  NOTA_MAXIMA,
  NOTA_MINIMA,
  candidatoAvaliado,
  ehModoPorCriterio,
  mediaDasNotas,
  notaValida,
  type AvaliacaoJurado,
} from "@/dominio/avaliacaoJuri";
import { rotaAvaliacao, rotaVotacao } from "@/dominio/destinoAcesso";
import { localizarNaOrdem } from "@/dominio/ordemVotacao";
import type { CampoCandidato, CriterioJuri, ResultadoEnvioVoto } from "@/dominio/tipos";
import { CamposExtras } from "@/components/candidato/CamposExtras";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Checkbox } from "@/components/ui/Campo";
import { Carregando } from "@/components/ui/Carregando";
import { useToast } from "@/components/ui/Toast";
import { cx } from "@/lib/classes";
import { formatarDecimal } from "@/lib/formatar";
import { avaliarCandidatoJuri, escolherMelhoresJuri } from "@/servicos/avaliacaoJuri";
import type { ErroServico, Resultado } from "@/servicos/resultado";
import { useCandidatosParaVotacao, type ItemLista } from "@/store/seletores/candidatos";
import { useEstadoVotar } from "@/store/seletores/estadoVotar";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSessao } from "@/store/seletores/sessao";
import { useAvaliacaoJuri } from "./useAvaliacaoJuri";

const AVISO_TELA: Partial<Record<string, string>> = {
  NAO_INICIADA: "A votação ainda não começou. A avaliação abre junto com ela.",
  ENCERRADA: "A votação foi encerrada. As avaliações não podem mais ser alteradas.",
  CONCLUIDO: "O evento foi concluído. As avaliações não podem mais ser alteradas.",
  JURI_DESLIGADO: "O júri está desligado neste evento.",
};

const TEXTO_SUCESSO: Record<ResultadoEnvioVoto, string> = {
  REGISTRADO: "Avaliação salva.",
  ATUALIZADO: "Avaliação atualizada.",
  SEM_ALTERACAO: "Nada mudou: a avaliação já estava assim.",
};

/**
 * /e/[slug]/avaliar/[candidatoId] (08/10/2026): avaliação por critério de um candidato, só para jurado com a urna
 * aberta e o júri em modo por critério. Notas: 0 a 10 em todos os critérios. Melhor por critério: em quais critérios
 * este é o melhor. Salvar volta à lista (ou vai ao próximo sem avaliação); a lista mostra o progresso.
 */
export function TelaAvaliacaoJuri({ candidatoId }: { candidatoId: string }) {
  const ativo = useEventoAtivo();
  const estado = useEstadoVotar();
  const sessao = useSessao();
  const lista = useCandidatosParaVotacao();
  const modo = ativo?.configPlacar.modoVotoJuri ?? "VOTO_UNICO";
  const jurado = estado?.tela === "LISTA" && estado.papelVoto === "JURADO";
  const juri = useAvaliacaoJuri(ativo?.evento.id ?? null, sessao.usuario?.id ?? null, modo, jurado && ehModoPorCriterio(modo));

  if (!ativo || !estado || !lista) return null;
  const voltar = rotaVotacao(ativo.slug);
  if (estado.tela === "ACESSO_PENDENTE") return <Carregando className="mx-auto py-20" texto="Verificando acesso…" />;

  const bloqueio = (titulo: string, texto: string) => (
    <Moldura voltar={voltar}>
      <Alerta variante="informacao" titulo={titulo}>
        {texto}
      </Alerta>
    </Moldura>
  );
  if (estado.papelVoto !== "JURADO" && (estado.tela === "LISTA" || estado.tela === "JA_VOTOU" || estado.tela === "ADMIN_NAO_VOTA"))
    return bloqueio("Só para jurados", "A avaliação por critério é feita pelos jurados. O público vota escolhendo um favorito na lista.");
  if (estado.tela !== "LISTA") return bloqueio("Avaliação indisponível", AVISO_TELA[estado.tela] ?? "A avaliação não está disponível agora.");
  if (modo === "VOTO_UNICO")
    return bloqueio("O júri vota por escolha única", 'Neste evento cada jurado escolhe um candidato. Volte à lista e toque em "Votar".');
  if (ativo.criteriosJuri.length === 0)
    return bloqueio("Sem critérios", "A organização ainda não cadastrou os critérios de avaliação.");

  const posicao = localizarNaOrdem(lista.itens, candidatoId);
  if (!posicao) return bloqueio("Não encontrado", "Este candidato não está disponível para avaliação.");
  if (posicao.item.bloqueadoVotoProprio)
    return bloqueio("Avaliação bloqueada", "Você não pode avaliar a própria candidatura.");
  if (juri.carregando)
    return (
      <Moldura voltar={voltar}>
        <Carregando className="mx-auto py-16" texto="Carregando sua avaliação…" />
      </Moldura>
    );
  if (juri.erro)
    return (
      <Moldura voltar={voltar}>
        <Alerta variante="erro" titulo="Não foi possível carregar sua avaliação">
          {juri.erro.mensagem}
        </Alerta>
        <Botao variante="contorno" className="self-start" onClick={juri.recarregar}>
          Tentar novamente
        </Botao>
      </Moldura>
    );

  const { item } = posicao;
  // Próximo sem avaliação, na ordem do jurado, depois deste (volta ao começo).
  const ordem = [...lista.itens.slice(posicao.indice + 1), ...lista.itens.slice(0, posicao.indice)];
  const proximoPendente =
    modo === "NOTAS_POR_CRITERIO"
      ? (ordem.find((i) => !i.bloqueadoVotoProprio && !candidatoAvaliado(juri.avaliacao.notas[i.candidato.id], ativo.criteriosJuri)) ?? null)
      : null;
  const comum = {
    item,
    criterios: ativo.criteriosJuri,
    avaliacao: juri.avaliacao,
    eventoId: ativo.evento.id,
    primeiraVez: !sessao.jaVotou,
    voltar,
    aoSalvar: juri.recarregar,
  };

  return (
    <Moldura voltar={voltar}>
      <CabecalhoCandidato item={item} campos={lista.campos} posicao={`${posicao.indice + 1} de ${posicao.total}`} />
      {/* key: o formulário recomeça a cada candidato e quando a avaliação salva muda. */}
      {modo === "NOTAS_POR_CRITERIO" ? (
        <FormularioNotas
          key={`${item.candidato.id}:${JSON.stringify(juri.avaliacao.notas[item.candidato.id] ?? {})}`}
          {...comum}
          proximo={proximoPendente ? rotaAvaliacao(ativo.slug, proximoPendente.candidato.id) : null}
          tituloProximo={proximoPendente?.candidato.titulo ?? null}
        />
      ) : (
        <FormularioMelhores key={`${item.candidato.id}:${JSON.stringify(juri.avaliacao.escolhas)}`} {...comum} titulos={lista.itens} />
      )}
      <nav aria-label="Outros candidatos" className="flex justify-between gap-2 border-t border-tema-borda pt-4">
        {posicao.anterior ? (
          <Botao variante="fantasma" tamanho="pequeno" href={rotaAvaliacao(ativo.slug, posicao.anterior.candidato.id)} icone={<ChevronLeft aria-hidden className="size-4" />}>
            Anterior
          </Botao>
        ) : (
          <span />
        )}
        {posicao.seguinte && (
          <Botao variante="fantasma" tamanho="pequeno" href={rotaAvaliacao(ativo.slug, posicao.seguinte.candidato.id)} icone={<ChevronRight aria-hidden className="size-4" />}>
            Seguinte
          </Botao>
        )}
      </nav>
    </Moldura>
  );
}

function Moldura({ voltar, children }: { voltar: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <Botao variante="fantasma" tamanho="pequeno" href={voltar} className="self-start" icone={<ArrowLeft aria-hidden className="size-4" />}>
        Voltar para a lista
      </Botao>
      {children}
    </div>
  );
}

function CabecalhoCandidato({ item, campos, posicao }: { item: ItemLista; campos: readonly CampoCandidato[]; posicao: string }) {
  const { candidato } = item;
  return (
    <header className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-tema-borda bg-tema-superficie sm:flex-row">
      <div className="sm:w-64 sm:shrink-0">
        <ImagemCandidato titulo={candidato.titulo} imagemUrl={candidato.imagemUrl} proporcao="16/9" sizes="(min-width: 640px) 256px, 100vw" />
      </div>
      <div className="flex min-w-0 flex-col gap-2 px-4 pb-4 sm:py-4 sm:pl-0">
        <p className="text-sm text-tema-texto-suave">Avaliando · {posicao}</p>
        <h1 tabIndex={-1} className="text-2xl font-bold leading-tight">
          {candidato.titulo}
        </h1>
        <CamposExtras candidato={candidato} campos={campos} modo="resumo" />
      </div>
    </header>
  );
}

type PropsFormulario = {
  item: ItemLista;
  criterios: readonly CriterioJuri[];
  avaliacao: AvaliacaoJurado;
  eventoId: string;
  /** Jurado sem nenhum voto ainda: caixa de ciência obrigatória, como na revisão do voto único. */
  primeiraVez: boolean;
  voltar: string;
  /** Relê a avaliação salva (o "Salvar e avaliar o próximo" fica nesta mesma tela). */
  aoSalvar: () => void;
};

/** Envio com trava contra duplo clique, toast de sucesso e o erro para a tela. Salvar de novo é seguro (idempotente). */
function useSalvar(voltar: string, aoSalvar: () => void) {
  const router = useRouter();
  const toast = useToast();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<ErroServico | null>(null);
  const emAndamento = useRef(false);

  async function salvar(chamada: () => Promise<Resultado<{ resultado: ResultadoEnvioVoto }>>, destino: string | null) {
    if (emAndamento.current) return;
    emAndamento.current = true;
    setSalvando(true);
    setErro(null);
    const r = await chamada();
    emAndamento.current = false;
    setSalvando(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    toast(TEXTO_SUCESSO[r.dados.resultado], "sucesso");
    aoSalvar();
    router.push(destino ?? voltar);
  }

  return { salvar, salvando, erro };
}

function AvisoIdentificado({ primeiraVez, ciente, aoMudar, desabilitado }: { primeiraVez: boolean; ciente: boolean; aoMudar: (v: boolean) => void; desabilitado: boolean }) {
  return (
    <>
      <Alerta variante="informacao">Sua avaliação é identificada para a organização e pode ser alterada até o encerramento da votação.</Alerta>
      {primeiraVez && (
        <Checkbox
          id="ciencia-avaliacao-identificada"
          rotulo="Sei que minha avaliação é identificada para a organização"
          checked={ciente}
          disabled={desabilitado}
          onChange={(e) => aoMudar(e.target.checked)}
        />
      )}
    </>
  );
}

function ErroEnvio({ erro }: { erro: ErroServico | null }) {
  if (!erro) return null;
  const texto =
    erro.codigo === "REDE" ? "Não foi possível salvar agora. Tente novamente: salvar de novo não duplica a avaliação." : erro.mensagem;
  return <Alerta variante="erro">{texto}</Alerta>;
}

const NOTAS = Array.from({ length: NOTA_MAXIMA - NOTA_MINIMA + 1 }, (_, i) => NOTA_MINIMA + i);

function FormularioNotas(props: PropsFormulario & { proximo: string | null; tituloProximo: string | null }) {
  const { item, criterios, avaliacao, eventoId, primeiraVez, voltar, aoSalvar, proximo, tituloProximo } = props;
  const salvas = avaliacao.notas[item.candidato.id] ?? {};
  const [notas, setNotas] = useState<Record<string, number | undefined>>(() => ({ ...salvas }));
  const [ciente, setCiente] = useState(false);
  const [tentou, setTentou] = useState(false);
  const { salvar, salvando, erro } = useSalvar(voltar, aoSalvar);

  const faltando = criterios.filter((c) => !notaValida(notas[c.id]));
  const completas = faltando.length === 0;
  const media = completas ? mediaDasNotas(criterios.map((c) => notas[c.id] as number)) : null;
  const podeSalvar = completas && (!primeiraVez || ciente) && !salvando;

  function enviar(destino: string | null) {
    setTentou(true);
    if (!podeSalvar) return;
    const valores = Object.fromEntries(criterios.map((c) => [c.id, notas[c.id] as number]));
    void salvar(() => avaliarCandidatoJuri({ eventoId, candidatoId: item.candidato.id, notas: valores }), destino);
  }

  return (
    <form
      aria-busy={salvando || undefined}
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        enviar(null);
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <ClipboardCheck aria-hidden className="size-5 text-tema-primaria-texto" />
          Notas por critério
        </h2>
        <p role="status" className="text-sm font-semibold tabular-nums">
          {media !== null ? `Média: ${formatarDecimal(media, 1)}` : `${criterios.length - faltando.length} de ${criterios.length} critérios`}
        </p>
      </div>
      <p className="text-sm text-tema-texto-suave">
        Dê uma nota de {NOTA_MINIMA} a {NOTA_MAXIMA} em cada critério. {NOTA_MINIMA} é a menor e {NOTA_MAXIMA} a maior.
      </p>
      {criterios.map((c) => {
        const erroCampo = tentou && !notaValida(notas[c.id]) ? "Escolha uma nota." : (erro?.campos?.[c.id] ?? null);
        return (
          <fieldset key={c.id} disabled={salvando} aria-describedby={erroCampo ? `erro-${c.id}` : undefined} className="flex flex-col gap-2 rounded-2xl border border-tema-borda p-4">
            <legend className="px-1 font-semibold">
              {c.nome}
              {notaValida(notas[c.id]) && <span className="ml-2 font-normal text-tema-texto-suave">nota {notas[c.id]}</span>}
            </legend>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
              {NOTAS.map((n) => (
                <label key={n} className="relative">
                  <input
                    type="radio"
                    name={`nota-${c.id}`}
                    value={n}
                    checked={notas[c.id] === n}
                    onChange={() => setNotas((atual) => ({ ...atual, [c.id]: n }))}
                    className="peer sr-only"
                  />
                  <span
                    className={cx(
                      "flex min-h-11 cursor-pointer items-center justify-center rounded-xl border text-base font-semibold tabular-nums transition",
                      "peer-checked:border-tema-primaria peer-checked:bg-tema-primaria peer-checked:text-tema-sobre-primaria",
                      "peer-focus-visible:ring-2 peer-focus-visible:ring-tema-primaria peer-focus-visible:ring-offset-2",
                      "border-tema-texto-suave hover:bg-tema-superficie peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
                    )}
                  >
                    {n}
                  </span>
                </label>
              ))}
            </div>
            {erroCampo && (
              <p id={`erro-${c.id}`} className="text-sm font-medium text-tema-erro">
                {erroCampo}
              </p>
            )}
          </fieldset>
        );
      })}

      <AvisoIdentificado primeiraVez={primeiraVez} ciente={ciente} aoMudar={setCiente} desabilitado={salvando} />
      {tentou && primeiraVez && !ciente && <p className="text-sm font-medium text-tema-erro">Confirme que sabe que a avaliação é identificada.</p>}
      <ErroEnvio erro={erro} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {proximo && (
          <Botao variante="contorno" disabled={salvando} onClick={() => enviar(proximo)} aria-label={tituloProximo ? `Salvar e avaliar o próximo: ${tituloProximo}` : undefined}>
            Salvar e avaliar o próximo
          </Botao>
        )}
        <Botao type="submit" carregando={salvando} icone={<Save aria-hidden className="size-4" />}>
          {salvando ? "Salvando…" : "Salvar avaliação"}
        </Botao>
      </div>
    </form>
  );
}

function FormularioMelhores(props: PropsFormulario & { titulos: readonly ItemLista[] }) {
  const { item, criterios, avaliacao, eventoId, primeiraVez, voltar, aoSalvar, titulos } = props;
  const id = item.candidato.id;
  const [marcados, setMarcados] = useState<string[]>(() => criterios.filter((c) => avaliacao.escolhas[c.id] === id).map((c) => c.id));
  const [ciente, setCiente] = useState(false);
  const [tentou, setTentou] = useState(false);
  const { salvar, salvando, erro } = useSalvar(voltar, aoSalvar);
  const tituloDe = (candidatoId: string) => titulos.find((i) => i.candidato.id === candidatoId)?.candidato.titulo ?? "outro candidato";
  const podeSalvar = (!primeiraVez || ciente) && !salvando;

  function alternar(criterioId: string, marcado: boolean) {
    setMarcados((atual) => (marcado ? [...atual, criterioId] : atual.filter((x) => x !== criterioId)));
  }

  return (
    <form
      aria-busy={salvando || undefined}
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setTentou(true);
        if (!podeSalvar) return;
        void salvar(() => escolherMelhoresJuri({ eventoId, candidatoId: id, criterioIds: marcados }), null);
      }}
    >
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <Trophy aria-hidden className="size-5 text-tema-primaria-texto" />
        Melhor em qual critério?
      </h2>
      <p className="text-sm text-tema-texto-suave">
        Marque os critérios em que este é o melhor para você. Cada critério tem um só escolhido: marcar aqui troca a escolha anterior.
      </p>
      <fieldset disabled={salvando} className="flex flex-col gap-1 rounded-2xl border border-tema-borda p-4">
        <legend className="sr-only">Critérios</legend>
        {criterios.map((c) => {
          const atual = avaliacao.escolhas[c.id];
          const marcado = marcados.includes(c.id);
          const dica =
            atual && atual !== id
              ? marcado
                ? `Substitui ${tituloDe(atual)}.`
                : `Hoje: ${tituloDe(atual)}.`
              : atual === id && !marcado
                ? "Desmarcado: o critério fica sem escolha."
                : null;
          return (
            <div key={c.id} className="flex flex-col border-b border-tema-borda last:border-0">
              <Checkbox
                id={`melhor-${c.id}`}
                rotulo={<span className="font-semibold">Melhor {c.nome.toLocaleLowerCase("pt-BR")}</span>}
                checked={marcado}
                onChange={(e) => alternar(c.id, e.target.checked)}
              />
              {dica && <p className="-mt-1 pb-2 pl-8 text-sm text-tema-texto-suave">{dica}</p>}
            </div>
          );
        })}
      </fieldset>

      <AvisoIdentificado primeiraVez={primeiraVez} ciente={ciente} aoMudar={setCiente} desabilitado={salvando} />
      {tentou && primeiraVez && !ciente && <p className="text-sm font-medium text-tema-erro">Confirme que sabe que a avaliação é identificada.</p>}
      <ErroEnvio erro={erro} />

      <div className="flex justify-end">
        <Botao type="submit" carregando={salvando} icone={<Save aria-hidden className="size-4" />}>
          {salvando ? "Salvando…" : "Salvar escolhas"}
        </Botao>
      </div>
    </form>
  );
}
