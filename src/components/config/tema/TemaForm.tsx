"use client";

import { Save, Undo2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { avaliarContrasteTema } from "@/dominio/contrasteTema";
import type { Evento, Tema } from "@/dominio/tipos";
import type { Travas } from "@/dominio/travas";
import { validarTema, type DadosTema } from "@/dominio/validacoesConfig";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input, Select } from "@/components/ui/Campo";
import { FONTES_APROVADAS } from "@/lib/fontes";
import { MODULOS_FESTIVAL } from "@/lib/modulos";
import { useConsulta } from "@/lib/useConsulta";
import { listarPresetsTema, salvarTema } from "@/servicos/temaConfig";
import { useFormularioSujo } from "../FormularioSujoProvider";
import { useServico } from "../useServico";
import { ContrasteBadge } from "./ContrasteBadge";
import { PreviaTema } from "./PreviaTema";
import { SeletorLogo } from "./SeletorLogo";

type Rascunho = DadosTema & { logoUrl: string | null };

const CORES = [
  ["corPrimaria", "Cor primária"],
  ["corSecundaria", "Cor secundária"],
  ["corFundo", "Fundo"],
  ["corTexto", "Texto"],
] as const;

/** Etapa 6 (CP7): white-label de ponta a ponta. Prévia isolada; salvar bloqueado com par reprovado. */
export function TemaForm({ evento, tema, travas }: { evento: Evento; tema: Tema; travas: Travas }) {
  const salvo: Rascunho = {
    nomeExibicao: tema.nomeExibicao ?? evento.nome,
    logoUrl: tema.logoUrl,
    corPrimaria: tema.corPrimaria,
    corSecundaria: tema.corSecundaria,
    corFundo: tema.corFundo,
    corTexto: tema.corTexto,
    fonte: tema.fonte,
    rotuloCandidato: tema.rotuloCandidato,
    rotuloCandidatos: tema.rotuloCandidatos,
  };
  const [r, setR] = useState<Rascunho>(salvo);
  const [tentou, setTentou] = useState(false);
  const { marcarSujo } = useFormularioSujo();
  const servico = useServico();
  const presets = useConsulta(() => listarPresetsTema());
  const pode = travas.permite("TEMA");

  const erros = validarTema(r, FONTES_APROVADAS);
  const contraste = avaliarContrasteTema(r);
  const alterado = JSON.stringify(r) !== JSON.stringify(salvo);
  const mostrar = (c: string) => (tentou ? (erros[c] ?? null) : null);

  /** O `blob:` descartado é revogado; o salvo nunca (D12). */
  const revogarSeDescartado = (url: string | null) => {
    if (url?.startsWith("blob:") && url !== salvo.logoUrl) URL.revokeObjectURL(url);
  };

  const mudar = (mudanca: Partial<Rascunho>) => {
    setR((atual) => ({ ...atual, ...mudanca }));
    marcarSujo(true);
  };

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (Object.keys(erros).length || !contraste.aprovado || !alterado) return;
    const res = await servico.executar(() => salvarTema(evento.id, r));
    if (res.ok) marcarSujo(false);
  }

  return (
    <div className="grid gap-6 2xl:grid-cols-2">
      <form onSubmit={enviar} noValidate aria-busy={servico.carregando || undefined} className="flex flex-col gap-5">
        <fieldset disabled={!pode} className="flex flex-col gap-5">
          {presets.dados && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">Aplicar preset:</span>
              {presets.dados.map((p) => (
                <Botao key={p.id} variante="contorno" tamanho="pequeno" onClick={() => mudar({ ...p.paleta, fonte: p.fonte })}>
                  {p.nome}
                </Botao>
              ))}
            </div>
          )}
          <Campo id="tema-nome" rotulo="Nome de exibição" obrigatorio erro={mostrar("nomeExibicao")}>
            <Input value={r.nomeExibicao} onChange={(e) => mudar({ nomeExibicao: e.target.value })} maxLength={60} />
          </Campo>
          {/* Envio de logo é do MVP do Festival (a Maratona Tech Tivit usa o nome em texto). */}
          {MODULOS_FESTIVAL && (
            <SeletorLogo
              nome={r.nomeExibicao}
              valor={r.logoUrl}
              salvo={salvo.logoUrl}
              disabled={!pode}
              aoMudar={(url) => {
                revogarSeDescartado(r.logoUrl);
                mudar({ logoUrl: url });
              }}
            />
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CORES.map(([campo, rotulo]) => (
              <Campo key={campo} id={`tema-${campo}`} rotulo={rotulo} erro={mostrar(campo)}>
                <div className="flex items-center gap-2">
                  <input
                    id={`tema-${campo}`}
                    type="color"
                    value={r[campo].toLowerCase()}
                    onChange={(e) => mudar({ [campo]: e.target.value.toUpperCase() })}
                    className="h-11 w-14 cursor-pointer rounded-lg border border-tema-texto-suave bg-tema-fundo"
                  />
                  <code className="text-sm">{r[campo].toUpperCase()}</code>
                </div>
              </Campo>
            ))}
          </div>
          <Campo id="tema-fonte" rotulo="Fonte" erro={mostrar("fonte")} dica="Lista editável pelo dono do produto.">
            <Select value={r.fonte} onChange={(e) => mudar({ fonte: e.target.value })}>
              {FONTES_APROVADAS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="tema-rotulo" rotulo="Rótulo (singular)" obrigatorio erro={mostrar("rotuloCandidato")} dica='Como no começo de uma frase, ex.: "Curta".'>
              <Input value={r.rotuloCandidato} onChange={(e) => mudar({ rotuloCandidato: e.target.value })} maxLength={30} />
            </Campo>
            <Campo id="tema-rotulos" rotulo="Rótulo (plural)" obrigatorio erro={mostrar("rotuloCandidatos")} dica='Ex.: "Curtas".'>
              <Input value={r.rotuloCandidatos} onChange={(e) => mudar({ rotuloCandidatos: e.target.value })} maxLength={30} />
            </Campo>
          </div>
        </fieldset>

        <section aria-labelledby="titulo-contraste" className="flex flex-col gap-2 rounded-2xl border border-tema-borda p-4">
          <h3 id="titulo-contraste" className="font-bold">
            Contraste
          </h3>
          {!contraste.aprovado && (
            <Alerta variante="erro" titulo="Salvar bloqueado">
              Pares reprovados: {contraste.reprovados.map((p) => p.par).join(", ")}.
            </Alerta>
          )}
          <ul className="divide-y divide-tema-borda">
            {contraste.pares.map((p) => (
              <ContrasteBadge key={p.id} par={p} />
            ))}
          </ul>
        </section>

        {pode && (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Botao
              variante="contorno"
              disabled={!alterado}
              onClick={() => {
                revogarSeDescartado(r.logoUrl);
                setR(salvo);
                setTentou(false);
                marcarSujo(false);
              }}
              icone={<Undo2 aria-hidden className="size-4" />}
            >
              Descartar
            </Botao>
            <Botao type="submit" disabled={!alterado || !contraste.aprovado} carregando={servico.carregando} icone={<Save aria-hidden className="size-4" />}>
              Salvar
            </Botao>
          </div>
        )}
      </form>
      <div className="flex flex-col gap-2">
        <h3 className="font-bold">Pré-visualização</h3>
        <p className="text-sm text-tema-texto-suave">Mostra o rascunho; o evento só muda depois de salvar.</p>
        <PreviaTema
          cores={r}
          nome={r.nomeExibicao}
          logoUrl={r.logoUrl}
          rotuloCandidato={r.rotuloCandidato || "Item"}
          rotuloCandidatos={r.rotuloCandidatos || "Itens"}
        />
      </div>
    </div>
  );
}
