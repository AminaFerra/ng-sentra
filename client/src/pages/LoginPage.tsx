import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const localAuthEnabled = import.meta.env.VITE_LOCAL_AUTH_ENABLED === "true";
  const googleAuthEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === "true";

  useEffect(() => {
    if (!loading && isAuthenticated) navigate("/");
  }, [isAuthenticated, loading]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(0,200,255,0.8) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0,200,255,0.8) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo + Animated Brand */}
        <div className="text-center mb-8 space-y-4">
          {/* Logo image */}
          <div className="flex justify-center">
            <img
              src="/manus-storage/ng-sentra-logo-hq_d96a9866.png"
              alt="NG-SENTRA Logo"
              className="w-32 h-32 object-contain drop-shadow-[0_0_20px_rgba(0,200,255,0.3)]"
            />
          </div>

          {/* Animated brand name — brain bounces on the N */}
          <div className="flex items-end justify-center gap-0 select-none">
            {/* The "N" with animated brain sitting on top */}
            <div className="relative inline-flex flex-col items-center">
              {/* Brain emoji — jumps and wiggles on the N */}
              <span
                className="text-xl leading-none mb-[-2px]"
                style={{ animation: "brainBounce 1.6s ease-in-out infinite" }}
              >
                🧠
              </span>
              {/* The N */}
              <span className="text-4xl font-black tracking-tight text-foreground leading-none">N</span>
            </div>

            {/* Rest of NG-SENTRA */}
            <span className="text-4xl font-black tracking-tight text-foreground leading-none">G</span>
            <span className="text-4xl font-black tracking-tight text-foreground leading-none mx-2"> </span>
            <span className="text-4xl font-black tracking-tight"
              style={{ color: "hsl(var(--primary))" }}>S</span>
            <span className="text-4xl font-black tracking-tight text-foreground leading-none">E</span>
            <span className="text-4xl font-black tracking-tight text-foreground leading-none">N</span>
            <span className="text-4xl font-black tracking-tight text-foreground leading-none">T</span>
            <span className="text-4xl font-black tracking-tight text-foreground leading-none">R</span>
            <span className="text-4xl font-black tracking-tight"
              style={{ color: "hsl(var(--primary))" }}>A</span>
          </div>

          <p className="text-xs text-muted-foreground font-mono tracking-[0.3em] uppercase">
            Smart Security Hub
          </p>
        </div>

        {/* Login card */}
        <div className="bg-card border border-border rounded-xl p-8 shadow-2xl shadow-black/40 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Secure Access</h2>
            <p className="text-sm text-muted-foreground">
              Authenticate with your authorized credentials to access the SOC dashboard.
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
              {localAuthEnabled ? "Local Authentication" : "Secure Sign In"}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-3">
            {/* Google OAuth Button */}
            {googleAuthEnabled && (
              <a
                href="/api/auth/google"
                className="w-full h-11 flex items-center justify-center gap-3 rounded-md border border-border bg-white/5 hover:bg-white/10 transition-colors text-sm font-semibold text-foreground"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </a>
            )}

            {/* Local Auth Button */}
            {localAuthEnabled && (
              <Button
                className="w-full h-11 font-semibold text-sm gap-2"
                onClick={() => (window.location.href = getLoginUrl())}
              >
                <Shield className="w-4 h-4" />
                Sign In Locally (Dev Mode)
              </Button>
            )}

            {/* Manus OAuth fallback if neither local nor google */}
            {!localAuthEnabled && !googleAuthEnabled && (
              <Button
                className="w-full h-11 font-semibold text-sm gap-2"
                onClick={() => (window.location.href = getLoginUrl())}
              >
                <Shield className="w-4 h-4" />
                Sign In to NG-SENTRA
              </Button>
            )}
          </div>

          {/* Role info */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
            {[
              { role: "Admin", color: "text-red-400 border-red-500/30 bg-red-500/10", desc: "Full access" },
              { role: "Analyst", color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10", desc: "Ops access" },
              { role: "Viewer", color: "text-slate-400 border-slate-500/30 bg-slate-500/10", desc: "Read only" },
            ].map(r => (
              <div key={r.role} className={`text-center p-2 rounded-md border ${r.color}`}>
                <p className="text-[10px] font-bold font-mono">{r.role}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/40 font-mono mt-6 tracking-wider">
          NG-SENTRA © 2025 — AUTHORIZED ACCESS ONLY
        </p>
      </div>

      {/* Keyframe animation injected via style tag */}
      <style>{`
        @keyframes brainBounce {
          0%   { transform: translateY(0px) rotate(0deg); }
          15%  { transform: translateY(-10px) rotate(-8deg); }
          30%  { transform: translateY(-14px) rotate(6deg); }
          45%  { transform: translateY(-8px) rotate(-4deg); }
          55%  { transform: translateY(-12px) rotate(5deg); }
          65%  { transform: translateY(-4px) rotate(-3deg); }
          75%  { transform: translateY(-8px) rotate(4deg); }
          85%  { transform: translateY(-2px) rotate(-2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
