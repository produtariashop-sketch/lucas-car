"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { FileText, Search, Filter, Plus, Loader2, Trash2, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import type { Orcamento, StatusOrcamento } from "@/types/database"
import { toast } from "sonner"

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const STATUS_STYLES: Record<string, string> = {
  aprovado: 'bg-neon-green/20 text-neon-green',
  pendente: 'bg-metallic-silver/20 text-metallic-silver',
  rejeitado: 'bg-destructive/20 text-destructive',
  concluido: 'bg-blue-500/20 text-blue-500',
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  concluido: 'Concluído',
}

export default function QuotesPage() {
  const router = useRouter()
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase
      .from('orcamentos')
      .select('*, clientes(id, nome), veiculos(id, marca, modelo, ano)')
      .order('created_at', { ascending: false })
    setOrcamentos((data ?? []) as Orcamento[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = orcamentos.filter(o => {
    const cli = (o as any).clientes?.nome ?? ''
    const vei = (o as any).veiculos
    const veiStr = vei ? `${vei.marca} ${vei.modelo}` : ''
    const matchSearch =
      cli.toLowerCase().includes(search.toLowerCase()) ||
      veiStr.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todos' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  async function updateStatus(id: string, newStatus: string) {
    setUpdatingStatus(id)
    const { error } = await supabase
      .from('orcamentos')
      .update({ status: newStatus })
      .eq('id', id)
    setUpdatingStatus(null)
    if (error) { toast.error('Erro ao atualizar status'); return }
    setOrcamentos(prev => prev.map(o => o.id === id ? { ...o, status: newStatus as StatusOrcamento } : o))
    toast.success('Status atualizado')
  }

  async function remove() {
    if (!deleteId) return
    const { error } = await supabase.from('orcamentos').delete().eq('id', deleteId)
    if (error) { toast.error('Erro ao excluir orçamento'); return }
    toast.success('Orçamento excluído')
    setDeleteId(null)
    setOrcamentos(prev => prev.filter(o => o.id !== deleteId))
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-foreground">
              Orça<span className="text-neon-green">mentos</span>
            </h1>
            <p className="mt-0.5 text-sm text-metallic-silver">Gerencie todos os seus orçamentos</p>
          </div>
          <Link href="/orcamento">
            <Button className="neon-button">
              <Plus className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Novo Orçamento</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="neon-card">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-metallic-silver" />
              <Input
                placeholder="Buscar por cliente, veículo ou ID..."
                className="neon-input pl-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="neon-input sm:w-44">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-neon-green" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-metallic-silver py-12">Nenhum orçamento encontrado.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="neon-card hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {['ID', 'Cliente', 'Veículo', 'Data', 'Valor', 'Status', ''].map(h => (
                        <th key={h} className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-metallic-silver last:text-right">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map(o => {
                      const cli = (o as any).clientes
                      const vei = (o as any).veiculos
                      return (
                        <tr key={o.id} className="group hover:bg-secondary/50 transition-colors">
                          <td className="py-4 text-xs font-mono text-neon-green cursor-pointer" onClick={() => router.push(`/orcamentos/${o.id}`)}>
                            {o.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="py-4 text-sm text-foreground cursor-pointer" onClick={() => router.push(`/orcamentos/${o.id}`)}>
                            {cli?.nome ?? '—'}
                          </td>
                          <td className="py-4 text-sm text-metallic-silver cursor-pointer" onClick={() => router.push(`/orcamentos/${o.id}`)}>
                            {vei ? `${vei.marca} ${vei.modelo} ${vei.ano ?? ''}`.trim() : '—'}
                          </td>
                          <td className="py-4 text-sm text-metallic-silver cursor-pointer" onClick={() => router.push(`/orcamentos/${o.id}`)}>
                            {new Date(o.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-4 text-sm font-semibold text-foreground cursor-pointer" onClick={() => router.push(`/orcamentos/${o.id}`)}>
                            {fmt(Number(o.valor_total))}
                          </td>
                          <td className="py-4" onClick={e => e.stopPropagation()}>
                            <Select value={o.status} onValueChange={v => updateStatus(o.id, v)} disabled={updatingStatus === o.id}>
                              <SelectTrigger className={`h-7 w-32 border-0 px-2 text-xs font-semibold uppercase rounded-sm ${STATUS_STYLES[o.status] ?? STATUS_STYLES.pendente}`}>
                                {updatingStatus === o.id
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
                          </td>
                          <td className="py-4 text-right" onClick={e => e.stopPropagation()}>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setDeleteId(o.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map(o => {
                const cli = (o as any).clientes
                const vei = (o as any).veiculos
                return (
                  <div key={o.id} className="neon-card">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        className="flex-1 min-w-0 text-left"
                        onClick={() => router.push(`/orcamentos/${o.id}`)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-neon-green">{o.id.slice(0, 8).toUpperCase()}</span>
                          <span className={`inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLES[o.status] ?? STATUS_STYLES.pendente}`}>
                            {STATUS_LABELS[o.status] ?? o.status}
                          </span>
                        </div>
                        <p className="font-bold text-foreground truncate">{cli?.nome ?? '—'}</p>
                        <p className="text-sm text-metallic-silver truncate">
                          {vei ? `${vei.marca} ${vei.modelo} ${vei.ano ?? ''}`.trim() : '—'}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-metallic-silver">{new Date(o.created_at).toLocaleDateString('pt-BR')}</span>
                          <span className="text-base font-bold text-foreground">{fmt(Number(o.valor_total))}</span>
                        </div>
                      </button>
                      <div className="shrink-0 flex flex-col gap-2 items-end">
                        <ChevronRight className="h-4 w-4 text-metallic-silver" />
                        <button
                          className="p-2 rounded-sm text-destructive hover:bg-destructive/10 active:bg-destructive/20"
                          onClick={() => setDeleteId(o.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {/* Mobile status selector */}
                    <div className="mt-3 pt-3 border-t border-border" onClick={e => e.stopPropagation()}>
                      <Select value={o.status} onValueChange={v => updateStatus(o.id, v)} disabled={updatingStatus === o.id}>
                        <SelectTrigger className={`h-9 w-full border-0 px-3 text-xs font-semibold uppercase rounded-sm ${STATUS_STYLES[o.status] ?? STATUS_STYLES.pendente}`}>
                          {updatingStatus === o.id
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
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border dialog-mobile-safe max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir orçamento?</AlertDialogTitle>
            <AlertDialogDescription className="text-metallic-silver">
              Esta ação não pode ser desfeita. Todos os itens do orçamento serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-3">
            <AlertDialogCancel className="neon-button-outline border-border w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90 w-full sm:w-auto min-h-[44px]" onClick={remove}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}
