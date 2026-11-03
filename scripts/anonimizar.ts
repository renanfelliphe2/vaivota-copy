import { argumento, temFlag } from "./_ambiente";
import { anonimizarVencidos } from "@/server/anonimizacao";
import { desconectarBanco } from "@/server/db";

// Retenção de dados pessoais: `pnpm db:anonimizar` (simulação) e `pnpm db:anonimizar --executar`. Anonimiza nome e e-mail de quem só
// participou de eventos concluídos com o prazo de anonimização vencido (`prazoAnonimizacaoDias`, 90 por padrão). NÃO DESFAZ: faça o
// backup (`pnpm db:backup`) e exporte o que a organização precisar antes. Sem `--executar` nada é alterado.
// Opções: --incluir-admins (também os administradores e os convites de admin dos eventos vencidos), --limite <n> (no máximo n pessoas).
// Este mesmo código roda sozinho, em lotes, na manutenção periódica do servidor; o script serve para conferir antes e para fazer tudo de uma vez.

async function main() {
  const executar = temFlag("executar");
  const bruto = argumento("limite");
  const limite = bruto === undefined ? undefined : Number(bruto);
  if (limite !== undefined && (!Number.isInteger(limite) || limite < 1)) throw new Error(`--limite deve ser um número inteiro maior que zero (veio "${bruto}").`);

  const r = await anonimizarVencidos({ executar, incluirAdmins: temFlag("incluir-admins"), limite });
  if (r.eventosVencidos.length === 0) {
    console.info("Nenhum evento concluído com o prazo de anonimização vencido. Nada a fazer.");
    return;
  }
  console.info(`Eventos com o prazo vencido: ${r.eventosVencidos.map((e) => e.slug).join(", ")}.`);
  console.info(`Pessoas que entram pela regra: ${r.elegiveis}.`);
  if (r.adminsPreservados > 0) console.info(`Administradores preservados: ${r.adminsPreservados} (use --incluir-admins para anonimizá-los também).`);
  if (!executar) {
    console.info("Simulação: nada foi alterado. Faça o backup (pnpm db:backup), exporte o que precisar e rode de novo com --executar.");
    return;
  }
  console.info(`Anonimizadas agora: ${r.anonimizados}.`);
  if (r.convitesAdminAnonimizados > 0) console.info(`Convites de admin anonimizados: ${r.convitesAdminAnonimizados}.`);
  if (limite !== undefined && r.elegiveis > r.anonimizados) console.info(`Restam ${r.elegiveis - r.anonimizados} pessoa(s); rode de novo para continuar.`);
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => desconectarBanco());
