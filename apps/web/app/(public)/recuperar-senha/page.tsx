import type { Metadata } from 'next';
import { RecuperarSenhaForm } from './recuperar-form';

export const metadata: Metadata = {
  title: 'Recuperar senha',
};

export default function RecuperarSenhaPage() {
  return <RecuperarSenhaForm />;
}
