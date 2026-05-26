import Link from 'next/link';
import { PersistGate } from '@/components/firstVisit/PersistGate';

export default function FirstVisitLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PersistGate />
      <div className="mx-auto max-w-md px-6 pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
        >
          ← Back to mode picker
        </Link>
      </div>
      {children}
    </>
  );
}
