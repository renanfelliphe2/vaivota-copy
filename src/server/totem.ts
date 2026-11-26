import "server-only";
import {
  estatisticaIntervalos,
  INATIVIDADE_SESSAO_MAX,
  INATIVIDADE_SESSAO_MIN,
  resumirSessoes,
  votosPorFaixa,
  type AnaliseTotem,
  type ContagemVotoTotem,
  type ResumoSessao,
} from "@/dominio/sessaoTotem";
import type { DispositivoDoTotem, RelatorioTotem } from "@/dominio/totem";
import { validarFormatoCodigo } from "@/lib/codigos";
import { registrarAuditoria } from "./auditoria";
import { cookieDoTotem, gerarToken, hashDoCodigoPareamento, hashDoToken, pinConfere, tokenDoCookie } from "./credenciaisTotem";
import { db, type Transacao } from "./db";
import { codigoVigente } from "./dispositivos";
import { hashDoIp } from "./ip";
import { chaveDe, consumirEmMemoria, reservarTentativa, zerarTentativas } from "./limites";
import { falha, falhaInterna, sucesso, type CodigoErro, type Resultado } from "./resultado";

// Totem (Base/VotoInfantil.md §4, §6, §9 e §10): o lado do aparelho. O totem não tem login: a identidade é o token de longa
// duração que o pareamento grava num cookie HttpOnly; o banco só guarda o hash. Toda regra é conferida aqui, a cada chamada
// (aparelho, estado do aparelho, módulo, evento, urna, candidato): revogar ou pausar um tablet derruba os votos dele na hora.
// O voto infantil guarda candidato, horário e dispositivo. Nunca a criança, e a auditoria nunca guarda a escolha.

/** Contexto da requisição: cabeçalhos (cookie do totem, IP) e os `Set-Cookie` que a resposta precisa repassar ao tablet. */
export type ContextoTotem = { headers: Headers; ip: string; cookies: string[] };

// Proteção contra rajada de uma máquina disparando, NÃO controle de voto repetido (§2: intervalo mínimo e limite por totem ficam
// de fora; a integridade é o mediador adulto e os pesos). Uma criança leva vários segundos por voto, então o teto não a alcança.
const VOTOS_POR_TOTEM_POR_MINUTO = 120;
// Vários tablets dividem o Wi-Fi do local: o limite por IP só barra uma máquina disparando em massa.
const REQUISICOES_POR_IP_POR_MINUTO = 6000;
const PAREAMENTOS_POR_IP_POR_MINUTO = 120;
const CONSULTAS_POR_TOTEM_POR_MINUTO = 60;
// O relatório sai a cada hora, ao abrir e a cada pedido do admin: o teto só barra um laço.
const RELATORIOS_POR_TOTEM_POR_MINUTO = 12;

type LinhaDispositivo = { id: string; evento_id: string; estado: string; inatividade_sessao_min: number };
type LinhaEvento = { id: string; estado: string; estado_urna: string; modulo_infantil: boolean };

type LinhaTotem = { id: string; eventoId: string; nome: string; estado: DispositivoDoTotem["estado"]; categorias: { categoriaId: string }[] };

/** Leitura do totem com as categorias que ele exibe. */
const SELECAO_TOTEM = { id: true, eventoId: true, nome: true, estado: true, categorias: { select: { categoriaId: true } } } as const;

function doTotem(d: LinhaTotem): DispositivoDoTotem {
  return { id: d.id, eventoId: d.eventoId, nome: d.nome, estado: d.estado, categoriaIds: d.categorias.map((c) => c.categoriaId) };
}

// ─────────────────────────────────────────────
// Pareamento (§4)
// ─────────────────────────────────────────────

/** Pareamento sem efeito: a transação desfaz tudo (inclusive o dispositivo criado) e carrega o motivo para fora. */
class PareamentoRecusado extends Error {
  constructor(readonly codigo: CodigoErro) {
    super(codigo);
  }
}

type CodigoDePareamento = "CODIGO_INVALIDO" | "CODIGO_USADO" | "CODIGO_EXPIRADO";

/** Por que o UPDATE condicional não tomou o código. */
async function motivoDaRecusa(tx: Transacao, eventoId: string, hash: string): Promise<CodigoDePareamento> {
  const codigo = await tx.codigoPareamento.findUnique({ where: { eventoId_hashCodigo: { eventoId, hashCodigo: hash } }, select: { estado: true } });
  if (!codigo) return "CODIGO_INVALIDO";
  if (codigo.estado === "USADO") return "CODIGO_USADO";
  return "CODIGO_EXPIRADO";
}

/** Evento que ainda aceita parear: o rascunho aceita (o tablet é preparado antes da urna abrir); o concluído e o encerrado, não. */
function recusaDoEvento(e: { estado: string; estadoUrna: string; moduloInfantil: boolean }): CodigoErro | null {
  if (e.estado === "CONCLUIDO") return "EVENTO_CONCLUIDO";
  if (e.estadoUrna === "ENCERRADA") return "URNA_ENCERRADA";
  // Sem o módulo, nem se diz que o código existe: a mesma resposta de qualquer código recusado.
  if (!e.moduloInfantil) return "CODIGO_INVALIDO";
  return null;
}

/**
 * Troca o código de pareamento (uso único; sem validade desde 25/11/2026) por um token de longa duração, gravado no cookie do tablet. O
 * totem nasce com o nome e o PIN que o admin definiu ao gerar o código. Cinco códigos errados bloqueiam por 60 s; todo código
 * recusado dá a mesma mensagem, e o motivo exato fica só na auditoria.
 */
export async function parearTotem(ctx: ContextoTotem, entrada: { eventoId: string; codigo: string }): Promise<Resultado<{ dispositivo: DispositivoDoTotem }>> {
  if (!consumirEmMemoria(`pareamento-ip:${ctx.ip}`, PAREAMENTOS_POR_IP_POR_MINUTO, 60_000)) return falha("LIMITE_TENTATIVAS", { parametros: { n: 60 } });
  try {
    const evento = await db().evento.findUnique({ where: { id: entrada.eventoId }, select: { id: true, estado: true, estadoUrna: true, moduloInfantil: true } });
    if (!evento) return falha("NAO_ENCONTRADO", { detalhe: `evento ${entrada.eventoId} não existe` });
    const recusaEvento = recusaDoEvento(evento);
    if (recusaEvento) return falha(recusaEvento, { detalhe: `pareamento: ${recusaEvento}` });

    // Formato errado não gasta tentativa; o resto gasta ANTES de verificar (atômico), senão uma rajada passaria toda.
    if (!validarFormatoCodigo(entrada.codigo)) return falha("VALIDACAO", { campos: { codigo: "Digite o código completo, no formato XXXX-XXXX." } });
    const chave = chaveDe("pareamento", `${ctx.ip}:${evento.id}`);
    const reserva = await reservarTentativa(chave);
    const ipHash = hashDoIp(ctx.ip);
    if (!reserva.permitido) {
      if (reserva.primeiraRecusa)
        await registrarAuditoria(db(), {
          eventoId: evento.id,
          usuarioId: null,
          acao: "BLOQUEIO_RATE_LIMIT",
          entidade: "codigo_pareamento",
          detalhes: { alvo: "CODIGO_PAREAMENTO", segundos: 60 },
          ipHash,
        });
      return falha("LIMITE_TENTATIVAS", { parametros: { n: reserva.restanteSegundos } });
    }

    const hash = hashDoCodigoPareamento(evento.id, entrada.codigo);
    const token = gerarToken();
    let dispositivo: DispositivoDoTotem;
    try {
      dispositivo = await db().$transaction(async (tx) => {
        // Trava compartilhada: o encerramento da urna espera este pareamento terminar (e o relê já travado).
        const linhas = await tx.$queryRaw<LinhaEvento[]>`
          SELECT id, estado::text AS estado, estado_urna::text AS estado_urna, modulo_infantil FROM evento WHERE id = ${evento.id} FOR SHARE`;
        const atual = linhas[0];
        const recusa = atual ? recusaDoEvento({ estado: atual.estado, estadoUrna: atual.estado_urna, moduloInfantil: atual.modulo_infantil }) : "NAO_ENCONTRADO";
        if (recusa) throw new PareamentoRecusado(recusa);

        // O código é "tomado" com um UPDATE condicional: dois pareamentos com o mesmo código nunca passam.
        const tomado = await tx.codigoPareamento.updateMany({
          // 25/11/2026: sem validade (os códigos antigos ainda têm a sua); o código legível some ao ser usado.
          where: { eventoId: evento.id, hashCodigo: hash, ...codigoVigente(new Date()) },
          data: { estado: "USADO", codigo: null },
        });
        if (tomado.count === 0) throw new PareamentoRecusado(await motivoDaRecusa(tx, evento.id, hash));

        const codigo = await tx.codigoPareamento.findUniqueOrThrow({
          where: { eventoId_hashCodigo: { eventoId: evento.id, hashCodigo: hash } },
          select: { id: true, nome: true, hashPin: true, categoriaIds: true },
        });
        // As categorias escolhidas ao gerar o código, que ainda sejam do totem (o admin pode ter mudado o canal depois).
        const categorias = await tx.categoria.findMany({
          where: { eventoId: evento.id, canal: "TOTEM", id: { in: codigo.categoriaIds } },
          select: { id: true },
        });
        if (categorias.length === 0) throw new PareamentoRecusado("CODIGO_INVALIDO");
        const criado = await tx.dispositivo.create({
          data: {
            eventoId: evento.id,
            nome: codigo.nome ?? "Totem",
            hashToken: hashDoToken(token),
            hashPin: codigo.hashPin,
            estado: "ATIVO",
            categorias: { create: categorias.map((c) => ({ categoriaId: c.id })) },
          },
          select: SELECAO_TOTEM,
        });
        await tx.codigoPareamento.update({ where: { id: codigo.id }, data: { dispositivoId: criado.id } });
        await registrarAuditoria(tx, {
          eventoId: evento.id,
          usuarioId: null,
          dispositivoId: criado.id,
          acao: "DISPOSITIVO_PAREADO",
          entidade: "dispositivo",
          entidadeId: criado.id,
          detalhes: { nome: criado.nome },
          ipHash,
        });
        return doTotem(criado);
      });
    } catch (e) {
      if (!(e instanceof PareamentoRecusado)) throw e;
      if (e.codigo.startsWith("CODIGO_"))
        await registrarAuditoria(db(), {
          eventoId: evento.id,
          usuarioId: null,
          acao: "TENTATIVA_CODIGO_INVALIDA",
          entidade: "codigo_pareamento",
          detalhes: { motivo: e.codigo },
          ipHash,
        });
      return falha(e.codigo, { detalhe: `pareamento recusado: ${e.codigo}` });
    }
    await zerarTentativas(chave);
    ctx.cookies.push(cookieDoTotem(token));
    return sucesso({ dispositivo });
  } catch (e) {
    return falhaInterna(e, "parearTotem");
  }
}

// ─────────────────────────────────────────────
// O que o aparelho é (polling do quiosque)
// ─────────────────────────────────────────────

/**
 * O totem deste aparelho, pelo cookie. `null` = sem cookie ou token desconhecido (aparelho não pareado). O estado vem do banco a
 * cada chamada: pausar ou revogar aparece no quiosque na próxima consulta.
 */
export async function obterEstadoTotem(ctx: ContextoTotem): Promise<Resultado<{ dispositivo: DispositivoDoTotem | null; sincronizar: boolean }>> {
  const token = tokenDoCookie(ctx.headers);
  if (!token) return sucesso({ dispositivo: null, sincronizar: false });
  const hash = hashDoToken(token);
  if (!consumirEmMemoria(`totem-estado:${hash}`, CONSULTAS_POR_TOTEM_POR_MINUTO, 60_000) || !consumirEmMemoria(`totem-estado-ip:${ctx.ip}`, REQUISICOES_POR_IP_POR_MINUTO, 60_000))
    return falha("LIMITE_TENTATIVAS", { parametros: { n: 60 } });
  try {
    const d = await db().dispositivo.findUnique({ where: { hashToken: hash }, select: { ...SELECAO_TOTEM, ultimoSinalEm: true, sincronizacaoPedidaEm: true } });
    if (!d) return sucesso({ dispositivo: null, sincronizar: false });
    // "Forçar sincronização" do admin: pedido mais novo que o último relatório. O totem responde com sincronizarTotem.
    const pedido = d.sincronizacaoPedidaEm;
    const sincronizar = pedido !== null && (d.ultimoSinalEm === null || d.ultimoSinalEm < pedido);
    return sucesso({ dispositivo: doTotem(d), sincronizar });
  } catch (e) {
    return falhaInterna(e, "obterEstadoTotem");
  }
}

/**
 * Relatório do aparelho (página Totens): o que a tela mostra e se está em tela cheia. Sai ao abrir o quiosque, a cada hora e a
 * cada pedido do admin. Grava só o horário e esses dois campos; nada da criança, nada do voto.
 */
export async function sincronizarTotem(ctx: ContextoTotem, relatorio: RelatorioTotem): Promise<Resultado<null>> {
  const token = tokenDoCookie(ctx.headers);
  if (!token) return falha("DISPOSITIVO_INATIVO", { detalhe: "relatório sem token de totem" });
  const hash = hashDoToken(token);
  if (!consumirEmMemoria(`totem-relatorio:${hash}`, RELATORIOS_POR_TOTEM_POR_MINUTO, 60_000) || !consumirEmMemoria(`totem-estado-ip:${ctx.ip}`, REQUISICOES_POR_IP_POR_MINUTO, 60_000))
    return falha("LIMITE_TENTATIVAS", { parametros: { n: 60 } });
  try {
    const agora = new Date();
    const { count } = await db().dispositivo.updateMany({
      where: { hashToken: hash },
      data: { ultimoSinalEm: agora, situacaoRelatada: relatorio.situacao, telaCheia: relatorio.telaCheia },
    });
    if (count === 0) return falha("DISPOSITIVO_INATIVO", { detalhe: "relatório de totem desconhecido" });
    // Funil da sessão (logTotem.md): só grava numa sessão DESTE aparelho; de outro, é ignorado em silêncio.
    if (relatorio.funil) {
      await db().sessaoTotem.updateMany({
        where: { id: relatorio.funil.sessaoId, dispositivo: { hashToken: hash } },
        data: { funil: relatorio.funil.contagens, funilEm: agora },
      });
    }
    return sucesso(null);
  } catch (e) {
    return falhaInterna(e, "sincronizarTotem");
  }
}

// ─────────────────────────────────────────────
// Voto infantil (§6 e §9)
// ─────────────────────────────────────────────

/** Voto sem efeito (a transação desfaz tudo): carrega o código de erro para fora do `$transaction`. */
class VotoRecusado extends Error {
  constructor(readonly codigo: CodigoErro) {
    super(codigo);
  }
}

function estadoDaUrna(estado: string, estadoUrna: string, moduloInfantil: boolean): CodigoErro | null {
  if (estado === "CONCLUIDO") return "EVENTO_CONCLUIDO";
  if (estado === "RASCUNHO" || !moduloInfantil) return "EVENTO_INDISPONIVEL";
  if (estadoUrna === "NAO_INICIADA") return "URNA_NAO_ABERTA";
  if (estadoUrna === "ENCERRADA") return "URNA_ENCERRADA";
  return null;
}

/**
 * Um toque confirmado = um voto (sem edição). Só com o aparelho ATIVO do próprio evento, o módulo ligado e a urna aberta. A
 * transação trava o evento em modo compartilhado (o encerramento espera os votos em andamento e nenhum voto entra depois dele)
 * e o aparelho para escrita (uma pausa ou revogação do admin espera o voto em andamento; o voto seguinte já a enxerga).
 *
 * `idEnvio` (opcional) é a chave aleatória da tentativa: com a rede caindo, o totem não sabe se o voto chegou, e o "tentar de novo"
 * reenvia a MESMA chave. Se o aparelho já registrou um voto com essa chave, o servidor devolve REGISTRADO sem contar outro (e sem
 * olhar o estado atual do aparelho e da urna: o voto foi aceito quando valia, e a tela precisa saber disso). A chave só vale dentro
 * do aparelho e não identifica a criança. As tentativas de um mesmo aparelho se enfileiram pela trava do aparelho, então o reenvio
 * não corre contra o envio original.
 */
export async function votarInfantil(
  ctx: ContextoTotem,
  entrada: { eventoId: string; candidatoId: string; idEnvio?: string },
): Promise<Resultado<{ resultado: "REGISTRADO" } & Partial<ContagemVotoTotem>>> {
  const token = tokenDoCookie(ctx.headers);
  if (!token) return falha("DISPOSITIVO_INATIVO", { detalhe: "voto infantil sem token de totem" });
  const hash = hashDoToken(token);
  if (!consumirEmMemoria(`voto-infantil:${hash}`, VOTOS_POR_TOTEM_POR_MINUTO, 60_000) || !consumirEmMemoria(`voto-infantil-ip:${ctx.ip}`, REQUISICOES_POR_IP_POR_MINUTO, 60_000))
    return falha("LIMITE_TENTATIVAS", { parametros: { n: 60 } });

  try {
    const contagem = await db().$transaction(async (tx): Promise<ContagemVotoTotem | null> => {
      const eventos = await tx.$queryRaw<LinhaEvento[]>`
        SELECT id, estado::text AS estado, estado_urna::text AS estado_urna, modulo_infantil FROM evento WHERE id = ${entrada.eventoId} FOR SHARE`;
      const evento = eventos[0];
      if (!evento) throw new VotoRecusado("NAO_ENCONTRADO");

      // FOR NO KEY UPDATE: os votos do mesmo aparelho se enfileiram (o `ultimoUsoEm` é atualizado na sequência) e uma pausa ou revogação
      // do admin espera este voto terminar. Também serializa a abertura e o encerramento das sessões do aparelho.
      const aparelhos = await tx.$queryRaw<LinhaDispositivo[]>`
        SELECT id, evento_id, estado::text AS estado, inatividade_sessao_min FROM dispositivo WHERE hash_token = ${hash} FOR NO KEY UPDATE`;
      const aparelho = aparelhos[0];
      if (!aparelho || aparelho.evento_id !== evento.id) throw new VotoRecusado("DISPOSITIVO_INATIVO");

      if (entrada.idEnvio) {
        const anterior = await tx.votoInfantil.findUnique({
          where: { dispositivoId_idEnvio: { dispositivoId: aparelho.id, idEnvio: entrada.idEnvio } },
          select: { candidatoId: true, sessaoId: true },
        });
        if (anterior) {
          // A mesma chave com outro item é erro de quem chama: nunca diz "registrado" para um voto que não é este.
          if (anterior.candidatoId !== entrada.candidatoId) throw new VotoRecusado("VALIDACAO");
          return anterior.sessaoId ? contarVotos(tx, aparelho.id, anterior.sessaoId) : null;
        }
      }
      if (aparelho.estado !== "ATIVO") throw new VotoRecusado("DISPOSITIVO_INATIVO");

      const recusaEstado = estadoDaUrna(evento.estado, evento.estado_urna, evento.modulo_infantil);
      if (recusaEstado) throw new VotoRecusado(recusaEstado);

      // 25/11/2026: só item de uma categoria TOTEM que este aparelho exibe. O item da página do evento nunca entra pelo totem.
      const candidato = await tx.candidato.findFirst({
        where: {
          id: entrada.candidatoId,
          eventoId: evento.id,
          publicado: true,
          desqualificado: false,
          categoria: { canal: "TOTEM", totens: { some: { dispositivoId: aparelho.id } } },
        },
        select: { id: true },
      });
      if (!candidato) throw new VotoRecusado("CANDIDATO_INDISPONIVEL");

      const agora = new Date();
      const sessaoId = await sessaoParaVoto(tx, aparelho, agora);
      await tx.votoInfantil.create({
        data: { eventoId: evento.id, candidatoId: candidato.id, dispositivoId: aparelho.id, idEnvio: entrada.idEnvio ?? null, sessaoId, criadoEm: agora },
      });
      await tx.dispositivo.update({ where: { id: aparelho.id }, data: { ultimoUsoEm: agora } });
      return contarVotos(tx, aparelho.id, sessaoId);
    });
    return sucesso({ resultado: "REGISTRADO", ...(contagem ?? {}) });
  } catch (e) {
    if (e instanceof VotoRecusado) return falha(e.codigo, { detalhe: `voto infantil recusado: ${e.codigo}` });
    return falhaInterna(e, "votarInfantil");
  }
}

// ─────────────────────────────────────────────
// Saída do quiosque (§6)
// ─────────────────────────────────────────────

/**
 * Sair do modo quiosque só com o PIN que o admin definiu. Cinco PINs errados bloqueiam o aparelho por 60 s (o bloqueio é do servidor;
 * a criança não adivinha 10 mil combinações). Aparelho sem totem pareado não tem quiosque a proteger. Vale em qualquer estado do
 * aparelho: um totem pausado ou revogado também sai do quiosque com o PIN.
 */
export async function conferirPinTotem(ctx: ContextoTotem, entrada: { pin: string }): Promise<Resultado<null>> {
  const token = tokenDoCookie(ctx.headers);
  if (!token) return sucesso(null);
  try {
    const d = await db().dispositivo.findUnique({ where: { hashToken: hashDoToken(token) }, select: { id: true, eventoId: true, hashPin: true } });
    if (!d) return sucesso(null);
    const recusa = await recusaDoPin(ctx, d, entrada.pin);
    return recusa ?? sucesso(null);
  } catch (e) {
    return falhaInterna(e, "conferirPinTotem");
  }
}

/** Confere o PIN com o bloqueio de 5 erros (60 s). Devolve a falha pronta, ou null se o PIN confere. */
async function recusaDoPin(ctx: ContextoTotem, d: { id: string; eventoId: string; hashPin: string | null }, pin: string) {
  const chave = chaveDe("pin-totem", d.id);
  const reserva = await reservarTentativa(chave);
  if (!reserva.permitido) {
    if (reserva.primeiraRecusa)
      await registrarAuditoria(db(), {
        eventoId: d.eventoId,
        usuarioId: null,
        dispositivoId: d.id,
        acao: "BLOQUEIO_RATE_LIMIT",
        entidade: "dispositivo",
        entidadeId: d.id,
        detalhes: { alvo: "PIN_TOTEM", segundos: 60 },
        ipHash: hashDoIp(ctx.ip),
      });
    return falha("LIMITE_TENTATIVAS", { parametros: { n: reserva.restanteSegundos } });
  }
  if (!(await pinConfere(d.hashPin, pin))) return falha("CREDENCIAIS_INVALIDAS", { mensagem: "PIN incorreto.", detalhe: `PIN errado em ${d.id}` });
  await zerarTentativas(chave);
  return null;
}

// ─────────────────────────────────────────────
// Sessões do totem (logTotem.md, 26/11/2026)
// ─────────────────────────────────────────────
//
// A sessão só agrupa votos para a análise no aparelho: nunca trava o voto. O voto abre a sessão quando não há uma aberta e,
// se a aberta está parada há mais que `inatividade_sessao_min`, encerra-a (INATIVIDADE) e abre a seguinte. O menu do PIN
// encerra (MANUAL) e abre. Tudo sob a trava do aparelho (FOR NO KEY UPDATE), como o voto: sem duas sessões abertas.
// Nenhuma leitura daqui devolve o item votado.

type LinhaSessaoAberta = { id: string; numero: number; aberta_em: Date; ultimo_voto: Date | null };

async function sessaoAberta(tx: Transacao, dispositivoId: string): Promise<LinhaSessaoAberta | null> {
  const linhas = await tx.$queryRaw<LinhaSessaoAberta[]>`
    SELECT s.id, s.numero, s.aberta_em, (SELECT max(v.criado_em) FROM voto_infantil v WHERE v.sessao_id = s.id) AS ultimo_voto
    FROM sessao_totem s WHERE s.dispositivo_id = ${dispositivoId} AND s.encerrada_em IS NULL`;
  return linhas[0] ?? null;
}

async function abrirSessao(tx: Transacao, aparelho: { id: string; evento_id: string }, agora: Date, criancasEsperadas: number | null) {
  const ultima = await tx.sessaoTotem.findFirst({ where: { dispositivoId: aparelho.id }, orderBy: { numero: "desc" }, select: { numero: true } });
  const sessao = await tx.sessaoTotem.create({
    data: { eventoId: aparelho.evento_id, dispositivoId: aparelho.id, numero: (ultima?.numero ?? 0) + 1, abertaEm: agora, criancasEsperadas },
    select: { id: true, numero: true },
  });
  await registrarAuditoria(tx, {
    eventoId: aparelho.evento_id,
    usuarioId: null,
    dispositivoId: aparelho.id,
    acao: "SESSAO_TOTEM_ABERTA",
    entidade: "sessao_totem",
    entidadeId: sessao.id,
    detalhes: { numero: sessao.numero, ...(criancasEsperadas ? { criancasEsperadas } : {}) },
  });
  return sessao;
}

async function encerrarSessao(
  tx: Transacao,
  aparelho: { id: string; evento_id: string },
  s: LinhaSessaoAberta,
  motivo: "MANUAL" | "INATIVIDADE",
  quando: Date,
) {
  await tx.sessaoTotem.update({ where: { id: s.id }, data: { encerradaEm: quando, motivoEncerramento: motivo } });
  await registrarAuditoria(tx, {
    eventoId: aparelho.evento_id,
    usuarioId: null,
    dispositivoId: aparelho.id,
    acao: "SESSAO_TOTEM_ENCERRADA",
    entidade: "sessao_totem",
    entidadeId: s.id,
    detalhes: { numero: s.numero, motivo },
  });
}

/** A sessão em que o voto entra: a aberta, ou uma nova (encerrando a aberta se ficou parada além do limite do aparelho). */
async function sessaoParaVoto(tx: Transacao, aparelho: LinhaDispositivo, agora: Date): Promise<string> {
  const aberta = await sessaoAberta(tx, aparelho.id);
  if (aberta) {
    const ultimaAtividade = aberta.ultimo_voto ?? aberta.aberta_em;
    if (agora.getTime() - ultimaAtividade.getTime() <= aparelho.inatividade_sessao_min * 60_000) return aberta.id;
    // Encerrada no horário da última atividade: é quando a sessão de fato acabou.
    await encerrarSessao(tx, aparelho, aberta, "INATIVIDADE", ultimaAtividade);
  }
  return (await abrirSessao(tx, aparelho, agora, null)).id;
}

async function contarVotos(tx: Transacao, dispositivoId: string, sessaoId: string): Promise<ContagemVotoTotem> {
  const [sessao, votosSessao, votosTotal] = await Promise.all([
    tx.sessaoTotem.findUniqueOrThrow({ where: { id: sessaoId }, select: { numero: true } }),
    tx.votoInfantil.count({ where: { sessaoId } }),
    tx.votoInfantil.count({ where: { dispositivoId } }),
  ]);
  return { sessaoId, numeroSessao: sessao.numero, votosSessao, votosTotal };
}

/** O aparelho do cookie, com o PIN conferido. Devolve a falha pronta ou o aparelho. */
async function aparelhoComPin(ctx: ContextoTotem, pin: string) {
  const token = tokenDoCookie(ctx.headers);
  if (!token) return { ok: false, falha: falha("DISPOSITIVO_INATIVO", { detalhe: "menu do totem sem token" }) } as const;
  const d = await db().dispositivo.findUnique({
    where: { hashToken: hashDoToken(token) },
    select: { id: true, eventoId: true, hashPin: true, nome: true, inatividadeSessaoMin: true },
  });
  if (!d) return { ok: false, falha: falha("DISPOSITIVO_INATIVO", { detalhe: "menu do totem: aparelho desconhecido" }) } as const;
  const recusa = await recusaDoPin(ctx, d, pin);
  if (recusa) return { ok: false, falha: recusa } as const;
  return { ok: true, aparelho: d } as const;
}

async function travarAparelho(tx: Transacao, id: string): Promise<LinhaDispositivo> {
  const linhas = await tx.$queryRaw<LinhaDispositivo[]>`
    SELECT id, evento_id, estado::text AS estado, inatividade_sessao_min FROM dispositivo WHERE id = ${id} FOR NO KEY UPDATE`;
  if (!linhas[0]) throw new VotoRecusado("DISPOSITIVO_INATIVO");
  return linhas[0];
}

/** Análise do aparelho (menu do PIN): sessões, intervalos, faixas e funil. Nunca o item votado. */
async function montarAnalise(dispositivo: { id: string; nome: string; inatividadeSessaoMin: number }): Promise<AnaliseTotem> {
  const [sessoes, votos] = await Promise.all([
    db().sessaoTotem.findMany({
      where: { dispositivoId: dispositivo.id },
      select: { id: true, numero: true, abertaEm: true, encerradaEm: true, motivoEncerramento: true, criancasEsperadas: true, funil: true, funilEm: true },
    }),
    // Só horário e sessão: o candidato nem é lido.
    db().votoInfantil.findMany({ where: { dispositivoId: dispositivo.id }, select: { sessaoId: true, criadoEm: true } }),
  ]);
  const porSessao = new Map<string, number[]>();
  const semSessao: number[] = [];
  for (const v of votos) {
    if (!v.sessaoId) semSessao.push(v.criadoEm.getTime());
    else {
      const lista = porSessao.get(v.sessaoId);
      if (lista) lista.push(v.criadoEm.getTime());
      else porSessao.set(v.sessaoId, [v.criadoEm.getTime()]);
    }
  }
  const resumos = resumirSessoes(
    sessoes.map((s) => ({ ...s, motivo: s.motivoEncerramento })),
    porSessao,
    semSessao.length,
  );
  const atual = resumos[0];
  return {
    nome: dispositivo.nome,
    inatividadeMin: dispositivo.inatividadeSessaoMin,
    votosTotal: votos.length,
    votosSemSessao: semSessao.length,
    intervalosSemSessao: estatisticaIntervalos(semSessao),
    sessoes: resumos,
    faixasAtual: votosPorFaixa(atual ? (porSessao.get(atual.id) ?? []) : semSessao),
    geradoEm: new Date().toISOString(),
  };
}

export async function analisarTotem(ctx: ContextoTotem, entrada: { pin: string }): Promise<Resultado<AnaliseTotem>> {
  try {
    const r = await aparelhoComPin(ctx, entrada.pin);
    if (!r.ok) return r.falha;
    return sucesso(await montarAnalise(r.aparelho));
  } catch (e) {
    return falhaInterna(e, "analisarTotem");
  }
}

/** Encerra a sessão aberta (MANUAL) e devolve o resumo dela. Não abre a próxima: o botão "Abrir próxima sessão" ou o voto abrem. */
export async function encerrarSessaoTotem(ctx: ContextoTotem, entrada: { pin: string }): Promise<Resultado<{ resumo: ResumoSessao }>> {
  try {
    const r = await aparelhoComPin(ctx, entrada.pin);
    if (!r.ok) return r.falha;
    const encerrada = await db().$transaction(async (tx) => {
      const aparelho = await travarAparelho(tx, r.aparelho.id);
      const aberta = await sessaoAberta(tx, aparelho.id);
      if (!aberta) return null;
      await encerrarSessao(tx, aparelho, aberta, "MANUAL", new Date());
      return aberta.id;
    });
    if (!encerrada) return falha("NAO_ENCONTRADO", { mensagem: "Não há sessão aberta: o próximo voto abre uma.", detalhe: "encerrar sem sessão aberta" });
    const analise = await montarAnalise(r.aparelho);
    const resumo = analise.sessoes.find((s) => s.id === encerrada);
    if (!resumo) return falha("NAO_ENCONTRADO", { detalhe: "sessão encerrada sumiu da análise" });
    return sucesso({ resumo });
  } catch (e) {
    if (e instanceof VotoRecusado) return falha(e.codigo);
    return falhaInterna(e, "encerrarSessaoTotem");
  }
}

/** Abre a próxima sessão (com as crianças esperadas, opcional). Se já há uma aberta, só atualiza as esperadas dela. */
export async function abrirSessaoTotem(
  ctx: ContextoTotem,
  entrada: { pin: string; criancasEsperadas?: number | null },
): Promise<Resultado<{ sessaoId: string; numero: number }>> {
  try {
    const r = await aparelhoComPin(ctx, entrada.pin);
    if (!r.ok) return r.falha;
    const esperadas = entrada.criancasEsperadas ?? null;
    const sessao = await db().$transaction(async (tx) => {
      const aparelho = await travarAparelho(tx, r.aparelho.id);
      const aberta = await sessaoAberta(tx, aparelho.id);
      if (aberta) {
        await tx.sessaoTotem.update({ where: { id: aberta.id }, data: { criancasEsperadas: esperadas } });
        return { id: aberta.id, numero: aberta.numero };
      }
      return abrirSessao(tx, aparelho, new Date(), esperadas);
    });
    return sucesso({ sessaoId: sessao.id, numero: sessao.numero });
  } catch (e) {
    if (e instanceof VotoRecusado) return falha(e.codigo);
    return falhaInterna(e, "abrirSessaoTotem");
  }
}

/** Minutos sem voto até a sessão encerrar sozinha (5 min a 24 h). */
export async function configurarTotem(ctx: ContextoTotem, entrada: { pin: string; inatividadeMin: number }): Promise<Resultado<{ inatividadeMin: number }>> {
  try {
    const r = await aparelhoComPin(ctx, entrada.pin);
    if (!r.ok) return r.falha;
    const minutos = Math.round(entrada.inatividadeMin);
    if (minutos < INATIVIDADE_SESSAO_MIN || minutos > INATIVIDADE_SESSAO_MAX)
      return falha("VALIDACAO", { campos: { inatividadeMin: `Use de ${INATIVIDADE_SESSAO_MIN} a ${INATIVIDADE_SESSAO_MAX} minutos.` } });
    await db().dispositivo.update({ where: { id: r.aparelho.id }, data: { inatividadeSessaoMin: minutos } });
    await registrarAuditoria(db(), {
      eventoId: r.aparelho.eventoId,
      usuarioId: null,
      dispositivoId: r.aparelho.id,
      acao: "TOTEM_CONFIGURADO",
      entidade: "dispositivo",
      entidadeId: r.aparelho.id,
      detalhes: { inatividadeMin: minutos },
    });
    return sucesso({ inatividadeMin: minutos });
  } catch (e) {
    return falhaInterna(e, "configurarTotem");
  }
}
