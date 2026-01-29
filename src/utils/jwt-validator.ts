import { supabase } from './supabase';

/**
 * Utilitaire pour valider et nettoyer les sessions JWT invalides
 * Gère spécifiquement l'erreur "User from sub claim in JWT does not exist"
 */

export interface JWTValidationResult {
  isValid: boolean;
  user: any | null;
  needsSignOut: boolean;
  error?: string;
}

/**
 * Valide une session JWT avec Supabase
 */
export async function validateJWTSession(): Promise<JWTValidationResult> {
  try {
    console.log('🔍 [JWT] Validation de la session JWT...');
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // Gestion de l'erreur JWT spécifique
    if (error && error.message?.includes('User from sub claim in JWT does not exist')) {
      console.error('🚨 [JWT] Session JWT corrompue détectée');
      return {
        isValid: false,
        user: null,
        needsSignOut: true,
        error: 'Session expirée - Reconnexion requise'
      };
    }
    
    // Autres erreurs d'authentification
    if (error) {
      console.error('❌ [JWT] Erreur validation JWT:', error);
      return {
        isValid: false,
        user: null,
        needsSignOut: false,
        error: error.message
      };
    }
    
    // Pas d'utilisateur trouvé
    if (!user) {
      console.log('ℹ️ [JWT] Aucun utilisateur authentifié');
      return {
        isValid: false,
        user: null,
        needsSignOut: false,
        error: 'Aucun utilisateur connecté'
      };
    }
    
    // Session valide
    console.log('✅ [JWT] Session JWT valide pour:', user.email);
    return {
      isValid: true,
      user,
      needsSignOut: false
    };
    
  } catch (exception) {
    console.error('❌ [JWT] Exception lors de la validation:', exception);
    return {
      isValid: false,
      user: null,
      needsSignOut: true,
      error: 'Erreur de validation de session'
    };
  }
}

/**
 * Nettoie une session JWT corrompue
 */
export async function cleanupInvalidSession(): Promise<void> {
  try {
    console.log('🧹 [JWT] Nettoyage de la session invalide...');
    
    await supabase.auth.signOut();
    
    // Nettoyer le localStorage si nécessaire
    if (typeof window !== 'undefined') {
      const keysToRemove = [];
      
      // Identifier les clés liées à Supabase
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.includes('supabase')) {
          keysToRemove.push(key);
        }
      }
      
      // Supprimer les clés identifiées
      keysToRemove.forEach(key => {
        window.localStorage.removeItem(key);
        console.log(`🗑️ [JWT] Suppression clé localStorage: ${key}`);
      });
    }
    
    console.log('✅ [JWT] Nettoyage terminé');
    
  } catch (error) {
    console.error('❌ [JWT] Erreur lors du nettoyage:', error);
  }
}

/**
 * Valide et nettoie automatiquement si nécessaire
 */
export async function validateAndCleanupSession(): Promise<JWTValidationResult> {
  const result = await validateJWTSession();
  
  if (result.needsSignOut) {
    await cleanupInvalidSession();
    
    // Forcer un rechargement de la page pour réinitialiser l'état
    if (typeof window !== 'undefined') {
      console.log('🔄 [JWT] Rechargement de la page pour réinitialisation complète');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }
  
  return result;
}

/**
 * Wrapper pour les appels API qui gère automatiquement les sessions invalides
 */
export async function withJWTValidation<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    // Valider la session avant l'opération
    const validation = await validateJWTSession();
    
    if (!validation.isValid) {
      if (validation.needsSignOut) {
        await cleanupInvalidSession();
      }
      throw new Error(validation.error || 'Session invalide');
    }
    
    // Exécuter l'opération
    return await operation();
    
  } catch (error) {
    // Si l'erreur contient le message JWT spécifique, nettoyer
    if (error instanceof Error && error.message.includes('User from sub claim in JWT does not exist')) {
      console.error('🚨 [JWT] Erreur JWT détectée dans l\'opération');
      await cleanupInvalidSession();
    }
    
    throw error;
  }
}


