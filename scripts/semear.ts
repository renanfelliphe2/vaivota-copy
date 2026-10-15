import { argumento } from "./_ambiente";
import { desconectarBanco } from "@/server/db";
import { semearSemanaTech } from "@/server/semente";
import { garantirBucket } from "@/server/storage";

// ST0: seed idempotente do evento da Semana Tech (e do bucket de imagens no Supabase Storage). `pnpm db:seed`.
// Rodar de novo nunca desfaz o que já existe. Opções: --slug, --nome, --janela-inicio, --janela-fim (ISO 8601 com offset;
// também SEED_SLUG, SEED_NOME, SEED_JANELA_INICIO e SEED_JANELA_FIM).

async function main() {
  const slug = argumento("slug") ?? process.env.SEED_SLUG;
  const resultado = await semearSemanaTech({
    slug,
    nome: argumento("nome") ?? process.env.SEED_NOME,
    janelaInicio: argumento("janela-inicio") ?? process.env.SEED_JANELA_INICIO,
    janelaFim: argumento("janela-fim") ?? process.env.SEED_JANELA_FIM,
  });
  console.info(`Evento ${slug ?? "semana-tech"}: ${resultado.criado ? "criado" : "já existia (nada foi alterado)"} (${resultado.eventoId}).`);

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
