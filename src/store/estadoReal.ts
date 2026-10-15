import type { EstadoPublico } from "@/dominio/estadoPublico";
import type { Banco, EstadoApp, EstadoDev, Usuario } from "@/dominio/tipos";
import { criarConfigSimuladorInicial, criarUiInicial } from "./estadoInicial";

// MVP Semana Tech (seção 3): o navegador guarda o MESMO `EstadoApp` do protótipo (as telas e os seletores não mudam), mas
// o `banco` agora só tem o estado público que o servidor entregou: eventos, temas, candidatos publicados, a própria
// pessoa e a própria participação. Votos, auditoria, resultados e e-mails de terceiros nunca chegam aqui.

function bancoVazio(): Banco {
  return {
    sequencias: { voto: 0, historicoVotoJuri: 0, votoInfantil: 0, auditoria: 0 },
    eventos: [],
    temas: [],
    configsPlacar: [],
    configsApresentacao: [],
    camposCandidato: [],
    candidatos: [],
    usuarios: [],
    participacoes: [],
    convitesJurado: [],
    votos: [],
    votosJuri: [],
    historicoVotosJuri: [],
    criteriosJuri: [],
    notasJuri: [],
    escolhasCriterioJuri: [],
    parceiros: [],
    dispositivos: [],
    votosInfantis: [],
    resultados: [],
    auditoria: [],
  };
}

function usuarioDoPerfil(u: NonNullable<EstadoPublico["usuario"]>, agora: string): Usuario {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    senhaHash: null, // a senha nunca sai do servidor
    emailVerificadoEm: u.emailVerificado ? agora : null,
    anonimizadoEm: null,
    criadoEm: agora,
    atualizadoEm: agora,
  };
}

/** `banco` e `sessao` a partir do que o servidor entregou. */
export function bancoDoServidor(publico: EstadoPublico): Pick<EstadoApp, "banco" | "sessao"> {
  const banco = bancoVazio();
  for (const e of publico.eventos) {
    banco.eventos.push(e.evento);
    banco.temas.push(e.tema);
    banco.configsPlacar.push(e.configPlacar);
    banco.configsApresentacao.push(e.configApresentacao);
    banco.camposCandidato.push(...e.camposCandidato);
    banco.candidatos.push(...e.candidatos);
    if (e.participacao) banco.participacoes.push(e.participacao);
  }
  if (publico.usuario) {
    const agora = publico.eventos[0]?.evento.atualizadoEm ?? new Date(publico.agoraMs).toISOString();
    banco.usuarios.push(usuarioDoPerfil(publico.usuario, agora));
  }
  return { banco, sessao: { usuarioId: publico.usuario?.id ?? null } };
}

/** Estado de desenvolvimento só existe para a toolbar do protótipo; aqui só `slugPadrao` (landing e fallback de rota) importa. */
function devDoServidor(publico: EstadoPublico): EstadoDev {
  return {
    slugPadrao: publico.eventos[0]?.evento.slug ?? "",
    latenciaMs: 0,
    simularErroRede: false,
    falhaProxima: "NENHUMA",
    simularVotosEntrando: false,
    simuladorVotos: criarConfigSimuladorInicial(),
    toolbarModo: "OCULTA",
    toolbarRecolhida: true,
    toolbarAvancadas: false,
    vinculosVoto: {},
    simularTrailerFalha: false,
  };
}

export function criarEstadoDoServidor(publico: EstadoPublico): EstadoApp {
  return { ...bancoDoServidor(publico), ui: criarUiInicial(), dev: devDoServidor(publico) };
}

/**
 * Aplica um estado novo do servidor preservando o estado de tela (`ui`: seleção do voto, aba, diálogo aberto) e a
 * referência das fatias que não mudaram, para a tela não redesenhar tudo a cada polling.
 */
export function aplicarEstadoDoServidor(atual: EstadoApp, publico: EstadoPublico): EstadoApp {
  const novo = bancoDoServidor(publico);
  const banco = { ...atual.banco } as Banco;
  for (const chave of Object.keys(novo.banco) as (keyof Banco)[]) {
    if (chave === "sequencias") continue;
    if (JSON.stringify(atual.banco[chave]) !== JSON.stringify(novo.banco[chave])) (banco as Record<string, unknown>)[chave] = novo.banco[chave];
  }
  const mudouBanco = (Object.keys(banco) as (keyof Banco)[]).some((k) => banco[k] !== atual.banco[k]);
  const sessao = atual.sessao.usuarioId === novo.sessao.usuarioId ? atual.sessao : novo.sessao;
  const slugPadrao = devDoServidor(publico).slugPadrao;
  const dev = atual.dev.slugPadrao === slugPadrao ? atual.dev : { ...atual.dev, slugPadrao };
  if (!mudouBanco && sessao === atual.sessao && dev === atual.dev) return atual;
  return { ...atual, banco: mudouBanco ? banco : atual.banco, sessao, dev };
}
