import { useState, type FormEvent } from 'react';
import { providerLabel, useAuth } from '../../auth/AuthContext';
import { updateProfile } from '../../lib/db';

export default function ProfileTab() {
  const { user, profile, setProfile, signOut } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user || !profile) return <p className="py-10 text-center text-sm text-zinc-500">Carregando perfil…</p>;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const clean = name.trim().slice(0, 60);
    if (!clean) {
      setMsg('Digite um nome.');
      return;
    }
    setBusy(true);
    try {
      await updateProfile(profile.id, { display_name: clean });
      setProfile({ ...profile, display_name: clean });
      setMsg('Perfil atualizado.');
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="max-w-lg space-y-4 rounded-2xl border border-line bg-card p-5">
      <div className="flex items-center gap-3">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/20 text-xl font-bold text-brand-light">{(profile.display_name ?? '?').charAt(0).toUpperCase()}</span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{profile.email ?? user.email}</p>
          <p className="text-xs text-zinc-500">Conectado com {providerLabel(profile.provider)}</p>
        </div>
      </div>

      <div>
        <label htmlFor="pname" className="mb-1.5 block text-xs font-semibold text-zinc-400">Nome</label>
        <input
          id="pname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-white focus:border-brand focus:outline-none"
        />
      </div>

      {msg && <p role="status" className="text-sm text-zinc-300">{msg}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-light hover:text-bg disabled:opacity-60">
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" onClick={() => signOut()} className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500">
          Sair da conta
        </button>
      </div>
    </form>
  );
}
