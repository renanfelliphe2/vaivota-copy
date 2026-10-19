UPDATE "tema"
SET "cor_primaria" = '#0097B1',
    "cor_secundaria" = '#7ED958',
    "cor_fundo" = '#FFFFFF',
    "cor_texto" = '#0F172A'
WHERE "evento_id" IN (
    SELECT "id"
    FROM "evento"
    WHERE "slug" = 'maratona-tech-tivit'
)
AND "cor_primaria" = '#38BDF8'
AND "cor_secundaria" = '#A78BFA'
AND "cor_fundo" = '#0F172A'
AND "cor_texto" = '#E2E8F0';
