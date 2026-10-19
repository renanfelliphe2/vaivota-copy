import "./_ambiente";
import { argumento } from "./_ambiente";
import { desconectarBanco } from "@/server/db";
import { promoverAdmin } from "@/server/semente";

// ST0: `pnpm db:promover-admin <e-mail> [--slug maratona-tech-tivit]`. Quem já tem conta vira admin na hora; quem ainda não tem
// recebe um convite de admin, que vale quando a pessoa entrar com esse e-mail já verificado.

async function main() {
  const email = process.argv.slice(2).find((a) => a.includes("@"));
  if (!email) throw new Error("Uso: pnpm db:promover-admin <e-mail> [--slug maratona-tech-tivit]");
  const r = await promoverAdmin(argumento("slug") ?? process.env.SEED_SLUG ?? "maratona-tech-tivit", email);
  const texto = {
    promovido: "agora é admin do evento.",
    ja_era_admin: "já era admin do evento.",
    convite_criado: "ainda não tem conta: o convite de admin foi criado e vale quando a pessoa entrar com este e-mail verificado.",
    convite_ja_existia: "ainda não tem conta: o convite de admin já existia e segue valendo.",
  }[r.acao];
  console.info(`${r.email} ${texto}`);
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => desconectarBanco());
