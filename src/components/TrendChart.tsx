"use client";

import { useState } from "react";

interface Point {
  month: string; // YYYY-MM
  total: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function label(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${MONTHS[0]} ’${String(y).slice(2)}` : MONTHS[m - 1];
}

function niceMax(n: number): number {
  if (n <= 10) return 10;
  const pow = 10 ** Math.floor(Math.log10(n));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (n <= m * pow) return m * pow;
  }
  return 10 * pow;
}

const W = 720;
const H = 200;
const PAD = { top: 12, right: 8, bottom: 24, left: 36 };

export default function TrendChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return null;

  const max = niceMax(Math.max(...data.map((d) => d.total)));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const band = innerW / data.length;
  const barW = Math.min(28, band - 8);
  const y = (v: number) => PAD.top + innerH * (1 - v / max);
  const gridVals = [max / 2, max];
  const last = data.length - 1;

  return (
    <figure className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Schedule A cases filed per month: ${data.map((d) => `${d.month} ${d.total}`).join(", ")}`}
      >
        {gridVals.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="#e3e1d8" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#898781">
              {v}
            </text>
          </g>
        ))}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={PAD.top + innerH}
          y2={PAD.top + innerH}
          stroke="#c3c2b7"
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const cx = PAD.left + band * i + band / 2;
          const x0 = cx - barW / 2;
          const top = y(d.total);
          const bottom = PAD.top + innerH;
          const h = Math.max(bottom - top, 2);
          const r = Math.min(4, h);
          // Rounded at the data end only; flat at the baseline.
          const path = `M ${x0} ${bottom} V ${top + r} Q ${x0} ${top} ${x0 + r} ${top} H ${x0 + barW - r} Q ${x0 + barW} ${top} ${x0 + barW} ${top + r} V ${bottom} Z`;
          return (
            <g key={d.month}>
              <path d={path} fill="#2a78d6" opacity={i === last ? 0.45 : hover === i ? 0.8 : 1} />
              <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill="#898781">
                {label(d.month)}
              </text>
              <rect
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-1 border border-rule bg-surface px-2.5 py-1.5 text-xs text-ink shadow-md"
          style={{ left: `${((PAD.left + band * hover + band / 2) / W) * 100}%`, transform: "translateX(-50%)" }}
        >
          <span className="text-ink-muted">{data[hover].month}</span>{" "}
          <span className="font-medium">{data[hover].total} cases</span>
          {hover === last && <span className="text-ink-muted"> (month to date)</span>}
        </div>
      )}
      <figcaption className="mt-2 font-mono text-[11px] text-ink-muted">
        Schedule A cases filed per month · current month is partial
      </figcaption>
    </figure>
  );
}
