-- Tipo do campo extra (24/11/2026): texto, número, data, link ou vídeo (o link de um vídeo do YouTube, Vimeo ou Google Drive,
-- mostrado num iframe; o vídeo não fica no sistema). Os campos que já existem ficam como TEXTO; os valores dos itens
-- (candidato.campos_extras) não mudam.

-- CreateEnum
CREATE TYPE "TipoCampo" AS ENUM ('TEXTO', 'NUMERO', 'DATA', 'LINK', 'VIDEO');

-- AlterTable
ALTER TABLE "campo_candidato" ADD COLUMN "tipo" "TipoCampo" NOT NULL DEFAULT 'TEXTO';
