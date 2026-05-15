'use client';

/**
 * Helpers de upload de imagens via Supabase Storage.
 *
 * Buckets esperados (devem existir no projeto Supabase, com policies publicas):
 * - `estadios-fotos`: fotos dos estadios (capa e galeria).
 * - `avatares`: foto de perfil dos usuarios.
 *
 * Limites: 5MB por arquivo, JPG/PNG/WEBP. Validacao acontece no cliente antes
 * do upload — o storage do Supabase tambem aplica limite configurado no bucket.
 */
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS_VALIDOS = ['image/jpeg', 'image/png', 'image/webp'];

export class UploadError extends Error {
  constructor(public code: 'tipo' | 'tamanho' | 'storage', message: string) {
    super(message);
    this.name = 'UploadError';
  }
}

function validarArquivo(file: File) {
  if (!TIPOS_VALIDOS.includes(file.type)) {
    throw new UploadError('tipo', 'Tipo de arquivo inválido. Use JPG, PNG ou WEBP.');
  }
  if (file.size > MAX_BYTES) {
    throw new UploadError('tamanho', 'Arquivo muito grande (máximo 5MB).');
  }
}

function gerarNome(prefixo: string, file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const safeExt = ext.length <= 4 && /^[a-z0-9]+$/.test(ext) ? ext : 'jpg';
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
}

export async function uploadEstadioFoto(file: File, estadioId: string): Promise<string> {
  validarArquivo(file);
  const supabase = createSupabaseBrowserClient();
  const path = `${estadioId}/${gerarNome('foto', file)}`;
  const { error } = await supabase.storage
    .from('estadios-fotos')
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) {
    throw new UploadError('storage', error.message);
  }
  const { data } = supabase.storage.from('estadios-fotos').getPublicUrl(path);
  return data.publicUrl;
}

export async function removerEstadioFoto(url: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  // extrai o path apos `/estadios-fotos/`
  const idx = url.indexOf('/estadios-fotos/');
  if (idx === -1) return;
  const path = url.slice(idx + '/estadios-fotos/'.length);
  await supabase.storage.from('estadios-fotos').remove([path]);
}

export async function uploadAvatar(file: File, usuarioId: string): Promise<string> {
  validarArquivo(file);
  const supabase = createSupabaseBrowserClient();
  const path = `${usuarioId}/${gerarNome('avatar', file)}`;
  const { error } = await supabase.storage
    .from('avatares')
    .upload(path, file, { cacheControl: '3600', upsert: true });
  if (error) {
    throw new UploadError('storage', error.message);
  }
  const { data } = supabase.storage.from('avatares').getPublicUrl(path);
  return data.publicUrl;
}
