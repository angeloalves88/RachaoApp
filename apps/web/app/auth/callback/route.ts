import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /auth/callback?code=...&next=/dashboard
 *
 * - Recebe o `code` do GoTrue (apos OAuth ou link magico) e troca por session.
 * - Tambem trata `error_description` quando o provider rejeita o login.
 * - Redireciona para `next` (default `/entrada` → dashboard por perfil). Se for primeiro acesso,
 *   o middleware/dashboard se encarrega de mandar para /onboarding.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/entrada';
  const errorDescription = url.searchParams.get('error_description');

  if (errorDescription) {
    const redirectUrl = url.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.search = `?erro=${encodeURIComponent(errorDescription)}`;
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    const redirectUrl = url.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const redirectUrl = url.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.search = `?erro=${encodeURIComponent(error.message)}`;
    return NextResponse.redirect(redirectUrl);
  }

  const redirectUrl = url.clone();
  redirectUrl.pathname = next.startsWith('/') ? next : `/${next}`;
  redirectUrl.search = '';
  return NextResponse.redirect(redirectUrl);
}
