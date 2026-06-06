import { Suspense } from "react";
import VLibras from "@/components/VLibras";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      {children}
      <VLibras />
    </Suspense>
  );
}
