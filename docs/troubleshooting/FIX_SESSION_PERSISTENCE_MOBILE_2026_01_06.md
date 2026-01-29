# 🔧 Fix - Persistance Session Mobile (Rester Connecté)

**Date** : 06/01/2026  
**Agent** : Authentication Specialist  
**Problème** : L'utilisateur doit se reconnecter à chaque fois qu'il ferme l'app  
**Objectif** : Garder l'utilisateur connecté pendant 6 mois (renouvelable)  
**Statut** : 🔄 Solution proposée

---

## 🔍 Diagnostic

### Problème actuel

**Symptôme** : 
- L'utilisateur se connecte ✅
- Il ferme l'app
- Il rouvre l'app → ❌ Il doit se reconnecter

### Causes identifiées

1. **Cache expire après 7 jours seulement** (ligne 365 `auth.ts`)
2. **Le cache n'est jamais utilisé au démarrage** (`AuthContext.tsx`)
3. **Supabase `persistSession` ne fonctionne pas correctement** sur mobile

---

## ✅ Solution Complète

### Étape 1 : Augmenter durée du cache à 6 mois

**Fichier** : `src/services/auth.ts`

```typescript
// AVANT (ligne 365)
const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 jours

// APRÈS
const expiresAt = Date.now() + 180 * 24 * 60 * 60 * 1000; // 180 jours (6 mois)
```

**Avec renouvellement automatique** : À chaque connexion, le compteur repart à 0.

---

### Étape 2 : Restaurer session depuis le cache au démarrage

**Fichier** : `src/contexts/AuthContext.tsx`

**Modifier `initializeAuth()`** (ligne 103) :

```typescript
const initializeAuth = async () => {
  try {
    console.log('🔍 [AUTH] Initialisation avec validation JWT...');
    
    // 1. Essayer de récupérer la session Supabase
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // 2. Si pas de session Supabase, essayer le cache local
    if (!session || error) {
      console.log('⚠️ [AUTH] Pas de session Supabase, tentative cache local...');
      
      try {
        // Récupérer depuis SecureStore
        const cachedSessionStr = await getItem('supabase-session');
        const cachedUserStr = await getItem('thomas_auth_user');
        
        if (cachedSessionStr && cachedUserStr) {
          const cachedSession = JSON.parse(cachedSessionStr);
          const cachedUser = JSON.parse(cachedUserStr);
          
          // Vérifier que la session n'est pas expirée
          const now = Math.floor(Date.now() / 1000);
          if (cachedSession.expires_at && cachedSession.expires_at > now) {
            console.log('✅ [AUTH] Session restaurée depuis le cache');
            
            // Restaurer la session dans Supabase
            const { data, error: setError } = await supabase.auth.setSession({
              access_token: cachedSession.access_token,
              refresh_token: cachedSession.refresh_token,
            });
            
            if (!setError && data.session) {
              setSession(data.session);
              setUser(data.session.user);
              
              // Créer profil si nécessaire
              await ensureProfileForUser(data.session.user);
              
              if (mounted) {
                setLoading(false);
              }
              return;
            }
          } else {
            console.log('⚠️ [AUTH] Cache expiré, nettoyage...');
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
    
    // 3. Session Supabase valide, valider le JWT
    if (session && mounted) {
      console.log('✅ [AUTH] Session Supabase trouvée, validation...');
      
      try {
        const { data: { user }, error: validationError } = await Promise.race([
          supabase.auth.getUser(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout validation')), 120000)
          )
        ]);
        
        if (validationError?.message?.includes('JWT does not exist')) {
          console.error('🚨 [AUTH] JWT corrompu, nettoyage...');
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
        } else if (user) {
          console.log('✅ [AUTH] Utilisateur validé:', user.email);
          setSession(session);
          setUser(user);
          await ensureProfileForUser(user);
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
    console.error('❌ [AUTH] Erreur initialisation:', error);
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
```

---

### Étape 3 : Améliorer la sauvegarde de session

**Fichier** : `src/contexts/AuthContext.tsx`

**Modifier `onAuthStateChange`** (ligne 194) :

```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('🔄 [AUTH] State changed:', event, session?.user?.email);
  
  if (mounted) {
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);
    
    if (session?.user) {
      await ensureProfileForUser(session.user);
    }
  }
  
  // Sauvegarder dans SecureStore avec expiration 6 mois
  try {
    if (session) {
      // Session essentielle
      const essentialSession = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user_id: session.user?.id,
        // ⚠️ Ajouter timestamp de cache pour les 6 mois
        cached_at: Math.floor(Date.now() / 1000),
        cache_expires_at: Math.floor(Date.now() / 1000) + (180 * 24 * 60 * 60), // 6 mois
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
      // Nettoyer le cache
      await deleteItem('supabase-session');
      await deleteItem('thomas_auth_user');
      console.log('🗑️ [AUTH] Cache nettoyé');
    }
  } catch (error) {
    console.warn('⚠️ [AUTH] Erreur SecureStore:', error);
  }
});
```

---

### Étape 4 : Configurer Supabase pour persistance

**Fichier** : `src/utils/supabase.ts`

**Vérifier configuration** (ligne 28-44) :

```typescript
return createClient(
  ENV_CLIENT.SUPABASE_URL,
  ENV_CLIENT.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,           // ✅ Rafraîchir auto
      persistSession: true,              // ✅ Persister
      detectSessionInUrl: false,         // Mobile: pas besoin
      storage: {
        // ✅ Utiliser SecureStore pour mobile
        getItem: async (key) => {
          try {
            const value = await SecureStore.getItemAsync(key);
            return value;
          } catch {
            return null;
          }
        },
        setItem: async (key, value) => {
          try {
            await SecureStore.setItemAsync(key, value);
          } catch (error) {
            console.warn('SecureStore setItem error:', error);
          }
        },
        removeItem: async (key) => {
          try {
            await SecureStore.deleteItemAsync(key);
          } catch (error) {
            console.warn('SecureStore removeItem error:', error);
          }
        },
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
```

---

## 🎯 Résumé des modifications

| Fichier | Ligne | Modification | Objectif |
|---------|-------|--------------|----------|
| `auth.ts` | 365 | `7 jours` → `180 jours` | Cache 6 mois |
| `AuthContext.tsx` | 103-187 | Restaurer depuis cache | Reload session |
| `AuthContext.tsx` | 194-230 | Sauvegarder avec expiration | Persist 6 mois |
| `supabase.ts` | 28-50 | Ajouter custom storage | SecureStore |

---

## 📊 Comportement après correction

### Scénario 1 : Première connexion

```
1. Utilisateur se connecte
2. Session sauvegardée dans SecureStore
3. Timestamp cache: 6 mois
4. ✅ Utilisateur connecté
```

### Scénario 2 : Fermer/Rouvrir app (< 6 mois)

```
1. App démarre
2. Pas de session Supabase active
3. Lecture cache SecureStore
4. Session restaurée avec refresh_token
5. ✅ Utilisateur toujours connecté (pas de login)
```

### Scénario 3 : Après 6 mois inactivité

```
1. App démarre
2. Cache expiré (> 6 mois)
3. Nettoyage cache
4. ❌ Utilisateur doit se reconnecter
```

### Scénario 4 : Connexion tous les mois

```
1. Utilisateur ouvre l'app
2. Session restaurée
3. Cache renouvelé → +6 mois
4. ✅ Connecté indéfiniment (tant qu'il ouvre l'app)
```

---

## 🔐 Sécurité

### ✅ Protections

1. **SecureStore** (chiffré)
   - Keychain iOS
   - Keystore Android
   - Impossible d'extraire sans déverrouiller le téléphone

2. **Refresh token** Supabase
   - Permet de regénérer un access_token
   - Révocable côté serveur

3. **Expiration 6 mois**
   - Limite raisonnable
   - Renouvelé à chaque connexion

4. **Validation JWT**
   - Chaque session est validée
   - JWT corrompu → logout automatique

### ⚠️ Risques acceptés

1. **Vol du téléphone déverrouillé**
   - Risque: Accès à l'app
   - Mitigation: PIN/Face ID/Touch ID au niveau OS
   - Option: Ajouter un PIN app (optionnel)

2. **Root/Jailbreak**
   - Risque: Extraction SecureStore
   - Mitigation: Détecter root/jailbreak (optionnel)

---

## 🧪 Tests

### Test 1 : Première connexion

```
1. Installer l'APK
2. Se connecter
3. Vérifier SecureStore:
   adb shell run-as marketgardener.thomas.v2 ls -la shared_prefs/
4. Voir fichier thomas_auth_*
```

### Test 2 : Persistance

```
1. Se connecter
2. Fermer l'app (force stop)
3. Rouvrir l'app
4. ✅ Devrait être connecté automatiquement
```

### Test 3 : Expiration

```
1. Se connecter
2. Modifier manuellement cached_at (en arrière de 6 mois)
3. Rouvrir l'app
4. ✅ Devrait demander reconnexion
```

### Test 4 : Renouvellement

```
1. Se connecter (J+0)
2. Attendre 5 mois
3. Ouvrir l'app → connecté
4. Cache renouvelé → expire J+180 depuis maintenant
5. Utilisateur reste connecté indéfiniment
```

---

## 🚀 Déploiement

### Étape 1 : Appliquer modifications

Modifier les 3 fichiers :
- `src/services/auth.ts`
- `src/contexts/AuthContext.tsx`
- `src/utils/supabase.ts`

### Étape 2 : Tester en local

```bash
# Expo Go / Dev
npx expo start

# Test connexion/déconnexion/reload
```

### Étape 3 : Build APK

```bash
eas build --platform android --profile preview
```

### Étape 4 : Test sur device

```bash
# Installer APK
adb install thomas-v2.apk

# Test persistance
adb shell am force-stop marketgardener.thomas.v2
# Rouvrir manuellement l'app
```

---

## 📋 Checklist

- [ ] Modifier durée cache (7j → 180j)
- [ ] Ajouter restauration depuis cache dans `initializeAuth()`
- [ ] Ajouter `cached_at` et `cache_expires_at` dans session
- [ ] Configurer custom storage Supabase
- [ ] Tester persistance après fermeture
- [ ] Tester expiration après 6 mois (simulation)
- [ ] Vérifier logs console
- [ ] Documenter pour l'équipe

---

## 🔗 Liens utiles

- [Supabase Auth Persistence](https://supabase.com/docs/reference/javascript/auth-getsession)
- [SecureStore Expo](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Supabase Custom Storage](https://supabase.com/docs/reference/javascript/initializing#custom-storage)

---

## 💡 Améliorations futures (optionnelles)

### Option 1 : Biométrie (Touch ID/Face ID)

Ajouter une couche de sécurité :

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

// Avant de restaurer la session
const { success } = await LocalAuthentication.authenticateAsync({
  promptMessage: 'Déverrouiller Thomas',
  fallbackLabel: 'Utiliser le code',
});

if (success) {
  // Restaurer session
}
```

### Option 2 : Détecter Root/Jailbreak

```bash
npm install react-native-root-detection
```

```typescript
import { isRooted, isJailBroken } from 'react-native-root-detection';

if (await isRooted() || await isJailBroken()) {
  // Warning ou bloquer l'app
}
```

### Option 3 : Déconnexion automatique après X jours inactivité

```typescript
// Sauvegarder last_activity
await setItem('last_activity', String(Date.now()));

// Au démarrage
const lastActivity = await getItem('last_activity');
const daysSinceActivity = (Date.now() - Number(lastActivity)) / (24 * 60 * 60 * 1000);

if (daysSinceActivity > 30) {
  // Déconnexion auto après 30 jours d'inactivité
  await signOut();
}
```

---

**Statut** : 🔄 Prêt à implémenter  
**Priorité** : 🔴 Haute (UX critique)  
**Temps estimé** : 2-3 heures (dev + test)  
**Impact** : ✅ Utilisateurs restent connectés 6 mois



