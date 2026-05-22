import { redirect } from 'next/navigation';
import { defaultAppHomePath } from '@/lib/app-home';
import { getSession } from '@/lib/auth-server';
import { EntradaErro } from './entrada-erro';

export const dynamic = 'force-dynamic';

/**
 * Roteador pós-autenticação: envia para o dashboard do perfil adequado
 * (Supabase não conhece `perfis` — precisamos do `/api/me` via getSession).
 */
export default async function EntradaPage() {
  try {
    const session = await getSession();
    if (!session) redirect('/login?redirect=%2Fentrada');
    if (!session.usuario || session.usuario.perfis.length === 0) redirect('/onboarding');
    redirect(defaultAppHomePath(session.usuario.perfis));
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Erro ao comunicar com o servidor.';
    return <EntradaErro mensagem={msg} />;
  }
}
