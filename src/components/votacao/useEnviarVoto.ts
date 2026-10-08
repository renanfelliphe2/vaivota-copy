"use client";

import { useRef } from "react";
import type { PapelVoto } from "@/dominio/estadoVotar";
import type { EstadoUiVotacao, ResultadoEnvioVoto } from "@/dominio/tipos";
import { useAnunciar } from "@/components/a11y/LiveRegion";
import type { CodigoErro } from "@/servicos/resultado";
import { consultarEstadoVoto, votarJuri, votarPopular } from "@/servicos/votacao";
import { concluirEnvio, iniciarEnvio } from "@/store/acoesVotacao";
import { useLerEstado } from "@/store/seletores/dev";

type Mudanca = Partial<Omit<EstadoUiVotacao, "chave">>;

const NAO_REGISTRADO: CodigoErro[] = [
  "URNA_NAO_ABERTA",
  "URNA_ENCERRADA",
  "EVENTO_CONCLUIDO",
  "EVENTO_INDISPONIVEL",
  "PAPEL_INVALIDO",
  "EMAIL_NAO_VERIFICADO",
  "NAO_AUTORIZADO",
];

/** Tabela 5.6 (linhas que não são REDE nem ok): um único `concluirEnvio`. */
function mudancaDoErro(codigo: CodigoErro): Mudanca {
  if (codigo === "CANDIDATO_INDISPONIVEL") return { envio: "OCIOSO", aviso: "ESCOLHA_INDISPONIVEL", selecaoId: null };
  if (codigo === "VOTO_PROPRIO") return { envio: "OCIOSO", aviso: "VOTO_PROPRIO", selecaoId: null };
  if (codigo === "JA_VOTOU") return { envio: "OCIOSO", aviso: "JA_VOTOU_ANTES", selecaoId: null };
  if (NAO_REGISTRADO.includes(codigo)) return { envio: "OCIOSO", aviso: "NAO_REGISTRADO", selecaoId: null };
  return { envio: "OCIOSO", falhaEnvio: "ERRO_INTERNO" };
}

/**
 * Envio do voto (Etapa 5, seção 5.6): trava síncrona, mapeamento do resultado e verificação depois de erro
 * de rede (D9: nunca libera novo envio sem consultar o estado real).
 */
export function useEnviarVoto(eventoId: string, papelVoto: PapelVoto, aoConcluir: () => void) {
  const lerEstado = useLerEstado();
  const anunciar = useAnunciar();
  // Escritos e lidos só em manipuladores (React Compiler).
  const envioAtual = useRef<{ candidatoId: string; jaVotouAntes: boolean } | null>(null);

  function sucesso(candidatoId: string, resultado: ResultadoEnvioVoto) {
    concluirEnvio(eventoId, { envio: "OCIOSO", falhaEnvio: null, aviso: null, selecaoId: null, ultimoVoto: { candidatoId, resultado } });
    anunciar(resultado === "ATUALIZADO" ? "Seu voto foi atualizado." : "Seu voto foi registrado.");
    aoConcluir();
  }

  /** O envio desta montagem ou, se a tela remontou, a escolha que ficou em `ui.votacao`. */
  function envioPendente() {
    if (envioAtual.current) return envioAtual.current;
    const selecaoId = lerEstado().ui.votacao.selecaoId;
    return selecaoId ? { candidatoId: selecaoId, jaVotouAntes: false } : null;
  }

  async function verificar() {
    const pendente = envioPendente();
    if (!pendente) {
      concluirEnvio(eventoId, { envio: "OCIOSO" });
      return;
    }
    const r = await consultarEstadoVoto({ eventoId });
    if (!r.ok) {
      concluirEnvio(eventoId, { envio: "OCIOSO", falhaEnvio: "NAO_CONFIRMADO" });
      anunciar("Não foi possível confirmar se seu voto foi registrado.", "assertive");
      return;
    }
    const gravou = papelVoto === "JURADO" ? r.dados.candidatoAtualId === pendente.candidatoId : r.dados.votou;
    if (gravou) {
      sucesso(pendente.candidatoId, pendente.jaVotouAntes ? "ATUALIZADO" : "REGISTRADO");
    } else {
      concluirEnvio(eventoId, { envio: "OCIOSO", falhaEnvio: "REDE" });
      anunciar("Seu voto ainda não foi registrado.", "assertive");
    }
  }

  async function enviar(candidatoId: string) {
    if (!iniciarEnvio(eventoId)) return; // duplo clique: uma chamada só
    const estado = lerEstado();
    const participacao = estado.banco.participacoes.find((p) => p.usuarioId === estado.sessao.usuarioId && p.eventoId === eventoId);
    envioAtual.current = { candidatoId, jaVotouAntes: participacao?.votou ?? false };

    const r = papelVoto === "JURADO" ? await votarJuri({ eventoId, candidatoId }) : await votarPopular({ eventoId, candidatoId });
    if (r.ok) return sucesso(candidatoId, r.dados.resultado);
    if (r.erro.codigo === "REDE") {
      concluirEnvio(eventoId, { envio: "VERIFICANDO" });
      return verificar();
    }
    concluirEnvio(eventoId, mudancaDoErro(r.erro.codigo));
    if (r.erro.codigo === "ERRO_INTERNO") anunciar(r.erro.mensagem, "assertive");
  }

  /** "Verificar novamente": só consulta, nunca reenvia. */
  async function verificarNovamente() {
    concluirEnvio(eventoId, { envio: "VERIFICANDO", falhaEnvio: null });
    await verificar();
  }

  return { enviar, verificarNovamente };
}
