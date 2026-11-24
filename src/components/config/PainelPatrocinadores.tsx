"use client";

import { ArrowLeft, ArrowRight, Handshake, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import type { Parceiro } from "@/dominio/tipos";
import type { Travas } from "@/dominio/travas";
import { LIMITES, validarArquivoImagem, validarParceiros } from "@/dominio/validacoesConfig";
import { LogoParceiro } from "@/components/evento/LogoParceiro";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { cx } from "@/lib/classes";
import { enviarImagemCandidato } from "@/servicos/candidatosAdmin";
import { salvarParceiros, type ParceiroEditado } from "@/servicos/parceiros";
import { useEventoAtivo } from "@/store/seletores/evento";
import { BannerTrava } from "./BannerTrava";
import { DicaTrava } from "./DicaTrava";
import { useFormularioSujo } from "./FormularioSujoProvider";
import { useServico } from "./useServico";

/**
 * Patrocinadores do evento (24/11/2026; antes era a seção Parceiros): nome, logo e, se tiver, o link do site de cada um, na ordem
 * da faixa do telão e da página do evento. Em Geral, abaixo do formulário, fica um resumo (as logos em grade) e o botão que abre
 * o modal, onde cada patrocinador é um cartão da grade. Os dados seguem na tabela `parceiro`.
 */
export function PainelPatrocinadores({ travas }: { travas: Travas }) {
  const ativo = useEventoAtivo();
  const [aberto, setAberto] = useState(false);
  if (!ativo) return null;
  const lista = ativo.parceiros;
  const pode = travas.permite("TEMA");
  return (
    <section aria-labelledby="titulo-patrocinadores" className="flex flex-col gap-4 rounded-2xl border border-tema-borda bg-tema-superficie p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="titulo-patrocinadores" className="flex items-center gap-2 text-lg font-bold">
            <Handshake aria-hidden className="size-5" />
            Patrocinadores
            {lista.length > 0 && <span className="text-sm font-normal text-tema-texto-suave">({lista.length})</span>}
          </h3>
          <p className="text-sm text-tema-texto-suave">No rodapé do telão antes da revelação e na página do evento.</p>
        </div>
        <Botao variante="contorno" tamanho="pequeno" onClick={() => setAberto(true)}>
          {pode ? "Gerenciar patrocinadores" : "Ver patrocinadores"}
        </Botao>
      </div>
      {lista.length === 0 ? (
        <p className="text-sm text-tema-texto-suave">Nenhum patrocinador. Sem eles, a faixa do telão e da página não aparece.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {lista.slice(0, 12).map((p) => (
            <li key={p.id} title={p.nome} className="flex h-16 min-w-0 items-center justify-center overflow-hidden rounded-lg border border-tema-borda bg-tema-fundo px-1.5">
              <LogoParceiro parceiro={p} className="max-h-11 max-w-full" classeNome="line-clamp-2 whitespace-normal! text-center text-xs font-semibold leading-tight" />
            </li>
          ))}
          {lista.length > 12 && (
            <li className="flex h-16 items-center justify-center rounded-lg border border-dashed border-tema-borda text-xs font-semibold text-tema-texto-suave">
              +{lista.length - 12}
            </li>
          )}
        </ul>
      )}
      <ModalPatrocinadores aberto={aberto} aoFechar={() => setAberto(false)} eventoId={ativo.evento.id} salvos={lista} travas={travas} />
    </section>
  );
}

/** Chave local estável de cada cartão (o id do parceiro ainda não existe nos novos). */
type Linha = { id: string | null; nome: string; logoUrl: string | null; linkUrl: string; chave: string };

const doSalvo = (salvos: readonly Parceiro[]): Linha[] =>
  salvos.map((p) => ({ id: p.id, nome: p.nome, logoUrl: p.logoUrl, linkUrl: p.linkUrl ?? "", chave: p.id }));

/**
 * O modal fica sempre montado (o <dialog> devolve o foco a quem abriu ao fechar); o rascunho recomeça do salvo a cada abertura.
 * Botões no rodapé do Dialogo, fora da área que rola. Fechar com alteração pendente pergunta antes (FormularioSujoProvider).
 */
function ModalPatrocinadores({
  aberto,
  aoFechar,
  eventoId,
  salvos,
  travas,
}: {
  aberto: boolean;
  aoFechar: () => void;
  eventoId: string;
  salvos: readonly Parceiro[];
  travas: Travas;
}) {
  const [linhas, setLinhas] = useState<Linha[]>(() => doSalvo(salvos));
  const [proximaChave, setProximaChave] = useState(1);
  const [focarChave, setFocarChave] = useState<string | null>(null);
  const [tentou, setTentou] = useState(false);
  const [errosLogo, setErrosLogo] = useState<Record<string, string>>({});
  /** Cartões com um logo subindo (o envio é assíncrono). */
  const [enviando, setEnviando] = useState<Record<string, boolean>>({});
  const { marcarSujo, confirmarSaida } = useFormularioSujo();
  const servico = useServico();

  // Ajuste no próprio render: a cada abertura, o rascunho volta ao que está salvo.
  const [abertoAntes, setAbertoAntes] = useState(aberto);
  if (aberto !== abertoAntes) {
    setAbertoAntes(aberto);
    if (aberto) {
      setLinhas(doSalvo(salvos));
      setTentou(false);
      setErrosLogo({});
      setFocarChave(null);
      servico.limparErro();
    }
  }

  const pode = travas.permite("TEMA");
  const erros = validarParceiros(linhas.map((l) => l.nome), linhas.map((l) => l.linkUrl));
  const temErro = Object.keys(erros).length > 0;
  const subindo = Object.values(enviando).some(Boolean);
  const alterado =
    JSON.stringify(linhas.map((l) => [l.id, l.nome.trim(), l.logoUrl, l.linkUrl.trim()])) !==
    JSON.stringify(salvos.map((p) => [p.id, p.nome, p.logoUrl, p.linkUrl ?? ""]));

  function fechar() {
    if (!alterado) {
      marcarSujo(false);
      aoFechar();
    } else confirmarSaida(aoFechar);
  }

  function mudarLinhas(novas: Linha[]) {
    setLinhas(novas);
    marcarSujo(true);
  }

  // Funcional: o envio do logo termina depois de um await, e a lista pode ter mudado nesse meio-tempo.
  function mudar(chave: string, mudanca: Partial<Linha>) {
    setLinhas((atuais) => atuais.map((x) => (x.chave === chave ? { ...x, ...mudanca } : x)));
    marcarSujo(true);
  }

  function mover(i: number, delta: -1 | 1) {
    const novas = [...linhas];
    [novas[i], novas[i + delta]] = [novas[i + delta], novas[i]];
    mudarLinhas(novas);
  }

  function adicionar() {
    const chave = `novo-${proximaChave}`;
    mudarLinhas([...linhas, { id: null, nome: "", logoUrl: null, linkUrl: "", chave }]);
    setProximaChave((n) => n + 1);
    setFocarChave(chave);
  }

  // O arquivo sobe ao servidor assim que é escolhido (ele confere tipo e tamanho pelo conteúdo e grava no Storage); o cartão guarda
  // a URL pública que voltou.
  async function enviarLogo(chave: string, arquivo: File) {
    const problema = validarArquivoImagem(arquivo);
    setErrosLogo((e) => ({ ...e, [chave]: problema ?? "" }));
    if (problema) return;
    setEnviando((e) => ({ ...e, [chave]: true }));
    const r = await enviarImagemCandidato(eventoId, arquivo);
    setEnviando((e) => ({ ...e, [chave]: false }));
    if (!r.ok) {
      setErrosLogo((e) => ({ ...e, [chave]: r.erro.campos?.imagemUrl ?? r.erro.mensagem }));
      return;
    }
    mudar(chave, { logoUrl: r.dados.url });
  }

  async function salvar() {
    setTentou(true);
    if (temErro || subindo) return;
    const r = await servico.executar(() =>
      salvarParceiros(eventoId, linhas.map(({ id, nome, logoUrl, linkUrl }): ParceiroEditado => ({ id, nome, logoUrl, linkUrl: linkUrl.trim() || null }))),
    );
    if (r.ok) {
      marcarSujo(false);
      aoFechar();
    }
  }

  const rodape = pode ? (
    <>
      <Botao variante="contorno" onClick={fechar}>
        Cancelar
      </Botao>
      <Botao onClick={() => void salvar()} disabled={!alterado || subindo} carregando={servico.carregando}>
        Salvar patrocinadores
      </Botao>
    </>
  ) : (
    <Botao variante="contorno" onClick={fechar}>
      Fechar
    </Botao>
  );

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={fechar}
      fecharNoFundo={false}
      titulo="Patrocinadores"
      descricao="Na ordem em que aparecem no rodapé do telão (antes da revelação) e na página do evento, onde a logo leva ao site, se houver."
      rodape={rodape}
      className="sm:w-[calc(100%-2rem)] sm:max-w-5xl!"
    >
      <div aria-busy={servico.carregando || undefined} className="flex flex-col gap-4">
        <BannerTrava travas={travas} acoes={["TEMA"]} />
        <DicaTrava motivo={pode ? null : travas.motivo("TEMA")} />
        {/* O toast fica atrás do modal (fora da camada do <dialog>): o erro do servidor aparece aqui também. */}
        {servico.erro && <Alerta variante="erro">{servico.erro.mensagem}</Alerta>}
        {tentou && erros.parceiros && <Alerta variante="erro">{erros.parceiros}</Alerta>}

        <fieldset disabled={!pode} className="min-w-0">
          <legend className="sr-only">Patrocinadores</legend>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {linhas.map((l, i) => {
              const rotulo = l.nome.trim() || `patrocinador ${i + 1}`;
              const erroNome = (tentou || l.nome ? (erros[`parceiro-${i}`] ?? null) : null) ?? servico.erro?.campos?.[`parceiro-${i}`] ?? null;
              const erroLink = (l.linkUrl ? (erros[`parceiro-link-${i}`] ?? null) : null) ?? servico.erro?.campos?.[`parceiro-link-${i}`] ?? null;
              return (
                <li key={l.chave} className="flex min-w-0 flex-col gap-3 rounded-xl border border-tema-borda bg-tema-superficie p-3">
                  <div className="flex items-center justify-end gap-1">
                    <BotaoIcone rotulo={`Mover ${rotulo} para antes`} disabled={i === 0} onClick={() => mover(i, -1)}>
                      <ArrowLeft aria-hidden className="size-4" />
                    </BotaoIcone>
                    <BotaoIcone rotulo={`Mover ${rotulo} para depois`} disabled={i === linhas.length - 1} onClick={() => mover(i, 1)}>
                      <ArrowRight aria-hidden className="size-4" />
                    </BotaoIcone>
                    <BotaoIcone rotulo={`Excluir ${rotulo}`} perigo onClick={() => mudarLinhas(linhas.filter((x) => x.chave !== l.chave))}>
                      <Trash2 aria-hidden className="size-4" />
                    </BotaoIcone>
                  </div>

                  <LogoEditavel
                    linha={l}
                    rotulo={rotulo}
                    pode={pode}
                    enviando={Boolean(enviando[l.chave])}
                    aoEscolher={(arquivo) => void enviarLogo(l.chave, arquivo)}
                    aoRemover={() => mudar(l.chave, { logoUrl: null })}
                  />
                  {errosLogo[l.chave] && (
                    <p role="alert" className="text-sm font-medium text-tema-erro">
                      {errosLogo[l.chave]}
                    </p>
                  )}

                  <Campo id={`parceiro-${l.chave}`} rotulo="Nome" obrigatorio erro={erroNome}>
                    <Input
                      value={l.nome}
                      maxLength={LIMITES.nomeParceiro[1]}
                      placeholder="Nome do patrocinador"
                      autoFocus={focarChave === l.chave}
                      onChange={(e) => mudar(l.chave, { nome: e.target.value })}
                    />
                  </Campo>
                  <Campo id={`parceiro-link-${l.chave}`} rotulo="Site (opcional)" erro={erroLink}>
                    <Input
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      value={l.linkUrl}
                      maxLength={LIMITES.linkParceiro}
                      placeholder="site.com.br"
                      onChange={(e) => mudar(l.chave, { linkUrl: e.target.value })}
                    />
                  </Campo>
                </li>
              );
            })}

            {pode && linhas.length < LIMITES.maxParceiros && (
              <li className="flex min-h-48">
                <button
                  type="button"
                  onClick={adicionar}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-tema-borda p-6 text-sm font-semibold text-tema-texto-suave hover:border-tema-primaria hover:text-tema-primaria-texto focus-visible:outline-3 focus-visible:outline-tema-foco"
                >
                  <Plus aria-hidden className="size-6" />
                  Adicionar patrocinador
                </button>
              </li>
            )}
          </ol>
          {linhas.length === 0 && !pode && <p className="text-tema-texto-suave">Nenhum patrocinador cadastrado.</p>}
        </fieldset>

        <p className="text-sm text-tema-texto-suave">
          Logo em PNG, JPG ou WebP, até 2 MB; prefira fundo transparente. Até {LIMITES.maxParceiros} patrocinadores.
        </p>
      </div>
    </Dialogo>
  );
}

/**
 * A logo do cartão é o próprio controle (24/11/2026). Um lápis no canto diz que é editável. Com mouse, passar por cima mostra
 * "Trocar"/"Adicionar" e "Remover", e clicar em qualquer ponto da imagem abre o seletor de arquivos. No toque (sem hover), o
 * primeiro toque revela os botões e o segundo age, para ninguém apagar a logo sem querer. Pelo teclado, o foco revela os botões.
 */
function LogoEditavel({
  linha,
  rotulo,
  pode,
  enviando,
  aoEscolher,
  aoRemover,
}: {
  linha: Linha;
  rotulo: string;
  pode: boolean;
  enviando: boolean;
  aoEscolher: (arquivo: File) => void;
  aoRemover: () => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [revelado, setRevelado] = useState(false);
  const temLogo = Boolean(linha.logoUrl);
  const escolher = () => entrada.current?.click();

  const imagem = temLogo ? (
    <LogoParceiro parceiro={linha} className="max-h-20 max-w-full" />
  ) : (
    <span className="flex flex-col items-center gap-1 text-xs text-tema-texto-suave">
      <ImagePlus aria-hidden className="size-6" />
      Sem logo: aparece o nome
    </span>
  );

  if (!pode)
    return <div className="flex h-28 items-center justify-center overflow-hidden rounded-lg border border-tema-borda bg-tema-fundo px-3">{imagem}</div>;

  const mostrar = revelado || enviando;
  return (
    <div
      className="group/logo relative h-28 overflow-hidden rounded-lg border border-tema-borda bg-tema-fundo"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setRevelado(false);
      }}
    >
      <input
        ref={entrada}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        disabled={enviando}
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          e.target.value = "";
          setRevelado(false);
          if (arquivo) aoEscolher(arquivo);
        }}
      />
      {/* A imagem inteira: com mouse abre o seletor; no toque, revela os botões (se houver o que remover). */}
      <button
        type="button"
        aria-label={temLogo ? `Trocar a logo de ${rotulo}` : `Adicionar a logo de ${rotulo}`}
        disabled={enviando}
        onClick={() => {
          const comHover = window.matchMedia("(hover: hover)").matches;
          if (comHover || !temLogo || revelado) escolher();
          else setRevelado(true);
        }}
        className="absolute inset-0 flex cursor-pointer items-center justify-center px-3 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-tema-foco"
      >
        {imagem}
      </button>

      {/* Lápis: sempre à vista, some quando os botões aparecem. */}
      <span
        aria-hidden
        className={cx(
          "pointer-events-none absolute bottom-1.5 right-1.5 inline-flex size-7 items-center justify-center rounded-full bg-tema-primaria text-tema-sobre-primaria shadow transition-opacity",
          "group-hover/logo:opacity-0 group-has-focus-visible/logo:opacity-0",
          mostrar && "opacity-0",
        )}
      >
        <Pencil className="size-3.5" />
      </span>

      {/* Botões sobre a imagem: hover, foco ou o primeiro toque. Escondidos, não recebem clique. */}
      <div
        className={cx(
          "pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-black/55 opacity-0 transition-opacity",
          "group-hover/logo:opacity-100 group-has-focus-visible/logo:opacity-100",
          mostrar && "opacity-100",
        )}
      >
        {enviando ? (
          <span className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-neutral-900">Enviando…</span>
        ) : (
          <>
            <button
              type="button"
              tabIndex={-1}
              onClick={escolher}
              className={cx(
                "inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-semibold text-neutral-900 shadow hover:bg-neutral-100",
                "group-hover/logo:pointer-events-auto group-has-focus-visible/logo:pointer-events-auto",
                mostrar && "pointer-events-auto",
              )}
            >
              <Pencil aria-hidden className="size-4" />
              {temLogo ? "Trocar" : "Adicionar"}
            </button>
            {temLogo && (
              <button
                type="button"
                aria-label={`Remover a logo de ${rotulo}`}
                onClick={() => {
                  setRevelado(false);
                  aoRemover();
                }}
                className={cx(
                  "inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-semibold text-red-700 shadow hover:bg-red-50",
                  "focus-visible:outline-3 focus-visible:outline-tema-foco",
                  "group-hover/logo:pointer-events-auto group-has-focus-visible/logo:pointer-events-auto",
                  mostrar && "pointer-events-auto",
                )}
              >
                <Trash2 aria-hidden className="size-4" />
                Remover
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BotaoIcone({
  rotulo,
  disabled,
  perigo = false,
  onClick,
  children,
}: {
  rotulo: string;
  disabled?: boolean;
  perigo?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-tema-fundo disabled:cursor-not-allowed disabled:opacity-40",
        perigo && "text-tema-erro",
      )}
    >
      {children}
    </button>
  );
}
