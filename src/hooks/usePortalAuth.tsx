import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

interface PortalUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
}

interface PortalAuthContextType {
  user: PortalUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  signOut: () => void;
  setSession: (token: string, user: PortalUser) => void;
}

const PortalAuthContext = createContext<PortalAuthContextType | undefined>(undefined);

const PORTAL_TOKEN_KEY = 'portal_session_token';
const PORTAL_USER_KEY = 'portal_session_user';

export const PortalAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem(PORTAL_TOKEN_KEY);
    const savedUser = localStorage.getItem(PORTAL_USER_KEY);
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem(PORTAL_TOKEN_KEY);
        localStorage.removeItem(PORTAL_USER_KEY);
      }
    }
    setLoading(false);
  }, []);

  const setSession = useCallback((newToken: string, newUser: PortalUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem(PORTAL_TOKEN_KEY, newToken);
    localStorage.setItem(PORTAL_USER_KEY, JSON.stringify(newUser));
  }, []);

  const signOut = useCallback(async () => {
    if (token) {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        await fetch(`${supabaseUrl}/functions/v1/portal-api?action=logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-portal-token': token,
          },
        });
      } catch {}
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem(PORTAL_TOKEN_KEY);
    localStorage.removeItem(PORTAL_USER_KEY);
  }, [token]);

  return (
    <PortalAuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user && !!token,
      loading,
      signOut,
      setSession,
    }}>
      {children}
    </PortalAuthContext.Provider>
  );
};

export const usePortalAuth = () => {
  const context = useContext(PortalAuthContext);
  if (!context) {
    throw new Error('usePortalAuth must be used within a PortalAuthProvider');
  }
  return context;
};
