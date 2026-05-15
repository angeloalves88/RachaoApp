import type { Metadata } from 'next';
import { AtualizarSenhaForm } from './atualizar-form';

export const metadata: Metadata = {
  title: 'Definir nova senha',
};

export default function AtualizarSenhaPage() {
  return <AtualizarSenhaForm />;
}
