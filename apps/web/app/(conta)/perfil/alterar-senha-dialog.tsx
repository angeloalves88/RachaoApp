'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { alterarSenha } from '@/lib/perfil-actions';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AlterarSenhaDialog({ open, onOpenChange }: Props) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setSenhaAtual('');
    setSenhaNova('');
    setConfirmacao('');
  }

  async function salvar() {
    if (senhaNova !== confirmacao) {
      toast.error('Confirmação não confere');
      return;
    }
    if (senhaNova.length < 8) {
      toast.error('Nova senha precisa ter pelo menos 8 caracteres');
      return;
    }
    setSaving(true);
    try {
      await alterarSenha({ senhaAtual, senhaNova, confirmacao });
      toast.success('Senha alterada');
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao alterar senha');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="senha-atual">Senha atual</Label>
            <Input
              id="senha-atual"
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha-nova">Nova senha</Label>
            <Input
              id="senha-nova"
              type="password"
              value={senhaNova}
              onChange={(e) => setSenhaNova(e.target.value)}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted">
              Mínimo 8 caracteres com maiúscula, minúscula e número.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmacao">Confirmar nova senha</Label>
            <Input
              id="confirmacao"
              type="password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Alterar senha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
