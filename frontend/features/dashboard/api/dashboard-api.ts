import { apiRequest } from "@/lib/api-client";
import type {
  IrbanDashboardData,
  PimpinanDashboardData,
} from "@/features/dashboard/types";

type ApiResponseWrapper<T> = T | { data: T; success?: boolean };

export async function getIrbanDashboard(
  tahun?: number,
): Promise<IrbanDashboardData> {
  const query = tahun ? `?tahun=${encodeURIComponent(tahun)}` : "";
  const response = await apiRequest<ApiResponseWrapper<IrbanDashboardData>>(
    `/dashboard/irban${query}`,
  );

  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    response.data
  ) {
    return response.data;
  }

  return response as IrbanDashboardData;
}

export async function getPimpinanDashboard(
  tahun?: number,
): Promise<PimpinanDashboardData> {
  const query = tahun ? `?tahun=${encodeURIComponent(tahun)}` : "";
  const response = await apiRequest<ApiResponseWrapper<PimpinanDashboardData>>(
    `/dashboard/pimpinan${query}`,
  );

  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    response.data
  ) {
    return response.data;
  }

  return response as PimpinanDashboardData;
}
