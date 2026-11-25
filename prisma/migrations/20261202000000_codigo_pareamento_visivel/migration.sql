-- Pareamento do totem (25/11/2026): o código não vence mais e o admin pode vê-lo de novo enquanto não for usado.
--  - codigo_pareamento.codigo: o código legível, só enquanto DISPONIVEL (apagado ao ser usado ou descartado);
--  - codigo_pareamento.validade_ate: deixa de ser obrigatória (os códigos novos não têm validade; os antigos mantêm a sua).
ALTER TABLE "codigo_pareamento" ADD COLUMN "codigo" VARCHAR(16);
ALTER TABLE "codigo_pareamento" ALTER COLUMN "validade_ate" DROP NOT NULL;
