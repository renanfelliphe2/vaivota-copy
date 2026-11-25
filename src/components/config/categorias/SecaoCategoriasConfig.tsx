"use client";

import { ArrowLeft, ArrowRight, Check, Copy, Download, ExternalLink, Film, Globe, Layers, ListPlus, Lock, MonitorPlay, Pencil, Plus, Search, Tablet, Trash2 } from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { useRef, useState, type ReactNode } from "react";
import { categoriasDoCanal, enderecosDasCategorias, LIMITES_CATEGORIA, ROTULOS_CANAL, rotaCategoria, validarCategorias } from "@/dominio/categorias";
import { avisoCamposPerdidos, camposDaCategoria, camposPerdidosNaMudanca } from "@/dominio/camposExtras";
import type { CampoCandidato, Candidato, CanalCategoria, Categoria } from "@/dominio/tipos";
import type { Travas } from "@/dominio/travas";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input, Select, Textarea } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { Selo } from "@/components/ui/Selo";
import { DialogoConfirmacao } from "@/components/ui/DialogoConfirmacao";
import { useToast } from "@/components/ui/Toast";
import { cx } from "@/lib/classes";
import { useOrigem } from "@/lib/useOrigem";
import { salvarCategorias, vincularCandidatosCategoria, type CategoriaEditada } from "@/servicos/categorias";
import { useEventoAtivo } from "@/store/seletores/evento";
import { BannerTrava } from "../BannerTrava";
import { CamposExtrasEditor } from "../candidatos/CamposExtrasEditor";
import { DicaTrava } from "../DicaTrava";
import { useFormularioSujo } from "../FormularioSujoProvider";
import { useServico } from "../useServico";

/**
 * Seção Categorias (09/11/2026, organograma do Festival Ver e Fazer Filmes). Cada categoria tem a sua página, o seu QR Code e o
 * seu voto: quem vota escolhe um item em cada categoria.
 *
 * 24/11/2026: virou o lugar onde os itens são vinculados às categorias (antes era um campo no formulário de cada item). Cada
 * categoria é um cartão com os seus itens; "Selecionar" abre um modal com todos os itens do evento para marcar os da categoria.
 * Criar e editar são num modal; mover, editar e excluir salvam na hora. Nome, prêmio e ordem mudam até concluir; criar, excluir,
 * trocar o endereço e mudar item de categoria travam com a urna aberta (o voto de cada pessoa é por categoria e o QR Code
 * impresso aponta para o endereço). Abaixo, o QR Code de cada categoria.
 */
export function SecaoCategoriasConfig({ travas }: { travas: Travas }) {
  const ativo = useEventoAtivo();
  const [editando, setEditando] = useState<Categoria | "nova" | null>(null);
  const [selecionando, setSelecionando] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<Categoria | null>(null);
  const [camposDe, setCamposDe] = useState<string | null>(null);
  const servico = useServico();
  const { confirmarSaida } = useFormularioSujo();
  if (!ativo) return null;

  const { categorias, candidatos, camposCandidato } = ativo;
  const categoriaCampos = categorias.find((c) => c.id === camposDe) ?? null;
  const rotulo = ativo.tema.rotuloCandidatos;
  const rotuloMin = rotulo.toLocaleLowerCase("pt-BR");
  const pode = travas.permite("CATEGORIAS_ROTULO");
  const podeEstrutura = travas.permite("CATEGORIAS_ESTRUTURA");
  const itensDa = (id: string) => candidatos.filter((c) => c.categoriaId === id);
  const semCategoria = candidatos.filter((c) => !c.categoriaId);
  const comoEdicao = (c: Categoria): CategoriaEditada => ({ id: c.id, nome: c.nome, premio: c.premio ?? "", descricao: c.descricao ?? "", canal: c.canal });
  const daPagina = categoriasDoCanal(categorias, "ONLINE");
  const salvarLista = (lista: CategoriaEditada[], sucesso: string) => servico.executar(() => salvarCategorias(ativo.evento.id, lista), sucesso);

  function mover(i: number, delta: -1 | 1) {
    const lista = categorias.map(comoEdicao);
    [lista[i], lista[i + delta]] = [lista[i + delta], lista[i]];
    void salvarLista(lista, "Ordem salva");
  }

  return (
    <section aria-labelledby="titulo-secao" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex max-w-3xl flex-col gap-1">
          <h2 id="titulo-secao" tabIndex={-1} className="text-2xl font-bold">
            Categorias
          </h2>
          <p className="text-sm text-tema-texto-suave">
            Cada categoria tem a sua página, o seu QR Code e o seu voto: quem vota escolhe um {ativo.tema.rotuloCandidato.toLocaleLowerCase("pt-BR")} em cada
            categoria. Aqui você cria as categorias e escolhe os {rotuloMin} de cada uma. Cada categoria é votada num lugar só: na página do evento
            ou nos totens.
          </p>
        </div>
        {podeEstrutura && categorias.length < LIMITES_CATEGORIA.maximo && (
          <Botao onClick={() => setEditando("nova")} icone={<Plus aria-hidden className="size-4" />}>
            Nova categoria
          </Botao>
        )}
      </div>
      <BannerTrava travas={travas} acoes={["CATEGORIAS_ROTULO", "CATEGORIAS_ESTRUTURA", "CAMPOS_EXTRAS_ESTRUTURA"]} />
      <DicaTrava motivo={pode ? null : travas.motivo("CATEGORIAS_ROTULO")} />

      {categorias.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-tema-borda p-6">
          <p className="text-tema-texto-suave">Nenhuma categoria. O evento precisa de ao menos uma para a votação.</p>
          {podeEstrutura && (
            <Botao variante="contorno" onClick={() => setEditando("nova")} icone={<Plus aria-hidden className="size-4" />}>
              Criar a primeira categoria
            </Botao>
          )}
        </div>
      ) : (
        <ol aria-busy={servico.carregando || undefined} className="grid gap-4 lg:grid-cols-2">
          {categorias.map((c, i) => (
            <li key={c.id} className="flex">
              <CartaoCategoria
                categoria={c}
                itens={itensDa(c.id)}
                campos={camposDaCategoria(camposCandidato, c.id)}
                aoCampos={() => setCamposDe(c.id)}
                slugEvento={ativo.slug}
                rotulo={rotulo}
                primeira={i === 0}
                ultima={i === categorias.length - 1}
                pode={pode && !servico.carregando}
                podeEstrutura={podeEstrutura}
                unica={categorias.length === 1}
                aoMover={(delta) => mover(i, delta)}
                aoEditar={() => setEditando(c)}
                aoExcluir={() => setExcluindo(c)}
                aoSelecionar={() => setSelecionando(c.id)}
              />
            </li>
          ))}
        </ol>
      )}

      {categorias.length > 0 && semCategoria.length > 0 && <SemCategoria itens={semCategoria} rotulo={rotulo} />}

      {/* As do totem não têm página nem QR Code: são votadas só nos totens. */}
      {daPagina.length > 0 && <QrCodes slugEvento={ativo.slug} categorias={daPagina} />}

      <ModalCategoria
        aberto={editando !== null}
        categoria={editando === "nova" ? null : editando}
        todas={categorias}
        campos={camposCandidato}
        slugEvento={ativo.slug}
        podeEstrutura={podeEstrutura}
        aoFechar={() => setEditando(null)}
        aoSalvar={(lista, nova) => salvarLista(lista, nova ? "Categoria criada" : "Categoria salva")}
      />
      <ModalItens
        aberto={selecionando !== null}
        categoria={categorias.find((c) => c.id === selecionando) ?? null}
        categorias={categorias}
        candidatos={candidatos}
        campos={camposCandidato}
        eventoId={ativo.evento.id}
        rotulo={rotulo}
        pode={podeEstrutura}
        motivoTrava={travas.motivo("CATEGORIAS_ESTRUTURA")}
        aoFechar={() => setSelecionando(null)}
      />
      {/* D1 (25/11/2026): os campos extras são de cada categoria. */}
      <Dialogo
        aberto={categoriaCampos !== null}
        aoFechar={() => confirmarSaida(() => setCamposDe(null))}
        fecharNoFundo={false}
        titulo={`Campos extras de ${categoriaCampos?.nome ?? ""}`}
        descricao="Informações que cada item da categoria preenche, como Direção ou Duração."
        className="sm:max-w-2xl!"
      >
        {categoriaCampos && (
          <CamposExtrasEditor
            eventoId={ativo.evento.id}
            categoria={categoriaCampos}
            categorias={categorias}
            campos={camposCandidato}
            candidatos={candidatos}
            travas={travas}
            aoSalvar={() => setCamposDe(null)}
          />
        )}
      </Dialogo>
      <DialogoConfirmacao
        aberto={excluindo !== null}
        aoFechar={() => setExcluindo(null)}
        carregando={servico.carregando}
        perigo
        titulo={`Excluir a categoria ${excluindo?.nome ?? ""}?`}
        consequencia="A página e o QR Code desta categoria deixam de existir. QR Codes já impressos param de funcionar."
        rotuloConfirmar="Excluir"
        aoConfirmar={async () => {
          if (!excluindo) return;
          const r = await salvarLista(
            categorias.filter((c) => c.id !== excluindo.id).map(comoEdicao),
            "Categoria excluída",
          );
          if (r.ok) setExcluindo(null);
        }}
      />
    </section>
  );
}

/** Uma categoria: nome, prêmio, descrição, os itens (cartazes pequenos) e as ações. */
function CartaoCategoria({
  categoria,
  itens,
  slugEvento,
  rotulo,
  primeira,
  ultima,
  pode,
  podeEstrutura,
  unica,
  aoMover,
  aoEditar,
  aoExcluir,
  aoSelecionar,
  campos,
  aoCampos,
}: {
  categoria: Categoria;
  itens: Candidato[];
  /** Os campos extras desta categoria (D1). */
  campos: CampoCandidato[];
  aoCampos: () => void;
  slugEvento: string;
  rotulo: string;
  primeira: boolean;
  ultima: boolean;
  pode: boolean;
  podeEstrutura: boolean;
  /** A única do evento: não sai (todo evento tem ao menos uma categoria). */
  unica: boolean;
  aoMover: (delta: -1 | 1) => void;
  aoEditar: () => void;
  aoExcluir: () => void;
  aoSelecionar: () => void;
}) {
  const naVotacao = itens.filter((c) => c.publicado && !c.desqualificado).length;
  const singular = (useEventoAtivo()?.tema.rotuloCandidato ?? "item").toLocaleLowerCase("pt-BR");
  const MOSTRAR = 8;
  return (
    <article aria-labelledby={`cat-${categoria.id}`} className="flex w-full flex-col gap-4 rounded-2xl border border-tema-borda bg-tema-superficie p-5">
      {/* Celular: os quatro botões descem para a linha de baixo quando o nome não cabe ao lado. */}
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <div className="flex min-w-48 flex-1 flex-col gap-0.5">
          <h3 id={`cat-${categoria.id}`} className="text-lg font-bold wrap-anywhere">
            {categoria.nome}
          </h3>
          {categoria.premio && <p className="text-sm font-medium text-tema-primaria-texto">{categoria.premio}</p>}
          <Selo variante={categoria.canal === "TOTEM" ? "info" : "neutro"} icone={categoria.canal === "TOTEM" ? Tablet : Globe} className="mt-1 self-start">
            {categoria.canal === "TOTEM" ? "Votada no totem" : "Votada na página"}
          </Selo>
        </div>
        <div className="-mr-2 -mt-1 ml-auto flex shrink-0">
          <BotaoIcone rotulo={`Mover ${categoria.nome} para antes`} disabled={!pode || primeira} onClick={() => aoMover(-1)}>
            <ArrowLeft aria-hidden className="size-4" />
          </BotaoIcone>
          <BotaoIcone rotulo={`Mover ${categoria.nome} para depois`} disabled={!pode || ultima} onClick={() => aoMover(1)}>
            <ArrowRight aria-hidden className="size-4" />
          </BotaoIcone>
          <BotaoIcone rotulo={`Editar ${categoria.nome}`} disabled={!pode} onClick={aoEditar}>
            <Pencil aria-hidden className="size-4" />
          </BotaoIcone>
          <BotaoIcone
            rotulo={
              unica
                ? "O evento precisa de ao menos uma categoria"
                : itens.length > 0
                  ? `${categoria.nome} tem ${rotulo.toLocaleLowerCase("pt-BR")}: tire-os antes de excluir`
                  : `Excluir ${categoria.nome}`
            }
            disabled={!podeEstrutura || itens.length > 0 || unica}
            perigo
            onClick={aoExcluir}
          >
            <Trash2 aria-hidden className="size-4" />
          </BotaoIcone>
        </div>
      </div>

      {categoria.descricao && <p className="line-clamp-2 text-sm text-tema-texto-suave">{categoria.descricao}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-tema-fundo px-3 py-2 text-sm">
        <span className="min-w-0">
          <span className="font-semibold">Campos extras: </span>
          <span className="text-tema-texto-suave">{campos.length ? campos.map((c) => c.rotulo).join(", ") : "nenhum"}</span>
        </span>
        <Botao variante="fantasma" tamanho="pequeno" onClick={aoCampos} aria-label={`Campos extras de ${categoria.nome}`} icone={<ListPlus aria-hidden className="size-4" />}>
          Campos
        </Botao>
      </div>

      {itens.length === 0 ? (
        <button
          type="button"
          onClick={aoSelecionar}
          className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-tema-borda p-4 text-sm font-semibold text-tema-texto-suave hover:border-tema-primaria hover:text-tema-primaria-texto focus-visible:outline-3 focus-visible:outline-tema-foco"
        >
          <Film aria-hidden className="size-6" />
          Nenhum {singular} nesta categoria. Selecionar {rotulo.toLocaleLowerCase("pt-BR")}
        </button>
      ) : (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-4 2xl:grid-cols-8">
          {itens.slice(0, MOSTRAR).map((c) => (
            <li key={c.id} title={c.titulo} className={cx("overflow-hidden rounded-lg", (!c.publicado || c.desqualificado) && "opacity-50")}>
              <ImagemCandidato titulo={c.titulo} imagemUrl={c.imagemUrl} proporcao="5/7" sizes="5rem" />
            </li>
          ))}
          {itens.length > MOSTRAR && (
            <li className="flex aspect-[5/7] items-center justify-center rounded-lg border border-dashed border-tema-borda text-sm font-semibold text-tema-texto-suave">
              +{itens.length - MOSTRAR}
            </li>
          )}
        </ul>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-tema-borda pt-4">
        <div className="flex min-w-0 flex-col text-sm">
          <span className="font-semibold">
            {itens.length} {itens.length === 1 ? singular : rotulo.toLocaleLowerCase("pt-BR")}
            {itens.length > 0 && <span className="font-normal text-tema-texto-suave"> · {naVotacao} na votação</span>}
          </span>
          <span className="truncate text-tema-texto-suave">
            {categoria.canal === "TOTEM" ? "Sem página: só nos totens que a exibem" : rotaCategoria(slugEvento, categoria.slug)}
          </span>
        </div>
        <Botao variante="contorno" tamanho="pequeno" onClick={aoSelecionar} icone={<Film aria-hidden className="size-4" />}>
          Selecionar {rotulo.toLocaleLowerCase("pt-BR")}
        </Botao>
      </div>
    </article>
  );
}

/** Itens sem categoria: num evento com categorias, eles não aparecem em página nenhuma. */
function SemCategoria({ itens, rotulo }: { itens: Candidato[]; rotulo: string }) {
  return (
    <section aria-labelledby="titulo-sem-categoria" className="flex flex-col gap-3 rounded-2xl border border-tema-aviso/40 bg-tema-superficie p-5">
      <div className="flex flex-col gap-1">
        <h3 id="titulo-sem-categoria" className="flex items-center gap-2 font-bold">
          <Layers aria-hidden className="size-4 text-tema-aviso" />
          Sem categoria ({itens.length})
        </h3>
        <p className="text-sm text-tema-texto-suave">
          Não aparecem em nenhuma página de votação. Use &ldquo;Selecionar {rotulo.toLocaleLowerCase("pt-BR")}&rdquo; numa categoria para incluí-los.
        </p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {itens.map((c) => (
          <li key={c.id} className="flex items-center gap-2 rounded-full border border-tema-borda bg-tema-fundo py-1 pl-1 pr-3 text-sm">
            <span className="size-7 shrink-0 overflow-hidden rounded-full">
              <ImagemCandidato titulo={c.titulo} imagemUrl={c.imagemUrl} proporcao="1/1" sizes="28px" />
            </span>
            <span className="max-w-48 truncate">{c.titulo}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Criar ou editar uma categoria. O formulário vive dentro do Dialogo (que só monta o conteúdo aberto), então cada abertura
 * começa do salvo. Salvar manda a lista inteira, com esta categoria no lugar dela (ou no fim, se nova).
 */
function ModalCategoria({
  aberto,
  categoria,
  todas,
  campos,
  slugEvento,
  podeEstrutura,
  aoFechar,
  aoSalvar,
}: {
  aberto: boolean;
  categoria: Categoria | null;
  todas: readonly Categoria[];
  campos: readonly CampoCandidato[];
  slugEvento: string;
  podeEstrutura: boolean;
  aoFechar: () => void;
  aoSalvar: (lista: CategoriaEditada[], nova: boolean) => Promise<{ ok: boolean; erro?: { campos?: Record<string, string>; mensagem: string } }>;
}) {
  const { confirmarSaida } = useFormularioSujo();
  return (
    <Dialogo
      aberto={aberto}
      aoFechar={() => confirmarSaida(aoFechar)}
      fecharNoFundo={false}
      titulo={categoria ? `Editar ${categoria.nome}` : "Nova categoria"}
      className="sm:max-w-2xl!"
    >
      <FormCategoria categoria={categoria} todas={todas} campos={campos} slugEvento={slugEvento} podeEstrutura={podeEstrutura} aoFechar={aoFechar} aoSalvar={aoSalvar} />
    </Dialogo>
  );
}

function FormCategoria({
  categoria,
  todas,
  campos,
  slugEvento,
  podeEstrutura,
  aoFechar,
  aoSalvar,
}: {
  categoria: Categoria | null;
  todas: readonly Categoria[];
  campos: readonly CampoCandidato[];
  slugEvento: string;
  podeEstrutura: boolean;
  aoFechar: () => void;
  aoSalvar: (lista: CategoriaEditada[], nova: boolean) => Promise<{ ok: boolean; erro?: { campos?: Record<string, string>; mensagem: string } }>;
}) {
  const { marcarSujo, confirmarSaida } = useFormularioSujo();
  const [d, setD] = useState<{ nome: string; premio: string; descricao: string; canal: CanalCategoria }>({
    nome: categoria?.nome ?? "",
    premio: categoria?.premio ?? "",
    descricao: categoria?.descricao ?? "",
    canal: categoria?.canal ?? "ONLINE",
  });
  const [tentou, setTentou] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erroServidor, setErroServidor] = useState<{ campos?: Record<string, string>; mensagem: string } | null>(null);
  // D1 (25/11/2026): a categoria nova pode nascer com os campos extras de outra.
  const comCampos = todas.filter((c) => camposDaCategoria(campos, c.id).length > 0);
  const [copiarDe, setCopiarDe] = useState("");

  const lista: CategoriaEditada[] = todas.map((c) =>
    c.id === categoria?.id ? { id: c.id, ...d } : { id: c.id, nome: c.nome, premio: c.premio ?? "", descricao: c.descricao ?? "", canal: c.canal },
  );
  // Trocar o canal é estrutura (trava com a votação aberta), como criar e excluir.
  const travaCanal = categoria !== null && !podeEstrutura;
  if (!categoria) lista.push({ id: null, ...d, copiarCamposDe: copiarDe || null });
  const indice = categoria ? todas.findIndex((c) => c.id === categoria.id) : lista.length - 1;
  const erros = validarCategorias(lista);
  const meus = (campo: string) => erros[`${campo}-${indice}`] ?? erroServidor?.campos?.[`${campo}-${indice}`] ?? null;
  const temErro = ["nome", "premio", "descricao"].some((c) => erros[`${c}-${indice}`]) || Boolean(erros.categorias);
  const mostrar = (campo: string) => (tentou || erroServidor ? meus(campo) : null);
  // Prévia do endereço, com a mesma regra do servidor: gerado do nome; com a votação aberta, as que existem mantêm o atual.
  const travaEndereco = categoria !== null && !podeEstrutura;
  const manter = new Map<number, string>();
  if (!podeEstrutura) todas.forEach((c, i) => manter.set(i, c.slug));
  const endereco = d.nome.trim() ? enderecosDasCategorias(lista.map((c) => c.nome), manter)[indice] : null;
  const mudaEndereco = categoria !== null && endereco !== null && endereco !== categoria.slug;

  function mudar(mudanca: Partial<typeof d>) {
    setD((atual) => ({ ...atual, ...mudanca }));
    marcarSujo(true);
  }

  async function salvar() {
    setTentou(true);
    if (temErro) return;
    setCarregando(true);
    const r = await aoSalvar(lista, categoria === null);
    setCarregando(false);
    if (r.ok) {
      marcarSujo(false);
      aoFechar();
    } else setErroServidor(r.erro ?? null);
  }

  return (
    <form
      noValidate
      aria-busy={carregando || undefined}
      onSubmit={(e) => {
        e.preventDefault();
        void salvar();
      }}
      className="flex flex-col gap-4"
    >
      {erroServidor && <Alerta variante="erro">{erroServidor.mensagem}</Alerta>}
      {tentou && erros.categorias && <Alerta variante="erro">{erros.categorias}</Alerta>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="categoria-nome" rotulo="Nome" obrigatorio erro={mostrar("nome")}>
          <Input value={d.nome} autoFocus maxLength={LIMITES_CATEGORIA.nome[1]} placeholder="Ex.: Mostra Infantil" onChange={(e) => mudar({ nome: e.target.value })} />
        </Campo>
        <Campo id="categoria-premio" rotulo="Prêmio" erro={mostrar("premio")} dica="Opcional. Aparece abaixo do nome.">
          <Input value={d.premio} maxLength={LIMITES_CATEGORIA.premio} placeholder="Ex.: Melhor filme Júri Popular" onChange={(e) => mudar({ premio: e.target.value })} />
        </Campo>
      </div>
      <Campo
        id="categoria-descricao"
        rotulo="Descrição"
        erro={mostrar("descricao")}
        dica={`Opcional, até ${LIMITES_CATEGORIA.descricao} caracteres. Aparece no topo da página da categoria.`}
      >
        <Textarea
          value={d.descricao}
          rows={3}
          maxLength={LIMITES_CATEGORIA.descricao}
          placeholder="Ex.: Filmes feitos por crianças de 8 a 12 anos nas oficinas do festival."
          onChange={(e) => mudar({ descricao: e.target.value })}
        />
      </Campo>
      {/* 25/11/2026: cada categoria é votada num lugar só. */}
      <fieldset className="flex flex-col gap-2" disabled={travaCanal}>
        <legend className="mb-1 font-semibold">Onde é votada</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["ONLINE", "TOTEM"] as const).map((canal) => (
            <label
              key={canal}
              className={cx(
                "flex cursor-pointer gap-3 rounded-xl border-2 p-3 has-focus-visible:outline-3 has-focus-visible:outline-tema-foco",
                d.canal === canal ? "border-tema-primaria bg-tema-superficie" : "border-tema-borda",
                travaCanal && "cursor-not-allowed opacity-60",
              )}
            >
              <input type="radio" name="categoria-canal" value={canal} checked={d.canal === canal} onChange={() => mudar({ canal })} className="mt-1 size-4 accent-tema-primaria" />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold">{ROTULOS_CANAL[canal]}</span>
                <span className="text-sm text-tema-texto-suave">
                  {canal === "ONLINE"
                    ? "Votada no celular do público, na página da categoria (com QR Code)."
                    : "Votada só nos totens que exibem esta categoria. A página dela segue no ar, para conhecer os itens, sem voto online."}
                </span>
              </span>
            </label>
          ))}
        </div>
        {travaCanal && <span className="text-sm text-tema-texto-suave">Com a votação aberta, o lugar da votação não muda.</span>}
      </fieldset>
      {!categoria && comCampos.length > 0 && (
        <Campo
          id="categoria-copiar-campos"
          rotulo="Campos extras"
          dica={
            copiarDe
              ? `Nasce com: ${camposDaCategoria(campos, copiarDe).map((c) => c.rotulo).join(", ")}. Dá para mudar depois, em "Campos".`
              : 'Sem campos extras. Dá para criar ou copiar depois, em "Campos".'
          }
        >
          <Select value={copiarDe} onChange={(e) => setCopiarDe(e.target.value)}>
            <option value="">Começar sem campos</option>
            {comCampos.map((c) => (
              <option key={c.id} value={c.id}>
                Copiar de {c.nome}
              </option>
            ))}
          </Select>
        </Campo>
      )}
      {/* 24/11/2026: o endereço não é digitado; é o do evento seguido do nome da categoria. */}
      <div className="flex flex-col gap-1 rounded-xl border border-tema-borda bg-tema-superficie px-4 py-3 text-sm">
        <span className="font-semibold">Endereço da página</span>
        <code className="break-all text-tema-texto-suave">{rotaCategoria(slugEvento, endereco ?? "…")}</code>
        <span className="text-tema-texto-suave">
          {travaEndereco
            ? "Gerado do nome. Com a votação aberta, o endereço não muda, mesmo renomeando (o QR Code aponta para ele)."
            : mudaEndereco
              ? "Gerado do nome. Renomear muda o endereço: QR Codes já impressos desta categoria deixam de abrir a página."
              : "Gerado automaticamente a partir do nome."}
        </span>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-tema-borda pt-4 sm:flex-row sm:justify-end">
        <Botao variante="contorno" onClick={() => confirmarSaida(aoFechar)}>
          Cancelar
        </Botao>
        <Botao type="submit" carregando={carregando}>
          {categoria ? "Salvar categoria" : "Criar categoria"}
        </Botao>
      </div>
    </form>
  );
}

/**
 * Os itens de uma categoria (24/11/2026): todos os itens do evento em grade, para marcar os desta categoria. Marcar um item de
 * outra categoria o muda de categoria; desmarcar deixa o item sem categoria (o que o servidor recusa para item na votação, e por
 * isso ele aparece travado aqui). O rascunho recomeça do salvo a cada abertura.
 */
function ModalItens({
  aberto,
  categoria,
  categorias,
  candidatos,
  campos,
  eventoId,
  rotulo,
  pode,
  motivoTrava,
  aoFechar,
}: {
  aberto: boolean;
  categoria: Categoria | null;
  categorias: readonly Categoria[];
  candidatos: readonly Candidato[];
  campos: readonly CampoCandidato[];
  eventoId: string;
  rotulo: string;
  pode: boolean;
  motivoTrava: string | null;
  aoFechar: () => void;
}) {
  const salvos = () => new Set(candidatos.filter((c) => categoria && c.categoriaId === categoria.id).map((c) => c.id));
  const [marcados, setMarcados] = useState<Set<string>>(salvos);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "sem" | "nesta">("todos");
  const [confirmarPerda, setConfirmarPerda] = useState(false);
  const { marcarSujo, confirmarSaida } = useFormularioSujo();
  const servico = useServico();

  // Ajuste no próprio render: a cada abertura (ou troca de categoria), o rascunho volta ao salvo.
  const chave = aberto ? (categoria?.id ?? "") : null;
  const [chaveAntes, setChaveAntes] = useState(chave);
  if (chave !== chaveAntes) {
    setChaveAntes(chave);
    if (chave !== null) {
      setMarcados(salvos());
      setBusca("");
      setFiltro("todos");
      setConfirmarPerda(false);
      servico.limparErro();
    }
  }

  const rotuloMin = rotulo.toLocaleLowerCase("pt-BR");
  const singular = (useEventoAtivo()?.tema.rotuloCandidato ?? "item").toLocaleLowerCase("pt-BR");
  const nomeDe = new Map(categorias.map((c) => [c.id, c.nome]));
  const original = salvos();
  const alterado = marcados.size !== original.size || [...marcados].some((id) => !original.has(id));
  const vindoDeOutras = candidatos.filter((c) => marcados.has(c.id) && c.categoriaId && c.categoriaId !== categoria?.id).length;
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const visiveis = candidatos.filter((c) => {
    if (termo && !c.titulo.toLocaleLowerCase("pt-BR").includes(termo)) return false;
    if (filtro === "sem") return !c.categoriaId;
    if (filtro === "nesta") return marcados.has(c.id);
    return true;
  });

  function alternar(id: string) {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
    marcarSujo(true);
  }

  function fechar() {
    if (alterado) confirmarSaida(aoFechar);
    else {
      marcarSujo(false);
      aoFechar();
    }
  }

  // D1 (25/11/2026): quem entra vindo de outra categoria (ou sem categoria) perde os valores dos campos que esta não tem.
  const entram = candidatos.filter((c) => marcados.has(c.id) && !original.has(c.id));
  const perdas = categoria ? entram.map((c) => ({ item: c, campos: camposPerdidosNaMudanca(c, campos, categoria.id) })).filter((p) => p.campos.length > 0) : [];
  const rotulosPerdidos = [...new Set(perdas.flatMap((p) => p.campos.map((c) => c.rotulo)))];

  async function gravar() {
    if (!categoria) return;
    const r = await servico.executar(() => vincularCandidatosCategoria(eventoId, categoria.id, [...marcados]), "Categoria salva");
    setConfirmarPerda(false);
    if (r.ok) {
      marcarSujo(false);
      aoFechar();
    }
  }

  async function salvar() {
    if (perdas.length) setConfirmarPerda(true);
    else await gravar();
  }

  const FILTROS = [
    ["todos", `Todos (${candidatos.length})`],
    ["sem", `Sem categoria (${candidatos.filter((c) => !c.categoriaId).length})`],
    ["nesta", `Nesta categoria (${marcados.size})`],
  ] as const;

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={fechar}
      fecharNoFundo={false}
      titulo={`${rotulo} de ${categoria?.nome ?? ""}`}
      descricao={`Marque os ${rotuloMin} desta categoria. Um ${singular} fica em uma categoria só: marcar um que está em outra muda ele de categoria.`}
      className="sm:w-[calc(100%-2rem)] sm:max-w-5xl!"
      rodape={
        pode ? (
          <>
            <span className="text-sm text-tema-texto-suave sm:mr-auto sm:self-center">
              {marcados.size} {marcados.size === 1 ? singular : rotuloMin} selecionado(s)
            </span>
            <Botao variante="contorno" onClick={fechar}>
              Cancelar
            </Botao>
            <Botao onClick={() => void salvar()} disabled={!alterado} carregando={servico.carregando}>
              Salvar
            </Botao>
            <DialogoConfirmacao
              aberto={confirmarPerda}
              aoFechar={() => setConfirmarPerda(false)}
              aoConfirmar={() => gravar()}
              carregando={servico.carregando}
              perigo
              titulo={`Mudar para ${categoria?.nome ?? ""}`}
              consequencia={`${avisoCamposPerdidos(rotulosPerdidos)} Afeta: ${perdas.map((p) => p.item.titulo).join(", ")}.`}
              rotuloConfirmar="Mudar e apagar os dados"
            />
          </>
        ) : (
          <Botao variante="contorno" onClick={fechar}>
            Fechar
          </Botao>
        )
      }
    >
      <div aria-busy={servico.carregando || undefined} className="flex flex-col gap-4">
        <DicaTrava motivo={pode ? null : motivoTrava} />
        {/* O toast fica atrás do modal (fora da camada do <dialog>): o erro do servidor aparece aqui também. */}
        {servico.erro && <Alerta variante="erro">{servico.erro.mensagem}</Alerta>}
        {pode && vindoDeOutras > 0 && (
          <Alerta variante="informacao">
            {vindoDeOutras} {vindoDeOutras === 1 ? `${singular} vai sair` : `${rotuloMin} vão sair`} de outra categoria ao salvar.
          </Alerta>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Buscar {rotuloMin}</span>
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tema-texto-suave" />
            <Input type="search" value={busca} placeholder={`Buscar ${rotuloMin}`} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
          </label>
          <div role="group" aria-label="Filtrar" className="flex flex-wrap gap-1.5">
            {FILTROS.map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={filtro === valor}
                onClick={() => setFiltro(valor)}
                className={cx(
                  "min-h-11 rounded-full border px-3 text-sm font-semibold",
                  filtro === valor ? "border-tema-primaria bg-tema-primaria text-tema-sobre-primaria" : "border-tema-borda hover:bg-tema-superficie",
                )}
              >
                {texto}
              </button>
            ))}
          </div>
        </div>

        {visiveis.length === 0 ? (
          <p className="rounded-xl border border-dashed border-tema-borda p-6 text-center text-tema-texto-suave">Nenhum {singular} neste filtro.</p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3">
            {visiveis.map((c) => {
              const marcado = marcados.has(c.id);
              const estavaAqui = original.has(c.id);
              // Item na votação que já é desta categoria não sai para "sem categoria" (o servidor recusaria).
              const preso = estavaAqui && c.publicado && marcado;
              const outra = c.categoriaId && c.categoriaId !== categoria?.id ? nomeDe.get(c.categoriaId) : null;
              return (
                <li key={c.id}>
                  <label
                    className={cx(
                      "group/item relative flex h-full flex-col gap-2 rounded-xl border-2 p-2 transition-colors",
                      marcado ? "border-tema-primaria bg-tema-superficie" : "border-tema-borda hover:border-tema-texto-suave",
                      pode && !preso ? "cursor-pointer" : "cursor-default",
                      "has-focus-visible:outline-3 has-focus-visible:outline-tema-foco",
                    )}
                  >
                    <input type="checkbox" className="sr-only" checked={marcado} disabled={!pode || preso} onChange={() => alternar(c.id)} />
                    <span className="relative overflow-hidden rounded-lg">
                      <ImagemCandidato titulo={c.titulo} imagemUrl={c.imagemUrl} proporcao="5/7" sizes="10rem" />
                      <span
                        aria-hidden
                        className={cx(
                          "absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full border-2 shadow",
                          marcado ? "border-tema-primaria bg-tema-primaria text-tema-sobre-primaria" : "border-white bg-black/40 text-transparent",
                        )}
                      >
                        {preso ? <Lock className="size-3.5" /> : <Check className="size-4" />}
                      </span>
                    </span>
                    <span className="line-clamp-2 text-sm font-semibold leading-tight">{c.titulo}</span>
                    <span className="mt-auto text-xs text-tema-texto-suave">
                      {preso
                        ? "Na votação: tire da votação para remover"
                        : outra
                          ? marcado
                            ? `Sai de ${outra}`
                            : `Em ${outra}`
                          : !c.categoriaId && !marcado
                            ? "Sem categoria"
                            : c.publicado
                              ? "Na votação"
                              : "Fora da votação"}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Dialogo>
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
    // Celular: o QR em cima e os botões com a largura toda embaixo (ao lado do QR, o texto ficava com ~100 px).
    <div className="flex flex-col gap-4 rounded-2xl border border-tema-borda bg-tema-superficie p-4 min-[30rem]:flex-row">
      <div className="shrink-0 self-start rounded-xl bg-white p-2">
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
        "inline-flex size-11 items-center justify-center rounded-full hover:bg-tema-fundo disabled:cursor-not-allowed disabled:opacity-40",
        perigo && "text-tema-erro",
      )}
    >
      {children}
    </button>
  );
}
