import type { ReactNode } from "react";
import { ProtectedApp } from "@/features/navigation/components/protected-app";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <ProtectedApp>{children}</ProtectedApp>;
}
