'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getHubSupabase } from '@/lib/firstVisit/hubSupabase';
import { isAdminEmailClient } from '@/lib/firstVisit/adminAccess';

// Admin-only affordance to jump to the survey editor. Visibility is a client
// convenience gate (NEXT_PUBLIC_ADMIN_EMAILS); the editor route enforces the
// real gate server-side. Resolves the current user's email on mount and renders
// nothing for non-admins or if anything goes wrong — it must never crash the
// survey it sits inside.
export function EditSurveyButton() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getHubSupabase();
        if (!supabase) return;
        const { data } = await supabase.auth.getUser();
        const email = data?.user?.email;
        if (!cancelled && isAdminEmailClient(email)) setIsAdmin(true);
      } catch {
        // Defensive: never let a failed user lookup break the survey.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <Link
      href="/first-visit/edit"
      tabIndex={-1}
      className="rounded border border-gray-300 px-2 py-0.5 hover:bg-gray-50"
    >
      Edit survey
    </Link>
  );
}
