'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle, Check, ExternalLink, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  cancelarAssinatura,
  criarAssinatura,
  type AssinaturaResponse,
  type BillingType,
  type PlanoPago,
} from '@/lib/assinatura-actions';
import type { PlanoResponse } from '@/lib/perfil-actions';
import { EscolherFormaPagamentoDialog } from './escolher-forma-pagamento-dialog';

interface Props {
  initial: PlanoResponse;
  assinatura: AssinaturaResponse | null;
}

const PLANOS = [
  {
    codigo: 'trial' as const,
    nome: 'Grátis (Trial)',
    preco: 'Grátis (14 dias)',
    grupos: '1',
    boleiros: '15',
    partidas: '3/mês',
    historico: '30 dias',
    escalacao: true,
    vaquinha: true,
    share: false,
    estadio: '—',
    agenda: '—',
    vinculos: '—',
    recomendado: false,
  },
  {
    codigo: 'presidente_mensal' as const,
    nome: 'Presidente',
    preco: 'R$ 19,90/mês',
    grupos: 'Ilimitados',
    boleiros: 'Ilimitados',
    partidas: 'Ilimitadas',
    historico: 'Completo',
    escalacao: true,
    vaquinha: true,
    share: true,
    estadio: '—',
    agenda: '—',
    vinculos: '—',
    recomendado: true,
  },
  {
    codigo: 'estadio_mensal' as const,
    nome: 'Dono do Estádio',
    preco: 'R$ 29,90/mês',
    grupos: '—',
    boleiros: '—',
    partidas: '—',
    historico: '—',
    escalacao: '—',
    vaquinha: '—',
    share: '—',
    estadio: true,
    agenda: true,
    vinculos: true,
    recomendado: false,
  },
  {
    codigo: 'combo_mensal' as const,
    nome: 'Combo',
    preco: 'R$ 39,90/mês',
    grupos: 'Ilimitados',
    boleiros: 'Ilimitados',
    partidas: 'Ilimitadas',
    historico: 'Completo',
    escalacao: true,
    vaquinha: true,
    share: true,
    estadio: true,
    agenda: true,
    vinculos: true,
    recomendado: false,
  },
];

function Cell({ v }: { v: boolean | string }) {
  if (typeof v === 'boolean') return v ? <Check size={16} className="text-success" /> : '—';
  return <span className="text-xs">{v}</span>;
}

const STATUS_LABEL: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'default' }> = {
  ativa: { label: 'Ativa', variant: 'success' },
  pendente: { label: 'Aguardando pagamento', variant: 'warning' },
  inadimplente: { label: 'Inadimplente', variant: 'destructive' },
  cancelada: { label: 'Cancelada', variant: 'default' },
};

export function PlanosClient({ initial, assinatura: assinaturaInicial }: Props) {
  const [plano, setPlano] = useState(initial.plano);
  const [expiraEm, setExpiraEm] = useState(initial.expiraEm);
  const [trialRestante] = useState(initial.trialRestante);
  const [assinatura, setAssinatura] = useState(assinaturaInicial?.assinatura ?? null);
  const [simulado] = useState(assinaturaInicial?.simulado ?? false);
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [planoEscolhido, setPlanoEscolhido] = useState<PlanoPago | null>(null);

  function abrirAssinar(codigo: PlanoPago) {
    setPlanoEscolhido(codigo);
    setDialogOpen(true);
  }

  async function confirmarAssinar(billingType: BillingType) {
    if (!planoEscolhido) return;
    try {
      const res = await criarAssinatura(planoEscolhido, billingType);
      setAssinatura(res.assinatura);
      setPlano(res.assinatura.plano as typeof plano);
      setExpiraEm(res.assinatura.proximoVencimento);
      setDialogOpen(false);
      toast.success('Assinatura criada. Abrindo checkout…');
      if (res.linkPagamento) {
        window.open(res.linkPagamento, '_blank', 'noopener,noreferrer');
      } else if (res.simulado) {
        toast.info('Modo simulado: assinatura registrada localmente sem cobrança real.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao criar assinatura');
    }
  }

  function handleCancelar() {
    if (!assinatura) return;
    if (!window.confirm('Cancelar a assinatura ao fim do ciclo atual? Você mantém acesso até o vencimento.')) {
      return;
    }
    startTransition(async () => {
      try {
        const res = await cancelarAssinatura();
        setAssinatura(res.assinatura);
        toast.success('Assinatura será cancelada ao fim do ciclo.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Falha ao cancelar');
      }
    });
  }

  function reabrirPagamento() {
    if (assinatura?.linkPagamento) {
      window.open(assinatura.linkPagamento, '_blank', 'noopener,noreferrer');
    } else {
      toast.error('Link de pagamento indisponível. Tente novamente em instantes.');
    }
  }

  const nomeAtual =
    PLANOS.find((p) => p.codigo === plano)?.nome ??
    (plano === 'trial' ? 'Grátis (Trial)' : plano);
  const planoEscolhidoLabel = planoEscolhido
    ? PLANOS.find((p) => p.codigo === planoEscolhido)?.nome ?? planoEscolhido
    : '';

  return (
    <div className="container space-y-5 py-5">
      <header>
        <h1 className="font-display text-2xl font-bold leading-tight">Planos e assinatura</h1>
        <p className="text-xs text-muted">Compare os planos e escolha o ideal para você.</p>
      </header>

      {simulado ? (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-highlight px-4 py-3 text-sm">
          <Info size={18} className="mt-0.5 shrink-0 text-warning" />
          <span className="text-foreground">
            <strong>Modo simulado:</strong> sem chave Asaas configurada no servidor. Assinaturas
            criadas aqui não geram cobrança real.
          </span>
        </div>
      ) : null}

      {plano === 'trial' && trialRestante !== null && trialRestante > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary-highlight px-4 py-3 text-sm text-primary">
          <Info size={18} className="mt-0.5 shrink-0" />
          <span>
            Seu trial gratuito termina em <strong>{trialRestante}</strong>{' '}
            {trialRestante === 1 ? 'dia' : 'dias'}.
          </span>
        </div>
      ) : null}

      {assinatura?.status === 'inadimplente' ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-destructive">Assinatura inadimplente</p>
            <p className="text-muted">Regularize o pagamento para manter o acesso completo.</p>
          </div>
          {assinatura.linkPagamento ? (
            <Button size="sm" onClick={reabrirPagamento}>
              <ExternalLink size={14} /> Regularizar
            </Button>
          ) : null}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="primary">SEU PLANO ATUAL</Badge>
            {assinatura?.status ? (
              <Badge variant={STATUS_LABEL[assinatura.status]?.variant ?? 'default'}>
                {STATUS_LABEL[assinatura.status]?.label ?? assinatura.status}
              </Badge>
            ) : null}
            {assinatura?.cancelaEmFimCiclo ? (
              <Badge variant="warning">Cancela no fim do ciclo</Badge>
            ) : null}
          </div>
          <CardTitle className="text-xl">{nomeAtual}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-4 pb-4 text-sm">
          {assinatura?.proximoVencimento ? (
            <p className="text-muted">
              Próximo vencimento:{' '}
              <strong>{new Date(assinatura.proximoVencimento).toLocaleDateString('pt-BR')}</strong>
            </p>
          ) : expiraEm ? (
            <p className="text-muted">
              Renovação / vencimento:{' '}
              <strong>{new Date(expiraEm).toLocaleDateString('pt-BR')}</strong>
            </p>
          ) : plano === 'trial' ? (
            <p className="text-muted">Você está no período de trial gratuito.</p>
          ) : null}
          {assinatura?.ultimoPagamentoEm ? (
            <p className="text-muted">
              Último pagamento:{' '}
              <strong>{new Date(assinatura.ultimoPagamentoEm).toLocaleDateString('pt-BR')}</strong>
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            {assinatura?.status === 'pendente' && assinatura?.linkPagamento ? (
              <Button onClick={reabrirPagamento}>
                <ExternalLink size={14} /> Abrir pagamento
              </Button>
            ) : null}
            {assinatura &&
            assinatura.status !== 'cancelada' &&
            !assinatura.cancelaEmFimCiclo ? (
              <Button variant="outline" onClick={handleCancelar} disabled={isPending}>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                Cancelar ao fim do ciclo
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="p-2 text-left font-medium">Recurso</th>
              {PLANOS.map((p) => (
                <th key={p.codigo} className="p-2 text-center font-medium">
                  {p.nome}
                  {p.recomendado ? (
                    <Badge variant="primary" className="ml-1 text-[10px]">
                      Recomendado
                    </Badge>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Grupos', 'grupos'],
              ['Boleiros por grupo', 'boleiros'],
              ['Partidas/mês', 'partidas'],
              ['Histórico', 'historico'],
              ['Escalação automática', 'escalacao'],
              ['Vaquinha', 'vaquinha'],
              ['Card compartilhamento', 'share'],
              ['Estádio cadastrado', 'estadio'],
              ['Gestão de agenda', 'agenda'],
              ['Aprovação de vínculos', 'vinculos'],
              ['Preço', 'preco'],
            ].map(([label, key]) => (
              <tr key={key} className="border-b border-border last:border-0">
                <td className="p-2 font-medium">{label}</td>
                {PLANOS.map((p) => (
                  <td key={p.codigo} className="p-2 text-center">
                    <Cell v={p[key as keyof typeof p] as boolean | string} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-xs text-muted">Cancele quando quiser — sem fidelidade.</p>

      <div className="grid gap-2 sm:grid-cols-2">
        {PLANOS.filter((p) => p.codigo !== 'trial').map((p) => {
          const ehAtual = plano === p.codigo && assinatura?.status && assinatura.status !== 'cancelada';
          return (
            <Card key={p.codigo}>
              <CardContent className="space-y-2 px-4 py-4">
                <p className="font-display text-lg font-semibold">{p.nome}</p>
                <p className="text-sm text-muted">{p.preco}</p>
                <Button
                  className="w-full"
                  variant={p.recomendado ? 'default' : 'outline'}
                  onClick={() => abrirAssinar(p.codigo as PlanoPago)}
                  disabled={ehAtual}
                >
                  {ehAtual ? 'Plano atual' : 'Assinar agora'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <EscolherFormaPagamentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        planoLabel={planoEscolhidoLabel}
        onConfirm={confirmarAssinar}
        saving={isPending}
      />
    </div>
  );
}
