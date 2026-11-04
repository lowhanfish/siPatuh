"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function CinematicMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const scene = element.querySelector<HTMLElement>(".oversight-scene");
    const precisePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;
    let x = 0;
    let y = 0;
    function updateScene() {
      frame = 0;
      if (!scene) return;
      const bounds = scene.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -bounds.top / bounds.height));
      scene.style.setProperty("--scene-x", `${x}deg`);
      scene.style.setProperty("--scene-y", `${y}deg`);
      scene.style.setProperty("--scene-scroll", `${progress * -12}deg`);
    }
    function scheduleUpdate() {
      if (!frame) frame = window.requestAnimationFrame(updateScene);
    }
    function moveScene(event: PointerEvent) {
      if (!scene || !precisePointer.matches) return;
      const bounds = scene.getBoundingClientRect();
      x = ((event.clientX - bounds.left) / bounds.width - .5) * 12;
      y = -((event.clientY - bounds.top) / bounds.height - .5) * 8;
      scheduleUpdate();
    }
    function resetScene() { x = 0; y = 0; scheduleUpdate(); }
    scene?.addEventListener("pointermove", moveScene);
    scene?.addEventListener("pointerleave", resetScene);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
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
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      scene?.removeEventListener("pointermove", moveScene);
      scene?.removeEventListener("pointerleave", resetScene);
      window.removeEventListener("scroll", scheduleUpdate);
    };
  }, []);

  return <div ref={root} className="cinematic-landing">{children}</div>;
}
