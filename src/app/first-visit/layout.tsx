import { PersistGate } from '@/components/firstVisit/PersistGate';
import { OfflineBanner } from '@/components/firstVisit/OfflineBanner';

export default function FirstVisitLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PersistGate />
      <OfflineBanner />
      {children}
    </>
  );
}
