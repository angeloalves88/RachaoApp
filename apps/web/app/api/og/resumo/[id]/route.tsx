import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { CORES_TIME, type CorTime } from '@rachao/shared/zod';
import { COR_HEX } from '@/lib/escalacao-ui';
import type { ResumoApi } from '@/lib/public-resumo';

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

  const res = await fetch(`${API_URL}/api/partidas/publico/${id}/resumo`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    return new Response('Not found', { status: 404 });
  }
  const data = (await res.json()) as ResumoApi;

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

  const maxArt = formato === 'retrato' ? 6 : 4;
  const top = data.artilharia.slice(0, maxArt);

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
          padding: 48,
          fontFamily: '"Barlow Condensed", "Segoe UI", system-ui, -apple-system, sans-serif',
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
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 18 }}>
          <div style={{ fontSize: 28, color: 'rgba(248,250,252,0.7)' }}>RESUMO DA PARTIDA</div>
          <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.05 }}>
            {data.partida.grupo.nome}
          </div>
          {showInfo ? (
            <div style={{ fontSize: 24, color: 'rgba(248,250,252,0.7)', marginTop: 4 }}>
              {dataStr}
              {local ? ` · ${local}` : ''}
            </div>
          ) : null}
        </div>

        {/* Placar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${data.times.length}, 1fr)`,
            gap: 16,
            marginBottom: 28,
          }}
        >
          {data.times.map((t) => {
            const cor = COR_HEX[safeCor(t.cor)];
            return (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderTopWidth: 6,
                  borderTopColor: cor,
                  background: 'rgba(0,0,0,0.3)',
                  padding: '20px 12px',
                }}
              >
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: 'rgba(248,250,252,0.85)',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  {t.nome}
                </span>
                <span style={{ fontSize: 120, fontWeight: 900, lineHeight: 1 }}>
                  {t.golsFinal}
                </span>
              </div>
            );
          })}
        </div>

        {/* Artilharia */}
        {top.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: '#fb923c',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 4,
              }}
            >
              Artilharia
            </div>
            {top.map((a, i) => {
              const cor = a.timeCor ? COR_HEX[safeCor(a.timeCor)] : '#888';
              return (
                <div
                  key={a.boleiroId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    padding: '12px 16px',
                    fontSize: 28,
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      fontSize: 22,
                      color: 'rgba(248,250,252,0.5)',
                      fontWeight: 700,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ flex: 1, fontWeight: 700 }}>{a.nome}</span>
                  {a.timeNome ? (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 22,
                        color: 'rgba(248,250,252,0.65)',
                        marginRight: 18,
                      }}
                    >
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 999,
                          background: cor,
                        }}
                      />
                      {a.timeNome}
                    </span>
                  ) : null}
                  <span
                    style={{
                      fontSize: 36,
                      fontWeight: 900,
                      color: '#fb923c',
                      minWidth: 40,
                      textAlign: 'right',
                    }}
                  >
                    {a.gols}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ flex: 1 }} />
        )}
      </div>
    ),
    { width: w, height: h },
  );
}
