import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity, AlertTriangle, Brain, ChevronRight, Globe, HardDrive,
  LayoutDashboard, LogOut, Menu, Moon, Settings, Shield, Sun, Users, Zap, X
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "../contexts/ThemeContext";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/components", label: "Components", icon: Shield },
  { href: "/soar", label: "SOAR Panel", icon: Zap },
  { href: "/ai-models", label: "AI Models Health", icon: Activity },
  { href: "/ai-feed", label: "AI Threat Feed", icon: Brain },
];

const adminNavItems = [
  { href: "/admin/components", label: "Component Config", icon: Settings },
  { href: "/admin/users", label: "User Management", icon: Users },
  { href: "/admin/audit", label: "Audit Trail", icon: Activity },
  { href: "/admin/settings", label: "System Settings", icon: Globe },
];

const roleBadgeVariant: Record<string, string> = {
  Admin: "bg-red-500/20 text-red-400 border-red-500/30",
  admin: "bg-red-500/20 text-red-400 border-red-500/30",
  Analyst: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  Viewer: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  user: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
  const [location] = useLocation();
  const isActive = location === href || (href !== "/" && location.startsWith(href));
  return (
    <Link href={href}>
      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all cursor-pointer group ${
        isActive
          ? "bg-primary/15 text-primary border border-primary/30"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}>
        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
        <span>{label}</span>
        {isActive && <ChevronRight className="w-3 h-3 ml-auto text-primary" />}
      </div>
    </Link>
  );
}

export default function SOCLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm font-mono">INITIALIZING NG-SENTRA...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate("/login");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm font-mono">REDIRECTING TO LOGIN...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === "Admin" || user?.role === "admin";
  const roleLabel = user?.role === "admin" ? "Admin" : user?.role ?? "Viewer";

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex flex-col h-full ${mobile ? "" : ""}`}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-4 border-b border-border">
        <img
          src="/manus-storage/ng-sentra-logo-hq_d96a9866.png"
          alt="NG-SENTRA Logo"
          className="w-10 h-10 object-contain flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-foreground tracking-widest leading-tight">NG-SENTRA</h1>
          <p className="text-[10px] text-muted-foreground font-mono tracking-wider">SOC DASHBOARD</p>
        </div>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest px-3 py-2">Navigation</p>
        {navItems.map(item => <NavLink key={item.href} {...item} />)}

        {isAdmin && (
          <>
            <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest px-3 py-2 mt-4">Administration</p>
            {adminNavItems.map(item => <NavLink key={item.href} {...item} />)}
          </>
        )}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/30">
          <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">{(user?.name ?? "U")[0].toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{user?.name ?? user?.email ?? "User"}</p>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${roleBadgeVariant[roleLabel] ?? roleBadgeVariant.Viewer}`}>
              {roleLabel}
            </span>
          </div>
          <button onClick={() => logout()} title="Logout" className="text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-sidebar border-r border-sidebar-border fixed h-full z-30">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-56 bg-sidebar border-r border-sidebar-border z-50">
            <Sidebar mobile />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-56 min-h-screen">
        {/* Top Header */}
        <header className="h-12 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4 gap-3 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>SYSTEM ONLINE</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <span className="text-xs text-muted-foreground font-mono hidden sm:block">{new Date().toLocaleDateString()}</span>
          <div className="w-px h-4 bg-border" />
          {/* Light / Dark mode toggle */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
