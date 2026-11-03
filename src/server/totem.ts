import "server-only";
import type { DispositivoDoTotem } from "@/dominio/totem";
import { validarFormatoCodigo } from "@/lib/codigos";
import { registrarAuditoria } from "./auditoria";
import { cookieDoTotem, gerarToken, hashDoCodigoPareamento, hashDoToken, pinConfere, tokenDoCookie } from "./credenciaisTotem";
import { db, type Transacao } from "./db";
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

type LinhaDispositivo = { id: string; evento_id: string; estado: string };
type LinhaEvento = { id: string; estado: string; estado_urna: string; modulo_infantil: boolean };

function doTotem(d: { id: string; eventoId: string; nome: string; estado: DispositivoDoTotem["estado"] }): DispositivoDoTotem {
  return { id: d.id, eventoId: d.eventoId, nome: d.nome, estado: d.estado };
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
 * Troca o código de pareamento (uso único, com validade) por um token de longa duração, gravado no cookie do tablet. O
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
          where: { eventoId: evento.id, hashCodigo: hash, estado: "DISPONIVEL", validadeAte: { gte: new Date() } },
          data: { estado: "USADO" },
        });
        if (tomado.count === 0) throw new PareamentoRecusado(await motivoDaRecusa(tx, evento.id, hash));

        const codigo = await tx.codigoPareamento.findUniqueOrThrow({
          where: { eventoId_hashCodigo: { eventoId: evento.id, hashCodigo: hash } },
          select: { id: true, nome: true, hashPin: true },
        });
        const criado = await tx.dispositivo.create({
          data: { eventoId: evento.id, nome: codigo.nome ?? "Totem", hashToken: hashDoToken(token), hashPin: codigo.hashPin, estado: "ATIVO" },
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
export async function obterEstadoTotem(ctx: ContextoTotem): Promise<Resultado<{ dispositivo: DispositivoDoTotem | null }>> {
  const token = tokenDoCookie(ctx.headers);
  if (!token) return sucesso({ dispositivo: null });
  const hash = hashDoToken(token);
  if (!consumirEmMemoria(`totem-estado:${hash}`, CONSULTAS_POR_TOTEM_POR_MINUTO, 60_000) || !consumirEmMemoria(`totem-estado-ip:${ctx.ip}`, REQUISICOES_POR_IP_POR_MINUTO, 60_000))
    return falha("LIMITE_TENTATIVAS", { parametros: { n: 60 } });
  try {
    const d = await db().dispositivo.findUnique({ where: { hashToken: hash }, select: { id: true, eventoId: true, nome: true, estado: true } });
    return sucesso({ dispositivo: d ? doTotem(d) : null });
  } catch (e) {
    return falhaInterna(e, "obterEstadoTotem");
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
): Promise<Resultado<{ resultado: "REGISTRADO" }>> {
  const token = tokenDoCookie(ctx.headers);
  if (!token) return falha("DISPOSITIVO_INATIVO", { detalhe: "voto infantil sem token de totem" });
  const hash = hashDoToken(token);
  if (!consumirEmMemoria(`voto-infantil:${hash}`, VOTOS_POR_TOTEM_POR_MINUTO, 60_000) || !consumirEmMemoria(`voto-infantil-ip:${ctx.ip}`, REQUISICOES_POR_IP_POR_MINUTO, 60_000))
    return falha("LIMITE_TENTATIVAS", { parametros: { n: 60 } });

  try {
    await db().$transaction(async (tx) => {
      const eventos = await tx.$queryRaw<LinhaEvento[]>`
        SELECT id, estado::text AS estado, estado_urna::text AS estado_urna, modulo_infantil FROM evento WHERE id = ${entrada.eventoId} FOR SHARE`;
      const evento = eventos[0];
      if (!evento) throw new VotoRecusado("NAO_ENCONTRADO");

      // FOR NO KEY UPDATE: os votos do mesmo aparelho se enfileiram (o `ultimoUsoEm` é atualizado na sequência) e uma pausa ou revogação
      // do admin espera este voto terminar.
      const aparelhos = await tx.$queryRaw<LinhaDispositivo[]>`
        SELECT id, evento_id, estado::text AS estado FROM dispositivo WHERE hash_token = ${hash} FOR NO KEY UPDATE`;
      const aparelho = aparelhos[0];
      if (!aparelho || aparelho.evento_id !== evento.id) throw new VotoRecusado("DISPOSITIVO_INATIVO");

      if (entrada.idEnvio) {
        const anterior = await tx.votoInfantil.findUnique({
          where: { dispositivoId_idEnvio: { dispositivoId: aparelho.id, idEnvio: entrada.idEnvio } },
          select: { candidatoId: true },
        });
        if (anterior) {
          // A mesma chave com outro item é erro de quem chama: nunca diz "registrado" para um voto que não é este.
          if (anterior.candidatoId !== entrada.candidatoId) throw new VotoRecusado("VALIDACAO");
          return;
        }
      }
      if (aparelho.estado !== "ATIVO") throw new VotoRecusado("DISPOSITIVO_INATIVO");

      const recusaEstado = estadoDaUrna(evento.estado, evento.estado_urna, evento.modulo_infantil);
      if (recusaEstado) throw new VotoRecusado(recusaEstado);

      const candidato = await tx.candidato.findFirst({
        where: { id: entrada.candidatoId, eventoId: evento.id, publicado: true, desqualificado: false },
        select: { id: true },
      });
      if (!candidato) throw new VotoRecusado("CANDIDATO_INDISPONIVEL");

      await tx.votoInfantil.create({
        data: { eventoId: evento.id, candidatoId: candidato.id, dispositivoId: aparelho.id, idEnvio: entrada.idEnvio ?? null },
      });
      await tx.dispositivo.update({ where: { id: aparelho.id }, data: { ultimoUsoEm: new Date() } });
    });
    return sucesso({ resultado: "REGISTRADO" });
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
  const hash = hashDoToken(token);
  try {
    const d = await db().dispositivo.findUnique({ where: { hashToken: hash }, select: { id: true, eventoId: true, hashPin: true } });
    if (!d) return sucesso(null);

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
    if (!(await pinConfere(d.hashPin, entrada.pin))) return falha("CREDENCIAIS_INVALIDAS", { mensagem: "PIN incorreto.", detalhe: `PIN errado em ${d.id}` });
    await zerarTentativas(chave);
    return sucesso(null);
  } catch (e) {
    return falhaInterna(e, "conferirPinTotem");
  }
}
