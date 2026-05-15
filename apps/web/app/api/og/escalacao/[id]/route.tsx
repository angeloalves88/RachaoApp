import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { CORES_TIME, type CorTime } from '@rachao/shared/zod';
import type { PublicEscalacaoResponse } from '@/lib/public-escalacao';
import { COR_HEX } from '@/lib/escalacao-ui';

export const runtime = 'edge';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

function safeCor(raw: string): CorTime {
  return CORES_TIME.includes(raw as CorTime) ? (raw as CorTime) : 'blue';
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const formato = searchParams.get('formato') === 'retrato' ? 'retrato' : 'quadrado';
  const showInfo = searchParams.get('info') !== '0';
  const showLogo = searchParams.get('logo') !== '0';

  const res = await fetch(`${API_URL}/api/partidas/publico/${id}/escalacao`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    return new Response('Not found', { status: 404 });
  }
  const data = (await res.json()) as PublicEscalacaoResponse;

  const w = 1080;
  const h = formato === 'retrato' ? 1350 : 1080;

  const local =
    data.partida.estadio ?? (data.partida.localLivre ? data.partida.localLivre : null);

  const dataStr = new Date(data.partida.dataHora).toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(165deg, #0c1524 0%, #13243a 40%, #0a1018 100%)',
          color: '#f8fafc',
          padding: 40,
          fontFamily:
            '"Barlow Condensed", "Segoe UI", system-ui, -apple-system, sans-serif',
        }}
      >
        {showLogo ? (
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: '#fb923c',
              letterSpacing: -1,
              marginBottom: 8,
            }}
          >
            RachãoApp
          </div>
        ) : null}
        <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1, marginBottom: 6 }}>
          {data.partida.grupo.nome}
        </div>
        {showInfo ? (
          <div style={{ fontSize: 26, color: 'rgba(248,250,252,0.75)', marginBottom: 4 }}>
            {dataStr}
          </div>
        ) : null}
        {showInfo && local ? (
          <div style={{ fontSize: 24, color: 'rgba(248,250,252,0.6)', marginBottom: 28 }}>
            {local}
          </div>
        ) : (
          <div style={{ height: 20 }} />
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: formato === 'retrato' ? 18 : 14,
            flex: 1,
          }}
        >
          {data.times.map((t) => {
            const cor = safeCor(t.cor);
            const border = COR_HEX[cor];
            const maxRows = formato === 'retrato' ? 14 : 10;
            const rows = t.boleiros.slice(0, maxRows);
            return (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderTopWidth: 5,
                  borderTopColor: border,
                  background: 'rgba(0,0,0,0.25)',
                }}
              >
                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 700,
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.35)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {t.nome}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {rows.map((b, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 16px',
                        borderBottom:
                          idx < rows.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                        fontSize: 24,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{b.nome}</span>
                      {b.capitao ? (
                        <span
                          style={{
                            fontSize: 18,
                            color: '#fb923c',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          Capitão
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ),
    { width: w, height: h },
  );
}
