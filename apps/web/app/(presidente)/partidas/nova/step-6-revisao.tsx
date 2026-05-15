'use client';

import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useWizardStore, combinarDataHora } from './wizard-store';

const NIVEL_REGRAS: Record<string, string> = {
  cartao_azul: 'Cartão Azul',
  bloqueio_vermelho: 'Bloqueio após vermelho',
  bloqueio_inadimplente: 'Bloqueio inadimplente',
  gol_olimpico_duplo: 'Gol olímpico vale 2',
  impedimento_ativo: 'Impedimento ativo',
  penalti_max_por_tempo: 'Limite de pênaltis',
  time_menor_joga: 'Time incompleto joga',
  goleiro_obrigatorio: 'Goleiro obrigatório',
};

interface Step6Props {
  nomeGrupo: string;
  totalBoleirosAvailable: number;
}

export function Step6Revisao({ nomeGrupo, totalBoleirosAvailable }: Step6Props) {
  const state = useWizardStore();
  const goTo = (i: number) => state.setCurrentStep(i);

  const dt = combinarDataHora(state.data, state.hora);
  const dataFmt = dt
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'short' }).format(dt)
    : 'Data inválida';

  const totalSelecionados = state.boleirosIds.length + state.convidados.length;
  const vagas = state.numTimes * (state.boleirosPorTime + state.reservasPorTime);
  const naEspera = Math.max(0, totalSelecionados - vagas);

  const regrasAtivas = (Object.keys(state.regras) as Array<keyof typeof state.regras>)
    .filter((k) => state.regras[k].ativo)
    .map((k) => NIVEL_REGRAS[k] ?? k);

  return (
    <div className="space-y-4">
      <header>
        <h2 className="font-display text-2xl font-bold leading-tight">Tudo certo?</h2>
        <p className="text-sm text-muted">Confira as informações antes de criar a partida.</p>
      </header>

      <ReviewCard title="Quando e como" onEdit={() => goTo(1)}>
        <p className="text-sm">{dataFmt}</p>
        <p className="text-xs text-muted">
          {state.numTimes} times · {state.boleirosPorTime} boleiros por time
          {state.reservasPorTime > 0 ? ` + ${state.reservasPorTime} reservas` : ''} ·{' '}
          {state.tempoPartida} min/partida · {state.tempoTotal} min totais
        </p>
        <p className="mt-1 text-xs font-medium text-foreground">
          Cobrança da partida:{' '}
          {state.tipoCobrancaPartida === 'mensalidade' ? 'Mensalidade (mês)' : 'Por partida'}
        </p>
        {state.recorrenteAtivo ? (
          <p className="mt-1 text-xs font-medium text-primary">
            Série semanal: {state.semanasOcorrencias} peladas (mesmo dia da semana e horário, +7 dias entre cada)
          </p>
        ) : null}
      </ReviewCard>

      <ReviewCard title="Local" onEdit={() => goTo(0)}>
        {state.usarEstadioCadastrado ? (
          state.estadioNome ? (
            <>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{state.estadioNome}</p>
                <Badge variant="primarySoft">Estádio cadastrado</Badge>
              </div>
              {state.estadioCidade ? (
                <p className="text-xs text-muted">
                  {state.estadioCidade}
                  {state.estadioEstado ? `/${state.estadioEstado}` : ''}
                </p>
              ) : null}
              <p className="text-xs text-muted">
                Será enviado para aprovação do dono do estádio.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">Estádio não selecionado</p>
          )
        ) : (
          <>
            <p className="text-sm">{state.localLivre || '—'}</p>
            {state.cidade ? <p className="text-xs text-muted">{state.cidade}</p> : null}
          </>
        )}
      </ReviewCard>

      <ReviewCard title="Boleiros confirmados" onEdit={() => goTo(2)}>
        <p className="text-sm">
          {totalSelecionados} de {vagas} {vagas === 1 ? 'vaga' : 'vagas'}
          {naEspera > 0 ? ` · ${naEspera} na lista de espera` : ''}
        </p>
        <p className="text-xs text-muted">
          {state.boleirosIds.length} {state.boleirosIds.length === 1 ? 'fixo' : 'fixos'} ·{' '}
          {state.convidados.length} {state.convidados.length === 1 ? 'convidado' : 'convidados'}
          {totalBoleirosAvailable > 0 ? ` · grupo ${nomeGrupo}` : ''}
        </p>
      </ReviewCard>

      <ReviewCard title="Regras ativas" onEdit={() => goTo(3)}>
        {regrasAtivas.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma regra especial</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {regrasAtivas.map((r) => (
              <Badge key={r} variant="primarySoft">
                {r}
              </Badge>
            ))}
          </div>
        )}
      </ReviewCard>

      <ReviewCard title="Vaquinha" onEdit={() => goTo(4)}>
        {state.vaquinha.ativa ? (
          <>
            <p className="text-sm">
              {state.tipoCobrancaPartida === 'mensalidade' ? 'Mensalidade (mês)' : 'Vaquinha desta partida'} ·{' '}
              {state.vaquinha.tipoChavePix?.toUpperCase()}
            </p>
            <p className="text-xs text-muted">
              Fixos: R$ {state.vaquinha.valorBoleiroFixo.toFixed(2)}
              {state.convidados.length > 0
                ? ` · Convidados: R$ ${(state.vaquinha.mesmoValor ? state.vaquinha.valorBoleiroFixo : state.vaquinha.valorConvidadoAvulso).toFixed(2)}`
                : ''}
            </p>
            <p className="text-xs text-muted">Chave: {state.vaquinha.chavePix}</p>
          </>
        ) : (
          <p className="text-sm text-muted">Sem vaquinha nesta partida</p>
        )}
      </ReviewCard>
    </div>
  );
}

function ReviewCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{title}</p>
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Editar ${title}`}
            className="text-muted hover:text-foreground"
          >
            <Pencil size={14} />
          </button>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
