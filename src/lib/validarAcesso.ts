// Validações de campo do acesso (Etapa 3). Login por e-mail e senha; o código serve só para recuperar a senha
// e confirmar o e-mail (08/10/2026).
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

export const SENHA_MIN = 8;
export const SENHA_MAX = 72;

/** Regra de força simples: tamanho. Sem exigir símbolo (público amplo, inclusive idosos; requisito §4.3). */
export function validarSenha(senha: string): string | null {
  if (!senha) return "Informe a senha.";
  if (senha.length < SENHA_MIN) return `Use pelo menos ${SENHA_MIN} caracteres.`;
  if (senha.length > SENHA_MAX) return `Use no máximo ${SENHA_MAX} caracteres.`;
  return null;
}

export function validarConfirmacaoSenha(senha: string, confirmacao: string): string | null {
  if (!confirmacao) return "Repita a senha.";
  return senha === confirmacao ? null : "As senhas não são iguais.";
}
