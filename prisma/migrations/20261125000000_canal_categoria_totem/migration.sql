-- Canal da categoria e categorias do totem (25/11/2026). Cada categoria é votada num canal só: ONLINE (página do evento) ou
-- TOTEM (só nos totens que a exibem). Cada totem exibe uma ou mais categorias TOTEM, escolhidas ao gerar o código de pareamento.
--
-- Também deixa de existir evento sem categoria: cada evento que não tem nenhuma ganha a categoria única "Melhor <rótulo do item>"
-- (ex.: "Melhor Projeto"), com todos os itens sem categoria dentro dela. Quem já votou nesse evento fica marcado como tendo votado
-- nessa categoria (a mesma regra de um voto por pessoa). Os votos não mudam: continuam ligados aos mesmos itens.

-- CreateEnum
CREATE TYPE "CanalCategoria" AS ENUM ('ONLINE', 'TOTEM');

-- AlterTable
ALTER TABLE "categoria" ADD COLUMN     "canal" "CanalCategoria" NOT NULL DEFAULT 'ONLINE';

-- AlterTable
ALTER TABLE "codigo_pareamento" ADD COLUMN     "categoria_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "dispositivo_categoria" (
    "dispositivo_id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,

    CONSTRAINT "dispositivo_categoria_pkey" PRIMARY KEY ("dispositivo_id","categoria_id")
);

-- CreateIndex
CREATE INDEX "dispositivo_categoria_evento_id_categoria_id_idx" ON "dispositivo_categoria"("evento_id", "categoria_id");

-- AddForeignKey
ALTER TABLE "dispositivo_categoria" ADD CONSTRAINT "dispositivo_categoria_dispositivo_id_evento_id_fkey" FOREIGN KEY ("dispositivo_id", "evento_id") REFERENCES "dispositivo"("id", "evento_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispositivo_categoria" ADD CONSTRAINT "dispositivo_categoria_categoria_id_evento_id_fkey" FOREIGN KEY ("categoria_id", "evento_id") REFERENCES "categoria"("id", "evento_id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ─────────────────────────────────────────────
-- Dados: a categoria única dos eventos sem categoria
-- ─────────────────────────────────────────────

CREATE TEMP TABLE "_categoria_unica" AS
SELECT
  e.id AS evento_id,
  gen_random_uuid()::text AS categoria_id,
  left('Melhor ' || COALESCE(NULLIF(btrim(t.rotulo_candidato), ''), 'Candidato'), 60) AS nome
FROM "evento" e
LEFT JOIN "tema" t ON t.evento_id = e.id
WHERE NOT EXISTS (SELECT 1 FROM "categoria" c WHERE c.evento_id = e.id);

-- O endereço segue a regra do app: sem acento, minúsculo, hífen no lugar do resto (ex.: "melhor-projeto").
INSERT INTO "categoria" ("id", "evento_id", "slug", "nome", "canal", "ordem", "atualizado_em")
SELECT
  u.categoria_id,
  u.evento_id,
  COALESCE(
    NULLIF(
      btrim(left(regexp_replace(lower(translate(u.nome,
        'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
        'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')), '[^a-z0-9]+', '-', 'g'), 37), '-'),
      ''),
    'categoria'),
  u.nome,
  'ONLINE',
  1,
  CURRENT_TIMESTAMP
FROM "_categoria_unica" u;

UPDATE "candidato" c
SET "categoria_id" = u.categoria_id
FROM "_categoria_unica" u
WHERE c.evento_id = u.evento_id AND c.categoria_id IS NULL;

INSERT INTO "participacao_categoria" ("participacao_id", "categoria_id", "evento_id")
SELECT p.id, u.categoria_id, p.evento_id
FROM "participacao" p
JOIN "_categoria_unica" u ON u.evento_id = p.evento_id
WHERE p.votou = true AND p.papel = 'PUBLICO'
ON CONFLICT DO NOTHING;

DROP TABLE "_categoria_unica";
