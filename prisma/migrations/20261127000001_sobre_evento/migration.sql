-- "Sobre o evento" (demanda C2, 25/11/2026): título, texto e imagem opcionais no fim da página. Aditiva: colunas opcionais.

-- AlterTable
ALTER TABLE "evento" ADD COLUMN     "sobre_imagem_url" VARCHAR(500),
ADD COLUMN     "sobre_texto" TEXT,
ADD COLUMN     "sobre_titulo" VARCHAR(120);
