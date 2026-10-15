-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EstadoEvento" AS ENUM ('RASCUNHO', 'ATIVO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "EstadoUrna" AS ENUM ('NAO_INICIADA', 'ABERTA', 'ENCERRADA');

-- CreateEnum
CREATE TYPE "MetodoIdentificacao" AS ENUM ('GOOGLE_OU_EMAIL', 'SOMENTE_GOOGLE', 'SOMENTE_EMAIL');

-- CreateEnum
CREATE TYPE "PapelParticipacao" AS ENUM ('PUBLICO', 'JURADO', 'ADMIN');

-- CreateEnum
CREATE TYPE "EstadoConvite" AS ENUM ('DISPONIVEL', 'USADO', 'REVOGADO');

-- CreateEnum
CREATE TYPE "EstadoConviteAdmin" AS ENUM ('PENDENTE', 'USADO', 'REVOGADO');

-- CreateEnum
CREATE TYPE "EstadoDispositivo" AS ENUM ('ATIVO', 'PAUSADO', 'REVOGADO');

-- CreateEnum
CREATE TYPE "EstadoCodigoPareamento" AS ENUM ('DISPONIVEL', 'USADO', 'EXPIRADO');

-- CreateEnum
CREATE TYPE "RegraDesempate" AS ENUM ('JURI', 'PUBLICO');

-- CreateEnum
CREATE TYPE "ModoAvanco" AS ENUM ('AUTOMATICO', 'MANUAL');

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(191) NOT NULL,
    "email_verificado" BOOLEAN NOT NULL DEFAULT false,
    "imagem" VARCHAR(500),
    "anonimizado_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMPTZ(3),
    "refresh_token_expires_at" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "last_request" BIGINT NOT NULL,

    CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evento" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "nome" VARCHAR(160) NOT NULL,
    "descricao" TEXT,
    "local" VARCHAR(120),
    "link_sobre" VARCHAR(500),
    "fuso_horario" VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo',
    "estado" "EstadoEvento" NOT NULL DEFAULT 'RASCUNHO',
    "estado_urna" "EstadoUrna" NOT NULL DEFAULT 'NAO_INICIADA',
    "janela_inicio" TIMESTAMPTZ(3),
    "janela_fim" TIMESTAMPTZ(3),
    "encerramento_automatico" BOOLEAN NOT NULL DEFAULT true,
    "metodo_identificacao" "MetodoIdentificacao" NOT NULL DEFAULT 'GOOGLE_OU_EMAIL',
    "modulo_juri" BOOLEAN NOT NULL DEFAULT false,
    "modulo_infantil" BOOLEAN NOT NULL DEFAULT false,
    "bloquear_voto_proprio" BOOLEAN NOT NULL DEFAULT true,
    "aviso_privacidade_url" VARCHAR(500),
    "prazo_anonimizacao_dias" INTEGER NOT NULL DEFAULT 90,
    "urna_aberta_em" TIMESTAMPTZ(3),
    "urna_encerrada_em" TIMESTAMPTZ(3),
    "concluido_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tema" (
    "evento_id" TEXT NOT NULL,
    "nome_exibicao" VARCHAR(160),
    "logo_url" VARCHAR(500),
    "capa_url" VARCHAR(500),
    "cor_primaria" VARCHAR(7) NOT NULL DEFAULT '#1F2937',
    "cor_secundaria" VARCHAR(7) NOT NULL DEFAULT '#F59E0B',
    "cor_fundo" VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
    "cor_texto" VARCHAR(7) NOT NULL DEFAULT '#111827',
    "fonte" VARCHAR(80) NOT NULL DEFAULT 'Inter',
    "rotulo_candidato" VARCHAR(40) NOT NULL DEFAULT 'Candidato',
    "rotulo_candidatos" VARCHAR(40) NOT NULL DEFAULT 'Candidatos',
    "textos_estado" JSONB,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tema_pkey" PRIMARY KEY ("evento_id")
);

-- CreateTable
CREATE TABLE "config_placar" (
    "evento_id" TEXT NOT NULL,
    "peso_popular" INTEGER NOT NULL DEFAULT 100,
    "peso_juri" INTEGER NOT NULL DEFAULT 0,
    "peso_infantil" INTEGER NOT NULL DEFAULT 0,
    "regra_desempate" "RegraDesempate" NOT NULL DEFAULT 'JURI',
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "config_placar_pkey" PRIMARY KEY ("evento_id")
);

-- CreateTable
CREATE TABLE "config_apresentacao" (
    "evento_id" TEXT NOT NULL,
    "trailer_url" VARCHAR(500),
    "usar_trailer_gerado" BOOLEAN NOT NULL DEFAULT false,
    "incluir_candidatos_trailer" BOOLEAN NOT NULL DEFAULT false,
    "classificacao_completa" BOOLEAN NOT NULL DEFAULT false,
    "modo_avanco" "ModoAvanco" NOT NULL DEFAULT 'AUTOMATICO',
    "rotulo_categoria_publico" VARCHAR(80) NOT NULL DEFAULT 'Queridinho do público',
    "rotulo_categoria_infantil" VARCHAR(80) NOT NULL DEFAULT 'Preferido das crianças',
    "rotulo_categoria_juri" VARCHAR(80) NOT NULL DEFAULT 'Escolha dos jurados',
    "parcial_ao_vivo" BOOLEAN NOT NULL DEFAULT false,
    "limiar_reta_final_segundos" INTEGER NOT NULL DEFAULT 300,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "config_apresentacao_pkey" PRIMARY KEY ("evento_id")
);

-- CreateTable
CREATE TABLE "campo_candidato" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "chave" VARCHAR(40) NOT NULL,
    "rotulo" VARCHAR(80) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "campo_candidato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidato" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "descricao" TEXT,
    "imagem_url" VARCHAR(500),
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "desqualificado" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "campos_extras" JSONB,
    "usuario_vinculado_id" TEXT,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "candidato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participacao" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "papel" "PapelParticipacao" NOT NULL DEFAULT 'PUBLICO',
    "votou" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "participacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voto" (
    "id" SERIAL NOT NULL,
    "evento_id" TEXT NOT NULL,
    "candidato_id" TEXT NOT NULL,
    "hash_recibo" VARCHAR(64) NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convite_jurado" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "hash_codigo" VARCHAR(64) NOT NULL,
    "rotulo" VARCHAR(120),
    "validade_ate" TIMESTAMPTZ(3),
    "estado" "EstadoConvite" NOT NULL DEFAULT 'DISPONIVEL',
    "participacao_id" TEXT,
    "resgatado_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "convite_jurado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voto_juri" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "participacao_id" TEXT NOT NULL,
    "candidato_id" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "voto_juri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_voto_juri" (
    "id" SERIAL NOT NULL,
    "voto_juri_id" TEXT NOT NULL,
    "candidato_anterior_id" TEXT,
    "candidato_novo_id" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_voto_juri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispositivo" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "hash_token" VARCHAR(64) NOT NULL,
    "hash_pin" VARCHAR(255),
    "estado" "EstadoDispositivo" NOT NULL DEFAULT 'ATIVO',
    "ultimo_uso_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispositivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codigo_pareamento" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "hash_codigo" VARCHAR(64) NOT NULL,
    "validade_ate" TIMESTAMPTZ(3) NOT NULL,
    "estado" "EstadoCodigoPareamento" NOT NULL DEFAULT 'DISPONIVEL',
    "dispositivo_id" TEXT,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codigo_pareamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voto_infantil" (
    "id" SERIAL NOT NULL,
    "evento_id" TEXT NOT NULL,
    "candidato_id" TEXT NOT NULL,
    "dispositivo_id" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voto_infantil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convite_admin" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "email" VARCHAR(191) NOT NULL,
    "estado" "EstadoConviteAdmin" NOT NULL DEFAULT 'PENDENTE',
    "resgatado_por_id" TEXT,
    "resgatado_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "convite_admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resultado_oficial" (
    "id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "versao" INTEGER NOT NULL,
    "motivo" VARCHAR(40) NOT NULL,
    "peso_popular" INTEGER NOT NULL,
    "peso_juri" INTEGER NOT NULL,
    "peso_infantil" INTEGER NOT NULL,
    "dados" JSONB NOT NULL,
    "calculado_por_id" TEXT,
    "calculado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resultado_oficial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "evento_id" TEXT,
    "ator_usuario_id" TEXT,
    "ator_dispositivo_id" TEXT,
    "acao" VARCHAR(64) NOT NULL,
    "entidade" VARCHAR(64),
    "entidade_id" VARCHAR(64),
    "detalhes" JSONB,
    "ip_hash" VARCHAR(64),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_user_id_idx" ON "session"("user_id");

-- CreateIndex
CREATE INDEX "account_user_id_idx" ON "account"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_provider_id_account_id_key" ON "account"("provider_id", "account_id");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_key_key" ON "rate_limit"("key");

-- CreateIndex
CREATE UNIQUE INDEX "evento_slug_key" ON "evento"("slug");

-- CreateIndex
CREATE INDEX "evento_estado_idx" ON "evento"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "campo_candidato_evento_id_chave_key" ON "campo_candidato"("evento_id", "chave");

-- CreateIndex
CREATE INDEX "candidato_evento_id_publicado_idx" ON "candidato"("evento_id", "publicado");

-- CreateIndex
CREATE UNIQUE INDEX "candidato_id_evento_id_key" ON "candidato"("id", "evento_id");

-- CreateIndex
CREATE INDEX "participacao_evento_id_papel_idx" ON "participacao"("evento_id", "papel");

-- CreateIndex
CREATE UNIQUE INDEX "participacao_usuario_id_evento_id_key" ON "participacao"("usuario_id", "evento_id");

-- CreateIndex
CREATE UNIQUE INDEX "participacao_id_evento_id_key" ON "participacao"("id", "evento_id");

-- CreateIndex
CREATE UNIQUE INDEX "voto_hash_recibo_key" ON "voto"("hash_recibo");

-- CreateIndex
CREATE INDEX "voto_evento_id_candidato_id_idx" ON "voto"("evento_id", "candidato_id");

-- CreateIndex
CREATE INDEX "voto_evento_id_criado_em_idx" ON "voto"("evento_id", "criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "convite_jurado_participacao_id_key" ON "convite_jurado"("participacao_id");

-- CreateIndex
CREATE INDEX "convite_jurado_evento_id_estado_idx" ON "convite_jurado"("evento_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "convite_jurado_evento_id_hash_codigo_key" ON "convite_jurado"("evento_id", "hash_codigo");

-- CreateIndex
CREATE INDEX "voto_juri_evento_id_candidato_id_idx" ON "voto_juri"("evento_id", "candidato_id");

-- CreateIndex
CREATE UNIQUE INDEX "voto_juri_participacao_id_evento_id_key" ON "voto_juri"("participacao_id", "evento_id");

-- CreateIndex
CREATE INDEX "historico_voto_juri_voto_juri_id_criado_em_idx" ON "historico_voto_juri"("voto_juri_id", "criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "dispositivo_hash_token_key" ON "dispositivo"("hash_token");

-- CreateIndex
CREATE INDEX "dispositivo_evento_id_estado_idx" ON "dispositivo"("evento_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "dispositivo_id_evento_id_key" ON "dispositivo"("id", "evento_id");

-- CreateIndex
CREATE UNIQUE INDEX "codigo_pareamento_evento_id_hash_codigo_key" ON "codigo_pareamento"("evento_id", "hash_codigo");

-- CreateIndex
CREATE INDEX "voto_infantil_evento_id_candidato_id_idx" ON "voto_infantil"("evento_id", "candidato_id");

-- CreateIndex
CREATE INDEX "voto_infantil_evento_id_criado_em_idx" ON "voto_infantil"("evento_id", "criado_em");

-- CreateIndex
CREATE INDEX "voto_infantil_dispositivo_id_criado_em_idx" ON "voto_infantil"("dispositivo_id", "criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "convite_admin_evento_id_email_key" ON "convite_admin"("evento_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "resultado_oficial_evento_id_versao_key" ON "resultado_oficial"("evento_id", "versao");

-- CreateIndex
CREATE INDEX "auditoria_evento_id_criado_em_idx" ON "auditoria"("evento_id", "criado_em");

-- CreateIndex
CREATE INDEX "auditoria_evento_id_acao_idx" ON "auditoria"("evento_id", "acao");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tema" ADD CONSTRAINT "tema_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_placar" ADD CONSTRAINT "config_placar_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_apresentacao" ADD CONSTRAINT "config_apresentacao_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campo_candidato" ADD CONSTRAINT "campo_candidato_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidato" ADD CONSTRAINT "candidato_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidato" ADD CONSTRAINT "candidato_usuario_vinculado_id_fkey" FOREIGN KEY ("usuario_vinculado_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacao" ADD CONSTRAINT "participacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacao" ADD CONSTRAINT "participacao_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voto" ADD CONSTRAINT "voto_candidato_id_evento_id_fkey" FOREIGN KEY ("candidato_id", "evento_id") REFERENCES "candidato"("id", "evento_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convite_jurado" ADD CONSTRAINT "convite_jurado_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convite_jurado" ADD CONSTRAINT "convite_jurado_participacao_id_fkey" FOREIGN KEY ("participacao_id") REFERENCES "participacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voto_juri" ADD CONSTRAINT "voto_juri_participacao_id_evento_id_fkey" FOREIGN KEY ("participacao_id", "evento_id") REFERENCES "participacao"("id", "evento_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voto_juri" ADD CONSTRAINT "voto_juri_candidato_id_evento_id_fkey" FOREIGN KEY ("candidato_id", "evento_id") REFERENCES "candidato"("id", "evento_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_voto_juri" ADD CONSTRAINT "historico_voto_juri_voto_juri_id_fkey" FOREIGN KEY ("voto_juri_id") REFERENCES "voto_juri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_voto_juri" ADD CONSTRAINT "historico_voto_juri_candidato_anterior_id_fkey" FOREIGN KEY ("candidato_anterior_id") REFERENCES "candidato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_voto_juri" ADD CONSTRAINT "historico_voto_juri_candidato_novo_id_fkey" FOREIGN KEY ("candidato_novo_id") REFERENCES "candidato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispositivo" ADD CONSTRAINT "dispositivo_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigo_pareamento" ADD CONSTRAINT "codigo_pareamento_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigo_pareamento" ADD CONSTRAINT "codigo_pareamento_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "dispositivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voto_infantil" ADD CONSTRAINT "voto_infantil_candidato_id_evento_id_fkey" FOREIGN KEY ("candidato_id", "evento_id") REFERENCES "candidato"("id", "evento_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voto_infantil" ADD CONSTRAINT "voto_infantil_dispositivo_id_evento_id_fkey" FOREIGN KEY ("dispositivo_id", "evento_id") REFERENCES "dispositivo"("id", "evento_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convite_admin" ADD CONSTRAINT "convite_admin_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convite_admin" ADD CONSTRAINT "convite_admin_resgatado_por_id_fkey" FOREIGN KEY ("resgatado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultado_oficial" ADD CONSTRAINT "resultado_oficial_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultado_oficial" ADD CONSTRAINT "resultado_oficial_calculado_por_id_fkey" FOREIGN KEY ("calculado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_ator_usuario_id_fkey" FOREIGN KEY ("ator_usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_ator_dispositivo_id_fkey" FOREIGN KEY ("ator_dispositivo_id") REFERENCES "dispositivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─────────────────────────────────────────────
-- CHECKs que o Prisma não expressa (MVP Semana Tech, seção 4 do planner)
-- ─────────────────────────────────────────────

-- Invariante 2: pesos inteiros, cada um >= 0, somando 100.
ALTER TABLE "config_placar"
  ADD CONSTRAINT "chk_config_placar_pesos" CHECK (
    "peso_popular" >= 0 AND "peso_juri" >= 0 AND "peso_infantil" >= 0
    AND "peso_popular" + "peso_juri" + "peso_infantil" = 100
  );

ALTER TABLE "resultado_oficial"
  ADD CONSTRAINT "chk_resultado_oficial_pesos" CHECK (
    "peso_popular" >= 0 AND "peso_juri" >= 0 AND "peso_infantil" >= 0
    AND "peso_popular" + "peso_juri" + "peso_infantil" = 100
  );

-- Invariante 8: candidato publicado tem imagem.
ALTER TABLE "candidato"
  ADD CONSTRAINT "chk_candidato_publicado_com_imagem" CHECK (NOT "publicado" OR "imagem_url" IS NOT NULL);

-- O resultado oficial só tem versões positivas e o motivo é uma das três conhecidas.
ALTER TABLE "resultado_oficial"
  ADD CONSTRAINT "chk_resultado_oficial_versao" CHECK ("versao" >= 1),
  ADD CONSTRAINT "chk_resultado_oficial_motivo" CHECK ("motivo" IN ('ENCERRAMENTO', 'DESQUALIFICACAO', 'CORRECAO'));

-- A ordem de exibição nunca é negativa.
ALTER TABLE "candidato"
  ADD CONSTRAINT "chk_candidato_ordem" CHECK ("ordem" >= 0);

-- Sigilo (C2): a participação não tem horário e o voto não tem usuário. Nada a verificar aqui; o schema já não tem
-- essas colunas. Esta migração não deve acrescentá-las.
