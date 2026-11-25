-- Sincronização dos totens (página Totens, 24/11/2026): o último relatório de cada aparelho e o pedido de sincronização do admin.
-- Só colunas novas e opcionais: nenhum dado existente muda.

-- AlterTable
ALTER TABLE "dispositivo" ADD COLUMN "ultimo_sinal_em" TIMESTAMPTZ(3),
ADD COLUMN "situacao_relatada" VARCHAR(40),
ADD COLUMN "tela_cheia" BOOLEAN,
ADD COLUMN "sincronizacao_pedida_em" TIMESTAMPTZ(3);
