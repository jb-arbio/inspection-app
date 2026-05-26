import Link from 'next/link';
import MyVisits from './MyVisits';

export const dynamic = 'force-dynamic';

export default function FirstVisitLanding() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">First Visit Survey</h1>
      <Link
        href="/first-visit/new"
        className="mt-4 block rounded-md bg-black px-4 py-2 text-center text-white"
      >
        Start a new visit
      </Link>
      <h2 className="mt-8 text-sm font-medium text-gray-600">My visits</h2>
      <MyVisits />
    </main>
  );
}
