'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';
import { setToken, setRefreshToken, setStoredAdmin } from '@/lib/auth';
import type { LoginResponse } from '@/lib/types';
import { useRouter } from '@/i18n/navigation';

/**
 * Single sign-on landing page. Receives a JWT from flek-monitor in `?token=`,
 * exchanges it for a Mozey admin token pair, persists the session, and
 * redirects to the requested page (or /museums by default).
 *
 * Both the embedded iframe (via flek-monitor's proxy) and direct visitors
 * to admin.mozey.uz/sso/callback land here.
 */
export default function SsoCallbackPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const ranRef = React.useRef(false);

  React.useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    const back = url.searchParams.get('back') || '/museums';

    if (!token) {
      setError('Missing SSO token');
      return;
    }

    (async () => {
      try {
        const data = await api.post<LoginResponse>(
          API_PATHS.ADMIN_SSO_EXCHANGE,
          { token },
          { skipAuth: true },
        );
        setToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        setStoredAdmin(data.admin);
        // back is locale-stripped (e.g. "/museums"); Mozey's router will
        // re-prefix it with the current locale.
        const target = back.startsWith('/') ? back : `/${back}`;
        router.replace(target as `/${string}`);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(`SSO rejected (${err.statusCode}): ${err.message}`);
        } else {
          setError((err as Error).message || 'SSO failed');
        }
      }
    })();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
        {error ? (
          <>
            <h1 className="text-base font-semibold text-rose-700">
              SSO failed
            </h1>
            <p className="mt-2 text-sm text-zinc-600">{error}</p>
            <a
              href="/login"
              className="mt-6 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Use password login instead →
            </a>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
            <p className="mt-3 text-sm text-zinc-600">
              Signing you in via Flek SSO…
            </p>
          </>
        )}
      </div>
    </div>
  );
}
