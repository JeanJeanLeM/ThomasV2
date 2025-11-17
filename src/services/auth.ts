/**
 * Service d'authentification unifié - Thomas V2
 * Selon TECHNICAL_SPECIFICATIONS.md - Étape 2.1
 */

import { supabase } from '@/utils/supabase';
import type { User, Session, AuthResult, AuthError } from '@/types';

export interface AuthService {
  // Méthodes principales
  signInWithEmail(email: string, password: string): Promise<AuthResult>;
  signInWithGoogle(): Promise<AuthResult>;
  signInWithApple(): Promise<AuthResult>;
  signUp(email: string, password: string, profile: UserProfile): Promise<AuthResult>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;

  // Gestion session
  getCurrentUser(): Promise<User | null>;
  getSession(): Promise<Session | null>;
  refreshSession(): Promise<Session>;

  // État auth
  onAuthStateChanged(callback: (user: User | null) => void): () => void;

  // Offline support
  cacheCredentials(user: User, session: Session): Promise<void>;
  getCachedUser(): Promise<User | null>;
  clearCache(): Promise<void>;
}

interface UserProfile {
  firstName: string;
  lastName: string;
}

class ThomasAuthService implements AuthService {
  
  // ==============================
  // AUTHENTIFICATION EMAIL
  // ==============================
  
  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error: this.mapSupabaseError(error),
        };
      }

      return {
        success: true,
        user: this.mapSupabaseUser(data.user),
        session: this.mapSupabaseSession(data.session),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'network_error',
          message: 'Problème de connexion, vérifiez votre réseau',
          details: error,
        },
      };
    }
  }

  async signUp(email: string, password: string, profile: UserProfile): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: profile.firstName,
            last_name: profile.lastName,
          },
        },
      });

      if (error) {
        return {
          success: false,
          error: this.mapSupabaseError(error),
        };
      }

      if (data.user && data.session) {
        return {
          success: true,
          user: this.mapSupabaseUser(data.user),
          session: this.mapSupabaseSession(data.session),
        };
      } else {
        return {
          success: true,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'network_error',
          message: 'Problème de connexion, vérifiez votre réseau',
          details: error,
        },
      };
    }
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://app.thomas-assistant.fr/reset-password',
    });

    if (error) {
      throw this.mapSupabaseError(error);
    }
  }

  // ==============================
  // AUTHENTIFICATION OAUTH
  // ==============================

  async signInWithGoogle(): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://app.thomas-assistant.fr/auth/callback',
        },
      });

      if (error) {
        return {
          success: false,
          error: this.mapSupabaseError(error),
        };
      }

      // OAuth redirect - pas de user/session immédiatement disponible
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'google_auth_cancelled',
          message: 'Connexion Google annulée',
          details: error,
        },
      };
    }
  }

  async signInWithApple(): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: 'https://app.thomas-assistant.fr/auth/callback',
        },
      });

      if (error) {
        return {
          success: false,
          error: this.mapSupabaseError(error),
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'apple_auth_failed',
          message: 'Échec de la connexion Apple',
          details: error,
        },
      };
    }
  }

  // ==============================
  // GESTION SESSION
  // ==============================

  async getCurrentUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user ? this.mapSupabaseUser(data.user) : null;
  }

  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session ? this.mapSupabaseSession(data.session) : null;
  }

  async refreshSession(): Promise<Session> {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error || !data.session) {
      throw new Error('Impossible de rafraîchir la session');
    }

    return this.mapSupabaseSession(data.session);
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw this.mapSupabaseError(error);
    }
    
    // Nettoyer le cache local
    await this.clearCache();
  }

  // ==============================
  // ÉTAT AUTH & LISTENERS
  // ==============================

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user ? this.mapSupabaseUser(session.user) : null;
        callback(user);
      }
    );

    return () => subscription.unsubscribe();
  }

  // ==============================
  // CACHE OFFLINE (À IMPLÉMENTER)
  // ==============================

  async cacheCredentials(user: User, session: Session): Promise<void> {
    // TODO: Implémenter avec Expo SecureStore
    console.log('Cache credentials:', { userId: user.id });
  }

  async getCachedUser(): Promise<User | null> {
    // TODO: Implémenter avec Expo SecureStore
    return null;
  }

  async clearCache(): Promise<void> {
    // TODO: Implémenter avec Expo SecureStore
    console.log('Cache cleared');
  }

  // ==============================
  // HELPERS PRIVÉS
  // ==============================

  private mapSupabaseUser(supabaseUser: any): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      firstName: supabaseUser.user_metadata?.first_name || '',
      lastName: supabaseUser.user_metadata?.last_name || '',
      createdAt: supabaseUser.created_at,
      updatedAt: supabaseUser.updated_at || supabaseUser.created_at,
    };
  }

  private mapSupabaseSession(supabaseSession: any): Session {
    return {
      accessToken: supabaseSession.access_token,
      refreshToken: supabaseSession.refresh_token,
      expiresAt: new Date(supabaseSession.expires_at * 1000).toISOString(),
      user: this.mapSupabaseUser(supabaseSession.user),
    };
  }

  private mapSupabaseError(error: any): AuthError {
    // Mapping des erreurs Supabase vers messages français
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Email ou mot de passe incorrect',
      'Email not confirmed': 'Veuillez confirmer votre email avant de vous connecter',
      'User not found': 'Aucun compte trouvé avec cet email',
      'Password should be at least 6 characters': 
        'Le mot de passe doit contenir au moins 8 caractères, 1 chiffre et 1 caractère spécial',
      'User already registered': 'Cet email est déjà utilisé',
      'signup_disabled': 'L\'inscription n\'est pas autorisée pour le moment',
    };

    const message = errorMap[error.message] || error.message;

    return {
      code: error.error_code || 'unknown_error',
      message,
      details: error,
    };
  }
}

// Export singleton
export const authService = new ThomasAuthService();
