"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  FilePlus,
  Users,
  Car,
  Settings,
  FileText,
  Wrench,
  LogOut
} from "lucide-react"
import { cn } from "@/lib/utils"
import { clearAuthToken } from "@/lib/auth"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orcamento", label: "Novo Orçamento", icon: FilePlus },
  { href: "/orcamentos", label: "Orçamentos", icon: FileText },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/veiculos", label: "Veículos", icon: Car },
  { href: "/servicos", label: "Serviços", icon: Wrench },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
]

// Subset shown in mobile bottom nav (most important 5)
const mobileNavItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/orcamentos", label: "Orçamentos", icon: FileText },
  { href: "/orcamento", label: "Novo", icon: FilePlus, primary: true },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/configuracoes", label: "Config", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    clearAuthToken()
    router.push("/login")
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar flex-col">
        {/* Logo */}
        <div className="flex h-32 items-center justify-center border-b border-border bg-sidebar p-4">
          <div className="relative h-full w-full">
            <Image
              src="/images/lucascar-logo.png"
              alt="LUCASCAR Logo"
              fill
              className="object-contain"
              sizes="256px"
              priority
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-all duration-200",
                  isActive
                    ? "border-l-2 border-neon-green bg-neon-green/10 text-neon-green"
                    : "border-l-2 border-transparent text-metallic-silver hover:border-neon-green/50 hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5",
                  isActive ? "text-neon-green" : "text-metallic-silver"
                )} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4 space-y-3">
          <p className="text-center text-xs text-metallic-silver">Lanternagem e Pintura</p>
          <p className="text-center text-xs font-semibold text-neon-green">27 99884-2656</p>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-sm border border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-metallic-silver transition-colors hover:border-destructive/50 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-sidebar">
        <div className="flex items-stretch">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-colors",
                  item.primary
                    ? isActive
                      ? "bg-neon-green/20 text-neon-green"
                      : "text-neon-green"
                    : isActive
                      ? "bg-neon-green/10 text-neon-green"
                      : "text-metallic-silver"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5",
                  item.primary && "drop-shadow-[0_0_6px_#00ff00]"
                )} />
                <span className={cn(
                  "text-[10px] font-semibold uppercase tracking-wide leading-none",
                  item.primary && "text-neon-green"
                )}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
