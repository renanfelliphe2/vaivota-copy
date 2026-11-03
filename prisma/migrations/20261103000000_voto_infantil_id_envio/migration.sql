-- Totem (03/11/2026): chave aleatória por tentativa de voto. Quando a rede falha, o totem não sabe se o voto chegou; o "tentar de
-- novo" reenvia a mesma chave e o servidor não conta o voto duas vezes. A chave não identifica a criança.
-- Só acrescenta uma coluna opcional e um índice único (NULL não conflita com NULL): o código anterior segue funcionando.

-- AlterTable
ALTER TABLE "voto_infantil" ADD COLUMN     "id_envio" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "voto_infantil_dispositivo_id_id_envio_key" ON "voto_infantil"("dispositivo_id", "id_envio");
