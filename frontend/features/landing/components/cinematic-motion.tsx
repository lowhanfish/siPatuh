"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function CinematicMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.12 });
    const targets = element.querySelectorAll(".cinema-reveal");
    targets.forEach((target) => observer.observe(target));
    element.classList.add("motion-ready");
    return () => observer.disconnect();
  }, []);

  return <div ref={root} className="cinematic-landing">{children}</div>;
}
