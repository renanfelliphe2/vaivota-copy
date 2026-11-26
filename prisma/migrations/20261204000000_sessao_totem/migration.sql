-- Sessões do totem (logTotem.md, 26/11/2026). A sessão só AGRUPA os votos para a análise no aparelho (uma turma, uma escola):
-- não trava nada. Só acrescenta: tabela nova, uma coluna opcional no voto infantil e uma coluna com padrão no aparelho.
-- Os votos já existentes ficam sem sessão (sessao_id nulo = "antes das sessões") e o código anterior segue funcionando.

-- CreateEnum
CREATE TYPE "MotivoEncerramentoSessao" AS ENUM ('MANUAL', 'INATIVIDADE');

-- AlterTable
ALTER TABLE "dispositivo" ADD COLUMN     "inatividade_sessao_min" INTEGER NOT NULL DEFAULT 60;

-- AlterTable
ALTER TABLE "voto_infantil" ADD COLUMN     "sessao_id" TEXT;

-- CreateTable
CREATE TABLE "sessao_totem" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "dispositivo_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "aberta_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerrada_em" TIMESTAMPTZ(3),
    "motivo_encerramento" "MotivoEncerramentoSessao",
    "criancas_esperadas" INTEGER,
    "funil" JSONB,
    "funil_em" TIMESTAMPTZ(3),

    CONSTRAINT "sessao_totem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sessao_totem_evento_id_aberta_em_idx" ON "sessao_totem"("evento_id", "aberta_em");

-- CreateIndex
CREATE UNIQUE INDEX "sessao_totem_dispositivo_id_numero_key" ON "sessao_totem"("dispositivo_id", "numero");

-- CreateIndex
CREATE INDEX "voto_infantil_sessao_id_criado_em_idx" ON "voto_infantil"("sessao_id", "criado_em");

-- AddForeignKey
ALTER TABLE "voto_infantil" ADD CONSTRAINT "voto_infantil_sessao_id_fkey" FOREIGN KEY ("sessao_id") REFERENCES "sessao_totem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessao_totem" ADD CONSTRAINT "sessao_totem_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessao_totem" ADD CONSTRAINT "sessao_totem_dispositivo_id_evento_id_fkey" FOREIGN KEY ("dispositivo_id", "evento_id") REFERENCES "dispositivo"("id", "evento_id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Uma sessão aberta por aparelho (o voto abre a próxima só depois de encerrar a anterior, na mesma transação).
CREATE UNIQUE INDEX "sessao_totem_uma_aberta_por_dispositivo" ON "sessao_totem"("dispositivo_id") WHERE "encerrada_em" IS NULL;

-- Coerência: encerrada tem motivo (e vice-versa); número e esperadas positivos; inatividade entre 5 min e 24 h.
ALTER TABLE "sessao_totem" ADD CONSTRAINT "sessao_totem_encerramento_check"
  CHECK (("encerrada_em" IS NULL) = ("motivo_encerramento" IS NULL));
ALTER TABLE "sessao_totem" ADD CONSTRAINT "sessao_totem_numero_check" CHECK ("numero" >= 1);
ALTER TABLE "sessao_totem" ADD CONSTRAINT "sessao_totem_criancas_esperadas_check"
  CHECK ("criancas_esperadas" IS NULL OR "criancas_esperadas" BETWEEN 1 AND 100000);
ALTER TABLE "dispositivo" ADD CONSTRAINT "dispositivo_inatividade_sessao_min_check"
  CHECK ("inatividade_sessao_min" BETWEEN 5 AND 1440);
