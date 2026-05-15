/**
 * Dashboard inicial quando não há `?redirect=` explícito (login, OAuth, etc.).
 * Prioriza Dono do Estádio — mesmo critério do botão "Ir para o app" na home `/`.
 */
export function defaultAppHomePath(perfis: string[]): '/dashboard' | '/estadio/dashboard' {
  if (perfis.includes('dono_estadio')) return '/estadio/dashboard';
  return '/dashboard';
}
