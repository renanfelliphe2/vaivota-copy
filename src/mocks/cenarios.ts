import { votaveis } from "@/dominio/candidatos";
import type { Candidato, EstadoApp, Evento, MetodoIdentificacao } from "@/dominio/tipos";
import { CENARIOS_CONFIGURACAO } from "./cenarios/configuracao";
import { CENARIOS_FESTIVAL_APRESENTACAO } from "./cenarios/festivalApresentacao";
import { CENARIOS_RESULTADO } from "./cenarios/resultado";
import { criarEstadoInicial } from "./criarEstadoInicial";
import { ID_FESTIVAL } from "./seed";

// Registro de cenários (Etapa 0, seção 5.8). Cada etapa registra os seus; a Etapa 9 consolida.

export type ContextoCenario = {
  /** Evento ativo (o da rota ou dev.slugPadrao): alvo dos cenários que mexem em um evento só. */
  eventoId: string;
  /** Instante do relógio simulado (Etapa 6: janelas e transições forçadas pelos cenários de estado). */
  agoraMs: number;
};

export type Cenario = {
  id: string;
  nome: string;
  grupo: "DADOS" | "ESTADO" | "RESULTADO";
  descricao: string;
  /** Pura; a toolbar troca o estado pelo retorno. */
  aplicar: (atual: EstadoApp, contexto: ContextoCenario) => EstadoApp;
};

function alterarEventos(atual: EstadoApp, alterar: (e: Evento) => Evento): EstadoApp {
  return { ...atual, banco: { ...atual.banco, eventos: atual.banco.eventos.map(alterar) } };
}

function metodoNoEventoAtivo(metodo: MetodoIdentificacao) {
  return (atual: EstadoApp, { eventoId }: ContextoCenario) =>
    alterarEventos(atual, (e) => (e.id === eventoId ? { ...e, metodoIdentificacao: metodo } : e));
}

const META_MUITOS_CANDIDATOS = 24;

function siglaDoEvento(eventoId: string): string {
  if (eventoId === ID_FESTIVAL) return "fv";
  return eventoId.replace(/^evt-/, "");
}

/**
 * Etapa 4: completa o evento ativo até 24 votáveis com candidatos sintéticos (`cand-fv-m01`...), publicados,
 * com imagem e campos extras. Idempotente e sem alterar ids nem fatos do seed.
 */
function completarCandidatos(atual: EstadoApp, { eventoId }: ContextoCenario): EstadoApp {
  const evento = atual.banco.eventos.find((e) => e.id === eventoId);
  const tema = atual.banco.temas.find((t) => t.eventoId === eventoId);
  if (!evento || !tema) return atual;
  const doEvento = atual.banco.candidatos.filter((c) => c.eventoId === eventoId);
  const faltam = META_MUITOS_CANDIDATOS - votaveis(doEvento).length;
  if (faltam <= 0) return atual;

  const campos = atual.banco.camposCandidato.filter((c) => c.eventoId === eventoId);
  const ids = new Set(atual.banco.candidatos.map((c) => c.id));
  let ordem = Math.max(0, ...doEvento.map((c) => c.ordem));
  const novos: Candidato[] = [];
  for (let n = 1; novos.length < faltam; n++) {
    const nn = String(n).padStart(2, "0");
    const id = `cand-${siglaDoEvento(eventoId)}-m${nn}`;
    if (ids.has(id)) continue;
    ordem += 1;
    novos.push({
      id,
      eventoId,
      titulo: `${tema.rotuloCandidato} ${nn}`,
      descricao: `Descrição curta de exemplo número ${nn}.`,
      imagemUrl: `placeholder:${((n - 1) % 8) + 1}`,
      publicado: true,
      desqualificado: false,
      ordem,
      camposExtras: Object.fromEntries(campos.map((c) => [c.chave, `${c.rotulo} ${nn}`])),
      usuarioVinculadoId: null,
      criadoEm: evento.criadoEm,
      atualizadoEm: evento.criadoEm,
    });
  }
  return { ...atual, banco: { ...atual.banco, candidatos: [...atual.banco.candidatos, ...novos] } };
}

export const CENARIOS: Cenario[] = [
  // Etapa 0
  {
    id: "PADRAO",
    nome: "Padrão",
    grupo: "DADOS",
    descricao: "Seed inicial do Festival, sem votos (o mesmo que o F5).",
    aplicar: (atual) => {
      const inicial = criarEstadoInicial();
      // Mantém só as preferências da toolbar para ela não "pular" ao aplicar.
      return {
        ...inicial,
        dev: {
          ...inicial.dev,
          slugPadrao: atual.dev.slugPadrao,
          toolbarModo: atual.dev.toolbarModo,
          toolbarRecolhida: atual.dev.toolbarRecolhida,
          toolbarAvancadas: atual.dev.toolbarAvancadas,
        },
      };
    },
  },
  // Etapa 1
  {
    id: "SEM_ENCERRAMENTO_AUTOMATICO",
    nome: "Sem encerramento automático",
    grupo: "ESTADO",
    descricao: "encerramentoAutomatico desligado; com o relógio no fim da janela, aparece \"Tempo esgotado\".",
    aplicar: (atual) => alterarEventos(atual, (e) => ({ ...e, encerramentoAutomatico: false })),
  },
  // Etapa 2
  {
    id: "SEM_CANDIDATOS",
    nome: "Sem candidatos",
    grupo: "DADOS",
    descricao: "Todos os candidatos do evento ativo ficam não publicados (nenhum votável).",
    aplicar: (atual, { eventoId }) => ({
      ...atual,
      banco: {
        ...atual.banco,
        candidatos: atual.banco.candidatos.map((c) => (c.eventoId === eventoId ? { ...c, publicado: false } : c)),
      },
    }),
  },
  // Etapa 3
  {
    id: "SOMENTE_GOOGLE",
    nome: "Somente Google",
    grupo: "ESTADO",
    descricao: "metodoIdentificacao = SOMENTE_GOOGLE no evento ativo (some o login por e-mail).",
    aplicar: metodoNoEventoAtivo("SOMENTE_GOOGLE"),
  },
  {
    id: "SOMENTE_EMAIL",
    nome: "Somente e-mail",
    grupo: "ESTADO",
    descricao: "metodoIdentificacao = SOMENTE_EMAIL no evento ativo (some o botão Google).",
    aplicar: metodoNoEventoAtivo("SOMENTE_EMAIL"),
  },
  // Etapa 4
  {
    id: "MUITOS_CANDIDATOS",
    nome: "Muitos candidatos (24)",
    grupo: "DADOS",
    descricao: "Completa o evento ativo até 24 votáveis com itens sintéticos, todos com imagem. Idempotente.",
    aplicar: completarCandidatos,
  },
  // Etapa 6
  ...CENARIOS_CONFIGURACAO,
  // Etapa 7 (D11: os RESULTADO_* são registrados aqui; a Etapa 8 só consome)
  ...CENARIOS_RESULTADO,
  // Etapa 8 (D20: três do Festival; não registra de novo os RESULTADO_*)
  ...CENARIOS_FESTIVAL_APRESENTACAO,
];
