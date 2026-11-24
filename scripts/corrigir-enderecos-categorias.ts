import "./_ambiente-local-opcional";
import "./_ambiente";
import { randomBytes } from "node:crypto";
import { argumento, temFlag } from "./_ambiente";
import { enderecosDasCategorias } from "@/dominio/categorias";
import { db, desconectarBanco } from "@/server/db";

// 24/11/2026: o endereço da categoria passou a ser sempre gerado do nome (/e/<evento>/<nome-da-categoria>). Este script corrige
// as categorias que já existem: recalcula o endereço de cada uma a partir do nome, na ordem do evento.
// `pnpm db:corrigir-enderecos-categorias` mostra o que mudaria (simulação); `--executar` grava. `--slug <evento>` limita a um
// evento; `--local` usa o banco do `next dev` (.env.development.local) em vez do .env.local.
// Vale mesmo com a urna aberta (é uma correção pedida de propósito): os QR Codes impressos com o endereço antigo seguem abrindo
// a página pelo redirecionamento de /e/<evento>/categoria/<antigo> quando o novo começa pelo antigo.

async function main() {
  const executar = temFlag("executar");
  const slug = argumento("slug");
  const eventos = await db().evento.findMany({
    where: slug ? { slug } : { categorias: { some: {} } },
    select: { id: true, slug: true, categorias: { orderBy: [{ ordem: "asc" }, { id: "asc" }], select: { id: true, nome: true, slug: true } } },
  });
  if (eventos.length === 0) {
    console.info(slug ? `Evento ${slug} não encontrado.` : "Nenhum evento com categorias.");
    return;
  }

  let mudancas = 0;
  for (const evento of eventos) {
    const novos = enderecosDasCategorias(evento.categorias.map((c) => c.nome));
    const trocas = evento.categorias.map((c, i) => ({ ...c, novo: novos[i] })).filter((c) => c.slug !== c.novo);
    console.info(`\n[${evento.slug}] ${evento.categorias.length} categoria(s), ${trocas.length} endereço(s) a corrigir`);
    for (const c of evento.categorias) {
      const novo = novos[evento.categorias.indexOf(c)];
      console.info(`  ${c.nome}: /e/${evento.slug}/${novo}${c.slug !== novo ? `   (era /e/${evento.slug}/categoria/${c.slug})` : ""}`);
    }
    mudancas += trocas.length;
    if (!executar || trocas.length === 0) continue;
    // Em duas etapas, numa transação: endereços que trocam entre si não colidem no índice único (evento, endereço).
    await db().$transaction(async (tx) => {
      for (const c of trocas) await tx.categoria.update({ where: { id: c.id }, data: { slug: `x${randomBytes(8).toString("hex")}` } });
      for (const c of trocas) await tx.categoria.update({ where: { id: c.id }, data: { slug: c.novo } });
    });
    console.info("  gravado.");
  }
  if (!executar && mudancas > 0) console.info("\nSimulação: nada foi gravado. Rode de novo com --executar para corrigir.");
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => desconectarBanco());
