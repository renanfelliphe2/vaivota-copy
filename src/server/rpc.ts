import "server-only";
import { z } from "zod";
import * as acesso from "./acesso";
import * as apresentacao from "./apresentacao";
import * as candidatos from "./candidatos";
import * as configuracao from "./configuracao";
import * as convites from "./convites";
import * as dashboard from "./dashboard";
import * as dispositivos from "./dispositivos";
import { montarEstadoPublico } from "./estadoPublico";
import * as exportacao from "./exportacao";
import * as juri from "./juri";
import * as operacao from "./operacao";
import * as parceiros from "./parceiros";
import { garantirParticipacao } from "./participacao";
import { falha, falhaInterna, sucesso, type Resultado } from "./resultado";
import { usuarioDaSessao, type UsuarioSessao } from "./sessao";
import * as totem from "./totem";
import * as votacao from "./votacao";

// Fronteira entre o navegador e o servidor (MVP Maratona Tech Tivit, seção 3). Cada serviço do protótipo (`src/servicos/*`) vira
// uma entrada aqui, com a MESMA assinatura de argumentos, devolvendo `Resultado<T>`. O cliente chama por
// `POST /api/servico/<nome>` (src/app/api/servico/[nome]/route.ts). Os argumentos são validados com zod antes de tudo.
// A identidade vem SEMPRE da sessão (cookie), nunca de um campo enviado pelo cliente.

export type ContextoRpc = {
  headers: Headers;
  ip: string;
  /** `Set-Cookie` que a resposta precisa repassar (login, confirmação de e-mail, sair). */
  cookies: string[];
};

const id = z.string().min(1).max(64);
const texto = (max: number) => z.string().max(max);
const instanteOuNulo = z.string().max(40).nullable();

const dadosCandidato = z.object({
  titulo: texto(400),
  imagemUrl: z.string().max(500).nullable(),
  camposExtras: z.record(z.string().max(60), texto(1500)),
});

const gruposAuditoria = z.enum(["ESTADO", "CONFIGURACAO", "JURI", "TOTEM", "SEGURANCA", "EXPORTACAO", "APRESENTACAO", "OUTRAS"]);
const arquivosExportacao = z.enum(["resumo_evento", "resultado_candidatos", "votos_por_minuto", "jurados", "dispositivos", "auditoria"]);

type Definicao<S extends z.ZodType> = {
  schema: S;
  /** Leituras de todo mundo (polling) aceitam o cache da sessão no cookie; o resto confere a sessão no banco. */
  sessaoEmCache?: boolean;
  executar: (ctx: ContextoRpc, usuario: UsuarioSessao | null, args: z.infer<S>) => Promise<Resultado<unknown>>;
};

function definir<S extends z.ZodType>(schema: S, executar: Definicao<S>["executar"], opcoes: { sessaoEmCache?: boolean } = {}): Definicao<S> {
  return { schema, executar, ...opcoes };
}

const semArgs = z.object({}).strict().optional();

const servicos = {
  // Estado público (leitura)
  obterEstado: definir(semArgs, async (_ctx, usuario) => sucesso(await montarEstadoPublico(usuario)), { sessaoEmCache: true }),

  // Acesso
  entrar: definir(z.object({ eventoId: id, email: texto(191), senha: texto(200) }), (ctx, _u, a) => acesso.entrar(ctx, a)),
  registrar: definir(
    z.object({
      eventoId: id,
      nome: texto(200),
      email: texto(191),
      senha: texto(200),
      confirmacaoSenha: texto(200),
      aceite: z.boolean(),
    }),
    (ctx, _u, a) => acesso.registrar(ctx, a),
  ),
  confirmarCodigo: definir(z.object({ eventoId: id, email: texto(191), codigo: texto(20) }), (ctx, _u, a) => acesso.confirmarCodigo(ctx, a)),
  reenviarCodigo: definir(
    z.object({ eventoId: id, email: texto(191), tipo: z.enum(["verificacao", "recuperacao"]) }),
    (ctx, _u, a) => acesso.reenviarCodigo(ctx, a),
  ),
  solicitarRecuperacao: definir(z.object({ eventoId: id, email: texto(191) }), (ctx, _u, a) => acesso.solicitarRecuperacao(ctx, a)),
  redefinirSenha: definir(
    z.object({ eventoId: id, email: texto(191), codigo: texto(20), senha: texto(200), confirmacaoSenha: texto(200) }),
    (ctx, _u, a) => acesso.redefinirSenha(ctx, a),
  ),
  sair: definir(semArgs, (ctx) => acesso.sair(ctx)),
  garantirParticipacao: definir(z.object({ eventoId: id }), (_ctx, usuario, a) => garantirParticipacao(usuario, a.eventoId)),

  // Votação popular
  votarPopular: definir(z.object({ eventoId: id, candidatoId: id }), (ctx, usuario, a) => votacao.votarPopular(usuario, a, { ip: ctx.ip })),
  consultarEstadoVoto: definir(z.object({ eventoId: id }), (ctx, usuario, a) => votacao.consultarEstadoVoto(usuario, a, { ip: ctx.ip }), {
    sessaoEmCache: true,
  }),

  // Júri (Festival): convite, voto único, notas por critério e melhor por critério
  resgatarConvite: definir(z.object({ eventoId: id, codigo: texto(40) }), (ctx, usuario, a) => convites.resgatarConvite(usuario, { ip: ctx.ip }, a)),
  votarJuri: definir(z.object({ eventoId: id, candidatoId: id }), (ctx, usuario, a) => juri.votarJuri(usuario, a, { ip: ctx.ip })),
  avaliarCandidatoJuri: definir(
    z.object({ eventoId: id, candidatoId: id, notas: z.record(id, z.number()) }),
    (ctx, usuario, a) => juri.avaliarCandidatoJuri(usuario, a, { ip: ctx.ip }),
  ),
  escolherMelhoresJuri: definir(
    z.object({ eventoId: id, candidatoId: id, criterioIds: z.array(id).max(20) }),
    (ctx, usuario, a) => juri.escolherMelhoresJuri(usuario, a, { ip: ctx.ip }),
  ),
  consultarAvaliacaoJuri: definir(z.object({ eventoId: id }), (_c, usuario, a) => juri.consultarAvaliacaoJuri(usuario, a)),

  // Totem (voto infantil), lado do aparelho. Sem login: a identidade é o token do cookie HttpOnly, nunca um campo enviado.
  parearTotem: definir(z.object({ eventoId: id, codigo: texto(40) }), (ctx, _u, a) => totem.parearTotem(ctx, a)),
  obterEstadoTotem: definir(semArgs, (ctx) => totem.obterEstadoTotem(ctx), { sessaoEmCache: true }),
  votarInfantil: definir(z.object({ eventoId: id, candidatoId: id }), (ctx, _u, a) => totem.votarInfantil(ctx, a), { sessaoEmCache: true }),
  conferirPinTotem: definir(z.object({ pin: texto(20) }), (ctx, _u, a) => totem.conferirPinTotem(ctx, a), { sessaoEmCache: true }),

  // Totem: gestão pelo admin
  alternarModuloInfantil: definir(z.object({ eventoId: id, ligado: z.boolean() }), (ctx, u, a) =>
    dispositivos.alternarModuloInfantil(u, a.eventoId, a.ligado, { ip: ctx.ip }),
  ),
  listarDispositivos: definir(z.object({ eventoId: id }), (_c, u, a) => dispositivos.listarDispositivos(u, a.eventoId)),
  gerarCodigoPareamento: definir(z.object({ eventoId: id, nome: texto(100), pin: texto(20) }), (ctx, u, a) =>
    dispositivos.gerarCodigoPareamento(u, a.eventoId, { nome: a.nome, pin: a.pin }, { ip: ctx.ip }),
  ),
  pausarDispositivo: definir(z.object({ eventoId: id, dispositivoId: id }), (ctx, u, a) =>
    dispositivos.pausarDispositivo(u, a.eventoId, a.dispositivoId, { ip: ctx.ip }),
  ),
  reativarDispositivo: definir(z.object({ eventoId: id, dispositivoId: id }), (ctx, u, a) =>
    dispositivos.reativarDispositivo(u, a.eventoId, a.dispositivoId, { ip: ctx.ip }),
  ),
  revogarDispositivo: definir(z.object({ eventoId: id, dispositivoId: id, motivo: texto(500).optional() }), (ctx, u, a) =>
    dispositivos.revogarDispositivo(u, a.eventoId, a.dispositivoId, { motivo: a.motivo }, { ip: ctx.ip }),
  ),
  renomearDispositivo: definir(z.object({ eventoId: id, dispositivoId: id, nome: texto(100) }), (_c, u, a) =>
    dispositivos.renomearDispositivo(u, a.eventoId, a.dispositivoId, a.nome),
  ),
  alterarPinDispositivo: definir(z.object({ eventoId: id, dispositivoId: id, pin: texto(20) }), (ctx, u, a) =>
    dispositivos.alterarPinDispositivo(u, a.eventoId, a.dispositivoId, a.pin, { ip: ctx.ip }),
  ),

  // Operação
  ativarEvento: definir(z.object({ eventoId: id }), (_c, u, a) => operacao.ativarEvento(u, a.eventoId)),
  abrirUrna: definir(z.object({ eventoId: id }), (_c, u, a) => operacao.abrirUrna(u, a.eventoId)),
  encerrarUrna: definir(z.object({ eventoId: id }), (_c, u, a) => operacao.encerrarUrna(u, a.eventoId)),
  concluirEvento: definir(z.object({ eventoId: id, confirmacaoNome: texto(200) }), (_c, u, a) =>
    operacao.concluirEvento(u, a.eventoId, a.confirmacaoNome),
  ),

  // Candidatos
  criarCandidato: definir(z.object({ eventoId: id, dados: dadosCandidato }), (_c, u, a) => candidatos.criarCandidato(u, a.eventoId, a.dados)),
  salvarCandidato: definir(
    z.object({ eventoId: id, candidatoId: id, dados: dadosCandidato, motivo: texto(500).optional() }),
    (_c, u, a) => candidatos.salvarCandidato(u, a.eventoId, a.candidatoId, a.dados, a.motivo),
  ),
  alterarPublicacao: definir(z.object({ eventoId: id, candidatoId: id, publicado: z.boolean() }), (_c, u, a) =>
    candidatos.alterarPublicacao(u, a.eventoId, a.candidatoId, a.publicado),
  ),
  salvarOrdemCandidatos: definir(z.object({ eventoId: id, ordem: z.enum(["ALEATORIA", "ALFABETICA"]) }), (_c, u, a) =>
    candidatos.salvarOrdemCandidatos(u, a.eventoId, a.ordem),
  ),
  removerCandidato: definir(z.object({ eventoId: id, candidatoId: id }), (_c, u, a) => candidatos.removerCandidato(u, a.eventoId, a.candidatoId)),
  desqualificarCandidato: definir(z.object({ eventoId: id, candidatoId: id, motivo: texto(500) }), (_c, u, a) =>
    candidatos.desqualificarCandidato(u, a.eventoId, a.candidatoId, a.motivo),
  ),
  salvarCamposExtras: definir(
    z.object({
      eventoId: id,
      campos: z.array(z.object({ chave: z.string().max(60).optional(), rotulo: texto(100) })).max(20),
      motivo: texto(500).optional(),
    }),
    (_c, u, a) => candidatos.salvarCamposExtras(u, a.eventoId, a.campos, a.motivo),
  ),

  // Configuração (ST7)
  salvarGeral: definir(
    z.object({
      eventoId: id,
      patch: z
        .object({
          nome: texto(200),
          slug: texto(80),
          descricao: z.string().max(2000).nullable(),
          janelaInicio: instanteOuNulo,
          janelaFim: instanteOuNulo,
          fusoHorario: texto(64),
          encerramentoAutomatico: z.boolean(),
        })
        .partial(),
      motivo: texto(500).optional(),
    }),
    (_c, u, a) => configuracao.salvarGeral(u, a.eventoId, a.patch, a.motivo),
  ),
  salvarPlacar: definir(
    z.object({
      eventoId: id,
      dados: z.object({
        pesoPopular: z.number().int(),
        pesoJuri: z.number().int(),
        pesoInfantil: z.number().int(),
        regraDesempate: z.enum(["JURI", "PUBLICO"]),
      }),
    }),
    (_c, u, a) => configuracao.salvarPlacar(u, a.eventoId, a.dados),
  ),
  salvarTema: definir(
    z.object({
      eventoId: id,
      dados: z.object({
        nomeExibicao: texto(200),
        corPrimaria: texto(7),
        corSecundaria: texto(7),
        corFundo: texto(7),
        corTexto: texto(7),
        fonte: texto(80),
        rotuloCandidato: texto(80),
        rotuloCandidatos: texto(80),
        logoUrl: z.string().max(500).nullable(),
      }),
    }),
    (_c, u, a) => configuracao.salvarTema(u, a.eventoId, a.dados),
  ),

  // Parceiros (admin): a lista inteira, na ordem recebida
  salvarParceiros: definir(
    z.object({
      eventoId: id,
      lista: z.array(z.object({ id: id.nullable(), nome: texto(100), logoUrl: z.string().max(500).nullable() })).max(50),
    }),
    (ctx, u, a) => parceiros.salvarParceiros(u, a.eventoId, a.lista, { ip: ctx.ip }),
  ),

  // Júri: configuração (admin)
  alternarModuloJuri: definir(z.object({ eventoId: id, ligado: z.boolean() }), (ctx, u, a) => juri.alternarModuloJuri(u, a.eventoId, a.ligado, { ip: ctx.ip })),
  salvarAvaliacaoJuri: definir(
    z.object({
      eventoId: id,
      dados: z.object({
        modoVotoJuri: z.enum(["VOTO_UNICO", "NOTAS_POR_CRITERIO", "MELHOR_POR_CRITERIO"]),
        criterios: z.array(z.object({ id: id.nullable(), nome: texto(100) })).max(20),
      }),
    }),
    (ctx, u, a) => juri.salvarAvaliacaoJuri(u, a.eventoId, a.dados, { ip: ctx.ip }),
  ),
  listarConvites: definir(z.object({ eventoId: id }), (_c, u, a) => convites.listarConvites(u, a.eventoId)),
  gerarConvites: definir(
    z.object({
      eventoId: id,
      quantidade: z.number().int(),
      rotuloBase: texto(100).optional(),
      validadeAte: instanteOuNulo,
    }),
    (ctx, u, a) => convites.gerarConvites(u, a.eventoId, { quantidade: a.quantidade, rotuloBase: a.rotuloBase, validadeAte: a.validadeAte }, { ip: ctx.ip }),
  ),
  renomearConvite: definir(z.object({ eventoId: id, conviteId: id, rotulo: texto(100) }), (_c, u, a) =>
    convites.renomearConvite(u, a.eventoId, a.conviteId, a.rotulo),
  ),
  revogarConvite: definir(
    z.object({ eventoId: id, conviteId: id, gerarSubstituto: z.boolean(), motivo: texto(500).optional() }),
    (ctx, u, a) => convites.revogarConvite(u, a.eventoId, a.conviteId, { gerarSubstituto: a.gerarSubstituto, motivo: a.motivo }, { ip: ctx.ip }),
  ),
  registrarExportacaoConvites: definir(z.object({ eventoId: id, quantidade: z.number().int().min(0).max(100_000) }), (ctx, u, a) =>
    convites.registrarExportacaoConvites(u, a.eventoId, a.quantidade, { ip: ctx.ip }),
  ),

  // Telão: sala de controle, palco, ensaio e revelação (admin)
  obterStatusResultado: definir(z.object({ eventoId: id }), (_c, u, a) => apresentacao.obterStatusResultado(u, a.eventoId)),
  obterEstadoAoVivo: definir(z.object({ eventoId: id }), (_c, u, a) => apresentacao.obterEstadoAoVivo(u, a.eventoId)),
  carregarRevelacao: definir(z.object({ eventoId: id }), (_c, u, a) => apresentacao.carregarRevelacao(u, a.eventoId)),
  obterDadosEnsaio: definir(z.object({ eventoId: id, cenarioId: z.string().min(1).max(64) }), (_c, u, a) =>
    apresentacao.obterDadosEnsaio(u, a.eventoId, a.cenarioId),
  ),
  registrarAcaoApresentacao: definir(
    z.object({
      eventoId: id,
      acao: z.enum(["REVELACAO_INICIADA", "REVELACAO_CONCLUIDA", "REVELACAO_REFEITA", "EMERGENCIA_ACIONADA"]),
      versao: z.number().int().min(1),
      cena: z.number().int().min(0).max(200).optional(),
    }),
    (ctx, u, a) => apresentacao.registrarAcaoApresentacao(u, a.eventoId, a.acao, { versao: a.versao, cena: a.cena }, { ip: ctx.ip }),
  ),

  // Painel
  obterOperacao: definir(z.object({ eventoId: id }), (_c, u, a) => dashboard.obterOperacao(u, a.eventoId)),
  obterVotosJuri: definir(z.object({ eventoId: id }), (_c, u, a) => dashboard.obterVotosJuri(u, a.eventoId)),
  obterResultado: definir(z.object({ eventoId: id }), (_c, u, a) => dashboard.obterResultado(u, a.eventoId)),
  listarAuditoria: definir(
    z.object({ eventoId: id, grupo: gruposAuditoria.optional(), limite: z.number().int().min(1).max(500).optional() }),
    (_c, u, a) => dashboard.listarAuditoria(u, a.eventoId, { grupo: a.grupo, limite: a.limite }),
  ),
  prepararExportacao: definir(z.object({ eventoId: id, arquivo: arquivosExportacao }), (ctx, u, a) =>
    exportacao.prepararExportacao(u, a.eventoId, a.arquivo, { ip: ctx.ip }),
  ),
  registrarRelatorioGerado: definir(z.object({ eventoId: id }), (ctx, u, a) =>
    exportacao.registrarRelatorioGerado(u, a.eventoId, { ip: ctx.ip }),
  ),
} as const;

export type NomeServico = keyof typeof servicos;

export function ehServico(nome: string): nome is NomeServico {
  return Object.hasOwn(servicos, nome);
}

/** Executa um serviço: valida os argumentos, resolve a sessão e chama. Nunca lança. */
export async function executarServico(nome: string, bruto: unknown, ctx: ContextoRpc): Promise<Resultado<unknown>> {
  if (!ehServico(nome)) return falha("NAO_ENCONTRADO", { detalhe: `serviço ${nome} não existe` });
  const definicao = servicos[nome] as Definicao<z.ZodType>;
  const lido = definicao.schema.safeParse(bruto ?? {});
  if (!lido.success) return falha("VALIDACAO", { detalhe: `argumentos inválidos em ${nome}: ${lido.error.issues[0]?.path.join(".")}` });
  try {
    const usuario = await usuarioDaSessao(ctx.headers, { estrita: !definicao.sessaoEmCache });
    return await definicao.executar(ctx, usuario, lido.data);
  } catch (e) {
    return falhaInterna(e, `serviço ${nome}`);
  }
}
