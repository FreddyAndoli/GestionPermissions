'use client';

import ErrorPage from '@/components/layout/ErrorPage';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <ErrorPage
          title="Une erreur critique est survenue"
          message={error.message || 'Impossible de charger l application. Veuillez reessayer.'}
          reset={reset}
        />
      </body>
    </html>
  );
}
