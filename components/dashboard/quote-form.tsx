"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, FileText, User, Car, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import type { Cliente, Veiculo, Servico } from "@/types/database"
import { toast } from "sonner"

interface Item {
  _id: string
  servico_id: string
  descricao: string
  quantidade: number
  valor_unitario: number
}

interface QuoteFormProps {
  /** When provided, loads existing quote for editing */
  orcamentoId?: string
}

const newItem = (): Item => ({
  _id: crypto.randomUUID(),
  servico_id: '',
  descricao: '',
  quantidade: 1,
  valor_unitario: 0,
})

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function QuoteForm({ orcamentoId }: QuoteFormProps = {}) {
  const router = useRouter()
  const isEditing = !!orcamentoId

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [veiculosFiltrados, setVeiculosFiltrados] = useState<Veiculo[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])

  const [clienteId, setClienteId] = useState('')
  const [veiculoId, setVeiculoId] = useState('')
  const [status, setStatus] = useState('pendente')
  const [observacoes, setObservacoes] = useState('')
  const [validade, setValidade] = useState('15')
  const [desconto, setDesconto] = useState(0)
  const [items, setItems] = useState<Item[]>([newItem()])
  const [saving, setSaving] = useState(false)
  const [loadingData, setLoadingData] = useState(isEditing)

  // Prevents the clienteId/veiculos effect from clearing vehicleId on initial edit load
  const skipFilterEffect = useRef(false)

  useEffect(() => {
    async function load() {
      const basePromises = [
        supabase.from('clientes').select('*').order('nome'),
        supabase.from('veiculos').select('*').order('marca'),
        supabase.from('servicos').select('*').eq('ativo', true).order('nome'),
      ] as const

      if (isEditing) {
        const [cRes, vRes, sRes, orcRes, itensRes] = await Promise.all([
          ...basePromises,
          supabase.from('orcamentos').select('*').eq('id', orcamentoId).single(),
          supabase.from('orcamento_itens').select('*').eq('orcamento_id', orcamentoId).order('created_at'),
        ])

        const vehiclesData = (vRes.data ?? []) as Veiculo[]
        setClientes((cRes.data ?? []) as Cliente[])
        setVeiculos(vehiclesData)
        setServicos((sRes.data ?? []) as Servico[])

        const orc = orcRes.data
        if (orc) {
          const filtered = orc.cliente_id
            ? vehiclesData.filter(v => v.cliente_id === orc.cliente_id)
            : vehiclesData

          // Skip the automatic clienteId effect for initial load
          skipFilterEffect.current = true
          setVeiculosFiltrados(filtered)
          setClienteId(orc.cliente_id ?? '')
          setVeiculoId(orc.veiculo_id ?? '')
          setStatus(orc.status)
          setObservacoes(orc.observacoes ?? '')
          setValidade(String(orc.validade_dias))
          setDesconto(Number(orc.desconto))
        }

        const its = itensRes.data ?? []
        if (its.length > 0) {
          setItems(its.map((it: any) => ({
            _id: crypto.randomUUID(),
            servico_id: it.servico_id ?? '',
            descricao: it.descricao,
            quantidade: it.quantidade,
            valor_unitario: it.valor_unitario,
          })))
        }
        setLoadingData(false)
      } else {
        const [cRes, vRes, sRes] = await Promise.all(basePromises)
        const vehiclesData = (vRes.data ?? []) as Veiculo[]
        setClientes((cRes.data ?? []) as Cliente[])
        setVeiculos(vehiclesData)
        setVeiculosFiltrados(vehiclesData)
        setServicos((sRes.data ?? []) as Servico[])
      }
    }
    load()
  }, [orcamentoId, isEditing])

  // Filter vehicles when client selection changes
  useEffect(() => {
    if (skipFilterEffect.current) {
      skipFilterEffect.current = false
      return
    }
    if (clienteId) {
      setVeiculosFiltrados(veiculos.filter(v => v.cliente_id === clienteId))
    } else {
      setVeiculosFiltrados(veiculos)
    }
    setVeiculoId('')
  }, [clienteId, veiculos])

  function handleServicoSelect(itemId: string, servicoId: string) {
    const srv = servicos.find(s => s.id === servicoId)
    setItems(prev => prev.map(it =>
      it._id === itemId
        ? { ...it, servico_id: servicoId, descricao: srv?.nome ?? '', valor_unitario: srv?.valor_padrao ?? 0 }
        : it
    ))
  }

  function updateItem(id: string, field: keyof Item, value: string | number) {
    setItems(prev => prev.map(it => it._id === id ? { ...it, [field]: value } : it))
  }

  function removeItem(id: string) {
    if (items.length > 1) setItems(prev => prev.filter(it => it._id !== id))
  }

  const subtotal = items.reduce((s, it) => s + it.quantidade * it.valor_unitario, 0)
  const total = Math.max(0, subtotal - desconto)

  async function handleSave() {
    const validItems = items.filter(it => it.descricao.trim())
    if (!validItems.length) { toast.error('Adicione ao menos um serviço'); return }

    setSaving(true)

    const orcPayload = {
      cliente_id: clienteId || null,
      veiculo_id: veiculoId || null,
      status,
      observacoes: observacoes || null,
      validade_dias: parseInt(validade),
      desconto,
      valor_total: total,
    }

    const itensPayload = (orcId: string) => validItems.map(it => ({
      orcamento_id: orcId,
      servico_id: it.servico_id && it.servico_id !== '_livre' ? it.servico_id : null,
      descricao: it.descricao.trim(),
      quantidade: it.quantidade,
      valor_unitario: it.valor_unitario,
    }))

    if (isEditing) {
      const { error: orcErr } = await supabase
        .from('orcamentos')
        .update(orcPayload)
        .eq('id', orcamentoId)

      if (orcErr) { setSaving(false); toast.error('Erro ao atualizar orçamento'); return }

      // Replace all items (delete + insert)
      await supabase.from('orcamento_itens').delete().eq('orcamento_id', orcamentoId)
      const { error: itensErr } = await supabase.from('orcamento_itens').insert(itensPayload(orcamentoId!))

      setSaving(false)
      if (itensErr) { toast.error('Erro ao salvar itens'); return }
      toast.success('Orçamento atualizado!')
      router.push(`/orcamentos/${orcamentoId}`)
    } else {
      const { data: orc, error: orcErr } = await supabase
        .from('orcamentos')
        .insert(orcPayload)
        .select('id')
        .single()

      if (orcErr || !orc) { setSaving(false); toast.error('Erro ao criar orçamento'); return }

      const { error: itensErr } = await supabase.from('orcamento_itens').insert(itensPayload(orc.id))
      setSaving(false)

      if (itensErr) { toast.error('Erro ao salvar itens do orçamento'); return }
      toast.success('Orçamento criado com sucesso!')
      router.push('/orcamentos')
    }
  }

  if (loadingData) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-neon-green" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wider text-foreground">
            {isEditing ? (
              <>Editar <span className="text-neon-green">Orçamento</span></>
            ) : (
              <>Novo <span className="text-neon-green">Orçamento</span></>
            )}
          </h1>
          <p className="mt-1 text-sm text-metallic-silver">
            {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Cliente */}
      <div className="neon-card">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-neon-green" />
          <h2 className="text-lg font-bold uppercase tracking-wide text-foreground">Cliente</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-metallic-silver">Selecionar Cliente</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger className="neon-input">
                <SelectValue placeholder="Escolha um cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clientes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {clienteId && clientes.find(c => c.id === clienteId) && (
            <div className="space-y-1 text-sm text-metallic-silver self-end pb-2">
              <p>{clientes.find(c => c.id === clienteId)?.telefone}</p>
              <p>{clientes.find(c => c.id === clienteId)?.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Veículo */}
      <div className="neon-card">
        <div className="flex items-center gap-2 mb-4">
          <Car className="h-5 w-5 text-neon-green" />
          <h2 className="text-lg font-bold uppercase tracking-wide text-foreground">Veículo</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-metallic-silver">Selecionar Veículo</Label>
            <Select value={veiculoId} onValueChange={setVeiculoId}>
              <SelectTrigger className="neon-input">
                <SelectValue placeholder={clienteId ? 'Escolha o veículo...' : 'Selecione um cliente primeiro'} />
              </SelectTrigger>
              <SelectContent>
                {veiculosFiltrados.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.marca} {v.modelo} {v.ano ?? ''} {v.placa ? `• ${v.placa}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {veiculoId && (() => {
            const v = veiculos.find(v => v.id === veiculoId)
            return v ? (
              <div className="space-y-1 text-sm text-metallic-silver self-end pb-2">
                <p>Cor: {v.cor ?? '—'}</p>
                <p>Placa: <span className="text-neon-green font-semibold">{v.placa ?? '—'}</span></p>
              </div>
            ) : null
          })()}
        </div>
      </div>

      {/* Serviços e Materiais */}
      <div className="neon-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-neon-green" />
            <h2 className="text-lg font-bold uppercase tracking-wide text-foreground">Serviços e Materiais</h2>
          </div>
          <Button className="neon-button-outline" size="sm" onClick={() => setItems(prev => [...prev, newItem()])}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar Item
          </Button>
        </div>

        <div className="hidden md:grid md:grid-cols-[2fr,2fr,1fr,1fr,auto] gap-3 mb-2 px-2">
          {['Serviço do Catálogo', 'Descrição', 'Qtd', 'Valor Unit.', ''].map(h => (
            <span key={h} className="text-xs font-semibold uppercase tracking-wider text-metallic-silver">{h}</span>
          ))}
        </div>

        <div className="space-y-3">
          {items.map(item => (
            <div key={item._id} className="grid gap-3 md:grid-cols-[2fr,2fr,1fr,1fr,auto] items-end rounded-sm border border-border bg-secondary/30 p-3">
              <div className="space-y-1">
                <Label className="text-xs text-metallic-silver md:hidden">Serviço</Label>
                <Select value={item.servico_id} onValueChange={v => handleServicoSelect(item._id, v)}>
                  <SelectTrigger className="neon-input text-sm">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_livre">Serviço livre</SelectItem>
                    {servicos.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-metallic-silver md:hidden">Descrição</Label>
                <Input
                  placeholder="Descrição do serviço..."
                  className="neon-input"
                  value={item.descricao}
                  onChange={e => updateItem(item._id, 'descricao', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-metallic-silver md:hidden">Qtd</Label>
                <Input
                  type="number" min="1" className="neon-input"
                  value={item.quantidade}
                  onChange={e => updateItem(item._id, 'quantidade', parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-metallic-silver md:hidden">Valor Unit.</Label>
                <Input
                  type="number" min="0" step="0.01" className="neon-input"
                  value={item.valor_unitario || ''}
                  onChange={e => updateItem(item._id, 'valor_unitario', parseFloat(e.target.value) || 0)}
                />
              </div>
              <Button
                variant="ghost" size="icon"
                onClick={() => removeItem(item._id)}
                className="text-destructive hover:bg-destructive/10"
                disabled={items.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs space-y-2 rounded-sm border border-neon-green/30 bg-neon-green/5 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-metallic-silver">Subtotal:</span>
              <span className="font-semibold">{fmt(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm gap-4">
              <span className="text-metallic-silver shrink-0">Desconto (R$):</span>
              <Input
                type="number" min="0" step="0.01"
                className="neon-input h-8 w-28 text-right text-sm"
                value={desconto || ''}
                onChange={e => setDesconto(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="border-t border-neon-green/30 pt-2 flex justify-between">
              <span className="text-lg font-bold uppercase">Total:</span>
              <span className="text-xl font-bold text-neon-green">{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Observações e Validade */}
      <div className="neon-card">
        <h2 className="mb-4 text-lg font-bold uppercase tracking-wide text-foreground">Observações e Validade</h2>
        <div className="grid gap-4 md:grid-cols-[2fr,1fr,1fr]">
          <div className="space-y-2">
            <Label className="text-metallic-silver">Observações</Label>
            <Textarea
              className="neon-input resize-none min-h-[80px]"
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Informações adicionais, condições, garantia..."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-metallic-silver">Validade</Label>
            <Select value={validade} onValueChange={setValidade}>
              <SelectTrigger className="neon-input"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="15">15 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-metallic-silver">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="neon-input"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" className="neon-button-outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button className="neon-button px-8" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isEditing ? 'Atualizar Orçamento' : 'Salvar Orçamento'}
        </Button>
      </div>
    </div>
  )
}
