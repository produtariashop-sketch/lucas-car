"use client"

import { useParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { QuoteForm } from "@/components/dashboard/quote-form"

export default function EditarOrcamentoPage() {
  const params = useParams()
  const id = params.id as string

  return (
    <DashboardLayout>
      <QuoteForm orcamentoId={id} />
    </DashboardLayout>
  )
}
