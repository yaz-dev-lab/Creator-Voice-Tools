'use client';

import { useState } from 'react';

const ACCENT = '#7c5cbf'; // matches the site's existing accent; validated for
// contrast against the dark panel surface (#14141e) with scripts/validate_palette.js

function money(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function barPath(x: number, yTop: number, yBase: number, w: number, r: number) {
  const rr = Math.min(r, w / 2, Math.max(yBase - yTop, 0));
  if (yBase - yTop <= 0) return '';
  return `M${x},${yBase} L${x},${yTop + rr} Q${x},${yTop} ${x + rr},${yTop} L${x + w - rr},${yTop} Q${x + w},${yTop} ${x + w},${yTop + rr} L${x + w},${yBase} Z`;
}

export default function RevenueChart({ data }: { data: { date: string; cents: number }[] }) {
  const [tableView, setTableView] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  const width = 760;
  const height = 200;
  const padTop = 16;
  const padBottom = 24;
  const padX = 4;
  const baseline = height - padBottom;
  const max = Math.max(1, ...data.map((d) => d.cents));
  const gap = 2;
  const barW = (width - padX * 2) / data.length - gap;

  const total = data.reduce((sum, d) => sum + d.cents, 0);

  return (
    <div className="chart-wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Revenue, last {data.length} days</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{money(total)} total</div>
        </div>
        <button className="btn btn-ghost admin-btn-sm" onClick={() => setTableView((v) => !v)}>
          {tableView ? 'View chart' : 'View as table'}
        </button>
      </div>

      {tableView ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date}>
                  <td>{d.date}</td>
                  <td>{money(d.cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Daily revenue for the last 30 days">
            <line x1={padX} y1={baseline} x2={width - padX} y2={baseline} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
            {data.map((d, i) => {
              const x = padX + i * (barW + gap);
              const h = (d.cents / max) * (baseline - padTop);
              const yTop = baseline - h;
              const isHover = hover === i;
              return (
                <g key={d.date}>
                  <rect
                    x={x}
                    y={padTop}
                    width={barW}
                    height={baseline - padTop}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover((h2) => (h2 === i ? null : h2))}
                  />
                  <path
                    d={barPath(x, yTop, baseline, barW, 3)}
                    fill={ACCENT}
                    opacity={d.cents === 0 ? 0.15 : isHover ? 1 : 0.75}
                    style={{ transition: 'opacity 0.1s' }}
                  />
                  {(i === 0 || i === data.length - 1 || i % 5 === 0) && (
                    <text
                      x={x + barW / 2}
                      y={height - 6}
                      fontSize={9}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.3)"
                    >
                      {d.date.slice(5)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {hover !== null && (
            <div
              style={{
                position: 'absolute',
                left: `${((padX + hover * (barW + gap) + barW / 2) / width) * 100}%`,
                top: 0,
                transform: 'translate(-50%, -100%)',
                background: '#0d0d14',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                padding: '5px 9px',
                fontSize: 11,
                color: '#e0e0f0',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              <strong>{money(data[hover].cents)}</strong>
              <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 6 }}>{data[hover].date}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
