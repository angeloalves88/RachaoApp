import type { NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Aplica em tudo exceto assets estaticos, _next, favicon e manifest.
    // IMPORTANTE: incluir manifest.webmanifest (gerado por app/manifest.ts) e
    // robots.txt/sitemap.xml para nao acionarem o redirect de auth.
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)',
  ],
};
