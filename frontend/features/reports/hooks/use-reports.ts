import { useQuery } from "@tanstack/react-query";
import { fetchSummaryReport } from "../api/reports-api";
import type { ReportFilterParams } from "../types";

export const REPORTS_QUERY_KEYS = {
  summary: (params?: ReportFilterParams) =>
    ["reports", "summary", params || {}] as const,
};

export function useSummaryReport(params?: ReportFilterParams) {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.summary(params),
    queryFn: () => fetchSummaryReport(params),
  });
}
