import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const validationDoneRef = useRef(false);

  // Validate that user still exists in database - if not, sign out
  // Uses ref to prevent duplicate validation calls
  const validateUserExists = async (userId: string) => {
    if (validationDoneRef.current) return;
    validationDoneRef.current = true;
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      
      if (!data) {
        console.log('User no longer exists in database, signing out...');
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Error validating user existence:', err);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Only validate on actual sign-in events to prevent redundant calls
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            validateUserExists(session.user.id);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Only validate if not already done by auth state change
      if (session?.user && !validationDoneRef.current) {
        validateUserExists(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Reset validation flag on sign out so next sign in can validate
    validationDoneRef.current = false;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
