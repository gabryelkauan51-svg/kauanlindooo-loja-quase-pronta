interface Props {
  active: boolean;
  onToggle: () => void;
  className?: string;
  label?: string;
}

/** Coração de favoritar. A nuvem e o pedido de login ficam por conta de quem usa. */
export default function FavoriteButton({ active, onToggle, className = '', label }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={active}
      aria-label={active ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      title={active ? 'Remover dos favoritos' : 'Favoritar'}
      className={`inline-flex items-center justify-center gap-2 rounded-full border transition ${
        active ? 'border-brand/60 bg-brand/15 text-brand-light' : 'border-line bg-black/50 text-zinc-300 hover:border-zinc-500 hover:text-white'
      } ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20s-7-4.500-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 10c0 5.500-7 10-7 10z" />
      </svg>
      {label && <span className="text-sm font-semibold">{label}</span>}
    </button>
  );
}
