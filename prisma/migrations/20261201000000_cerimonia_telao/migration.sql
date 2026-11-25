-- Cerimônia no telão (25/11/2026). Aditiva: nada existente muda.
--  - config_apresentacao.trofeus: troféus por tipo de votação (ligado, por categoria ou no evento todo, com ou sem os votos);
--  - config_apresentacao.ordem_revelacao: a ordem da revelação (modelo, do último para o 1º, lista personalizada);
--  - categoria.podio_tamanho: quantas posições a revelação mostra (1 = só o vencedor);
--  - categoria.podio_votos: em quais posições aparecem os votos e a porcentagem (sem valor, só no 1º);
--  - categoria.mensagem_telao: na categoria do totem, a frase no lugar do QR Code (sem valor, "Vote nos totens").
-- Os dois JSON são validados no domínio (src/dominio/apresentacao/cerimonia.ts); null = o padrão.

-- AlterTable
ALTER TABLE "config_apresentacao" ADD COLUMN "trofeus" JSONB,
ADD COLUMN "ordem_revelacao" JSONB;

-- AlterTable
ALTER TABLE "categoria" ADD COLUMN "podio_tamanho" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "podio_votos" BOOLEAN[] DEFAULT ARRAY[]::BOOLEAN[],
ADD COLUMN "mensagem_telao" VARCHAR(60);

ALTER TABLE "categoria" ADD CONSTRAINT "categoria_podio_tamanho_check" CHECK ("podio_tamanho" BETWEEN 1 AND 10);
