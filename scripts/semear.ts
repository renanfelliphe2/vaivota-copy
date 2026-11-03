import { argumento } from "./_ambiente";
import { desconectarBanco } from "@/server/db";
import { semearFestivalVerEFazerFilmes, semearMaratonaTechTivit } from "@/server/semente";
import { garantirBucket } from "@/server/storage";

// ST0: seed idempotente do evento (e do bucket de imagens no Supabase Storage). `pnpm db:seed` semeia a Maratona Tech Tivit e
// `pnpm db:seed:festival` o 9º Festival Ver e Fazer Filmes (--evento festival). Rodar de novo nunca desfaz o que já existe.
// Opções: --evento (maratona ou festival), --slug, --nome, --janela-inicio, --janela-fim (ISO 8601 com offset) e, só no festival,
// --trailer (link do YouTube ou Vimeo; sem ele o telão usa o trailer gerado). Também SEED_SLUG, SEED_NOME, SEED_JANELA_INICIO,
// SEED_JANELA_FIM e SEED_TRAILER_URL.

async function main() {
  const evento = argumento("evento") ?? "maratona";
  if (evento !== "maratona" && evento !== "festival") throw new Error(`--evento deve ser "maratona" ou "festival" (veio "${evento}").`);
  const slug = argumento("slug") ?? process.env.SEED_SLUG;
  const opcoes = {
    slug,
    nome: argumento("nome") ?? process.env.SEED_NOME,
    janelaInicio: argumento("janela-inicio") ?? process.env.SEED_JANELA_INICIO,
    janelaFim: argumento("janela-fim") ?? process.env.SEED_JANELA_FIM,
  };
  const resultado =
    evento === "festival"
      ? await semearFestivalVerEFazerFilmes({ ...opcoes, trailerUrl: argumento("trailer") ?? process.env.SEED_TRAILER_URL })
      : await semearMaratonaTechTivit(opcoes);
  console.info(`Evento ${slug ?? (evento === "festival" ? "ver-e-fazer-filmes" : "maratona-tech-tivit")}:${resultado.criado ? "criado" : "já existia (nada foi alterado)"} (${resultado.eventoId}).`);

  try {
    const bucket = await garantirBucket();
    console.info(
      bucket === "ignorado"
        ? "Storage de imagens: modo local (public/uploads). Para produção, defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."
        : `Bucket de imagens: ${bucket}.`,
    );
  } catch (erro) {
    console.warn(`Aviso: não foi possível preparar o bucket de imagens (${erro instanceof Error ? erro.message : erro}). Crie-o pelo painel do Supabase: público, 2 MB, PNG/JPEG/WebP.`);
  }
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => desconectarBanco());
