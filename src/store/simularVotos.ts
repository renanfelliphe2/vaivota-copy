import { aplicarVotoPopular } from "@/dominio/aplicarVoto";
import { votaveis } from "@/dominio/candidatos";
import type { EstadoApp } from "@/dominio/tipos";
import { criarGerador, hashDeTexto } from "@/lib/aleatorio";
import { MINUTO, paraInstante } from "@/lib/tempo";
import { criarUsuarioVolume, proximoNumeroUsuarioVolume, semVinculosDeVolume } from "@/mocks/volume/gerarVolume";

// Etapa 7 (D12): votos simulados. Por voto: usuário gerado, depois a participação PUBLICO (antes do voto,
// C2) e só então o Voto por aplicarVotoPopular (que não cria participação). Invariante 3 preservada.

/** Intervalo do SimuladorVotos (3 s). */
export const INTERVALO_SIMULADOR_MS = 3000;

/** Quantidade determinística por ciclo: 1 a 3. */
export function quantidadeDoCiclo(sequenciaVoto: number): number {
  return 1 + (hashDeTexto(`ciclo:${sequenciaVoto}`) % 3);
}

/** Pura. Só com a urna ABERTA e candidatos votáveis; senão devolve o mesmo estado. */
export function criarVotosSimulados(estado: EstadoApp, eventoId: string, quantidade: number, agoraMs: number): EstadoApp {
  const evento = estado.banco.eventos.find((e) => e.id === eventoId);
  if (!evento || evento.estadoUrna !== "ABERTA" || quantidade <= 0) return estado;
  const opcoes = votaveis(estado.banco.candidatos.filter((c) => c.eventoId === eventoId));
  if (opcoes.length === 0) return estado;
  const rng = criarGerador(hashDeTexto(`simulador:${eventoId}:${estado.banco.sequencias.voto}`));
  let proximo = estado;
  let numero = proximoNumeroUsuarioVolume(estado.banco.usuarios);
  for (let i = 0; i < quantidade; i++, numero++) {
    // Peso maior para os primeiros da ordem: a classificação simulada não fica plana.
    const indice = Math.min(opcoes.length - 1, Math.floor(rng() ** 1.6 * opcoes.length));
    const usuario = criarUsuarioVolume(numero, rng, paraInstante(agoraMs - MINUTO, evento.fusoHorario));
    proximo = {
      ...proximo,
      banco: {
        ...proximo.banco,
        usuarios: [...proximo.banco.usuarios, usuario],
        participacoes: [
          ...proximo.banco.participacoes,
          { id: `par-v-${usuario.id.slice("usr-v-".length)}`, usuarioId: usuario.id, eventoId, papel: "PUBLICO", votou: false },
        ],
      },
    };
    proximo = aplicarVotoPopular(proximo, { eventoId, usuarioId: usuario.id, candidatoId: opcoes[indice].id, agoraMs });
  }
  return semVinculosDeVolume(proximo);
}
