import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { ensureProfile, isStoreOwner } from '../lib/db';
import type { DbProfile } from '../types';

export type OAuthProvider = 'google' | 'discord';

interface AuthValue {
  user: User | null;
  profile: DbProfile | null;
  /** true enquanto a sessão salva ainda está sendo lida. */
  loading: boolean;
  isOwner: boolean;
  error: string | null;
  signIn: (provider: OAuthProvider) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfile: (p: DbProfile) => void;
}

const Ctx = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return v;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sessão: lê a salva e acompanha login/logout/renovação do token.
  useEffect(() => {
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (alive) setUser(data.session?.user ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Perfil: carrega (ou cria no primeiro login) sempre que o usuário muda.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsOwner(false);
      return;
    }
    let alive = true;
    ensureProfile(user)
      .then((p) => alive && (setProfile(p), setError(null)))
      .catch((e: Error) => alive && setError(e.message));
    isStoreOwner().then((o) => alive && setIsOwner(o));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const signIn = useCallback(async (provider: OAuthProvider) => {
    if (!supabaseConfigured) {
      setError('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para entrar.');
      return;
    }
    setError(null);
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    if (e) setError(e.message);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsOwner(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      setProfile(await ensureProfile(user));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [user]);

  const value = useMemo<AuthValue>(
    () => ({ user, profile, loading, isOwner, error, signIn, signOut, refreshProfile, setProfile }),
    [user, profile, loading, isOwner, error, signIn, signOut, refreshProfile],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function providerLabel(p: string | null | undefined): string {
  if (p === 'google') return 'Google';
  if (p === 'discord') return 'Discord';
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : 'E-mail';
}
