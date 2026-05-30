'use client';

import { useEffect, useState } from 'react';
import { Plus, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ConvidadoEditDialog } from '@/components/convidados/convidado-edit-dialog';
import { ConvidadoPoolFormDialog } from '@/components/convidados/convidado-pool-form-dialog';
import {
  listConvidadosGrupo,
  promoverConvidadoGrupo,
} from '@/lib/grupos-actions';
import type { ConvidadoGrupoItem } from '@/lib/types';

export function ConvidadosGrupoTab({ grupoId }: { grupoId: string }) {
  const [convidados, setConvidados] = useState<ConvidadoGrupoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ConvidadoGrupoItem | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const { convidados: list } = await listConvidadosGrupo(grupoId);
      setConvidados(list);
    } catch {
      toast.error('Não foi possível carregar convidados.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [grupoId]);

  async function handlePromover(c: ConvidadoGrupoItem) {
    if (!window.confirm(`Promover ${c.nome} a boleiro fixo?`)) return;
    try {
      await promoverConvidadoGrupo(grupoId, c.convidadoGrupoId);
      toast.success(`${c.nome} promovido a boleiro fixo.`);
      void reload();
    } catch {
      toast.error('Não foi possível promover.');
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Convidados na lista de espera do grupo — selecione na hora de convocar partidas.
        </p>
        <Button onClick={() => setFormOpen(true)} className="hidden md:inline-flex">
          <Plus size={16} /> Adicionar convidado
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-20 w-full" />
      ) : convidados.length === 0 ? (
        <EmptyState
          variant="dashed"
          title="Nenhum convidado na lista"
          description="Adicione convidados avulsos que jogam ocasionalmente."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus size={16} /> Adicionar convidado
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {convidados.map((c) => (
            <li
              key={c.convidadoGrupoId}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
            >
              <Avatar name={c.nome} src={c.fotoUrl} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{c.nome}</p>
                  {c.posicao ? <Badge variant="primarySoft">{c.posicao}</Badge> : null}
                </div>
                <p className="text-xs text-muted">Lista de espera</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(c);
                    setEditOpen(true);
                  }}
                >
                  Editar
                </Button>
                <Button type="button" size="sm" onClick={() => handlePromover(c)}>
                  <UserPlus size={14} /> Promover
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConvidadoPoolFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        grupoId={grupoId}
        onSaved={() => void reload()}
      />
      <ConvidadoEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        convidado={editing}
        onSaved={() => void reload()}
      />
    </section>
  );
}
