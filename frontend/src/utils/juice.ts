/**
 * Juice visual: ráfagas de confeti de tinta riso, squash & stretch y sacudón.
 * Todo con Web Animations API (sin dependencias) y respetando reduced-motion.
 *
 * Uso declarativo: cualquier elemento con `data-juice` dispara una ráfaga al
 * pulsarlo. `data-juice="big"` lanza más partículas y sacude la pantalla.
 */

const INKS = ['#ff4f9e', '#2f4bf0', '#ffc81f', '#12a96e', '#ff5435'];
const SHAPES = ['circle', 'square', 'tri', 'star', 'squig'] as const;

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function shapeSvg(kind: (typeof SHAPES)[number], color: string): string {
  const ink = '#211a33';
  switch (kind) {
    case 'circle':
      return `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="${color}" stroke="${ink}" stroke-width="2.5"/></svg>`;
    case 'square':
      return `<svg viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="14" rx="3" fill="${color}" stroke="${ink}" stroke-width="2.5"/></svg>`;
    case 'tri':
      return `<svg viewBox="0 0 20 20"><path d="M10 2 L18 17 L2 17 Z" fill="${color}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
    case 'star':
      return `<svg viewBox="0 0 20 20"><path d="M10 1 L12.4 7.6 L19 10 L12.4 12.4 L10 19 L7.6 12.4 L1 10 L7.6 7.6 Z" fill="${color}" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/></svg>`;
    case 'squig':
      return `<svg viewBox="0 0 24 12"><path d="M2 6 Q6 0 10 6 T18 6 T22 6" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round"/></svg>`;
  }
}

export function burst(x: number, y: number, opts: { count?: number; power?: number } = {}): void {
  if (reduced() || typeof document === 'undefined') return;
  const count = opts.count ?? 12;
  const power = opts.power ?? 1;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'juice-particle';
    const size = 10 + Math.random() * 12;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    const kind = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    el.innerHTML = shapeSvg(kind, INKS[Math.floor(Math.random() * INKS.length)]);
    document.body.appendChild(el);

    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
    const dist = (50 + Math.random() * 70) * power;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const spin = (Math.random() - 0.5) * 720;
    const x0 = x - size / 2;
    const y0 = y - size / 2;

    el.animate(
      [
        { transform: `translate(${x0}px, ${y0}px) scale(0.2) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${x0 + dx * 0.8}px, ${y0 + dy * 0.8}px) scale(1.15) rotate(${spin * 0.6}deg)`, opacity: 1, offset: 0.45 },
        // gravedad: cae un poco al final
        { transform: `translate(${x0 + dx}px, ${y0 + dy + 40 * power}px) scale(0.4) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: 650 + Math.random() * 350, easing: 'cubic-bezier(0.15, 0.8, 0.3, 1)', fill: 'forwards' },
    ).onfinish = () => el.remove();
  }
}

/** Squash & stretch puntual sobre un elemento (útil al cambiar de estado). */
export function squash(el: Element | null, strength = 1): void {
  if (!el || reduced()) return;
  const s = 0.12 * strength;
  (el as HTMLElement).animate(
    [
      { transform: 'scale(1, 1)' },
      { transform: `scale(${1 + s}, ${1 - s})`, offset: 0.25 },
      { transform: `scale(${1 - s * 0.6}, ${1 + s * 0.6})`, offset: 0.5 },
      { transform: `scale(${1 + s * 0.25}, ${1 - s * 0.25})`, offset: 0.75 },
      { transform: 'scale(1, 1)' },
    ],
    { duration: 480, easing: 'ease-out' },
  );
}

/** Pequeño sacudón de pantalla para impactos grandes. */
export function shake(intensity = 6): void {
  if (reduced() || typeof document === 'undefined') return;
  const root = document.getElementById('root');
  if (!root) return;
  const k = intensity;
  root.animate(
    [
      { transform: 'translate(0,0)' },
      { transform: `translate(${-k}px, ${k * 0.5}px) rotate(-0.4deg)` },
      { transform: `translate(${k * 0.8}px, ${-k * 0.4}px) rotate(0.3deg)` },
      { transform: `translate(${-k * 0.4}px, ${k * 0.2}px)` },
      { transform: 'translate(0,0)' },
    ],
    { duration: 320, easing: 'ease-out' },
  );
}

let installed = false;
/** Activa la ráfaga automática para todo elemento con `data-juice`. */
export function installJuice(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(
    'pointerdown',
    (e) => {
      const target = (e.target as Element | null)?.closest('[data-juice]');
      if (!target) return;
      const big = target.getAttribute('data-juice') === 'big';
      burst(e.clientX, e.clientY, { count: big ? 18 : 9, power: big ? 1.4 : 0.8 });
      if (big) shake(5);
    },
    { passive: true },
  );
}
