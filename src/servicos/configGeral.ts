import { exigirAcao, resolverFaseConfig, type AcaoConfig } from "@/dominio/travas";
import type { Evento, Instante } from "@/dominio/tipos";
import {
  validarDescricaoEvento,
  validarExtensaoFim,
  validarFuso,
  validarJanela,
  validarNomeEvento,
  validarSlug,
  type Erros,
} from "@/dominio/validacoesConfig";
import { paraMs } from "@/lib/tempo";
import { registrarAuditoria } from "@/store/auditoria";
import { IP_HASH, exigirAdmin, iniciarServico, instanteDoEvento, lerAmbiente } from "./apoio";
import { falha, sucesso, type Resultado } from "./resultado";

// Etapa 6 (seção 5.2): seção Geral. exigirAcao por campo alterado, validação antes de mutar e um único
// `atualizar`. O método de identificação fica por seed (rev. 3, C6).

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

const ms = (i: Instante | null | undefined) => (i ? paraMs(i) : null);

export async function salvarGeral(eventoId: string, patch: PatchGeral, motivo?: string): Promise<Resultado<{ slug: string }>> {
  const erro = await iniciarServico();
  if (erro) return erro;
  const { estado, agoraMs, store } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;

  const alterados = (Object.keys(patch) as (keyof PatchGeral)[]).filter((c) => {
    const novo = patch[c] ?? null;
    const atual = evento[c] ?? null;
    if (c === "janelaInicio" || c === "janelaFim") return ms(novo as Instante | null) !== ms(atual as Instante | null);
    return novo !== atual;
  });
  if (alterados.length === 0) return sucesso({ slug: evento.slug });

  for (const campo of alterados) {
    const ok = exigirAcao(evento, ACAO_DO_CAMPO[campo]);
    if (!ok.ok) return ok;
  }

  const proximo: Evento = { ...evento, ...patch };
  const erros: Erros = {};
  const e1 = validarNomeEvento(proximo.nome);
  if (e1) erros.nome = e1;
  if (alterados.includes("slug")) {
    const e2 = validarSlug(proximo.slug, estado.banco.eventos.filter((e) => e.id !== eventoId).map((e) => e.slug));
    if (e2) erros.slug = e2;
  }
  const e3 = validarDescricaoEvento(proximo.descricao ?? "");
  if (e3) erros.descricao = e3;
  const e4 = validarFuso(proximo.fusoHorario);
  if (e4) erros.fusoHorario = e4;
  Object.assign(erros, validarJanela(ms(proximo.janelaInicio), ms(proximo.janelaFim)));
  const { fase } = resolverFaseConfig(evento);
  if (fase === "URNA_ABERTA" && alterados.includes("janelaFim")) {
    const e5 = validarExtensaoFim(ms(proximo.janelaFim), ms(evento.janelaFim), agoraMs);
    if (e5) erros.janelaFim = e5;
  }
  if (Object.keys(erros).length > 0) {
    if (erros.slug === "Este endereço já está em uso.") return falha("CONFLITO", { campos: erros, mensagem: erros.slug });
    return falha("VALIDACAO", { campos: erros });
  }

  const agora = instanteDoEvento(estado, eventoId, agoraMs);
  const detalhes: Record<string, unknown> = { campos: alterados };
  if (alterados.includes("janelaInicio") || alterados.includes("janelaFim"))
    detalhes.janela = { de: [evento.janelaInicio, evento.janelaFim], para: [proximo.janelaInicio, proximo.janelaFim] };
  if (motivo?.trim()) detalhes.motivo = motivo.trim();

  store.atualizar((e) => {
    const comEvento = {
      ...e,
      banco: { ...e.banco, eventos: e.banco.eventos.map((ev) => (ev.id === eventoId ? { ...proximo, atualizadoEm: agora } : ev)) },
      dev: e.dev.slugPadrao === evento.slug ? { ...e.dev, slugPadrao: proximo.slug } : e.dev,
    };
    return registrarAuditoria(comEvento, {
      eventoId,
      usuarioId,
      acao: "CONFIG_ALTERADA",
      entidade: "evento",
      entidadeId: eventoId,
      detalhes,
      ipHash: IP_HASH,
      criadoEm: agora,
    });
  });
  return sucesso({ slug: proximo.slug });
}
