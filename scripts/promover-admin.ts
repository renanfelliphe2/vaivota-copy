import "./_ambiente";
import { argumento, temFlag } from "./_ambiente";
import { desconectarBanco } from "@/server/db";
import { promoverAdmin, promoverAdminEmTodos } from "@/server/semente";

// ST0: `pnpm db:promover-admin <e-mail> [--slug maratona-tech-tivit | --todos]`. Quem já tem conta vira admin na hora; quem ainda
// não tem recebe um convite de admin, que vale quando a pessoa entrar com esse e-mail já verificado. `--todos` faz isso em todos
// os eventos do banco (rode de novo depois de semear um evento novo).

const TEXTO = {
  promovido: "agora é admin do evento.",
  ja_era_admin: "já era admin do evento.",
  convite_criado: "ainda não tem conta: o convite de admin foi criado e vale quando a pessoa entrar com este e-mail verificado.",
  convite_ja_existia: "ainda não tem conta: o convite de admin já existia e segue valendo.",
} as const;

async function main() {
  const email = process.argv.slice(2).find((a) => a.includes("@"));
  if (!email) throw new Error("Uso: pnpm db:promover-admin <e-mail> [--slug maratona-tech-tivit | --todos]");
  if (temFlag("todos")) {
    const resultados = await promoverAdminEmTodos(email);
    if (resultados.length === 0) throw new Error("Não há nenhum evento no banco. Rode o seed antes.");
    for (const { slug, resultado } of resultados) {
      if ("erro" in resultado) {
        console.error(`[${slug}] ${resultado.erro}`);
        process.exitCode = 1;
      } else console.info(`[${slug}] ${resultado.email} ${TEXTO[resultado.acao]}`);
    }
    return;
  }
  const r = await promoverAdmin(argumento("slug") ?? process.env.SEED_SLUG ?? "maratona-tech-tivit", email);
  console.info(`${r.email} ${TEXTO[r.acao]}`);
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => desconectarBanco());
