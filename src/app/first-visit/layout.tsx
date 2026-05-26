import { PersistGate } from '@/components/firstVisit/PersistGate';

export default function FirstVisitLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PersistGate />
      {children}
    </>
  );
}
