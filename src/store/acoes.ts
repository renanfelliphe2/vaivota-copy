import { aplicarAvaliacaoJuri, criteriosDoEvento, ehModoPorCriterio } from "@/dominio/avaliacaoJuri";
import { redistribuirPesos } from "@/dominio/placar";
import { exigirAcao } from "@/dominio/travas";
import type { EstadoApp, EstadoDev, EstadoEvento, EstadoUrna, ModoFalha, ModoVotoJuri, ToolbarModo } from "@/dominio/tipos";
import { paraInstante } from "@/lib/tempo";
import { CENARIOS } from "@/mocks/cenarios";
import { criarApresentacaoInicial } from "./estadoInicial";
import { criarEstadoInicial } from "@/mocks/criarEstadoInicial";
import { obterAmbiente } from "./ambiente";
import { forcarEstadoEvento as forcarEvento, forcarEstadoUrna as forcarUrna } from "./transicoes";

// Ações síncronas do protótipo (toolbar e utilidades). Escrita de tela sempre passa por servicos/.

export { registrarAuditoria } from "./auditoria";
export type { EntradaAuditoria } from "./auditoria";

function atualizar(receita: (e: EstadoApp) => EstadoApp): void {
  obterAmbiente().store.atualizar(receita);
}

function contexto() {
  const { store, relogio } = obterAmbiente();
  return { agoraMs: relogio.getAgora(), usuarioId: store.getState().sessao.usuarioId };
}

function alterarDev(mudanca: Partial<EstadoDev>): void {
  atualizar((e) => ({ ...e, dev: { ...e.dev, ...mudanca } }));
}

/** Volta ao seed, inclusive sessão, relógio e ui.apresentacao. Mantém só a visibilidade da toolbar. */
export function resetarMock(): void {
  const { relogio } = obterAmbiente();
  atualizar((atual) => {
    const inicial = criarEstadoInicial();
    return {
      ...inicial,
      dev: {
        ...inicial.dev,
        toolbarModo: atual.dev.toolbarModo,
        toolbarRecolhida: atual.dev.toolbarRecolhida,
        toolbarAvancadas: atual.dev.toolbarAvancadas,
      },
    };
  });
  relogio.reiniciar();
  if (relogio.getPausado()) relogio.retomar();
}

export function listarCenarios() {
  return CENARIOS.map(({ id, nome, grupo, descricao }) => ({ id, nome, grupo, descricao }));
}

/** Aplica um cenário registrado sobre o evento ativo; zera ui.apresentacao. */
export function aplicarCenario(cenarioId: string, eventoId: string): void {
  const cenario = CENARIOS.find((c) => c.id === cenarioId);
  if (!cenario) return;
  const { agoraMs } = contexto();
  atualizar((atual) => {
    const proximo = cenario.aplicar(atual, { eventoId, agoraMs });
    return { ...proximo, ui: { ...proximo.ui, apresentacao: criarApresentacaoInicial(), dashboard: { resultadoVisivel: null } } };
  });
}

export function definirSlugPadrao(slug: string): void {
  alterarDev({ slugPadrao: slug });
}

export function forcarEstadoEvento(eventoId: string, alvo: EstadoEvento): void {
  const ctx = contexto();
  atualizar((e) => forcarEvento(e, eventoId, alvo, ctx));
}

export function forcarEstadoUrna(eventoId: string, alvo: EstadoUrna): void {
  const ctx = contexto();
  atualizar((e) => forcarUrna(e, eventoId, alvo, ctx));
}

/** "Entrar como" da toolbar: troca a sessão na hora (sem latência) e descarta login pendente. */
export function forcarSessao(usuarioId: string | null): void {
  atualizar((e) => ({ ...e, sessao: { usuarioId }, ui: { ...e.ui, loginPendente: null } }));
}

/** Liga/desliga o e-mail verificado do usuário da sessão. */
export function alternarEmailVerificado(): void {
  const { agoraMs } = contexto();
  atualizar((e) => {
    const id = e.sessao.usuarioId;
    if (!id) return e;
    return {
      ...e,
      banco: {
        ...e.banco,
        usuarios: e.banco.usuarios.map((u) =>
          u.id === id
            ? { ...u, emailVerificadoEm: u.emailVerificadoEm ? null : paraInstante(agoraMs) }
            : u,
        ),
      },
    };
  });
}

/**
 * Liga/desliga um módulo. Ao desligar, zera o peso do grupo e redistribui o restante (soma 100);
 * ao ligar, o peso fica 0 e o admin ajusta na Etapa 6.
 * Errata da Etapa 6 (D24, rev. 3 E32): desligar o júri com convite USADO é recusado; devolve o motivo
 * (null quando a troca foi feita).
 */
export function alternarModulo(eventoId: string, modulo: "JURI" | "INFANTIL"): string | null {
  const estado = obterAmbiente().store.getState();
  const alvo = estado.banco.eventos.find((ev) => ev.id === eventoId);
  if (alvo && modulo === "JURI" && alvo.moduloJuri) {
    const conviteUsado = estado.banco.convitesJurado.some((c) => c.eventoId === eventoId && c.estado === "USADO");
    const permitido = exigirAcao(alvo, "MODULO_JURI_DESLIGAR", { conviteUsado });
    if (!permitido.ok) return permitido.erro.mensagem;
  }
  atualizar((e) => {
    const evento = e.banco.eventos.find((ev) => ev.id === eventoId);
    const placar = e.banco.configsPlacar.find((c) => c.eventoId === eventoId);
    if (!evento || !placar) return e;
    const campo = modulo === "JURI" ? "moduloJuri" : "moduloInfantil";
    const ligado = !evento[campo];
    const ligados = {
      POPULAR: true,
      JURI: modulo === "JURI" ? ligado : evento.moduloJuri,
      INFANTIL: modulo === "INFANTIL" ? ligado : evento.moduloInfantil,
    };
    const pesos = redistribuirPesos(
      { POPULAR: placar.pesoPopular, JURI: placar.pesoJuri, INFANTIL: placar.pesoInfantil },
      ligados,
    );
    return {
      ...e,
      banco: {
        ...e.banco,
        eventos: e.banco.eventos.map((ev) => (ev.id === eventoId ? { ...ev, [campo]: ligado } : ev)),
        configsPlacar: e.banco.configsPlacar.map((c) =>
          c.eventoId === eventoId
            ? { ...c, pesoPopular: pesos.POPULAR, pesoJuri: pesos.JURI, pesoInfantil: pesos.INFANTIL }
            : c,
        ),
      },
    };
  });
  return null;
}

/** Critérios usados pela toolbar quando o evento não tem nenhum (documento de requisitos do Festival, §3.3). */
const CRITERIOS_PADRAO = ["Direção", "Roteiro", "Fotografia", "Som"];

/**
 * Modo de votação do júri pela toolbar (08/10/2026, demonstração): ignora a trava da urna aberta e não audita.
 * Num modo por critério sem critérios, cria os padrão. Notas e escolhas de outros modos ficam guardadas.
 */
export function definirModoVotoJuri(eventoId: string, modo: ModoVotoJuri): void {
  const { agoraMs } = contexto();
  atualizar((e) => {
    const evento = e.banco.eventos.find((ev) => ev.id === eventoId);
    if (!evento) return e;
    const atuais = criteriosDoEvento(e.banco, eventoId).map((c) => ({ id: c.id, nome: c.nome }));
    const criterios = atuais.length === 0 && ehModoPorCriterio(modo) ? CRITERIOS_PADRAO.map((nome) => ({ id: null, nome })) : atuais;
    return aplicarAvaliacaoJuri(e, eventoId, { modoVotoJuri: modo, criterios }, paraInstante(agoraMs, evento.fusoHorario));
  });
}

export function definirLatencia(latenciaMs: EstadoDev["latenciaMs"]): void {
  alterarDev({ latenciaMs });
}

export function definirErroRede(simularErroRede: boolean): void {
  alterarDev({ simularErroRede });
}

export function definirFalhaProxima(falhaProxima: ModoFalha): void {
  alterarDev({ falhaProxima });
}

export function definirToolbarModo(toolbarModo: ToolbarModo): void {
  alterarDev({ toolbarModo });
}

export function definirToolbarRecolhida(toolbarRecolhida: boolean): void {
  alterarDev({ toolbarRecolhida });
}

export function definirToolbarAvancadas(toolbarAvancadas: boolean): void {
  alterarDev({ toolbarAvancadas });
}
