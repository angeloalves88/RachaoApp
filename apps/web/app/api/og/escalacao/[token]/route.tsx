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

type Boleiro = PublicEscalacaoResponse['times'][0]['boleiros'][0];

const flexCol = { display: 'flex' as const, flexDirection: 'column' as const };
const flexRow = { display: 'flex' as const, flexDirection: 'row' as const };

function PlayerRow({ b, fontSize }: { b: Boleiro; fontSize: number }) {
  return (
    <div
      style={{
        ...flexRow,
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 6,
        padding: '5px 8px',
        fontSize,
      }}
    >
      <span style={{ fontWeight: 600, color: '#f8fafc' }}>
        {b.nome}
        {b.posicao ? ` (${b.posicao})` : ''}
      </span>
      {b.capitao ? (
        <span style={{ fontSize: 12, color: '#fb923c', fontWeight: 700 }}>C</span>
      ) : (
        <span style={{ display: 'none' }} />
      )}
    </div>
  );
}

function TeamColumn({
  nome,
  cor,
  titulares,
  fontTeam,
  fontPlayer,
  flex,
}: {
  nome: string;
  cor: string;
  titulares: Boleiro[];
  fontTeam: number;
  fontPlayer: number;
  flex: number;
}) {
  return (
    <div style={{ ...flexCol, flex, minWidth: 0 }}>
      <div
        style={{
          display: 'flex',
          background: cor,
          color: '#fff',
          fontSize: fontTeam,
          fontWeight: 800,
          textAlign: 'center',
          padding: '6px 4px',
          borderRadius: 8,
          marginBottom: 6,
          textTransform: 'uppercase',
          justifyContent: 'center',
        }}
      >
        {nome}
      </div>
      <div style={{ ...flexCol, gap: 3 }}>
        {titulares.map((b, idx) => (
          <PlayerRow key={idx} b={b} fontSize={fontPlayer} />
        ))}
      </div>
    </div>
  );
}

function ReserveColumn({
  nome,
  cor,
  reservas,
  fontTeam,
  fontPlayer,
  flex,
}: {
  nome: string;
  cor: string;
  reservas: Boleiro[];
  fontTeam: number;
  fontPlayer: number;
  flex: number;
}) {
  return (
    <div
      style={{
        ...flexCol,
        flex,
        minWidth: 0,
        borderRadius: 10,
        border: `2px solid ${cor}`,
        background: 'rgba(255,255,255,0.05)',
        padding: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          color: cor,
          fontSize: fontTeam,
          fontWeight: 800,
          textAlign: 'center',
          marginBottom: 4,
          textTransform: 'uppercase',
          justifyContent: 'center',
        }}
      >
        {nome}
      </div>
      <div style={{ ...flexCol, gap: 2 }}>
        {reservas.map((b, idx) => (
          <PlayerRow key={idx} b={b} fontSize={fontPlayer} />
        ))}
      </div>
    </div>
  );
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const formato = searchParams.get('formato') === 'compacto' ? 'compacto' : 'horizontal';
  const showInfo = searchParams.get('info') !== '0';
  const showLogo = searchParams.get('logo') !== '0';

  let data: PublicEscalacaoResponse;
  try {
    const res = await fetch(`${API_URL}/api/partidas/publico/${token}/escalacao`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return new Response('Not found', { status: res.status === 410 ? 410 : 404 });
    }
    data = (await res.json()) as PublicEscalacaoResponse;
  } catch {
    return new Response('API unavailable', { status: 502 });
  }

  const n = data.times.length;
  const isFour = n === 4;
  const fontTitle = formato === 'compacto' ? 32 : 38;
  const fontTeam = formato === 'compacto' ? 18 : 20;
  const fontPlayer = formato === 'compacto' ? 13 : 14;
  const fontTeamRes = formato === 'compacto' ? 16 : 17;
  const fontPlayerRes = formato === 'compacto' ? 12 : 13;
  const maxTitulares = formato === 'compacto' ? 8 : 9;
  const maxReservas = formato === 'compacto' ? 4 : 5;
  const hasReservas = data.times.some((t) => (t.reservas?.length ?? 0) > 0);
  const colFlex = 1;

  const local =
    data.partida.estadio ?? (data.partida.localLivre ? data.partida.localLivre : null);

  const dataStr = new Date(data.partida.dataHora).toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const w = formato === 'compacto' ? 1350 : 1920;
  const h = 1080;

  const teamsRowStyle = {
    display: 'flex' as const,
    flexDirection: 'row' as const,
    flexWrap: (isFour ? 'wrap' : 'nowrap') as 'wrap' | 'nowrap',
    gap: 12,
    width: '100%',
  };

  try {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            ...flexRow,
            background: 'linear-gradient(165deg, #0c1524 0%, #13243a 40%, #0a1018 100%)',
            color: '#f8fafc',
            padding: 32,
            fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          }}
        >
          {/* Coluna esquerda — info */}
          <div
            style={{
              ...flexCol,
              width: formato === 'compacto' ? 260 : 300,
              marginRight: 28,
              justifyContent: 'flex-start',
            }}
          >
            {showLogo ? (
              <div
                style={{
                  display: 'flex',
                  fontSize: 28,
                  fontWeight: 800,
                  color: '#fb923c',
                  marginBottom: 12,
                }}
              >
                RachãoApp
              </div>
            ) : null}
            <div
              style={{
                display: 'flex',
                fontSize: fontTitle,
                fontWeight: 800,
                lineHeight: 1.1,
                marginBottom: 8,
              }}
            >
              {data.partida.grupo.nome}
            </div>
            {showInfo ? (
              <div
                style={{
                  display: 'flex',
                  fontSize: 18,
                  color: 'rgba(248,250,252,0.75)',
                  marginBottom: 8,
                }}
              >
                {dataStr}
                {local ? ` · ${local}` : ''}
              </div>
            ) : null}
            <div
              style={{
                display: 'flex',
                fontSize: 16,
                color: 'rgba(248,250,252,0.5)',
                textTransform: 'uppercase',
                letterSpacing: 2,
              }}
            >
              Escalação
            </div>
          </div>

          {/* Coluna direita — campo + reservas */}
          <div style={{ ...flexCol, flex: 1, gap: 12, justifyContent: 'center' }}>
            <div
              style={{
                ...flexCol,
                flex: 1,
                borderRadius: 14,
                border: '3px solid rgba(255,255,255,0.35)',
                background:
                  'linear-gradient(180deg, #1a5f2a 0%, #2d8a3e 40%, #3da352 55%, #2d8a3e 70%, #1a5f2a 100%)',
                padding: 16,
                justifyContent: 'center',
              }}
            >
              <div style={teamsRowStyle}>
                {data.times.map((t) => (
                  <TeamColumn
                    key={t.id}
                    nome={t.nome}
                    cor={COR_HEX[safeCor(t.cor)]}
                    titulares={t.boleiros.slice(0, maxTitulares)}
                    fontTeam={fontTeam}
                    fontPlayer={fontPlayer}
                    flex={colFlex}
                  />
                ))}
              </div>
            </div>

            {hasReservas ? (
              <div style={{ ...flexCol, gap: 6 }}>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 12,
                    color: 'rgba(248,250,252,0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                  }}
                >
                  Reservas
                </div>
                <div style={teamsRowStyle}>
                  {data.times
                    .filter((t) => (t.reservas?.length ?? 0) > 0)
                    .map((t) => (
                      <ReserveColumn
                        key={`res-${t.id}`}
                        nome={t.nome}
                        cor={COR_HEX[safeCor(t.cor)]}
                        reservas={(t.reservas ?? []).slice(0, maxReservas)}
                        fontTeam={fontTeamRes}
                        fontPlayer={fontPlayerRes}
                        flex={colFlex}
                      />
                    ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ),
      { width: w, height: h },
    );
  } catch (err) {
    console.error('[og/escalacao]', err);
    return new Response('Image generation failed', { status: 500 });
  }
}
