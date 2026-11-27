import { useEffect, useRef, useState } from 'react';

const FINE_POINTER = '(hover: hover) and (pointer: fine)';

/**
 * Fundo pontilhado discreto. Em desktop (mouse), um círculo e um ponto lilás
 * acompanham o cursor com atraso suave e opacidade bem baixa.
 * Em telas touch/mobile só fica o pontilhado estático (sem JavaScript contínuo).
 */
export default function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const [follow] = useState(() => typeof window !== 'undefined' && window.matchMedia(FINE_POINTER).matches);

  useEffect(() => {
    if (!follow) return;
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 3;
    let rx = tx; // círculo grande: acompanha mais devagar
    let ry = ty;
    let dx = tx; // ponto: acompanha um pouco mais rápido
    let dy = ty;
    let raf = 0;

    const apply = () => {
      el.style.setProperty('--rx', `${rx.toFixed(1)}px`);
      el.style.setProperty('--ry', `${ry.toFixed(1)}px`);
      el.style.setProperty('--dx', `${dx.toFixed(1)}px`);
      el.style.setProperty('--dy', `${dy.toFixed(1)}px`);
    };

    const tick = () => {
      rx += (tx - rx) * 0.07;
      ry += (ty - ry) * 0.07;
      dx += (tx - dx) * 0.18;
      dy += (ty - dy) * 0.18;
      apply();
      const settled = Math.abs(tx - rx) < 0.2 && Math.abs(ty - ry) < 0.2 && Math.abs(tx - dx) < 0.2 && Math.abs(ty - dy) < 0.2;
      raf = settled ? 0 : requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      tx = e.clientX;
      ty = e.clientY;
      if (reduce) {
        rx = dx = tx;
        ry = dy = ty;
        apply();
        return;
      }
      if (!raf) raf = requestAnimationFrame(tick);
    };

    apply();
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [follow]);

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="cursor-dots absolute inset-0" />
      {follow && (
        <>
          <div className="cursor-dots-glow absolute inset-0" />
          <div className="cursor-ring" />
          <div className="cursor-dot" />
        </>
      )}
    </div>
  );
}
