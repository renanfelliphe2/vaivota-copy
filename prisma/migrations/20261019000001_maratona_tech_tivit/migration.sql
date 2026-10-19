UPDATE "evento"
SET "nome" = 'Maratona Tech Tivit',
    "descricao" = replace("descricao", 'Semana Tech', 'Maratona Tech Tivit')
WHERE "slug" = 'semana-tech';

UPDATE "tema"
SET "nome_exibicao" = CASE
        WHEN "nome_exibicao" IN ('Semana Tech', 'Maratona Tech TIVIT') THEN 'Maratona Tech Tivit'
        ELSE "nome_exibicao"
    END,
    "textos_estado" = CASE
        WHEN "textos_estado" IS NULL THEN NULL
        ELSE replace(replace("textos_estado"::text, 'Semana Tech', 'Maratona Tech Tivit'), 'Maratona Tech TIVIT', 'Maratona Tech Tivit')::jsonb
    END
WHERE "evento_id" IN (
    SELECT "id"
    FROM "evento"
    WHERE "slug" = 'semana-tech'
);

UPDATE "evento"
SET "slug" = 'maratona-tech-tivit'
WHERE "slug" = 'semana-tech';
