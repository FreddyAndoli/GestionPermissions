import ErrorPage from '@/components/layout/ErrorPage';

export default function NotFound() {
  return (
    <ErrorPage
      title="Page non trouvee"
      message="La page que vous recherchez n existe pas ou a ete deplacee."
      statusCode={404}
      showHome
    />
  );
}
