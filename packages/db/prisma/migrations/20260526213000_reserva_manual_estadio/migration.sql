-- CreateTable
CREATE TABLE "ReservaManualEstadio" (
    "id" TEXT NOT NULL,
    "estadioId" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "nomeContato" TEXT NOT NULL,
    "telefoneContato" TEXT NOT NULL,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservaManualEstadio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReservaManualEstadio_estadioId_inicio_idx" ON "ReservaManualEstadio"("estadioId", "inicio");

-- CreateIndex
CREATE INDEX "ReservaManualEstadio_estadioId_fim_idx" ON "ReservaManualEstadio"("estadioId", "fim");

-- AddForeignKey
ALTER TABLE "ReservaManualEstadio" ADD CONSTRAINT "ReservaManualEstadio_estadioId_fkey" FOREIGN KEY ("estadioId") REFERENCES "Estadio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
