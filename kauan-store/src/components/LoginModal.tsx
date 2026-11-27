import { useState } from 'react';
import Modal from './Modal';
import { useAuth, type OAuthProvider } from '../auth/AuthContext';

interface Props {
  onClose: () => void;
  /** Motivo mostrado ao cliente (ex.: "para favoritar"). */
  reason?: string;
}

const btn =
  'flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-bg px-4 py-3 text-sm font-semibold text-white transition hover:border-zinc-500 disabled:opacity-60';

export default function LoginModal({ onClose, reason }: Props) {
  const { signIn, error } = useAuth();
  const [busy, setBusy] = useState<OAuthProvider | null>(null);

  const go = async (p: OAuthProvider) => {
    setBusy(p);
    await signIn(p);
    // Com sucesso o navegador sai da página para o login; se voltar, libera os botões.
    setBusy(null);
  };

  return (
    <Modal onClose={onClose} label="Entrar na conta">
      <div className="space-y-5 p-6">
        <div className="pr-10">
          <h2 className="text-xl font-bold">Entrar na Kauan Store</h2>
          <p className="mt-1.5 text-sm text-zinc-400">
            {reason ? `Entre ${reason}. ` : ''}Seus pedidos, favoritos e saldo ficam salvos na sua conta, em qualquer aparelho.
          </p>
        </div>

        <div className="space-y-2.5">
          <button type="button" className={btn} onClick={() => go('google')} disabled={busy !== null}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1a6.2 6.2 0 0 1 0-12.4c2 0 3.300.9 4.100 1.600l2.700-2.600A9.900 9.900 0 0 0 12 2a10 10 0 1 0 0 20c5.800 0 9.600-4 9.600-9.800 0-.7-.1-1.200-.2-1.700z" />
            </svg>
            {busy === 'google' ? 'Abrindo o Google…' : 'Continuar com Google'}
          </button>
          <button type="button" className={btn} onClick={() => go('discord')} disabled={busy !== null}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#8B9AFF" d="M7.2 6.2c3-1.3 6.6-1.3 9.6 0 1.6 2.4 2.6 5 3 8.2-1.3 1.2-2.700 2-4.200 2.400l-.9-1.600c-1.400.4-2.800.4-4.200 0l-.9 1.600c-1.500-.4-2.900-1.200-4.200-2.400.4-3.200 1.400-5.800 2.800-8.200z" />
              <circle cx="9.500" cy="12" r="1.300" fill="#111116" />
              <circle cx="14.500" cy="12" r="1.300" fill="#111116" />
            </svg>
            {busy === 'discord' ? 'Abrindo o Discord…' : 'Continuar com Discord'}
          </button>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            {error}
          </p>
        )}

        <p className="text-xs leading-relaxed text-zinc-500">
          Não pedimos senha. O login é feito direto no Google ou no Discord, e a gente só recebe nome, e-mail e foto.
        </p>
      </div>
    </Modal>
  );
}
