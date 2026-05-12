import { Suspense } from 'react';
import SetPasswordForm from './SetPasswordForm';

export const dynamic = 'force-dynamic';

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <SetPasswordForm />
    </Suspense>
  );
}
