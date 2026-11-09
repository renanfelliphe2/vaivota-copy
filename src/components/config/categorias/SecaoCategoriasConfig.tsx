"use client";

import { ArrowDown, ArrowUp, Copy, Download, ExternalLink, MonitorPlay, Plus, Save, Trash2, Undo2 } from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { useRef, useState, type ReactNode } from "react";
import { gerarSlugCategoria, LIMITES_CATEGORIA, rotaCategoria, validarCategorias } from "@/dominio/categorias";
import type { Candidato, Categoria } from "@/dominio/tipos";
import type { Travas } from "@/dominio/travas";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input } from "@/components/ui/Campo";
import { useToast } from "@/components/ui/Toast";
import { useOrigem } from "@/lib/useOrigem";
import { salvarCategorias, type CategoriaEditada } from "@/servicos/categorias";
import { useEventoAtivo } from "@/store/seletores/evento";
import { BannerTrava } from "../BannerTrava";
import { DicaTrava } from "../DicaTrava";
import { useFormularioSujo } from "../FormularioSujoProvider";
import { useServico } from "../useServico";

/**
 * Seção Categorias (09/11/2026, organograma do Festival Ver e Fazer Filmes). Cada categoria tem a sua página, o seu QR Code e o
 * seu voto: quem vota escolhe um item em cada categoria. Nome, prêmio e ordem mudam até concluir; criar, remover e trocar o
 * endereço travam com a urna aberta (o QR Code impresso aponta para o endereço). Abaixo da lista, o QR Code de cada categoria
 * salva: copiar o link, abrir em tela cheia para o telão ou baixar em PNG.
 */
export function SecaoCategoriasConfig({ travas }: { travas: Travas }) {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  return (
    <section aria-labelledby="titulo-secao" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 id="titulo-secao" tabIndex={-1} className="text-2xl font-bold">
          Categorias
        </h2>
        <p className="text-sm text-tema-texto-suave">
          Cada categoria tem a sua página, o seu QR Code e o seu voto: quem vota escolhe um {ativo.tema.rotuloCandidato.toLocaleLowerCase("pt-BR")} em cada
          categoria. Os itens entram numa categoria pela seção {ativo.tema.rotuloCandidatos}. Sem categorias, a votação é única.
        </p>
      </div>
      <BannerTrava travas={travas} acoes={["CATEGORIAS_ESTRUTURA"]} />
      <FormCategorias
        // Remonta quando o salvo muda.
        key={ativo.categorias.map((c) => `${c.id}=${c.nome}:${c.premio ?? ""}:${c.slug}`).join("|")}
        eventoId={ativo.evento.id}
        slugEvento={ativo.slug}
        salvas={ativo.categorias}
        candidatos={ativo.candidatos}
        travas={travas}
      />
      {ativo.categorias.length > 0 && <QrCodes slugEvento={ativo.slug} categorias={ativo.categorias} />}
    </section>
  );
}

/** Chave local estável de cada linha; `slugManual`: o endereço foi digitado (não segue mais o nome). */
type Linha = CategoriaEditada & { chave: string; slugManual: boolean };

function FormCategorias({
  eventoId,
  slugEvento,
  salvas,
  candidatos,
  travas,
}: {
  eventoId: string;
  slugEvento: string;
  salvas: readonly Categoria[];
  candidatos: readonly Candidato[];
  travas: Travas;
}) {
  const inicial = (): Linha[] => salvas.map((c) => ({ id: c.id, nome: c.nome, premio: c.premio ?? "", slug: c.slug, chave: c.id, slugManual: true }));
  const [linhas, setLinhas] = useState<Linha[]>(inicial);
  const [proximaChave, setProximaChave] = useState(1);
  const [tentou, setTentou] = useState(false);
  const { marcarSujo } = useFormularioSujo();
  const servico = useServico();

  const pode = travas.permite("CATEGORIAS_ROTULO");
  const podeEstrutura = travas.permite("CATEGORIAS_ESTRUTURA");
  const erros = { ...validarCategorias(linhas), ...(servico.erro?.campos ?? {}) };
  const temErro = Object.keys(validarCategorias(linhas)).length > 0;
  const alterado =
    JSON.stringify(linhas.map((l) => [l.id, l.nome.trim(), l.premio.trim(), l.slug.trim()])) !==
    JSON.stringify(salvas.map((c) => [c.id, c.nome, c.premio ?? "", c.slug]));
  const itensDa = (id: string | null) => (id ? candidatos.filter((c) => c.categoriaId === id) : []);

  function mudarLinhas(novas: Linha[]) {
    setLinhas(novas);
    marcarSujo(true);
  }

  function mudar(chave: string, mudanca: Partial<Linha>) {
    mudarLinhas(
      linhas.map((l) => {
        if (l.chave !== chave) return l;
        const nova = { ...l, ...mudanca };
        // Categoria nova: o endereço segue o nome até ser digitado à mão.
        if (mudanca.nome !== undefined && l.id === null && !l.slugManual) {
          const outros = linhas.filter((x) => x.chave !== chave).map((x) => x.slug);
          nova.slug = gerarSlugCategoria(mudanca.nome, outros);
        }
        return nova;
      }),
    );
  }

  function mover(i: number, delta: -1 | 1) {
    const novas = [...linhas];
    [novas[i], novas[i + delta]] = [novas[i + delta], novas[i]];
    mudarLinhas(novas);
  }

  function adicionar() {
    mudarLinhas([...linhas, { id: null, nome: "", premio: "", slug: "", chave: `nova-${proximaChave}`, slugManual: false }]);
    setProximaChave((n) => n + 1);
  }

  async function salvar() {
    setTentou(true);
    if (temErro) return;
    const r = await servico.executar(() => salvarCategorias(eventoId, linhas.map(({ id, nome, premio, slug }) => ({ id, nome, premio, slug }))));
    if (r.ok) marcarSujo(false);
  }

  const mostrar = (campo: string) => (tentou ? (erros[campo] ?? null) : (servico.erro?.campos?.[campo] ?? null));

  return (
    <div aria-busy={servico.carregando || undefined} className="flex flex-col gap-4">
      <DicaTrava motivo={pode ? null : travas.motivo("CATEGORIAS_ROTULO")} />
      {tentou && erros.categorias && <Alerta variante="erro">{erros.categorias}</Alerta>}
      {linhas.length === 0 && (
        <p className="text-tema-texto-suave">Nenhuma categoria. Sem categorias, todos os itens ficam numa votação única, na página do evento.</p>
      )}

      <fieldset disabled={!pode} className="flex flex-col gap-3">
        <legend className="sr-only">Categorias</legend>
        <ol className="flex flex-col gap-3">
          {linhas.map((l, i) => {
            const rotulo = l.nome || `categoria ${i + 1}`;
            const itens = itensDa(l.id);
            const travaEndereco = l.id !== null && !podeEstrutura;
            return (
              <li key={l.chave} className="flex flex-col gap-3 rounded-2xl border border-tema-borda bg-tema-superficie p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-tema-texto-suave">
                    Categoria {i + 1}
                    {l.id !== null && ` · ${itens.length} ${itens.length === 1 ? "item" : "itens"}`}
                  </p>
                  <div className="flex gap-1">
                    <BotaoIcone rotulo={`Subir ${rotulo}`} disabled={i === 0} onClick={() => mover(i, -1)}>
                      <ArrowUp aria-hidden className="size-4" />
                    </BotaoIcone>
                    <BotaoIcone rotulo={`Descer ${rotulo}`} disabled={i === linhas.length - 1} onClick={() => mover(i, 1)}>
                      <ArrowDown aria-hidden className="size-4" />
                    </BotaoIcone>
                    <BotaoIcone
                      rotulo={itens.length > 0 ? `${rotulo} tem itens: mude-os de categoria antes de remover` : `Remover ${rotulo}`}
                      disabled={!podeEstrutura || itens.length > 0}
                      onClick={() => mudarLinhas(linhas.filter((x) => x.chave !== l.chave))}
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </BotaoIcone>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Campo id={`categoria-nome-${l.chave}`} rotulo="Nome" obrigatorio erro={mostrar(`nome-${i}`)}>
                    <Input
                      value={l.nome}
                      maxLength={LIMITES_CATEGORIA.nome[1]}
                      placeholder="Ex.: Mostra Infantil"
                      onChange={(e) => mudar(l.chave, { nome: e.target.value })}
                    />
                  </Campo>
                  <Campo id={`categoria-premio-${l.chave}`} rotulo="Prêmio" erro={mostrar(`premio-${i}`)} dica="Opcional. Aparece abaixo do nome.">
                    <Input
                      value={l.premio}
                      maxLength={LIMITES_CATEGORIA.premio}
                      placeholder="Ex.: Melhor filme Júri Popular"
                      onChange={(e) => mudar(l.chave, { premio: e.target.value })}
                    />
                  </Campo>
                </div>
                <Campo
                  id={`categoria-slug-${l.chave}`}
                  rotulo="Endereço"
                  erro={mostrar(`slug-${i}`)}
                  dica={
                    travaEndereco
                      ? "Com a votação aberta, o endereço não muda (o QR Code aponta para ele)."
                      : `${rotaCategoria(slugEvento, l.slug || "…")}. Trocar o endereço invalida os QR Codes já impressos.`
                  }
                >
                  <Input
                    value={l.slug}
                    maxLength={LIMITES_CATEGORIA.slug[1]}
                    disabled={travaEndereco}
                    onChange={(e) => mudar(l.chave, { slug: e.target.value.toLowerCase(), slugManual: true })}
                  />
                </Campo>
              </li>
            );
          })}
        </ol>
        {linhas.length < LIMITES_CATEGORIA.maximo && podeEstrutura && (
          <Botao variante="contorno" tamanho="pequeno" className="self-start" onClick={adicionar} icone={<Plus aria-hidden className="size-4" />}>
            Adicionar categoria
          </Botao>
        )}
      </fieldset>

      {pode && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Botao
            variante="contorno"
            disabled={!alterado}
            onClick={() => {
              setLinhas(inicial());
              setTentou(false);
              servico.limparErro();
              marcarSujo(false);
            }}
            icone={<Undo2 aria-hidden className="size-4" />}
          >
            Descartar
          </Botao>
          <Botao onClick={() => void salvar()} disabled={!alterado} carregando={servico.carregando} icone={<Save aria-hidden className="size-4" />}>
            Salvar
          </Botao>
        </div>
      )}
    </div>
  );
}

/** O QR Code de cada categoria salva: o link, a tela cheia para o telão e o PNG para imprimir. */
function QrCodes({ slugEvento, categorias }: { slugEvento: string; categorias: readonly Categoria[] }) {
  const origem = useOrigem();
  return (
    <section aria-labelledby="titulo-qr" className="flex flex-col gap-3 border-t border-tema-borda pt-5">
      <div className="flex flex-col gap-1">
        <h3 id="titulo-qr" className="text-lg font-bold">
          QR Codes
        </h3>
        <p className="text-sm text-tema-texto-suave">
          Cada código leva direto à página de votação da categoria. &ldquo;Abrir no telão&rdquo; mostra o código em tela cheia, sem precisar de login no
          computador do telão.
        </p>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {categorias.map((c) => (
          <li key={c.id}>
            <CartaoQr categoria={c} url={origem ? `${origem}${rotaCategoria(slugEvento, c.slug)}` : ""} hrefTelao={`/e/${slugEvento}/qr/${c.slug}`} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CartaoQr({ categoria, url, hrefTelao }: { categoria: Categoria; url: string; hrefTelao: string }) {
  const toast = useToast();
  const canvas = useRef<HTMLDivElement>(null);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copiado", "sucesso");
    } catch {
      toast("Não foi possível copiar. Selecione o link e copie.", "erro");
    }
  }

  function baixar() {
    const alvo = canvas.current?.querySelector("canvas");
    if (!alvo) return;
    const a = document.createElement("a");
    a.href = alvo.toDataURL("image/png");
    a.download = `qr-${categoria.slug}.png`;
    a.click();
  }

  return (
    <div className="flex gap-4 rounded-2xl border border-tema-borda bg-tema-superficie p-4">
      <div className="shrink-0 rounded-xl bg-white p-2">
        {url ? (
          <QRCodeSVG value={url} size={112} level="M" marginSize={1} bgColor="#ffffff" fgColor="#000000" role="img" aria-label={`QR Code de ${categoria.nome}`} />
        ) : (
          <div className="size-28" />
        )}
      </div>
      {/* PNG grande (1024 px) só para o download; fica fora da tela. */}
      <div ref={canvas} aria-hidden className="hidden">
        {url && <QRCodeCanvas value={url} size={1024} level="M" marginSize={4} bgColor="#ffffff" fgColor="#000000" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="font-bold">{categoria.nome}</p>
        <p className="break-all text-sm text-tema-texto-suave">{url.replace(/^https?:\/\//, "")}</p>
        <div className="mt-auto flex flex-wrap gap-2">
          <Botao variante="contorno" tamanho="pequeno" disabled={!url} onClick={() => void copiar()} icone={<Copy aria-hidden className="size-4" />}>
            Copiar link
          </Botao>
          <a
            href={hrefTelao}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-tema-texto-suave px-4 text-sm font-semibold hover:bg-tema-fundo"
          >
            <MonitorPlay aria-hidden className="size-4" />
            Abrir no telão
            <span className="sr-only">(abre em nova aba)</span>
          </a>
          <Botao variante="fantasma" tamanho="pequeno" disabled={!url} onClick={baixar} icone={<Download aria-hidden className="size-4" />}>
            Baixar PNG
          </Botao>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold underline underline-offset-2">
              Ver página
              <ExternalLink aria-hidden className="size-3.5" />
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function BotaoIcone({ rotulo, disabled, onClick, children }: { rotulo: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-11 items-center justify-center rounded-full border border-tema-texto-suave hover:bg-tema-fundo disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
