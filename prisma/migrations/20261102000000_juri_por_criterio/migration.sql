-- Júri do Festival (02/11/2026): modo de votação do júri, critérios de avaliação, notas e escolhas por critério.
-- Só acrescenta: o código anterior segue funcionando (o modo novo nasce em VOTO_UNICO, o comportamento de antes).
-- `convite_jurado`, `voto_juri` e `historico_voto_juri` já existiam desde a migração inicial.

-- CreateEnum
CREATE TYPE "ModoVotoJuri" AS ENUM ('VOTO_UNICO', 'NOTAS_POR_CRITERIO', 'MELHOR_POR_CRITERIO');

-- AlterTable
ALTER TABLE "config_placar" ADD COLUMN     "modo_voto_juri" "ModoVotoJuri" NOT NULL DEFAULT 'VOTO_UNICO';

-- CreateTable
CREATE TABLE "criterio_juri" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "criterio_juri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nota_juri" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "participacao_id" TEXT NOT NULL,
    "candidato_id" TEXT NOT NULL,
    "criterio_id" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "nota_juri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escolha_criterio_juri" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "participacao_id" TEXT NOT NULL,
    "criterio_id" TEXT NOT NULL,
    "candidato_id" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "escolha_criterio_juri_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "criterio_juri_evento_id_ordem_idx" ON "criterio_juri"("evento_id", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "criterio_juri_id_evento_id_key" ON "criterio_juri"("id", "evento_id");

-- CreateIndex
CREATE INDEX "nota_juri_evento_id_candidato_id_idx" ON "nota_juri"("evento_id", "candidato_id");

-- CreateIndex
CREATE INDEX "nota_juri_evento_id_criterio_id_idx" ON "nota_juri"("evento_id", "criterio_id");

-- CreateIndex
CREATE UNIQUE INDEX "nota_juri_participacao_id_candidato_id_criterio_id_key" ON "nota_juri"("participacao_id", "candidato_id", "criterio_id");

-- CreateIndex
CREATE INDEX "escolha_criterio_juri_evento_id_candidato_id_idx" ON "escolha_criterio_juri"("evento_id", "candidato_id");

-- CreateIndex
CREATE UNIQUE INDEX "escolha_criterio_juri_participacao_id_criterio_id_key" ON "escolha_criterio_juri"("participacao_id", "criterio_id");

-- AddForeignKey
ALTER TABLE "criterio_juri" ADD CONSTRAINT "criterio_juri_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nota_juri" ADD CONSTRAINT "nota_juri_participacao_id_evento_id_fkey" FOREIGN KEY ("participacao_id", "evento_id") REFERENCES "participacao"("id", "evento_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nota_juri" ADD CONSTRAINT "nota_juri_candidato_id_evento_id_fkey" FOREIGN KEY ("candidato_id", "evento_id") REFERENCES "candidato"("id", "evento_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nota_juri" ADD CONSTRAINT "nota_juri_criterio_id_evento_id_fkey" FOREIGN KEY ("criterio_id", "evento_id") REFERENCES "criterio_juri"("id", "evento_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escolha_criterio_juri" ADD CONSTRAINT "escolha_criterio_juri_participacao_id_evento_id_fkey" FOREIGN KEY ("participacao_id", "evento_id") REFERENCES "participacao"("id", "evento_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escolha_criterio_juri" ADD CONSTRAINT "escolha_criterio_juri_criterio_id_evento_id_fkey" FOREIGN KEY ("criterio_id", "evento_id") REFERENCES "criterio_juri"("id", "evento_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escolha_criterio_juri" ADD CONSTRAINT "escolha_criterio_juri_candidato_id_evento_id_fkey" FOREIGN KEY ("candidato_id", "evento_id") REFERENCES "candidato"("id", "evento_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECKs que o Prisma não expressa
ALTER TABLE "nota_juri"
  ADD CONSTRAINT "chk_nota_juri_faixa" CHECK ("nota" BETWEEN 0 AND 10);

ALTER TABLE "criterio_juri"
  ADD CONSTRAINT "chk_criterio_juri_ordem" CHECK ("ordem" >= 0),
  ADD CONSTRAINT "chk_criterio_juri_nome" CHECK (char_length(btrim("nome")) >= 1);
