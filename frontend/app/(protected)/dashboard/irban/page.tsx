import { IrbanDashboardView } from "@/features/dashboard/components/irban/irban-dashboard-view";

export const metadata = {
  title: "Dashboard Admin Irban · SIPATUH",
  description: "Dashboard operasional pemantauan LHP dan tindak lanjut wilayah Irban",
};

export default function DashboardIrbanPage() {
  return <IrbanDashboardView />;
}
