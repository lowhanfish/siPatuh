"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Mail,
  RefreshCw,
  Search,
} from "lucide-react";
import { useSession } from "@/features/auth/hooks/use-auth";
import {
  useDueLhpList,
  useSuratPeringatanList,
} from "@/features/surat-peringatan/hooks/use-surat-peringatan";
import type {
  SpEligibilityResult,
  SpLevel,
  SuratPeringatanItem,
} from "@/features/surat-peringatan/types";
import { SpDueTable } from "@/features/surat-peringatan/components/sp-due-table";
import { SpListTable } from "@/features/surat-peringatan/components/sp-list-table";
import { SpCreateModal } from "@/features/surat-peringatan/components/sp-create-modal";
import { TteSignModal } from "@/features/surat-peringatan/components/tte-sign-modal";
import { SpDetailModal } from "@/features/surat-peringatan/components/sp-detail-modal";

export default function SuratPeringatanPage() {
  const { data: user } = useSession();

  // Tab State: "due" | "issued"
  const [activeTab, setActiveTab] = useState<"due" | "issued">("due");

  // Filters State
  const [levelFilter, setLevelFilter] = useState<SpLevel | "">("");
  const [tahunFilter, setTahunFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Queries
  const {
    data: dueList = [],
    isLoading: isDueLoading,
    refetch: refetchDue,
  } = useDueLhpList();

  const {
    data: spList = [],
    isLoading: isSpLoading,
    refetch: refetchSp,
  } = useSuratPeringatanList({
    level: levelFilter,
    tahun: tahunFilter,
  });

  // Modal States
  const [selectedDueLhp, setSelectedDueLhp] = useState<SpEligibilityResult | null>(null);
  const [signingSp, setSigningSp] = useState<SuratPeringatanItem | null>(null);
  const [detailSpId, setDetailSpId] = useState<string | null>(null);

  const canMutate =
    user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_IRBAN";

  // Filter Due List by search
  const filteredDueList = useMemo(() => {
    if (!searchQuery.trim()) return dueList;
    const q = searchQuery.toLowerCase();
    return dueList.filter(
      (item) =>
        item.nomor_lhp.toLowerCase().includes(q) ||
        (item.unit_kerja_nama && item.unit_kerja_nama.toLowerCase().includes(q)),
    );
  }, [dueList, searchQuery]);

  // Filter SP List by search
  const filteredSpList = useMemo(() => {
    if (!searchQuery.trim()) return spList;
    const q = searchQuery.toLowerCase();
    return spList.filter(
      (sp) =>
        sp.nomor_surat.toLowerCase().includes(q) ||
        (sp.unit_kerja_nama && sp.unit_kerja_nama.toLowerCase().includes(q)) ||
        sp.lhp.nomor_lhp.toLowerCase().includes(q),
    );
  }, [spList, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="eyebrow">Pengawasan & Penegakan Tindak Lanjut</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-2xs font-extrabold text-amber-800 border border-amber-200">
              <Clock size={11} />
              Engine Due SP (30/45/60 Hari)
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Surat Peringatan & TTE
          </h2>
          <p className="mt-1 text-xs text-muted">
            Pantau LHP yang terlambat ditindaklanjuti, buat draft SP bertingkat, dan sahkan secara elektronik menggunakan BSrE.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => {
              if (activeTab === "due") refetchDue();
              else refetchSp();
            }}
            className="button-secondary text-xs flex items-center gap-1.5"
            title="Muat ulang data"
          >
            <RefreshCw size={13} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-line pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("due")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "due"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <AlertTriangle size={14} />
          <span>Jatuh Tempo (Due)</span>
          {dueList.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-2xs font-bold text-amber-800">
              {dueList.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("issued")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "issued"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Mail size={14} />
          <span>Daftar SP Diterbitkan</span>
          {spList.length > 0 && (
            <span className="rounded-full bg-canvas px-2 py-0.5 text-2xs font-bold text-ink border border-line">
              {spList.length}
            </span>
          )}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor surat / LHP / OPD..."
            className="input pl-9 text-xs w-full"
          />
        </div>

        {/* Filters untuk Tab Issued */}
        {activeTab === "issued" && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as SpLevel | "")}
              className="input text-xs w-auto"
            >
              <option value="">Semua Level SP</option>
              <option value="SP1">SP1</option>
              <option value="SP2">SP2</option>
              <option value="SP3">SP3</option>
            </select>

            <select
              value={tahunFilter}
              onChange={(e) => setTahunFilter(e.target.value)}
              className="input text-xs w-auto"
            >
              <option value="">Semua Tahun</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === "due" ? (
        <SpDueTable
          dueList={filteredDueList}
          isLoading={isDueLoading}
          canCreate={canMutate}
          onSelectLhpForSp={(lhp) => setSelectedDueLhp(lhp)}
        />
      ) : (
        <SpListTable
          items={filteredSpList}
          isLoading={isSpLoading}
          canMutate={canMutate}
          onOpenSignTte={(sp) => setSigningSp(sp)}
          onOpenDetail={(sp) => setDetailSpId(sp.id)}
        />
      )}

      {/* Modal Buat SP */}
      {selectedDueLhp && (
        <SpCreateModal
          isOpen={!!selectedDueLhp}
          onClose={() => setSelectedDueLhp(null)}
          lhp={selectedDueLhp}
        />
      )}

      {/* Modal TTE BSrE */}
      {signingSp && (
        <TteSignModal
          isOpen={!!signingSp}
          onClose={() => setSigningSp(null)}
          surat={signingSp}
        />
      )}

      {/* Modal Detail SP */}
      {detailSpId && (
        <SpDetailModal
          isOpen={!!detailSpId}
          onClose={() => setDetailSpId(null)}
          suratId={detailSpId}
        />
      )}
    </div>
  );
}
