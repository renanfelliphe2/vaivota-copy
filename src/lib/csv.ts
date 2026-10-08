// Etapa 6 (D23): CSV para planilha em pt-BR. UTF-8 com BOM, separador `;`, fim de linha CRLF, aspas
// escapadas e neutralização de fórmulas. A Etapa 7 reaproveita para as exportações.

export type CelulaCsv = string | number | boolean | null | undefined;

const BOM = "﻿";
const SEPARADOR = ";";
const FIM_DE_LINHA = "\r\n";

/** Texto que começa com = + - @ ganha um apóstrofo à frente (evita injeção de fórmula). */
export function neutralizarFormula(texto: string): string {
  return /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
}

export function celulaCsv(valor: CelulaCsv): string {
  if (valor === null || valor === undefined) return "";
  const texto = typeof valor === "string" ? neutralizarFormula(valor) : String(valor);
  return /[";\r\n]/.test(texto) || texto !== texto.trim() ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** Cabeçalho + linhas → conteúdo do arquivo (com BOM). */
export function montarCsv(cabecalho: readonly string[], linhas: readonly (readonly CelulaCsv[])[]): string {
  const todas = [cabecalho, ...linhas].map((linha) => linha.map(celulaCsv).join(SEPARADOR));
  return BOM + todas.join(FIM_DE_LINHA) + FIM_DE_LINHA;
}

/** Dispara o download no navegador. Chamar só em manipulador de evento. */
export function baixarCsv(nomeArquivo: string, conteudo: string): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
