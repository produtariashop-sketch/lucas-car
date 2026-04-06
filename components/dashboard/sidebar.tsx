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

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    clearAuthToken()
    router.push("/login")
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-32 items-center justify-center border-b border-border bg-sidebar p-4">
          <div className="relative h-full w-full">
            <Image
              src="/images/lucascar-logo.png"
              alt="LUCASCAR Logo"
              fill
              className="object-contain"
              sizes="(max-width: 256px) 100vw, 256px"
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
          <p className="text-center text-xs text-metallic-silver">
            Lanternagem e Pintura
          </p>
          <p className="text-center text-xs font-semibold text-neon-green">
            27 99884-2656
          </p>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-sm border border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-metallic-silver transition-colors hover:border-destructive/50 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>
    </aside>
  )
}
