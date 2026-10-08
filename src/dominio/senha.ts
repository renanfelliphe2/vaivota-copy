import { hashMock } from "@/lib/hash";
import type { Usuario } from "./tipos";

// Login por e-mail e senha (08/10/2026). Só o hash fica no estado (D12).
// O hashMock NÃO é criptográfico: em produção a senha é do Better Auth (scrypt/argon2 com sal), nunca daqui.

export function hashSenha(usuarioId: string, senha: string): string {
  return hashMock(`senha:${usuarioId}:${senha}`);
}

/** Conta sem senha (criada pelo Google) nunca confere. */
export function senhaConfere(usuario: Pick<Usuario, "id" | "senhaHash">, senha: string): boolean {
  return usuario.senhaHash !== null && hashSenha(usuario.id, senha) === usuario.senhaHash;
}
