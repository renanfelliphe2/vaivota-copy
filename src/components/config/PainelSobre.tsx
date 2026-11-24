"use client";

import { BookOpen, Save, Undo2 } from "lucide-react";
import { useState } from "react";
import { LIMITES_SOBRE, validarSobre } from "@/dominio/sobreEvento";
import type { Evento } from "@/dominio/tipos";
import type { Travas } from "@/dominio/travas";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input, Textarea } from "@/components/ui/Campo";
import { salvarSobre } from "@/servicos/sobreEvento";
import { useEventoAtivo } from "@/store/seletores/evento";
import { SeletorImagem } from "./candidatos/SeletorImagem";
import { DicaTrava } from "./DicaTrava";
import { useFormularioSujo } from "./FormularioSujoProvider";
import { useServico } from "./useServico";

/**
 * "Sobre o evento" (demanda C2, 25/11/2026), em Configuração > Geral: título, texto (parágrafos, com **negrito**) e imagem da
 * seção no fim da página do evento. Sem título nem texto, a seção não aparece. Remonta por `key` quando o salvo muda.
 */
export function PainelSobre({ travas }: { travas: Travas }) {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  const { evento } = ativo;
  return <FormSobre key={`${evento.sobreTitulo}|${evento.sobreTexto}|${evento.sobreImagemUrl}`} evento={evento} travas={travas} />;
}

function FormSobre({ evento, travas }: { evento: Evento; travas: Travas }) {
  const salvo = { titulo: evento.sobreTitulo ?? "", texto: evento.sobreTexto ?? "", imagemUrl: evento.sobreImagemUrl ?? null };
  const [titulo, setTitulo] = useState(salvo.titulo);
  const [texto, setTexto] = useState(salvo.texto);
  const [imagemUrl, setImagemUrl] = useState<string | null>(salvo.imagemUrl);
  const { marcarSujo } = useFormularioSujo();
  const servico = useServico();
  const pode = travas.permite("GERAL_NOME_DESCRICAO");
  const erros = validarSobre({ titulo, texto });
  const doServidor = servico.erro?.campos ?? {};
  const alterado = titulo.trim() !== salvo.titulo.trim() || texto.trim() !== salvo.texto.trim() || imagemUrl !== salvo.imagemUrl;

  function mudou<T>(definir: (v: T) => void) {
    return (v: T) => {
      definir(v);
      marcarSujo(true);
    };
  }

  async function salvar() {
    const r = await servico.executar(() => salvarSobre(evento.id, { titulo, texto, imagemUrl }));
    if (r.ok) marcarSujo(false);
  }

  return (
    <section aria-labelledby="titulo-sobre" aria-busy={servico.carregando || undefined} className="flex flex-col gap-4 rounded-2xl border border-tema-borda bg-tema-superficie p-5">
      <div className="flex flex-col gap-1">
        <h3 id="titulo-sobre" className="flex items-center gap-2 text-lg font-bold">
          <BookOpen aria-hidden className="size-5" />
          Sobre o evento
        </h3>
        <p className="text-sm text-tema-texto-suave">
          Seção no fim da página do evento: um cartão na cor do tema, com a imagem ao lado do texto (no celular, a imagem vem em cima).
          Sem título nem texto, ela não aparece.
        </p>
      </div>
      <DicaTrava motivo={pode ? null : travas.motivo("GERAL_NOME_DESCRICAO")} />
      <fieldset disabled={!pode} className="flex min-w-0 flex-col gap-4">
        <legend className="sr-only">Sobre o evento</legend>
        <Campo id="sobre-titulo" rotulo="Título" erro={erros.sobreTitulo ?? doServidor.sobreTitulo ?? null}>
          <Input
            value={titulo}
            maxLength={LIMITES_SOBRE.titulo}
            placeholder="Ex.: O lugar para quem quer Ver Filmes e Fazer Filmes"
            onChange={(e) => mudou(setTitulo)(e.target.value)}
          />
        </Campo>
        <Campo
          id="sobre-texto"
          rotulo="Texto"
          dica={
            <>
              Deixe uma linha em branco entre os parágrafos. Para <strong>negrito</strong>, escreva entre dois asteriscos duplos: **assim**.
              {` ${texto.trim().length} de ${LIMITES_SOBRE.texto} caracteres.`}
            </>
          }
          erro={erros.sobreTexto ?? doServidor.sobreTexto ?? null}
        >
          <Textarea value={texto} rows={8} maxLength={LIMITES_SOBRE.texto} onChange={(e) => mudou(setTexto)(e.target.value)} />
        </Campo>
        <SeletorImagem
          titulo={titulo || "Sobre o evento"}
          valor={imagemUrl}
          podeRemover
          disabled={!pode}
          erro={doServidor.sobreImagemUrl ?? null}
          aoMudar={mudou(setImagemUrl)}
          avisoSemImagem={null}
          dica="Opcional. PNG, JPG ou WebP, até 2 MB. Uma foto horizontal fica melhor (ex.: a equipe)."
        />
      </fieldset>
      {pode && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Botao
            variante="contorno"
            disabled={!alterado}
            onClick={() => {
              setTitulo(salvo.titulo);
              setTexto(salvo.texto);
              setImagemUrl(salvo.imagemUrl);
              marcarSujo(false);
            }}
            icone={<Undo2 aria-hidden className="size-4" />}
          >
            Descartar
          </Botao>
          <Botao
            onClick={() => void salvar()}
            disabled={!alterado || Object.keys(erros).length > 0}
            carregando={servico.carregando}
            icone={<Save aria-hidden className="size-4" />}
          >
            Salvar
          </Botao>
        </div>
      )}
    </section>
  );
}
