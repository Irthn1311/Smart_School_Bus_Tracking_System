"use client";

import { BusStopOptimizer } from "@/components/admin/bus-stop-optimizer";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function BusStopOptimizationPage() {
  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="container mx-auto py-6">
        <BusStopOptimizer />
      </div>
    </DashboardLayout>
  );
}

