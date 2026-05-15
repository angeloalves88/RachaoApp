'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { REGRAS_PARTIDA } from '@rachao/shared/enums';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { NumberStepper } from '@/components/ui/number-stepper';
import { Segmented } from '@/components/ui/segmented';
import { getPrefsGerais, putPrefsGerais, type PreferenciasGerais } from '@/lib/perfil-actions';
import { signOut } from '@/lib/auth-actions';

const REGRA_LABEL: Record<string, string> = {
  cartao_azul: 'Cartão azul',
  bloqueio_vermelho: 'Bloqueio após vermelho',
  bloqueio_inadimplente: 'Bloquear inadimplente',
  gol_olimpico_duplo: 'Gol olímpico vale 2',
  impedimento_ativo: 'Impedimento ativo',
  penalti_max_por_tempo: 'Limite de pênaltis',
  time_menor_joga: 'Time incompleto joga',
  goleiro_obrigatorio: 'Goleiro obrigatório',
};

export function ConfiguracoesGeraisClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<PreferenciasGerais | null>(null);
  const [regrasSel, setRegrasSel] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const res = await getPrefsGerais();
        if (!ok) return;
        setPrefs(res.preferencias);
        const arr = (res.preferencias.prefRegrasPadrao as string[] | null) ?? [];
        setRegrasSel(new Set(arr.filter((k) => REGRAS_PARTIDA.includes(k as (typeof REGRAS_PARTIDA)[number]))));
      } catch {
        toast.error('Não foi possível carregar preferências');
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, []);

  function toggleRegra(key: string) {
    setRegrasSel((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }

  function salvar() {
    if (!prefs) return;
    startTransition(async () => {
      try {
        const res = await putPrefsGerais({
          prefNumTimes: prefs.prefNumTimes,
          prefBoleirosPorTime: prefs.prefBoleirosPorTime,
          prefTempoPartida: prefs.prefTempoPartida,
          prefTempoTotal: prefs.prefTempoTotal,
          prefFormatoHora: prefs.prefFormatoHora,
          prefRegrasPadrao: Array.from(regrasSel) as (typeof REGRAS_PARTIDA)[number][],
        });
        setPrefs(res.preferencias);
        toast.success('Preferências salvas');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Falha ao salvar');
      }
    });
  }

  async function handleSair() {
    if (!window.confirm('Deseja sair da sua conta?')) return;
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/login');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  if (loading || !prefs) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Preferências</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Formato de hora</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <Segmented
              value={prefs.prefFormatoHora}
              onChange={(v) => setPrefs((p) => (p ? { ...p, prefFormatoHora: v as '24h' | '12h' } : p))}
              options={[
                { value: '24h', label: '24h' },
                { value: '12h', label: '12h' },
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Padrões para novas partidas
        </h2>
        <Card>
          <CardContent className="space-y-4 px-4 py-4">
            <p className="text-xs text-muted">
              Estes valores são preenchidos automaticamente ao criar uma nova partida.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="min-w-[140px]">
                <Label className="mb-1 block text-xs text-muted">Times</Label>
                <NumberStepper
                  value={prefs.prefNumTimes ?? 2}
                  min={2}
                  max={4}
                  onChange={(v) => setPrefs((p) => (p ? { ...p, prefNumTimes: v } : p))}
                  ariaLabel="Número de times"
                />
              </div>
              <div className="min-w-[140px]">
                <Label className="mb-1 block text-xs text-muted">Boleiros / time</Label>
                <NumberStepper
                  value={prefs.prefBoleirosPorTime ?? 5}
                  min={3}
                  max={11}
                  onChange={(v) => setPrefs((p) => (p ? { ...p, prefBoleirosPorTime: v } : p))}
                  ariaLabel="Boleiros por time"
                />
              </div>
              <div className="min-w-[140px]">
                <Label className="mb-1 block text-xs text-muted">Tempo de jogo (min)</Label>
                <NumberStepper
                  value={prefs.prefTempoPartida ?? 15}
                  min={3}
                  max={60}
                  onChange={(v) => setPrefs((p) => (p ? { ...p, prefTempoPartida: v } : p))}
                  suffix="min"
                  ariaLabel="Tempo de partida"
                />
              </div>
              <div className="min-w-[160px]">
                <Label className="mb-1 block text-xs text-muted">Duração total (min)</Label>
                <NumberStepper
                  value={prefs.prefTempoTotal ?? 90}
                  min={30}
                  max={240}
                  onChange={(v) => setPrefs((p) => (p ? { ...p, prefTempoTotal: v } : p))}
                  suffix="min"
                  ariaLabel="Tempo total"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted">Regras ativas por padrão</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {REGRAS_PARTIDA.map((key) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={regrasSel.has(key)}
                      onCheckedChange={() => toggleRegra(key)}
                    />
                    {REGRA_LABEL[key] ?? key}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={salvar} disabled={isPending} className="w-full">
              {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              Salvar preferências
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Conta</h2>
        <Button
          variant="outline"
          className="w-full border-destructive/40 text-destructive hover:bg-error-highlight"
          onClick={handleSair}
          disabled={signingOut}
        >
          {signingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={16} />}
          Sair
        </Button>
      </section>
    </div>
  );
}
