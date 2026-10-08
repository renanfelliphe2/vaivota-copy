// Validações de campo do acesso (Etapa 3). Sem regras de senha: não existe senha (rev. 4, C7).
// Cada função devolve a mensagem de erro do campo, ou null se o valor é válido.

export const CODIGO_LOGIN_PROTOTIPO = "123456";

export function normalizarEmail(email: string): string {
  return email.trim().toLocaleLowerCase("pt-BR");
}

const PADRAO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validarEmail(email: string): string | null {
  const valor = email.trim();
  if (!valor) return "Informe seu e-mail.";
  if (valor.length > 191 || !PADRAO_EMAIL.test(valor)) return "Informe um e-mail válido, como nome@exemplo.com.";
  return null;
}

export function validarNome(nome: string): string | null {
  const valor = nome.trim();
  if (!valor) return "Informe seu nome.";
  if (valor.length < 2) return "Use pelo menos 2 caracteres.";
  if (valor.length > 120) return "Use no máximo 120 caracteres.";
  return null;
}

/** Só dígitos, até 6. Para o campo de digitação do código de login. */
export function limparCodigoLogin(codigo: string): string {
  return codigo.replace(/\D/g, "").slice(0, 6);
}

export function validarCodigoLogin(codigo: string): string | null {
  return /^\d{6}$/.test(codigo.trim()) ? null : "Digite os 6 números do código.";
}
