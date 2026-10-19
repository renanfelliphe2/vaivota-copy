-- Ordem dos candidatos na votação (19/10/2026): substitui a ordenação manual. Aleatória (padrão) embaralha a cada
-- carga da página; alfabética mostra sempre A–Z. Só acrescenta: o código anterior segue funcionando com a coluna nova.
CREATE TYPE "OrdemCandidatos" AS ENUM ('ALEATORIA', 'ALFABETICA');

ALTER TABLE "evento" ADD COLUMN "ordem_candidatos" "OrdemCandidatos" NOT NULL DEFAULT 'ALEATORIA';
