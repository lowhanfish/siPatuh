"use client";

import { useEffect, useRef, type ReactNode } from "react";

const targets = ".admin-metric, .completion-donut, .completion-bars, .completion-legend, section.bg-surface, article.bg-surface";

export function AdminScrollMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element || !window.IntersectionObserver || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const registered = new Set<HTMLElement>();
    const reveal = (target: HTMLElement) => {
      target.dataset.scrollState = "visible";
      observer.unobserve(target);
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) reveal(entry.target as HTMLElement);
      }
    }, { threshold: 0.08, rootMargin: "0px 0px -32px 0px" });

    function visit(node: Node, callback: (target: HTMLElement) => void) {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches(targets)) callback(node);
      node.querySelectorAll<HTMLElement>(targets).forEach(callback);
    }
    function register(target: HTMLElement) {
      if (registered.has(target) || target.closest('[role="dialog"], [aria-modal="true"]')) return;
      registered.add(target);
      target.dataset.scrollState = "waiting";
      observer.observe(target);
    }
    visit(element, register);
    // Data-backed panels often mount after the initial loading state.
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        record.removedNodes.forEach((node) => visit(node, (target) => {
          observer.unobserve(target);
          registered.delete(target);
          delete target.dataset.scrollState;
        }));
        record.addedNodes.forEach((node) => visit(node, register));
      }
    });
    mutations.observe(element, { childList: true, subtree: true });
    function showFocusedPanel(event: FocusEvent) {
      if (!(event.target instanceof HTMLElement)) return;
      for (const target of registered) {
        if (target.contains(event.target)) reveal(target);
      }
    }
    element.addEventListener("focusin", showFocusedPanel);
    return () => {
      observer.disconnect();
      mutations.disconnect();
      element.removeEventListener("focusin", showFocusedPanel);
      registered.forEach((target) => { delete target.dataset.scrollState; });
    };
  }, []);

  return <div ref={root} className="admin-page-transition">{children}</div>;
}
