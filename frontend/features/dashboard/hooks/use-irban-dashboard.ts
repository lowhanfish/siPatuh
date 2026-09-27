import { useQuery } from "@tanstack/react-query";
import { getIrbanDashboard } from "@/features/dashboard/api/dashboard-api";

export function useIrbanDashboard(tahun: number) {
  return useQuery({
    queryKey: ["dashboard", "irban", tahun],
    queryFn: () => getIrbanDashboard(tahun),
    staleTime: 60 * 1000, // 1 menit
    refetchOnWindowFocus: true,
  });
}
