/** Иллюстрация пучка стеклокомпозитной арматуры с винтовой навивкой (SVG, без внешних картинок). */
type Props = { className?: string; variant?: 'hero' | 'card'; diameter?: number };

const RODS = [
  { y: 70, w: 22 }, { y: 120, w: 26 }, { y: 175, w: 20 }, { y: 225, w: 28 }, { y: 280, w: 24 },
];

export function RebarVisual({ className, variant = 'hero' }: Props) {
  return (
    <svg viewBox="0 0 640 360" className={className} role="img" aria-label="Стеклокомпозитная арматура">
      <defs>
        <linearGradient id="rod" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6e2a4" />
          <stop offset=".45" stopColor="#d9ad48" />
          <stop offset="1" stopColor="#8f6a1f" />
        </linearGradient>
        <pattern id="wind" width="18" height="40" patternUnits="userSpaceOnUse" patternTransform="skewX(-32)">
          <rect width="6" height="40" fill="#2b2216" opacity=".55" />
        </pattern>
        <radialGradient id="cut" cx=".4" cy=".4" r=".7">
          <stop offset="0" stopColor="#fbeab6" />
          <stop offset="1" stopColor="#b88a2c" />
        </radialGradient>
      </defs>
      <g transform={variant === 'hero' ? 'rotate(-12 320 180)' : 'rotate(-8 320 180)'}>
        {RODS.map((rod, i) => (
          <g key={rod.y} style={{ animationDelay: `${i * 90}ms` }} className="animate-rise">
            <rect x="-40" y={rod.y} width="640" height={rod.w} rx={rod.w / 2} fill="url(#rod)" />
            <rect x="-40" y={rod.y} width="640" height={rod.w} rx={rod.w / 2} fill="url(#wind)" />
            <rect x="-40" y={rod.y + 3} width="640" height="3" rx="1.5" fill="#fff" opacity=".35" />
            <ellipse cx="600" cy={rod.y + rod.w / 2} rx={rod.w / 3.2} ry={rod.w / 2} fill="url(#cut)" />
          </g>
        ))}
      </g>
    </svg>
  );
}
