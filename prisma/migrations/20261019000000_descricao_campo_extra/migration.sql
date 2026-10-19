UPDATE "campo_candidato" AS campo
SET "ordem" = campo."ordem" + 1
WHERE NOT EXISTS (
    SELECT 1
    FROM "campo_candidato" AS descricao
    WHERE descricao."evento_id" = campo."evento_id"
      AND descricao."chave" = 'descricao'
);

INSERT INTO "campo_candidato" ("id", "evento_id", "chave", "rotulo", "ordem")
SELECT gen_random_uuid()::text, evento."id", 'descricao', 'Descrição', 1
FROM "evento" AS evento
WHERE NOT EXISTS (
    SELECT 1
    FROM "campo_candidato" AS campo
    WHERE campo."evento_id" = evento."id"
      AND campo."chave" = 'descricao'
);

UPDATE "candidato"
SET "campos_extras" = COALESCE("campos_extras", '{}'::jsonb) || jsonb_build_object('descricao', "descricao")
WHERE "descricao" IS NOT NULL
  AND btrim("descricao") <> '';

ALTER TABLE "candidato" DROP COLUMN "descricao";
