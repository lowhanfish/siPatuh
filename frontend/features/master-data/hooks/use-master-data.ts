import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createJenisPemeriksaan,
  createStatusRekomendasi,
  createSuratTemplate,
  getJenisPemeriksaanList,
  getStatusRekomendasiList,
  getSuratTemplates,
  updateJenisPemeriksaan,
  updateStatusRekomendasi,
  updateSuratTemplate,
} from "@/features/master-data/api/master-data-api";
import type {
  CreateJenisPemeriksaanInput,
  CreateStatusRekomendasiInput,
  CreateSuratTemplateInput,
  UpdateJenisPemeriksaanInput,
  UpdateStatusRekomendasiInput,
  UpdateSuratTemplateInput,
} from "@/features/master-data/types";

// ==========================================
// 1. JENIS PEMERIKSAAN HOOKS
// ==========================================

export function useJenisPemeriksaanList(activeOnly = false) {
  return useQuery({
    queryKey: ["master-data", "jenis-pemeriksaan", activeOnly],
    queryFn: () => getJenisPemeriksaanList(activeOnly),
    staleTime: 60 * 1000,
  });
}

export function useCreateJenisPemeriksaan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateJenisPemeriksaanInput) => createJenisPemeriksaan(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-data", "jenis-pemeriksaan"] });
    },
  });
}

export function useUpdateJenisPemeriksaan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateJenisPemeriksaanInput }) =>
      updateJenisPemeriksaan(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-data", "jenis-pemeriksaan"] });
    },
  });
}

// ==========================================
// 2. STATUS REKOMENDASI HOOKS
// ==========================================

export function useStatusRekomendasiList(activeOnly = false) {
  return useQuery({
    queryKey: ["master-data", "status-rekomendasi", activeOnly],
    queryFn: () => getStatusRekomendasiList(activeOnly),
    staleTime: 60 * 1000,
  });
}

export function useCreateStatusRekomendasi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateStatusRekomendasiInput) => createStatusRekomendasi(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-data", "status-rekomendasi"] });
    },
  });
}

export function useUpdateStatusRekomendasi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStatusRekomendasiInput }) =>
      updateStatusRekomendasi(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-data", "status-rekomendasi"] });
    },
  });
}

// ==========================================
// 3. SURAT TEMPLATE HOOKS
// ==========================================

export function useSuratTemplates(jenisSurat?: string) {
  return useQuery({
    queryKey: ["master-data", "surat-templates", jenisSurat],
    queryFn: () => getSuratTemplates(jenisSurat),
    staleTime: 60 * 1000,
  });
}

export function useCreateSuratTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSuratTemplateInput) => createSuratTemplate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-data", "surat-templates"] });
    },
  });
}

export function useUpdateSuratTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSuratTemplateInput }) =>
      updateSuratTemplate(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-data", "surat-templates"] });
    },
  });
}
