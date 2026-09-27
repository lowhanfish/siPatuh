import { UnitKerjaManagementView } from "@/features/unit-kerja/components/unit-kerja-management-view";

export const metadata = {
  title: "Unit Kerja & Pejabat · SIPATUH",
  description: "Pemetaan Unit Kerja SIMPEG ke Irban serta pengelolaan pejabat definitif, PLT, dan PLH.",
};

export default function UnitKerjaPage() {
  return <UnitKerjaManagementView />;
}
