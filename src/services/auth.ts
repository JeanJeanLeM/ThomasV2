/**
 * Service d'authentification unifié - Thomas V2
 * Selon TECHNICAL_SPECIFICATIONS.md - Étape 2.1
 */

import { supabase } from '@/utils/supabase';
import { DirectSupabaseService } from '@/services/DirectSupabaseService';
import type { User, Session, AuthResult, AuthError } from '@/types';
import * as SecureStore from 'expo-secure-store';

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
  /**
   * URL de retour OAuth côté web.
   * Permet d'éviter un fallback vers un Site URL Supabase obsolète.
   */
  private getWebOAuthRedirectUrl(): string | undefined {
    if (typeof window === 'undefined' || !window.location?.origin) {
      return undefined;
    }
    return window.location.origin;
  }
  
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

      const user = this.mapSupabaseUser(data.user);
      const session = this.mapSupabaseSession(data.session);

      // Mettre en cache pour l'auth offline
      await this.cacheCredentials(user, session);

      return {
        success: true,
        user,
        session,
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
        const user = this.mapSupabaseUser(data.user);
        const session = this.mapSupabaseSession(data.session);

        // Mettre en cache pour l'auth offline
        await this.cacheCredentials(user, session);

        return {
          success: true,
          user,
          session,
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
      // Détection environnement : web vs mobile
      const { Platform } = require('react-native');
      const isWeb = Platform.OS === 'web';
      const webRedirectTo = this.getWebOAuthRedirectUrl();

      // Sur le web, Supabase gère automatiquement la redirection
      // avec redirectTo explicite pour éviter un fallback Site URL incorrect.
      // Sur mobile (app native), on force le schéma personnalisé.
      const oauthOptions: any = isWeb
        ? {
            ...(webRedirectTo ? { redirectTo: webRedirectTo } : {}),
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          }
        : {
            redirectTo: 'thomasv2://auth/callback',
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          };

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: oauthOptions,
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
      // Détection environnement : web vs mobile
      const { Platform } = require('react-native');
      const isWeb = Platform.OS === 'web';
      const webRedirectTo = this.getWebOAuthRedirectUrl();

      const oauthOptions: any = isWeb
        ? {
            ...(webRedirectTo ? { redirectTo: webRedirectTo } : {}),
            queryParams: {
              scope: 'name email',
            },
          }
        : {
            redirectTo: 'thomasv2://auth/callback',
            queryParams: {
              scope: 'name email',
            },
          };

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: oauthOptions,
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

  // Crée un profil applicatif minimal dans public.profiles si aucune ligne n'existe encore
  private async ensureProfileForSupabaseUser(supabaseUser: any): Promise<void> {
    try {
      const { data, error } = await DirectSupabaseService.directSelect(
        'profiles',
        'id',
        [{ column: 'id', value: supabaseUser.id }],
        true
      );

      if (error) {
        console.warn('Erreur vérification profil applicatif (service auth, Direct API):', error);
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
        const { error: insertError } = await DirectSupabaseService.directInsert(
          'profiles',
          profilePayload
        );

        if (insertError) {
          console.warn('Erreur création profil applicatif (service auth, Direct API):', insertError);
        } else {
          console.log('✅ Profil applicatif créé (service auth) pour', supabaseUser.email);
        }
      } else {
        const { error: updateError } = await DirectSupabaseService.directUpdate(
          'profiles',
          profilePayload,
          [{ column: 'id', value: supabaseUser.id }]
        );

        if (updateError) {
          console.warn('Erreur mise à jour profil applicatif (service auth, Direct API):', updateError);
        }
      }
    } catch (error) {
      console.warn('Erreur ensureProfileForSupabaseUser:', error);
    }
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const supabaseUser = session?.user;
      const user = supabaseUser ? this.mapSupabaseUser(supabaseUser) : null;

      // Mettre à jour le cache offline dès qu'une session valide existe
      if (user && session) {
        await this.cacheCredentials(user, this.mapSupabaseSession(session));
        // S'assurer qu'un profil applicatif existe pour cet utilisateur
        await this.ensureProfileForSupabaseUser(supabaseUser);
      }

      callback(user);
    });

    return () => subscription.unsubscribe();
  }

  // ==============================
  // CACHE OFFLINE (À IMPLÉMENTER)
  // ==============================

  async cacheCredentials(user: User, session: Session): Promise<void> {
    try {
      const expiresAt = Date.now() + 180 * 24 * 60 * 60 * 1000; // 180 jours (6 mois)
      
      // SecureStore n'est pas supporté en web, utiliser localStorage comme fallback
      const isWeb = typeof window !== 'undefined';
      
      if (isWeb) {
        // Fallback localStorage pour le web/développement
        localStorage.setItem('thomas_auth_user', JSON.stringify(user));
        localStorage.setItem('thomas_auth_session', JSON.stringify(session));
        localStorage.setItem('thomas_auth_expires_at', String(expiresAt));
        console.log('🔧 [DEV] Credentials cached in localStorage (web mode)');
      } else {
        // SecureStore pour mobile natif
        await SecureStore.setItemAsync('thomas_auth_user', JSON.stringify(user));
        await SecureStore.setItemAsync('thomas_auth_session', JSON.stringify(session));
        await SecureStore.setItemAsync('thomas_auth_expires_at', String(expiresAt));
      }
    } catch (error) {
      console.warn('Erreur cacheCredentials (offline auth):', error);
    }
  }

  async getCachedUser(): Promise<User | null> {
    try {
      const isWeb = typeof window !== 'undefined';
      
      let expiresAtStr: string | null;
      let userStr: string | null;
      let sessionStr: string | null;
      
      if (isWeb) {
        // Utiliser localStorage en web
        expiresAtStr = localStorage.getItem('thomas_auth_expires_at');
        userStr = localStorage.getItem('thomas_auth_user');  
        sessionStr = localStorage.getItem('thomas_auth_session');
      } else {
        // Utiliser SecureStore en mobile
        expiresAtStr = await SecureStore.getItemAsync('thomas_auth_expires_at');
        userStr = await SecureStore.getItemAsync('thomas_auth_user');
        sessionStr = await SecureStore.getItemAsync('thomas_auth_session');
      }

      if (!expiresAtStr) {
        return null;
      }

      const expiresAt = Number(expiresAtStr);
      if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
        // Cache expiré → nettoyage
        await this.clearCache();
        return null;
      }

      if (!userStr || !sessionStr) {
        return null;
      }

      const user = JSON.parse(userStr) as User;
      const session = JSON.parse(sessionStr) as Session;

      // Optionnel : revalider la session côté Supabase si on est en ligne
      // mais pour l'offline strict on se contente du cache

      return user;
    } catch (error) {
      console.warn('Erreur getCachedUser (offline auth):', error);
      return null;
    }
  }

  async clearCache(): Promise<void> {
    try {
      const isWeb = typeof window !== 'undefined';
      
      if (isWeb) {
        // Nettoyer localStorage en web
        localStorage.removeItem('thomas_auth_user');
        localStorage.removeItem('thomas_auth_session');
        localStorage.removeItem('thomas_auth_expires_at');
      } else {
        // Nettoyer SecureStore en mobile
        await SecureStore.deleteItemAsync('thomas_auth_user');
        await SecureStore.deleteItemAsync('thomas_auth_session');
        await SecureStore.deleteItemAsync('thomas_auth_expires_at');
      }
    } catch (error) {
      console.warn('Erreur clearCache (offline auth):', error);
    }
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
    // Codes d'erreur Supabase spécifiques
    const errorCode = error.code || error.error_code;
    const errorMessage = error.message || '';
    const statusCode = error.status;

    // Mapping des codes d'erreur et messages vers messages français précis
    const errorMap: Record<string, string> = {
      // Erreurs d'authentification
      'invalid_credentials': 'Identifiant ou mot de passe incorrect',
      'Invalid login credentials': 'Identifiant ou mot de passe incorrect',
      'invalid_grant': 'Identifiant ou mot de passe incorrect',
      
      // Erreurs email
      'email_not_confirmed': 'Veuillez confirmer votre email avant de vous connecter',
      'Email not confirmed': 'Veuillez confirmer votre email avant de vous connecter',
      'User not found': 'Aucun compte trouvé avec cet identifiant',
      'Invalid email address': 'Adresse email invalide',
      
      // Erreurs mot de passe
      'weak_password': 'Le mot de passe n\'est pas assez sécurisé',
      'Weak password': 'Le mot de passe n\'est pas assez sécurisé',
      'Password should be at least 6 characters': 
        'Le mot de passe doit contenir au moins 8 caractères, 1 chiffre et 1 caractère spécial',
      
      // Erreurs inscription
      'User already registered': 'Cet email est déjà utilisé',
      'signup_disabled': 'L\'inscription n\'est pas autorisée pour le moment',
      
      // Erreurs réseau/serveur
      'SMTP Error': 'Erreur d\'envoi d\'email. Veuillez réessayer plus tard.',
      'Email delivery failed': 'L\'envoi de l\'email de confirmation a échoué',
      'Internal Server Error': 'Erreur serveur. Veuillez réessayer dans quelques instants.',
      'Service temporarily unavailable': 'Service temporairement indisponible',
      'Rate limit exceeded': 'Trop de tentatives. Veuillez patienter avant de réessayer.',
      'network_error': 'Problème de connexion. Vérifiez votre réseau internet.',
    };

    // Déterminer le message d'erreur
    let message = errorMap[errorCode] || errorMap[errorMessage] || errorMessage;

    // Gestion spéciale selon le code HTTP
    if (statusCode === 400) {
      // Erreur 400 = généralement identifiant/mot de passe incorrect
      if (errorMessage.includes('Invalid login credentials') || 
          errorMessage.includes('invalid_credentials') ||
          errorMessage.includes('invalid_grant')) {
        message = 'Identifiant ou mot de passe incorrect';
      }
    } else if (statusCode === 401) {
      message = 'Identifiant ou mot de passe incorrect';
    } else if (statusCode === 404) {
      message = 'Aucun compte trouvé avec cet identifiant';
    } else if (statusCode === 422) {
      // Erreur de validation
      if (errorMessage.includes('email')) {
        message = 'Adresse email invalide';
      } else if (errorMessage.includes('password')) {
        message = 'Le mot de passe ne respecte pas les critères requis';
      }
    } else if (statusCode === 429) {
      message = 'Trop de tentatives. Veuillez patienter avant de réessayer.';
    } else if (statusCode === 500 || statusCode === 503) {
      message = 'Erreur serveur. Veuillez réessayer dans quelques instants.';
    }

    // Si aucun message n'a été trouvé, utiliser un message générique
    if (!message || message === errorMessage) {
      message = 'Erreur lors de la connexion. Veuillez vérifier vos identifiants.';
    }

    return {
      code: errorCode || statusCode?.toString() || 'unknown_error',
      message,
      details: error,
    };
  }
}

// Export singleton
export const authService = new ThomasAuthService();
