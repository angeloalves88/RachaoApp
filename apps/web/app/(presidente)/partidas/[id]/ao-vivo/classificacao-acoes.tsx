'use client';

import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  jogoAtual: number;
  jogoFinalizado: boolean;
  isUltimoJogo: boolean;
  confirmandoFinalizar: boolean;
  finalizando: boolean;
  encerrando: boolean;
  nomeA: string;
  nomeB: string;
  golsA: number;
  golsB: number;
  onRequestFinalizar: () => void;
  onCancelarFinalizar: () => void;
  onConfirmarFinalizar: () => void;
  onProximaPartida: () => void;
  onEncerrar: () => void;
}

export function ClassificacaoAcoes({
  jogoAtual,
  jogoFinalizado,
  isUltimoJogo,
  confirmandoFinalizar,
  finalizando,
  encerrando,
  nomeA,
  nomeB,
  golsA,
  golsB,
  onRequestFinalizar,
  onCancelarFinalizar,
  onConfirmarFinalizar,
  onProximaPartida,
  onEncerrar,
}: Props) {
  return (
    <div className="container border-t border-border/60 pb-3 pt-2">
      {!jogoFinalizado && !confirmandoFinalizar && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onRequestFinalizar}>
            Finalizar jogo
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="shrink-0"
            onClick={onEncerrar}
            disabled={encerrando}
          >
            <Trophy className="h-4 w-4" />
            Encerrar
          </Button>
        </div>
      )}

      {!jogoFinalizado && confirmandoFinalizar && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-3">
          <p className="mb-2 text-sm font-semibold">
            Finalizar Jogo {jogoAtual}: {nomeA} {golsA} × {golsB} {nomeB}?
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={onCancelarFinalizar}
              disabled={finalizando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={onConfirmarFinalizar}
              disabled={finalizando}
            >
              {finalizando ? 'Salvando…' : 'Confirmar'}
            </Button>
          </div>
        </div>
      )}

      {jogoFinalizado && !isUltimoJogo && (
        <div className="space-y-2">
          <div className="rounded-lg bg-success/10 px-3 py-2 text-sm font-medium text-success">
            ✓ Jogo {jogoAtual} finalizado — {nomeA} {golsA}×{golsB} {nomeB}
          </div>
          <div className="flex gap-2">
            <Button type="button" className="flex-1" onClick={onProximaPartida}>
              Próxima partida →
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="shrink-0"
              onClick={onEncerrar}
              disabled={encerrando}
            >
              <Trophy className="h-4 w-4" />
              Encerrar
            </Button>
          </div>
        </div>
      )}

      {jogoFinalizado && isUltimoJogo && (
        <div className="space-y-2">
          <div className="rounded-lg bg-success/10 px-3 py-2 text-sm font-medium text-success">
            ✓ Jogo {jogoAtual} finalizado — {nomeA} {golsA}×{golsB} {nomeB}
          </div>
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            onClick={onEncerrar}
            disabled={encerrando}
          >
            <Trophy className="h-4 w-4" />
            {encerrando ? 'Encerrando…' : 'Encerrar evento'}
          </Button>
        </div>
      )}
    </div>
  );
}
