import { UsersManagementView } from "@/features/users/components/users-management-view";

export const metadata = {
  title: "Pengguna & Irban · SIPATUH",
  description: "Manajemen pengguna lokal SIPATUH dan wilayah kerja Inspektur Pembantu",
};

export default function PenggunaPage() {
  return <UsersManagementView />;
}
