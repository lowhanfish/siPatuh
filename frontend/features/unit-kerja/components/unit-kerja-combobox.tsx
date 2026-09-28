"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Building2,
  Check,
  ChevronDown,
  Layers,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useUnitKerjaAutocomplete } from "@/features/unit-kerja/hooks/use-unit-kerja";
import type { AutocompleteUnitKerjaItem } from "@/features/unit-kerja/types";

type UnitKerjaComboboxProps = {
  value: string;
  onChange: (unitId: string, unit: AutocompleteUnitKerjaItem | null) => void;
  requiredRoleIrbanId?: string | null;
  isSuperAdmin?: boolean;
  disabled?: boolean;
};

export function UnitKerjaCombobox({
  value,
  onChange,
  requiredRoleIrbanId,
  isSuperAdmin = false,
  disabled = false,
}: UnitKerjaComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [manualSelectedUnit, setManualSelectedUnit] =
    useState<AutocompleteUnitKerjaItem | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce input search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data: searchResults = [], isLoading } =
    useUnitKerjaAutocomplete(debouncedSearch, 30);

  // Derive selected unit derived from value or manual selection
  const selectedUnit = useMemo(() => {
    if (!value) return null;
    if (manualSelectedUnit && manualSelectedUnit.id === value) {
      return manualSelectedUnit;
    }
    return searchResults.find((u) => u.id === value) || null;
  }, [value, manualSelectedUnit, searchResults]);


  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(unit: AutocompleteUnitKerjaItem) {
    // Validasi pembatasan Irban jika user adalah ADMIN_IRBAN
    if (
      !isSuperAdmin &&
      requiredRoleIrbanId &&
      unit.assigned_irban?.id &&
      unit.assigned_irban.id !== requiredRoleIrbanId
    ) {
      return; // Tidak diizinkan memilih unit di bawah Irban lain
    }

    setManualSelectedUnit(unit);
    onChange(unit.id, unit);
    setIsOpen(false);
    setSearchTerm("");
  }

  function handleClear() {
    setManualSelectedUnit(null);
    onChange("", null);
    setSearchTerm("");

    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Tampilan Ketika Unit Kerja Sudah Dipilih */}
      {selectedUnit && !isOpen ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-canvas/40 p-3 sm:p-3.5 transition-all">
          <div className="flex items-start gap-3 overflow-hidden">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand mt-0.5">
              <Building2 size={18} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-bold text-ink text-xs sm:text-sm">
                  {selectedUnit.unit_kerja}
                </p>
                {selectedUnit.assigned_irban && (
                  <span className="inline-flex items-center rounded-md bg-brand-soft px-2 py-0.5 text-2xs font-bold text-brand">
                    {selectedUnit.assigned_irban.nama}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-2xs text-muted">
                Induk Instansi:{" "}
                <span className="font-semibold text-ink-light">
                  {selectedUnit.ref_instansi || "Pemerintah Kabupaten"}
                </span>
              </p>
            </div>
          </div>

          {!disabled && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(true);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="rounded-lg border border-line bg-surface px-2.5 py-1 text-2xs font-semibold text-brand hover:border-brand transition-colors cursor-pointer"
              >
                Ganti
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg border border-line bg-surface p-1 text-muted hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
                title="Hapus pilihan"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Input Pencarian Autocomplete */
        <div className="relative">
          <div className="relative">
            <Search
              aria-hidden
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              size={16}
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="Ketik nama unit kerja, sekolah, puskesmas, atau dinas..."
              value={searchTerm}
              disabled={disabled}
              onFocus={() => setIsOpen(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              className="form-input pl-10 pr-10 text-xs sm:text-sm font-medium w-full"
            />
            {isLoading ? (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand">
                <Loader2 size={16} className="animate-spin" />
              </span>
            ) : searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
              >
                <X size={14} />
              </button>
            ) : (
              <ChevronDown
                aria-hidden
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                size={16}
              />
            )}
          </div>

          {/* Dropdown Hasil Autocomplete */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-72 overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-panel animate-in fade-in-50 zoom-in-95">
              {searchResults.length === 0 ? (
                <div className="py-6 px-4 text-center">
                  <p className="text-xs font-semibold text-ink">
                    {isLoading
                      ? "Mencari data unit kerja..."
                      : "Tidak ada unit kerja ditemukan"}
                  </p>
                  <p className="mt-1 text-2xs text-muted">
                    Coba gunakan kata kunci lain (contoh: &quot;Ranomeeto&quot;, &quot;Puskesmas&quot;, &quot;Kecamatan&quot;)
                  </p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {searchResults.map((unit) => {
                    const isSelected = unit.id === value;
                    const isOtherIrban =
                      !isSuperAdmin &&
                      Boolean(
                        requiredRoleIrbanId &&
                          unit.assigned_irban?.id &&
                          unit.assigned_irban.id !== requiredRoleIrbanId,
                      );

                    return (
                      <li key={unit.id}>
                        <button
                          type="button"
                          disabled={isOtherIrban}
                          onClick={() => handleSelect(unit)}
                          className={`w-full flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                            isSelected
                              ? "bg-brand-soft/70 text-brand"
                              : isOtherIrban
                                ? "opacity-50 cursor-not-allowed bg-canvas/30"
                                : "hover:bg-canvas text-ink cursor-pointer"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-xs sm:text-sm truncate">
                                {unit.unit_kerja}
                              </p>
                              {unit.unit_induk === 1 && (
                                <span className="rounded bg-brand/10 px-1.5 py-0.2 text-2xs font-semibold text-brand shrink-0">
                                  Kantor Induk
                                </span>
                              )}
                            </div>
                            <p className="text-2xs text-muted mt-0.5 truncate flex items-center gap-1.5">
                              <Layers size={11} className="shrink-0" />
                              <span>
                                Instansi:{" "}
                                <strong className="font-medium text-ink-light">
                                  {unit.ref_instansi}
                                </strong>
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                            {unit.assigned_irban ? (
                              <span
                                className={`rounded-md px-2 py-0.5 text-2xs font-semibold ${
                                  isOtherIrban
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-surface border border-line text-muted"
                                }`}
                              >
                                {unit.assigned_irban.nama}
                              </span>
                            ) : (
                              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-2xs font-semibold text-amber-700">
                                Belum Dipetakan
                              </span>
                            )}

                            {isSelected && (
                              <Check size={16} className="text-brand shrink-0" />
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
