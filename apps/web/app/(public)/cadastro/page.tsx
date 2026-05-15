import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CadastroForm } from './cadastro-form';

export const metadata: Metadata = {
  title: 'Criar conta',
};

export default function CadastroPage() {
  return (
    <Suspense>
      <CadastroForm />
    </Suspense>
  );
}
