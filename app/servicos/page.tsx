"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Wrench, Plus, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { supabase } from "@/lib/supabase"
import type { Servico } from "@/types/database"
import { toast } from "sonner"

const emptyForm = { nome: '', descricao: '', valor_padrao: '', prazo_dias: '1', ativo: true }

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function ServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('servicos').select('*').order('nome')
    setServicos(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setForm(emptyForm)
    setEditId(null)
    setSheetOpen(true)
  }

  function openEdit(s: Servico) {
    setForm({
      nome: s.nome,
      descricao: s.descricao ?? '',
      valor_padrao: String(s.valor_padrao),
      prazo_dias: String(s.prazo_dias),
      ativo: s.ativo,
    })
    setEditId(s.id)
    setSheetOpen(true)
  }

  async function save() {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return }
    setSaving(true)
    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao || null,
      valor_padrao: parseFloat(form.valor_padrao) || 0,
      prazo_dias: parseInt(form.prazo_dias) || 1,
      ativo: form.ativo,
    }
    const { error } = editId
      ? await supabase.from('servicos').update(payload).eq('id', editId)
      : await supabase.from('servicos').insert(payload)
    setSaving(false)
    if (error) { toast.error('Erro ao salvar serviço'); return }
    toast.success(editId ? 'Serviço atualizado' : 'Serviço adicionado')
    setSheetOpen(false)
    load()
  }

  async function toggleAtivo(s: Servico) {
    const { error } = await supabase.from('servicos').update({ ativo: !s.ativo }).eq('id', s.id)
    if (error) { toast.error('Erro ao atualizar'); return }
    load()
  }

  async function remove() {
    if (!deleteId) return
    const { error } = await supabase.from('servicos').delete().eq('id', deleteId)
    if (error) { toast.error('Erro ao excluir serviço'); return }
    toast.success('Serviço excluído')
    setDeleteId(null)
    load()
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-foreground">
              Servi<span className="text-neon-green">ços</span>
            </h1>
            <p className="mt-0.5 text-sm text-metallic-silver">Catálogo de serviços da oficina</p>
          </div>
          <Button className="neon-button shrink-0" onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Novo Serviço</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-neon-green" />
          </div>
        ) : servicos.length === 0 ? (
          <p className="text-center text-sm text-metallic-silver py-12">Nenhum serviço cadastrado.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="neon-card hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {['Serviço', 'Valor Padrão', 'Prazo', 'Status', ''].map(h => (
                        <th key={h} className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-metallic-silver">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {servicos.map(s => (
                      <tr key={s.id} className="group hover:bg-secondary/50 transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-neon-green/30 bg-neon-green/10">
                              <Wrench className="h-5 w-5 text-neon-green" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{s.nome}</p>
                              {s.descricao && <p className="text-xs text-metallic-silver">{s.descricao}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-sm font-semibold text-neon-green">{fmt(s.valor_padrao)}</td>
                        <td className="py-4 text-sm text-metallic-silver">{s.prazo_dias}d</td>
                        <td className="py-4">
                          <button onClick={() => toggleAtivo(s)} className="flex items-center gap-1">
                            {s.ativo ? (
                              <><ToggleRight className="h-5 w-5 text-neon-green" /><span className="text-xs text-neon-green">Ativo</span></>
                            ) : (
                              <><ToggleLeft className="h-5 w-5 text-metallic-silver" /><span className="text-xs text-metallic-silver">Inativo</span></>
                            )}
                          </button>
                        </td>
                        <td className="py-4">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                              <Pencil className="h-4 w-4 text-metallic-silver" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(s.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {servicos.map(s => (
                <div key={s.id} className="neon-card">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-sm border border-neon-green/30 bg-neon-green/10">
                      <Wrench className="h-5 w-5 text-neon-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{s.nome}</p>
                      {s.descricao && <p className="text-xs text-metallic-silver truncate">{s.descricao}</p>}
                    </div>
                    <div className="shrink-0 flex gap-1">
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4 text-metallic-silver" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDeleteId(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                    <div className="flex gap-4 text-sm">
                      <span className="font-semibold text-neon-green">{fmt(s.valor_padrao)}</span>
                      <span className="text-metallic-silver">{s.prazo_dias} dias</span>
                    </div>
                    <button onClick={() => toggleAtivo(s)} className="flex items-center gap-1.5 min-h-[44px] px-2">
                      {s.ativo ? (
                        <><ToggleRight className="h-5 w-5 text-neon-green" /><span className="text-xs text-neon-green">Ativo</span></>
                      ) : (
                        <><ToggleLeft className="h-5 w-5 text-metallic-silver" /><span className="text-xs text-metallic-silver">Inativo</span></>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Sheet — Add / Edit */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg bg-card border-border flex flex-col p-0 gap-0"
        >
          <SheetHeader className="border-b border-border px-4 py-3 shrink-0">
            <SheetTitle className="text-foreground uppercase tracking-wide text-base">
              {editId ? 'Editar Serviço' : 'Novo Serviço'}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-metallic-silver text-sm">Nome *</Label>
              <Input
                className="neon-input w-full"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-metallic-silver text-sm">Descrição</Label>
              <Textarea
                className="neon-input resize-none w-full"
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-metallic-silver text-sm">Valor Padrão (R$)</Label>
              <Input
                className="neon-input w-full"
                type="number"
                min="0"
                step="0.01"
                value={form.valor_padrao}
                onChange={e => setForm(f => ({ ...f, valor_padrao: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-metallic-silver text-sm">Prazo estimado (dias)</Label>
              <Input
                className="neon-input w-full"
                type="number"
                min="1"
                value={form.prazo_dias}
                onChange={e => setForm(f => ({ ...f, prazo_dias: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between py-1">
              <Label className="text-metallic-silver text-sm">Status</Label>
              <button
                onClick={() => setForm(f => ({ ...f, ativo: !f.ativo }))}
                className="flex items-center gap-2 min-h-[44px] px-2"
              >
                {form.ativo ? (
                  <><ToggleRight className="h-6 w-6 text-neon-green" /><span className="text-sm text-neon-green font-semibold">Ativo</span></>
                ) : (
                  <><ToggleLeft className="h-6 w-6 text-metallic-silver" /><span className="text-sm text-metallic-silver">Inativo</span></>
                )}
              </button>
            </div>
          </div>

          <SheetFooter className="border-t border-border px-4 py-3 shrink-0 flex-row gap-3">
            <Button
              variant="outline"
              className="neon-button-outline flex-1"
              onClick={() => setSheetOpen(false)}
            >
              Cancelar
            </Button>
            <Button className="neon-button flex-1" onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border mx-4 rounded-sm w-[calc(100vw-2rem)] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir serviço?</AlertDialogTitle>
            <AlertDialogDescription className="text-metallic-silver">
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3">
            <AlertDialogCancel className="neon-button-outline border-border flex-1">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90 flex-1 min-h-[44px]"
              onClick={remove}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}
