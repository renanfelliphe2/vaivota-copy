import { MODOS_VOTO_JURI, aplicarAvaliacaoJuri, criteriosDoEvento, ehModoPorCriterio, type DadosAvaliacaoJuri } from "@/dominio/avaliacaoJuri";
import { exigirAcao } from "@/dominio/travas";
import { validarCriteriosJuri } from "@/dominio/validacoesConfig";
import { registrarAuditoria } from "@/store/auditoria";
import { IP_HASH, exigirAdmin, iniciarServico, instanteDoEvento, lerAmbiente } from "./apoio";
import { falha, sucesso, type Resultado } from "./resultado";

// Configuração da avaliação do júri (08/10/2026): modo de votação e critérios. Trava com a urna aberta, como o
// placar. A mutação pura (aplicarAvaliacaoJuri) fica no domínio, porque a toolbar também troca o modo.

export type { CriterioEditado, DadosAvaliacaoJuri } from "@/dominio/avaliacaoJuri";

export async function salvarAvaliacaoJuri(eventoId: string, dados: DadosAvaliacaoJuri): Promise<Resultado<null>> {
  const erro = await iniciarServico();
  if (erro) return erro;
  const { estado, agoraMs, store } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const trava = exigirAcao(evento, "JURI_AVALIACAO");
  if (!trava.ok) return trava;
  if (!MODOS_VOTO_JURI.includes(dados.modoVotoJuri)) return falha("VALIDACAO", { campos: { modo: "Escolha a forma de votação." } });
  const campos = validarCriteriosJuri(
    dados.criterios.map((c) => c.nome),
    ehModoPorCriterio(dados.modoVotoJuri),
  );
  if (Object.keys(campos).length > 0) return falha("VALIDACAO", { campos });
  const placar = estado.banco.configsPlacar.find((c) => c.eventoId === eventoId);
  if (!placar) return falha("NAO_ENCONTRADO");

  const agora = instanteDoEvento(estado, eventoId, agoraMs);
  const de = { modoVotoJuri: placar.modoVotoJuri, criterios: criteriosDoEvento(estado.banco, eventoId).map((c) => c.nome) };
  const para = { modoVotoJuri: dados.modoVotoJuri, criterios: dados.criterios.map((c) => c.nome.trim()) };
  store.atualizar((e) =>
    registrarAuditoria(aplicarAvaliacaoJuri(e, eventoId, dados, agora), {
      eventoId,
      usuarioId,
      acao: "CONFIG_ALTERADA",
      entidade: "config_juri",
      entidadeId: eventoId,
      detalhes: { de, para },
      ipHash: IP_HASH,
      criadoEm: agora,
    }),
  );
  return sucesso(null);
}
