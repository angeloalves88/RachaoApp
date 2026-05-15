import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Uma leitura de `auth.getSession()` por request RSC (dedup entre layout, páginas e `apiFetchServer`).
 * O middleware já chama `getUser()` no Edge para refrescar o JWT antes deste request Node.
 */
export const getCachedServerSession = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  return { session, error };
});
