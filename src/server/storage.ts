import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { LIMITES } from "@/dominio/validacoesConfig";
import { env } from "./env";

// ST2: imagens dos candidatos no Supabase Storage. Leitura pública (bucket público); escrita só por aqui, com a chave
// de serviço, que NUNCA vai ao navegador. Tipo e tamanho são conferidos no servidor, pelo conteúdo do arquivo (não pelo
// `Content-Type` que o navegador diz). SVG não é aceito: pode carregar script.
// Em desenvolvimento, sem Supabase configurado, grava em public/uploads (STORAGE_PROVIDER=local).

export type TipoImagem = "image/png" | "image/jpeg" | "image/webp";

const EXTENSAO: Record<TipoImagem, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const TIPOS_ACEITOS = Object.keys(EXTENSAO) as TipoImagem[];

/** Descobre o tipo pelos primeiros bytes. null = não é PNG, JPEG nem WebP. */
export function detectarTipoImagem(bytes: Uint8Array): TipoImagem | null {
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}

export type ErroUpload = "TIPO_INVALIDO" | "ARQUIVO_VAZIO" | "ARQUIVO_GRANDE";

export function validarImagem(bytes: Uint8Array): { ok: true; tipo: TipoImagem } | { ok: false; erro: ErroUpload } {
  if (bytes.length === 0) return { ok: false, erro: "ARQUIVO_VAZIO" };
  if (bytes.length > LIMITES.imagemBytes) return { ok: false, erro: "ARQUIVO_GRANDE" };
  const tipo = detectarTipoImagem(bytes);
  if (!tipo || !TIPOS_ACEITOS.includes(tipo)) return { ok: false, erro: "TIPO_INVALIDO" };
  return { ok: true, tipo };
}

/** Início de toda URL de imagem que este sistema grava. */
export function prefixoPublico(): string {
  return env.storageProvedor === "supabase" ? `${env.supabaseUrl}/storage/v1/object/public/${env.storageBucket}/` : "/uploads/";
}

const RE_CAMINHO = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg|webp)$/;

/** `imagemUrl` de candidato só pode ser uma imagem enviada por este sistema (nada de endereço externo digitado). */
export function urlDeImagemValida(url: string, eventoId?: string): boolean {
  const prefixo = prefixoPublico();
  if (!url.startsWith(prefixo)) return false;
  const caminho = url.slice(prefixo.length);
  // Com o evento informado, só vale imagem enviada para ELE (a pasta é o id do evento).
  return RE_CAMINHO.test(caminho) && (eventoId === undefined || caminho.startsWith(`${eventoId}/`));
}

async function enviarAoSupabase(caminho: string, bytes: Uint8Array, tipo: TipoImagem): Promise<void> {
  const resposta = await fetch(`${env.supabaseUrl}/storage/v1/object/${env.storageBucket}/${caminho}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.supabaseServiceKey}`,
      apikey: env.supabaseServiceKey,
      "Content-Type": tipo,
      // O nome é um UUID novo a cada envio: o conteúdo nunca muda, o cache pode ser longo.
      "Cache-Control": "max-age=31536000",
      "x-upsert": "false",
    },
    body: bytes as BodyInit,
    signal: AbortSignal.timeout(20_000),
  });
  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => "");
    throw new Error(`Supabase Storage respondeu ${resposta.status}: ${corpo.slice(0, 300)}`);
  }
}

async function enviarAoDisco(caminho: string, bytes: Uint8Array): Promise<void> {
  const destino = path.join(process.cwd(), "public", "uploads", caminho);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, bytes);
}

/** Grava a imagem (já validada) e devolve a URL pública. */
export async function guardarImagem(eventoId: string, bytes: Uint8Array, tipo: TipoImagem): Promise<string> {
  const caminho = `${eventoId}/${randomUUID()}.${EXTENSAO[tipo]}`;
  if (env.storageProvedor === "supabase") await enviarAoSupabase(caminho, bytes, tipo);
  else {
    // Em produção o modo local só vale se foi pedido de propósito (STORAGE_PROVIDER=local): na Vercel o disco é só de leitura.
    if (process.env.NODE_ENV === "production" && !process.env.STORAGE_PROVIDER?.trim())
      throw new Error("Storage de imagens não configurado: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
    await enviarAoDisco(caminho, bytes);
  }
  return `${prefixoPublico()}${caminho}`;
}

/** Cria o bucket público (idempotente). Usado pelo seed; exige a chave de serviço. */
export async function garantirBucket(): Promise<"criado" | "existente" | "ignorado"> {
  if (env.storageProvedor !== "supabase") return "ignorado";
  const resposta = await fetch(`${env.supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.supabaseServiceKey}`, apikey: env.supabaseServiceKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      id: env.storageBucket,
      name: env.storageBucket,
      public: true,
      file_size_limit: LIMITES.imagemBytes,
      allowed_mime_types: TIPOS_ACEITOS,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (resposta.ok) return "criado";
  const corpo = await resposta.text().catch(() => "");
  if (resposta.status === 409 || /already exists|Duplicate/i.test(corpo)) return "existente";
  throw new Error(`Não foi possível criar o bucket (${resposta.status}): ${corpo.slice(0, 300)}`);
}
