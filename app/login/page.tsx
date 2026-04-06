"use client"

import { useState, useRef, useEffect, KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { hashPin, setAuthToken } from "@/lib/auth"
import Image from "next/image"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const [digits, setDigits] = useState(["", "", "", ""])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]
  const router = useRouter()

  useEffect(() => {
    refs[0].current?.focus()
  }, [])

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const next = [...digits]
    next[index] = value
    setDigits(next)
    setError("")
    if (value && index < 3) {
      refs[index + 1].current?.focus()
    }
    if (value && index === 3) {
      handleSubmit(next)
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs[index - 1].current?.focus()
    }
  }

  const handleSubmit = async (currentDigits = digits) => {
    const pin = currentDigits.join("")
    if (pin.length < 4) return

    setLoading(true)
    setError("")

    try {
      const hashed = await hashPin(pin)
      const { data, error: dbError } = await supabase
        .from("config")
        .select("value")
        .eq("key", "pin_hash")
        .single()

      if (dbError || !data) {
        setError("Erro ao verificar PIN. Tente novamente.")
        setDigits(["", "", "", ""])
        refs[0].current?.focus()
        return
      }

      if (data.value === hashed) {
        setAuthToken()
        router.push("/")
      } else {
        setError("PIN incorreto. Tente novamente.")
        setDigits(["", "", "", ""])
        refs[0].current?.focus()
      }
    } catch {
      setError("Erro inesperado. Tente novamente.")
      setDigits(["", "", "", ""])
      refs[0].current?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <Image
            src="/images/lucascar-logo.png"
            alt="LUCASCAR"
            width={120}
            height={120}
            className="rounded-sm"
            priority
          />
          <div className="text-center">
            <h1 className="text-3xl font-bold uppercase tracking-widest text-foreground">
              LUCAS<span className="text-neon-green">CAR</span>
            </h1>
            <p className="mt-1 text-sm text-metallic-silver">
              Sistema de Orçamentos
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="neon-card">
          <h2 className="mb-6 text-center text-lg font-bold uppercase tracking-wider text-foreground">
            Digite seu <span className="text-neon-green">PIN</span>
          </h2>

          {/* PIN inputs */}
          <div className="flex justify-center gap-4">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={refs[i]}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
                className={`
                  neon-input h-16 w-14 rounded-sm text-center text-2xl font-bold
                  caret-transparent tracking-widest
                  disabled:opacity-50
                  ${error ? "border-destructive focus:border-destructive" : ""}
                `}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <p className="mt-4 text-center text-sm font-semibold text-destructive">
              {error}
            </p>
          )}

          {/* Loading */}
          {loading && (
            <div className="mt-4 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-neon-green" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
