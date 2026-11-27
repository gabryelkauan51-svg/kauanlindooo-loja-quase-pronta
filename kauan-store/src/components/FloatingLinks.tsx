const INSTAGRAM = import.meta.env.VITE_INSTAGRAM_URL || 'https://www.instagram.com/';
const DISCORD = import.meta.env.VITE_DISCORD_URL || 'https://discord.com/';

const btn =
  'flex h-11 w-11 items-center justify-center rounded-full border border-line bg-card/95 text-zinc-300 shadow-md backdrop-blur transition hover:border-brand/60 hover:text-white';

export default function FloatingLinks({ lifted }: { lifted: boolean }) {
  return (
    <div className={`fixed right-4 z-40 flex flex-col gap-2.5 transition-all ${lifted ? 'bottom-24' : 'bottom-5'}`}>
      <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="Instagram da loja" className={btn}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" />
        </svg>
      </a>
      <a href={DISCORD} target="_blank" rel="noopener noreferrer" aria-label="Discord da loja" className={btn}>
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M7.2 6.2c3-1.3 6.6-1.3 9.6 0 1.6 2.4 2.6 5 3 8.2-1.3 1.2-2.7 2-4.2 2.4l-.9-1.6c-1.4.4-2.8.4-4.2 0l-.9 1.6c-1.5-.4-2.9-1.2-4.2-2.4.4-3.2 1.4-5.8 2.8-8.2z"
          />
          <circle cx="9.5" cy="12" r="1.3" fill="#111116" />
          <circle cx="14.5" cy="12" r="1.3" fill="#111116" />
        </svg>
      </a>
    </div>
  );
}
