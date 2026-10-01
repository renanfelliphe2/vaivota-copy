-- VaiVota — schema MySQL 8.0.16+ (InnoDB, utf8mb4)
-- Baseado no DocumentDesign.md v1.1. Espelha o schema.prisma.
--
-- Fonte da verdade das migrations: Prisma (`prisma migrate`). Este arquivo serve como referência
-- legível em SQL e inclui o que o Prisma não expressa (CHECKs e consultas de exemplo).
--
-- Regras de integridade principais:
--  * Votos e históricos nunca são apagados (ON DELETE RESTRICT). Dados pessoais são anonimizados, não excluídos.
--  * FKs compostas (id, evento_id) impedem que um voto aponte para candidato/participação/dispositivo de OUTRO evento.
--  * Voto popular (`voto`) NÃO tem referência ao usuário (sigilo).
--  * Voto único: UPDATE condicional em `participacao` (votou = 0) + INSERT em `voto`, na mesma transação.

SET NAMES utf8mb4;

-- CREATE DATABASE vaivota CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE vaivota;

-- ─────────────────────────────────────────────
-- Identidade
-- ─────────────────────────────────────────────

CREATE TABLE usuario (
  id                  CHAR(36)     NOT NULL DEFAULT (UUID()),
  nome                VARCHAR(120) NOT NULL,
  email               VARCHAR(191) NOT NULL,
  email_verificado_em DATETIME(3)  NULL,
  senha_hash          VARCHAR(255) NULL,
  anonimizado_em      DATETIME(3)  NULL,
  criado_em           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  atualizado_em       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- Evento e configuração
-- ─────────────────────────────────────────────

CREATE TABLE evento (
  id                      CHAR(36)     NOT NULL DEFAULT (UUID()),
  slug                    VARCHAR(80)  NOT NULL,
  nome                    VARCHAR(160) NOT NULL,
  descricao               TEXT         NULL,
  fuso_horario            VARCHAR(64)  NOT NULL DEFAULT 'America/Sao_Paulo',
  estado                  ENUM('RASCUNHO','ATIVO','CONCLUIDO') NOT NULL DEFAULT 'RASCUNHO',
  estado_urna             ENUM('NAO_INICIADA','ABERTA','ENCERRADA') NOT NULL DEFAULT 'NAO_INICIADA',
  janela_inicio           DATETIME(3)  NULL,
  janela_fim              DATETIME(3)  NULL,
  encerramento_automatico TINYINT(1)   NOT NULL DEFAULT 1,
  metodo_identificacao    ENUM('GOOGLE_OU_EMAIL','SOMENTE_GOOGLE','SOMENTE_EMAIL') NOT NULL DEFAULT 'GOOGLE_OU_EMAIL',
  modulo_juri             TINYINT(1)   NOT NULL DEFAULT 0,
  modulo_infantil         TINYINT(1)   NOT NULL DEFAULT 0,
  bloquear_voto_proprio   TINYINT(1)   NOT NULL DEFAULT 1,
  aviso_privacidade_url   VARCHAR(500) NULL,
  prazo_anonimizacao_dias INT          NOT NULL DEFAULT 90,
  urna_aberta_em          DATETIME(3)  NULL,
  urna_encerrada_em       DATETIME(3)  NULL,
  concluido_em            DATETIME(3)  NULL,
  criado_em               DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  atualizado_em           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_evento_slug (slug),
  KEY idx_evento_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tema (
  evento_id       CHAR(36)     NOT NULL,
  nome_exibicao   VARCHAR(160) NULL,
  logo_url        VARCHAR(500) NULL,
  capa_url        VARCHAR(500) NULL,
  cor_primaria    VARCHAR(7)   NOT NULL DEFAULT '#1F2937',
  cor_secundaria  VARCHAR(7)   NOT NULL DEFAULT '#F59E0B',
  cor_fundo       VARCHAR(7)   NOT NULL DEFAULT '#FFFFFF',
  cor_texto       VARCHAR(7)   NOT NULL DEFAULT '#111827',
  fonte           VARCHAR(80)  NOT NULL DEFAULT 'Inter',
  rotulo_candidato  VARCHAR(40) NOT NULL DEFAULT 'Candidato',
  rotulo_candidatos VARCHAR(40) NOT NULL DEFAULT 'Candidatos',
  textos_estado   JSON         NULL,
  atualizado_em   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (evento_id),
  CONSTRAINT fk_tema_evento FOREIGN KEY (evento_id) REFERENCES evento (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE config_placar (
  evento_id                CHAR(36)     NOT NULL,
  peso_popular             DECIMAL(5,2) NOT NULL DEFAULT 100,
  peso_juri                DECIMAL(5,2) NOT NULL DEFAULT 0,
  peso_infantil            DECIMAL(5,2) NOT NULL DEFAULT 0,
  regra_desempate          ENUM('JURI','PUBLICO') NOT NULL DEFAULT 'JURI',
  exibir_votos_juri_telao  TINYINT(1)   NOT NULL DEFAULT 0,
  atualizado_em            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (evento_id),
  CONSTRAINT fk_config_placar_evento FOREIGN KEY (evento_id) REFERENCES evento (id) ON DELETE CASCADE ON UPDATE CASCADE,
  -- Não expresso no Prisma: adicionar na migration.
  CONSTRAINT chk_config_placar_pesos CHECK (
    peso_popular >= 0 AND peso_juri >= 0 AND peso_infantil >= 0
    AND peso_popular + peso_juri + peso_infantil = 100
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE config_apresentacao (
  evento_id                  CHAR(36)     NOT NULL,
  trailer_url                VARCHAR(500) NULL,
  usar_trailer_gerado        TINYINT(1)   NOT NULL DEFAULT 0,
  incluir_candidatos_trailer TINYINT(1)   NOT NULL DEFAULT 0,
  classificacao_completa     TINYINT(1)   NOT NULL DEFAULT 0,
  modo_avanco                ENUM('AUTOMATICO','MANUAL') NOT NULL DEFAULT 'AUTOMATICO',
  rotulo_categoria_publico   VARCHAR(80)  NOT NULL DEFAULT 'Queridinho do público',
  rotulo_categoria_infantil  VARCHAR(80)  NOT NULL DEFAULT 'Preferido das crianças',
  rotulo_categoria_juri      VARCHAR(80)  NOT NULL DEFAULT 'Escolha dos jurados',
  parcial_ao_vivo            TINYINT(1)   NOT NULL DEFAULT 0,
  limiar_reta_final_segundos INT          NOT NULL DEFAULT 300,
  atualizado_em              DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (evento_id),
  CONSTRAINT fk_config_apresentacao_evento FOREIGN KEY (evento_id) REFERENCES evento (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE campo_candidato (
  id        CHAR(36)    NOT NULL DEFAULT (UUID()),
  evento_id CHAR(36)    NOT NULL,
  chave     VARCHAR(40) NOT NULL,
  rotulo    VARCHAR(80) NOT NULL,
  ordem     INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_campo_candidato_evento_chave (evento_id, chave),
  CONSTRAINT fk_campo_candidato_evento FOREIGN KEY (evento_id) REFERENCES evento (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidato (
  id                   CHAR(36)     NOT NULL DEFAULT (UUID()),
  evento_id            CHAR(36)     NOT NULL,
  titulo               VARCHAR(200) NOT NULL,
  descricao            TEXT         NULL,
  imagem_url           VARCHAR(500) NULL,
  publicado            TINYINT(1)   NOT NULL DEFAULT 0,
  desqualificado       TINYINT(1)   NOT NULL DEFAULT 0,
  ordem                INT          NOT NULL DEFAULT 0,
  campos_extras        JSON         NULL,
  usuario_vinculado_id CHAR(36)     NULL,
  criado_em            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  atualizado_em        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_candidato_id_evento (id, evento_id),            -- alvo das FKs compostas
  KEY idx_candidato_evento_publicado (evento_id, publicado),
  KEY idx_candidato_usuario (usuario_vinculado_id),
  CONSTRAINT fk_candidato_evento  FOREIGN KEY (evento_id) REFERENCES evento (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_candidato_usuario FOREIGN KEY (usuario_vinculado_id) REFERENCES usuario (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- Participação e votos
-- ─────────────────────────────────────────────

CREATE TABLE participacao (
  id         CHAR(36)    NOT NULL DEFAULT (UUID()),
  usuario_id CHAR(36)    NOT NULL,
  evento_id  CHAR(36)    NOT NULL,
  papel      ENUM('PUBLICO','JURADO','ADMIN') NOT NULL DEFAULT 'PUBLICO',
  votou      TINYINT(1)  NOT NULL DEFAULT 0,
  criado_em  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_participacao_usuario_evento (usuario_id, evento_id),   -- um usuário, uma participação por evento
  UNIQUE KEY uq_participacao_id_evento (id, evento_id),                -- alvo da FK composta do voto do júri
  KEY idx_participacao_evento_papel (evento_id, papel),
  CONSTRAINT fk_participacao_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_participacao_evento  FOREIGN KEY (evento_id)  REFERENCES evento (id)  ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Voto popular: sem referência ao usuário.
CREATE TABLE voto (
  id           INT         NOT NULL AUTO_INCREMENT,
  evento_id    CHAR(36)    NOT NULL,
  candidato_id CHAR(36)    NOT NULL,
  hash_recibo  CHAR(64)    NOT NULL,
  criado_em    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_voto_hash_recibo (hash_recibo),
  KEY idx_voto_evento_candidato (evento_id, candidato_id),
  KEY idx_voto_evento_criado (evento_id, criado_em),
  CONSTRAINT fk_voto_candidato FOREIGN KEY (candidato_id, evento_id) REFERENCES candidato (id, evento_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE convite_jurado (
  id              CHAR(36)    NOT NULL DEFAULT (UUID()),
  evento_id       CHAR(36)    NOT NULL,
  hash_codigo     CHAR(64)    NOT NULL,
  rotulo          VARCHAR(120) NULL,
  validade_ate    DATETIME(3) NULL,
  estado          ENUM('DISPONIVEL','USADO','REVOGADO') NOT NULL DEFAULT 'DISPONIVEL',
  participacao_id CHAR(36)    NULL,
  resgatado_em    DATETIME(3) NULL,
  criado_em       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_convite_jurado_evento_hash (evento_id, hash_codigo),
  UNIQUE KEY uq_convite_jurado_participacao (participacao_id),
  KEY idx_convite_jurado_evento_estado (evento_id, estado),
  CONSTRAINT fk_convite_jurado_evento       FOREIGN KEY (evento_id)       REFERENCES evento (id)       ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_convite_jurado_participacao FOREIGN KEY (participacao_id) REFERENCES participacao (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Voto do júri: identificado, alterável com a urna aberta.
CREATE TABLE voto_juri (
  id              CHAR(36)    NOT NULL DEFAULT (UUID()),
  evento_id       CHAR(36)    NOT NULL,
  participacao_id CHAR(36)    NOT NULL,
  candidato_id    CHAR(36)    NOT NULL,
  criado_em       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  atualizado_em   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_voto_juri_participacao_evento (participacao_id, evento_id),  -- um voto de júri por participação
  KEY idx_voto_juri_evento_candidato (evento_id, candidato_id),
  KEY fk_voto_juri_candidato_idx (candidato_id, evento_id),
  CONSTRAINT fk_voto_juri_participacao FOREIGN KEY (participacao_id, evento_id) REFERENCES participacao (id, evento_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_voto_juri_candidato    FOREIGN KEY (candidato_id, evento_id)    REFERENCES candidato (id, evento_id)    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE historico_voto_juri (
  id                    INT         NOT NULL AUTO_INCREMENT,
  voto_juri_id          CHAR(36)    NOT NULL,
  candidato_anterior_id CHAR(36)    NULL,
  candidato_novo_id     CHAR(36)    NOT NULL,
  criado_em             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_historico_voto_juri (voto_juri_id, criado_em),
  KEY idx_historico_anterior (candidato_anterior_id),
  KEY idx_historico_novo (candidato_novo_id),
  CONSTRAINT fk_historico_voto_juri FOREIGN KEY (voto_juri_id)          REFERENCES voto_juri (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_historico_anterior  FOREIGN KEY (candidato_anterior_id) REFERENCES candidato (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_historico_novo       FOREIGN KEY (candidato_novo_id)     REFERENCES candidato (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- Voto infantil (totens)
-- ─────────────────────────────────────────────

CREATE TABLE dispositivo (
  id             CHAR(36)     NOT NULL DEFAULT (UUID()),
  evento_id      CHAR(36)     NOT NULL,
  nome           VARCHAR(120) NOT NULL,
  hash_token     CHAR(64)     NOT NULL,
  hash_pin       VARCHAR(255) NULL,
  estado         ENUM('ATIVO','PAUSADO','REVOGADO') NOT NULL DEFAULT 'ATIVO',
  ultimo_uso_em  DATETIME(3)  NULL,
  criado_em      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_dispositivo_hash_token (hash_token),
  UNIQUE KEY uq_dispositivo_id_evento (id, evento_id),                 -- alvo da FK composta do voto infantil
  KEY idx_dispositivo_evento_estado (evento_id, estado),
  CONSTRAINT fk_dispositivo_evento FOREIGN KEY (evento_id) REFERENCES evento (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE codigo_pareamento (
  id             CHAR(36)    NOT NULL DEFAULT (UUID()),
  evento_id      CHAR(36)    NOT NULL,
  hash_codigo    CHAR(64)    NOT NULL,
  validade_ate   DATETIME(3) NOT NULL,
  estado         ENUM('DISPONIVEL','USADO','EXPIRADO') NOT NULL DEFAULT 'DISPONIVEL',
  dispositivo_id CHAR(36)    NULL,
  criado_em      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_codigo_pareamento_evento_hash (evento_id, hash_codigo),
  KEY idx_codigo_pareamento_dispositivo (dispositivo_id),
  CONSTRAINT fk_codigo_pareamento_evento      FOREIGN KEY (evento_id)      REFERENCES evento (id)      ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_codigo_pareamento_dispositivo FOREIGN KEY (dispositivo_id) REFERENCES dispositivo (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Voto infantil: candidato, horário e dispositivo. Nenhum dado da criança.
CREATE TABLE voto_infantil (
  id             INT         NOT NULL AUTO_INCREMENT,
  evento_id      CHAR(36)    NOT NULL,
  candidato_id   CHAR(36)    NOT NULL,
  dispositivo_id CHAR(36)    NOT NULL,
  criado_em      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_voto_infantil_evento_candidato (evento_id, candidato_id),
  KEY idx_voto_infantil_evento_criado (evento_id, criado_em),
  KEY idx_voto_infantil_dispositivo_criado (dispositivo_id, criado_em),
  CONSTRAINT fk_voto_infantil_candidato   FOREIGN KEY (candidato_id, evento_id)   REFERENCES candidato (id, evento_id)   ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_voto_infantil_dispositivo FOREIGN KEY (dispositivo_id, evento_id) REFERENCES dispositivo (id, evento_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- Administração, resultado e auditoria
-- ─────────────────────────────────────────────

CREATE TABLE convite_admin (
  id                CHAR(36)     NOT NULL DEFAULT (UUID()),
  evento_id         CHAR(36)     NOT NULL,
  email             VARCHAR(191) NOT NULL,
  estado            ENUM('PENDENTE','USADO','REVOGADO') NOT NULL DEFAULT 'PENDENTE',
  resgatado_por_id  CHAR(36)     NULL,
  resgatado_em      DATETIME(3)  NULL,
  criado_em         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_convite_admin_evento_email (evento_id, email),
  KEY idx_convite_admin_resgatado_por (resgatado_por_id),
  CONSTRAINT fk_convite_admin_evento       FOREIGN KEY (evento_id)        REFERENCES evento (id)  ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_convite_admin_resgatado_por FOREIGN KEY (resgatado_por_id) REFERENCES usuario (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Resultado oficial congelado; correções geram nova versão.
CREATE TABLE resultado_oficial (
  id                CHAR(36)     NOT NULL DEFAULT (UUID()),
  evento_id         CHAR(36)     NOT NULL,
  versao            INT          NOT NULL,
  motivo            VARCHAR(40)  NOT NULL,          -- ENCERRAMENTO | DESQUALIFICACAO | CORRECAO
  peso_popular      DECIMAL(5,2) NOT NULL,
  peso_juri         DECIMAL(5,2) NOT NULL,
  peso_infantil     DECIMAL(5,2) NOT NULL,
  dados             JSON         NOT NULL,
  calculado_por_id  CHAR(36)     NULL,
  calculado_em      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_resultado_oficial_evento_versao (evento_id, versao),
  KEY idx_resultado_oficial_calculado_por (calculado_por_id),
  CONSTRAINT fk_resultado_oficial_evento        FOREIGN KEY (evento_id)        REFERENCES evento (id)  ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_resultado_oficial_calculado_por FOREIGN KEY (calculado_por_id) REFERENCES usuario (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_resultado_oficial_pesos CHECK (peso_popular + peso_juri + peso_infantil = 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trilha de auditoria (separada dos logs técnicos). Nunca guarda a escolha de voto popular/infantil.
CREATE TABLE auditoria (
  id                  INT          NOT NULL AUTO_INCREMENT,
  evento_id           CHAR(36)     NULL,
  ator_usuario_id     CHAR(36)     NULL,
  ator_dispositivo_id CHAR(36)     NULL,
  acao                VARCHAR(64)  NOT NULL,
  entidade            VARCHAR(64)  NULL,
  entidade_id         VARCHAR(64)  NULL,
  detalhes            JSON         NULL,
  ip_hash             CHAR(64)     NULL,
  criado_em           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_auditoria_evento_criado (evento_id, criado_em),
  KEY idx_auditoria_evento_acao (evento_id, acao),
  KEY idx_auditoria_ator_usuario (ator_usuario_id),
  KEY idx_auditoria_ator_dispositivo (ator_dispositivo_id),
  CONSTRAINT fk_auditoria_evento      FOREIGN KEY (evento_id)           REFERENCES evento (id)      ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_auditoria_usuario     FOREIGN KEY (ator_usuario_id)     REFERENCES usuario (id)     ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_auditoria_dispositivo FOREIGN KEY (ator_dispositivo_id) REFERENCES dispositivo (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═════════════════════════════════════════════
-- CONSULTAS DE REFERÊNCIA (não fazem parte da migration)
-- ═════════════════════════════════════════════

-- 1) Voto popular (uma transação). :participacao, :evento, :candidato, :recibo vêm da aplicação.
--    A urna e o candidato são validados no servidor antes (urna ABERTA, candidato publicado e não desqualificado).
--
-- START TRANSACTION;
--   UPDATE participacao SET votou = 1
--    WHERE id = :participacao AND evento_id = :evento AND papel = 'PUBLICO' AND votou = 0;
--   -- ROW_COUNT() = 0  → já votou (ou papel inválido): ROLLBACK e responder "você já votou"
--   INSERT INTO voto (evento_id, candidato_id, hash_recibo) VALUES (:evento, :candidato, :recibo);
-- COMMIT;

-- 2) Voto do júri: criar ou alterar (com histórico) enquanto a urna estiver aberta.
--
-- START TRANSACTION;
--   SELECT id, candidato_id FROM voto_juri WHERE participacao_id = :participacao AND evento_id = :evento FOR UPDATE;
--   -- sem linha: INSERT INTO voto_juri (evento_id, participacao_id, candidato_id) VALUES (...);
--   -- com linha: UPDATE voto_juri SET candidato_id = :novo WHERE id = :voto_juri;
--   INSERT INTO historico_voto_juri (voto_juri_id, candidato_anterior_id, candidato_novo_id)
--     VALUES (:voto_juri, :anterior_ou_NULL, :novo);
-- COMMIT;

-- 3) Votos por candidato (popular) — só depois do encerramento ou para uso administrativo.
--
-- SELECT candidato_id, COUNT(*) AS votos
--   FROM voto WHERE evento_id = :evento GROUP BY candidato_id;

-- 4) Votos por minuto (dashboard, aba Operação).
--
-- SELECT DATE_FORMAT(criado_em, '%Y-%m-%d %H:%i:00') AS minuto, COUNT(*) AS votos
--   FROM voto WHERE evento_id = :evento GROUP BY minuto ORDER BY minuto;

-- 5) Jurados que ainda não votaram.
--
-- SELECT p.id, c.rotulo
--   FROM participacao p
--   LEFT JOIN convite_jurado c ON c.participacao_id = p.id
--   LEFT JOIN voto_juri v ON v.participacao_id = p.id AND v.evento_id = p.evento_id
--  WHERE p.evento_id = :evento AND p.papel = 'JURADO' AND v.id IS NULL;
