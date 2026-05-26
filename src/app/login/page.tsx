'use client';
import { createBrowserClient } from '@supabase/ssr';

export default function LoginPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_HUB_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY!,
  );

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-semibold">Arbio Inspection</h1>
        <p className="text-sm text-gray-600">Sign in with your @arbio.com account.</p>
        <button
          onClick={signIn}
          className="rounded-md bg-black px-4 py-2 text-white"
        >
          Sign in with Google
        </button>
      </div>
    </main>
  );
}
