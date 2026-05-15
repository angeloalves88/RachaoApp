'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Check,
  CheckCircle2,
  Clock,
  MailOpen,
  MoreVertical,
  Send,
  Stethoscope,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  removeConvite,
  updateConviteStatus,
} from '@/lib/partidas-actions';
import type { PartidaConvite, PartidaDetalhe, StatusConvite } from '@/lib/types';
import { ReenviarModal } from './reenviar-modal';

interface Props {
  partida: PartidaDetalhe;
}

type TabValue =
  | 'todos'
  | 'confirmado'
  | 'pendente'
  | 'recusado'
  | 'lista_espera'
  | 'departamento_medico';

const TABS: Array<{ value: TabValue; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'confirmado', label: 'Confirmados' },
  { value: 'pendente', label: 'Pendentes' },
  { value: 'recusado', label: 'Recusados' },
  { value: 'departamento_medico', label: 'DM' },
  { value: 'lista_espera', label: 'Lista de espera' },
];

const STATUS_LABEL: Record<StatusConvite, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  recusado: 'Recusado',
  lista_espera: 'Lista de espera',
  departamento_medico: 'DM',
};

export function PresencasClient({ partida }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabValue>('todos');
  const [reenvioOpen, setReenvioOpen] = useState(
    () => searchParams.get('reenviar') === 'true',
  );
  const [reenvioSeed, setReenvioSeed] = useState<string[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const readonly = partida.status === 'encerrada' || partida.status === 'cancelada';

  const filtrados = useMemo(() => {
    if (tab === 'todos') return partida.convites;
    return partida.convites.filter((c) => c.status === tab);
  }, [partida.convites, tab]);

  const totalVagas = partida.resumo.vagasTotais;
  const ocupadas = partida.resumo.confirmados + partida.resumo.pendentes;
  const progresso = totalVagas > 0 ? Math.min(100, Math.round((ocupadas / totalVagas) * 100)) : 0;
  const partidaCompleta = partida.resumo.confirmados >= totalVagas && totalVagas > 0;
  const poucoConfirmado =
    !partidaCompleta &&
    !readonly &&
    totalVagas > 0 &&
    partida.resumo.confirmados < Math.ceil(totalVagas / 2);
  const pendentesIds = useMemo(
    () => partida.convites.filter((c) => c.status === 'pendente').map((c) => c.id),
    [partida.convites],
  );

  function abrirReenvioPendentes() {
    setReenvioSeed(pendentesIds);
    setReenvioOpen(true);
  }

  function abrirReenvioUm(conviteId: string) {
    setReenvioSeed([conviteId]);
    setReenvioOpen(true);
  }

  async function handleStatus(convite: PartidaConvite, novo: StatusConvite) {
    try {
      await updateConviteStatus(partida.id, convite.id, { status: novo });
      toast.success(`Marcado como ${STATUS_LABEL[novo].toLowerCase()}`);
      startTransition(() => router.refresh());
    } catch {
      toast.error('Nao foi possivel atualizar o convite.');
    }
  }

  async function handleRemover(convite: PartidaConvite) {
    if (!window.confirm('Remover este boleiro da partida?')) return;
    try {
      await removeConvite(partida.id, convite.id);
      toast.success('Boleiro removido.');
      startTransition(() => router.refresh());
    } catch {
      toast.error('Nao foi possivel remover.');
    }
  }

  return (
    <div className="space-y-4">
      {/* Banners de estado */}
      {readonly ? (
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted">
          Lista somente leitura · presenca final registrada.
        </p>
      ) : null}
      {partidaCompleta ? (
        <p className="rounded-lg border border-success/40 bg-success-highlight px-3 py-2 text-sm text-success">
          Partida completa! Todas as vagas confirmadas.
        </p>
      ) : null}
      {poucoConfirmado ? (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-warning/40 bg-warning-highlight px-3 py-2 text-sm text-warning">
          <p>
            Voce tem {totalVagas - partida.resumo.confirmados} vagas em aberto.
          </p>
          <button
            type="button"
            onClick={abrirReenvioPendentes}
            className="shrink-0 text-xs font-medium underline"
          >
            Reenviar pendentes
          </button>
        </div>
      ) : null}

      {/* Resumo */}
      <Card>
        <CardContent className="space-y-3 px-4 py-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ResumoPill
              label="Confirmados"
              value={partida.resumo.confirmados}
              icon={<CheckCircle2 size={14} />}
              color="text-success"
            />
            <ResumoPill
              label="Recusados"
              value={partida.resumo.recusados}
              icon={<XCircle size={14} />}
              color="text-destructive"
            />
            <ResumoPill
              label="Pendentes"
              value={partida.resumo.pendentes}
              icon={<Clock size={14} />}
              color="text-warning"
            />
            <ResumoPill
              label="Lista de espera"
              value={partida.resumo.listaEspera}
              icon={<MailOpen size={14} />}
              color="text-muted"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted">
              {ocupadas} de {totalVagas} vagas preenchidas
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-offset">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>
          {!readonly ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={abrirReenvioPendentes}
                disabled={pendentesIds.length === 0}
              >
                <Send size={14} /> Reenviar para pendentes ({pendentesIds.length})
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Lista com tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="space-y-2">
          {filtrados.length === 0 ? (
            <EmptyState
              variant="dashed"
              title="Nenhum boleiro nesta categoria"
              description="Use as tabs para alternar entre os filtros."
            />
          ) : (
            <ul className="space-y-2">
              {filtrados.map((c) => (
                <BoleiroRow
                  key={c.id}
                  convite={c}
                  readonly={readonly || isPending}
                  onSetStatus={(novo) => handleStatus(c, novo)}
                  onReenviar={() => abrirReenvioUm(c.id)}
                  onRemover={() => handleRemover(c)}
                />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <ReenviarModal
        open={reenvioOpen}
        onOpenChange={(o) => {
          setReenvioOpen(o);
          if (!o) setReenvioSeed(null);
        }}
        partida={partida}
        seedConviteIds={reenvioSeed}
      />
    </div>
  );
}

function ResumoPill({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2">
      <span className={color}>{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted">{label}</p>
        <p className="font-display text-lg font-semibold leading-none tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );
}

interface BoleiroRowProps {
  convite: PartidaConvite;
  readonly: boolean;
  onSetStatus: (novo: StatusConvite) => void;
  onReenviar: () => void;
  onRemover: () => void;
}

function BoleiroRow({
  convite,
  readonly,
  onSetStatus,
  onReenviar,
  onRemover,
}: BoleiroRowProps) {
  const boleiro = convite.boleiro;
  const nome = boleiro?.nome ?? 'Boleiro removido';
  const subtitulo = boleiro?.apelido
    ? `"${boleiro.apelido}"${boleiro.posicao ? ` · ${boleiro.posicao}` : ''}`
    : boleiro?.posicao ?? '';
  const status = convite.status as StatusConvite;
  const statusVariant: Record<StatusConvite, 'success' | 'warning' | 'destructive' | 'default'> = {
    confirmado: 'success',
    pendente: 'warning',
    recusado: 'destructive',
    lista_espera: 'default',
    departamento_medico: 'warning',
  };
  const tipoLabel =
    convite.tipo === 'fixo' ? { text: 'Fixo', variant: 'default' as const } : { text: 'Convidado', variant: 'primarySoft' as const };
  const celular = boleiro && 'celular' in boleiro ? boleiro.celular : null;
  const email = boleiro && 'email' in boleiro ? boleiro.email : null;

  /**
   * Toggle de status: clicar no botao ja ativo volta a pendente. Caso contrario
   * troca para o status do botao. Lista de espera fica de fora (controlada pelo
   * servidor via promocao automatica).
   */
  function toggle(novo: Exclude<StatusConvite, 'lista_espera'>) {
    if (status === novo) onSetStatus('pendente');
    else onSetStatus(novo);
  }

  return (
    <li className="rounded-lg border border-border bg-surface px-3 py-2 sm:px-4 sm:py-3">
      <div className="flex items-start gap-3">
        <Avatar name={nome} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium leading-tight">{nome}</p>
            <Badge variant={tipoLabel.variant}>{tipoLabel.text}</Badge>
            <Badge variant={statusVariant[status]}>{STATUS_LABEL[status]}</Badge>
            {convite.posicaoEspera ? (
              <span className="text-xs text-muted">#{convite.posicaoEspera}</span>
            ) : null}
          </div>
          {subtitulo ? <p className="truncate text-xs text-muted">{subtitulo}</p> : null}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            {celular ? (
              <a
                href={`https://wa.me/55${celular}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                WhatsApp
              </a>
            ) : null}
            {email ? (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                E-mail
              </a>
            ) : null}
            {convite.recado ? (
              <span
                title={convite.recado}
                className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-muted"
              >
                💬 Com recado
              </span>
            ) : null}
          </div>
        </div>
        {!readonly ? (
          <div className="flex shrink-0 items-center gap-1">
            <StatusButton
              icon={Check}
              label="Confirmar presenca"
              tone="success"
              active={status === 'confirmado'}
              onClick={() => toggle('confirmado')}
            />
            <StatusButton
              icon={X}
              label="Marcar como recusado"
              tone="destructive"
              active={status === 'recusado'}
              onClick={() => toggle('recusado')}
            />
            <StatusButton
              icon={Stethoscope}
              label="Marcar como DM"
              tone="warning"
              active={status === 'departamento_medico'}
              onClick={() => toggle('departamento_medico')}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Mais acoes"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-offset hover:text-foreground"
                >
                  <MoreVertical size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onReenviar(); }}>
                  <Send size={14} /> Reenviar convite
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => { e.preventDefault(); onRemover(); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 size={14} /> Remover da partida
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>
    </li>
  );
}

type StatusButtonTone = 'success' | 'destructive' | 'warning';

const STATUS_BTN_TONE: Record<
  StatusButtonTone,
  { active: string; idle: string }
> = {
  success: {
    active: 'bg-success text-white border-success hover:bg-success/90',
    idle: 'text-success border-success/30 hover:bg-success-highlight',
  },
  destructive: {
    active: 'bg-destructive text-white border-destructive hover:bg-destructive/90',
    idle: 'text-destructive border-destructive/30 hover:bg-destructive-highlight',
  },
  warning: {
    active: 'bg-warning text-white border-warning hover:bg-warning/90',
    idle: 'text-warning border-warning/30 hover:bg-warning-highlight',
  },
};

function StatusButton({
  icon: Icon,
  label,
  tone,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  tone: StatusButtonTone;
  active: boolean;
  onClick: () => void;
}) {
  const cls = STATUS_BTN_TONE[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? `${label} (ativo — clique para voltar a pendente)` : label}
      aria-pressed={active}
      title={active ? `${label} — clique para voltar a pendente` : label}
      className={
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ' +
        (active ? cls.active : `bg-transparent ${cls.idle}`)
      }
    >
      <Icon size={16} aria-hidden />
    </button>
  );
}
