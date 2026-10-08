"use client";

import { ArrowDown, ArrowUp, ImageOff, Plus, Save, Trash2, Undo2, Upload } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Parceiro } from "@/dominio/tipos";
import type { Travas } from "@/dominio/travas";
import { LIMITES, validarArquivoImagem, validarParceiros } from "@/dominio/validacoesConfig";
import { LogoParceiro } from "@/components/evento/LogoParceiro";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input } from "@/components/ui/Campo";
import { salvarParceiros, type ParceiroEditado } from "@/servicos/parceiros";
import { useEventoAtivo } from "@/store/seletores/evento";
import { BannerTrava } from "../BannerTrava";
import { DicaTrava } from "../DicaTrava";
import { useFormularioSujo } from "../FormularioSujoProvider";
import { useServico } from "../useServico";

/** Seção Parceiros (08/10/2026): nome e logo de cada parceiro, na ordem da faixa do telão e da página do evento. */
export function SecaoParceiros({ travas }: { travas: Travas }) {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  return (
    <section aria-labelledby="titulo-secao" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 id="titulo-secao" tabIndex={-1} className="text-2xl font-bold">
          Parceiros
        </h2>
        <p className="text-sm text-tema-texto-suave">
          Aparecem numa faixa no rodapé do telão enquanto a revelação do resultado não começa, e na página do evento.
        </p>
      </div>
      <BannerTrava travas={travas} acoes={["TEMA"]} />
      <FormParceiros
        // Remonta quando o salvo muda.
        key={ativo.parceiros.map((p) => `${p.id}=${p.nome}:${p.logoUrl?.length ?? 0}`).join("|")}
        eventoId={ativo.evento.id}
        salvos={ativo.parceiros}
        travas={travas}
      />
    </section>
  );
}

/** Chave local estável de cada linha (o id do parceiro ainda não existe nos novos). */
type Linha = ParceiroEditado & { chave: string };

function FormParceiros({ eventoId, salvos, travas }: { eventoId: string; salvos: readonly Parceiro[]; travas: Travas }) {
  const inicial = (): Linha[] => salvos.map((p) => ({ id: p.id, nome: p.nome, logoUrl: p.logoUrl, chave: p.id }));
  const [linhas, setLinhas] = useState<Linha[]>(inicial);
  const [proximaChave, setProximaChave] = useState(1);
  const [tentou, setTentou] = useState(false);
  const [errosLogo, setErrosLogo] = useState<Record<string, string>>({});
  const { marcarSujo } = useFormularioSujo();
  const servico = useServico();

  const pode = travas.permite("TEMA");
  const erros = validarParceiros(linhas.map((l) => l.nome));
  const temErro = Object.keys(erros).length > 0;
  const alterado =
    JSON.stringify(linhas.map((l) => [l.id, l.nome.trim(), l.logoUrl])) !== JSON.stringify(salvos.map((p) => [p.id, p.nome, p.logoUrl]));

  function mudarLinhas(novas: Linha[]) {
    setLinhas(novas);
    marcarSujo(true);
  }

  function mudar(chave: string, mudanca: Partial<Linha>) {
    mudarLinhas(linhas.map((x) => (x.chave === chave ? { ...x, ...mudanca } : x)));
  }

  function mover(i: number, delta: -1 | 1) {
    const novas = [...linhas];
    [novas[i], novas[i + delta]] = [novas[i + delta], novas[i]];
    mudarLinhas(novas);
  }

  function adicionar() {
    mudarLinhas([...linhas, { id: null, nome: "", logoUrl: null, chave: `novo-${proximaChave}` }]);
    setProximaChave((n) => n + 1);
  }

  // data: e não blob:, para o logo sobreviver ao fechar as abas (persistirDemo) e chegar às outras abas.
  function enviarLogo(chave: string, arquivo: File) {
    const problema = validarArquivoImagem(arquivo);
    setErrosLogo((e) => ({ ...e, [chave]: problema ?? "" }));
    if (problema) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      if (typeof leitor.result === "string") mudar(chave, { logoUrl: leitor.result });
    };
    leitor.readAsDataURL(arquivo);
  }

  async function salvar() {
    setTentou(true);
    if (temErro) return;
    const r = await servico.executar(() => salvarParceiros(eventoId, linhas.map(({ id, nome, logoUrl }) => ({ id, nome, logoUrl }))));
    if (r.ok) marcarSujo(false);
  }

  return (
    <div aria-busy={servico.carregando || undefined} className="flex flex-col gap-4">
      <DicaTrava motivo={pode ? null : travas.motivo("TEMA")} />
      {tentou && erros.parceiros && <Alerta variante="erro">{erros.parceiros}</Alerta>}
      {linhas.length === 0 && <p className="text-tema-texto-suave">Nenhum parceiro cadastrado. Sem parceiros, a faixa não aparece.</p>}

      <fieldset disabled={!pode} className="flex flex-col gap-3">
        <legend className="sr-only">Parceiros</legend>
        <ol className="flex flex-col gap-3">
          {linhas.map((l, i) => {
            const rotulo = l.nome || `parceiro ${i + 1}`;
            return (
              <li key={l.chave} className="flex flex-col gap-3 rounded-2xl border border-tema-borda bg-tema-superficie p-4 sm:flex-row sm:items-start">
                <div className="flex h-20 w-full shrink-0 items-center justify-center rounded-xl border border-tema-borda bg-tema-fundo px-3 sm:w-40">
                  <LogoParceiro parceiro={l} className="max-h-14 max-w-full" classeNome="text-sm font-semibold text-center whitespace-normal" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Campo id={`parceiro-${l.chave}`} rotulo={`Parceiro ${i + 1}`} erro={tentou || l.nome ? (erros[`parceiro-${i}`] ?? null) : null}>
                    <Input
                      value={l.nome}
                      maxLength={LIMITES.nomeParceiro[1]}
                      placeholder="Nome do parceiro"
                      onChange={(e) => mudar(l.chave, { nome: e.target.value })}
                    />
                  </Campo>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-tema-texto-suave px-4 text-sm font-semibold hover:bg-tema-fundo has-focus-visible:outline-3 has-focus-visible:outline-tema-foco has-disabled:pointer-events-none has-disabled:opacity-60">
                      <Upload aria-hidden className="size-4" />
                      {l.logoUrl ? "Trocar logo" : "Enviar logo"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="sr-only"
                        aria-label={`Logo de ${rotulo}`}
                        onChange={(e) => {
                          const arquivo = e.target.files?.[0];
                          e.target.value = "";
                          if (arquivo) enviarLogo(l.chave, arquivo);
                        }}
                      />
                    </label>
                    {l.logoUrl && (
                      <Botao variante="fantasma" tamanho="pequeno" onClick={() => mudar(l.chave, { logoUrl: null })} icone={<ImageOff aria-hidden className="size-4" />}>
                        Remover logo
                      </Botao>
                    )}
                  </div>
                  {errosLogo[l.chave] && (
                    <p role="alert" className="text-sm font-medium text-tema-erro">
                      {errosLogo[l.chave]}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 sm:mt-[1.625rem]">
                  <BotaoIcone rotulo={`Subir ${rotulo}`} disabled={i === 0} onClick={() => mover(i, -1)}>
                    <ArrowUp aria-hidden className="size-4" />
                  </BotaoIcone>
                  <BotaoIcone rotulo={`Descer ${rotulo}`} disabled={i === linhas.length - 1} onClick={() => mover(i, 1)}>
                    <ArrowDown aria-hidden className="size-4" />
                  </BotaoIcone>
                  <BotaoIcone rotulo={`Remover ${rotulo}`} onClick={() => mudarLinhas(linhas.filter((x) => x.chave !== l.chave))}>
                    <Trash2 aria-hidden className="size-4" />
                  </BotaoIcone>
                </div>
              </li>
            );
          })}
        </ol>
        {linhas.length < LIMITES.maxParceiros && (
          <Botao variante="contorno" tamanho="pequeno" className="self-start" onClick={adicionar} icone={<Plus aria-hidden className="size-4" />}>
            Adicionar parceiro
          </Botao>
        )}
        <p className="text-sm text-tema-texto-suave">
          Logo em PNG, JPG, WebP ou SVG, até 2 MB; prefira fundo transparente. Sem logo, o nome aparece em texto. Até {LIMITES.maxParceiros} parceiros.
        </p>
      </fieldset>

      {pode && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Botao
            variante="contorno"
            disabled={!alterado}
            onClick={() => {
              setLinhas(inicial());
              setTentou(false);
              setErrosLogo({});
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
