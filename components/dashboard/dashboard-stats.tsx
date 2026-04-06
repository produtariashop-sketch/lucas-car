"use client"

import { useEffect, useState } from "react"
import { FileText, Clock, CheckCircle, DollarSign, TrendingUp, Users } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Orcamento } from "@/types/database"
import Link from "next/link"

interface Stats {
  total: number
  pendentes: number
  aprovados_mes: number
  receita: number
  taxa_conversao: number
  total_clientes: number
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    aprovado: 'bg-neon-green/20 text-neon-green',
    pendente: 'bg-metallic-silver/20 text-metallic-silver',
    rejeitado: 'bg-destructive/20 text-destructive',
    concluido: 'bg-blue-500/20 text-blue-500',
  }
  return (
    <span className={`inline-flex rounded-sm px-2 py-1 text-xs font-semibold uppercase ${map[status] ?? map.pendente}`}>
      {status}
    </span>
  )
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats>({
    total: 0, pendentes: 0, aprovados_mes: 0, receita: 0, taxa_conversao: 0, total_clientes: 0,
  })
  const [recent, setRecent] = useState<Orcamento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const [{ data: orcamentos }, { count: totalClientes }] = await Promise.all([
        supabase
          .from('orcamentos')
          .select('id, status, valor_total, created_at, clientes(id, nome), veiculos(id, marca, modelo, ano)')
          .order('created_at', { ascending: false }),
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
      ])

      const list = (orcamentos ?? []) as Orcamento[]
      const total = list.length
      const pendentes = list.filter(o => o.status === 'pendente').length
      const aprovados_mes = list.filter(
        o => o.status === 'aprovado' && o.created_at >= startOfMonth
      ).length
      const receita = list
        .filter(o => o.status === 'aprovado' || o.status === 'concluido')
        .reduce((s, o) => s + Number(o.valor_total), 0)
      const convertidos = list.filter(
        o => o.status === 'aprovado' || o.status === 'concluido'
      ).length
      const taxa_conversao = total > 0 ? Math.round((convertidos / total) * 100) : 0

      setStats({ total, pendentes, aprovados_mes, receita, taxa_conversao, total_clientes: totalClientes ?? 0 })
      setRecent(list.slice(0, 5))
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { title: 'Total de Orçamentos', value: loading ? '—' : String(stats.total), icon: FileText },
    { title: 'Pendentes', value: loading ? '—' : String(stats.pendentes), icon: Clock },
    { title: 'Aprovados este Mês', value: loading ? '—' : String(stats.aprovados_mes), icon: CheckCircle },
    { title: 'Receita (aprovados)', value: loading ? '—' : fmt(stats.receita), icon: DollarSign },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold uppercase tracking-wider text-foreground">
          Dash<span className="text-neon-green">board</span>
        </h1>
        <p className="mt-1 text-sm text-metallic-silver">Visão geral do seu negócio</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(c => (
          <div key={c.title} className="neon-card group hover:border-neon-green/50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-metallic-silver">{c.title}</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{c.value}</p>
              </div>
              <div className="rounded-sm border border-neon-green/30 bg-neon-green/10 p-2">
                <c.icon className="h-5 w-5 text-neon-green" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="neon-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold uppercase tracking-wide text-foreground">Orçamentos Recentes</h2>
          <Link href="/orcamentos" className="text-sm font-medium text-neon-green hover:underline">Ver todos</Link>
        </div>
        {loading ? (
          <p className="text-sm text-metallic-silver">Carregando...</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-metallic-silver">Nenhum orçamento cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Cliente', 'Veículo', 'Valor', 'Status'].map(h => (
                    <th key={h} className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-metallic-silver">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map(o => {
                  const cli = (o as any).clientes
                  const vei = (o as any).veiculos
                  return (
                    <tr key={o.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="py-3 text-sm text-foreground">{cli?.nome ?? '—'}</td>
                      <td className="py-3 text-sm text-metallic-silver">
                        {vei ? `${vei.marca} ${vei.modelo} ${vei.ano ?? ''}`.trim() : '—'}
                      </td>
                      <td className="py-3 text-sm font-semibold text-foreground">{fmt(Number(o.valor_total))}</td>
                      <td className="py-3"><StatusBadge status={o.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="neon-card">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-neon-green" />
            <h2 className="text-lg font-bold uppercase tracking-wide text-foreground">Total de Clientes</h2>
          </div>
          <span className="text-4xl font-bold text-foreground">{loading ? '—' : stats.total_clientes}</span>
        </div>
        <div className="neon-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-neon-green" />
            <h2 className="text-lg font-bold uppercase tracking-wide text-foreground">Taxa de Conversão</h2>
          </div>
          <span className="text-4xl font-bold text-foreground">{loading ? '—' : `${stats.taxa_conversao}%`}</span>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-neon-green to-neon-green-dark transition-all"
              style={{ width: `${stats.taxa_conversao}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
