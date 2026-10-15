import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

// Sobe um PostgreSQL de verdade (embedded-postgres), aplica TODAS as migrações de prisma/migrations e expõe as variáveis
// de ambiente que o código do servidor lê. Um banco por execução, apagado no fim.

function portaLivre(): Promise<number> {
  return new Promise((resolver, rejeitar) => {
    const servidor = net.createServer();
    servidor.listen(0, "127.0.0.1", () => {
      const { port } = servidor.address() as net.AddressInfo;
      servidor.close(() => resolver(port));
    });
    servidor.on("error", rejeitar);
  });
}

export default async function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vaivota-pg-"));
  const port = await portaLivre();
  const pg = new EmbeddedPostgres({
    databaseDir: dir,
    user: "postgres",
    password: "postgres",
    port,
    persistent: false,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: () => {},
    onError: () => {},
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("vaivota");

  const cliente = pg.getPgClient("vaivota");
  await cliente.connect();
  const migracoes = path.resolve("prisma/migrations");
  for (const pasta of fs.readdirSync(migracoes).sort()) {
    const arquivo = path.join(migracoes, pasta, "migration.sql");
    if (fs.existsSync(arquivo)) await cliente.query(fs.readFileSync(arquivo, "utf8"));
  }
  await cliente.end();

  process.env.DATABASE_URL = `postgres://postgres:postgres@127.0.0.1:${port}/vaivota`;
  process.env.DB_POOL_MAX = "20";
  process.env.BETTER_AUTH_SECRET = "segredo-de-teste-com-mais-de-32-caracteres-ok";
  process.env.APP_URL = "http://localhost:3000";
  process.env.EMAIL_PROVIDER = "console";
  process.env.STORAGE_PROVIDER = "local";
  process.env.IP_HASH_SALT = "sal-de-teste";

  return async () => {
    await pg.stop().catch(() => {});
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
    } catch {
      // Windows ainda segura arquivos por um instante; é pasta temporária, o sistema limpa depois.
    }
  };
}
