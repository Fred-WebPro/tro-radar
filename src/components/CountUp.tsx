"use client";

import { useEffect, useRef, useState } from "react";

const fmt = new Intl.NumberFormat("en-US");

/** Renders the final value on the server, counts up from 0 once scrolled into view. */
export default function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || value === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer: ReturnType<typeof setInterval> | undefined;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      const t0 = performance.now();
      const duration = 1300;
      setDisplay(0);
      // Time-based interval instead of rAF so the animation completes even in
      // background tabs (where rAF is paused).
      timer = setInterval(() => {
        const p = Math.min(1, (performance.now() - t0) / duration);
        setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p >= 1) clearInterval(timer);
      }, 16);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        start();
      },
      { threshold: 0.4 }
    );
    // Already on screen at mount: start without waiting for the observer.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) start();
    else io.observe(el);
    return () => {
      if (timer) clearInterval(timer);
      io.disconnect();
    };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {fmt.format(display)}
    </span>
  );
}
