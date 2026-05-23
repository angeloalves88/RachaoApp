import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { CORES_TIME, type CorTime } from '@rachao/shared/zod';
import { COR_HEX } from '@/lib/escalacao-ui';
import type { ResumoApi } from '@/lib/public-resumo';

export const runtime = 'edge';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

const flexCol = { display: 'flex' as const, flexDirection: 'column' as const };
const flexRow = { display: 'flex' as const, flexDirection: 'row' as const };

function safeCor(raw: string): CorTime {
  return CORES_TIME.includes(raw as CorTime) ? (raw as CorTime) : 'blue';
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const formato = searchParams.get('formato') === 'quadrado' ? 'quadrado' : 'retrato';
  const showInfo = searchParams.get('info') !== '0';
  const showLogo = searchParams.get('logo') !== '0';

  let data: ResumoApi;
  try {
    const res = await fetch(`${API_URL}/api/partidas/publico/${token}/resumo`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return new Response('Not found', { status: res.status === 410 ? 410 : 404 });
    }
    data = (await res.json()) as ResumoApi;
  } catch {
    return new Response('API unavailable', { status: 502 });
  }

  const w = 1080;
  const h = formato === 'retrato' ? 1920 : 1080;
  const usarPontos = (data.classificacao ?? []).some((r) => r.j > 0);

  const local =
    data.partida.estadio ?? (data.partida.localLivre ? data.partida.localLivre : null);

  const dataStr = new Date(data.partida.dataHora).toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const topArt = data.artilharia.slice(0, 6);
  const topStats = data.estatisticas.slice(0, 8);
  const classif = data.classificacao ?? [];
  const nTimes = data.times.length;
  const colWidth =
    nTimes === 2 ? '48%' : nTimes === 3 ? '31%' : nTimes >= 4 ? '23%' : '100%';

  try {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            ...flexCol,
            background: 'linear-gradient(165deg, #0c1524 0%, #13243a 40%, #0a1018 100%)',
            color: '#f8fafc',
            padding: 40,
            fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          }}
        >
          {showLogo ? (
            <div
              style={{
                display: 'flex',
                fontSize: 32,
                fontWeight: 800,
                color: '#fb923c',
                marginBottom: 6,
              }}
            >
              RachãoApp
            </div>
          ) : null}
          <div style={{ display: 'flex', fontSize: 24, color: 'rgba(248,250,252,0.7)' }}>
            RESUMO DA PARTIDA
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 44,
              fontWeight: 800,
              lineHeight: 1.05,
              marginBottom: 4,
            }}
          >
            {data.partida.grupo.nome}
          </div>
          {showInfo ? (
            <div
              style={{
                display: 'flex',
                fontSize: 22,
                color: 'rgba(248,250,252,0.65)',
                marginBottom: 16,
              }}
            >
              {dataStr}
              {local ? ` · ${local}` : ''}
            </div>
          ) : (
            <div style={{ display: 'flex', height: 8 }} />
          )}

          {/* Placar / pontuação */}
          <div
            style={{
              ...flexRow,
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 20,
              justifyContent: 'center',
            }}
          >
            {data.times.map((t) => (
              <div
                key={t.id}
                style={{
                  ...flexCol,
                  alignItems: 'center',
                  width: colWidth,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderTop: `5px solid ${COR_HEX[safeCor(t.cor)]}`,
                  background: 'rgba(0,0,0,0.3)',
                  padding: '12px 8px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontSize: 18,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {t.nome}
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 72,
                    fontWeight: 900,
                    lineHeight: 1,
                  }}
                >
                  {usarPontos ? (t.pontosFinal ?? 0) : t.golsFinal}
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 14,
                    color: 'rgba(248,250,252,0.5)',
                    textTransform: 'uppercase',
                  }}
                >
                  {usarPontos ? 'pts' : 'gols'}
                </div>
              </div>
            ))}
          </div>

          {classif.length > 0 ? (
            <div style={{ ...flexCol, marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#fb923c',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                Classificação
              </div>
              {classif.slice(0, 6).map((row, i) => {
                const cartoes =
                  row.amarelos + row.vermelhos + row.azuis > 0
                    ? `${row.amarelos > 0 ? `🟨${row.amarelos}` : ''}${row.vermelhos > 0 ? ` 🟥${row.vermelhos}` : ''}${row.azuis > 0 ? ` 🟦${row.azuis}` : ''}`.trim()
                    : '—';
                return (
                  <div
                    key={row.timeId}
                    style={{
                      ...flexRow,
                      fontSize: 18,
                      padding: '6px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        width: 28,
                        color: 'rgba(248,250,252,0.5)',
                      }}
                    >
                      {i + 1}
                    </div>
                    <div style={{ display: 'flex', flex: 1, fontWeight: 600 }}>{row.nome}</div>
                    <div
                      style={{
                        display: 'flex',
                        width: 36,
                        justifyContent: 'center',
                        fontWeight: 800,
                      }}
                    >
                      {row.pts}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        width: 56,
                        justifyContent: 'center',
                        color: 'rgba(248,250,252,0.7)',
                      }}
                    >
                      {row.gp}:{row.gc}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        width: 72,
                        justifyContent: 'flex-end',
                        fontSize: 14,
                      }}
                    >
                      {cartoes}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {topArt.length > 0 ? (
            <div style={{ ...flexCol, marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#fb923c',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                Artilharia
              </div>
              {topArt.map((a, i) => (
                <div
                  key={a.boleiroId}
                  style={{
                    ...flexRow,
                    fontSize: 20,
                    padding: '6px 0',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      width: 28,
                      color: 'rgba(248,250,252,0.5)',
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ display: 'flex', flex: 1, fontWeight: 600 }}>{a.nome}</div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 28,
                      fontWeight: 900,
                      color: '#fb923c',
                    }}
                  >
                    {a.gols}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {topStats.length > 0 ? (
            <div style={{ ...flexCol }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#fb923c',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                Jogadores
              </div>
              {topStats.map((s) => (
                <div
                  key={s.boleiroId}
                  style={{
                    ...flexRow,
                    fontSize: 17,
                    padding: '5px 0',
                    color: 'rgba(248,250,252,0.9)',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', flex: 1, fontWeight: 600 }}>{s.nome}</div>
                  <div style={{ display: 'flex', width: 32, justifyContent: 'center' }}>
                    ⚽{s.gols}
                  </div>
                  <div style={{ display: 'flex', width: 32, justifyContent: 'center' }}>
                    🟨{s.amarelos}
                  </div>
                  <div style={{ display: 'flex', width: 32, justifyContent: 'center' }}>
                    🟥{s.vermelhos}
                  </div>
                  <div style={{ display: 'flex', width: 32, justifyContent: 'center' }}>
                    🟦{s.azuis}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ),
      { width: w, height: h },
    );
  } catch (err) {
    console.error('[og/resumo]', err);
    return new Response('Image generation failed', { status: 500 });
  }
}
