import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // typedRoutes desabilitado enquanto o app esta em construcao (rotas das
  // Fases 2-9 ainda nao existem). Reabilitar perto do release.
  experimental: {
    typedRoutes: false,
  },
  transpilePackages: ['@rachao/db', '@rachao/shared'],
  images: {
    remotePatterns: [
      // Supabase Storage local
      { protocol: 'http', hostname: 'localhost', port: '8000', pathname: '/storage/**' },
    ],
  },
  // O pacote @rachao/shared usa imports `from './enums.js'` (exigido pelo
  // `moduleResolution: NodeNext` da API). O bundler do Next precisa mapear
  // `.js` -> `.ts` ao resolver arquivos fonte do workspace.
  webpack: (cfg) => {
    cfg.resolve = cfg.resolve ?? {};
    cfg.resolve.extensionAlias = {
      ...cfg.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return cfg;
  },
};

export default config;
