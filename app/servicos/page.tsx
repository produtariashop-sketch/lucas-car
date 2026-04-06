"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Wrench, Plus, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
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
  const [dialog, setDialog] = useState(false)
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
    setDialog(true)
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
    setDialog(true)
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
    setDialog(false)
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
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-wider text-foreground">
              Servi<span className="text-neon-green">ços</span>
            </h1>
            <p className="mt-1 text-sm text-metallic-silver">Catálogo de serviços da oficina</p>
          </div>
          <Button className="neon-button" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Novo Serviço
          </Button>
        </div>

        <div className="neon-card">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-neon-green" /></div>
          ) : servicos.length === 0 ? (
            <p className="text-center text-sm text-metallic-silver py-8">Nenhum serviço cadastrado.</p>
          ) : (
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
          )}
        </div>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground uppercase tracking-wide">
              {editId ? 'Editar Serviço' : 'Novo Serviço'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-metallic-silver">Nome *</Label>
              <Input className="neon-input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-metallic-silver">Descrição</Label>
              <Textarea className="neon-input resize-none" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-metallic-silver">Valor Padrão (R$)</Label>
                <Input className="neon-input" type="number" min="0" step="0.01" value={form.valor_padrao} onChange={e => setForm(f => ({ ...f, valor_padrao: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-metallic-silver">Prazo (dias)</Label>
                <Input className="neon-input" type="number" min="1" value={form.prazo_dias} onChange={e => setForm(f => ({ ...f, prazo_dias: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="neon-button-outline" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button className="neon-button" onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir serviço?</AlertDialogTitle>
            <AlertDialogDescription className="text-metallic-silver">Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="neon-button-outline border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}
