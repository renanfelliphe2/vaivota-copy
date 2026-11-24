-- Link do site do patrocinador (24/11/2026): opcional; a logo na página do evento leva a ele. Aditiva: coluna opcional, o código
-- anterior segue funcionando.

-- AlterTable
ALTER TABLE "parceiro" ADD COLUMN     "link_url" VARCHAR(300);
