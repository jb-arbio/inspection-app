import Link from 'next/link';

export default function InspectLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto max-w-3xl px-6 pt-4">
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
