import type { ReactNode } from "react"
import { Boxes, Menu, BarChart3, ShieldCheck, Users, KeyRound, History, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSession } from "@/lib/auth/session"
import { PERMISSIONS, hasPermission } from "@/lib/rbac/permissions"
import { LogoutButton } from "./logout-button"

export async function AppShell({ children }: { children: ReactNode }) { 
  const session = await getSession();
  const permissions = session?.permissions || [];

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[15rem_1fr]">
      <aside className="hidden border-r bg-surface p-5 md:flex md:flex-col">
        <div className="flex items-center gap-2 font-semibold">
          <Boxes className="size-5 text-primary" />
          Maluzen Warehouse
        </div>

        <nav className="mt-6 flex-1 space-y-1">
          <a
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <Boxes className="size-4" />
            Dashboard
          </a>
          <a
            href="/inventory"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <Boxes className="size-4" />
            Inventory
          </a>
          <a
            href="/warehouses"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <Boxes className="size-4" />
            Warehouses
          </a>
          <a
            href="/parts"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <Boxes className="size-4" />
            Parts
          </a>
          <a
            href="/categories"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <Boxes className="size-4" />
            Categories
          </a>
          <a
            href="/suppliers"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <Boxes className="size-4" />
            Suppliers
          </a>
          <div className="pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-3">
            Operations
          </div>
          <a
            href="/imports"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <Boxes className="size-4" />
            Imports (Inbound)
          </a>
          <a
            href="/exports"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <Boxes className="size-4" />
            Exports (Outbound)
          </a>
          <a
            href="/stock-checks"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <Boxes className="size-4" />
            Stock Checks
          </a>
          <a
            href="/quality-checks"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <ShieldCheck className="size-4 text-primary" />
            Quality Checks (QC)
          </a>
          <div className="pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-3">
            Analytics
          </div>
          <a
            href="/reports"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <BarChart3 className="size-4 text-primary" />
            Reports & Analytics
          </a>

          {(hasPermission(permissions, PERMISSIONS.USERS_VIEW) ||
            hasPermission(permissions, PERMISSIONS.ROLES_VIEW) ||
            hasPermission(permissions, PERMISSIONS.AUDIT_LOGS_VIEW)) && (
            <>
              <div className="pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-3">
                Administration
              </div>
              <a
                href="/admin"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <Settings className="size-4 text-primary" />
                Admin Overview
              </a>
              {hasPermission(permissions, PERMISSIONS.USERS_VIEW) && (
                <a
                  href="/users"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <Users className="size-4" />
                  Users
                </a>
              )}
              {hasPermission(permissions, PERMISSIONS.ROLES_VIEW) && (
                <a
                  href="/roles"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <KeyRound className="size-4" />
                  Roles & Permissions
                </a>
              )}
              {hasPermission(permissions, PERMISSIONS.AUDIT_LOGS_VIEW) && (
                <a
                  href="/audit-logs"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <History className="size-4" />
                  Audit Logs
                </a>
              )}
            </>
          )}
        </nav>
        
        {session && (
          <div className="mt-auto pt-4">
            <div className="rounded-lg bg-gray-50 p-3.5 border border-gray-100">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {session.fullName}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Vai trò: {session.role}
              </p>
            </div>
          </div>
        )}
      </aside>
      
      <div>
        <header className="flex h-14 items-center justify-between border-b bg-surface px-4 md:px-6">
          <Button className="md:hidden" variant="ghost" size="icon" aria-label="Open navigation">
            <Menu className="size-5" />
          </Button>
          <div className="flex-1 flex justify-between items-center ml-4 md:ml-0">
            <p className="text-sm font-medium">Dashboard</p>
            <div className="flex items-center gap-4">
              <span className="text-caption hidden md:inline-block">Phase 3</span>
              {session && <LogoutButton />}
            </div>
          </div>
        </header>
        <main className="p-5 md:p-8">
          {children}
        </main>
      </div>
    </div>
  ) 
}
