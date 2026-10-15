import "server-only";
import { avaliarContrasteTema } from "@/dominio/contrasteTema";
import type { Evento, RegraDesempate } from "@/dominio/tipos";
import { exigirAcao, resolverFaseConfig, type AcaoConfig } from "@/dominio/travas";
import {
  validarDescricaoEvento,
  validarExtensaoFim,
  validarFuso,
  validarJanela,
  validarNomeEvento,
  validarPesos,
  validarSlug,
  validarTema,
  type DadosTema,
  type Erros,
} from "@/dominio/validacoesConfig";
import { FONTES_APROVADAS } from "@/lib/fontesAprovadas";
import { paraMs } from "@/lib/tempo";
import { registrarAuditoria } from "./auditoria";
import { db } from "./db";
import { invalidarEstadoPublico } from "./estadoPublico";
import { eventoParaDominio } from "./mapeadores";
import { falha, falhaInterna, sucesso, type Resultado } from "./resultado";
import { exigirAdmin, type UsuarioSessao } from "./sessao";

// ST7: seções Geral, Placar e Tema da configuração. No evento tudo isso já vem do seed; estas ações servem para
// corrigir o que mudar (principalmente a janela de votação, cujo horário exato o evento ainda confirma).

export type PatchGeral = Partial<
  Pick<Evento, "nome" | "slug" | "descricao" | "janelaInicio" | "janelaFim" | "fusoHorario" | "encerramentoAutomatico">
>;

const ACAO_DO_CAMPO: Record<keyof PatchGeral, AcaoConfig> = {
  nome: "GERAL_NOME_DESCRICAO",
  descricao: "GERAL_NOME_DESCRICAO",
  slug: "GERAL_SLUG",
  fusoHorario: "GERAL_FUSO_INICIO",
  janelaInicio: "GERAL_FUSO_INICIO",
  janelaFim: "GERAL_FIM_JANELA",
  encerramentoAutomatico: "GERAL_ENCERRAMENTO_AUTOMATICO",
};

const ms = (i: string | null | undefined) => (i ? paraMs(i) : null);

export async function salvarGeral(
  usuario: UsuarioSessao | null,
  eventoId: string,
  patch: PatchGeral,
  motivo?: string,
): Promise<Resultado<{ slug: string }>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento: linha, usuarioId } = admin.dados;
  const evento = eventoParaDominio(linha);
  // Data que não é data: recusa com mensagem de campo (e não um erro interno).
  const invalidas: Record<string, string> = {};
  if (typeof patch.janelaInicio === "string" && Number.isNaN(Date.parse(patch.janelaInicio))) invalidas.janelaInicio = "Data inválida.";
  if (typeof patch.janelaFim === "string" && Number.isNaN(Date.parse(patch.janelaFim))) invalidas.janelaFim = "Data inválida.";
  if (Object.keys(invalidas).length > 0) return falha("VALIDACAO", { campos: invalidas });

  const alterados = (Object.keys(patch) as (keyof PatchGeral)[]).filter((c) => {
    if (!(c in ACAO_DO_CAMPO)) return false;
    const novo = patch[c] ?? null;
    const atual = evento[c] ?? null;
    if (c === "janelaInicio" || c === "janelaFim") return ms(novo as string | null) !== ms(atual as string | null);
    return novo !== atual;
  });
  if (alterados.length === 0) return sucesso({ slug: evento.slug });

  for (const campo of alterados) {
    const ok = exigirAcao(linha, ACAO_DO_CAMPO[campo]);
    if (!ok.ok) return ok;
  }
  // Nesta versão a urna só fecha pelo organizador: não existe rotina que feche sozinha na hora da janela.
  if (alterados.includes("encerramentoAutomatico") && patch.encerramentoAutomatico === true)
    return falha("VALIDACAO", {
      campos: { encerramentoAutomatico: "O encerramento automático não está disponível: a urna fecha só pela organização." },
    });

  const proximo: Evento = { ...evento, ...patch };
  const erros: Erros = {};
  const e1 = validarNomeEvento(proximo.nome);
  if (e1) erros.nome = e1;
  if (alterados.includes("slug")) {
    const outros = await db().evento.findMany({ where: { id: { not: eventoId } }, select: { slug: true } });
    const e2 = validarSlug(
      proximo.slug,
      outros.map((e) => e.slug),
    );
    if (e2) erros.slug = e2;
  }
  const e3 = validarDescricaoEvento(proximo.descricao ?? "");
  if (e3) erros.descricao = e3;
  const e4 = validarFuso(proximo.fusoHorario);
  if (e4) erros.fusoHorario = e4;
  Object.assign(erros, validarJanela(ms(proximo.janelaInicio), ms(proximo.janelaFim)));
  const { fase } = resolverFaseConfig(linha);
  if (fase === "URNA_ABERTA" && alterados.includes("janelaFim")) {
    const e5 = validarExtensaoFim(ms(proximo.janelaFim), ms(evento.janelaFim), Date.now());
    if (e5) erros.janelaFim = e5;
  }
  if (Object.keys(erros).length > 0) {
    if (erros.slug === "Este endereço já está em uso.") return falha("CONFLITO", { campos: erros, mensagem: erros.slug });
    return falha("VALIDACAO", { campos: erros });
  }

  const detalhes: Record<string, unknown> = { campos: alterados };
  if (alterados.includes("janelaInicio") || alterados.includes("janelaFim"))
    detalhes.janela = { de: [evento.janelaInicio, evento.janelaFim], para: [proximo.janelaInicio, proximo.janelaFim] };
  if (motivo?.trim()) detalhes.motivo = motivo.trim();

  try {
    await db().$transaction(async (tx) => {
      await tx.evento.update({
        where: { id: eventoId },
        data: {
          nome: proximo.nome.trim(),
          slug: proximo.slug,
          descricao: proximo.descricao?.trim() ? proximo.descricao.trim() : null,
          fusoHorario: proximo.fusoHorario,
          janelaInicio: proximo.janelaInicio ? new Date(proximo.janelaInicio) : null,
          janelaFim: proximo.janelaFim ? new Date(proximo.janelaFim) : null,
          encerramentoAutomatico: proximo.encerramentoAutomatico,
        },
      });
      await registrarAuditoria(tx, { eventoId, usuarioId, acao: "CONFIG_ALTERADA", entidade: "evento", entidadeId: eventoId, detalhes });
    });
    invalidarEstadoPublico();
    return sucesso({ slug: proximo.slug });
  } catch (e) {
    return falhaInterna(e, "salvarGeral");
  }
}

export type DadosPlacar = { pesoPopular: number; pesoJuri: number; pesoInfantil: number; regraDesempate: RegraDesempate };

/** Pesos inteiros, soma 100 nos módulos ligados, desligado = 0. Trava total com a urna aberta. */
export async function salvarPlacar(usuario: UsuarioSessao | null, eventoId: string, dados: DadosPlacar): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const trava = exigirAcao(evento, "PLACAR");
  if (!trava.ok) return trava;
  const erroPesos = validarPesos(
    { POPULAR: dados.pesoPopular, JURI: dados.pesoJuri, INFANTIL: dados.pesoInfantil },
    { POPULAR: true, JURI: evento.moduloJuri, INFANTIL: evento.moduloInfantil },
  );
  if (erroPesos) return falha("VALIDACAO", { campos: { pesos: erroPesos } });
  if (dados.regraDesempate !== "JURI" && dados.regraDesempate !== "PUBLICO")
    return falha("VALIDACAO", { campos: { regraDesempate: "Escolha um critério." } });
  const atual = await db().configPlacar.findUnique({ where: { eventoId } });
  if (!atual) return falha("NAO_ENCONTRADO");
  const de = { pesoPopular: atual.pesoPopular, pesoJuri: atual.pesoJuri, pesoInfantil: atual.pesoInfantil, regraDesempate: atual.regraDesempate };
  try {
    await db().$transaction(async (tx) => {
      await tx.configPlacar.update({
        where: { eventoId },
        data: {
          pesoPopular: dados.pesoPopular,
          pesoJuri: dados.pesoJuri,
          pesoInfantil: dados.pesoInfantil,
          regraDesempate: dados.regraDesempate,
        },
      });
      await registrarAuditoria(tx, {
        eventoId,
        usuarioId,
        acao: "CONFIG_ALTERADA",
        entidade: "config_placar",
        entidadeId: eventoId,
        detalhes: { de, para: dados },
      });
    });
    invalidarEstadoPublico();
    return sucesso(null);
  } catch (e) {
    return falhaInterna(e, "salvarPlacar");
  }
}

export type DadosSalvarTema = DadosTema & { logoUrl: string | null };

/** Política de contraste da D15 da Etapa 0. Livre mesmo com a urna aberta. */
export async function salvarTema(usuario: UsuarioSessao | null, eventoId: string, dados: DadosSalvarTema): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const trava = exigirAcao(evento, "TEMA");
  if (!trava.ok) return trava;
  const erros = validarTema(dados, FONTES_APROVADAS);
  if (Object.keys(erros).length) return falha("VALIDACAO", { campos: erros });
  const contraste = avaliarContrasteTema(dados);
  if (!contraste.aprovado)
    return falha("VALIDACAO", { mensagem: `Contraste reprovado: ${contraste.reprovados.map((p) => p.par).join(", ")}.` });
  const atual = await db().tema.findUnique({ where: { eventoId } });
  if (!atual) return falha("NAO_ENCONTRADO");
  // Logo: só o que já está salvo ou um arquivo do próprio sistema (nada digitado à mão).
  if (dados.logoUrl !== null && dados.logoUrl !== atual.logoUrl && (!dados.logoUrl.startsWith("/") || dados.logoUrl.startsWith("//")))
    return falha("VALIDACAO", { campos: { logoUrl: "Envie o logo de novo." } });

  const proximo = {
    nomeExibicao: dados.nomeExibicao.trim(),
    logoUrl: dados.logoUrl,
    corPrimaria: dados.corPrimaria.toUpperCase(),
    corSecundaria: dados.corSecundaria.toUpperCase(),
    corFundo: dados.corFundo.toUpperCase(),
    corTexto: dados.corTexto.toUpperCase(),
    fonte: dados.fonte,
    rotuloCandidato: dados.rotuloCandidato.trim(),
    rotuloCandidatos: dados.rotuloCandidatos.trim(),
  };
  const campos = (Object.keys(proximo) as (keyof typeof proximo)[]).filter((k) => k !== "logoUrl" && proximo[k] !== atual[k]);
  const logoTrocado = proximo.logoUrl !== atual.logoUrl;
  if (!campos.length && !logoTrocado) return sucesso(null);
  try {
    await db().$transaction(async (tx) => {
      await tx.tema.update({ where: { eventoId }, data: proximo });
      await registrarAuditoria(tx, {
        eventoId,
        usuarioId,
        acao: "TEMA_ALTERADO",
        entidade: "tema",
        entidadeId: eventoId,
        detalhes: { campos, logoTrocado },
      });
    });
    invalidarEstadoPublico();
    return sucesso(null);
  } catch (e) {
    return falhaInterna(e, "salvarTema");
  }
}
