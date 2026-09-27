"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Layers,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { useIrbans } from "@/features/users/hooks/use-irbans";
import { useSimpegUnitKerja } from "@/features/unit-kerja/hooks/use-unit-kerja";
import { usePejabatList } from "@/features/unit-kerja/hooks/use-pejabat";
import type {
  AssignedIrban,
  PejabatUnitKerja,
  SimpegUnitKerjaItem,
} from "@/features/unit-kerja/types";
import { UnitMappingTable } from "./unit-mapping-table";
import { PejabatTable } from "./pejabat-table";
import { AssignIrbanModal } from "./assign-irban-modal";
import { PejabatModal } from "./pejabat-modal";
import { RecipientResolutionCard } from "./recipient-resolution-card";

export function UnitKerjaManagementView() {
  const [activeTab, setActiveTab] = useState<"mapping" | "pejabat">("mapping");

  // State pencarian & filter Unit Kerja SIMPEG
  const [unitSearch, setUnitSearch] = useState<string>("");

  // State filter Pejabat
  const [pejabatUnitFilter, setPejabatUnitFilter] = useState<string>("");
  const [pejabatActiveFilter, setPejabatActiveFilter] = useState<string>("all");

  // State unit kerja yang dipilih untuk inspeksi/simulasi pejabat penerima
  const [selectedUnitForResolution, setSelectedUnitForResolution] =
    useState<SimpegUnitKerjaItem | null>(null);

  // State Modals
  const [assigningUnit, setAssigningUnit] = useState<SimpegUnitKerjaItem | null>(null);
  const [isAddPejabatOpen, setIsAddPejabatOpen] = useState(false);
  const [editingPejabat, setEditingPejabat] = useState<PejabatUnitKerja | null>(null);

  // Queries
  const { data: rawIrbans = [] } = useIrbans();
  const irbans: AssignedIrban[] = useMemo(
    () =>
      rawIrbans.map((i) => ({
        id: i.id,
        kode: i.kode,
        nama: i.nama,
      })),
    [rawIrbans],
  );

  const { data: units = [], isLoading: isUnitsLoading } = useSimpegUnitKerja(
    unitSearch || undefined,
  );

  const parsedActiveBool =
    pejabatActiveFilter === "all" ? undefined : pejabatActiveFilter === "true";

  const { data: pejabatList = [], isLoading: isPejabatLoading } = usePejabatList(
    pejabatUnitFilter || undefined,
    parsedActiveBool,
  );

  function handleSelectUnitForPejabat(unit: SimpegUnitKerjaItem) {
    setSelectedUnitForResolution(unit);
    setPejabatUnitFilter(unit.id);
    setActiveTab("pejabat");
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="eyebrow">Administrasi Wilayah</span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Unit Kerja & Pejabat OPD
          </h1>
          <p className="mt-1 text-sm text-muted">
            Pemetaan Organisasi SIMPEG ke wilayah Inspektur Pembantu dan penatausahaan pejabat berwenang penerima surat.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeTab === "pejabat" && (
            <button
              type="button"
              onClick={() => setIsAddPejabatOpen(true)}
              className="button-primary flex items-center gap-2 text-xs sm:text-sm shadow-xs"
            >
              <UserPlus size={16} />
              <span>Tambah Pejabat</span>
            </button>
          )}
        </div>
      </section>

      {/* Navigasi Tab */}
      <div className="flex border-b border-line gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("mapping")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "mapping"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Layers size={16} />
          <span>Pemetaan OPD ke Irban</span>
          <span className="rounded-full bg-line/60 px-2 py-0.5 text-xs text-ink font-bold">
            {units.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pejabat")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "pejabat"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <UserCheck size={16} />
          <span>Pejabat Unit Kerja</span>
          <span className="rounded-full bg-line/60 px-2 py-0.5 text-xs text-ink font-bold">
            {pejabatList.length}
          </span>
        </button>
      </div>

      {/* Konten Tab */}
      {activeTab === "mapping" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <UnitMappingTable
              units={units}
              isLoading={isUnitsLoading}
              search={unitSearch}
              onSearchChange={setUnitSearch}
              irbans={irbans}
              onAssignUnit={(u) => setAssigningUnit(u)}
              onSelectUnitForPejabat={handleSelectUnitForPejabat}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <div className="flex items-center gap-2">
                <Building2 className="text-brand" size={18} />
                <h3 className="text-sm font-bold text-ink">Ringkasan Wilayah Irban</h3>
              </div>
              <p className="mt-1 text-xs text-muted">
                Daftar Inspektur Pembantu yang mengawasi unit kerja di lingkungan Kab. Konawe Selatan.
              </p>

              <div className="mt-4 space-y-2">
                {irbans.map((irb) => {
                  const assignedCount = units.filter(
                    (u) => u.assigned_irban?.id === irb.id,
                  ).length;
                  return (
                    <div
                      key={irb.id}
                      className="flex items-center justify-between rounded-xl border border-line/60 bg-canvas/40 px-3.5 py-2.5 text-xs"
                    >
                      <div>
                        <span className="font-bold text-ink">{irb.nama}</span>
                        <span className="ml-1 text-2xs text-muted">({irb.kode})</span>
                      </div>
                      <span className="rounded-md bg-line px-2 py-0.5 font-bold text-ink">
                        {assignedCount} OPD
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Simulasi Resolusi Penerima Surat untuk OPD terpilih */}
            <RecipientResolutionCard selectedUnit={selectedUnitForResolution} />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PejabatTable
              pejabatList={pejabatList}
              isLoading={isPejabatLoading}
              units={units}
              selectedUnitId={pejabatUnitFilter}
              onUnitChange={(id) => {
                setPejabatUnitFilter(id);
                const matched = units.find((u) => u.id === id);
                setSelectedUnitForResolution(matched || null);
              }}
              selectedActiveStatus={pejabatActiveFilter}
              onActiveStatusChange={setPejabatActiveFilter}
              onAddPejabat={() => setIsAddPejabatOpen(true)}
              onEditPejabat={(p) => setEditingPejabat(p)}
            />
          </div>

          <div>
            <RecipientResolutionCard
              selectedUnit={
                selectedUnitForResolution ||
                units.find((u) => u.id === pejabatUnitFilter) ||
                (units.length > 0 ? units[0] : null)
              }
            />
          </div>
        </div>
      )}

      {/* Modal Penugasan Irban */}
      <AssignIrbanModal
        unitKerja={assigningUnit}
        isOpen={!!assigningUnit}
        onClose={() => setAssigningUnit(null)}
        irbans={irbans}
      />

      {/* Modal Tambah Pejabat */}
      <PejabatModal
        pejabat={null}
        defaultUnitKerjaId={pejabatUnitFilter || selectedUnitForResolution?.id}
        isOpen={isAddPejabatOpen}
        onClose={() => setIsAddPejabatOpen(false)}
        units={units}
      />

      {/* Modal Edit Pejabat */}
      <PejabatModal
        pejabat={editingPejabat}
        isOpen={!!editingPejabat}
        onClose={() => setEditingPejabat(null)}
        units={units}
      />
    </div>
  );
}
