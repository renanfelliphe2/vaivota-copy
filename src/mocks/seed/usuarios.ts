import type { Participacao, Usuario } from "@/dominio/tipos";
import { ID_FESTIVAL, ID_SEMANA_TECH } from "./eventos";

// Login por código: 123456 (rev. 4, A5: não existe senha).

const CRIADO = "2026-10-01T10:00:00-03:00";

function usuario(id: string, nome: string, email: string, verificado = true): Usuario {
  return {
    id,
    nome,
    email,
    emailVerificadoEm: verificado ? CRIADO : null,
    anonimizadoEm: null,
    criadoEm: CRIADO,
    atualizadoEm: CRIADO,
  };
}

export const seedUsuarios = [
  usuario("usr-ana", "Ana Souza", "publico@demo.com"),
  usuario("usr-bruno", "Bruno Lima", "jurado@demo.com"),
  usuario("usr-carla", "Carla Mendes", "admin@demo.com"),
  usuario("usr-davi", "Davi Rocha", "naoverificado@demo.com", false), // cadastro iniciado, código nunca confirmado
  usuario("usr-eva", "Eva Santos", "votou@demo.com"),
  usuario("usr-fabio", "Fábio Nunes", "jurado.votou@demo.com"),
  usuario("usr-gabi", "Gabi Torres", "equipe@demo.com"),
  usuario("usr-hugo", "Hugo Pires", "admin.festival@demo.com"),
] satisfies Usuario[];

export const seedParticipacoes = [
  { id: "par-ana-st", usuarioId: "usr-ana", eventoId: ID_SEMANA_TECH, papel: "PUBLICO", votou: false },
  { id: "par-bruno-st", usuarioId: "usr-bruno", eventoId: ID_SEMANA_TECH, papel: "JURADO", votou: false },
  { id: "par-carla-st", usuarioId: "usr-carla", eventoId: ID_SEMANA_TECH, papel: "ADMIN", votou: false },
  { id: "par-carla-fv", usuarioId: "usr-carla", eventoId: ID_FESTIVAL, papel: "ADMIN", votou: false },
  { id: "par-eva-st", usuarioId: "usr-eva", eventoId: ID_SEMANA_TECH, papel: "PUBLICO", votou: true },
  { id: "par-fabio-st", usuarioId: "usr-fabio", eventoId: ID_SEMANA_TECH, papel: "JURADO", votou: true },
  { id: "par-gabi-st", usuarioId: "usr-gabi", eventoId: ID_SEMANA_TECH, papel: "PUBLICO", votou: false },
  { id: "par-hugo-fv", usuarioId: "usr-hugo", eventoId: ID_FESTIVAL, papel: "ADMIN", votou: false },
] satisfies Participacao[];
