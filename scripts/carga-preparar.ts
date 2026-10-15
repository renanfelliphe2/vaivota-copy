import { writeFileSync } from "node:fs";
import { argumento } from "./_ambiente";
import { auth } from "@/server/auth";
import { db, desconectarBanco } from "@/server/db";
import { semearSemanaTech } from "@/server/semente";

// ST6: prepara o teste de carga. Cria um evento de teste (`carga-teste`), com 8 projetos e a urna ABERTA, N contas já
// verificadas e uma sessão para cada uma, gravadas em tests/carga/sessoes.json (para o k6).
// `pnpm db:carga-preparar --usuarios 500` — rode contra um banco de TESTE (staging ou local), nunca o do evento.
// Depois: `k6 run -e BASE_URL=... tests/carga/votar.js`, `pnpm db:carga-conferir` e, para limpar,
// `pnpm db:limpar-ensaio --slug carga-teste --remover-candidatos --confirmar`.

const SENHA = "carga-teste-12345";
const SLUG = "carga-teste";

async function main() {
  const quantidade = Number(argumento("usuarios") ?? 500);
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 5000) throw new Error("--usuarios deve ser de 1 a 5000.");
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--permitir-producao"))
    throw new Error("Recusado em NODE_ENV=production (use um banco de teste).");

  const { eventoId } = await semearSemanaTech({ slug: SLUG, nome: "Teste de carga" });
  await db().evento.update({ where: { id: eventoId }, data: { estado: "ATIVO", estadoUrna: "ABERTA", urnaAbertaEm: new Date() } });
  if ((await db().candidato.count({ where: { eventoId } })) === 0) {
    for (let i = 1; i <= 8; i++) {
      await db().candidato.create({
        data: { eventoId, titulo: `Projeto ${i}`, descricao: `Projeto de teste ${i}`, imagemUrl: "/uploads/carga.png", publicado: true, ordem: i },
      });
    }
  }
  const candidatos = await db().candidato.findMany({ where: { eventoId, publicado: true }, select: { id: true } });

  const contexto = await auth().$context;
  const hash = await contexto.password.hash(SENHA);
  const existentes = new Set(
    (await db().usuario.findMany({ where: { email: { endsWith: "@carga.local" } }, select: { email: true } })).map((u) => u.email),
  );
  for (let i = 1; i <= quantidade; i++) {
    const email = `carga-${i}@carga.local`;
    if (existentes.has(email)) continue;
    const usuario = await db().usuario.create({ data: { nome: `Carga ${i}`, email, emailVerificado: true } });
    await db().account.create({ data: { userId: usuario.id, accountId: usuario.id, providerId: "credential", password: hash } });
    await db().participacao.create({ data: { usuarioId: usuario.id, eventoId, papel: "PUBLICO" } });
  }

  const sessoes: { cookie: string }[] = [];
  const lote = 10;
  for (let inicio = 1; inicio <= quantidade; inicio += lote) {
    const fim = Math.min(quantidade, inicio + lote - 1);
    const respostas = await Promise.all(
      Array.from({ length: fim - inicio + 1 }, (_, k) =>
        auth().api.signInEmail({ body: { email: `carga-${inicio + k}@carga.local`, password: SENHA }, headers: new Headers(), returnHeaders: true }),
      ),
    );
    for (const r of respostas) sessoes.push({ cookie: r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ") });
  }
  writeFileSync("tests/carga/sessoes.json", JSON.stringify({ eventoId, candidatos: candidatos.map((c) => c.id), sessoes }));
  console.info(`Pronto: ${sessoes.length} sessões e ${candidatos.length} projetos em tests/carga/sessoes.json (evento ${SLUG}).`);
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => desconectarBanco());
