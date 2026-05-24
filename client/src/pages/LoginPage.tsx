import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Brain, ArrowRight, QrCode, Mail, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function LoginPage() {
  const { isAuthenticated, loading, refresh } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const localAuthEnabled = import.meta.env.VITE_LOCAL_AUTH_ENABLED === "true";
  const googleAuthEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === "true";

  const [view, setView] = useState<"login" | "register" | "verifyEmail" | "setup2fa" | "challenge2fa">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [twoFactorType, setTwoFactorType] = useState<"totp" | "email">("totp");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [setupSecret, setSetupSecret] = useState("");

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Account created! Please verify your email.");
      setView("verifyEmail");
    },
    onError: (e) => toast.error(e.message),
  });

  const verifyEmailMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: () => {
      toast.success("Email verified! You can now log in.");
      setView("login");
      setPassword(""); // Clear password for security
    },
    onError: (e) => toast.error(e.message),
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.requires2FASetup) {
        setTempToken(data.tempToken);
        setView("setup2fa");
        toast.info("Mandatory 2FA setup required.");
      } else if (data.requires2FA) {
        setTempToken(data.tempToken);
        setTwoFactorType(data.twoFactorType as any);
        setView("challenge2fa");
        toast.info(`Please enter your ${data.twoFactorType === "totp" ? "Authenticator" : "Email"} code.`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const setup2faMutation = trpc.auth.setup2fa.useMutation({
    onSuccess: (data) => {
      if (data.qrCodeUrl) {
        setQrCodeUrl(data.qrCodeUrl);
        setSetupSecret(data.secret!);
      } else {
        toast.success("Email OTP selected. Please log in again to verify.");
        setView("login");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const challenge2faMutation = trpc.auth.challenge2fa.useMutation({
    onSuccess: async () => {
      toast.success("Authentication successful");
      await refresh();
      navigate("/");
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (!loading && isAuthenticated) navigate("/");
  }, [isAuthenticated, loading]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    registerMutation.mutate({ email, password, name });
  };

  const handleVerifyEmail = (e: React.FormEvent) => {
    e.preventDefault();
    verifyEmailMutation.mutate({ email, code: verificationCode });
  };

  const handleSetup2fa = (type: "totp" | "email") => {
    setTwoFactorType(type);
    setup2faMutation.mutate({ type, tempToken });
  };

  const handleChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    challenge2faMutation.mutate({ tempToken, code: verificationCode });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: `linear-gradient(rgba(0,200,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,0.8) 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 space-y-4">
          <div className="flex justify-center mb-6 mt-4">
            <img src="/logo.png" alt="NG-SENTRA Logo" className="w-auto h-80 object-contain drop-shadow-[0_0_20px_rgba(0,200,255,0.25)] hover:scale-105 transition-transform duration-500" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-2xl shadow-black/40 space-y-6">
          
          {view === "login" && (
            <div className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold">Secure Login</h2>
                  <p className="text-sm text-muted-foreground mt-1">Authorized personnel only.</p>
                </div>
                <Input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required className="bg-background/50" />
                <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="bg-background/50" />
                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Authenticating..." : "Login"}
                </Button>
                <div className="text-center mt-4">
                  <Button type="button" variant="link" size="sm" onClick={() => setView("register")} className="text-xs text-muted-foreground">
                    Need an account? Register
                  </Button>
                </div>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                  OR
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

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
                  type="button"
                  variant="outline"
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
                  type="button"
                  variant="outline"
                  className="w-full h-11 font-semibold text-sm gap-2"
                  onClick={() => (window.location.href = getLoginUrl())}
                >
                  <Shield className="w-4 h-4" />
                  Sign In to NG-SENTRA
                </Button>
              )}
            </div>
          )}

          {view === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold">Create Account</h2>
                <p className="text-sm text-muted-foreground mt-1">Request SOC access.</p>
              </div>
              <Input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required className="bg-background/50" />
              <Input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required className="bg-background/50" />
              <Input type="password" placeholder="Password (min 8 chars)" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="bg-background/50" />
              <Input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} className="bg-background/50" />
              <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? "Registering..." : "Create Account"}
              </Button>
              <div className="text-center mt-4">
                <Button variant="link" size="sm" onClick={() => setView("login")} className="text-xs text-muted-foreground">
                  Already have an account? Login
                </Button>
              </div>
            </form>
          )}

          {view === "verifyEmail" && (
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div className="text-center mb-6">
                <Mail className="w-8 h-8 text-primary mx-auto mb-2" />
                <h2 className="text-xl font-semibold">Verify Email</h2>
                <p className="text-sm text-muted-foreground mt-1">Enter the 6-digit code sent to {email}.<br/><span className="text-[10px]">(Check your server terminal for Ethereal email preview links)</span></p>
              </div>
              <Input type="text" placeholder="6-digit code" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} required className="bg-background/50 text-center tracking-widest font-mono text-lg" maxLength={6} />
              <Button type="submit" className="w-full" disabled={verifyEmailMutation.isPending}>
                Verify Code
              </Button>
            </form>
          )}

          {view === "setup2fa" && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Shield className="w-8 h-8 text-cyan-500 mx-auto mb-2" />
                <h2 className="text-xl font-semibold">Mandatory 2FA Setup</h2>
                <p className="text-sm text-muted-foreground mt-1">You must configure two-factor authentication to access the SOC.</p>
              </div>
              
              {!qrCodeUrl ? (
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start h-14" onClick={() => handleSetup2fa("totp")} disabled={setup2faMutation.isPending}>
                    <QrCode className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="font-semibold">Authenticator App</div>
                      <div className="text-xs text-muted-foreground">Google Auth, Authy, etc.</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-14" onClick={() => handleSetup2fa("email")} disabled={setup2faMutation.isPending}>
                    <Mail className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="font-semibold">Email OTP</div>
                      <div className="text-xs text-muted-foreground">Codes sent to {email}</div>
                    </div>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleChallenge} className="space-y-4">
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                  </div>
                  <p className="text-xs text-center text-muted-foreground font-mono bg-muted/50 p-2 rounded">
                    Secret: {setupSecret}
                  </p>
                  <Input type="text" placeholder="Enter Authenticator Code" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} required className="bg-background/50 text-center tracking-widest font-mono text-lg" maxLength={6} />
                  <Button type="submit" className="w-full" disabled={challenge2faMutation.isPending}>
                    Verify & Complete Setup
                  </Button>
                </form>
              )}
            </div>
          )}

          {view === "challenge2fa" && (
            <form onSubmit={handleChallenge} className="space-y-4">
              <div className="text-center mb-6">
                <Lock className="w-8 h-8 text-primary mx-auto mb-2" />
                <h2 className="text-xl font-semibold">Two-Factor Authentication</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {twoFactorType === "totp" ? "Enter the code from your authenticator app." : `Enter the code sent to your email. (Check terminal for Ethereal links)`}
                </p>
              </div>
              <Input type="text" placeholder="6-digit code" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} required className="bg-background/50 text-center tracking-widest font-mono text-lg" maxLength={6} />
              <Button type="submit" className="w-full" disabled={challenge2faMutation.isPending}>
                Authenticate
              </Button>
            </form>
          )}

        </div>

        <p className="text-center text-[10px] text-muted-foreground/40 font-mono mt-6 tracking-wider">
          NG-SENTRA © 2026 — AUTHORIZED ACCESS ONLY
        </p>
      </div>
    </div>
  );
}
