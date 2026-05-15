'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronLeft,
  Copy,
  Edit3,
  MessageCircle,
  MoreVertical,
  Trash2,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Segmented } from '@/components/ui/segmented';
import {
  type VaquinhaPagador,
  type VaquinhaResponse,
  cobrarLote,
  deleteVaquinha,
  getVaquinha,
  updatePagamento,
} from '@/lib/vaquinha-actions';
import { formatDataPartida } from '@/lib/format';
import { CobrarLoteDialog } from './cobrar-lote-dialog';
import { ConfigVaquinhaDialog } from './config-vaquinha-dialog';

type Filtro = 'todos' | 'pago' | 'pendente' | 'inadimplente';
type ListaSegMensal = 'todos' | 'fixos' | 'convidados';

interface Props {
  initial: VaquinhaResponse;
  partidaId: string;
}

export function VaquinhaClient({ initial, partidaId }: Props) {
  const [data, setData] = useState<VaquinhaResponse>(initial);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [isPending, startTransition] = useTransition();
  const [cobrarOpen, setCobrarOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [listaMensalSeg, setListaMensalSeg] = useState<ListaSegMensal>('todos');

  async function reload() {
    try {
      const fresh = await getVaquinha(partidaId);
      setData(fresh);
    } catch {
      // silencioso — usuario ja viu o toast
    }
  }

  const v = data.vaquinha;

  const filtrados = useMemo(() => {
    if (!v) return [];
    let base =
      filtro === 'todos' ? data.pagadores : data.pagadores.filter((p) => p.status === filtro);
    if (v.tipo === 'mensalidade') {
      if (listaMensalSeg === 'fixos') base = base.filter((p) => p.tipoPagador === 'fixo');
      if (listaMensalSeg === 'convidados') {
        base = base.filter((p) => p.tipoPagador === 'convidado_avulso');
      }
    }
    return base;
  }, [data.pagadores, filtro, v, listaMensalSeg]);

  const pendentesIds = useMemo(
    () =>
      data.pagadores
        .filter((p) => p.status === 'pendente' || p.status === 'inadimplente')
        .map((p) => p.id),
    [data.pagadores],
  );

  const progresso =
    v && data.totais.esperado > 0
      ? Math.min(100, Math.round((data.totais.arrecadado / data.totais.esperado) * 100))
      : 0;

  const corBarra =
    progresso >= 100 ? 'bg-success' : progresso >= 50 ? 'bg-primary' : 'bg-destructive';

  async function copiarChave() {
    if (!v) return;
    try {
      await navigator.clipboard.writeText(v.chavePix);
      toast.success('Chave Pix copiada');
    } catch {
      toast.error('Não foi possível copiar');
    }
  }

  function marcarPago(p: VaquinhaPagador) {
    setData((prev) => ({
      ...prev,
      pagadores: prev.pagadores.map((x) =>
        x.id === p.id
          ? { ...x, status: 'pago' as const, dataPagamento: new Date().toISOString() }
          : x,
      ),
    }));

    startTransition(async () => {
      try {
        await updatePagamento(p.id, { status: 'pago' });
        toast.success(`${p.boleiro?.nome ?? 'Boleiro'} marcado como pago`, {
          description: 'Recarregando totais...',
          action: {
            label: 'Desfazer',
            onClick: () => desfazerPagamento(p.id),
          },
          duration: 10000,
        });
        await reload();
      } catch {
        toast.error('Falha ao marcar pagamento');
        await reload();
      }
    });
  }

  function desfazerPagamento(pagamentoId: string) {
    setData((prev) => ({
      ...prev,
      pagadores: prev.pagadores.map((x) =>
        x.id === pagamentoId
          ? { ...x, status: 'pendente' as const, dataPagamento: null }
          : x,
      ),
    }));
    startTransition(async () => {
      try {
        await updatePagamento(pagamentoId, { status: 'pendente' });
        toast.message('Pagamento desfeito');
        await reload();
      } catch {
        toast.error('Falha ao desfazer pagamento');
        await reload();
      }
    });
  }

  function whatsappIndividual(p: VaquinhaPagador) {
    if (!v) return;
    const celular = p.boleiro?.celular?.replace(/\D/g, '');
    if (!celular || celular.length !== 11) {
      toast.error('Boleiro sem WhatsApp válido');
      return;
    }
    const dataFmt = formatDataPartida(data.partida.dataHora);
    const valor = p.valorCobrado.toFixed(2).replace('.', ',');
    const mensagem =
      `E aí, ${p.boleiro?.nome ?? ''}! 👋\n` +
      `Sua parte da pelada de ${dataFmt} ainda está em aberto.\n\n` +
      `💰 Valor: R$ ${valor}\n` +
      `🏦 Pix: ${v.chavePix}\n\n` +
      `Qualquer dúvida é só falar!`;
    const url = `https://wa.me/55${celular}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function removerVaquinha() {
    if (!v) return;
    if (!window.confirm('Remover a vaquinha desta partida? Os pagamentos serão apagados.')) return;
    try {
      await deleteVaquinha(v.id);
      toast.success('Vaquinha removida');
      await reload();
    } catch {
      toast.error('Falha ao remover vaquinha');
    }
  }

  async function abrirCobrarLote(mensagem: string, pagamentoIds: string[]) {
    if (!v) return;
    try {
      const res = await cobrarLote(v.id, { mensagem, pagamentoIds });
      if (res.semWhatsapp > 0) {
        toast.warning(
          `${res.semWhatsapp} boleiro(s) sem WhatsApp foram pulados`,
        );
      }
      for (const link of res.links) {
        window.open(link.url, '_blank', 'noopener,noreferrer');
        await new Promise((r) => setTimeout(r, 400));
      }
      toast.success(`${res.links.length} cobrança(s) abertas no WhatsApp`);
      setCobrarOpen(false);
    } catch {
      toast.error('Falha ao gerar cobrança');
    }
  }

  // Estado: sem vaquinha — oferece criar.
  if (!v) {
    return (
      <div className="container space-y-4 py-5">
        <header className="flex items-center gap-2">
          <Link
            href={`/partidas/${partidaId}`}
            aria-label="Voltar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-offset"
          >
            <ChevronLeft size={18} />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold leading-tight">Vaquinha</h1>
              <Badge variant="outline">
                {data.partida.tipoCobranca === 'mensalidade' ? 'Mensalidade' : 'Por partida'}
              </Badge>
            </div>
            <p className="text-xs text-muted">
              {data.partida.grupo.nome} · {formatDataPartida(data.partida.dataHora)}
            </p>
          </div>
        </header>

        <Card>
          <CardContent className="space-y-3 px-4 py-6 text-center">
            <p className="font-medium">Nenhuma vaquinha configurada</p>
            <p className="text-sm text-muted">
              Configure a chave Pix e os valores para começar a controlar pagamentos.
            </p>
            <Button onClick={() => setConfigOpen(true)}>Configurar vaquinha</Button>
          </CardContent>
        </Card>

        <ConfigVaquinhaDialog
          open={configOpen}
          onOpenChange={setConfigOpen}
          partidaId={partidaId}
          vaquinha={null}
          tipoCobrancaPartida={data.partida.tipoCobranca ?? 'por_partida'}
          numFixos={data.pagadores.filter((p) => p.tipoPagador === 'fixo').length}
          numConvidados={data.pagadores.filter((p) => p.tipoPagador === 'convidado_avulso').length}
          onSaved={reload}
        />
      </div>
    );
  }

  return (
    <div className="container space-y-4 py-5 pb-24">
      {/* Header */}
      <header className="flex items-center gap-2">
        <Link
          href={`/partidas/${partidaId}`}
          aria-label="Voltar"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-offset"
        >
          <ChevronLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold leading-tight">Vaquinha</h1>
            <Badge variant="outline">
              {data.partida.tipoCobranca === 'mensalidade' ? 'Mensalidade' : 'Por partida'}
            </Badge>
          </div>
          <p className="text-xs text-muted">
            {data.partida.grupo.nome} · {formatDataPartida(data.partida.dataHora)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Mais opções"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-offset"
            >
              <MoreVertical size={18} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setConfigOpen(true)}>
              <Edit3 size={14} className="mr-2" />
              Editar configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={removerVaquinha}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 size={14} className="mr-2" />
              Remover vaquinha
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Card resumo */}
      <Card>
        <CardContent className="space-y-3 px-4 py-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Arrecadado</p>
              <p className="font-display text-2xl font-bold leading-none">
                R$ {data.totais.arrecadado.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-muted">Esperado</p>
              <p className="font-display text-base font-semibold leading-none text-foreground">
                R$ {data.totais.esperado.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-offset">
              <div
                className={`h-full ${corBarra} transition-all`}
                style={{ width: `${progresso}%` }}
              />
            </div>
            <p className="text-right text-xs text-muted">{progresso}%</p>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2">
            <div>
              <p className="text-xs text-muted">Chave Pix</p>
              <p className="font-mono text-sm">{v.chavePix}</p>
            </div>
            <Button size="sm" variant="outline" onClick={copiarChave}>
              <Copy size={14} />
              Copiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {data.partida.outraVaquinhaMensalidadeMesmoMesNoGrupo && v.tipo === 'mensalidade' ? (
        <p className="rounded-md border border-warning/40 bg-warning-highlight px-3 py-2 text-xs text-warning">
          Já existe outra vaquinha de <strong>mensalidade</strong> para este mês no grupo. Os fixos podem
          ter sido deduplicados (uma cobrança por boleiro e mês).
        </p>
      ) : null}

      {/* Pills */}
      <div className="flex flex-wrap gap-2 text-xs">
        <Pill label="Pagos" value={data.totais.pagos} variant="success" />
        <Pill label="Pendentes" value={data.totais.pendentes} variant="warning" />
        <Pill label="Inadimplentes" value={data.totais.inadimplentes} variant="destructive" />
      </div>

      {v.tipo === 'mensalidade' ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted">Lista</p>
          <Segmented<ListaSegMensal>
            value={listaMensalSeg}
            onChange={setListaMensalSeg}
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'fixos', label: 'Fixos' },
              { value: 'convidados', label: 'Convidados' },
            ]}
            size="sm"
          />
        </div>
      ) : null}

      {/* Tabs filtro */}
      <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="pago">Pagos</TabsTrigger>
          <TabsTrigger value="pendente">Pendentes</TabsTrigger>
          <TabsTrigger value="inadimplente">Inadimplentes</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Lista */}
      <div className="space-y-2">
        {filtrados.length === 0 ? (
          <Card>
            <CardContent className="px-4 py-6 text-center text-sm text-muted">
              Nenhum boleiro neste filtro.
            </CardContent>
          </Card>
        ) : (
          filtrados.map((p) => (
            <PagadorRow
              key={p.id}
              pagador={p}
              disabled={isPending}
              onMarcarPago={() => marcarPago(p)}
              onDesfazer={() => desfazerPagamento(p.id)}
              onWhatsapp={() => whatsappIndividual(p)}
            />
          ))
        )}
      </div>

      {/* FAB cobrar todos */}
      {pendentesIds.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-surface/95 backdrop-blur md:left-auto">
          <div className="container py-3">
            <Button
              type="button"
              className="w-full"
              onClick={() => setCobrarOpen(true)}
            >
              <MessageCircle size={16} />
              Cobrar {pendentesIds.length} pendente(s)
            </Button>
          </div>
        </div>
      ) : null}

      <CobrarLoteDialog
        open={cobrarOpen}
        onOpenChange={setCobrarOpen}
        pagadores={data.pagadores}
        chavePix={v.chavePix}
        dataPartida={data.partida.dataHora}
        onConfirm={abrirCobrarLote}
      />

      <ConfigVaquinhaDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        partidaId={partidaId}
        vaquinha={v}
        tipoCobrancaPartida={data.partida.tipoCobranca ?? 'por_partida'}
        numFixos={data.pagadores.filter((p) => p.tipoPagador === 'fixo').length}
        numConvidados={data.pagadores.filter((p) => p.tipoPagador === 'convidado_avulso').length}
        onSaved={reload}
      />
    </div>
  );
}

function Pill({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: 'success' | 'warning' | 'destructive';
}) {
  const map = {
    success: 'border-success/40 bg-success-highlight text-success',
    warning: 'border-warning/40 bg-warning-highlight text-warning',
    destructive: 'border-destructive/40 bg-error-highlight text-destructive',
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${map[variant]}`}
    >
      <span className="font-semibold">{value}</span>
      <span className="text-foreground/80">{label}</span>
    </span>
  );
}

function PagadorRow({
  pagador,
  disabled,
  onMarcarPago,
  onDesfazer,
  onWhatsapp,
}: {
  pagador: VaquinhaPagador;
  disabled: boolean;
  onMarcarPago: () => void;
  onDesfazer: () => void;
  onWhatsapp: () => void;
}) {
  const nome = pagador.boleiro?.nome ?? 'Convidado';
  const apelido = pagador.boleiro?.apelido ?? null;
  const valor = `R$ ${pagador.valorCobrado.toFixed(2).replace('.', ',')}`;
  const dataPagamento = pagador.dataPagamento
    ? new Date(pagador.dataPagamento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    : null;

  return (
    <Card>
      <CardContent className="flex items-center gap-3 px-3 py-2.5">
        <Avatar name={nome} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{nome}</p>
            {apelido ? (
              <span className="truncate text-xs text-muted">({apelido})</span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={pagador.tipoPagador === 'fixo' ? 'primarySoft' : 'outline'}>
              {pagador.tipoPagador === 'fixo' ? 'Fixo' : 'Convidado'}
            </Badge>
            <span className="text-xs font-medium">{valor}</span>
            {pagador.status === 'pago' ? (
              <Badge variant="success">Pago{dataPagamento ? ` em ${dataPagamento}` : ''}</Badge>
            ) : pagador.status === 'inadimplente' ? (
              <Badge variant="destructive">Inadimplente</Badge>
            ) : (
              <Badge variant="warning">Pendente</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {pagador.status !== 'pago' ? (
            <>
              <button
                type="button"
                disabled={disabled}
                onClick={onMarcarPago}
                aria-label="Marcar como pago"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-success hover:bg-success-highlight disabled:opacity-50"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={onWhatsapp}
                aria-label="Cobrar via WhatsApp"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-offset disabled:opacity-50"
              >
                <MessageCircle size={16} />
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={onDesfazer}
              aria-label="Desfazer pagamento"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-offset disabled:opacity-50"
            >
              <Undo2 size={16} />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
