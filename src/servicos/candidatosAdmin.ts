import { gerarChave, removerValores } from "@/dominio/camposExtras";
import { congelarResultado } from "@/dominio/resultado";
import type { CampoCandidato, Candidato, EstadoApp } from "@/dominio/tipos";
import { exigirAcao, resolverFaseConfig } from "@/dominio/travas";
import { LIMITES, validarCandidato, validarMotivo, validarRotuloCampo, type DadosCandidato } from "@/dominio/validacoesConfig";
import { registrarAuditoria } from "@/store/auditoria";
import { IP_HASH, exigirAdmin, iniciarServico, instanteDoEvento, lerAmbiente } from "./apoio";
import { falha, sucesso, type Resultado } from "./resultado";

// Etapa 6 (seção 5.2): candidatos e campos extras do evento. Só aqui se consulta votos e histórico do júri,
// e só para recusar a remoção (D4 da Etapa 0, D11).

function porOrdem(a: Candidato, b: Candidato) {
  return a.ordem - b.ordem || a.id.localeCompare(b.id);
}

function doEvento(estado: EstadoApp, eventoId: string): Candidato[] {
  return estado.banco.candidatos.filter((c) => c.eventoId === eventoId).sort(porOrdem);
}

function acharCandidato(estado: EstadoApp, eventoId: string, candidatoId: string) {
  return estado.banco.candidatos.find((c) => c.id === candidatoId && c.eventoId === eventoId);
}

/** Só as chaves de campos do evento, sem valores vazios. */
function limparCampos(estado: EstadoApp, eventoId: string, campos: Record<string, string>): Record<string, string> {
  const chaves = new Set(estado.banco.camposCandidato.filter((c) => c.eventoId === eventoId).map((c) => c.chave));
  return Object.fromEntries(Object.entries(campos).filter(([k, v]) => chaves.has(k) && v.trim() !== "").map(([k, v]) => [k, v.trim()]));
}

function trocarCandidatos(estado: EstadoApp, candidatos: Candidato[]): EstadoApp {
  return { ...estado, banco: { ...estado.banco, candidatos } };
}

export async function criarCandidato(eventoId: string, dados: DadosCandidato): Promise<Resultado<{ id: string }>> {
  const erro = await iniciarServico();
  if (erro) return erro;
  const { estado, agoraMs, store } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const trava = exigirAcao(admin.dados.evento, "CANDIDATOS_PUBLICACAO");
  if (!trava.ok) return trava;
  const erros = validarCandidato(dados, { naVotacao: false });
  if (Object.keys(erros).length) return falha("VALIDACAO", { campos: erros });

  const agora = instanteDoEvento(estado, eventoId, agoraMs);
  const id = `cand-${crypto.randomUUID().slice(0, 8)}`;
  const ordem = Math.max(0, ...doEvento(estado, eventoId).map((c) => c.ordem)) + 1;
  const novo: Candidato = {
    id,
    eventoId,
    titulo: dados.titulo.trim(),
    descricao: dados.descricao.trim(),
    imagemUrl: dados.imagemUrl,
    publicado: false, // sempre nasce como rascunho
    desqualificado: false,
    ordem,
    camposExtras: limparCampos(estado, eventoId, dados.camposExtras),
    usuarioVinculadoId: null,
    criadoEm: agora,
    atualizadoEm: agora,
  };
  store.atualizar((e) => trocarCandidatos(e, [...e.banco.candidatos, novo]));
  return sucesso({ id });
}

/** Nunca altera `publicado`, `desqualificado` nem `ordem`. Com a urna aberta ou encerrada, audita a correção. */
export async function salvarCandidato(
  eventoId: string,
  candidatoId: string,
  dados: DadosCandidato,
  motivo?: string,
): Promise<Resultado<null>> {
  const erro = await iniciarServico();
  if (erro) return erro;
  const { estado, agoraMs, store } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const trava = exigirAcao(evento, "CANDIDATOS_CORRIGIR");
  if (!trava.ok) return trava;
  const atual = acharCandidato(estado, eventoId, candidatoId);
  if (!atual) return falha("NAO_ENCONTRADO");
  const erros = validarCandidato(dados, { naVotacao: atual.publicado });
  if (Object.keys(erros).length) return falha("VALIDACAO", { campos: erros });

  const camposExtras = limparCampos(estado, eventoId, dados.camposExtras);
  const proximo = { ...atual, titulo: dados.titulo.trim(), descricao: dados.descricao.trim(), imagemUrl: dados.imagemUrl, camposExtras };
  const alterados = (["titulo", "descricao", "imagemUrl"] as const).filter((c) => proximo[c] !== atual[c]);
  if (JSON.stringify(camposExtras) !== JSON.stringify(atual.camposExtras ?? {})) alterados.push("camposExtras" as never);
  if (alterados.length === 0) return sucesso(null);

  const agora = instanteDoEvento(estado, eventoId, agoraMs);
  const { fase } = resolverFaseConfig(evento);
  store.atualizar((e) => {
    const comCandidato = trocarCandidatos(
      e,
      e.banco.candidatos.map((c) => (c.id === candidatoId ? { ...proximo, atualizadoEm: agora } : c)),
    );
    if (fase !== "URNA_ABERTA" && fase !== "URNA_ENCERRADA") return comCandidato;
    return registrarAuditoria(comCandidato, {
      eventoId,
      usuarioId,
      acao: "CANDIDATO_CORRIGIDO",
      entidade: "candidato",
      entidadeId: candidatoId,
      detalhes: { campos: alterados, fase, ...(motivo?.trim() ? { motivo: motivo.trim() } : {}) },
      ipHash: IP_HASH,
      criadoEm: agora,
    });
  });
  return sucesso(null);
}

/** Colocar ou tirar da votação. Colocar exige imagem (D12, rev. 3 C5). */
export async function alterarPublicacao(eventoId: string, candidatoId: string, publicado: boolean): Promise<Resultado<null>> {
  const erro = await iniciarServico();
  if (erro) return erro;
  const { estado, agoraMs, store } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const trava = exigirAcao(admin.dados.evento, "CANDIDATOS_PUBLICACAO");
  if (!trava.ok) return trava;
  const atual = acharCandidato(estado, eventoId, candidatoId);
  if (!atual) return falha("NAO_ENCONTRADO");
  if (publicado && atual.desqualificado) return falha("CONFLITO", { mensagem: "Item fora da disputa não volta para a votação." });
  if (publicado && !atual.imagemUrl)
    return falha("VALIDACAO", {
      mensagem: "Sem imagem: obrigatória para colocar na votação.",
      campos: { imagemUrl: "Sem imagem: obrigatória para colocar na votação." },
    });
  if (atual.publicado === publicado) return sucesso(null);
  const agora = instanteDoEvento(estado, eventoId, agoraMs);
  store.atualizar((e) =>
    trocarCandidatos(
      e,
      e.banco.candidatos.map((c) => (c.id === candidatoId ? { ...c, publicado, atualizadoEm: agora } : c)),
    ),
  );
  return sucesso(null);
}

/** Troca a `ordem` com o vizinho e reindexa (1..n). Livre até concluir. */
export async function reordenarCandidato(eventoId: string, candidatoId: string, direcao: "SUBIR" | "DESCER"): Promise<Resultado<null>> {
  const erro = await iniciarServico();
  if (erro) return erro;
  const { estado, store } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const trava = exigirAcao(admin.dados.evento, "CANDIDATOS_REORDENAR");
  if (!trava.ok) return trava;
  const lista = doEvento(estado, eventoId);
  const i = lista.findIndex((c) => c.id === candidatoId);
  if (i < 0) return falha("NAO_ENCONTRADO");
  const j = direcao === "SUBIR" ? i - 1 : i + 1;
  if (j < 0 || j >= lista.length) return sucesso(null);
  [lista[i], lista[j]] = [lista[j], lista[i]];
  const novaOrdem = new Map(lista.map((c, k) => [c.id, k + 1]));
  store.atualizar((e) =>
    trocarCandidatos(
      e,
      e.banco.candidatos.map((c) => (novaOrdem.has(c.id) ? { ...c, ordem: novaOrdem.get(c.id)! } : c)),
    ),
  );
  return sucesso(null);
}

/** Recusa (CONFLITO) se o candidato tem qualquer voto ou aparece no histórico do júri (rev. 3, D9). */
export async function removerCandidato(eventoId: string, candidatoId: string): Promise<Resultado<null>> {
  const erro = await iniciarServico();
  if (erro) return erro;
  const { estado, store } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const trava = exigirAcao(admin.dados.evento, "CANDIDATOS_PUBLICACAO");
  if (!trava.ok) return trava;
  if (!acharCandidato(estado, eventoId, candidatoId)) return falha("NAO_ENCONTRADO");
  const { banco } = estado;
  const temVoto =
    banco.votos.some((v) => v.candidatoId === candidatoId) ||
    banco.votosJuri.some((v) => v.candidatoId === candidatoId) ||
    banco.historicoVotosJuri.some((h) => h.candidatoAnteriorId === candidatoId || h.candidatoNovoId === candidatoId) ||
    banco.votosInfantis.some((v) => v.candidatoId === candidatoId);
  if (temVoto)
    return falha("CONFLITO", {
      detalhe: `candidato ${candidatoId} tem votos ou histórico`,
      mensagem: "Este item já recebeu voto e não pode ser removido. Tire da votação em vez de remover.",
    });
  store.atualizar((e) => trocarCandidatos(e, e.banco.candidatos.filter((c) => c.id !== candidatoId)));
  return sucesso(null);
}

/** Irreversível (D14). Com a urna encerrada, gera nova versão do resultado (DESQUALIFICACAO). */
export async function desqualificarCandidato(eventoId: string, candidatoId: string, motivo: string): Promise<Resultado<null>> {
  const erro = await iniciarServico();
  if (erro) return erro;
  const { estado, agoraMs, store } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const trava = exigirAcao(evento, "CANDIDATOS_DESQUALIFICAR");
  if (!trava.ok) return trava;
  const erroMotivo = validarMotivo(motivo, true);
  if (erroMotivo) return falha("VALIDACAO", { campos: { motivo: erroMotivo } });
  const atual = acharCandidato(estado, eventoId, candidatoId);
  if (!atual) return falha("NAO_ENCONTRADO");
  if (atual.desqualificado) return falha("CONFLITO", { mensagem: "Este item já está fora da disputa." });

  const agora = instanteDoEvento(estado, eventoId, agoraMs);
  const { fase } = resolverFaseConfig(evento);
  store.atualizar((e) => {
    let proximo = trocarCandidatos(
      e,
      e.banco.candidatos.map((c) => (c.id === candidatoId ? { ...c, desqualificado: true, atualizadoEm: agora } : c)),
    );
    proximo = registrarAuditoria(proximo, {
      eventoId,
      usuarioId,
      acao: "CANDIDATO_DESQUALIFICADO",
      entidade: "candidato",
      entidadeId: candidatoId,
      detalhes: { motivo: motivo.trim(), fase },
      ipHash: IP_HASH,
      criadoEm: agora,
    });
    if (evento.estadoUrna === "ENCERRADA")
      proximo = congelarResultado(proximo, eventoId, "DESQUALIFICACAO", { calculadoPorId: usuarioId, calculadoEm: agora });
    return proximo;
  });
  return sucesso(null);
}

export type CampoEditado = { chave?: string; rotulo: string };

/**
 * Cria, renomeia, reordena e remove campos extras. Remover apaga os valores na mesma operação (D13).
 * Estrutura (adicionar/remover) trava com a urna aberta; rótulo e ordem são corrigíveis com auditoria.
 */
export async function salvarCamposExtras(eventoId: string, campos: CampoEditado[], motivo?: string): Promise<Resultado<null>> {
  const erro = await iniciarServico();
  if (erro) return erro;
  const { estado, agoraMs, store } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const atuais = estado.banco.camposCandidato.filter((c) => c.eventoId === eventoId).sort((a, b) => a.ordem - b.ordem);
  const chavesNovas = new Set(campos.filter((c) => c.chave).map((c) => c.chave!));
  const removidos = atuais.filter((c) => !chavesNovas.has(c.chave)).map((c) => c.chave);
  const adicionados = campos.filter((c) => !c.chave).map((c) => c.rotulo.trim());
  const renomeados = campos.filter((c) => c.chave && atuais.find((a) => a.chave === c.chave)?.rotulo !== c.rotulo.trim()).map((c) => c.chave!);
  const reordenado = campos.filter((c) => c.chave).map((c) => c.chave).join() !== atuais.filter((a) => chavesNovas.has(a.chave)).map((a) => a.chave).join();

  if (removidos.length || adicionados.length) {
    const trava = exigirAcao(evento, "CAMPOS_EXTRAS_ESTRUTURA");
    if (!trava.ok) return trava;
  }
  if (renomeados.length || reordenado) {
    const trava = exigirAcao(evento, "CAMPOS_EXTRAS_ROTULO");
    if (!trava.ok) return trava;
  }
  if (!removidos.length && !adicionados.length && !renomeados.length && !reordenado) return sucesso(null);

  if (campos.length > LIMITES.maxCampos) return falha("VALIDACAO", { campos: { campos: "Use no máximo 6 campos." } });
  const erros: Record<string, string> = {};
  campos.forEach((c, i) => {
    const outros = campos.filter((_, k) => k !== i).map((o) => o.rotulo);
    const e = validarRotuloCampo(c.rotulo, outros);
    if (e) erros[`rotulo:${i}`] = e;
  });
  if (Object.keys(erros).length) return falha("VALIDACAO", { campos: erros });

  const chaves = atuais.map((a) => a.chave);
  const novos: CampoCandidato[] = campos.map((c, i) => {
    const existente = c.chave ? atuais.find((a) => a.chave === c.chave) : undefined;
    if (existente) return { ...existente, rotulo: c.rotulo.trim(), ordem: i + 1 };
    const chave = gerarChave(c.rotulo, chaves);
    chaves.push(chave);
    return { id: `campo-${crypto.randomUUID().slice(0, 8)}`, eventoId, chave, rotulo: c.rotulo.trim(), ordem: i + 1 };
  });
  const agora = instanteDoEvento(estado, eventoId, agoraMs);

  store.atualizar((e) => {
    const proximo: EstadoApp = {
      ...e,
      banco: {
        ...e.banco,
        camposCandidato: [...e.banco.camposCandidato.filter((c) => c.eventoId !== eventoId), ...novos],
        candidatos: removerValores(e.banco.candidatos, eventoId, removidos),
      },
    };
    return registrarAuditoria(proximo, {
      eventoId,
      usuarioId,
      acao: "CONFIG_ALTERADA",
      entidade: "campo_candidato",
      detalhes: {
        adicionados,
        removidos,
        renomeados,
        reordenado,
        ...(motivo?.trim() ? { motivo: motivo.trim() } : {}),
      },
      ipHash: IP_HASH,
      criadoEm: agora,
    });
  });
  return sucesso(null);
}
