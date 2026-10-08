import type { Banco, EstadoApp } from "@/dominio/tipos";
import { criarEstadoNucleo } from "../criarEstadoNucleo";
import { ehUsuarioVolume } from "./gerarVolume";

// Etapa 7 (seção 5.12, passo 1): remove todas as entidades do evento (usuários gerados, participações,
// convites, votos, histórico, critérios, notas e escolhas do júri, votos infantis, auditoria e resultados) e reinsere as do núcleo do seed,
// sem tocar no outro evento, na sessão, em `ui` nem em `dev` (salvo os vínculos de voto do evento).
// As sequências passam a ser o maior id presente: aplicar duas vezes dá o mesmo estado.

function maior(ids: number[]): number {
  return ids.reduce((m, id) => Math.max(m, id), 0);
}

export function restaurarNucleo(estado: EstadoApp, eventoId: string): EstadoApp {
  const nucleo = criarEstadoNucleo();
  const n = nucleo.banco;
  const atual = estado.banco;
  const fora = <T extends { eventoId: string | null }>(lista: T[]) => lista.filter((x) => x.eventoId !== eventoId);
  const doEvento = <T extends { eventoId: string | null }>(lista: T[]) => lista.filter((x) => x.eventoId === eventoId);

  const votosJuriRemovidos = new Set(atual.votosJuri.filter((v) => v.eventoId === eventoId).map((v) => v.id));
  const votosJuriNucleo = doEvento(n.votosJuri);
  const idsJuriNucleo = new Set(votosJuriNucleo.map((v) => v.id));
  const participacoes = [...fora(atual.participacoes), ...doEvento(n.participacoes)];
  const comParticipacao = new Set(participacoes.map((p) => p.usuarioId));
  const usuarios = atual.usuarios.filter((u) => !ehUsuarioVolume(u.id) || comParticipacao.has(u.id));
  for (const u of n.usuarios) if (!usuarios.some((x) => x.id === u.id)) usuarios.push(u);

  const banco: Banco = {
    ...atual,
    eventos: atual.eventos.map((e) => (e.id === eventoId ? (n.eventos.find((x) => x.id === eventoId) ?? e) : e)),
    temas: [...fora(atual.temas), ...doEvento(n.temas)],
    configsPlacar: [...fora(atual.configsPlacar), ...doEvento(n.configsPlacar)],
    configsApresentacao: [...fora(atual.configsApresentacao), ...doEvento(n.configsApresentacao)],
    camposCandidato: [...fora(atual.camposCandidato), ...doEvento(n.camposCandidato)],
    candidatos: [...fora(atual.candidatos), ...doEvento(n.candidatos)],
    usuarios,
    participacoes,
    convitesJurado: [...fora(atual.convitesJurado), ...doEvento(n.convitesJurado)],
    votos: [...fora(atual.votos), ...doEvento(n.votos)],
    votosJuri: [...fora(atual.votosJuri), ...votosJuriNucleo],
    historicoVotosJuri: [
      ...atual.historicoVotosJuri.filter((h) => !votosJuriRemovidos.has(h.votoJuriId)),
      ...n.historicoVotosJuri.filter((h) => idsJuriNucleo.has(h.votoJuriId)),
    ],
    criteriosJuri: [...fora(atual.criteriosJuri), ...doEvento(n.criteriosJuri)],
    notasJuri: [...fora(atual.notasJuri), ...doEvento(n.notasJuri)],
    escolhasCriterioJuri: [...fora(atual.escolhasCriterioJuri), ...doEvento(n.escolhasCriterioJuri)],
    dispositivos: [...fora(atual.dispositivos), ...doEvento(n.dispositivos)],
    votosInfantis: fora(atual.votosInfantis),
    resultados: fora(atual.resultados),
    auditoria: [...fora(atual.auditoria), ...doEvento(n.auditoria)],
    sequencias: atual.sequencias,
  };
  // Nunca abaixo das sequências do núcleo: os ids do núcleo ficam reservados mesmo quando removidos.
  banco.sequencias = {
    voto: Math.max(n.sequencias.voto, maior(banco.votos.map((v) => v.id))),
    historicoVotoJuri: Math.max(n.sequencias.historicoVotoJuri, maior(banco.historicoVotosJuri.map((h) => h.id))),
    votoInfantil: Math.max(n.sequencias.votoInfantil, maior(banco.votosInfantis.map((v) => v.id))),
    auditoria: Math.max(n.sequencias.auditoria, maior(banco.auditoria.map((a) => a.id))),
  };

  const sufixo = `:${eventoId}`;
  const vinculos = Object.entries(estado.dev.vinculosVoto).filter(([k]) => !k.endsWith(sufixo));
  for (const [k, v] of Object.entries(nucleo.dev.vinculosVoto)) if (k.endsWith(sufixo)) vinculos.push([k, v]);
  return { ...estado, banco, dev: { ...estado.dev, vinculosVoto: Object.fromEntries(vinculos) } };
}
