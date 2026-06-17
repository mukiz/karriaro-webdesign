import React, { useEffect, useMemo, useRef, useState } from 'react';

// Phyllotaxis-Siegel im goldenen Winkel (137,5°) — Marken- und Lade-Motiv
// (Build-Brief §9). Beim Laden "füllt" es sich Punkt für Punkt; ist ein Logo
// vorhanden, landet es in der Mitte. `prefers-reduced-motion` wird respektiert:
// dann erscheint das Siegel sofort vollständig, ohne Animation.

const GOLDEN_ANGLE = 137.5 * (Math.PI / 180);
const POINTS = 150;
const SIZE = 200;
const CENTER = SIZE / 2;
const SCALE = 7.4; // Spiral-Dichte

function buildPoints() {
  const pts = [];
  for (let i = 0; i < POINTS; i++) {
    const r = SCALE * Math.sqrt(i);
    const a = i * GOLDEN_ANGLE;
    pts.push({
      x: CENTER + r * Math.cos(a),
      y: CENTER + r * Math.sin(a),
      // Punkte außen etwas größer für ein „Blüten"-Gefühl.
      radius: 1.6 + (i / POINTS) * 3.2,
    });
  }
  return pts;
}

export default function PhyllotaxisSeal({
  active = false,
  accent = '#C2974A',
  logoUrl = null,
  monogram = '',
  settled = false,
}) {
  const points = useMemo(buildPoints, []);
  const reduced = usePrefersReducedMotion();
  const [filled, setFilled] = useState(reduced ? POINTS : 0);
  const raf = useRef(null);

  useEffect(() => {
    if (reduced) {
      setFilled(POINTS);
      return;
    }
    if (!active && !settled) {
      setFilled(0);
      return;
    }
    let start = null;
    const duration = 2400;
    const step = (ts) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      // Ease-out: außen füllt sich schneller.
      const eased = 1 - Math.pow(1 - t, 2);
      setFilled(Math.round(eased * POINTS));
      if (t < 1 && active) {
        raf.current = requestAnimationFrame(step);
      }
    };
    raf.current = requestAnimationFrame(step);
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [active, settled, reduced]);

  const showLogo = settled;

  return (
    <div className="seal" aria-hidden="true">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%" role="presentation">
        <defs>
          <radialGradient id="sealGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.18" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={CENTER} cy={CENTER} r={CENTER - 2} fill="url(#sealGlow)" />
        {points.map((p, i) => {
          const on = i < filled;
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={p.radius}
              fill={accent}
              opacity={on ? (showLogo && i < 26 ? 0 : 0.85 - (i / POINTS) * 0.35) : 0}
              style={{ transition: 'opacity .25s ease' }}
            />
          );
        })}
      </svg>

      {showLogo && (
        <div className="seal-center">
          {logoUrl ? (
            <img
              className="seal-logo"
              src={logoUrl}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const mono = e.currentTarget.nextElementSibling;
                if (mono) mono.style.display = 'grid';
              }}
            />
          ) : null}
          <span
            className="seal-monogram"
            style={{ display: logoUrl ? 'none' : 'grid', color: accent }}
          >
            {monogram}
          </span>
        </div>
      )}
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}
