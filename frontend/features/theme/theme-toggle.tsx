"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const key = "sipatuh-theme";
const eventName = "sipatuh-theme-change";
function subscribe(callback: () => void) {
  const sync = (event: StorageEvent) => {
    if (event.key !== key && event.key !== null) return;
    document.documentElement.dataset.theme = event.newValue === "light" ? "light" : "dark";
    callback();
  };
  window.addEventListener(eventName, callback);
  window.addEventListener("storage", sync);
  return () => {
    window.removeEventListener(eventName, callback);
    window.removeEventListener("storage", sync);
  };
}
function getTheme() { return document.documentElement.dataset.theme === "light" ? "light" : "dark"; }
function getServerTheme() { return "dark"; }

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);
  useEffect(() => {
    // Reapply the saved preference when a new page header mounts.
    try {
      const saved = window.localStorage.getItem(key);
      if (saved === "light" || saved === "dark") {
        document.documentElement.dataset.theme = saved;
        window.dispatchEvent(new Event(eventName));
      }
    } catch { /* Keep the current theme if storage is unavailable. */ }
  }, []);
  const light = theme === "light";
  const label = light ? "Aktifkan mode dark" : "Aktifkan mode light";
  function toggle() {
    const next = light ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { window.localStorage.setItem(key, next); } catch { /* Theme still works without storage. */ }
    window.dispatchEvent(new Event(eventName));
  }
  return <button className="theme-toggle" type="button" aria-label={label} title={label} onClick={toggle}>
    {light ? <Moon aria-hidden size={17} /> : <Sun aria-hidden size={17} />}
    <span>{light ? "Dark" : "Light"}</span>
  </button>;
}
