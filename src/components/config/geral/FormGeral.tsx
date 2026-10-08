"use client";

import { Save, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Evento } from "@/dominio/tipos";
import type { Travas } from "@/dominio/travas";
import {
  validarDescricaoEvento,
  validarExtensaoFim,
  validarJanela,
  validarNomeEvento,
  validarSlug,
  type Erros,
} from "@/dominio/validacoesConfig";
import { useAnunciar } from "@/components/a11y/LiveRegion";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Checkbox, Input, Select, Textarea } from "@/components/ui/Campo";
import { descreverDeslocamento, FUSOS_SUPORTADOS, instanteParaLocal, localParaInstante } from "@/lib/fusoHorario";
import { paraMs } from "@/lib/tempo";
import { salvarGeral, type PatchGeral } from "@/servicos/configGeral";
import { useAgora } from "@/store/seletores/relogio";
import { useEventoAtivo, useEventos } from "@/store/seletores/evento";
import { BannerTrava } from "../BannerTrava";
import { DialogoMotivo } from "../DialogoMotivo";
import { DicaTrava } from "../DicaTrava";
import { useFormularioSujo } from "../FormularioSujoProvider";
import { useServico } from "../useServico";

/** Seção Geral (Etapa 6, CP2): define o padrão de formulário (D5). Remonta por `key` quando o salvo muda. */
export function FormGeral({ travas }: { travas: Travas }) {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  return <FormGeralInterno key={ativo.evento.atualizadoEm + ativo.evento.slug} evento={ativo.evento} travas={travas} />;
}

type Rascunho = {
  nome: string;
  slug: string;
  descricao: string;
  inicio: string;
  fim: string;
  fusoHorario: string;
  encerramentoAutomatico: boolean;
};

function doEvento(e: Evento): Rascunho {
  return {
    nome: e.nome,
    slug: e.slug,
    descricao: e.descricao ?? "",
    inicio: e.janelaInicio ? instanteParaLocal(e.janelaInicio, e.fusoHorario) : "",
    fim: e.janelaFim ? instanteParaLocal(e.janelaFim, e.fusoHorario) : "",
    fusoHorario: e.fusoHorario,
    encerramentoAutomatico: e.encerramentoAutomatico,
  };
}

function FormGeralInterno({ evento, travas }: { evento: Evento; travas: Travas }) {
  const salvo = doEvento(evento);
  const [r, setR] = useState<Rascunho>(salvo);
  const [tentou, setTentou] = useState(false);
  const [pedirMotivo, setPedirMotivo] = useState(false);
  const eventos = useEventos();
  const agora = useAgora();
  const router = useRouter();
  const anunciar = useAnunciar();
  const { marcarSujo } = useFormularioSujo();
  const servico = useServico();

  const leitura = travas.fase === "CONCLUIDO";
  const pode = (acao: Parameters<Travas["permite"]>[0]) => travas.permite(acao);

  const inicio = localParaInstante(r.inicio, r.fusoHorario);
  const fim = localParaInstante(r.fim, r.fusoHorario);
  const patch: PatchGeral = {};
  if (r.nome.trim() !== salvo.nome) patch.nome = r.nome.trim();
  if (r.slug !== salvo.slug) patch.slug = r.slug;
  if (r.descricao.trim() !== salvo.descricao) patch.descricao = r.descricao.trim() || null;
  if (r.fusoHorario !== salvo.fusoHorario) patch.fusoHorario = r.fusoHorario;
  if (r.encerramentoAutomatico !== salvo.encerramentoAutomatico) patch.encerramentoAutomatico = r.encerramentoAutomatico;
  // Os campos de data guardam instantes: trocar só o fuso não muda a janela.
  const mesmoInstante = (a: string | null, b: string | null) => (a && b ? paraMs(a) === paraMs(b) : a === b);
  if (r.inicio !== salvo.inicio || r.fusoHorario !== salvo.fusoHorario)
    if (!mesmoInstante(inicio, evento.janelaInicio)) patch.janelaInicio = inicio;
  if (r.fim !== salvo.fim || r.fusoHorario !== salvo.fusoHorario) if (!mesmoInstante(fim, evento.janelaFim)) patch.janelaFim = fim;
  const alterado = Object.keys(patch).length > 0;

  // Validação inline (as mesmas funções puras do serviço).
  const erros: Erros = { ...(servico.erro?.campos ?? {}) };
  const eNome = validarNomeEvento(r.nome);
  if (eNome) erros.nome = eNome;
  if (patch.slug !== undefined) {
    const eSlug = validarSlug(r.slug, eventos.filter((e) => e.id !== evento.id).map((e) => e.slug));
    if (eSlug) erros.slug = eSlug;
  }
  const eDesc = validarDescricaoEvento(r.descricao);
  if (eDesc) erros.descricao = eDesc;
  const janela = validarJanela(inicio ? paraMs(inicio) : null, fim ? paraMs(fim) : null);
  if (janela.janelaInicio) erros.inicio = janela.janelaInicio;
  if (janela.janelaFim) erros.fim = janela.janelaFim;
  if (travas.nivel("GERAL_FIM_JANELA") === "ESTENDER" && patch.janelaFim !== undefined) {
    const eExt = validarExtensaoFim(fim ? paraMs(fim) : null, evento.janelaFim ? paraMs(evento.janelaFim) : null, agora);
    if (eExt) erros.fim = eExt;
  }
  const temErros = Object.keys(erros).length > 0;
  const mostrar = (campo: string) => (tentou || servico.erro ? (erros[campo] ?? null) : null);

  const mudar = <K extends keyof Rascunho>(campo: K, valor: Rascunho[K]) => {
    setR((atual) => ({ ...atual, [campo]: valor }));
    marcarSujo(true);
    if (servico.erro) servico.limparErro();
  };

  const precisaMotivo =
    (patch.janelaFim !== undefined && travas.nivel("GERAL_FIM_JANELA") === "ESTENDER") ||
    (patch.encerramentoAutomatico !== undefined && travas.nivel("GERAL_ENCERRAMENTO_AUTOMATICO") === "AUDITADO");

  async function salvar(motivo?: string) {
    const resultado = await servico.executar(() => salvarGeral(evento.id, patch, motivo));
    setPedirMotivo(false);
    if (!resultado.ok) {
      anunciar("O formulário não foi salvo. Confira os erros.", "assertive");
      return;
    }
    marcarSujo(false);
    if (patch.slug !== undefined) router.replace(`/e/${resultado.dados.slug}/admin/configuracao?secao=geral`, { scroll: false });
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (temErros || !alterado) {
      if (temErros) anunciar("Confira os campos destacados.", "assertive");
      return;
    }
    if (precisaMotivo) setPedirMotivo(true);
    else void salvar();
  }

  function descartar() {
    setR(salvo);
    setTentou(false);
    servico.limparErro();
    marcarSujo(false);
  }

  const dicaSlug = travas.motivo("GERAL_SLUG");
  const dicaInicio = travas.motivo("GERAL_FUSO_INICIO");
  const dicaFim = travas.motivo("GERAL_FIM_JANELA");
  const dicaAuto = travas.motivo("GERAL_ENCERRAMENTO_AUTOMATICO");

  return (
    <section aria-labelledby="titulo-secao" className="flex flex-col gap-5">
      <h2 id="titulo-secao" tabIndex={-1} className="text-2xl font-bold">
        Geral
      </h2>
      <BannerTrava travas={travas} acoes={["GERAL_SLUG", "GERAL_FUSO_INICIO", "GERAL_FIM_JANELA", "GERAL_ENCERRAMENTO_AUTOMATICO"]} />
      {tentou && temErros && (
        <Alerta variante="erro" titulo="Não foi possível salvar">
          Confira os campos destacados.
        </Alerta>
      )}
      <form onSubmit={enviar} noValidate aria-busy={servico.carregando || undefined}>
        <fieldset disabled={leitura} className="flex flex-col gap-5">
          <Campo id="geral-nome" rotulo="Nome do evento" obrigatorio erro={mostrar("nome")}>
            <Input value={r.nome} onChange={(e) => mudar("nome", e.target.value)} maxLength={80} />
          </Campo>
          <Campo
            id="geral-slug"
            rotulo="Endereço"
            obrigatorio
            erro={mostrar("slug")}
            dica={
              <>
                Prévia: <code>/e/{r.slug || "…"}</code>
                {dicaSlug && <DicaTrava motivo={dicaSlug} className="mt-1" />}
              </>
            }
          >
            <Input
              value={r.slug}
              onChange={(e) => mudar("slug", e.target.value.toLowerCase())}
              disabled={!pode("GERAL_SLUG")}
              maxLength={40}
              autoComplete="off"
            />
          </Campo>
          <Campo id="geral-descricao" rotulo="Descrição" erro={mostrar("descricao")} dica={`${r.descricao.length}/600`}>
            <Textarea value={r.descricao} onChange={(e) => mudar("descricao", e.target.value)} maxLength={600} />
          </Campo>
          <div className="grid gap-5 sm:grid-cols-2">
            <Campo id="geral-inicio" rotulo="Início da votação" obrigatorio erro={mostrar("inicio")} dica={<DicaTrava motivo={dicaInicio} />}>
              <Input type="datetime-local" value={r.inicio} onChange={(e) => mudar("inicio", e.target.value)} disabled={!pode("GERAL_FUSO_INICIO")} />
            </Campo>
            <Campo id="geral-fim" rotulo="Fim da votação" obrigatorio erro={mostrar("fim")} dica={<DicaTrava motivo={dicaFim} />}>
              <Input type="datetime-local" value={r.fim} onChange={(e) => mudar("fim", e.target.value)} disabled={!pode("GERAL_FIM_JANELA")} />
            </Campo>
          </div>
          <Campo
            id="geral-fuso"
            rotulo="Fuso horário"
            dica={
              <>
                As datas acima são lidas neste fuso ({descreverDeslocamento(agora, r.fusoHorario)}).
                <DicaTrava motivo={dicaInicio} className="mt-1" />
              </>
            }
          >
            <Select value={r.fusoHorario} onChange={(e) => mudar("fusoHorario", e.target.value)} disabled={!pode("GERAL_FUSO_INICIO")}>
              {FUSOS_SUPORTADOS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.rotulo}
                </option>
              ))}
            </Select>
          </Campo>
          <div className="flex flex-col gap-1">
            <Checkbox
              id="geral-auto"
              rotulo="Encerrar automaticamente ao fim da janela"
              checked={r.encerramentoAutomatico}
              onChange={(e) => mudar("encerramentoAutomatico", e.target.checked)}
              disabled={!pode("GERAL_ENCERRAMENTO_AUTOMATICO")}
            />
            <p className="text-sm text-tema-texto-suave">
              A abertura da urna é sempre manual. Desligado, a urna continua aberta depois do fim e as telas mostram &quot;Tempo
              esgotado&quot; até a organização encerrar.
            </p>
            <DicaTrava motivo={dicaAuto} />
          </div>
          {!leitura && (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Botao variante="contorno" onClick={descartar} disabled={!alterado || servico.carregando} icone={<Undo2 aria-hidden className="size-4" />}>
                Descartar
              </Botao>
              <Botao type="submit" disabled={!alterado} carregando={servico.carregando} icone={<Save aria-hidden className="size-4" />}>
                Salvar
              </Botao>
            </div>
          )}
        </fieldset>
      </form>
      <DialogoMotivo
        key={String(pedirMotivo)}
        aberto={pedirMotivo}
        titulo="Confirmar alteração com a urna aberta"
        consequencia={
          patch.janelaFim !== undefined
            ? "O fim da votação será estendido. A alteração fica registrada na auditoria."
            : "O encerramento automático será alterado com a urna aberta. A alteração fica registrada na auditoria."
        }
        rotuloConfirmar="Salvar"
        carregando={servico.carregando}
        aoFechar={() => setPedirMotivo(false)}
        aoConfirmar={(motivo) => void salvar(motivo)}
      />
    </section>
  );
}
