-- Telão em outro aparelho (25/11/2026): o palco do admin mostra um código; outro aparelho o digita em /e/<slug>/telao/parear e
-- vira o telão, comandado pelo controle remoto de quem gerou o código. Só tabelas novas (aditiva): nada do que já existe muda.
--  - telao_remoto: a sessão (código, token do aparelho em hash, modo, cópia da apresentação e o último estado do telão);
--  - comando_telao: os botões do controle a caminho do telão.

-- CreateEnum
CREATE TYPE "EstadoTelaoRemoto" AS ENUM ('AGUARDANDO', 'PAREADO', 'ENCERRADO');

-- CreateTable
CREATE TABLE "telao_remoto" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "criado_por_id" TEXT NOT NULL,
    "hash_codigo" VARCHAR(64) NOT NULL,
    "codigo" VARCHAR(16),
    "estado" "EstadoTelaoRemoto" NOT NULL DEFAULT 'AGUARDANDO',
    "hash_token" VARCHAR(64),
    "instancia" VARCHAR(64),
    "modo" JSONB NOT NULL,
    "apresentacao" JSONB,
    "versao_apresentacao" INTEGER NOT NULL DEFAULT 0,
    "estado_palco" JSONB,
    "ultimo_sinal_em" TIMESTAMPTZ(3),
    "pareado_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telao_remoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comando_telao" (
    "id" SERIAL NOT NULL,
    "telao_id" TEXT NOT NULL,
    "comando" VARCHAR(20) NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comando_telao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telao_remoto_hash_token_key" ON "telao_remoto"("hash_token");

-- CreateIndex
CREATE INDEX "telao_remoto_evento_id_estado_idx" ON "telao_remoto"("evento_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "telao_remoto_evento_id_hash_codigo_key" ON "telao_remoto"("evento_id", "hash_codigo");

-- CreateIndex
CREATE INDEX "comando_telao_telao_id_id_idx" ON "comando_telao"("telao_id", "id");

-- AddForeignKey
ALTER TABLE "telao_remoto" ADD CONSTRAINT "telao_remoto_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telao_remoto" ADD CONSTRAINT "telao_remoto_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comando_telao" ADD CONSTRAINT "comando_telao_telao_id_fkey" FOREIGN KEY ("telao_id") REFERENCES "telao_remoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
