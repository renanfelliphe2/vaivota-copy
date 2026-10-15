import { ehFusoSuportado } from "@/lib/fusoHorario";
import { GRUPOS, type GruposLigados, type Pesos } from "./placar";

// Etapa 6 (D6, seção 5.3): validações de campo, puras. A UI mostra o erro inline e o serviço valida
// de novo antes de mutar (VALIDACAO). Cada função devolve a mensagem ou null.

export type Erros = Record<string, string>;

export const LIMITES = {
  nomeEvento: [3, 80],
  slug: [3, 40],
  descricaoEvento: 600,
  tituloCandidato: 150,
  descricaoCandidato: 1500,
  valorCampoExtra: 200,
  rotuloCampo: [2, 30],
  maxCampos: 6,
  nomeCriterio: [2, 30],
  maxCriterios: 8,
  nomeParceiro: [2, 60],
  maxParceiros: 20,
  motivoExcepcional: 10,
  convitesPorLote: 50,
  rotuloBaseConvite: 40,
  rotuloConvite: 40,
  rotuloTema: [2, 30],
  nomeExibicao: [2, 60],
  imagemBytes: 2 * 1024 * 1024,
} as const;

// SVG fora (MVP Semana Tech, seção 4): pode carregar script. Só PNG, JPG e WebP.
export const TIPOS_IMAGEM = ["image/png", "image/jpeg", "image/webp"] as const;

const RE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RE_COR = /^#[0-9a-fA-F]{6}$/;

function entre(texto: string, [min, max]: readonly [number, number]): boolean {
  return texto.length >= min && texto.length <= max;
}

// ─────────────────────────────────────────────
// Geral
// ─────────────────────────────────────────────

export function validarNomeEvento(nome: string): string | null {
  const t = nome.trim();
  if (!t) return "Informe o nome do evento.";
  if (!entre(t, LIMITES.nomeEvento)) return "Use de 3 a 80 caracteres.";
  return null;
}

/** `outrosSlugs`: slugs dos demais eventos (comparados sem diferenciar maiúsculas). */
export function validarSlug(slug: string, outrosSlugs: readonly string[]): string | null {
  if (!slug) return "Informe o endereço.";
  if (!entre(slug, LIMITES.slug)) return "Use de 3 a 40 caracteres.";
  if (!RE_SLUG.test(slug)) return "Use só letras minúsculas, números e hífen (sem hífen no começo ou no fim).";
  if (outrosSlugs.some((s) => s.toLowerCase() === slug.toLowerCase())) return "Este endereço já está em uso.";
  return null;
}

export function validarDescricaoEvento(descricao: string): string | null {
  return descricao.length > LIMITES.descricaoEvento ? "Use até 600 caracteres." : null;
}

export function validarFuso(fuso: string): string | null {
  return ehFusoSuportado(fuso) ? null : "Escolha um fuso da lista.";
}

/** Fim posterior ao início. O fim pode ficar no passado em rascunho; o checklist é quem exige o futuro. */
export function validarJanela(inicioMs: number | null, fimMs: number | null): Erros {
  const erros: Erros = {};
  if (inicioMs === null) erros.janelaInicio = "Informe o início.";
  if (fimMs === null) erros.janelaFim = "Informe o fim.";
  if (inicioMs !== null && fimMs !== null && fimMs <= inicioMs) erros.janelaFim = "O fim precisa ser depois do início.";
  return erros;
}

/** Urna aberta (D16): novo fim > fim atual e > agora. */
export function validarExtensaoFim(novoFimMs: number | null, fimAtualMs: number | null, agoraMs: number): string | null {
  if (novoFimMs === null) return "Informe o fim.";
  if (fimAtualMs !== null && novoFimMs <= fimAtualMs) return "Com a urna aberta, o fim só pode ser estendido.";
  if (novoFimMs <= agoraMs) return "O novo fim precisa ser depois do horário atual.";
  return null;
}

export function validarMotivo(motivo: string, obrigatorio: boolean): string | null {
  if (!obrigatorio) return null;
  return motivo.trim().length < LIMITES.motivoExcepcional ? "Descreva o motivo com ao menos 10 caracteres." : null;
}

// ─────────────────────────────────────────────
// Candidatos e campos extras
// ─────────────────────────────────────────────

export type DadosCandidato = {
  titulo: string;
  descricao: string;
  imagemUrl: string | null;
  camposExtras: Record<string, string>;
};

/** `naVotacao`: o candidato já está na votação (imagem obrigatória, D12). */
export function validarCandidato(dados: DadosCandidato, { naVotacao }: { naVotacao: boolean }): Erros {
  const erros: Erros = {};
  const titulo = dados.titulo.trim();
  if (!titulo) erros.titulo = "Informe o título.";
  else if (titulo.length > LIMITES.tituloCandidato) erros.titulo = "Use até 150 caracteres.";
  const descricao = dados.descricao.trim();
  if (!descricao) erros.descricao = "Informe a descrição.";
  else if (descricao.length > LIMITES.descricaoCandidato) erros.descricao = "Use até 1500 caracteres.";
  if (naVotacao && !dados.imagemUrl) erros.imagemUrl = "Imagem obrigatória enquanto estiver na votação.";
  for (const [chave, valor] of Object.entries(dados.camposExtras)) {
    if (valor.length > LIMITES.valorCampoExtra) erros[`campo:${chave}`] = "Use até 200 caracteres.";
  }
  return erros;
}

/** Arquivo de imagem (logo ou candidato): tipo e tamanho informados pelo navegador. */
export function validarArquivoImagem(arquivo: { type: string; size: number }): string | null {
  if (!(TIPOS_IMAGEM as readonly string[]).includes(arquivo.type)) return "Use PNG, JPG ou WebP.";
  if (arquivo.size > LIMITES.imagemBytes) return "O arquivo passa de 2 MB.";
  return null;
}

/** `outrosRotulos`: rótulos dos demais campos do evento. */
export function validarRotuloCampo(rotulo: string, outrosRotulos: readonly string[]): string | null {
  const t = rotulo.trim();
  if (!entre(t, LIMITES.rotuloCampo)) return "Use de 2 a 30 caracteres.";
  if (outrosRotulos.some((r) => r.trim().toLocaleLowerCase("pt-BR") === t.toLocaleLowerCase("pt-BR"))) return "Já existe um campo com este nome.";
  return null;
}

// ─────────────────────────────────────────────
// Convites
// ─────────────────────────────────────────────

export function validarGeracaoConvites(e: {
  quantidade: number;
  rotuloBase: string;
  validadeAteMs: number | null;
  agoraMs: number;
}): Erros {
  const erros: Erros = {};
  if (!Number.isInteger(e.quantidade) || e.quantidade < 1 || e.quantidade > LIMITES.convitesPorLote)
    erros.quantidade = "Gere de 1 a 50 convites por vez.";
  if (e.rotuloBase.trim().length > LIMITES.rotuloBaseConvite) erros.rotuloBase = "Use até 40 caracteres.";
  if (e.validadeAteMs !== null && e.validadeAteMs <= e.agoraMs) erros.validadeAte = "A validade precisa ser no futuro.";
  return erros;
}

export function validarRotuloConvite(rotulo: string): string | null {
  return rotulo.trim().length > LIMITES.rotuloConvite ? "Use até 40 caracteres." : null;
}

// ─────────────────────────────────────────────
// Placar
// ─────────────────────────────────────────────

/** Inteiros de 0 a 100; módulo desligado igual a 0; soma dos ligados igual a 100. */
export function validarPesos(pesos: Pesos, ligados: GruposLigados): string | null {
  if (GRUPOS.some((g) => !Number.isInteger(pesos[g]) || pesos[g] < 0 || pesos[g] > 100)) return "Use números inteiros de 0 a 100.";
  if (GRUPOS.some((g) => g !== "POPULAR" && !ligados[g] && pesos[g] !== 0)) return "Módulo desligado precisa ter peso 0.";
  const soma = pesos.POPULAR + pesos.JURI + pesos.INFANTIL;
  if (soma !== 100) return soma < 100 ? `Faltam ${100 - soma}%.` : `Excede ${soma - 100}%.`;
  return null;
}

// ─────────────────────────────────────────────
// Tema
// ─────────────────────────────────────────────

export type DadosTema = {
  nomeExibicao: string;
  corPrimaria: string;
  corSecundaria: string;
  corFundo: string;
  corTexto: string;
  fonte: string;
  rotuloCandidato: string;
  rotuloCandidatos: string;
};

export function validarTema(dados: DadosTema, fontes: readonly string[]): Erros {
  const erros: Erros = {};
  if (!entre(dados.nomeExibicao.trim(), LIMITES.nomeExibicao)) erros.nomeExibicao = "Use de 2 a 60 caracteres.";
  for (const campo of ["corPrimaria", "corSecundaria", "corFundo", "corTexto"] as const) {
    if (!RE_COR.test(dados[campo])) erros[campo] = "Use uma cor no formato #RRGGBB.";
  }
  if (!fontes.includes(dados.fonte)) erros.fonte = "Escolha uma fonte da lista.";
  if (!entre(dados.rotuloCandidato.trim(), LIMITES.rotuloTema)) erros.rotuloCandidato = "Use de 2 a 30 caracteres.";
  if (!entre(dados.rotuloCandidatos.trim(), LIMITES.rotuloTema)) erros.rotuloCandidatos = "Use de 2 a 30 caracteres.";
  return erros;
}

export function semErros(erros: Erros): boolean {
  return Object.keys(erros).length === 0;
}

// ─────────────────────────────────────────────
// Júri: critérios de avaliação (08/10/2026)
// ─────────────────────────────────────────────

/**
 * Erros por posição (`criterio-<i>`) e o geral (`criterios`). Nos modos por critério exige ao menos um; no voto
 * único a lista é guardada para depois, mas continua válida.
 */
export function validarCriteriosJuri(nomes: readonly string[], porCriterio: boolean): Erros {
  const erros: Erros = {};
  if (porCriterio && nomes.length === 0) erros.criterios = "Cadastre ao menos um critério.";
  if (nomes.length > LIMITES.maxCriterios) erros.criterios = `Use até ${LIMITES.maxCriterios} critérios.`;
  const vistos = new Set<string>();
  nomes.forEach((nome, i) => {
    const t = nome.trim();
    const chave = t.toLocaleLowerCase("pt-BR");
    if (!t) erros[`criterio-${i}`] = "Informe o nome do critério.";
    else if (!entre(t, LIMITES.nomeCriterio)) erros[`criterio-${i}`] = "Use de 2 a 30 caracteres.";
    else if (vistos.has(chave)) erros[`criterio-${i}`] = "Já existe um critério com este nome.";
    vistos.add(chave);
  });
  return erros;
}

/** Parceiros (08/10/2026): nome obrigatório e único; o logo é opcional. */
export function validarParceiros(nomes: readonly string[]): Erros {
  const erros: Erros = {};
  if (nomes.length > LIMITES.maxParceiros) erros.parceiros = `Use até ${LIMITES.maxParceiros} parceiros.`;
  const vistos = new Set<string>();
  nomes.forEach((nome, i) => {
    const t = nome.trim();
    const chave = t.toLocaleLowerCase("pt-BR");
    if (!t) erros[`parceiro-${i}`] = "Informe o nome do parceiro.";
    else if (!entre(t, LIMITES.nomeParceiro)) erros[`parceiro-${i}`] = "Use de 2 a 60 caracteres.";
    else if (vistos.has(chave)) erros[`parceiro-${i}`] = "Já existe um parceiro com este nome.";
    vistos.add(chave);
  });
  return erros;
}
