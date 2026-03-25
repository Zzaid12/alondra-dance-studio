import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Shield, QrCode, CheckCircle, AlertCircle, Copy } from "lucide-react";

type Step = "enroll" | "verify" | "done";

const AdminSetup2FA = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>("enroll");
    const [qrCode, setQrCode] = useState("");
    const [secret, setSecret] = useState("");
    const [factorId, setFactorId] = useState("");
    const [totpCode, setTotpCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const checkAndEnroll = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { navigate("/admin/login"); return; }

            // Check is_admin
            const { data: perfil } = await (supabase as any)
                .from("perfiles")
                .select("is_admin")
                .eq("id", session.user.id)
                .single();

            if (!perfil?.is_admin) { navigate("/"); return; }

            // Enroll TOTP factor
            const { data, error: enrollError } = await supabase.auth.mfa.enroll({
                factorType: "totp",
                friendlyName: "Admin 2FA",
                issuer: "Alondra Pole Space",
            });

            if (enrollError || !data) {
                setError("Error al generar el código QR. Recarga la página.");
                return;
            }

            setFactorId(data.id);
            setQrCode(data.totp.qr_code);
            setSecret(data.totp.secret);
        };

        checkAndEnroll();
    }, [navigate]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const { data: challengeData, error: challengeError } =
                await supabase.auth.mfa.challenge({ factorId });

            if (challengeError) {
                setError("Error al generar el desafío.");
                setIsLoading(false);
                return;
            }

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challengeData.id,
                code: totpCode.replace(/\s/g, ""),
            });

            if (verifyError) {
                setError("Código incorrecto. Inténtalo de nuevo.");
                setTotpCode("");
                setIsLoading(false);
                return;
            }

            setStep("done");
        } catch {
            setError("Error inesperado. Inténtalo de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };

    const copySecret = () => {
        navigator.clipboard.writeText(secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center admin-bg px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl admin-icon-bg mb-4">
                        <Shield className="w-7 h-7 text-[#c084fc]" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">Configurar 2FA</h1>
                    <p className="text-sm text-white/40">Configura la verificación en dos pasos</p>
                </div>

                <div className="admin-card rounded-2xl p-8">
                    {step === "enroll" && (
                        <>
                            <div className="flex items-center gap-2 mb-6">
                                <QrCode className="w-5 h-5 text-[#c084fc]" />
                                <h2 className="text-sm font-semibold text-white">Escanea el código QR</h2>
                            </div>

                            <ol className="text-xs text-white/50 space-y-1.5 mb-6">
                                <li>1. Abre <strong className="text-white/70">Google Authenticator</strong> o <strong className="text-white/70">Authy</strong></li>
                                <li>2. Añade una nueva cuenta y escanea el QR</li>
                                <li>3. Pulsa "Continuar" e introduce el código</li>
                            </ol>

                            {qrCode ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="bg-white p-3 rounded-xl">
                                        <img src={qrCode} alt="QR para 2FA" className="w-44 h-44" />
                                    </div>

                                    {secret && (
                                        <div className="w-full">
                                            <p className="text-xs text-white/40 mb-1.5 text-center">
                                                ¿No puedes escanear? Copia el código manual:
                                            </p>
                                            <button
                                                onClick={copySecret}
                                                className="w-full flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white/60 hover:border-[#c084fc]/40 transition-colors"
                                            >
                                                <span className="truncate">{secret}</span>
                                                {copied
                                                    ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                                                    : <Copy className="w-4 h-4 shrink-0" />}
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setStep("verify")}
                                        className="admin-btn w-full py-2.5 rounded-xl text-sm font-semibold"
                                    >
                                        Continuar → Verificar código
                                    </button>
                                </div>
                            ) : (
                                <div className="flex justify-center py-8">
                                    <div className="w-8 h-8 border-2 border-[#c084fc] border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </>
                    )}

                    {step === "verify" && (
                        <>
                            <h2 className="text-sm font-semibold text-white mb-2">Confirma el código</h2>
                            <p className="text-xs text-white/40 mb-6">
                                Introduce el código de 6 dígitos de tu app para confirmar la configuración.
                            </p>

                            <form onSubmit={handleVerify} className="space-y-4">
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
                                    ) : "Confirmar y activar 2FA"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setStep("enroll"); setError(""); }}
                                    className="w-full text-xs text-white/30 hover:text-white/50 transition-colors"
                                >
                                    ← Volver al QR
                                </button>
                            </form>
                        </>
                    )}

                    {step === "done" && (
                        <div className="text-center py-4">
                            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                            <h2 className="text-lg font-bold text-white mb-2">¡2FA activado!</h2>
                            <p className="text-sm text-white/50 mb-6">
                                El panel de administración está protegido con verificación en dos pasos.
                            </p>
                            <button
                                onClick={() => navigate("/admin")}
                                className="admin-btn px-8 py-2.5 rounded-xl text-sm font-semibold"
                            >
                                Ir al panel
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        .admin-bg {
          background: #07070d;
          background-image: radial-gradient(ellipse 60% 40% at 50% -10%, rgba(192,132,252,0.12) 0%, transparent 70%);
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

export default AdminSetup2FA;
