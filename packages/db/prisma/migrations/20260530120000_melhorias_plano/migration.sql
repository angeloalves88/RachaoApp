-- Melhorias plano: ConviteBoleiro, ConvidadoGrupo, fotos e logos

ALTER TABLE "BoleiroGrupo" ADD COLUMN IF NOT EXISTS "fotoUrl" TEXT;

ALTER TABLE "ConvidadoAvulso" ADD COLUMN IF NOT EXISTS "fotoUrl" TEXT;

ALTER TABLE "Grupo" ADD COLUMN IF NOT EXISTS "valorConvidadoPadrao" DECIMAL(10,2);

ALTER TABLE "Time" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

CREATE TABLE IF NOT EXISTS "ConvidadoGrupo" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "convidadoAvulsoId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'lista_espera',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConvidadoGrupo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ConviteBoleiro" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "celular" TEXT NOT NULL,
    "email" TEXT,
    "canalPreferido" TEXT NOT NULL DEFAULT 'whatsapp',
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "boleiroGrupoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConviteBoleiro_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ConvidadoGrupo_grupoId_convidadoAvulsoId_key" ON "ConvidadoGrupo"("grupoId", "convidadoAvulsoId");
CREATE INDEX IF NOT EXISTS "ConvidadoGrupo_grupoId_status_idx" ON "ConvidadoGrupo"("grupoId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "ConviteBoleiro_token_key" ON "ConviteBoleiro"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "ConviteBoleiro_boleiroGrupoId_key" ON "ConviteBoleiro"("boleiroGrupoId");
CREATE INDEX IF NOT EXISTS "ConviteBoleiro_grupoId_idx" ON "ConviteBoleiro"("grupoId");

ALTER TABLE "ConvidadoGrupo" ADD CONSTRAINT "ConvidadoGrupo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConvidadoGrupo" ADD CONSTRAINT "ConvidadoGrupo_convidadoAvulsoId_fkey" FOREIGN KEY ("convidadoAvulsoId") REFERENCES "ConvidadoAvulso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConviteBoleiro" ADD CONSTRAINT "ConviteBoleiro_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConviteBoleiro" ADD CONSTRAINT "ConviteBoleiro_boleiroGrupoId_fkey" FOREIGN KEY ("boleiroGrupoId") REFERENCES "BoleiroGrupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
