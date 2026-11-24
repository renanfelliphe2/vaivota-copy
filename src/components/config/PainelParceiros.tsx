"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Handshake, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { LIMITES_GRUPO, parceirosPorGrupo, validarGrupos } from "@/dominio/gruposParceiros";
import type { GrupoParceiro, Parceiro } from "@/dominio/tipos";
import type { Travas } from "@/dominio/travas";
import { LIMITES, validarArquivoImagem, validarParceiros } from "@/dominio/validacoesConfig";
import { LogoParceiro } from "@/components/evento/LogoParceiro";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { DialogoConfirmacao } from "@/components/ui/DialogoConfirmacao";
import { cx } from "@/lib/classes";
import { enviarImagemCandidato } from "@/servicos/candidatosAdmin";
import { salvarParceiros, type ParceiroEditado } from "@/servicos/parceiros";
import { useEventoAtivo } from "@/store/seletores/evento";
import { BannerTrava } from "./BannerTrava";
import { DicaTrava } from "./DicaTrava";
import { useFormularioSujo } from "./FormularioSujoProvider";
import { useServico } from "./useServico";

/**
 * Parceiros do evento (demanda C1, 25/11/2026; de 24 a 25/11/2026 chamados "Patrocinadores"): nome, logo e, se tiver, o link do
 * site de cada um, na ordem da faixa do telão e da página do evento, e os GRUPOS (Patrocínio, Realização…) em que cada um
 * aparece. Em Geral, abaixo do formulário, fica um resumo por grupo e o botão que abre o modal. Os dados ficam nas tabelas
 * `parceiro`, `grupo_parceiro` e `parceiro_grupo`.
 */
export function PainelParceiros({ travas }: { travas: Travas }) {
  const ativo = useEventoAtivo();
  const [aberto, setAberto] = useState(false);
  if (!ativo) return null;
  const lista = ativo.parceiros;
  const grupos = ativo.gruposParceiros;
  const pode = travas.permite("TEMA");
  const blocos = parceirosPorGrupo(grupos, lista);
  return (
    <section aria-labelledby="titulo-parceiros" className="flex flex-col gap-4 rounded-2xl border border-tema-borda bg-tema-superficie p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="titulo-parceiros" className="flex items-center gap-2 text-lg font-bold">
            <Handshake aria-hidden className="size-5" />
            Parceiros
            {lista.length > 0 && <span className="text-sm font-normal text-tema-texto-suave">({lista.length})</span>}
          </h3>
          <p className="text-sm text-tema-texto-suave">Por grupo na página do evento; todos juntos no rodapé do telão antes da revelação.</p>
        </div>
        <Botao variante="contorno" tamanho="pequeno" onClick={() => setAberto(true)}>
          {pode ? "Gerenciar parceiros" : "Ver parceiros"}
        </Botao>
      </div>
      {lista.length === 0 ? (
        <p className="text-sm text-tema-texto-suave">
          Nenhum parceiro. Sem eles, a faixa do telão e da página não aparece.
          {grupos.length > 0 && ` Grupos: ${grupos.map((g) => g.nome).join(", ")}.`}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {blocos.map((b) => (
            <div key={b.grupo?.id ?? "sem-grupo"} className="flex flex-col gap-1.5">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-tema-texto-suave">{b.grupo?.nome ?? "Sem grupo"}</p>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {b.parceiros.map((p) => (
                  <li key={p.id} title={p.nome} className="flex h-16 min-w-0 items-center justify-center overflow-hidden rounded-lg border border-tema-borda bg-tema-fundo px-1.5">
                    <LogoParceiro parceiro={p} className="max-h-11 max-w-full" classeNome="line-clamp-2 whitespace-normal! text-center text-xs font-semibold leading-tight" />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <ModalParceiros aberto={aberto} aoFechar={() => setAberto(false)} eventoId={ativo.evento.id} salvos={lista} gruposSalvos={grupos} travas={travas} />
    </section>
  );
}

/** Chave local estável de cada cartão (o id do parceiro ainda não existe nos novos). `grupos`: chaves dos grupos. */
type Linha = { id: string | null; nome: string; logoUrl: string | null; linkUrl: string; chave: string; grupos: string[] };
/** Grupo no rascunho: `chave` é o id, se já existe; senão uma chave local. */
type LinhaGrupo = { id: string | null; chave: string; nome: string };

const doSalvo = (salvos: readonly Parceiro[], grupos: readonly GrupoParceiro[]): Linha[] =>
  salvos.map((p) => ({
    id: p.id,
    nome: p.nome,
    logoUrl: p.logoUrl,
    linkUrl: p.linkUrl ?? "",
    chave: p.id,
    grupos: grupos.filter((g) => g.parceiroIds.includes(p.id)).map((g) => g.id),
  }));
const gruposDoSalvo = (grupos: readonly GrupoParceiro[]): LinhaGrupo[] => grupos.map((g) => ({ id: g.id, chave: g.id, nome: g.nome }));

/**
 * O modal fica sempre montado (o <dialog> devolve o foco a quem abriu ao fechar); o rascunho recomeça do salvo a cada abertura.
 * Botões no rodapé do Dialogo, fora da área que rola. Fechar com alteração pendente pergunta antes (FormularioSujoProvider).
 */
function ModalParceiros({
  aberto,
  aoFechar,
  eventoId,
  salvos,
  gruposSalvos,
  travas,
}: {
  aberto: boolean;
  aoFechar: () => void;
  eventoId: string;
  salvos: readonly Parceiro[];
  gruposSalvos: readonly GrupoParceiro[];
  travas: Travas;
}) {
  const [linhas, setLinhas] = useState<Linha[]>(() => doSalvo(salvos, gruposSalvos));
  const [grupos, setGrupos] = useState<LinhaGrupo[]>(() => gruposDoSalvo(gruposSalvos));
  const [proximaChave, setProximaChave] = useState(1);
  const [focarChave, setFocarChave] = useState<string | null>(null);
  const [tentou, setTentou] = useState(false);
  const [errosLogo, setErrosLogo] = useState<Record<string, string>>({});
  /** O grupo que o admin pediu para remover (o modal de confirmação fica aberto enquanto não é null). */
  const [removendo, setRemovendo] = useState<LinhaGrupo | null>(null);
  /** Cartões com um logo subindo (o envio é assíncrono). */
  const [enviando, setEnviando] = useState<Record<string, boolean>>({});
  const { marcarSujo, confirmarSaida } = useFormularioSujo();
  const servico = useServico();

  // Ajuste no próprio render: a cada abertura, o rascunho volta ao que está salvo.
  const [abertoAntes, setAbertoAntes] = useState(aberto);
  if (aberto !== abertoAntes) {
    setAbertoAntes(aberto);
    if (aberto) {
      setLinhas(doSalvo(salvos, gruposSalvos));
      setGrupos(gruposDoSalvo(gruposSalvos));
      setTentou(false);
      setErrosLogo({});
      setFocarChave(null);
      setRemovendo(null);
      servico.limparErro();
    }
  }

  const pode = travas.permite("TEMA");
  const erros = { ...validarParceiros(linhas.map((l) => l.nome), linhas.map((l) => l.linkUrl)), ...validarGrupos(grupos.map((g) => g.nome)) };
  const temErro = Object.keys(erros).length > 0;
  const subindo = Object.values(enviando).some(Boolean);
  const alterado =
    JSON.stringify([linhas.map((l) => [l.id, l.nome.trim(), l.logoUrl, l.linkUrl.trim(), [...l.grupos].sort()]), grupos.map((g) => [g.id, g.nome.trim()])]) !==
    JSON.stringify([
      salvos.map((p) => [p.id, p.nome, p.logoUrl, p.linkUrl ?? "", gruposSalvos.filter((g) => g.parceiroIds.includes(p.id)).map((g) => g.id).sort()]),
      gruposSalvos.map((g) => [g.id, g.nome]),
    ]);

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
    mudarLinhas([...linhas, { id: null, nome: "", logoUrl: null, linkUrl: "", chave, grupos: [] }]);
    setProximaChave((n) => n + 1);
    setFocarChave(chave);
  }

  function mudarGrupos(novos: LinhaGrupo[]) {
    setGrupos(novos);
    marcarSujo(true);
  }

  function moverGrupo(i: number, delta: -1 | 1) {
    const novos = [...grupos];
    [novos[i], novos[i + delta]] = [novos[i + delta], novos[i]];
    mudarGrupos(novos);
  }

  function adicionarGrupo() {
    const chave = `grupo-novo-${proximaChave}`;
    mudarGrupos([...grupos, { id: null, chave, nome: "" }]);
    setProximaChave((n) => n + 1);
    setFocarChave(chave);
  }

  /** Confirmado: o grupo sai do rascunho e os parceiros dele só deixam de estar nele (continuam na lista). */
  function removerGrupo(g: LinhaGrupo) {
    mudarGrupos(grupos.filter((x) => x.chave !== g.chave));
    setLinhas((atuais) => atuais.map((l) => ({ ...l, grupos: l.grupos.filter((c) => c !== g.chave) })));
    setRemovendo(null);
  }

  function alternarGrupo(chaveParceiro: string, chaveGrupo: string) {
    setLinhas((atuais) =>
      atuais.map((l) =>
        l.chave !== chaveParceiro ? l : { ...l, grupos: l.grupos.includes(chaveGrupo) ? l.grupos.filter((c) => c !== chaveGrupo) : [...l.grupos, chaveGrupo] },
      ),
    );
    marcarSujo(true);
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
      salvarParceiros(eventoId, {
        grupos: grupos.map(({ id, chave, nome }) => ({ id, chave, nome })),
        parceiros: linhas.map(({ id, nome, logoUrl, linkUrl, grupos: g }): ParceiroEditado => ({ id, nome, logoUrl, linkUrl: linkUrl.trim() || null, grupos: g })),
      }),
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
        Salvar parceiros
      </Botao>
    </>
  ) : (
    <Botao variante="contorno" onClick={fechar}>
      Fechar
    </Botao>
  );

  const quantosNoGrupo = (chave: string) => linhas.filter((l) => l.grupos.includes(chave)).length;
  const nomeDoGrupo = (g: LinhaGrupo, i: number) => g.nome.trim() || `grupo ${i + 1}`;

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={fechar}
      fecharNoFundo={false}
      titulo="Parceiros"
      descricao="Na página do evento, os parceiros aparecem por grupo, na ordem dos grupos; a logo leva ao site, se houver. No rodapé do telão (antes da revelação), todos juntos, na ordem da lista."
      rodape={rodape}
      className="sm:w-[calc(100%-2rem)] sm:max-w-5xl!"
    >
      <div aria-busy={servico.carregando || undefined} className="flex flex-col gap-6">
        <BannerTrava travas={travas} acoes={["TEMA"]} />
        <DicaTrava motivo={pode ? null : travas.motivo("TEMA")} />
        {/* O toast fica atrás do modal (fora da camada do <dialog>): o erro do servidor aparece aqui também. */}
        {servico.erro && <Alerta variante="erro">{servico.erro.mensagem}</Alerta>}
        {tentou && erros.parceiros && <Alerta variante="erro">{erros.parceiros}</Alerta>}
        {tentou && erros.grupos && <Alerta variante="erro">{erros.grupos}</Alerta>}

        <fieldset disabled={!pode} className="flex min-w-0 flex-col gap-3">
          <legend className="mb-1 text-base font-bold">Grupos</legend>
          <p className="text-sm text-tema-texto-suave">
            O título de cada bloco de parceiros na página do evento, nesta ordem (ex.: Patrocínio, Realização, Apoio Cultural). Um parceiro
            pode estar em mais de um grupo.
          </p>
          <ol className="flex flex-col gap-2">
            {grupos.map((g, i) => {
              const rotulo = nomeDoGrupo(g, i);
              const erro = (tentou || g.nome ? (erros[`grupo-${i}`] ?? null) : null) ?? servico.erro?.campos?.[`grupo-${i}`] ?? null;
              return (
                <li key={g.chave} className="flex flex-col gap-1 rounded-xl border border-tema-borda bg-tema-superficie p-2 sm:flex-row sm:items-start sm:gap-2">
                  <Campo id={`grupo-${g.chave}`} rotulo={<span className="sr-only">Nome do grupo {i + 1}</span>} erro={erro} className="min-w-0 flex-1">
                    <Input
                      value={g.nome}
                      maxLength={LIMITES_GRUPO.nome[1]}
                      placeholder="Nome do grupo"
                      autoFocus={focarChave === g.chave}
                      onChange={(e) => mudarGrupos(grupos.map((x) => (x.chave === g.chave ? { ...x, nome: e.target.value } : x)))}
                    />
                  </Campo>
                  <div className="flex items-center justify-end gap-1">
                    <span className="mr-2 text-sm text-tema-texto-suave">
                      {quantosNoGrupo(g.chave)} {quantosNoGrupo(g.chave) === 1 ? "parceiro" : "parceiros"}
                    </span>
                    <BotaoIcone rotulo={`Mover ${rotulo} para cima`} disabled={i === 0} onClick={() => moverGrupo(i, -1)}>
                      <ArrowUp aria-hidden className="size-4" />
                    </BotaoIcone>
                    <BotaoIcone rotulo={`Mover ${rotulo} para baixo`} disabled={i === grupos.length - 1} onClick={() => moverGrupo(i, 1)}>
                      <ArrowDown aria-hidden className="size-4" />
                    </BotaoIcone>
                    <BotaoIcone rotulo={`Remover o grupo ${rotulo}`} perigo onClick={() => setRemovendo(g)}>
                      <Trash2 aria-hidden className="size-4" />
                    </BotaoIcone>
                  </div>
                </li>
              );
            })}
          </ol>
          {grupos.length === 0 && <p className="text-sm text-tema-texto-suave">Nenhum grupo: na página, os parceiros aparecem juntos, sem título de grupo.</p>}
          {pode && grupos.length < LIMITES_GRUPO.maximo && (
            <Botao variante="contorno" tamanho="pequeno" className="self-start" onClick={adicionarGrupo} icone={<Plus aria-hidden className="size-4" />}>
              Adicionar grupo
            </Botao>
          )}
        </fieldset>

        <fieldset disabled={!pode} className="min-w-0">
          <legend className="mb-3 text-base font-bold">Parceiros</legend>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {linhas.map((l, i) => {
              const rotulo = l.nome.trim() || `parceiro ${i + 1}`;
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
                      placeholder="Nome do parceiro"
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
                  {grupos.length > 0 && (
                    <fieldset className="flex flex-col gap-1">
                      <legend className="text-sm font-semibold">Grupos</legend>
                      <div className="flex flex-wrap gap-1.5">
                        {grupos.map((g, gi) => {
                          const marcado = l.grupos.includes(g.chave);
                          return (
                            <label
                              key={g.chave}
                              className={cx(
                                "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-semibold ring-1 transition has-focus-visible:outline-3 has-focus-visible:outline-tema-foco",
                                marcado ? "bg-tema-primaria text-tema-sobre-primaria ring-tema-primaria" : "bg-tema-fundo text-tema-texto ring-tema-borda hover:ring-tema-primaria",
                              )}
                            >
                              <input type="checkbox" className="sr-only" checked={marcado} onChange={() => alternarGrupo(l.chave, g.chave)} />
                              {nomeDoGrupo(g, gi)}
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  )}
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
                  Adicionar parceiro
                </button>
              </li>
            )}
          </ol>
          {linhas.length === 0 && !pode && <p className="text-tema-texto-suave">Nenhum parceiro cadastrado.</p>}
        </fieldset>

        <p className="text-sm text-tema-texto-suave">
          Logo em PNG, JPG ou WebP, até 2 MB; prefira fundo transparente. Até {LIMITES.maxParceiros} parceiros. Parceiro sem grupo aparece
          na página num bloco sem título, depois dos grupos.
        </p>
      </div>

      <DialogoConfirmacao
        aberto={removendo !== null}
        aoFechar={() => setRemovendo(null)}
        aoConfirmar={() => {
          if (removendo) removerGrupo(removendo);
        }}
        titulo={`Remover o grupo ${removendo ? nomeDoGrupo(removendo, grupos.indexOf(removendo)) : ""}?`}
        consequencia={
          !removendo || quantosNoGrupo(removendo.chave) === 0
            ? "O grupo não tem parceiros. A mudança vale ao salvar."
            : quantosNoGrupo(removendo.chave) === 1
              ? "O parceiro dele continua cadastrado: só sai deste grupo. A mudança vale ao salvar."
              : `Os ${quantosNoGrupo(removendo.chave)} parceiros dele continuam cadastrados: só saem deste grupo. A mudança vale ao salvar.`
        }
        rotuloConfirmar="Remover grupo"
      />
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
