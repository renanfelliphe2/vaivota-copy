-- Descrição opcional da categoria (23/11/2026): aparece no topo da página da categoria. Aditiva: coluna opcional, o código
-- anterior segue funcionando.

-- AlterTable
ALTER TABLE "categoria" ADD COLUMN     "descricao" VARCHAR(600);
