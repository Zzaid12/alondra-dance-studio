import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Mail, Shield, Eye, EyeOff, AlertCircle } from "lucide-react";

type Step = "credentials" | "totp";

const AdminLogin = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>("credentials");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [totpCode, setTotpCode] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [factorId, setFactorId] = useState("");

    const handleCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                setError("Credenciales incorrectas");
                setIsLoading(false);
                return;
            }

            // Check if user is admin
            const { data: perfil } = await (supabase as any)
                .from("perfiles")
                .select("is_admin")
                .eq("id", data.user.id)
                .single();

            if (!perfil?.is_admin) {
                await supabase.auth.signOut();
                setError("No tienes acceso al panel de administración");
                setIsLoading(false);
                return;
            }

            // Check if user has MFA factors enrolled
            const { data: factors } = await supabase.auth.mfa.listFactors();
            const totpFactor = factors?.totp?.[0];

            if (!totpFactor) {
                // No 2FA yet — redirect to setup
                navigate("/admin/setup-2fa");
                return;
            }

            // Has 2FA — proceed to TOTP step
            setFactorId(totpFactor.id);
            setStep("totp");
        } catch {
            setError("Error inesperado. Inténtalo de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTotp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            // Create challenge
            const { data: challengeData, error: challengeError } =
                await supabase.auth.mfa.challenge({ factorId });

            if (challengeError) {
                setError("Error al generar el desafío 2FA");
                setIsLoading(false);
                return;
            }

            // Verify TOTP code
            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challengeData.id,
                code: totpCode.replace(/\s/g, ""),
            });

            if (verifyError) {
                setError("Código incorrecto. Verifica tu app de autenticación.");
                setTotpCode("");
                setIsLoading(false);
                return;
            }

            navigate("/admin");
        } catch {
            setError("Error verificando el código. Inténtalo de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center admin-bg px-4">
            <div className="w-full max-w-md">
                {/* Logo / Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl admin-icon-bg mb-4">
                        <Shield className="w-7 h-7 text-[#c084fc]" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">Panel Admin</h1>
                    <p className="text-sm text-white/40">Alondra Pole Space</p>
                </div>

                {/* Card */}
                <div className="admin-card rounded-2xl p-8">
                    {step === "credentials" ? (
                        <>
                            <h2 className="text-lg font-semibold text-white mb-6">Acceso seguro</h2>
                            <form onSubmit={handleCredentials} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-white/60 mb-1.5">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="admin-input w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
                                            placeholder="admin@alondrapolespace.es"
                                            required
                                            autoFocus
                                            autoComplete="username"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-white/60 mb-1.5">Contraseña</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className="admin-input w-full pl-9 pr-10 py-2.5 rounded-xl text-sm"
                                            placeholder="••••••••••••"
                                            required
                                            autoComplete="current-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl px-3 py-2.5">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="admin-btn w-full py-2.5 rounded-xl text-sm font-semibold mt-2"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Verificando…
                                        </span>
                                    ) : "Continuar"}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-lg bg-[#c084fc]/15 flex items-center justify-center">
                                    <Shield className="w-4 h-4 text-[#c084fc]" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-white">Verificación en 2 pasos</h2>
                                    <p className="text-xs text-white/40">Abre tu app de autenticación</p>
                                </div>
                            </div>

                            <form onSubmit={handleTotp} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-white/60 mb-1.5">
                                        Código de 6 dígitos
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9 ]*"
                                        maxLength={7}
                                        value={totpCode}
                                        onChange={e => setTotpCode(e.target.value)}
                                        className="admin-input w-full px-4 py-3 rounded-xl text-xl text-center font-mono tracking-[0.4em]"
                                        placeholder="000 000"
                                        required
                                        autoFocus
                                        autoComplete="one-time-code"
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl px-3 py-2.5">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading || totpCode.replace(/\s/g, "").length < 6}
                                    className="admin-btn w-full py-2.5 rounded-xl text-sm font-semibold"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Verificando…
                                        </span>
                                    ) : "Acceder al panel"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setStep("credentials"); setError(""); setTotpCode(""); }}
                                    className="w-full text-xs text-white/30 hover:text-white/50 transition-colors pt-1"
                                >
                                    ← Volver
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <p className="text-center text-xs text-white/20 mt-6">
                    Acceso restringido · Alondra Pole Space
                </p>
            </div>

            <style>{`
        .admin-bg {
          background: #07070d;
          background-image:
            radial-gradient(ellipse 60% 40% at 50% -10%, rgba(192,132,252,0.12) 0%, transparent 70%);
        }
        .admin-icon-bg {
          background: rgba(192,132,252,0.1);
          border: 1px solid rgba(192,132,252,0.2);
        }
        .admin-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(12px);
        }
        .admin-input {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          transition: border-color 0.2s;
          outline: none;
        }
        .admin-input::placeholder { color: rgba(255,255,255,0.2); }
        .admin-input:focus { border-color: rgba(192,132,252,0.5); }
        .admin-btn {
          background: linear-gradient(135deg, #a855f7, #7c3aed);
          color: white;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
        }
        .admin-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .admin-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
      `}</style>
        </div>
    );
};

export default AdminLogin;
