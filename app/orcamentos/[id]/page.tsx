"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { supabase } from "@/lib/supabase"
import type { Config, OrcamentoItem, StatusOrcamento } from "@/types/database"
import { toast } from "sonner"
import {
  ArrowLeft,
  FileDown,
  MessageCircle,
  Loader2,
  User,
  Car,
  Calendar,
  Clock,
  Tag,
  Pencil,
  Trash2,
} from "lucide-react"

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

const STATUS_STYLES: Record<string, string> = {
  aprovado: "bg-neon-green/20 text-neon-green",
  pendente: "bg-metallic-silver/20 text-metallic-silver",
  rejeitado: "bg-destructive/20 text-destructive",
  concluido: "bg-blue-500/20 text-blue-500",
}

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  concluido: "Concluído",
}

type OrcamentoDetail = {
  id: string
  created_at: string
  validade_dias: number
  desconto: number
  valor_total: number
  observacoes: string | null
  status: StatusOrcamento
  clientes: {
    id: string
    nome: string
    telefone: string | null
    email: string | null
    endereco: string | null
    cpf_cnpj: string | null
  } | null
  veiculos: {
    id: string
    marca: string
    modelo: string
    ano: string | null
    placa: string | null
    cor: string | null
  } | null
}

type ItemDetail = OrcamentoItem & {
  servicos: { prazo_dias: number } | null
}

export default function OrcamentoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [orcamento, setOrcamento] = useState<OrcamentoDetail | null>(null)
  const [itens, setItens] = useState<ItemDetail[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    async function load() {
      const [oRes, iRes, cRes] = await Promise.all([
        supabase
          .from("orcamentos")
          .select(
            "id, created_at, validade_dias, desconto, valor_total, observacoes, status, clientes(id, nome, telefone, email, endereco, cpf_cnpj), veiculos(id, marca, modelo, ano, placa, cor)"
          )
          .eq("id", id)
          .single(),
        supabase
          .from("orcamento_itens")
          .select("*, servicos(prazo_dias)")
          .eq("orcamento_id", id)
          .order("created_at"),
        supabase.from("config").select("*").single(),
      ])

      if (oRes.data) setOrcamento(oRes.data as unknown as OrcamentoDetail)
      if (iRes.data) setItens(iRes.data as ItemDetail[])
      if (cRes.data) setConfig(cRes.data as Config)
      setLoading(false)
    }
    load()
  }, [id])

  async function handleStatusChange(newStatus: string) {
    if (!orcamento) return
    setUpdatingStatus(true)
    const { error } = await supabase
      .from("orcamentos")
      .update({ status: newStatus })
      .eq("id", id)
    setUpdatingStatus(false)
    if (error) { toast.error("Erro ao atualizar status"); return }
    setOrcamento(prev => prev ? { ...prev, status: newStatus as StatusOrcamento } : prev)
    toast.success("Status atualizado")
  }

  async function handleDelete() {
    setDeleting(true)
    const { error } = await supabase.from("orcamentos").delete().eq("id", id)
    setDeleting(false)
    if (error) { toast.error("Erro ao excluir orçamento"); return }
    toast.success("Orçamento excluído")
    router.push("/orcamentos")
  }

  const handleDownloadPDF = async () => {
    if (!orcamento) return
    setGeneratingPdf(true)
    try {
      const [{ pdf }, { OrcamentoPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/dashboard/orcamento-pdf"),
      ])

      // Pre-fetch logo as base64 so @react-pdf/renderer doesn't hit CORS
      let pdfConfig = config
      if (config?.logo_url) {
        try {
          const res = await fetch(config.logo_url)
          const imgBlob = await res.blob()
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(imgBlob)
          })
          pdfConfig = { ...config, logo_url: base64 }
        } catch {
          // keep original URL on fetch failure
        }
      }

      const blob = await pdf(
        <OrcamentoPDF orcamento={orcamento} itens={itens} config={pdfConfig} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `orcamento-${orcamento.id.slice(0, 8).toUpperCase()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Erro ao gerar PDF:", err)
      toast.error("Erro ao gerar PDF")
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleWhatsApp = () => {
    if (!orcamento) return
    const empresa = config?.nome_empresa ?? "LUCASCAR"
    const shortId = orcamento.id.slice(0, 8).toUpperCase()
    const validade = new Date(
      new Date(orcamento.created_at).getTime() + orcamento.validade_dias * 86400000
    ).toLocaleDateString("pt-BR")
    const veiculo = orcamento.veiculos
      ? `${orcamento.veiculos.marca} ${orcamento.veiculos.modelo}${orcamento.veiculos.ano ? ` (${orcamento.veiculos.ano})` : ""}`
      : "Não informado"

    const msg = [
      `Olá! Segue seu orçamento da *${empresa}*.`,
      ``,
      `*Orçamento:* #${shortId}`,
      `*Cliente:* ${orcamento.clientes?.nome ?? "Não informado"}`,
      `*Veículo:* ${veiculo}`,
      `*Valor Total:* ${fmt(Number(orcamento.valor_total))}`,
      `*Válido até:* ${validade}`,
      ``,
      `Entre em contato para aprovação!`,
    ].join("\n")

    const phone = orcamento.clientes?.telefone
      ? orcamento.clientes.telefone.replace(/\D/g, "").replace(/^(?!55)/, "55")
      : ""
    const base = phone ? `https://wa.me/${phone}` : "https://wa.me/"
    window.open(`${base}?text=${encodeURIComponent(msg)}`, "_blank")
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-neon-green" />
        </div>
      </DashboardLayout>
    )
  }

  if (!orcamento) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => router.back()} className="text-metallic-silver">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <p className="text-center text-metallic-silver py-12">Orçamento não encontrado.</p>
        </div>
      </DashboardLayout>
    )
  }

  const subtotal = itens.reduce((acc, i) => acc + Number(i.valor_total), 0)
  const desconto = Number(orcamento.desconto)
  const total = Number(orcamento.valor_total)
  const prazoDias = itens.reduce((acc, i) => acc + (i.servicos?.prazo_dias ?? 0), 0)
  const shortId = orcamento.id.slice(0, 8).toUpperCase()
  const dataEmissao = new Date(orcamento.created_at).toLocaleDateString("pt-BR")
  const dataValidade = new Date(
    new Date(orcamento.created_at).getTime() + orcamento.validade_dias * 86400000
  ).toLocaleDateString("pt-BR")

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Top bar */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-metallic-silver hover:text-foreground shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold uppercase tracking-wider text-foreground">
                Orça<span className="text-neon-green">mento</span>{" "}
                <span className="font-mono text-neon-green">#{shortId}</span>
              </h1>
              <p className="text-xs text-metallic-silver">{dataEmissao}</p>
            </div>
          </div>
          {/* Action buttons — 2x2 grid on mobile */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button
              variant="ghost"
              className="neon-button-outline min-h-[44px]"
              onClick={() => router.push(`/orcamentos/${id}/editar`)}
            >
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </Button>
            <Button
              variant="ghost"
              className="border border-destructive/50 text-destructive hover:bg-destructive/10 min-h-[44px]"
              onClick={() => setShowDelete(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={generatingPdf}
              className="neon-button min-h-[44px]"
            >
              {generatingPdf ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              PDF
            </Button>
            <Button onClick={handleWhatsApp} className="neon-button-outline min-h-[44px]">
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
          </div>
        </div>

        {/* Status + validity bar */}
        <div className="neon-card flex flex-wrap items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-neon-green" />
            <span className="text-xs text-metallic-silver uppercase tracking-wider">Status</span>
            <Select value={orcamento.status} onValueChange={handleStatusChange} disabled={updatingStatus}>
              <SelectTrigger className={`h-7 w-36 border-0 px-2 text-xs font-semibold uppercase rounded-sm ${STATUS_STYLES[orcamento.status] ?? STATUS_STYLES.pendente}`}>
                {updatingStatus
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <SelectValue />
                }
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-neon-green" />
            <span className="text-xs text-metallic-silver uppercase tracking-wider">Válido até</span>
            <span className="text-sm text-foreground">{dataValidade}</span>
          </div>
          {prazoDias > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-neon-green" />
              <span className="text-xs text-metallic-silver uppercase tracking-wider">Prazo estimado</span>
              <span className="text-sm text-foreground">
                {prazoDias} {prazoDias === 1 ? "dia útil" : "dias úteis"}
              </span>
            </div>
          )}
        </div>

        {/* Client + Vehicle */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="neon-card space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <User className="h-4 w-4 text-neon-green" />
              <span className="text-xs font-semibold uppercase tracking-wider text-neon-green">Cliente</span>
            </div>
            {orcamento.clientes ? (
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-foreground">{orcamento.clientes.nome}</p>
                {orcamento.clientes.cpf_cnpj && (
                  <p className="text-xs text-metallic-silver">CPF/CNPJ: {orcamento.clientes.cpf_cnpj}</p>
                )}
                {orcamento.clientes.telefone && (
                  <p className="text-xs text-metallic-silver">Tel: {orcamento.clientes.telefone}</p>
                )}
                {orcamento.clientes.email && (
                  <p className="text-xs text-metallic-silver">{orcamento.clientes.email}</p>
                )}
                {orcamento.clientes.endereco && (
                  <p className="text-xs text-metallic-silver">{orcamento.clientes.endereco}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-metallic-silver">Não informado</p>
            )}
          </div>

          <div className="neon-card space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Car className="h-4 w-4 text-neon-green" />
              <span className="text-xs font-semibold uppercase tracking-wider text-neon-green">Veículo</span>
            </div>
            {orcamento.veiculos ? (
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-foreground">
                  {orcamento.veiculos.marca} {orcamento.veiculos.modelo}
                  {orcamento.veiculos.ano ? ` (${orcamento.veiculos.ano})` : ""}
                </p>
                {orcamento.veiculos.cor && (
                  <p className="text-xs text-metallic-silver">Cor: {orcamento.veiculos.cor}</p>
                )}
                {orcamento.veiculos.placa && (
                  <p className="text-xs text-metallic-silver">Placa: {orcamento.veiculos.placa}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-metallic-silver">Não informado</p>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="neon-card">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neon-green">
            Serviços
          </h2>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Descrição", "Qtd", "Valor Unit.", "Subtotal"].map((h) => (
                    <th key={h} className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-metallic-silver last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {itens.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 text-sm text-foreground">{item.descricao}</td>
                    <td className="py-3 text-sm text-metallic-silver">{item.quantidade}</td>
                    <td className="py-3 text-sm text-metallic-silver">{fmt(Number(item.valor_unitario))}</td>
                    <td className="py-3 text-right text-sm font-semibold text-foreground">{fmt(Number(item.valor_total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile item cards */}
          <div className="md:hidden space-y-2">
            {itens.map((item) => (
              <div key={item.id} className="rounded-sm border border-border bg-secondary/30 px-3 py-2.5">
                <p className="text-sm font-semibold text-foreground">{item.descricao}</p>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-metallic-silver">Qtd: {item.quantidade} × {fmt(Number(item.valor_unitario))}</span>
                  <span className="text-sm font-bold text-foreground">{fmt(Number(item.valor_total))}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 border-t border-border pt-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-metallic-silver">Subtotal</span>
              <span className="text-foreground">{fmt(subtotal)}</span>
            </div>
            {desconto > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-metallic-silver">Desconto</span>
                <span className="text-red-400">- {fmt(desconto)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2 mt-1">
              <span className="text-base font-bold text-foreground">Total</span>
              <span className="text-base font-bold text-neon-green">{fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Observations */}
        {orcamento.observacoes && (
          <div className="neon-card">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neon-green">
              Observações
            </h2>
            <p className="text-sm text-foreground leading-relaxed">{orcamento.observacoes}</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent className="bg-card border-border dialog-mobile-safe max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir orçamento #{shortId}?</AlertDialogTitle>
            <AlertDialogDescription className="text-metallic-silver">
              Esta ação não pode ser desfeita. Todos os itens do orçamento serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-3">
            <AlertDialogCancel className="neon-button-outline border-border w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90 w-full sm:w-auto min-h-[44px]"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}
