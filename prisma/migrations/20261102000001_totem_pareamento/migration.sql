-- Totem do Festival (02/11/2026): o admin define o nome e o PIN de saída do quiosque ao gerar o código de pareamento;
-- os dois passam ao dispositivo quando o código é usado. Só acrescenta colunas opcionais: o código anterior segue funcionando.
-- `dispositivo`, `codigo_pareamento` e `voto_infantil` já existiam desde a migração inicial.

-- AlterTable
ALTER TABLE "codigo_pareamento" ADD COLUMN     "nome" VARCHAR(120),
ADD COLUMN     "hash_pin" VARCHAR(255);

-- CreateIndex
CREATE INDEX "codigo_pareamento_evento_id_estado_idx" ON "codigo_pareamento"("evento_id", "estado");
