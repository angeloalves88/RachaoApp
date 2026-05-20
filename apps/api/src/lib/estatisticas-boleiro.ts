/**
 * Estatísticas de um boleiro fixo no grupo (gols, cartões, partidas jogadas).
 * Considera partidas `em_andamento` e `encerrada`.
 * Em partidas ao vivo, gols de sub-jogos finalizados vêm de `aoVivoEstado.artilharia`;
 * o sub-jogo atual continua nos registros de `Evento`.
 */
import type { PrismaClient } from '@rachao/db';

export interface EstatisticasBoleiro {
  partidasJogadas: number;
  gols: number;
  cartoesAmarelos: number;
  cartoesVermelhos: number;
  cartoesAzuis: number;
}

type AoVivoJson = {
  artilharia?: Array<{ boleiroId: string; gols?: number }>;
};

export async function agregarEstatisticasBoleiro(
  prisma: PrismaClient,
  grupoId: string,
  boleiroGrupoId: string,
): Promise<EstatisticasBoleiro> {
  const partidas = await prisma.partida.findMany({
    where: {
      grupoId,
      status: { in: ['em_andamento', 'encerrada'] },
    },
    select: { id: true, status: true, aoVivoEstado: true },
  });

  const partidaIds = partidas.map((p) => p.id);
  if (partidaIds.length === 0) {
    return {
      partidasJogadas: 0,
      gols: 0,
      cartoesAmarelos: 0,
      cartoesVermelhos: 0,
      cartoesAzuis: 0,
    };
  }

  const [eventos, escalacoes] = await Promise.all([
    prisma.evento.findMany({
      where: { partidaId: { in: partidaIds }, boleiroId: boleiroGrupoId },
      select: { tipo: true, partidaId: true },
    }),
    prisma.timeBoleiro.findMany({
      where: {
        boleiroGrupoId,
        time: { partidaId: { in: partidaIds } },
      },
      select: { time: { select: { partidaId: true } } },
    }),
  ]);

  let gols = 0;
  let cartoesAmarelos = 0;
  let cartoesVermelhos = 0;
  let cartoesAzuis = 0;

  for (const ev of eventos) {
    if (ev.tipo === 'gol') gols++;
    else if (ev.tipo === 'amarelo') cartoesAmarelos++;
    else if (ev.tipo === 'vermelho') cartoesVermelhos++;
    else if (ev.tipo === 'azul') cartoesAzuis++;
  }

  for (const p of partidas) {
    if (p.status !== 'em_andamento') continue;
    const estado = p.aoVivoEstado as AoVivoJson | null;
    const art = estado?.artilharia?.find((a) => a.boleiroId === boleiroGrupoId);
    if (art?.gols) gols += art.gols;
  }

  const partidasJogadas = new Set<string>();
  for (const ev of eventos) partidasJogadas.add(ev.partidaId);
  for (const tb of escalacoes) partidasJogadas.add(tb.time.partidaId);

  return {
    partidasJogadas: partidasJogadas.size,
    gols,
    cartoesAmarelos,
    cartoesVermelhos,
    cartoesAzuis,
  };
}
