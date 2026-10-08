import { avaliarContrasteTema } from "@/dominio/contrasteTema";
import { exigirAcao } from "@/dominio/travas";
import type { Tema } from "@/dominio/tipos";
import { validarTema, type DadosTema } from "@/dominio/validacoesConfig";
import { FONTES_APROVADAS } from "@/lib/fontes";
import { PRESET_TEMA_ESCURO, seedTemas } from "@/mocks/seed";
import { registrarAuditoria } from "@/store/auditoria";
import { IP_HASH, exigirAdmin, iniciarServico, instanteDoEvento, lerAmbiente } from "./apoio";
import { falha, sucesso, type Resultado } from "./resultado";

// Etapa 6 (D18, seção 5.6): presets lidos do seed (componentes não guardam hex de marca) e salvar com a
// política de contraste da D15 da Etapa 0. Livre mesmo com a urna aberta.

export type PresetTema = {
  id: string;
  nome: string;
  paleta: Pick<Tema, "corPrimaria" | "corSecundaria" | "corFundo" | "corTexto">;
  fonte: string;
};

export async function listarPresetsTema(): Promise<Resultado<PresetTema[]>> {
  const erro = await iniciarServico({ leitura: true });
  if (erro) return erro;
  return sucesso([
    ...seedTemas.map((t) => ({
      id: "festival",
      nome: "Festival",
      paleta: { corPrimaria: t.corPrimaria, corSecundaria: t.corSecundaria, corFundo: t.corFundo, corTexto: t.corTexto },
      fonte: t.fonte,
    })),
    {
      id: "escuro",
      nome: "Escuro",
      paleta: {
        corPrimaria: PRESET_TEMA_ESCURO.corPrimaria,
        corSecundaria: PRESET_TEMA_ESCURO.corSecundaria,
        corFundo: PRESET_TEMA_ESCURO.corFundo,
        corTexto: PRESET_TEMA_ESCURO.corTexto,
      },
      fonte: PRESET_TEMA_ESCURO.fonte,
    },
  ]);
}

export type DadosSalvarTema = DadosTema & { logoUrl: string | null };

export async function salvarTema(eventoId: string, dados: DadosSalvarTema): Promise<Resultado<null>> {
  const erro = await iniciarServico();
  if (erro) return erro;
  const { estado, agoraMs, store } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const { usuarioId } = admin.dados;
  const trava = exigirAcao(admin.dados.evento, "TEMA");
  if (!trava.ok) return trava;
  const erros = validarTema(dados, FONTES_APROVADAS);
  if (Object.keys(erros).length) return falha("VALIDACAO", { campos: erros });
  const contraste = avaliarContrasteTema(dados);
  if (!contraste.aprovado)
    return falha("VALIDACAO", { mensagem: `Contraste reprovado: ${contraste.reprovados.map((p) => p.par).join(", ")}.` });
  const atual = estado.banco.temas.find((t) => t.eventoId === eventoId);
  if (!atual) return falha("NAO_ENCONTRADO");

  const proximo: Tema = {
    ...atual,
    nomeExibicao: dados.nomeExibicao.trim(),
    logoUrl: dados.logoUrl,
    corPrimaria: dados.corPrimaria.toUpperCase(),
    corSecundaria: dados.corSecundaria.toUpperCase(),
    corFundo: dados.corFundo.toUpperCase(),
    corTexto: dados.corTexto.toUpperCase(),
    fonte: dados.fonte,
    rotuloCandidato: dados.rotuloCandidato.trim(),
    rotuloCandidatos: dados.rotuloCandidatos.trim(),
  };
  const campos = (Object.keys(proximo) as (keyof Tema)[]).filter(
    (k) => k !== "logoUrl" && k !== "atualizadoEm" && proximo[k] !== atual[k],
  );
  const logoTrocado = proximo.logoUrl !== atual.logoUrl;
  if (!campos.length && !logoTrocado) return sucesso(null);
  const agora = instanteDoEvento(estado, eventoId, agoraMs);

  store.atualizar((e) =>
    registrarAuditoria(
      { ...e, banco: { ...e.banco, temas: e.banco.temas.map((t) => (t.eventoId === eventoId ? { ...proximo, atualizadoEm: agora } : t)) } },
      {
        eventoId,
        usuarioId,
        acao: "TEMA_ALTERADO",
        entidade: "tema",
        entidadeId: eventoId,
        detalhes: { campos, logoTrocado },
        ipHash: IP_HASH,
        criadoEm: agora,
      },
    ),
  );
  return sucesso(null);
}
