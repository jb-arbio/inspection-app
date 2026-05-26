'use client';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/firstVisit/analytics';

export default function DealPicker({ deals }: { deals: { id: string; name: string }[] }) {
  const router = useRouter();
  if (deals.length === 0) {
    return <p className="mt-4 text-sm text-gray-500">No deals available (or offline).</p>;
  }
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {deals.map((d) => (
        <li key={d.id}>
          <button
            onClick={() => {
              track('deal_selected', { deal_id: d.id });
              router.push(`/first-visit/${d.id}`);
            }}
            className="block w-full rounded border border-gray-200 p-3 text-left"
          >
            <div className="text-sm font-medium">{d.name}</div>
            <div className="text-xs text-gray-500">{d.id}</div>
          </button>
        </li>
      ))}
    </ul>
  );
}
