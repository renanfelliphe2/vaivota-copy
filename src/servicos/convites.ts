import { convitePodeSerRevogado, estadoExibidoConvite, proximoNumeroRotulo, type EstadoExibidoConvite } from "@/dominio/convites";
import type { ConviteJurado, EstadoApp, Evento, Instante } from "@/dominio/tipos";
import { exigirAcao } from "@/dominio/travas";
import { validarGeracaoConvites, validarRotuloConvite } from "@/dominio/validacoesConfig";
import { criarGerador } from "@/lib/aleatorio";
import { gerarCodigo, normalizarCodigo } from "@/lib/codigos";
import { hashMock } from "@/lib/hash";
import { paraMs } from "@/lib/tempo";
import { registrarAuditoria } from "@/store/auditoria";
import { IP_HASH, acharEvento, exigirAdmin, iniciarServico, instanteDoEvento, lerAmbiente } from "./apoio";
import { falha, sucesso, type Resultado } from "./resultado";

// Etapa 6 (seção 5.4, D9): só o hash vai ao banco. O código legível sai apenas em `dados` do resultado e
// nunca entra no store, no log nem na auditoria.

export type ConviteListado = {
  id: string;
  rotulo: string | null;
  estado: EstadoExibidoConvite;
  validadeAte: Instante | null;
  /** Nome de quem resgatou; nunca e-mail nem hash. */
  resgatadoPor: string | null;
  resgatadoEm: Instante | null;
};

export type CodigoGerado = { rotulo: string | null; codigo: string; validadeAte: Instante | null };

const MSG_JURI_DESLIGADO = "O módulo júri está desligado neste evento.";

/** Semeado por crypto.getRandomValues dentro do serviço (nunca Math.random). */
function novoGerador() {
  const semente = new Uint32Array(1);
  crypto.getRandomValues(semente);
  return criarGerador(semente[0]);
}

/** Gera códigos com hash único no evento; devolve os convites e os códigos legíveis. */
function gerarLote(
  estado: EstadoApp,
  evento: Evento,
  rotulos: (string | null)[],
  validadeAte: Instante | null,
  criadoEm: Instante,
): { convites: ConviteJurado[]; codigos: CodigoGerado[] } {
  const gerador = novoGerador();
  const hashes = new Set(estado.banco.convitesJurado.filter((c) => c.eventoId === evento.id).map((c) => c.hashCodigo));
  const convites: ConviteJurado[] = [];
  const codigos: CodigoGerado[] = [];
  for (const rotulo of rotulos) {
    let codigo = gerarCodigo(gerador);
    let hash = hashMock(normalizarCodigo(codigo));
    while (hashes.has(hash)) {
      codigo = gerarCodigo(gerador);
      hash = hashMock(normalizarCodigo(codigo));
    }
    hashes.add(hash);
    convites.push({
      id: `conv-${crypto.randomUUID().slice(0, 8)}`,
      eventoId: evento.id,
      hashCodigo: hash,
      rotulo,
      validadeAte,
      estado: "DISPONIVEL",
      participacaoId: null,
      resgatadoEm: null,
      criadoEm,
    });
    codigos.push({ rotulo, codigo, validadeAte });
  }
  return { convites, codigos };
}

export async function listarConvites(eventoId: string): Promise<Resultado<ConviteListado[]>> {
  const erro = await iniciarServico({ leitura: true });
  if (erro) return erro;
  const { estado, agoraMs } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const { banco } = estado;
  return sucesso(
    banco.convitesJurado
      .filter((c) => c.eventoId === eventoId)
      .map((c) => {
        const participacao = banco.participacoes.find((p) => p.id === c.participacaoId);
        const usuario = participacao ? banco.usuarios.find((u) => u.id === participacao.usuarioId) : undefined;
        return {
          id: c.id,
          rotulo: c.rotulo,
          estado: estadoExibidoConvite(c, agoraMs),
          validadeAte: c.validadeAte,
          resgatadoPor: usuario?.nome ?? null,
          resgatadoEm: c.resgatadoEm,
        };
      }),
  );
}

export async function gerarConvites(
  eventoId: string,
  entrada: { quantidade: number; rotuloBase?: string; validadeAte: Instante | null },
): Promise<Resultado<{ codigos: CodigoGerado[] }>> {
  const erro = await iniciarServico();
  if (erro) return erro;
  const { estado, agoraMs, store } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const trava = exigirAcao(evento, "CONVITES_GERAR");
  if (!trava.ok) return trava;
  if (!evento.moduloJuri) return falha("TRAVADO", { mensagem: MSG_JURI_DESLIGADO });
  const rotuloBase = entrada.rotuloBase?.trim() ?? "";
  const erros = validarGeracaoConvites({
    quantidade: entrada.quantidade,
    rotuloBase,
    validadeAteMs: entrada.validadeAte ? paraMs(entrada.validadeAte) : null,
    agoraMs,
  });
  if (Object.keys(erros).length) return falha("VALIDACAO", { campos: erros });

  const inicio = rotuloBase
    ? proximoNumeroRotulo(estado.banco.convitesJurado.filter((c) => c.eventoId === eventoId).map((c) => c.rotulo), rotuloBase)
    : 0;
  const rotulos = Array.from({ length: entrada.quantidade }, (_, i) => (rotuloBase ? `${rotuloBase} ${inicio + i}` : null));
  const agora = instanteDoEvento(estado, eventoId, agoraMs);
  const { convites, codigos } = gerarLote(estado, evento, rotulos, entrada.validadeAte, agora);

  store.atualizar((e) =>
    registrarAuditoria(
      { ...e, banco: { ...e.banco, convitesJurado: [...e.banco.convitesJurado, ...convites] } },
      {
        eventoId,
        usuarioId,
        acao: "CONVITES_GERADOS",
        entidade: "convite_jurado",
        detalhes: { quantidade: convites.length, rotuloBase: rotuloBase || null, validadeAte: entrada.validadeAte },
        ipHash: IP_HASH,
        criadoEm: agora,
      },
    ),
  );
  return sucesso({ codigos });
}

/** "Baixar CSV" (rev. 3, C14): audita a exportação; nunca recebe nem registra códigos. */
export async function registrarExportacaoConvites(eventoId: string, quantidade: number): Promise<Resultado<null>> {
  const erro = await iniciarServico();
  if (erro) return erro;
  const { estado, agoraMs, store } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  if (admin.dados.evento.estado === "CONCLUIDO") return falha("EVENTO_CONCLUIDO");
  store.atualizar((e) =>
    registrarAuditoria(e, {
      eventoId,
      usuarioId: admin.dados.usuarioId,
      acao: "EXPORTACAO_CSV",
      entidade: "evento",
      entidadeId: eventoId,
      detalhes: { arquivo: "convites", quantidade },
      ipHash: IP_HASH,
      criadoEm: instanteDoEvento(e, eventoId, agoraMs),
    }),
  );
  return sucesso(null);
}

export async function renomearConvite(eventoId: string, conviteId: string, rotulo: string): Promise<Resultado<null>> {
  const erro = await iniciarServico();
  if (erro) return erro;
  const { estado, store } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const trava = exigirAcao(admin.dados.evento, "CONVITES_RENOMEAR");
  if (!trava.ok) return trava;
  if (!estado.banco.convitesJurado.some((c) => c.id === conviteId && c.eventoId === eventoId)) return falha("NAO_ENCONTRADO");
  const e1 = validarRotuloConvite(rotulo);
  if (e1) return falha("VALIDACAO", { campos: { rotulo: e1 } });
  const novo = rotulo.trim() || null;
  store.atualizar((e) => ({
    ...e,
    banco: { ...e.banco, convitesJurado: e.banco.convitesJurado.map((c) => (c.id === conviteId ? { ...c, rotulo: novo } : c)) },
  }));
  return sucesso(null);
}

/** Só convite DISPONIVEL (inclui o expirado). Substituto: mesmo rótulo; validade original se ainda no futuro. */
export async function revogarConvite(
  eventoId: string,
  conviteId: string,
  opcoes: { gerarSubstituto: boolean; motivo?: string },
): Promise<Resultado<{ substituto: CodigoGerado | null }>> {
  const erro = await iniciarServico();
  if (erro) return erro;
  const { estado, agoraMs, store } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const trava = exigirAcao(evento, "CONVITES_REVOGAR");
  if (!trava.ok) return trava;
  if (!evento.moduloJuri) return falha("TRAVADO", { mensagem: MSG_JURI_DESLIGADO });
  const convite = estado.banco.convitesJurado.find((c) => c.id === conviteId && c.eventoId === eventoId);
  if (!convite) return falha("NAO_ENCONTRADO");
  if (!convitePodeSerRevogado(convite)) return falha("CONFLITO", { mensagem: "Só convites disponíveis podem ser revogados." });

  const agora = instanteDoEvento(estado, eventoId, agoraMs);
  const futuro = (i: Instante | null) => (i && paraMs(i) > agoraMs ? i : null);
  const validade = futuro(convite.validadeAte) ?? futuro(acharEvento(estado, eventoId)?.janelaFim ?? null);
  const lote = opcoes.gerarSubstituto ? gerarLote(estado, evento, [convite.rotulo], validade, agora) : null;
  const motivo = opcoes.motivo?.trim() || null;

  store.atualizar((e) => {
    let proximo: EstadoApp = {
      ...e,
      banco: {
        ...e.banco,
        convitesJurado: [
          ...e.banco.convitesJurado.map((c) => (c.id === conviteId ? { ...c, estado: "REVOGADO" as const } : c)),
          ...(lote?.convites ?? []),
        ],
      },
    };
    proximo = registrarAuditoria(proximo, {
      eventoId,
      usuarioId,
      acao: "CONVITE_REVOGADO",
      entidade: "convite_jurado",
      entidadeId: conviteId,
      detalhes: { rotulo: convite.rotulo, substituto: Boolean(lote), motivo },
      ipHash: IP_HASH,
      criadoEm: agora,
    });
    if (lote)
      proximo = registrarAuditoria(proximo, {
        eventoId,
        usuarioId,
        acao: "CONVITES_GERADOS",
        entidade: "convite_jurado",
        detalhes: { quantidade: 1, rotuloBase: convite.rotulo, validadeAte: validade, substitutoDe: conviteId },
        ipHash: IP_HASH,
        criadoEm: agora,
      });
    return proximo;
  });
  return sucesso({ substituto: lote?.codigos[0] ?? null });
}
