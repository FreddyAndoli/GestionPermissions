'use client';

import ErrorPage from '@/components/layout/ErrorPage';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPage
      title="Une erreur est survenue"
      message={error.message || 'Quelque chose a mal tourne. Veuillez reessayer.'}
      reset={reset}
    />
  );
}
