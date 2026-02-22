import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

interface AgentUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  partner_id: string;
  partner_name: string;
  partner_type: string;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
}

interface AgentAuthContextType {
  user: AgentUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  signOut: () => void;
  setSession: (token: string, user: AgentUser) => void;
}

const AgentAuthContext = createContext<AgentAuthContextType | undefined>(undefined);

const AGENT_TOKEN_KEY = 'agent_session_token';
const AGENT_USER_KEY = 'agent_session_user';

export const AgentAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AgentUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem(AGENT_TOKEN_KEY);
    const savedUser = localStorage.getItem(AGENT_USER_KEY);
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem(AGENT_TOKEN_KEY);
        localStorage.removeItem(AGENT_USER_KEY);
      }
    }
    setLoading(false);
  }, []);

  const setSession = useCallback((newToken: string, newUser: AgentUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem(AGENT_TOKEN_KEY, newToken);
    localStorage.setItem(AGENT_USER_KEY, JSON.stringify(newUser));
  }, []);

  const signOut = useCallback(async () => {
    if (token) {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        await fetch(`${supabaseUrl}/functions/v1/agent-api?action=logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-agent-token': token,
          },
        });
      } catch {}
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem(AGENT_TOKEN_KEY);
    localStorage.removeItem(AGENT_USER_KEY);
  }, [token]);

  return (
    <AgentAuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user && !!token,
      loading,
      signOut,
      setSession,
    }}>
      {children}
    </AgentAuthContext.Provider>
  );
};

export const useAgentAuth = () => {
  const context = useContext(AgentAuthContext);
  if (!context) {
    throw new Error('useAgentAuth must be used within an AgentAuthProvider');
  }
  return context;
};
