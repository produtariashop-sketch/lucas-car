"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Car, Search, Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { supabase } from "@/lib/supabase"
import type { Veiculo, Cliente } from "@/types/database"
import { toast } from "sonner"

const emptyForm = { cliente_id: '', marca: '', modelo: '', ano: '', cor: '', placa: '' }

export default function VehiclesPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: v }, { data: c }] = await Promise.all([
      supabase.from('veiculos').select('*, clientes(id, nome)').order('marca'),
      supabase.from('clientes').select('id, nome').order('nome'),
    ])
    setVeiculos((v ?? []) as Veiculo[])
    setClientes((c ?? []) as Cliente[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = veiculos.filter(v => {
    const cli = (v as any).clientes?.nome ?? ''
    const term = search.toLowerCase()
    return (
      v.marca.toLowerCase().includes(term) ||
      v.modelo.toLowerCase().includes(term) ||
      (v.placa ?? '').toLowerCase().includes(term) ||
      cli.toLowerCase().includes(term)
    )
  })

  function openAdd() {
    setForm(emptyForm)
    setEditId(null)
    setDialog(true)
  }

  function openEdit(v: Veiculo) {
    setForm({
      cliente_id: v.cliente_id ?? '',
      marca: v.marca,
      modelo: v.modelo,
      ano: v.ano ?? '',
      cor: v.cor ?? '',
      placa: v.placa ?? '',
    })
    setEditId(v.id)
    setDialog(true)
  }

  async function save() {
    if (!form.marca.trim() || !form.modelo.trim()) { toast.error('Marca e modelo são obrigatórios'); return }
    setSaving(true)
    const payload = {
      cliente_id: form.cliente_id || null,
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      ano: form.ano || null,
      cor: form.cor || null,
      placa: form.placa ? form.placa.toUpperCase() : null,
    }
    const { error } = editId
      ? await supabase.from('veiculos').update(payload).eq('id', editId)
      : await supabase.from('veiculos').insert(payload)
    setSaving(false)
    if (error) { toast.error('Erro ao salvar veículo'); return }
    toast.success(editId ? 'Veículo atualizado' : 'Veículo adicionado')
    setDialog(false)
    load()
  }

  async function remove() {
    if (!deleteId) return
    // Check for linked quotes
    const { count } = await supabase
      .from('orcamentos')
      .select('id', { count: 'exact', head: true })
      .eq('veiculo_id', deleteId)
    if ((count ?? 0) > 0) {
      toast.error(`Não é possível excluir: este veículo possui ${count} orçamento(s) vinculado(s).`)
      setDeleteId(null)
      return
    }
    const { error } = await supabase.from('veiculos').delete().eq('id', deleteId)
    if (error) { toast.error('Erro ao excluir veículo'); return }
    toast.success('Veículo excluído')
    setDeleteId(null)
    load()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-wider text-foreground">
              Veícu<span className="text-neon-green">los</span>
            </h1>
            <p className="mt-1 text-sm text-metallic-silver">Cadastro de veículos</p>
          </div>
          <Button className="neon-button" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Novo Veículo
          </Button>
        </div>

        <div className="neon-card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-metallic-silver" />
            <Input
              placeholder="Buscar por marca, modelo, placa ou proprietário..."
              className="neon-input pl-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="neon-card">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-neon-green" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-metallic-silver py-8">Nenhum veículo encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Veículo', 'Ano', 'Placa', 'Cor', 'Proprietário', ''].map(h => (
                      <th key={h} className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-metallic-silver">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(v => {
                    const cli = (v as any).clientes
                    return (
                      <tr key={v.id} className="group hover:bg-secondary/50 transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-neon-green/30 bg-neon-green/10">
                              <Car className="h-5 w-5 text-neon-green" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{v.marca}</p>
                              <p className="text-sm text-metallic-silver">{v.modelo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-sm text-foreground">{v.ano ?? '—'}</td>
                        <td className="py-4 text-sm font-semibold text-neon-green">{v.placa ?? '—'}</td>
                        <td className="py-4 text-sm text-metallic-silver">{v.cor ?? '—'}</td>
                        <td className="py-4 text-sm text-foreground">{cli?.nome ?? '—'}</td>
                        <td className="py-4">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(v)}>
                              <Pencil className="h-4 w-4 text-metallic-silver" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(v.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
              {editId ? 'Editar Veículo' : 'Novo Veículo'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-metallic-silver">Proprietário</Label>
              <Select value={form.cliente_id} onValueChange={v => setForm(f => ({ ...f, cliente_id: v }))}>
                <SelectTrigger className="neon-input"><SelectValue placeholder="Selecionar cliente..." /></SelectTrigger>
                <SelectContent>
                  {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-metallic-silver">Marca *</Label>
                <Input className="neon-input" value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-metallic-silver">Modelo *</Label>
                <Input className="neon-input" value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-metallic-silver">Ano</Label>
                <Input className="neon-input" value={form.ano} onChange={e => setForm(f => ({ ...f, ano: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-metallic-silver">Placa</Label>
                <Input className="neon-input uppercase" value={form.placa} onChange={e => setForm(f => ({ ...f, placa: e.target.value.toUpperCase() }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-metallic-silver">Cor</Label>
              <Input className="neon-input" value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))} />
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
            <AlertDialogTitle className="text-foreground">Excluir veículo?</AlertDialogTitle>
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
