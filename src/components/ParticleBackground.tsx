'use client';

import { useEffect, useRef } from 'react';

const PATTERN_HEIGHT = 1200;
const PARALLAX_FACTOR = 0.18;

const DOTS = [
  { top: 40, left: '8%', size: 4 },
  { top: 140, left: '88%', size: 3 },
  { top: 260, left: '4%', size: 3 },
  { top: 380, left: '92%', size: 4 },
  { top: 470, left: '15%', size: 3 },
  { top: 90, left: '48%', size: 3 },
  { top: 560, left: '78%', size: 3 },
  { top: 640, left: '55%', size: 4 },
  { top: 720, left: '25%', size: 3 },
  { top: 820, left: '68%', size: 4 },
  { top: 940, left: '10%', size: 3 },
  { top: 1020, left: '82%', size: 3 },
  { top: 1100, left: '38%', size: 4 },
  { top: 1160, left: '60%', size: 3 },
];

export default function ParticleBackground() {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const ticking = useRef(false);

  useEffect(() => {
    function update() {
      ticking.current = false;
      const offset = (window.scrollY * PARALLAX_FACTOR) % PATTERN_HEIGHT;
      if (innerRef.current) {
        innerRef.current.style.transform = `translateY(${-offset}px)`;
      }
    }
    function onScroll() {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(update);
      }
    }
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const tile = DOTS.map((d, i) => (
    <span key={i} style={{ top: d.top, left: d.left, width: d.size, height: d.size }} />
  ));

  return (
    <div className="bg-particles" aria-hidden="true">
      <div className="bg-particles-inner" ref={innerRef}>
        <div className="bg-particles-tile" style={{ top: 0 }}>
          {tile}
        </div>
        <div className="bg-particles-tile" style={{ top: PATTERN_HEIGHT }}>
          {tile}
        </div>
      </div>
    </div>
  );
}
