-- Grupos de parceiros (demanda C1, 25/11/2026): um parceiro pode estar em vários. Todo evento ganha Patrocínio e Realização, e os
-- parceiros que já existem vão para Patrocínio. Aditiva: tabelas novas; o código anterior segue funcionando.

-- CreateTable
CREATE TABLE "grupo_parceiro" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "nome" VARCHAR(40) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "grupo_parceiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parceiro_grupo" (
    "grupo_id" TEXT NOT NULL,
    "parceiro_id" TEXT NOT NULL,

    CONSTRAINT "parceiro_grupo_pkey" PRIMARY KEY ("grupo_id","parceiro_id")
);

-- CreateIndex
CREATE INDEX "grupo_parceiro_evento_id_ordem_idx" ON "grupo_parceiro"("evento_id", "ordem");

-- CreateIndex
CREATE INDEX "parceiro_grupo_parceiro_id_idx" ON "parceiro_grupo"("parceiro_id");

-- AddForeignKey
ALTER TABLE "grupo_parceiro" ADD CONSTRAINT "grupo_parceiro_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parceiro_grupo" ADD CONSTRAINT "parceiro_grupo_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupo_parceiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parceiro_grupo" ADD CONSTRAINT "parceiro_grupo_parceiro_id_fkey" FOREIGN KEY ("parceiro_id") REFERENCES "parceiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CHECKs: nome do grupo com 2 caracteres ou mais e ordem >= 0 (as mesmas regras do serviço).
ALTER TABLE "grupo_parceiro" ADD CONSTRAINT "grupo_parceiro_nome_check" CHECK (char_length(btrim("nome")) >= 2);
ALTER TABLE "grupo_parceiro" ADD CONSTRAINT "grupo_parceiro_ordem_check" CHECK ("ordem" >= 0);

-- Dados: os dois grupos padrão em todo evento, e os parceiros atuais em Patrocínio.
INSERT INTO "grupo_parceiro" ("id", "evento_id", "nome", "ordem", "atualizado_em")
SELECT gen_random_uuid()::text, e."id", g."nome", g."ordem", CURRENT_TIMESTAMP
FROM "evento" e
CROSS JOIN (VALUES ('Patrocínio', 1), ('Realização', 2)) AS g("nome", "ordem");

INSERT INTO "parceiro_grupo" ("grupo_id", "parceiro_id")
SELECT g."id", p."id"
FROM "parceiro" p
JOIN "grupo_parceiro" g ON g."evento_id" = p."evento_id" AND g."nome" = 'Patrocínio';
