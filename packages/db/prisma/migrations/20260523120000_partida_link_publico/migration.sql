-- AlterTable
ALTER TABLE "Partida" ADD COLUMN "encerradaEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PartidaLinkPublico" (
    "id" TEXT NOT NULL,
    "partidaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartidaLinkPublico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartidaLinkPublico_token_key" ON "PartidaLinkPublico"("token");

-- CreateIndex
CREATE INDEX "PartidaLinkPublico_token_idx" ON "PartidaLinkPublico"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PartidaLinkPublico_partidaId_tipo_key" ON "PartidaLinkPublico"("partidaId", "tipo");

-- AddForeignKey
ALTER TABLE "PartidaLinkPublico" ADD CONSTRAINT "PartidaLinkPublico_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE CASCADE ON UPDATE CASCADE;
