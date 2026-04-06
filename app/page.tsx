import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardStats />
    </DashboardLayout>
  )
}
