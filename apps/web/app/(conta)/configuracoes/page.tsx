import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Bell,
  ChevronRight,
  CreditCard,
  Globe,
  Info,
  Mail,
  MessageCircle,
  Moon,
  User,
} from 'lucide-react';
import { apiFetchServerSafe } from '@/lib/api-server';
import { ConfiguracoesGeraisClient } from './configuracoes-gerais-client';

export const dynamic = 'force-dynamic';

const SUPORTE_WHATSAPP_RAW = process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP ?? '';
const SUPORTE_EMAIL = process.env.NEXT_PUBLIC_SUPORTE_EMAIL ?? 'suporte@rachao.app';

function formatWhatsappLabel(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

export default async function ConfiguracoesPage() {
  const me = await apiFetchServerSafe<{
    usuario: { perfis: string[] } | null;
  }>('/api/me');
  if (!me?.usuario) redirect('/login');

  return (
    <div className="container space-y-6 py-5">
      <header>
        <h1 className="font-display text-2xl font-bold leading-tight">Configurações</h1>
        <p className="text-xs text-muted">Conta, preferências e informações do app.</p>
      </header>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Conta</h2>
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          <Link
            href="/perfil"
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-2"
          >
            <span className="flex items-center gap-2">
              <User size={18} className="text-muted" /> Perfil pessoal
            </span>
            <ChevronRight size={16} className="text-muted" />
          </Link>
          <Link
            href="/planos"
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-2"
          >
            <span className="flex items-center gap-2">
              <CreditCard size={18} className="text-muted" /> Planos e assinatura
            </span>
            <ChevronRight size={16} className="text-muted" />
          </Link>
          <Link
            href="/configuracoes/notificacoes"
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-2"
          >
            <span className="flex items-center gap-2">
              <Bell size={18} className="text-muted" /> Notificações
            </span>
            <ChevronRight size={16} className="text-muted" />
          </Link>
        </div>
      </section>

      <ConfiguracoesGeraisClient />

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Suporte</h2>
        <SuporteBloco
          whatsappRaw={SUPORTE_WHATSAPP_RAW}
          email={SUPORTE_EMAIL}
        />
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Sobre</h2>
        <div className="space-y-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
          <p className="flex items-center gap-2">
            <Info size={16} className="text-muted" />
            <span>
              Versão do app: <strong>0.1.0</strong>
            </span>
          </p>
          <p className="flex items-center gap-2 text-muted">
            <Globe size={16} /> Idioma: Português (BR) — único na V1
          </p>
          <p className="flex items-center gap-2 text-muted">
            <Moon size={16} /> Tema: escuro (padrão) — claro na V2
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href="https://rachao.app/termos"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Termos de uso
            </a>
            <span className="text-muted">·</span>
            <a
              href="https://rachao.app/privacidade"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Política de privacidade
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function SuporteBloco({
  whatsappRaw,
  email,
}: {
  whatsappRaw: string;
  email: string;
}) {
  const whatsappDigits = whatsappRaw.replace(/\D/g, '');
  const whatsappNum = whatsappDigits.length === 11
    ? `55${whatsappDigits}`
    : whatsappDigits;
  const whatsappLabel = whatsappRaw ? formatWhatsappLabel(whatsappRaw) : null;
  const mensagemPadrao = encodeURIComponent('Olá! Preciso de ajuda com o RachãoApp.');

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {whatsappNum ? (
        <a
          href={`https://wa.me/${whatsappNum}?text=${mensagemPadrao}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm transition-colors hover:bg-surface-2"
        >
          <MessageCircle size={20} className="text-success" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">Falar no WhatsApp</p>
            <p className="truncate text-xs text-muted">{whatsappLabel}</p>
          </div>
        </a>
      ) : null}
      <a
        href={`mailto:${email}?subject=${encodeURIComponent('Suporte RachãoApp')}`}
        className="flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm transition-colors hover:bg-surface-2"
      >
        <Mail size={20} className="text-info" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">E-mail de suporte</p>
          <p className="truncate text-xs text-muted">{email}</p>
        </div>
      </a>
    </div>
  );
}
