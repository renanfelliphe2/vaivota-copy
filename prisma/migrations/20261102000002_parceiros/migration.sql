-- Parceiros do evento (02/11/2026): nome e logo de cada parceiro, na ordem da faixa do telão e da página do evento.
-- Só acrescenta uma tabela nova: o código anterior segue funcionando.

-- CreateTable
CREATE TABLE "parceiro" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "logo_url" VARCHAR(500),
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "parceiro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parceiro_evento_id_ordem_idx" ON "parceiro"("evento_id", "ordem");

-- AddForeignKey
ALTER TABLE "parceiro" ADD CONSTRAINT "parceiro_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECKs que o Prisma não expressa
ALTER TABLE "parceiro"
  ADD CONSTRAINT "chk_parceiro_nome" CHECK (char_length(btrim("nome")) >= 2),
  ADD CONSTRAINT "chk_parceiro_ordem" CHECK ("ordem" >= 0);
