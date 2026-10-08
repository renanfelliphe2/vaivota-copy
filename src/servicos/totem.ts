import { aplicarVotoInfantil } from "@/dominio/aplicarVoto";
import { votaveis } from "@/dominio/candidatos";
import { pinConfere } from "@/dominio/totem";
import { acharEvento, iniciarServico, lerAmbiente } from "./apoio";
import { falha, sucesso, type Resultado } from "./resultado";

// Totem (rev. 4, A7; Base/VotoInfantil.md §9 e §10): imita o servidor. O totem não tem sessão: a identidade
// é o dispositivo pareado. Valida tudo antes de gravar e grava com um único `atualizar`.
// Nunca audita a escolha (só pareamento, pausa, revogação e PIN são auditáveis; nenhum deles tem tela ainda).

type EntradaVotoInfantil = { eventoId: string; dispositivoId: string; candidatoId: string };

export async function votarInfantil(entrada: EntradaVotoInfantil): Promise<Resultado<{ resultado: "REGISTRADO" }>> {
  const erro = await iniciarServico();
  if (erro) return erro;
  const { estado, agoraMs, store } = lerAmbiente();

  const evento = acharEvento(estado, entrada.eventoId);
  if (!evento) return falha("NAO_ENCONTRADO", { detalhe: `evento ${entrada.eventoId} não existe` });
  const dispositivo = estado.banco.dispositivos.find((d) => d.id === entrada.dispositivoId);
  if (!dispositivo || dispositivo.eventoId !== evento.id)
    return falha("DISPOSITIVO_INATIVO", { detalhe: `dispositivo ${entrada.dispositivoId} não pareado com ${evento.id}` });
  if (dispositivo.estado !== "ATIVO")
    return falha("DISPOSITIVO_INATIVO", { detalhe: `dispositivo ${dispositivo.id} ${dispositivo.estado}` });
  if (evento.estado === "CONCLUIDO") return falha("EVENTO_CONCLUIDO");
  if (evento.estado === "RASCUNHO" || !evento.moduloInfantil)
    return falha("EVENTO_INDISPONIVEL", { detalhe: `evento ${evento.estado}, módulo infantil ${evento.moduloInfantil}` });
  if (evento.estadoUrna === "NAO_INICIADA") return falha("URNA_NAO_ABERTA");
  if (evento.estadoUrna === "ENCERRADA") return falha("URNA_ENCERRADA");
  const candidato = votaveis(estado.banco.candidatos.filter((c) => c.eventoId === evento.id)).find((c) => c.id === entrada.candidatoId);
  if (!candidato) return falha("CANDIDATO_INDISPONIVEL", { detalhe: `candidato ${entrada.candidatoId} não votável em ${evento.id}` });

  store.atualizar((e) => aplicarVotoInfantil(e, { eventoId: evento.id, dispositivoId: dispositivo.id, candidatoId: candidato.id, agoraMs }));
  return sucesso({ resultado: "REGISTRADO" });
}

/** Saída do modo quiosque (§6): só com o PIN do totem. Só obedece a `simularErroRede`. */
export async function conferirPinTotem(entrada: { dispositivoId: string; pin: string }): Promise<Resultado<null>> {
  const erro = await iniciarServico({ leitura: true });
  if (erro) return erro;
  const { estado } = lerAmbiente();
  const dispositivo = estado.banco.dispositivos.find((d) => d.id === entrada.dispositivoId);
  // Sem aparelho pareado não há quiosque a proteger.
  if (!dispositivo) return sucesso(null);
  if (!pinConfere(dispositivo, entrada.pin))
    return falha("CREDENCIAIS_INVALIDAS", { mensagem: "PIN incorreto.", detalhe: `PIN errado em ${dispositivo.id}` });
  return sucesso(null);
}
