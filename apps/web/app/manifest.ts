import type { MetadataRoute } from 'next';

/**
 * Gera `/manifest.json` (App Router). Evita 404 e avisos de PWA no DevTools.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RachãoApp',
    short_name: 'RachãoApp',
    description: 'Gestão de peladas de futebol amador',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f1b2d',
    theme_color: '#0f1b2d',
    lang: 'pt-BR',
    orientation: 'portrait',
  };
}
