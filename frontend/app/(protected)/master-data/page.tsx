import { MasterDataView } from "@/features/master-data/components/master-data-view";

export const metadata = {
  title: "Master Data · SIPATUH",
  description: "Pengaturan jenis pemeriksaan, status rekomendasi dinamis, dan template surat peringatan berversi.",
};

export default function MasterDataPage() {
  return <MasterDataView />;
}
