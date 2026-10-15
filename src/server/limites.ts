import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { db } from "./db";

// Limites de taxa (ST1). Três mecanismos, cada um onde faz sentido:
//  1. Contador em janela fixa no banco (tabela `rate_limit`): código por e-mail, registro. Vale entre instâncias.
//  2. Bloqueio por tentativas de senha, por e-mail: 5 recusas seguidas bloqueiam o login por 60 s.
//  3. Contador em memória: voto e consultas. NÃO usa o banco de propósito: uma linha por usuário com horário no banco
//     deixaria cruzar quem votou com o horário do voto (sigilo). O voto único é garantido no banco; este limite só
//     protege de rajadas, e por instância já basta.
//
// Atenção: o público de um evento divide a mesma rede (Wi-Fi do local, NAT das operadoras). Limite por IP precisa ser
// generoso; o limite fino é por e-mail ou por usuário.

export const LIMITE_RECUSAS_SENHA = 5;
export const BLOQUEIO_SENHA_MS = 60_000;
const JANELA_FALHAS_MS = 15 * 60_000;

/** Chave sem dado pessoal em claro: o e-mail vira hash. */
export function chaveDeEmail(prefixo: string, email: string): string {
  return `${prefixo}:${createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32)}`;
}

// ─────────────────────────────────────────────
// 1. Janela fixa no banco
// ─────────────────────────────────────────────

export type ResultadoLimite = { permitido: boolean; restanteSegundos: number };

/**
 * Conta uma requisição na janela fixa e diz se ainda cabe. Atômico (um INSERT ... ON CONFLICT): requisições simultâneas
 * nunca passam todas por uma leitura velha.
 */
export async function consumirJanela(chave: string, opcoes: { max: number; janelaMs: number }, agoraMs = Date.now()): Promise<ResultadoLimite> {
  const balde = Math.floor(agoraMs / opcoes.janelaMs);
  const chaveBalde = `${chave}#${balde}`;
  const linhas = await db().$queryRaw<{ count: number }[]>`
    INSERT INTO rate_limit (id, key, count, last_request)
    VALUES (${randomUUID()}, ${chaveBalde}, 1, ${BigInt(agoraMs)})
    ON CONFLICT (key) DO UPDATE SET count = rate_limit.count + 1, last_request = ${BigInt(agoraMs)}
    RETURNING count`;
  const n = Number(linhas[0]?.count ?? 1);
  const restanteSegundos = Math.max(1, Math.ceil(((balde + 1) * opcoes.janelaMs - agoraMs) / 1000));
  return { permitido: n <= opcoes.max, restanteSegundos };
}

/** Apaga os contadores velhos (rodado de vez em quando). */
export async function limparContadoresAntigos(agoraMs = Date.now(), idadeMs = 24 * 60 * 60_000): Promise<number> {
  return db().$executeRaw`DELETE FROM rate_limit WHERE last_request < ${BigInt(agoraMs - idadeMs)}`;
}

// ─────────────────────────────────────────────
// 2. Bloqueio por tentativas de senha
// ─────────────────────────────────────────────

export type ReservaDeSenha = { permitido: true } | { permitido: false; restanteSegundos: number; primeiraRecusa: boolean };

/**
 * Reserva uma tentativa de senha ANTES de verificá-la (um único INSERT ... ON CONFLICT, atômico). Verificar primeiro e
 * contar depois deixaria uma rajada de requisições simultâneas passar toda pela verificação. Até a 5ª tentativa
 * da sequência a verificação é permitida; da 6ª em diante, e por 60 s depois da 5ª, o e-mail está bloqueado (não importa
 * se a senha enviada é a certa). Senha certa apaga o contador (`zerarRecusasDeSenha`). Passados 60 s, ou 15 min sem
 * tentar, recomeça.
 */
export async function reservarTentativaDeSenha(email: string, agoraMs = Date.now()): Promise<ReservaDeSenha> {
  const chave = chaveDeEmail("senha", email);
  const agora = BigInt(agoraMs);
  const velhaDemais = BigInt(agoraMs - JANELA_FALHAS_MS);
  const bloqueioVencido = BigInt(agoraMs - BLOQUEIO_SENHA_MS);
  const linhas = await db().$queryRaw<{ count: number; last_request: bigint }[]>`
    INSERT INTO rate_limit (id, key, count, last_request)
    VALUES (${randomUUID()}, ${chave}, 1, ${agora})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limit.last_request < ${velhaDemais} THEN 1
        WHEN rate_limit.count >= ${LIMITE_RECUSAS_SENHA} AND rate_limit.last_request < ${bloqueioVencido} THEN 1
        ELSE rate_limit.count + 1
      END,
      last_request = CASE
        WHEN rate_limit.count > ${LIMITE_RECUSAS_SENHA} AND rate_limit.last_request >= ${bloqueioVencido} THEN rate_limit.last_request
        ELSE ${agora}
      END
    RETURNING count, last_request`;
  const n = Number(linhas[0]?.count ?? 1);
  if (n <= LIMITE_RECUSAS_SENHA) return { permitido: true };
  const ate = Number(linhas[0].last_request) + BLOQUEIO_SENHA_MS;
  return { permitido: false, restanteSegundos: Math.max(1, Math.ceil((ate - agoraMs) / 1000)), primeiraRecusa: n === LIMITE_RECUSAS_SENHA + 1 };
}

export async function zerarRecusasDeSenha(email: string): Promise<void> {
  await db().rateLimit.deleteMany({ where: { key: chaveDeEmail("senha", email) } });
}

// ─────────────────────────────────────────────
// 3. Memória (voto e consultas)
// ─────────────────────────────────────────────

type Balde = { inicio: number; n: number };
const baldes = new Map<string, Balde>();
let ultimaLimpeza = 0;

/** Janela fixa em memória, por instância. */
export function consumirEmMemoria(chave: string, max: number, janelaMs: number, agoraMs = Date.now()): boolean {
  if (agoraMs - ultimaLimpeza > 60_000) {
    ultimaLimpeza = agoraMs;
    for (const [k, b] of baldes) if (agoraMs - b.inicio > 10 * 60_000) baldes.delete(k);
  }
  const atual = baldes.get(chave);
  if (!atual || agoraMs - atual.inicio >= janelaMs) {
    baldes.set(chave, { inicio: agoraMs, n: 1 });
    return true;
  }
  atual.n++;
  return atual.n <= max;
}

/** Só para testes. */
export function zerarMemoria(): void {
  baldes.clear();
  ultimaLimpeza = 0;
}
