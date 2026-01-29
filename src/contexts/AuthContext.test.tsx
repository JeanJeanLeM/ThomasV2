import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, profile: { firstName: string; lastName: string }) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Mock user pour les tests
const mockUser: User = {
  id: 'test-user-id',
  email: 'test.thomas.v2@gmail.com',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {
    first_name: 'Thomas',
    last_name: 'V2',
    full_name: 'Thomas V2'
  },
  identities: [],
  factors: [],
  email_confirmed_at: new Date().toISOString(),
  phone_confirmed_at: null,
  confirmation_sent_at: null,
  confirmed_at: new Date().toISOString(),
  recovery_sent_at: null,
  new_email: null,
  invited_at: null,
  action_link: null,
  phone: null,
  new_phone: null,
  last_sign_in_at: new Date().toISOString(),
  banned_until: null,
  deleted_at: null,
  is_anonymous: false
};

const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: mockUser
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simuler un délai de chargement puis connecter automatiquement
    setTimeout(() => {
      console.log('🧪 Mode test: Connexion automatique');
      setUser(mockUser);
      setSession(mockSession);
      setLoading(false);
    }, 1000);
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setTimeout(() => {
      setUser(mockUser);
      setSession(mockSession);
      setLoading(false);
    }, 1000);
    return {};
  };

  const signUp = async (email: string, password: string, profile: { firstName: string; lastName: string }) => {
    return { error: 'Mode test: inscription désactivée' };
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setTimeout(() => {
      setUser(mockUser);
      setSession(mockSession);
      setLoading(false);
    }, 1000);
    return {};
  };

  const signOut = async () => {
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    return {};
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
