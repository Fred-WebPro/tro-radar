"use client";

import { useEffect, useRef, useState } from "react";
import { ui, type Lang } from "@/lib/i18n";

interface Point {
  month: string; // YYYY-MM
  total: number;
}

function label(month: string, months: readonly string[]): string {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${months[0]} ’${String(y).slice(2)}` : months[m - 1];
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

export default function TrendChart({ lang = "en", data }: { lang?: Lang; data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const t = ui[lang].chart;
  const [shown, setShown] = useState(false);
  const figRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = figRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

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
    <figure ref={figRef} className={`relative ${shown ? "chart-shown" : ""}`}>
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
              <path
                d={path}
                className="chart-bar"
                style={{ animationDelay: `${i * 45}ms` }}
                fill="#2a78d6"
                opacity={i === last ? 0.45 : hover === i ? 0.8 : 1}
              />
              <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill="#898781">
                {label(d.month, t.months)}
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
          <span className="font-medium">{data[hover].total} {t.cases}</span>
          {hover === last && <span className="text-ink-muted"> {t.mtd}</span>}
        </div>
      )}
      <figcaption className="mt-2 font-mono text-[11px] text-ink-muted">
        {t.caption}
      </figcaption>
    </figure>
  );
}
