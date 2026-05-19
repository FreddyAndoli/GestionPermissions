import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import OnboardingTour from '@/components/ui/OnboardingTour';
import AnnouncementToast from '@/components/ui/AnnouncementToast';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
        <Sidebar />
        <div className="flex-1 ml-64">
          <Header />
          <main className="p-6">{children}</main>
        </div>
        <OnboardingTour />
        <AnnouncementToast />
      </div>
    </ProtectedRoute>
  );
}
