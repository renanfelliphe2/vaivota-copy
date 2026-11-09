-- Categorias do evento (09/11/2026, Festival Ver e Fazer Filmes): cada categoria tem os seus itens, a sua página, o seu QR Code e
-- o seu voto popular (uma pessoa vota uma vez em CADA categoria). Aditiva: tabelas novas e uma coluna opcional em candidato; o
-- código anterior segue funcionando (evento sem categorias continua com a urna única).

-- AlterTable
ALTER TABLE "candidato" ADD COLUMN     "categoria_id" TEXT;

-- CreateTable
CREATE TABLE "categoria" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "premio" VARCHAR(80),
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participacao_categoria" (
    "participacao_id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,

    CONSTRAINT "participacao_categoria_pkey" PRIMARY KEY ("participacao_id","categoria_id")
);

-- CreateIndex
CREATE INDEX "categoria_evento_id_ordem_idx" ON "categoria"("evento_id", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_evento_id_slug_key" ON "categoria"("evento_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_id_evento_id_key" ON "categoria"("id", "evento_id");

-- CreateIndex
CREATE INDEX "participacao_categoria_evento_id_categoria_id_idx" ON "participacao_categoria"("evento_id", "categoria_id");

-- CreateIndex
CREATE INDEX "candidato_categoria_id_evento_id_idx" ON "candidato"("categoria_id", "evento_id");

-- AddForeignKey
ALTER TABLE "categoria" ADD CONSTRAINT "categoria_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidato" ADD CONSTRAINT "candidato_categoria_id_evento_id_fkey" FOREIGN KEY ("categoria_id", "evento_id") REFERENCES "categoria"("id", "evento_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacao_categoria" ADD CONSTRAINT "participacao_categoria_participacao_id_evento_id_fkey" FOREIGN KEY ("participacao_id", "evento_id") REFERENCES "participacao"("id", "evento_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacao_categoria" ADD CONSTRAINT "participacao_categoria_categoria_id_evento_id_fkey" FOREIGN KEY ("categoria_id", "evento_id") REFERENCES "categoria"("id", "evento_id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- CHECKs que o Prisma não expressa
ALTER TABLE "categoria"
  ADD CONSTRAINT "chk_categoria_nome" CHECK (char_length(btrim("nome")) >= 2),
  ADD CONSTRAINT "chk_categoria_slug" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ADD CONSTRAINT "chk_categoria_ordem" CHECK ("ordem" >= 0);
