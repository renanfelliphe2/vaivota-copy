import type { RegraDesempate } from "@/dominio/tipos";
import { exigirAcao } from "@/dominio/travas";
import { validarPesos } from "@/dominio/validacoesConfig";
import { registrarAuditoria } from "@/store/auditoria";
import { IP_HASH, exigirAdmin, iniciarServico, instanteDoEvento, lerAmbiente } from "./apoio";
import { falha, sucesso, type Resultado } from "./resultado";

// Etapa 6 (seção 5.5): pesos inteiros, soma 100 nos módulos ligados, desligado = 0. Trava total com a urna
// aberta (D4, rev. 3 C4). "Exibir votos do júri no telão" não existe (rev. 4, E21).

export type DadosPlacar = { pesoPopular: number; pesoJuri: number; pesoInfantil: number; regraDesempate: RegraDesempate };

export async function salvarPlacar(eventoId: string, dados: DadosPlacar): Promise<Resultado<null>> {
  const erro = await iniciarServico();
  if (erro) return erro;
  const { estado, agoraMs, store } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const trava = exigirAcao(evento, "PLACAR");
  if (!trava.ok) return trava;
  const erroPesos = validarPesos(
    { POPULAR: dados.pesoPopular, JURI: dados.pesoJuri, INFANTIL: dados.pesoInfantil },
    { POPULAR: true, JURI: evento.moduloJuri, INFANTIL: evento.moduloInfantil },
  );
  if (erroPesos) return falha("VALIDACAO", { campos: { pesos: erroPesos } });
  if (dados.regraDesempate !== "JURI" && dados.regraDesempate !== "PUBLICO") return falha("VALIDACAO", { campos: { regraDesempate: "Escolha um critério." } });
  const atual = estado.banco.configsPlacar.find((c) => c.eventoId === eventoId);
  if (!atual) return falha("NAO_ENCONTRADO");
  const agora = instanteDoEvento(estado, eventoId, agoraMs);
  const de = { pesoPopular: atual.pesoPopular, pesoJuri: atual.pesoJuri, pesoInfantil: atual.pesoInfantil, regraDesempate: atual.regraDesempate };

  store.atualizar((e) =>
    registrarAuditoria(
      {
        ...e,
        banco: {
          ...e.banco,
          configsPlacar: e.banco.configsPlacar.map((c) => (c.eventoId === eventoId ? { ...c, ...dados, atualizadoEm: agora } : c)),
        },
      },
      {
        eventoId,
        usuarioId,
        acao: "CONFIG_ALTERADA",
        entidade: "config_placar",
        entidadeId: eventoId,
        detalhes: { de, para: dados },
        ipHash: IP_HASH,
        criadoEm: agora,
      },
    ),
  );
  return sucesso(null);
}
