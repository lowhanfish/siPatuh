import { useQuery } from "@tanstack/react-query";
import { getPimpinanDashboard } from "@/features/dashboard/api/dashboard-api";

export function usePimpinanDashboard(tahun: number) {
  return useQuery({
    queryKey: ["dashboard", "pimpinan", tahun],
    queryFn: () => getPimpinanDashboard(tahun),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
