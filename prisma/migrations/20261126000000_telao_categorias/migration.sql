-- Telão alternando entre as categorias (demanda B2, 25/11/2026): intervalo da troca e o que mostrar na tela da votação ao vivo.
-- Aditiva: colunas com padrão, o código anterior segue funcionando.

-- AlterTable
ALTER TABLE "config_apresentacao" ADD COLUMN     "telao_intervalo_segundos" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "telao_mostrar_candidatos" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "telao_mostrar_tempo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "telao_mostrar_qr" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "telao_mostrar_link" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "config_apresentacao" ADD CONSTRAINT "config_apresentacao_telao_intervalo_check" CHECK ("telao_intervalo_segundos" BETWEEN 5 AND 300);
ALTER TABLE "config_apresentacao" ADD CONSTRAINT "config_apresentacao_telao_mostrar_check"
  CHECK ("telao_mostrar_candidatos" OR "telao_mostrar_tempo" OR "telao_mostrar_qr" OR "telao_mostrar_link");
