'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';
import { setToken, setRefreshToken, setStoredAdmin } from '@/lib/auth';
import type { LoginResponse } from '@/lib/types';

// Always call mozey-api directly — monitoring.flek.uz is in its CORS allowlist,
// so this works whether the page loads standalone or inside the flek-monitor proxy.
function buildExchangeUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL || 'https://api.mozey.uz/api/v1';
  return `${base}${API_PATHS.ADMIN_SSO_EXCHANGE}`;
}

export default function SsoCallbackPage() {
  const [status, setStatus] = React.useState<string>('Reading token from URL…');
  const [error, setError] = React.useState<string | null>(null);
  const [debug, setDebug] = React.useState<string[]>([]);
  const ranRef = React.useRef(false);

  const log = React.useCallback((line: string) => {
    setDebug((d) => [...d, line]);
    // eslint-disable-next-line no-console
    console.log('[flek-sso]', line);
  }, []);

  React.useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    const back = url.searchParams.get('back') || '/museums';

    log(`origin = ${window.location.origin}`);
    log(`pathname = ${window.location.pathname}`);
    log(`token = ${token ? token.slice(0, 30) + '…' : 'MISSING'}`);
    log(`back = ${back}`);

    if (!token) {
      setError('Missing SSO token in URL');
      return;
    }

    (async () => {
      try {
        const exchangeUrl = buildExchangeUrl();
        setStatus('Exchanging SSO token…');
        log(`POST ${exchangeUrl}`);
        const resp = await fetch(exchangeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!resp.ok) {
          let msg = resp.statusText;
          try { const b = await resp.json(); msg = b?.message ?? b?.error ?? msg; } catch { /* ignore */ }
          throw new ApiError(resp.status, Array.isArray(msg) ? msg.join('; ') : String(msg));
        }
        const json = await resp.json();
        const data: LoginResponse = json.data ?? json;
        log(`exchange ok — admin email=${data.admin.email} role=${data.admin.role}`);

        setStatus('Saving tokens to cookies…');
        setToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        setStoredAdmin(data.admin);
        log('cookies set');

        const target = back.startsWith('/') ? back : `/${back}`;
        const newPath = window.location.pathname.replace(
          /\/sso\/callback\/?$/,
          target,
        );
        setStatus(`Redirecting to ${newPath}…`);
        log(`redirect → ${newPath}`);
        window.location.replace(newPath);
      } catch (err) {
        if (err instanceof ApiError) {
          const msg = `SSO rejected (${err.statusCode}): ${err.message}`;
          log(msg);
          setError(msg);
        } else {
          const msg = (err as Error).message || 'SSO failed';
          log(`error: ${msg}`);
          setError(msg);
        }
      }
    })();
  }, [log]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="text-center">
          {error ? (
            <>
              <h1 className="text-base font-semibold text-rose-700">SSO failed</h1>
              <p className="mt-2 text-sm text-zinc-600">{error}</p>
              <a
                href="/login"
                className="mt-4 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Use password login instead →
              </a>
            </>
          ) : (
            <>
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
              <p className="mt-3 text-sm font-medium text-zinc-700">{status}</p>
              <p className="mt-1 text-xs text-zinc-500">Signing you in via Flek SSO…</p>
            </>
          )}
        </div>

        <details className="mt-6 rounded-md bg-zinc-100 px-3 py-2 text-left text-[11px] text-zinc-600">
          <summary className="cursor-pointer font-mono uppercase tracking-wider text-[10px] text-zinc-500">
            debug ({debug.length})
          </summary>
          <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed">
{debug.join('\n') || '(empty)'}
          </pre>
        </details>
      </div>
    </div>
  );
}
