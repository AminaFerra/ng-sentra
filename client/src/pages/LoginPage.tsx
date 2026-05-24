import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Brain, ArrowRight, QrCode, Mail, Lock, ShieldAlert, BrainCircuit, Radar, Network, Activity, Server, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl, getOAuthLoginUrl } from "@/const";
import { motion, AnimatePresence, Variants } from "framer-motion";
import WorldMap from "@/components/WorldMap";

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

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
    exit: { opacity: 0, x: -10, transition: { duration: 0.2 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
  };

  return (
    <div className="h-screen bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">

      {/* Subtle Cyber Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: `linear-gradient(rgba(0,200,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,1) 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />

      {/* Corner Brackets */}
      <div className="absolute top-8 left-8 w-8 h-8 border-t border-l border-cyan-500/30 opacity-50 pointer-events-none" />
      <div className="absolute top-8 right-8 w-8 h-8 border-t border-r border-cyan-500/30 opacity-50 pointer-events-none" />
      <div className="absolute bottom-8 left-8 w-8 h-8 border-b border-l border-cyan-500/30 opacity-50 pointer-events-none" />
      <div className="absolute bottom-8 right-8 w-8 h-8 border-b border-r border-cyan-500/30 opacity-50 pointer-events-none" />

      {/* Faint Binary Data */}
      <div className="absolute top-16 left-32 text-[10px] font-mono text-cyan-500/20 pointer-events-none leading-relaxed tracking-widest hidden lg:block">
        01001110 01000111 01010011 <br />
        01000101 01001110 01010100<br /> 01010010 01000001
      </div>
      <div className="absolute bottom-32 right-32 text-[10px] font-mono text-cyan-500/20 pointer-events-none leading-relaxed tracking-widest text-right hidden lg:block">
        110 101 011 010110<br />
        101 01011 01 110 101
      </div>

      {/* Background Tech Elements (Static/Faint) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 hidden md:block">
        {/* Prominent Dotted World Map */}
        <div className="absolute top-[5%] right-[-5%] w-[1000px] h-[800px] pointer-events-none opacity-80">
          <WorldMap />
        </div>

        {/* Center-left Lock & Circuits */}
        <div className="absolute top-[35%] left-[25%] opacity-20 text-cyan-500 flex items-center justify-center">
          <div className="absolute w-32 h-32 rounded-full border border-cyan-500/30" />
          <div className="absolute w-48 h-48 rounded-full border border-cyan-500/20 border-dashed" />
          <Lock className="w-8 h-8" />
          <div className="absolute w-32 h-[1px] bg-cyan-500/40 right-full top-1/2" />
        </div>

        {/* Bottom-left Shield */}
        <div className="absolute bottom-[20%] left-[20%] opacity-20 text-cyan-500 flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full border border-cyan-500/30" />
          <Shield className="w-10 h-10" />
          <div className="absolute w-[1px] h-24 bg-cyan-500/40 bottom-full left-1/2" />
        </div>

        {/* Center-left Fingerprint */}
        <div className="absolute top-[50%] left-[15%] opacity-20 text-cyan-500 flex items-center justify-center">
          <div className="absolute w-16 h-16 border border-cyan-500/30 rounded-sm" />
          <div className="absolute w-20 h-20 border border-cyan-500/20 rounded-sm rotate-45" />
          <Activity className="w-8 h-8" />
        </div>
      </div>

      {/* Ambient Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating Glowing Icons (Animated) */}
      <div className="absolute inset-0 perspective-[1000px] pointer-events-none flex items-center justify-center overflow-hidden z-10">
        {/* Top-Left Brain */}
        <motion.div
          animate={{ y: [-15, 15, -15] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[25%] left-[15%] p-4 rounded-xl bg-[#020617]/50 border border-cyan-500/30 backdrop-blur-sm shadow-[0_0_30px_rgba(0,255,255,0.2)]"
        >
          <BrainCircuit className="w-8 h-8 text-cyan-400" />
        </motion.div>

        {/* Top-Right Radar */}
        <motion.div
          animate={{ y: [15, -15, 15] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[20%] right-[20%] w-20 h-20 rounded-full bg-[#020617]/50 border border-cyan-500/40 border-dashed backdrop-blur-sm shadow-[0_0_30px_rgba(0,255,255,0.2)] flex items-center justify-center"
        >
          <Radar className="w-8 h-8 text-cyan-400" />
        </motion.div>

        {/* Bottom-Right Shield */}
        <motion.div
          animate={{ y: [-12, 12, -12] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[30%] right-[25%] w-20 h-20 rounded-full bg-[#020617]/50 border border-cyan-500/40 backdrop-blur-sm shadow-[0_0_30px_rgba(0,255,255,0.2)] flex items-center justify-center"
        >
          <ShieldAlert className="w-8 h-8 text-cyan-400" />
        </motion.div>
      </div>

      {/* Bottom Footer Text */}
      <div className="absolute bottom-4 left-0 w-full flex justify-center text-[9px] sm:text-[10px] font-mono text-muted-foreground/30 z-10 pointer-events-none tracking-widest uppercase">
        NG-SENTRA © 2026 - AUTHORIZED ACCESS ONLY
      </div>

      {/* Top Content (Logo) */}
      <div className="relative z-20 flex flex-col items-center text-center max-w-2xl -mb-6 -mt-16 shrink-0">
        <motion.div
          animate={{
            y: [-10, 10, -10],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <img
            src="/logo.png"
            alt="NG-SENTRA Logo"
            className="w-72 sm:w-[400px] drop-shadow-[0_0_40px_rgba(0,255,255,0.5)]"
          />
        </motion.div>
      </div>

      {/* Login Card */}
      <div className="relative z-20 w-full max-w-[400px] bg-[#020617]/80 backdrop-blur-md border border-white/5 rounded-2xl p-8 shadow-2xl">
        <AnimatePresence mode="wait">
          {view === "login" && (
            <motion.div key="login" variants={containerVariants} initial="hidden" animate="show" exit="exit" className="space-y-6">
              <motion.div variants={itemVariants} className="mb-6 text-center">
                <h2 className="text-[22px] font-semibold text-white tracking-wide">Secure Login</h2>
                <p className="text-xs text-slate-400 mt-1">Authorized personnel only.</p>
              </motion.div>

              <form onSubmit={handleLogin} className="space-y-4">
                <motion.div variants={itemVariants}>
                  <Input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required className="h-11 bg-[#0f172a] border-white/5 text-white placeholder:text-slate-500 transition-all focus:border-cyan-500/50" />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="h-11 bg-[#0f172a] border-white/5 text-white placeholder:text-slate-500 transition-all focus:border-cyan-500/50" />
                </motion.div>

                <motion.div variants={itemVariants} className="pt-2">
                  <Button type="submit" className="w-full h-11 bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-medium tracking-wide flex items-center justify-center gap-2" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? "Authenticating..." : <>Login <ArrowRight className="w-4 h-4" /></>}
                  </Button>
                </motion.div>

                <motion.div variants={itemVariants} className="text-center pt-1">
                  <Button type="button" variant="link" size="sm" onClick={() => setView("register")} className="text-xs text-slate-500 hover:text-cyan-400 transition-colors">
                    Need an account? Register
                  </Button>
                </motion.div>
              </form>

              {googleAuthEnabled && (
                <motion.div variants={itemVariants}>
                  <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                    <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-[#020617] px-3 text-slate-500">OR</span></div>
                  </div>
                  <Button type="button" variant="outline" className="w-full h-11 bg-transparent border-white/10 hover:bg-white/5 transition-colors font-normal text-sm text-slate-300" onClick={() => window.location.href = getOAuthLoginUrl()}>
                    <svg className="w-4 h-4 mr-3" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                    Continue with Google
                  </Button>
                </motion.div>
              )}

              {localAuthEnabled && (
                <motion.div variants={itemVariants} className="pt-1">
                  <Button type="button" variant="ghost" className="w-full h-11 font-normal text-xs text-slate-400 hover:text-white hover:bg-white/5 gap-2" onClick={() => (window.location.href = getLoginUrl())}>
                    <Shield className="w-3.5 h-3.5" /> Sign In Locally (Dev Mode)
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {view === "register" && (
            <motion.div key="register" variants={containerVariants} initial="hidden" animate="show" exit="exit" className="space-y-6">
              <motion.div variants={itemVariants} className="mb-6 text-center">
                <h2 className="text-[22px] font-semibold text-white tracking-wide">Request Access</h2>
                <p className="text-xs text-slate-400 mt-1">Submit your details for SOC clearance.</p>
              </motion.div>

              <form onSubmit={handleRegister} className="space-y-4">
                {!localAuthEnabled && (
                  <motion.div variants={itemVariants} className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-md mb-4 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Local authentication is disabled by administrator. Please use Google SSO.</span>
                  </motion.div>
                )}

                <motion.div variants={itemVariants}>
                  <Input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required className="h-11 bg-[#0f172a] border-white/5 text-white placeholder:text-slate-500 transition-all focus:border-cyan-500/50" disabled={!localAuthEnabled} />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required className="h-11 bg-[#0f172a] border-white/5 text-white placeholder:text-slate-500 transition-all focus:border-cyan-500/50" disabled={!localAuthEnabled} />
                </motion.div>

                <div className="grid grid-cols-2 gap-4">
                  <motion.div variants={itemVariants}>
                    <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="h-11 bg-[#0f172a] border-white/5 text-white placeholder:text-slate-500 transition-all focus:border-cyan-500/50" disabled={!localAuthEnabled} />
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Input type="password" placeholder="Confirm" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="h-11 bg-[#0f172a] border-white/5 text-white placeholder:text-slate-500 transition-all focus:border-cyan-500/50" disabled={!localAuthEnabled} />
                  </motion.div>
                </div>

                <motion.div variants={itemVariants} className="pt-4">
                  <Button type="submit" className="w-full h-11 bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-medium tracking-wide" disabled={!localAuthEnabled || registerMutation.isPending}>
                    {registerMutation.isPending ? "Processing..." : "Submit Application"}
                  </Button>
                </motion.div>

                <motion.div variants={itemVariants} className="text-center pt-2">
                  <Button type="button" variant="link" size="sm" onClick={() => setView("login")} className="text-xs text-slate-500 hover:text-cyan-400 transition-colors">
                    Back to Login
                  </Button>
                </motion.div>
              </form>
            </motion.div>
          )}

          {view === "verifyEmail" && (
            <motion.div key="verifyEmail" variants={containerVariants} initial="hidden" animate="show" exit="exit" className="space-y-6">
              <motion.div variants={itemVariants} className="text-center mb-6">
                <motion.div animate={{ rotateY: [0, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="inline-block mb-4">
                  <div className="w-14 h-14 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/20">
                    <Mail className="w-6 h-6 text-cyan-400" />
                  </div>
                </motion.div>
                <h2 className="text-[22px] font-semibold text-white tracking-wide">Verify Email</h2>
                <p className="text-xs text-slate-400 mt-2">Enter the 6-digit code sent to <span className="text-white font-medium">{email}</span></p>
                <p className="text-[10px] text-slate-600 mt-1 font-mono">(Check server terminal for Ethereal links)</p>
              </motion.div>

              <form onSubmit={handleVerifyEmail} className="space-y-6">
                <motion.div variants={itemVariants}>
                  <Input type="text" placeholder="000000" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} required className="h-14 bg-[#0f172a] border-white/5 text-white text-center tracking-[0.5em] font-mono text-2xl transition-all focus:border-cyan-500/50" maxLength={6} />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Button type="submit" className="w-full h-11 bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-medium tracking-wide" disabled={verifyEmailMutation.isPending}>
                    Verify Code
                  </Button>
                </motion.div>
              </form>
            </motion.div>
          )}

          {view === "setup2fa" && (
            <motion.div key="setup2fa" variants={containerVariants} initial="hidden" animate="show" exit="exit" className="space-y-6">
              <motion.div variants={itemVariants} className="text-center mb-6">
                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} className="inline-block mb-4">
                  <div className="w-14 h-14 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/20">
                    <Shield className="w-6 h-6 text-cyan-400" />
                  </div>
                </motion.div>
                <h2 className="text-[22px] font-semibold text-white tracking-wide">Mandatory 2FA Setup</h2>
                <p className="text-xs text-slate-400 mt-2">Configure two-factor authentication to secure your account.</p>
              </motion.div>

              {!qrCodeUrl ? (
                <div className="space-y-4">
                  <motion.div variants={itemVariants}>
                    <Button variant="outline" className="w-full justify-start h-auto p-4 bg-[#0f172a] hover:bg-white/5 border-white/5 hover:border-cyan-500/50 transition-all" onClick={() => handleSetup2fa("totp")} disabled={setup2faMutation.isPending}>
                      <QrCode className="w-6 h-6 mr-4 text-cyan-400 shrink-0" />
                      <div className="text-left">
                        <div className="font-medium text-sm text-white">Authenticator App</div>
                        <div className="text-[11px] text-slate-400 mt-1 whitespace-normal">Use Google Authenticator, Authy, or similar applications.</div>
                      </div>
                    </Button>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Button variant="outline" className="w-full justify-start h-auto p-4 bg-[#0f172a] hover:bg-white/5 border-white/5 hover:border-cyan-500/50 transition-all" onClick={() => handleSetup2fa("email")} disabled={setup2faMutation.isPending}>
                      <Mail className="w-6 h-6 mr-4 text-slate-300 shrink-0" />
                      <div className="text-left">
                        <div className="font-medium text-sm text-white">Email Verification</div>
                        <div className="text-[11px] text-slate-400 mt-1 whitespace-normal">Receive one-time codes via your registered email address.</div>
                      </div>
                    </Button>
                  </motion.div>
                </div>
              ) : (
                <form onSubmit={handleChallenge} className="space-y-6">
                  <motion.div variants={itemVariants} className="flex flex-col items-center p-6 bg-[#0f172a] border border-white/5 rounded-xl">
                    <div className="bg-white p-3 rounded-lg mb-4">
                      <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40" />
                    </div>
                    <div className="text-center w-full">
                      <span className="text-[10px] uppercase text-slate-500 tracking-wider mb-1 block">Manual Entry Secret</span>
                      <p className="text-xs text-white font-mono bg-black/30 p-2 rounded border border-white/10">
                        {setupSecret}
                      </p>
                    </div>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Input type="text" placeholder="6-Digit Code" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} required className="h-14 bg-[#0f172a] border-white/5 text-white text-center tracking-[0.5em] font-mono text-2xl transition-all focus:border-cyan-500/50" maxLength={6} />
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Button type="submit" className="w-full h-11 bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-medium tracking-wide" disabled={challenge2faMutation.isPending}>
                      Verify & Complete Setup
                    </Button>
                  </motion.div>
                </form>
              )}
            </motion.div>
          )}

          {view === "challenge2fa" && (
            <motion.div key="challenge2fa" variants={containerVariants} initial="hidden" animate="show" exit="exit" className="space-y-6">
              <motion.div variants={itemVariants} className="text-center mb-6">
                <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }} className="inline-block mb-4">
                  <div className="w-14 h-14 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/20">
                    <Lock className="w-6 h-6 text-cyan-400" />
                  </div>
                </motion.div>
                <h2 className="text-[22px] font-semibold text-white tracking-wide">Two-Factor Auth</h2>
                <p className="text-xs text-slate-400 mt-2">
                  {twoFactorType === "totp" ? "Enter the 6-digit code from your authenticator app." : `Enter the verification code sent to your email.`}
                </p>
              </motion.div>

              <form onSubmit={handleChallenge} className="space-y-6">
                <motion.div variants={itemVariants}>
                  <Input type="text" placeholder="000000" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} required autoFocus className="h-14 bg-[#0f172a] border-white/5 text-white text-center tracking-[0.5em] font-mono text-2xl transition-all focus:border-cyan-500/50" maxLength={6} />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Button type="submit" className="w-full h-11 bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-medium tracking-wide flex items-center justify-center gap-2" disabled={challenge2faMutation.isPending}>
                    {challenge2faMutation.isPending ? "Verifying..." : <>Authenticate <Lock className="w-4 h-4" /></>}
                  </Button>
                </motion.div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
