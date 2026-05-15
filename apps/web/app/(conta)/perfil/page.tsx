import { redirect } from 'next/navigation';
import { apiFetchServerSafe } from '@/lib/api-server';
import type { UsuarioPerfil } from '@/lib/perfil-actions';
import { PerfilClient } from './perfil-client';

export const dynamic = 'force-dynamic';

export default async function PerfilPage() {
  const data = await apiFetchServerSafe<{ auth: { email: string }; usuario: UsuarioPerfil | null }>(
    '/api/me',
  );
  if (!data?.usuario) redirect('/onboarding');
  return <PerfilClient initial={data.usuario} email={data.auth.email} />;
}
