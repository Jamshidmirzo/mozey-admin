'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';
import { setToken, setRefreshToken, setStoredAdmin } from '@/lib/auth';
import type { LoginResponse } from '@/lib/types';

/**
 * Single sign-on landing page. Receives a JWT from flek-monitor in `?token=`,
 * exchanges it for a Mozey admin token pair, persists the session, and
 * redirects to the requested page (default /museums).
 *
 * Works in two modes:
 *   - direct:   admin.mozey.uz/<locale>/sso/callback
 *   - proxied:  flek-monitor:3000/api/admin-proxy/mozey/<locale>/sso/callback
 *
 * We cannot use next-intl's useRouter for the post-success redirect because
 * its history pushState writes the bare `/museums` URL — which inside the
 * proxy iframe resolves to flek-monitor's origin, not mozey-admin's proxied
 * path. We rewrite window.location.pathname instead, preserving any prefix.
 */
export default function SsoCallbackPage() {
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
        // Rewrite path to land on back, preserving any proxy prefix:
        //   /api/admin-proxy/mozey/ru/sso/callback → /api/admin-proxy/mozey/ru/museums
        //   /ru/sso/callback                       → /ru/museums
        const target = back.startsWith('/') ? back : `/${back}`;
        const newPath = window.location.pathname.replace(
          /\/sso\/callback\/?$/,
          target,
        );
        window.location.replace(newPath);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(`SSO rejected (${err.statusCode}): ${err.message}`);
        } else {
          setError((err as Error).message || 'SSO failed');
        }
      }
    })();
  }, []);

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
