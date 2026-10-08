import type { Tema } from "@/dominio/tipos";
import {
  CONTRASTE_TEXTO,
  CONTRASTE_UI,
  corLegivelSobre,
  corTextoSobre,
  luminancia,
  misturar,
  razaoContraste,
} from "./contraste";

// Tokens --tema-* (Etapa 0, seção 5.5). Sem dark mode automático: o tema do evento manda.

/**
 * Cores de sistema para estados (erro, sucesso, aviso, informação). Não são cores de marca:
 * entram só como base e são ajustadas para 4,5:1 sobre o fundo de cada tema.
 */
const CORES_SISTEMA = {
  erro: "#dc2626",
  sucesso: "#16a34a",
  aviso: "#b45309",
  info: "#2563eb",
} as const;

export type CoresTema = Pick<Tema, "corPrimaria" | "corSecundaria" | "corFundo" | "corTexto" | "fonte">;

export type TokensTema = {
  variaveis: Record<`--tema-${string}`, string>;
  esquemaCor: "light" | "dark";
};

/** Nome da variável CSS da fonte aprovada ("Space Grotesk" → "--fonte-space-grotesk"); ver lib/fontes.ts. */
export function variavelDaFonte(nome: string): string {
  return `--fonte-${nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;
}

/** Maior mistura do texto com o fundo que ainda mantém 4,5:1 sobre todas as `superficies`. */
function textoSuave(texto: string, superficies: string[]): string {
  for (let passo = 10; passo >= 0; passo--) {
    const candidata = misturar(texto, superficies[0], passo * 0.04);
    if (superficies.every((s) => razaoContraste(candidata, s) >= CONTRASTE_TEXTO)) return candidata;
  }
  return texto;
}

export function calcularTokens(tema: CoresTema): TokensTema {
  const { corPrimaria: primaria, corSecundaria: secundaria, corFundo: fundo, corTexto: texto } = tema;
  const candidatas = [fundo, texto];

  const superficie = misturar(fundo, texto, 0.06);
  const borda = misturar(fundo, texto, 0.18);
  const suave = textoSuave(texto, [fundo, superficie]);
  const foco = razaoContraste(primaria, fundo) >= CONTRASTE_UI ? primaria : texto;

  const variaveis: TokensTema["variaveis"] = {
    "--tema-primaria": primaria,
    "--tema-secundaria": secundaria,
    "--tema-fundo": fundo,
    "--tema-texto": texto,
    "--tema-sobre-primaria": corTextoSobre(primaria, candidatas),
    "--tema-sobre-secundaria": corTextoSobre(secundaria, candidatas),
    "--tema-primaria-texto": corLegivelSobre(primaria, superficie, texto),
    "--tema-secundaria-texto": corLegivelSobre(secundaria, superficie, texto),
    "--tema-superficie": superficie,
    "--tema-borda": borda,
    "--tema-texto-suave": suave,
    "--tema-foco": foco,
    "--tema-fonte": `var(${variavelDaFonte(tema.fonte)}), ui-sans-serif, system-ui, sans-serif`,
    "--tema-erro": corLegivelSobre(CORES_SISTEMA.erro, superficie, texto),
    "--tema-sucesso": corLegivelSobre(CORES_SISTEMA.sucesso, superficie, texto),
    "--tema-aviso": corLegivelSobre(CORES_SISTEMA.aviso, superficie, texto),
    "--tema-info": corLegivelSobre(CORES_SISTEMA.info, superficie, texto),
  };

  return { variaveis, esquemaCor: luminancia(fundo) < 0.2 ? "dark" : "light" };
}

/** Pares que a política de contraste exige (usado no teste e na galeria /dev/ui). */
export function paresDeContraste(tokens: TokensTema): { par: string; razao: number; minimo: number }[] {
  const v = tokens.variaveis;
  const par = (nome: string, a: string, b: string, minimo = CONTRASTE_TEXTO) => ({
    par: nome,
    razao: razaoContraste(a, b),
    minimo,
  });
  return [
    par("texto × fundo", v["--tema-texto"], v["--tema-fundo"]),
    par("texto × superfície", v["--tema-texto"], v["--tema-superficie"]),
    par("texto suave × fundo", v["--tema-texto-suave"], v["--tema-fundo"]),
    par("texto suave × superfície", v["--tema-texto-suave"], v["--tema-superficie"]),
    par("sobre-primária × primária", v["--tema-sobre-primaria"], v["--tema-primaria"]),
    par("sobre-secundária × secundária", v["--tema-sobre-secundaria"], v["--tema-secundaria"]),
    par("primária-texto × fundo", v["--tema-primaria-texto"], v["--tema-fundo"]),
    par("primária-texto × superfície", v["--tema-primaria-texto"], v["--tema-superficie"]),
    par("secundária-texto × fundo", v["--tema-secundaria-texto"], v["--tema-fundo"]),
    par("secundária-texto × superfície", v["--tema-secundaria-texto"], v["--tema-superficie"]),
    par("erro × superfície", v["--tema-erro"], v["--tema-superficie"]),
    par("sucesso × superfície", v["--tema-sucesso"], v["--tema-superficie"]),
    par("aviso × superfície", v["--tema-aviso"], v["--tema-superficie"]),
    par("info × superfície", v["--tema-info"], v["--tema-superficie"]),
    par("foco × fundo", v["--tema-foco"], v["--tema-fundo"], CONTRASTE_UI),
  ];
}
