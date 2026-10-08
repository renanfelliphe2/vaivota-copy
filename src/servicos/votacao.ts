import { aplicarVotoJuri, aplicarVotoPopular } from "@/dominio/aplicarVoto";
import { modoVotoJuriDoEvento } from "@/dominio/avaliacaoJuri";
import { votaveis } from "@/dominio/candidatos";
import type { Candidato, EstadoApp, Evento, Participacao, ResultadoEnvioVoto, Usuario } from "@/dominio/tipos";
import { candidatoBloqueadoParaVoto } from "@/dominio/votoProprio";
import { embaralharComSemente } from "@/lib/aleatorio";
import { registrarAuditoria } from "@/store/auditoria";
import { encerrarUrna } from "@/store/transicoes";
import { IP_HASH, acharEvento, instanteDoEvento, lerAmbiente } from "./apoio";
import {
  atraso,
  consumirFalhaProxima,
  falha,
  registrarLog,
  simularFalha,
  sucesso,
  type ErroServico,
  type Resultado,
} from "./resultado";

// Etapa 5 (seção 5.2): os serviços imitam o servidor. Validam tudo antes de gravar, na ordem da tabela,
// e gravam com um único `atualizar`. A identidade vem sempre da sessão (D7). Rejeição nunca muta o banco,
// exceto JA_VOTOU_OUTRA_SESSAO (D8), que deixa as invariantes verdes.

type EntradaVoto = { eventoId: string; candidatoId: string };
type Papel = "POPULAR" | "JURI";

export type Contexto = { estado: EstadoApp; evento: Evento; usuario: Usuario; participacao: Participacao };

/** Validações 1 a 5 (sessão, evento, e-mail, estado do evento, participação, papel). */
export function validarIdentidade(estado: EstadoApp, eventoId: string, papel: Papel): Resultado<Contexto> {
  const usuario = estado.banco.usuarios.find((u) => u.id === estado.sessao.usuarioId);
  if (!usuario) return falha("NAO_AUTORIZADO", { detalhe: "sem sessão" });
  const evento = acharEvento(estado, eventoId);
  if (!evento) return falha("NAO_ENCONTRADO", { detalhe: `evento ${eventoId} não existe` });
  if (!usuario.emailVerificadoEm) return falha("EMAIL_NAO_VERIFICADO");
  if (evento.estado === "CONCLUIDO") return falha("EVENTO_CONCLUIDO");
  if (evento.estado === "RASCUNHO") return falha("EVENTO_INDISPONIVEL");
  const participacao = estado.banco.participacoes.find((p) => p.usuarioId === usuario.id && p.eventoId === eventoId);
  // 4a (D14): o voto nunca cria participação.
  if (!participacao) return falha("NAO_AUTORIZADO", { detalhe: `envio sem participação de ${usuario.id} em ${eventoId}` });
  if (papel === "POPULAR" && participacao.papel !== "PUBLICO")
    return falha("PAPEL_INVALIDO", { detalhe: `voto popular com papel ${participacao.papel}` });
  if (papel === "JURI" && (participacao.papel !== "JURADO" || !evento.moduloJuri))
    return falha("PAPEL_INVALIDO", { detalhe: `voto do júri com papel ${participacao.papel}, módulo júri ${evento.moduloJuri}` });
  return sucesso({ estado, evento, usuario, participacao });
}

/** Validação 6: só `ABERTA` passa, inclusive depois de janelaFim (D13). */
export function validarUrna(evento: Evento): { ok: false; erro: ErroServico } | null {
  if (evento.estadoUrna === "NAO_INICIADA") return falha("URNA_NAO_ABERTA");
  if (evento.estadoUrna === "ENCERRADA") return falha("URNA_ENCERRADA");
  return null;
}

/** Validações 8 e 9: candidato votável do evento e voto em si mesmo. */
export function validarCandidato(ctx: Contexto, candidatoId: string): Resultado<Candidato> {
  const candidato = votaveis(ctx.estado.banco.candidatos.filter((c) => c.eventoId === ctx.evento.id)).find((c) => c.id === candidatoId);
  if (!candidato) return falha("CANDIDATO_INDISPONIVEL", { detalhe: `candidato ${candidatoId} não votável em ${ctx.evento.id}` });
  if (candidatoBloqueadoParaVoto(candidato, ctx.usuario.id, ctx.evento)) return falha("VOTO_PROPRIO");
  return sucesso(candidato);
}

/** URNA_ENCERRA: depois das validações 1 a 5, encerra pela transição (congela o resultado) e recusa. */
export function encerrarPorFalhaSimulada(eventoId: string): Resultado<never> {
  const { store, agoraMs } = lerAmbiente();
  store.atualizar((e) => encerrarUrna(e, eventoId, { agoraMs, usuarioId: null, origem: "FALHA_SIMULADA" }));
  return falha("URNA_ENCERRADA", { detalhe: "falha simulada URNA_ENCERRA" });
}

/** REDE_NAO_GRAVOU e ERRO_INTERNO (e o erro de rede persistente): nada é gravado. */
export async function inicioDoEnvio() {
  await atraso();
  const persistente = simularFalha({ consumirPontual: false });
  if (persistente) return { erro: persistente, modo: "NENHUMA" as const };
  const modo = consumirFalhaProxima(); // uma única vez por envio
  if (modo === "REDE_NAO_GRAVOU") return { erro: falha("REDE", { detalhe: "falha pontual REDE_NAO_GRAVOU" }), modo };
  if (modo === "ERRO_INTERNO") return { erro: falha("ERRO_INTERNO", { detalhe: "falha pontual ERRO_INTERNO" }), modo };
  return { erro: null, modo };
}

export async function votarPopular(entrada: EntradaVoto): Promise<Resultado<{ resultado: "REGISTRADO" }>> {
  const { erro, modo } = await inicioDoEnvio();
  if (erro) return erro;
  const { estado, agoraMs, store } = lerAmbiente();

  const id = validarIdentidade(estado, entrada.eventoId, "POPULAR");
  if (!id.ok) return id;
  const ctx = id.dados;
  if (modo === "URNA_ENCERRA" && ctx.evento.estadoUrna === "ABERTA") return encerrarPorFalhaSimulada(ctx.evento.id);
  const urna = validarUrna(ctx.evento);
  if (urna) return urna;

  if (modo === "JA_VOTOU_OUTRA_SESSAO") {
    if (!ctx.participacao.votou) {
      // Voto legítimo "da outra sessão", em candidato diferente do escolhido.
      const opcoes = votaveis(estado.banco.candidatos.filter((c) => c.eventoId === ctx.evento.id)).filter(
        (c) => c.id !== entrada.candidatoId && !candidatoBloqueadoParaVoto(c, ctx.usuario.id, ctx.evento),
      );
      const outro = embaralharComSemente(opcoes, `outra-sessao:${ctx.usuario.id}:${ctx.evento.id}`)[0] ?? null;
      if (outro) {
        store.atualizar((e) =>
          aplicarVotoPopular(e, { eventoId: ctx.evento.id, usuarioId: ctx.usuario.id, candidatoId: outro.id, agoraMs }),
        );
      }
    }
    return falha("JA_VOTOU", { detalhe: "falha simulada JA_VOTOU_OUTRA_SESSAO" });
  }

  if (ctx.participacao.votou) return falha("JA_VOTOU", { detalhe: "participação já com votou = true" });
  const candidato = validarCandidato(ctx, entrada.candidatoId);
  if (!candidato.ok) return candidato;

  store.atualizar((e) =>
    aplicarVotoPopular(e, { eventoId: ctx.evento.id, usuarioId: ctx.usuario.id, candidatoId: candidato.dados.id, agoraMs }),
  );
  if (modo === "REDE_GRAVOU") return falha("REDE", { detalhe: "falha pontual REDE_GRAVOU: gravou e a resposta se perdeu" });
  return sucesso({ resultado: "REGISTRADO" });
}

export async function votarJuri(entrada: EntradaVoto): Promise<Resultado<{ resultado: ResultadoEnvioVoto }>> {
  const { erro, modo } = await inicioDoEnvio();
  if (erro) return erro;
  const { estado, agoraMs, store } = lerAmbiente();

  const id = validarIdentidade(estado, entrada.eventoId, "JURI");
  if (!id.ok) return id;
  const ctx = id.dados;
  if (modo === "URNA_ENCERRA" && ctx.evento.estadoUrna === "ABERTA") return encerrarPorFalhaSimulada(ctx.evento.id);
  const urna = validarUrna(ctx.evento);
  if (urna) return urna;
  if (modo === "JA_VOTOU_OUTRA_SESSAO") registrarLog("JA_VOTOU_OUTRA_SESSAO sem efeito no voto do júri (o jurado sempre pode substituir)");
  // 08/10/2026: com o júri por critério, o voto único é recusado (a tela leva à avaliação).
  const modoJuri = modoVotoJuriDoEvento(estado.banco, ctx.evento.id);
  if (modoJuri !== "VOTO_UNICO") return falha("MODO_JURI_DIFERENTE", { detalhe: `votarJuri com o júri em ${modoJuri}` });

  const candidato = validarCandidato(ctx, entrada.candidatoId);
  if (!candidato.ok) return candidato;

  const atual = estado.banco.votosJuri.find((v) => v.participacaoId === ctx.participacao.id && v.eventoId === ctx.evento.id);
  if (atual?.candidatoId === candidato.dados.id) return sucesso({ resultado: "SEM_ALTERACAO" });

  const resultado: ResultadoEnvioVoto = atual ? "ATUALIZADO" : "REGISTRADO";
  store.atualizar((e) => {
    const votado = aplicarVotoJuri(e, { eventoId: ctx.evento.id, usuarioId: ctx.usuario.id, candidatoId: candidato.dados.id, agoraMs });
    const historicoId = votado.banco.sequencias.historicoVotoJuri;
    const votoJuriId = votado.banco.historicoVotosJuri.find((h) => h.id === historicoId)?.votoJuriId;
    return registrarAuditoria(votado, {
      eventoId: ctx.evento.id,
      usuarioId: ctx.usuario.id,
      acao: atual ? "VOTO_JURI_ALTERADO" : "VOTO_JURI_REGISTRADO",
      entidade: "voto_juri",
      entidadeId: votoJuriId,
      detalhes: { historicoId },
      ipHash: IP_HASH,
      criadoEm: instanteDoEvento(e, ctx.evento.id, agoraMs),
    });
  });
  if (modo === "REDE_GRAVOU") return falha("REDE", { detalhe: "falha pontual REDE_GRAVOU: gravou e a resposta se perdeu" });
  return sucesso({ resultado });
}

/**
 * Estado real do voto (verificação depois de erro de rede e "Seu voto atual" do jurado). Só obedece
 * `simularErroRede`: não consome a falha pontual do envio (D8). `candidatoAtualId` só para jurado com voto.
 */
export async function consultarEstadoVoto(e: { eventoId: string }): Promise<Resultado<{ votou: boolean; candidatoAtualId: string | null }>> {
  await atraso();
  const erro = simularFalha({ consumirPontual: false });
  if (erro) return erro;
  const { estado } = lerAmbiente();
  const usuarioId = estado.sessao.usuarioId;
  if (!usuarioId) return falha("NAO_AUTORIZADO", { detalhe: "sem sessão" });
  if (!acharEvento(estado, e.eventoId)) return falha("NAO_ENCONTRADO", { detalhe: `evento ${e.eventoId} não existe` });
  const participacao = estado.banco.participacoes.find((p) => p.usuarioId === usuarioId && p.eventoId === e.eventoId);
  if (!participacao || participacao.papel === "ADMIN") return sucesso({ votou: false, candidatoAtualId: null });
  const candidatoAtualId =
    participacao.papel === "JURADO"
      ? (estado.banco.votosJuri.find((v) => v.participacaoId === participacao.id && v.eventoId === e.eventoId)?.candidatoId ?? null)
      : null;
  return sucesso({ votou: participacao.votou, candidatoAtualId });
}
