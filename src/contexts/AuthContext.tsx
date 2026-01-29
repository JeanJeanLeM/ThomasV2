import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../utils/supabase';
import { DirectSupabaseService } from '../services/DirectSupabaseService';
import type { User, Session } from '@supabase/supabase-js';
import { setItem, deleteItem, getItem } from '../utils/secureStore';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, profile: { firstName: string; lastName: string }) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  clearCorruptedSession: () => Promise<void>;
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
  initialUser?: User | null;
  initialSession?: Session | null;
}

export function AuthProvider({ children, initialUser, initialSession }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [session, setSession] = useState<Session | null>(initialSession || null);
  const [loading, setLoading] = useState(!initialUser); // Pas de loading si initialisé

  // Crée un profil applicatif minimal dans public.profiles si aucune ligne n'existe encore
  const ensureProfileForUser = async (supabaseUser: User) => {
    try {
      // Vérifier si un profil existe déjà via API directe
      const { data, error } = await DirectSupabaseService.directSelect(
        'profiles',
        'id',
        [{ column: 'id', value: supabaseUser.id }],
        true
      );

      if (error) {
        console.warn('Erreur vérification profil applicatif (Direct API):', error);
        return;
      }

      const metadata = (supabaseUser.user_metadata || {}) as any;
      const fullName: string = metadata['full_name'] || '';
      const [firstNameFromFull, ...rest] = fullName.split(' ');
      const lastNameFromFull = rest.join(' ');

      const profilePayload = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        first_name: metadata['first_name'] || firstNameFromFull || null,
        last_name: metadata['last_name'] || lastNameFromFull || null,
        // full_name est une colonne générée côté DB → ne pas l'écrire
        phone: null as string | null,
        profession: null as string | null,
        bio: null as string | null,
      };

      if (!data) {
        // Création du profil
        const { error: insertError } = await DirectSupabaseService.directInsert(
          'profiles',
          profilePayload
        );

        if (insertError) {
          console.warn('Erreur création profil applicatif (Direct API):', insertError);
        } else {
          console.log('✅ Profil applicatif créé pour', supabaseUser.email);
        }
      } else {
        // Mise à jour minimale du profil existant (au cas où)
        const { error: updateError } = await DirectSupabaseService.directUpdate(
          'profiles',
          profilePayload,
          [{ column: 'id', value: supabaseUser.id }]
        );

        if (updateError) {
          console.warn('Erreur mise à jour profil applicatif (Direct API):', updateError);
        }
      }
    } catch (error) {
      console.warn('Erreur ensureProfileForUser:', error);
    }
  };

  useEffect(() => {
    // Si données initiales fournies, skip l'initialisation
    if (initialUser && initialSession) {
      console.log('✅ [AUTH] Données initiales fournies, skip initialisation');
      setLoading(false);
      return;
    }

    let mounted = true;

    // Récupérer et valider la session initiale avec gestion JWT + cache
    const initializeAuth = async () => {
      try {
        console.log('🔍 [AUTH] Initialisation avec validation JWT...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🔍 [AUTH] Session Supabase:', session?.user?.email || 'Aucune session');
        
        // Si pas de session Supabase, essayer de restaurer depuis le cache
        if (!session || error) {
          console.log('⚠️ [AUTH] Pas de session Supabase, tentative cache local...');
          
          try {
            const cachedSessionStr = await getItem('supabase-session');
            
            if (cachedSessionStr) {
              const cachedSession = JSON.parse(cachedSessionStr);
              
              // Vérifier que la session cache n'est pas expirée (6 mois)
              const now = Math.floor(Date.now() / 1000);
              if (cachedSession.cache_expires_at && cachedSession.cache_expires_at > now) {
                console.log('✅ [AUTH] Cache valide, restauration session...');
                
                // Restaurer la session dans Supabase avec le refresh_token
                const { data, error: setError } = await supabase.auth.setSession({
                  access_token: cachedSession.access_token,
                  refresh_token: cachedSession.refresh_token,
                });
                
                if (!setError && data.session) {
                  console.log('✅ [AUTH] Session restaurée depuis cache:', data.session.user?.email);
                  setSession(data.session);
                  setUser(data.session.user);
                  
                  // Créer profil si nécessaire
                  await ensureProfileForUser(data.session.user);
                  
                  if (mounted) {
                    setLoading(false);
                  }
                  return;
                } else {
                  console.warn('⚠️ [AUTH] Échec restauration session:', setError?.message);
                }
              } else {
                console.log('⚠️ [AUTH] Cache expiré (> 6 mois), nettoyage...');
                await deleteItem('supabase-session');
                await deleteItem('thomas_auth_user');
              }
            }
          } catch (cacheError) {
            console.warn('⚠️ [AUTH] Erreur lecture cache:', cacheError);
          }
          
          // Pas de session valide
          if (mounted) {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
          return;
        }
        
        // Session Supabase trouvée, validation
        if (session && mounted) {
          console.log('✅ [AUTH] Session Supabase trouvée, validation...');
          
          // Diagnostic auth détaillé
          console.log('📊 [AUTH] Détails session:', {
            userId: session.user?.id?.substring(0, 8) + '...',
            email: session.user?.email,
            expiresAt: new Date(session.expires_at! * 1000).toLocaleString(),
            tokenLength: session.access_token?.length || 0
          });
          
          try {
            const { data: { user }, error: validationError } = await Promise.race([
              supabase.auth.getUser(),
              new Promise<any>((_, reject) => 
                setTimeout(() => reject(new Error('Timeout validation')), 120000)
              )
            ]);
            
            if (validationError?.message?.includes('User from sub claim in JWT does not exist')) {
              console.error('🚨 [AUTH] JWT corrompu, nettoyage...');
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
            } else if (user) {
              console.log('✅ [AUTH] Utilisateur validé:', user.email);
              setSession(session);
              setUser(user);
              await ensureProfileForUser(user);
            } else {
              setSession(session);
              setUser(session.user);
            }
          } catch (validationError) {
            console.log('⚠️ [AUTH] Timeout validation, utilisation session directe');
            setSession(session);
            setUser(session.user);
            if (session.user) {
              ensureProfileForUser(session.user).catch(console.error);
            }
          }
        }
        
      } catch (error) {
        console.error('❌ [AUTH] Erreur initialisation auth:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (mounted) {
      setSession(session);
      setUser(session?.user ?? null);
        setLoading(false); // ← FIX: Assurer que loading passe à false
        
      if (session?.user) {
        // Créer le profil applicatif si nécessaire lors de la création de compte / connexion
        await ensureProfileForUser(session.user);
        }
      }
      
      // Sauvegarder session avec expiration 6 mois
      try {
        if (session) {
          const now = Math.floor(Date.now() / 1000);
          const essentialSession = {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
            expires_in: session.expires_in,
            token_type: session.token_type,
            user_id: session.user?.id,
            // Cache 6 mois
            cached_at: now,
            cache_expires_at: now + (180 * 24 * 60 * 60), // 180 jours
          };
          await setItem('supabase-session', JSON.stringify(essentialSession));
          
          // Sauvegarder aussi l'utilisateur
          await setItem('thomas_auth_user', JSON.stringify({
            id: session.user.id,
            email: session.user.email,
            user_metadata: session.user.user_metadata,
          }));
          
          console.log('✅ [AUTH] Session sauvegardée (expire dans 6 mois)');
        } else {
          await deleteItem('supabase-session');
          await deleteItem('thomas_auth_user');
          console.log('🗑️ [AUTH] Cache nettoyé');
        }
      } catch (error) {
        console.warn('⚠️ [AUTH] Erreur SecureStore:', error);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [initialUser, initialSession]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'Une erreur inattendue s\'est produite' };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    profile: { firstName: string; lastName: string }
  ) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: profile.firstName,
            last_name: profile.lastName,
            full_name: `${profile.firstName} ${profile.lastName}`,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'Une erreur inattendue s\'est produite' };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'thomasv2://auth/callback',
        },
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'Une erreur inattendue s\'est produite' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('🔐 [AUTH_CONTEXT] Début de la déconnexion...');
      setLoading(true);
      
      // Déconnexion Supabase
      console.log('🔐 [AUTH_CONTEXT] Appel supabase.auth.signOut()...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('🔐 [AUTH_CONTEXT] Erreur Supabase signOut:', error);
        throw error;
      }
      
      // Nettoyage du stockage sécurisé
      try {
        console.log('🔐 [AUTH_CONTEXT] Suppression session du stockage sécurisé...');
        await deleteItem('supabase-session');
        console.log('🔐 [AUTH_CONTEXT] Session supprimée du stockage sécurisé');
      } catch (storageError) {
        console.warn('🔐 [AUTH_CONTEXT] Erreur suppression stockage sécurisé:', storageError);
        // Fallback silencieux - pas critique
      }
      
      // Réinitialisation manuelle de l'état si nécessaire
      console.log('🔐 [AUTH_CONTEXT] Réinitialisation de l\'état...');
      setSession(null);
      setUser(null);
      
      console.log('✅ [AUTH_CONTEXT] Déconnexion terminée avec succès');
      
    } catch (error) {
      console.error('❌ [AUTH_CONTEXT] Erreur lors de la déconnexion:', error);
      
      // Même en cas d'erreur, on force la réinitialisation de l'état local
      setSession(null);
      setUser(null);
      
      // Re-lancer l'erreur pour que l'appelant puisse la gérer
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'thomasv2://auth/reset-password',
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'Une erreur inattendue s\'est produite' };
    }
  };

  const clearCorruptedSession = async () => {
    console.log('🧹 [AUTH] Nettoyage session corrompue');
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('❌ [AUTH] Erreur nettoyage session:', error);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    clearCorruptedSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
