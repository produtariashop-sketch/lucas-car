"use client"

import { useEffect, useRef, useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Building, Shield, Loader2, Eye, EyeOff, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { hashPin } from "@/lib/auth"
import type { Config } from "@/types/database"
import { toast } from "sonner"

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Empresa fields
  const [nome_empresa, setNomeEmpresa] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [endereco, setEndereco] = useState('')
  const [logo_url, setLogoUrl] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // PIN change fields
  const [pinAtual, setPinAtual] = useState('')
  const [pinNovo, setPinNovo] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [savingPin, setSavingPin] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('config').select('*').single()
      if (data) {
        setConfig(data as Config)
        setNomeEmpresa(data.nome_empresa ?? '')
        setTelefone(data.telefone ?? '')
        setEmail(data.email ?? '')
        setCnpj(data.cnpj ?? '')
        setEndereco(data.endereco ?? '')
        setLogoUrl(data.logo_url ?? '')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !config) return

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem (PNG, JPG, SVG...)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB')
      return
    }

    setUploadingLogo(true)
    const ext = file.name.split('.').pop() ?? 'png'
    const path = `logo-${config.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      setUploadingLogo(false)
      toast.error(`Erro no upload: ${uploadError.message}. Verifique se o bucket "logos" existe no Supabase Storage.`)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
    setLogoUrl(publicUrl)
    setUploadingLogo(false)
    toast.success('Logo enviado! Clique em "Salvar Dados" para confirmar.')

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function saveEmpresa() {
    if (!config) return
    setSaving(true)
    const { error } = await supabase.from('config').update({
      nome_empresa: nome_empresa.trim() || 'LUCASCAR',
      telefone: telefone || null,
      email: email || null,
      cnpj: cnpj || null,
      endereco: endereco || null,
      logo_url: logo_url || null,
    }).eq('id', config.id)
    setSaving(false)
    if (error) { toast.error('Erro ao salvar configurações'); return }
    toast.success('Configurações salvas')
  }

  async function savePin() {
    if (!config) return
    if (!pinAtual || !pinNovo || !pinConfirm) { toast.error('Preencha todos os campos'); return }
    if (pinNovo !== pinConfirm) { toast.error('Os PINs não coincidem'); return }
    if (!/^\d{4}$/.test(pinNovo)) { toast.error('O novo PIN deve ter exatamente 4 dígitos'); return }

    setSavingPin(true)
    const hashAtual = await hashPin(pinAtual)
    if (hashAtual !== config.pin_hash) {
      setSavingPin(false)
      toast.error('PIN atual incorreto')
      return
    }

    const hashNovo = await hashPin(pinNovo)
    const { error } = await supabase.from('config').update({ pin_hash: hashNovo }).eq('id', config.id)
    setSavingPin(false)
    if (error) { toast.error('Erro ao atualizar PIN'); return }

    setConfig(c => c ? { ...c, pin_hash: hashNovo } : c)
    setPinAtual('')
    setPinNovo('')
    setPinConfirm('')
    toast.success('PIN alterado com sucesso')
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-neon-green" /></div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-foreground">
            Configura<span className="text-neon-green">ções</span>
          </h1>
          <p className="mt-1 text-sm text-metallic-silver">Personalize o sistema</p>
        </div>

        {/* Dados da Empresa */}
        <div className="neon-card">
          <div className="flex items-center gap-2 mb-6">
            <Building className="h-5 w-5 text-neon-green" />
            <h2 className="text-lg font-bold uppercase tracking-wide text-foreground">Dados da Empresa</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-metallic-silver">Nome da Empresa</Label>
              <Input className="neon-input" value={nome_empresa} onChange={e => setNomeEmpresa(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-metallic-silver">CNPJ</Label>
              <Input className="neon-input" placeholder="00.000.000/0000-00" value={cnpj} onChange={e => setCnpj(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-metallic-silver">Telefone</Label>
              <Input className="neon-input" value={telefone} onChange={e => setTelefone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-metallic-silver">E-mail</Label>
              <Input className="neon-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            {/* Logo upload */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-metallic-silver">Logo da Empresa</Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                {logo_url && (
                  <div className="relative flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logo_url}
                      alt="Logo"
                      className="h-16 w-16 rounded-sm border border-neon-green/30 bg-black object-contain p-1"
                    />
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      className="neon-input flex-1"
                      placeholder="URL da imagem ou faça upload →"
                      value={logo_url}
                      onChange={e => setLogoUrl(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="neon-button-outline shrink-0"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Upload className="h-4 w-4" />
                      }
                      <span className="ml-2 hidden sm:inline">Upload</span>
                    </Button>
                  </div>
                  <p className="text-xs text-metallic-silver">
                    PNG, JPG ou SVG · máx. 2MB · requer bucket <code className="text-neon-green">logos</code> no Supabase Storage
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-metallic-silver">Endereço</Label>
              <Textarea className="neon-input resize-none" value={endereco} onChange={e => setEndereco(e.target.value)} />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button className="neon-button w-full sm:w-auto" onClick={saveEmpresa} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Dados
            </Button>
          </div>
        </div>

        {/* Alterar PIN */}
        <div className="neon-card">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-5 w-5 text-neon-green" />
            <h2 className="text-lg font-bold uppercase tracking-wide text-foreground">Alterar PIN de Acesso</h2>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 max-w-lg">
            <div className="space-y-2">
              <Label className="text-metallic-silver">PIN Atual</Label>
              <div className="relative">
                <Input
                  className="neon-input pr-10"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={4}
                  value={pinAtual}
                  onChange={e => setPinAtual(e.target.value.replace(/\D/g, ''))}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-metallic-silver"
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-metallic-silver">Novo PIN</Label>
              <Input
                className="neon-input"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                value={pinNovo}
                onChange={e => setPinNovo(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-metallic-silver">Confirmar PIN</Label>
              <Input
                className="neon-input"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                value={pinConfirm}
                onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button className="neon-button w-full sm:w-auto" onClick={savePin} disabled={savingPin}>
              {savingPin && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Alterar PIN
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
