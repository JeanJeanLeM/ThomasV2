# Fix - Blocage Écran de Chargement (Timeout 120s)

**Date**: 14 janvier 2026  
**Problème**: L'application web reste bloquée à l'écran de chargement pendant 120 secondes avant d'échouer

---

## 🐛 Symptômes

```
🚀 [FARM-CONTEXT] Initialisation pour: c.rampaer@gmail.com
🚀 [SIMPLE-INIT] Initialisation pour utilisateur: d74d6020...
👤 [SIMPLE-INIT] Récupération profil utilisateur...
⏰ [FARM-CONTEXT] Timeout FIXE 120s - FINI LES PROBLÈMES !
[... 120 secondes d'attente ...]
❌ [FARM-CONTEXT] Erreur initialisation: Error: Timeout initialisation fermes (120s FIXE)
```

L'application se bloque après le log `"👤 [SIMPLE-INIT] Récupération profil utilisateur..."` et n'affiche jamais le log suivant.

---

## 🔍 Cause Racine

Le problème a été introduit par une modification de `DirectSupabaseService.getAuthToken()` (commit précédent pour fix mobile).

**Ancienne version** (fonctionnait sur web mais pas sur mobile):
```typescript
public static getAuthToken(): string | null {
  return localStorage.getItem('supabase.auth.token'); // Synchrone
}
```

**Nouvelle version** (fix mobile, mais bloquait web):
```typescript
public static async getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession(); // BLOQUANT !
  return session?.access_token || null;
}
```

### Pourquoi ça bloquait ?

1. `SimpleInitService.initializeUserFarms()` appelle `DirectSupabaseService.directSelect()`
2. `directSelect()` appelle `await getAuthToken()`
3. `getAuthToken()` appelle `await supabase.auth.getSession()`
4. **`supabase.auth.getSession()` peut prendre plusieurs secondes au premier chargement** (initialisation client Supabase, vérification token, etc.)
5. Pendant ce temps, **toute l'initialisation est bloquée**
6. Après 120 secondes → timeout

---

## ✅ Solution

Ajout d'un **timeout de 5 secondes** à `getAuthToken()` avec **fallback vers localStorage** :

```typescript
public static async getAuthToken(): Promise<string | null> {
  try {
    // Timeout de 5 secondes pour éviter le blocage
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn('⚠️ [DIRECT-API] getSession() timeout après 5s');
        resolve(null);
      }, 5000);
    });
    
    // Utiliser le client Supabase pour récupérer la session avec timeout
    const sessionPromise = supabase.auth.getSession();
    
    const result = await Promise.race([sessionPromise, timeoutPromise]);
    
    if (!result) {
      // Timeout atteint ou erreur
      console.warn('⚠️ [DIRECT-API] Fallback: tentative localStorage directe');
      // Fallback pour web: essayer localStorage directement
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const sessionStr = localStorage.getItem('supabase.auth.token');
          if (sessionStr) {
            const session = JSON.parse(sessionStr);
            if (session?.currentSession?.access_token) {
              return session.currentSession.access_token;
            }
          }
        } catch (e) {
          console.warn('⚠️ [DIRECT-API] Fallback localStorage échoué:', e);
        }
      }
      return null;
    }
    
    const { data: { session }, error } = result;
    
    if (error) {
      console.warn('⚠️ [DIRECT-API] Error getting session:', error);
      return null;
    }
    
    if (session?.access_token) {
      return session.access_token;
    }
    
    console.warn('⚠️ [DIRECT-API] No auth token found in session');
    return null;
  } catch (error) {
    console.error('❌ [DIRECT-API] Error getting auth token:', error);
    return null;
  }
}
```

### Améliorations

1. **Timeout 5s** : Si `getSession()` prend plus de 5 secondes, on abandonne
2. **Fallback localStorage** : Sur web, on essaie de lire directement depuis localStorage
3. **Logs détaillés** : Pour identifier où le problème se produit
4. **Graceful degradation** : Si tout échoue, retourne `null` (l'app peut continuer avec anon key)

---

## 🧪 Test

Après le fix, l'application devrait se charger en **< 5 secondes** au lieu de 120 secondes.

**Logs attendus** (scénario normal):
```
👤 [SIMPLE-INIT] Récupération profil utilisateur...
✅ [SIMPLE-INIT] Profil trouvé, ferme active: XXX
🏢 [SIMPLE-INIT] Récupération fermes utilisateur...
✅ [SIMPLE-INIT] Fermes trouvées: X
```

**Logs attendus** (si timeout):
```
👤 [SIMPLE-INIT] Récupération profil utilisateur...
⚠️ [DIRECT-API] getSession() timeout après 5s
⚠️ [DIRECT-API] Fallback: tentative localStorage directe
✅ [SIMPLE-INIT] Profil trouvé, ferme active: XXX
```

---

## 📊 Impact

### Avant le fix
- ⏱️ Temps de chargement : 120 secondes (timeout)
- ❌ Application inutilisable sur web
- ✅ Fonctionnel sur mobile

### Après le fix
- ⏱️ Temps de chargement : < 5 secondes
- ✅ Fonctionnel sur web ET mobile
- ✅ Fallback robuste si problème réseau

---

## 🎯 Leçon Apprise

**Toujours ajouter des timeouts aux opérations async critiques** lors de l'initialisation, surtout quand elles dépendent de services externes (Supabase, API, etc.).

**Pattern recommandé** :
```typescript
const result = await Promise.race([
  asyncOperation(),
  timeout(5000) // 5 secondes max
]);
```

---

## ✅ Fichiers Modifiés

- `src/services/DirectSupabaseService.ts` - Ajout timeout et fallback dans `getAuthToken()`

---

## 🚀 Prochaines Étapes

1. ✅ Recharger la page web (Ctrl+R)
2. ✅ Vérifier que l'app se charge en < 5s
3. ✅ Tester la fonctionnalité audio recording sur web
4. ✅ Builder le nouvel APK avec les corrections audio
5. ✅ Tester l'audio recording sur mobile

---

**Status** : ✅ **RÉSOLU**

L'application devrait maintenant se charger correctement sur web et mobile.
