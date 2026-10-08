import { aplicarVotoInfantil, aplicarVotoJuri, aplicarVotoPopular } from "@/dominio/aplicarVoto";
import { aplicarEscolhasJuri, aplicarNotasJuri, criteriosDoEvento, modoVotoJuriDoEvento } from "@/dominio/avaliacaoJuri";
import { votaveis } from "@/dominio/candidatos";
import type { Candidato, EstadoApp, Grupo } from "@/dominio/tipos";
import { criarGerador, hashDeTexto, type Gerador } from "@/lib/aleatorio";
import { MINUTO, paraInstante } from "@/lib/tempo";
import { criarUsuarioVolume, proximoNumeroUsuarioVolume, semVinculosDeVolume } from "@/mocks/volume/gerarVolume";

// Etapa 7 (D12): votos simulados. Por voto: usuário gerado, depois a participação PUBLICO (antes do voto,
// C2) e só então o Voto por aplicarVotoPopular (que não cria participação). Invariante 3 preservada.
// 08/10/2026: também júri (um jurado gerado por voto, no modo do júri do evento) e infantil (no primeiro totem ativo),
// cada tipo com quantidade e intervalo próprios (dev.simuladorVotos).

/** Intervalos oferecidos na toolbar (ms). */
export const INTERVALOS_SIMULADOR_MS = [500, 1000, 2000, 3000, 5000, 10000] as const;
export const MAX_VOTOS_POR_CICLO = 50;

type Contexto = { eventoId: string; opcoes: Candidato[]; rng: Gerador; fuso: string };

/** Urna ABERTA e candidatos votáveis; senão null. */
function contexto(estado: EstadoApp, eventoId: string, semente: string): Contexto | null {
  const evento = estado.banco.eventos.find((e) => e.id === eventoId);
  if (!evento || evento.estadoUrna !== "ABERTA") return null;
  const opcoes = votaveis(estado.banco.candidatos.filter((c) => c.eventoId === eventoId));
  if (opcoes.length === 0) return null;
  return { eventoId, opcoes, rng: criarGerador(hashDeTexto(`${semente}:${eventoId}`)), fuso: evento.fusoHorario };
}

/** Peso maior para os primeiros da ordem: a classificação simulada não fica plana. */
function sortear({ opcoes, rng }: Contexto): Candidato {
  return opcoes[Math.min(opcoes.length - 1, Math.floor(rng() ** 1.6 * opcoes.length))];
}

/** Usuário gerado + participação do papel, sem voto ainda. */
function novaPessoa(estado: EstadoApp, ctx: Contexto, papel: "PUBLICO" | "JURADO", agoraMs: number) {
  const usuario = criarUsuarioVolume(proximoNumeroUsuarioVolume(estado.banco.usuarios), ctx.rng, paraInstante(agoraMs - MINUTO, ctx.fuso));
  const participacaoId = `par-v-${usuario.id.slice("usr-v-".length)}`;
  const proximo: EstadoApp = {
    ...estado,
    banco: {
      ...estado.banco,
      usuarios: [...estado.banco.usuarios, usuario],
      participacoes: [...estado.banco.participacoes, { id: participacaoId, usuarioId: usuario.id, eventoId: ctx.eventoId, papel, votou: false }],
    },
  };
  return { estado: proximo, usuarioId: usuario.id, participacaoId };
}

/** Pura. Só com a urna ABERTA e candidatos votáveis; senão devolve o mesmo estado. */
export function criarVotosSimulados(estado: EstadoApp, eventoId: string, quantidade: number, agoraMs: number): EstadoApp {
  const ctx = contexto(estado, eventoId, `simulador:${estado.banco.sequencias.voto}`);
  if (!ctx || quantidade <= 0) return estado;
  let proximo = estado;
  for (let i = 0; i < quantidade; i++) {
    const pessoa = novaPessoa(proximo, ctx, "PUBLICO", agoraMs);
    proximo = aplicarVotoPopular(pessoa.estado, { eventoId, usuarioId: pessoa.usuarioId, candidatoId: sortear(ctx).id, agoraMs });
  }
  return semVinculosDeVolume(proximo);
}

/** Pura. Cada voto é um jurado gerado, votando no modo do júri do evento (voto único, notas ou melhor por critério). */
export function criarVotosJuriSimulados(estado: EstadoApp, eventoId: string, quantidade: number, agoraMs: number): EstadoApp {
  const evento = estado.banco.eventos.find((e) => e.id === eventoId);
  const ctx = contexto(estado, eventoId, `simulador-juri:${estado.banco.participacoes.length}`);
  if (!evento?.moduloJuri || !ctx || quantidade <= 0) return estado;
  const modo = modoVotoJuriDoEvento(estado.banco, eventoId);
  const criterios = criteriosDoEvento(estado.banco, eventoId);
  if (modo !== "VOTO_UNICO" && criterios.length === 0) return estado;
  let proximo = estado;
  for (let i = 0; i < quantidade; i++) {
    const pessoa = novaPessoa(proximo, ctx, "JURADO", agoraMs);
    proximo = pessoa.estado;
    const { participacaoId } = pessoa;
    if (modo === "VOTO_UNICO") {
      proximo = aplicarVotoJuri(proximo, { eventoId, usuarioId: pessoa.usuarioId, candidatoId: sortear(ctx).id, agoraMs });
    } else if (modo === "NOTAS_POR_CRITERIO") {
      // Notas inteiras de 0 a 10, um pouco maiores para os primeiros da ordem.
      ctx.opcoes.forEach((c, k) => {
        const base = 9 - (k / ctx.opcoes.length) * 4;
        const notas = Object.fromEntries(criterios.map((cr) => [cr.id, Math.max(0, Math.min(10, Math.round(base - 3 + ctx.rng() * 4)))]));
        proximo = aplicarNotasJuri(proximo, { eventoId, participacaoId, candidatoId: c.id, notas, agoraMs });
      });
    } else {
      const porCandidato = new Map<string, string[]>();
      for (const cr of criterios) {
        const id = sortear(ctx).id;
        porCandidato.set(id, [...(porCandidato.get(id) ?? []), cr.id]);
      }
      for (const [candidatoId, criterioIds] of porCandidato)
        proximo = aplicarEscolhasJuri(proximo, { eventoId, participacaoId, candidatoId, criterioIds, agoraMs });
    }
  }
  return semVinculosDeVolume(proximo);
}

/** Pura. Votos no primeiro totem ATIVO do evento; sem módulo infantil ou sem totem ativo, devolve o mesmo estado. */
export function criarVotosInfantisSimulados(estado: EstadoApp, eventoId: string, quantidade: number, agoraMs: number): EstadoApp {
  const evento = estado.banco.eventos.find((e) => e.id === eventoId);
  const totem = estado.banco.dispositivos.find((d) => d.eventoId === eventoId && d.estado === "ATIVO");
  const ctx = contexto(estado, eventoId, `simulador-infantil:${estado.banco.sequencias.votoInfantil}`);
  if (!evento?.moduloInfantil || !totem || !ctx || quantidade <= 0) return estado;
  let proximo = estado;
  for (let i = 0; i < quantidade; i++)
    proximo = aplicarVotoInfantil(proximo, { eventoId, dispositivoId: totem.id, candidatoId: sortear(ctx).id, agoraMs });
  return proximo;
}

export const CRIAR_VOTOS_SIMULADOS: Record<Grupo, (estado: EstadoApp, eventoId: string, quantidade: number, agoraMs: number) => EstadoApp> = {
  POPULAR: criarVotosSimulados,
  JURI: criarVotosJuriSimulados,
  INFANTIL: criarVotosInfantisSimulados,
};
