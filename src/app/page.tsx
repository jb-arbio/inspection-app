import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function ModePicker() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="grid w-full max-w-md gap-4">
        <h1 className="text-center text-2xl font-semibold">Arbio Inspection</h1>
        <Link
          href="/inspect"
          className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm hover:bg-gray-50"
        >
          <div className="text-lg font-medium">Inspection</div>
          <div className="text-sm text-gray-500">Recurring property inspection</div>
        </Link>
        <Link
          href="/first-visit"
          className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm hover:bg-gray-50"
        >
          <div className="text-lg font-medium">First Visit Survey</div>
          <div className="text-sm text-gray-500">Pre-takeover property visit</div>
        </Link>
      </div>
    </main>
  );
}
