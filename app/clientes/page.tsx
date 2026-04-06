"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Users, Search, Plus, Phone, Mail, Pencil, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { supabase } from "@/lib/supabase"
import type { Cliente } from "@/types/database"
import { toast } from "sonner"

const empty: Omit<Cliente, 'id' | 'created_at'> = {
  nome: '', telefone: '', email: '', endereco: '', cpf_cnpj: '',
}

export default function ClientsPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(empty)
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
    setForm(empty)
    setEditId(null)
    setDialog(true)
  }

  function openEdit(c: Cliente) {
    setForm({ nome: c.nome, telefone: c.telefone ?? '', email: c.email ?? '', endereco: c.endereco ?? '', cpf_cnpj: c.cpf_cnpj ?? '' })
    setEditId(c.id)
    setDialog(true)
  }

  async function save() {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return }
    setSaving(true)
    const payload = { nome: form.nome.trim(), telefone: form.telefone || null, email: form.email || null, endereco: form.endereco || null, cpf_cnpj: form.cpf_cnpj || null }
    const { error } = editId
      ? await supabase.from('clientes').update(payload).eq('id', editId)
      : await supabase.from('clientes').insert(payload)
    setSaving(false)
    if (error) { toast.error('Erro ao salvar cliente'); return }
    toast.success(editId ? 'Cliente atualizado' : 'Cliente adicionado')
    setDialog(false)
    load()
  }

  async function remove() {
    if (!deleteId) return
    // Check for linked quotes
    const { count } = await supabase
      .from('orcamentos')
      .select('id', { count: 'exact', head: true })
      .eq('cliente_id', deleteId)
    if ((count ?? 0) > 0) {
      toast.error(`Não é possível excluir: este cliente possui ${count} orçamento(s) vinculado(s).`)
      setDeleteId(null)
      return
    }
    const { error } = await supabase.from('clientes').delete().eq('id', deleteId)
    if (error) { toast.error('Erro ao excluir cliente'); return }
    toast.success('Cliente excluído')
    setDeleteId(null)
    load()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-wider text-foreground">
              Clien<span className="text-neon-green">tes</span>
            </h1>
            <p className="mt-1 text-sm text-metallic-silver">Gerencie sua base de clientes</p>
          </div>
          <Button className="neon-button" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Novo Cliente
          </Button>
        </div>

        <div className="neon-card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-metallic-silver" />
            <Input
              placeholder="Buscar por nome, telefone ou e-mail..."
              className="neon-input pl-10"
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(c => (
              <div key={c.id} className="neon-card group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neon-green/30 bg-neon-green/10">
                      <Users className="h-6 w-6 text-neon-green" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{c.nome}</h3>
                      {c.cpf_cnpj && <p className="text-xs text-metallic-silver">{c.cpf_cnpj}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4 text-metallic-silver" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {c.telefone && (
                    <div className="flex items-center gap-2 text-sm text-metallic-silver">
                      <Phone className="h-4 w-4" /> {c.telefone}
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2 text-sm text-metallic-silver">
                      <Mail className="h-4 w-4" /> {c.email}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground uppercase tracking-wide">
              {editId ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-metallic-silver">Nome *</Label>
              <Input className="neon-input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-metallic-silver">Telefone</Label>
                <Input className="neon-input" value={form.telefone ?? ''} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-metallic-silver">CPF / CNPJ</Label>
                <Input className="neon-input" value={form.cpf_cnpj ?? ''} onChange={e => setForm(f => ({ ...f, cpf_cnpj: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-metallic-silver">E-mail</Label>
              <Input className="neon-input" type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-metallic-silver">Endereço</Label>
              <Input className="neon-input" value={form.endereco ?? ''} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} />
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

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription className="text-metallic-silver">
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="neon-button-outline border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={remove}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}
