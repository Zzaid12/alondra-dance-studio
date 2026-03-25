import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AdminRouteProps {
    children: React.ReactNode;
}

type Status = "loading" | "authorized" | "unauthorized";

export function AdminRoute({ children }: AdminRouteProps) {
    const [status, setStatus] = useState<Status>("loading");

    useEffect(() => {
        const check = async () => {
            try {
                // 1. Get session and check AAL2 (2FA completed)
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) { setStatus("unauthorized"); return; }

                const aal = session.user.factors && session.user.factors.length > 0
                    ? "aal2"
                    : "aal1";

                // Also double-check via Supabase MFA API
                const { data: assuranceData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
                const currentAal = assuranceData?.currentLevel ?? "aal1";

                if (currentAal !== "aal2") {
                    setStatus("unauthorized");
                    return;
                }

                // 2. Check is_admin flag
                const { data: perfil, error } = await (supabase as any)
                    .from("perfiles")
                    .select("is_admin")
                    .eq("id", session.user.id)
                    .single();

                if (error || !perfil?.is_admin) {
                    setStatus("unauthorized");
                    return;
                }

                setStatus("authorized");
            } catch {
                setStatus("unauthorized");
            }
        };

        check();
    }, []);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[#c084fc] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-white/40">Verificando acceso…</span>
                </div>
            </div>
        );
    }

    if (status === "unauthorized") {
        return <Navigate to="/admin/login" replace />;
    }

    return <>{children}</>;
}
