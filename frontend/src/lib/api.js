// Axios client with proactive token refresh, 401 retry, and timeouts.
// Fixes the root cause of "everything eventually breaks" after a few minutes:
//   1) supabase.auth.getSession() returns the CACHED session; if it's near
//      expiry we proactively refresh so we never send a stale JWT.
//   2) On 401 responses we refresh the session and retry ONCE.
//   3) Global timeout so a hung backend (e.g. Render cold start) can never
//      leave the UI stuck on "Loading..." forever.
//   4) Errors are surfaced (no more silent failures at the transport layer).
import axios from 'axios';
import { supabase } from '@/lib/supabase';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

// 45s is enough for a Render free-tier cold-start on the first call; normal
// calls resolve in <1s. Individual calls can override via `{ timeout }`.
const DEFAULT_TIMEOUT_MS = 45000;

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  timeout: DEFAULT_TIMEOUT_MS,
});

// Returns a fresh access token, refreshing proactively if the current one is
// expired or expires within `skewSec` seconds. Never throws to callers.
async function getFreshAccessToken(skewSec = 60) {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session) return null;

    const nowSec = Math.floor(Date.now() / 1000);
    const exp = session.expires_at || 0;

    // If token is expired OR about to expire, refresh proactively.
    if (!exp || exp - nowSec < skewSec) {
      const { data: refreshed, error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn('[api] proactive refresh failed:', error.message);
        return session.access_token || null;
      }
      return refreshed?.session?.access_token || session.access_token || null;
    }
    return session.access_token;
  } catch (e) {
    console.warn('[api] getFreshAccessToken error:', e?.message);
    return null;
  }
}

api.interceptors.request.use(async (config) => {
  const token = await getFreshAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, try ONE forced refresh + retry. Prevents cascading logout when the
// token really did just expire.
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err?.config;
    const status = err?.response?.status;

    if (status === 401 && original && !original.__ulfnRetried) {
      original.__ulfnRetried = true;
      try {
        const { data: refreshed } = await supabase.auth.refreshSession();
        const newToken = refreshed?.session?.access_token;
        if (newToken) {
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${newToken}`;
          return api.request(original);
        }
      } catch (e) {
        console.warn('[api] refresh-on-401 failed:', e?.message);
      }
    }

    // Log timeouts / network errors clearly (they were silently eaten before).
    if (err?.code === 'ECONNABORTED') {
      console.warn('[api] request timed out:', original?.url);
    } else if (!err?.response) {
      console.warn('[api] network error:', original?.url, err?.message);
    }
    return Promise.reject(err);
  }
);
