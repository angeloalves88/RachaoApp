'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ativarPerfil,
  excluirConta,
  logoutAllDevices,
  patchPerfil,
  type UsuarioPerfil,
} from '@/lib/perfil-actions';
import { uploadAvatar, UploadError } from '@/lib/storage';
import { AlterarSenhaDialog } from './alterar-senha-dialog';
import { ExcluirContaDialog } from './excluir-conta-dialog';

interface Props {
  initial: UsuarioPerfil;
  email: string;
}

export function PerfilClient({ initial, email }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<UsuarioPerfil>(initial);
  const [form, setForm] = useState({
    nome: initial.nome,
    apelido: initial.apelido ?? '',
    celular: initial.celular ?? '',
    cidade: initial.cidade ?? '',
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [showExcluir, setShowExcluir] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [isPending, startTransition] = useTransition();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  function salvar() {
    if (!form.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    startTransition(async () => {
      try {
        const res = await patchPerfil({
          nome: form.nome.trim(),
          apelido: form.apelido.trim() || null,
          celular: form.celular ? form.celular : undefined,
          cidade: form.cidade.trim() || null,
        });
        setUser(res.usuario);
        toast.success('Alterações salvas');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Falha ao salvar');
      }
    });
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file, user.id);
      const res = await patchPerfil({ avatarUrl: url });
      setUser(res.usuario);
      toast.success('Foto atualizada');
      router.refresh();
    } catch (err) {
      if (err instanceof UploadError) toast.error(err.message);
      else toast.error('Falha ao atualizar foto');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  }

  async function handleLogoutAll() {
    if (!window.confirm('Deslogar de todos os dispositivos? Você precisará entrar novamente.')) {
      return;
    }
    setSigningOutAll(true);
    try {
      await logoutAllDevices();
      router.replace('/login');
      router.refresh();
    } catch {
      toast.error('Falha ao deslogar');
    } finally {
      setSigningOutAll(false);
    }
  }

  function handleAtivarPerfil(perfil: 'presidente' | 'dono_estadio') {
    startTransition(async () => {
      try {
        const res = await ativarPerfil({ perfil });
        setUser(res.usuario);
        toast.success(
          perfil === 'presidente'
            ? 'Perfil de Presidente ativado'
            : 'Perfil de Dono do Estádio ativado',
        );
        router.refresh();
      } catch {
        toast.error('Falha ao ativar perfil');
      }
    });
  }

  const isPresidente = user.perfis.includes('presidente');
  const isDono = user.perfis.includes('dono_estadio');

  return (
    <div className="container space-y-5 py-5">
      <header>
        <h1 className="font-display text-2xl font-bold leading-tight">Perfil pessoal</h1>
        <p className="text-xs text-muted">Edite seus dados e gerencie sua conta.</p>
      </header>

      {/* Avatar */}
      <Card>
        <CardContent className="flex items-center gap-4 px-4 py-4">
          <Avatar src={user.avatarUrl} name={user.nome} size="xl" className="h-24 w-24 text-3xl" />
          <div className="flex-1">
            <p className="text-sm font-medium">{user.nome}</p>
            <p className="text-xs text-muted">{email}</p>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingAvatar}
              onClick={() => avatarInputRef.current?.click()}
            >
              {uploadingAvatar ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Camera size={14} />
              )}
              Alterar foto
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Dados pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome completo *</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apelido">Apelido</Label>
            <Input
              id="apelido"
              value={form.apelido}
              onChange={(e) => setForm((f) => ({ ...f, apelido: e.target.value }))}
              maxLength={40}
              placeholder="Como te chamam nos grupos"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={email} disabled />
            <p className="text-xs text-muted">Para alterar, fale com o suporte.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="celular">WhatsApp *</Label>
            <Input
              id="celular"
              value={form.celular}
              onChange={(e) => setForm((f) => ({ ...f, celular: e.target.value.replace(/\D/g, '') }))}
              maxLength={11}
              placeholder="DDD + 9 + 8 dígitos"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cidade">Cidade</Label>
            <Input
              id="cidade"
              value={form.cidade}
              onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
              maxLength={80}
              placeholder="Usada em buscas de estádio"
            />
          </div>
          <Button onClick={salvar} disabled={isPending} className="mt-2 w-full">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Salvar alterações
          </Button>
        </CardContent>
      </Card>

      {/* Seguranca */}
      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-4 pb-4">
          <Button variant="outline" className="w-full" onClick={() => setShowSenha(true)}>
            Alterar senha
          </Button>
          <Button
            variant="outline"
            className="w-full border-destructive/40 text-destructive hover:bg-error-highlight"
            onClick={handleLogoutAll}
            disabled={signingOutAll}
          >
            {signingOutAll ? <Loader2 size={14} className="animate-spin" /> : null}
            Desconectar de todos os dispositivos
          </Button>
        </CardContent>
      </Card>

      {/* Perfis ativos */}
      <Card>
        <CardHeader>
          <CardTitle>Meus perfis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-4 pb-4">
          <div className="flex flex-wrap gap-1.5">
            {isPresidente ? <Badge variant="primary">Presidente</Badge> : null}
            {isDono ? <Badge variant="info">Dono do Estádio</Badge> : null}
          </div>
          {!isPresidente ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleAtivarPerfil('presidente')}
              disabled={isPending}
            >
              Ativar perfil de Presidente
            </Button>
          ) : null}
          {!isDono ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleAtivarPerfil('dono_estadio')}
              disabled={isPending}
            >
              Ativar perfil de Dono do Estádio
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {/* Zona de perigo */}
      <details className="rounded-lg border border-destructive/30 bg-error-highlight/30 px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-destructive">
          Zona de perigo
        </summary>
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted">
            Excluir sua conta remove todos os dados (grupos, partidas, estádio) de forma irreversível.
          </p>
          <Button
            variant="outline"
            className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white"
            onClick={() => setShowExcluir(true)}
          >
            Excluir minha conta
          </Button>
        </div>
      </details>

      <AlterarSenhaDialog open={showSenha} onOpenChange={setShowSenha} />
      <ExcluirContaDialog
        open={showExcluir}
        onOpenChange={setShowExcluir}
        onConfirmed={async () => {
          await excluirConta({ confirmacao: 'EXCLUIR' });
          router.replace('/login');
          router.refresh();
        }}
      />
    </div>
  );
}
