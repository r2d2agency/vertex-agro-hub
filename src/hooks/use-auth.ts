import { useEffect, useState } from "react";
import { getCurrentUser, hasAuthTokens, type AuthUser } from "@/lib/api";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!hasAuthTokens()) {
        if (!mounted) return;
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const current = await getCurrentUser();
        if (mounted) setUser(current);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    window.addEventListener("vertex-auth-change", load);
    return () => {
      mounted = false;
      window.removeEventListener("vertex-auth-change", load);
    };
  }, []);

  return { user, loading };
}
