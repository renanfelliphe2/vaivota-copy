-- Campos extras por categoria (demanda D1, 25/11/2026). Os campos deixam de ser do evento inteiro e passam a ser de cada
-- categoria. Migração de dados: cada campo do evento é copiado para TODAS as categorias do evento, com a mesma chave, o mesmo
-- rótulo e a mesma ordem. Os valores dos itens (candidato.campos_extras, por chave) não mudam: nenhum valor se perde.
-- Todo evento tem ao menos uma categoria desde 20261125000000_canal_categoria_totem.
-- Numa transação só: se algo falhar, nada fica pela metade.

BEGIN;

-- AlterTable
ALTER TABLE "campo_candidato" ADD COLUMN "categoria_id" TEXT;

-- DropIndex (antes das cópias: a mesma chave passa a se repetir no evento, uma vez por categoria)
DROP INDEX "campo_candidato_evento_id_chave_key";

-- Dados: uma cópia de cada campo em cada categoria do evento; os originais (sem categoria) saem.
INSERT INTO "campo_candidato" ("id", "evento_id", "categoria_id", "chave", "rotulo", "ordem")
SELECT gen_random_uuid()::text, campo.evento_id, cat.id, campo.chave, campo.rotulo, campo.ordem
FROM "campo_candidato" campo
JOIN "categoria" cat ON cat.evento_id = campo.evento_id
WHERE campo.categoria_id IS NULL;

DELETE FROM "campo_candidato" WHERE "categoria_id" IS NULL;

ALTER TABLE "campo_candidato" ALTER COLUMN "categoria_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "campo_candidato_categoria_id_chave_key" ON "campo_candidato"("categoria_id", "chave");

-- CreateIndex
CREATE INDEX "campo_candidato_evento_id_idx" ON "campo_candidato"("evento_id");

-- AddForeignKey
ALTER TABLE "campo_candidato" ADD CONSTRAINT "campo_candidato_categoria_id_evento_id_fkey" FOREIGN KEY ("categoria_id", "evento_id") REFERENCES "categoria"("id", "evento_id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
