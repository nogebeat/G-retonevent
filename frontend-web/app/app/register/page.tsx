import { Suspense } from 'react';
import RegisterPage from './RegisterPage';

export default function Register() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <RegisterPage />
    </Suspense>
  );
}
