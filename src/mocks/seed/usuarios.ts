import { hashSenha } from "@/dominio/senha";
import type { Participacao, Usuario } from "@/dominio/tipos";
import { ID_FESTIVAL } from "./eventos";

// Login por e-mail e senha (SENHA_SEED). O código 123456 serve só para recuperar a senha.
// Um usuário por papel, todos no Festival e sem voto, para a demonstração mostrar o fluxo de cada conta.

const CRIADO = "2026-10-01T10:00:00-03:00";

/** Senha das três contas do seed (só protótipo). */
export const SENHA_SEED = "demo1234";

function usuario(id: string, nome: string, email: string): Usuario {
  return {
    id,
    nome,
    email,
    senhaHash: hashSenha(id, SENHA_SEED),
    emailVerificadoEm: CRIADO,
    anonimizadoEm: null,
    criadoEm: CRIADO,
    atualizadoEm: CRIADO,
  };
}

export const seedUsuarios = [
  usuario("usr-ana", "Ana Souza", "publico@demo.com"),
  usuario("usr-bruno", "Bruno Lima", "jurado@demo.com"),
  usuario("usr-carla", "Carla Mendes", "admin@demo.com"),
] satisfies Usuario[];

export const seedParticipacoes = [
  { id: "par-ana-fv", usuarioId: "usr-ana", eventoId: ID_FESTIVAL, papel: "PUBLICO", votou: false },
  // Jurado pelo convite H4TR-9WNB (resgatado no seed).
  { id: "par-bruno-fv", usuarioId: "usr-bruno", eventoId: ID_FESTIVAL, papel: "JURADO", votou: false },
  { id: "par-carla-fv", usuarioId: "usr-carla", eventoId: ID_FESTIVAL, papel: "ADMIN", votou: false },
] satisfies Participacao[];
