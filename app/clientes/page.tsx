"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Users, Search, Plus, Phone, Mail, Pencil, Trash2, Loader2, Car, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { supabase } from "@/lib/supabase"
import type { Cliente } from "@/types/database"
import { toast } from "sonner"

type VeiculoForm = {
  id?: string
  marca: string
  modelo: string
  ano: string
  cor: string
  placa: string
  _delete?: boolean
}

const emptyCliente: Omit<Cliente, 'id' | 'created_at'> = {
  nome: '', telefone: '', email: '', endereco: '', cpf_cnpj: '',
}

const emptyVeiculo: VeiculoForm = { marca: '', modelo: '', ano: '', cor: '', placa: '' }

export default function ClientsPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyCliente)
  const [veiculos, setVeiculos] = useState<VeiculoForm[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('clientes').select('*').order('nome')
    setClientes(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = clientes.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.telefone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setForm(emptyCliente)
    setVeiculos([])
    setEditId(null)
    setSheetOpen(true)
  }

  async function openEdit(c: Cliente) {
    setForm({ nome: c.nome, telefone: c.telefone ?? '', email: c.email ?? '', endereco: c.endereco ?? '', cpf_cnpj: c.cpf_cnpj ?? '' })
    setEditId(c.id)
    const { data } = await supabase.from('veiculos').select('*').eq('cliente_id', c.id)
    setVeiculos((data ?? []).map(v => ({
      id: v.id,
      marca: v.marca,
      modelo: v.modelo,
      ano: v.ano ?? '',
      cor: v.cor ?? '',
      placa: v.placa ?? '',
    })))
    setSheetOpen(true)
  }

  function addVeiculo() {
    setVeiculos(v => [...v, { ...emptyVeiculo }])
  }

  function removeVeiculo(idx: number) {
    setVeiculos(v => {
      const updated = [...v]
      if (updated[idx].id) {
        updated[idx] = { ...updated[idx], _delete: true }
      } else {
        updated.splice(idx, 1)
      }
      return updated
    })
  }

  function updateVeiculo(idx: number, field: keyof Omit<VeiculoForm, '_delete' | 'id'>, value: string) {
    setVeiculos(v => v.map((vv, i) => i === idx ? { ...vv, [field]: value } : vv))
  }

  async function save() {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return }
    setSaving(true)

    const payload = {
      nome: form.nome.trim(),
      telefone: form.telefone || null,
      email: form.email || null,
      endereco: form.endereco || null,
      cpf_cnpj: form.cpf_cnpj || null,
    }

    let clienteId = editId

    if (editId) {
      const { error } = await supabase.from('clientes').update(payload).eq('id', editId)
      if (error) { toast.error('Erro ao salvar cliente'); setSaving(false); return }
    } else {
      const { data, error } = await supabase.from('clientes').insert(payload).select().single()
      if (error || !data) { toast.error('Erro ao salvar cliente'); setSaving(false); return }
      clienteId = data.id
    }

    const toDelete = veiculos.filter(v => v.id && v._delete)
    const toUpdate = veiculos.filter(v => v.id && !v._delete && v.marca && v.modelo)
    const toInsert = veiculos.filter(v => !v.id && !v._delete && v.marca && v.modelo)

    await Promise.all([
      ...toDelete.map(v => supabase.from('veiculos').delete().eq('id', v.id!)),
      ...toUpdate.map(v =>
        supabase.from('veiculos').update({
          marca: v.marca, modelo: v.modelo,
          ano: v.ano || null, cor: v.cor || null, placa: v.placa || null,
        }).eq('id', v.id!)
      ),
      ...toInsert.map(v =>
        supabase.from('veiculos').insert({
          cliente_id: clienteId,
          marca: v.marca, modelo: v.modelo,
          ano: v.ano || null, cor: v.cor || null, placa: v.placa || null,
        })
      ),
    ])

    setSaving(false)
    toast.success(editId ? 'Cliente atualizado' : 'Cliente adicionado')
    setSheetOpen(false)
    load()
  }

  async function remove() {
    if (!deleteId) return
    const { count } = await supabase
      .from('orcamentos')
      .select('id', { count: 'exact', head: true })
      .eq('cliente_id', deleteId)
    if ((count ?? 0) > 0) {
      toast.error(`Não é possível excluir: este cliente possui ${count} orçamento(s) vinculado(s).`)
      setDeleteId(null)
      return
    }
    await supabase.from('veiculos').delete().eq('cliente_id', deleteId)
    const { error } = await supabase.from('clientes').delete().eq('id', deleteId)
    if (error) { toast.error('Erro ao excluir cliente'); return }
    toast.success('Cliente excluído')
    setDeleteId(null)
    load()
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-foreground">
              Clien<span className="text-neon-green">tes</span>
            </h1>
            <p className="mt-0.5 text-sm text-metallic-silver">Gerencie sua base de clientes</p>
          </div>
          <Button className="neon-button shrink-0" onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Novo Cliente</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>

        <div className="neon-card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-metallic-silver" />
            <Input
              placeholder="Buscar por nome, telefone ou e-mail..."
              className="neon-input pl-10 w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-neon-green" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-metallic-silver py-12">Nenhum cliente encontrado.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(c => (
              <div key={c.id} className="neon-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full border border-neon-green/30 bg-neon-green/10">
                      <Users className="h-5 w-5 text-neon-green" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground truncate">{c.nome}</h3>
                      {c.cpf_cnpj && <p className="text-xs text-metallic-silver">{c.cpf_cnpj}</p>}
                    </div>
                  </div>
                  <div className="shrink-0 flex gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4 text-metallic-silver" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {c.telefone && (
                    <a href={`tel:${c.telefone}`} className="flex items-center gap-2 text-sm text-metallic-silver hover:text-foreground transition-colors">
                      <Phone className="h-4 w-4 shrink-0" /> {c.telefone}
                    </a>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2 text-sm text-metallic-silver">
                      <Mail className="h-4 w-4 shrink-0" /> <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.endereco && (
                    <p className="text-xs text-metallic-silver truncate">{c.endereco}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
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
              {editId ? 'Editar Cliente' : 'Novo Cliente'}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {/* ── Dados do cliente ── */}
            <div className="space-y-2">
              <Label className="text-metallic-silver text-sm">Nome *</Label>
              <Input
                className="neon-input w-full"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-metallic-silver text-sm">Telefone</Label>
              <Input
                className="neon-input w-full"
                type="tel"
                value={form.telefone ?? ''}
                onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-metallic-silver text-sm">CPF / CNPJ</Label>
              <Input
                className="neon-input w-full"
                value={form.cpf_cnpj ?? ''}
                onChange={e => setForm(f => ({ ...f, cpf_cnpj: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-metallic-silver text-sm">E-mail</Label>
              <Input
                className="neon-input w-full"
                type="email"
                value={form.email ?? ''}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-metallic-silver text-sm">Endereço</Label>
              <Input
                className="neon-input w-full"
                value={form.endereco ?? ''}
                onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))}
              />
            </div>

            {/* ── Veículos ── */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
                  <Car className="h-4 w-4 text-neon-green" />
                  Veículos
                </h3>
                <Button
                  variant="outline"
                  className="neon-button-outline h-8 px-3 text-xs"
                  onClick={addVeiculo}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar Veículo
                </Button>
              </div>

              {veiculos.every(v => v._delete) && (
                <p className="text-xs text-metallic-silver text-center py-4 border border-dashed border-border rounded-sm">
                  Nenhum veículo. Clique em "+ Adicionar Veículo".
                </p>
              )}

              <div className="space-y-3">
                {veiculos.map((v, idx) => {
                  if (v._delete) return null
                  const activeNum = veiculos.slice(0, idx).filter(x => !x._delete).length + 1
                  return (
                    <div key={idx} className="border border-border rounded-sm p-3 space-y-3 bg-secondary/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-neon-green uppercase tracking-wide">
                          Veículo {activeNum}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeVeiculo(idx)}
                        >
                          <X className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-metallic-silver text-xs">Marca *</Label>
                          <Input
                            className="neon-input w-full h-9 text-sm"
                            value={v.marca}
                            placeholder="Ex: Volkswagen"
                            onChange={e => updateVeiculo(idx, 'marca', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-metallic-silver text-xs">Modelo *</Label>
                          <Input
                            className="neon-input w-full h-9 text-sm"
                            value={v.modelo}
                            placeholder="Ex: Gol"
                            onChange={e => updateVeiculo(idx, 'modelo', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-metallic-silver text-xs">Ano</Label>
                          <Input
                            className="neon-input w-full h-9 text-sm"
                            value={v.ano}
                            placeholder="Ex: 2020"
                            onChange={e => updateVeiculo(idx, 'ano', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-metallic-silver text-xs">Cor</Label>
                          <Input
                            className="neon-input w-full h-9 text-sm"
                            value={v.cor}
                            placeholder="Ex: Prata"
                            onChange={e => updateVeiculo(idx, 'cor', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-metallic-silver text-xs">Placa</Label>
                          <Input
                            className="neon-input w-full h-9 text-sm"
                            value={v.placa}
                            placeholder="Ex: ABC1234"
                            onChange={e => updateVeiculo(idx, 'placa', e.target.value.toUpperCase())}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
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

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border dialog-mobile-safe max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription className="text-metallic-silver">
              Esta ação não pode ser desfeita. Os veículos vinculados também serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-3">
            <AlertDialogCancel className="neon-button-outline border-border w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90 w-full sm:w-auto min-h-[44px]"
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
