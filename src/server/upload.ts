import "server-only";
import { resolverFaseConfig } from "@/dominio/travas";
import { consumirEmMemoria } from "./limites";
import { falha, falhaInterna, sucesso, type Resultado } from "./resultado";
import { exigirAdmin, type UsuarioSessao } from "./sessao";
import { guardarImagem, validarImagem } from "./storage";

// ST2: upload da imagem de um candidato. Só o admin do evento envia; o arquivo passa pelo servidor, que confere o
// tipo (pelo conteúdo) e o tamanho antes de gravar no Storage com a chave de serviço.

const MENSAGENS = {
  TIPO_INVALIDO: "Use PNG, JPG ou WebP.",
  ARQUIVO_VAZIO: "O arquivo está vazio.",
  ARQUIVO_GRANDE: "O arquivo passa de 2 MB.",
} as const;

export async function enviarImagemDeCandidato(
  usuario: UsuarioSessao | null,
  eventoId: string,
  bytes: Uint8Array,
): Promise<Resultado<{ url: string }>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  if (resolverFaseConfig(admin.dados.evento).fase === "CONCLUIDO") return falha("EVENTO_CONCLUIDO");
  if (!consumirEmMemoria(`upload:${admin.dados.usuarioId}`, 30, 60_000)) return falha("LIMITE_TENTATIVAS", { parametros: { n: 60 } });

  const conferido = validarImagem(bytes);
  if (!conferido.ok) return falha("VALIDACAO", { campos: { imagemUrl: MENSAGENS[conferido.erro] }, detalhe: `upload recusado: ${conferido.erro}` });
  try {
    return sucesso({ url: await guardarImagem(eventoId, bytes, conferido.tipo) });
  } catch (e) {
    return falhaInterna(e, "enviarImagemDeCandidato");
  }
}
