# 🔐 Documentation - Système de Connexion et Authentification
## Application Thomas V2

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Flux de connexion](#flux-de-connexion)
4. [Composants principaux](#composants-principaux)
5. [Services d'authentification](#services-dauthentification)
6. [Gestion des sessions](#gestion-des-sessions)
7. [Initialisation de l'application](#initialisation-de-lapplication)
8. [Sécurité et stockage](#sécurité-et-stockage)
9. [Navigation post-connexion](#navigation-post-connexion)
10. [Gestion des erreurs](#gestion-des-erreurs)

---

## 🎯 Vue d'ensemble

Le système d'authentification de Thomas V2 est construit autour de **Supabase Auth** et suit une architecture en couches avec:

- **Écran de connexion unique** (`AuthScreens.tsx`) - Interface utilisateur
- **Contexte d'authentification** (`AuthContext.tsx`) - État global
- **Service d'authentification** (`auth.ts`) - Logique métier
- **Client Supabase** (`supabase.ts`) - Communication avec le backend

### Fonctionnalités supportées

✅ Connexion par email/mot de passe  
✅ Inscription avec prénom/nom  
✅ Connexion Google OAuth  
✅ Connexion Apple OAuth (préparée)  
✅ Réinitialisation de mot de passe  
✅ Gestion des sessions persistantes  
✅ Cache offline des credentials  
✅ Validation JWT automatique  
✅ Création automatique du profil utilisateur  

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                              │
│                    (Point d'entrée)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   SafeAreaProvider                           │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              AuthProvider                           │    │
│  │        (Gestion état authentification)              │    │
│  │                                                      │    │
│  │  ┌────────────────────────────────────────────┐   │    │
│  │  │            AppContent                       │   │    │
│  │  │      (Routage selon état auth)             │   │    │
│  │  │                                             │   │    │
│  │  │  SI loading:  LoadingScreen                │   │    │
│  │  │  SI !user:    AuthScreens                  │   │    │
│  │  │  SI user:     FarmProvider → AppMainContent│   │    │
│  │  └────────────────────────────────────────────┘   │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Dépendances

```typescript
import { supabase } from '@/utils/supabase';          // Client Supabase
import { authService } from '@/services/auth';        // Service métier
import { useAuth } from '@/contexts/AuthContext';     // Hook React
import * as SecureStore from 'expo-secure-store';     // Stockage sécurisé
```

---

## 🔄 Flux de connexion

### 1. Connexion par Email

```
[Utilisateur]
    │
    │ Saisit email + mot de passe
    ▼
[AuthScreens]
    │
    │ handleSignInEmail()
    ▼
[authService.signInWithEmail()]
    │
    │ Appel Supabase Auth
    ▼
[Supabase Backend]
    │
    │ Validation credentials
    ▼
[Retour Session + User]
    │
    ├─► Cache dans SecureStore
    │
    ├─► Mise à jour AuthContext
    │
    ├─► Création profil dans public.profiles
    │
    └─► Redirection vers FarmProvider
```

### 2. Connexion Google OAuth

```
[Utilisateur]
    │
    │ Clic "Continuer avec Google"
    ▼
[AuthScreens]
    │
    │ handleGoogle()
    ▼
[authService.signInWithGoogle()]
    │
    │ Détection plateforme (web/mobile)
    ▼
[Supabase OAuth Flow]
    │
    │ Redirection Google
    │ • Web: window.location.href
    │ • Mobile: thomasv2://auth/callback
    ▼
[Google Authentification]
    │
    │ Utilisateur accepte
    ▼
[Callback URL]
    │
    │ Supabase récupère token
    ▼
[Session créée automatiquement]
    │
    └─► Même flux que connexion email
```

### 3. Inscription

```
[Utilisateur]
    │
    │ Remplit formulaire
    │ • Email
    │ • Mot de passe
    │ • Prénom
    │ • Nom
    ▼
[AuthScreens]
    │
    │ handleSignUp()
    ▼
[authService.signUp()]
    │
    │ Crée compte Supabase avec metadata
    ▼
[Supabase Backend]
    │
    │ Envoi email de confirmation
    ▼
[Message de succès]
    │
    │ "Vérifiez votre email..."
    └─► Utilisateur doit confirmer
```

---

## 🧩 Composants principaux

### 1. AuthScreens (`src/screens/AuthScreens.tsx`)

**Rôle**: Interface utilisateur unique pour connexion/inscription

**États gérés**:
```typescript
type AuthMode = 'signin' | 'signup';

const [mode, setMode] = useState<AuthMode>('signin');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [loading, setLoading] = useState(false);
const [message, setMessage] = useState<string | null>(null);
const [error, setError] = useState<string | null>(null);
```

**Méthodes principales**:
- `handleSignInEmail()` - Connexion par email
- `handleSignUp()` - Inscription
- `handleGoogle()` - OAuth Google
- `handleResetPassword()` - Réinitialisation mot de passe

**Interface**:
```
┌─────────────────────────────────────┐
│         🌾 Thomas V2                │
│   Assistant agricole intelligent    │
├─────────────────────────────────────┤
│                                     │
│  📧 Email professionnel             │
│  [vous@ferme.fr____________]        │
│                                     │
│  🔒 Mot de passe                    │
│  [••••••••••••••••••____]           │
│                                     │
│  [  Se connecter  ]                 │
│  [  Continuer avec Google  ]        │
│                                     │
│  Mot de passe oublié ?              │
│                                     │
│  Pas encore de compte ?             │
│  Créer un compte                    │
└─────────────────────────────────────┘
```

### 2. LoadingScreen (`src/screens/LoadingScreen.tsx`)

**Rôle**: Écran de chargement pendant l'initialisation

**Props**:
```typescript
interface LoadingScreenProps {
  onLoadingComplete: () => void;
  currentStep?: string;
  progress?: number;
}
```

**Étapes affichées**:
1. "Vérification de la connexion..." (0-50%)
2. "Chargement de vos fermes..." (50-100%)

### 3. FarmSetupScreen (`src/screens/FarmSetupScreen.tsx`)

**Rôle**: Création de la première ferme (si aucune n'existe)

**Déclenchement**: `needsSetup = true` dans `FarmContext`

**Formulaire**:
- Nom de la ferme (requis)
- Description (optionnel)
- Type de ferme (maraîchage, arboriculture, etc.)

---

## ⚙️ Services d'authentification

### AuthService (`src/services/auth.ts`)

**Interface complète**:
```typescript
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

  // Support offline
  cacheCredentials(user: User, session: Session): Promise<void>;
  getCachedUser(): Promise<User | null>;
  clearCache(): Promise<void>;
}
```

**Fonctionnalités clés**:

#### 1. Mapping des erreurs Supabase
```typescript
private mapSupabaseError(error: any): AuthError {
  const errorMap = {
    'Invalid login credentials': 'Email ou mot de passe incorrect',
    'Email not confirmed': 'Veuillez confirmer votre email',
    'User already registered': 'Cet email est déjà utilisé',
    // ... autres mappings
  };
  return { code: error.error_code, message: errorMap[error.message] };
}
```

#### 2. Création automatique du profil
```typescript
private async ensureProfileForSupabaseUser(supabaseUser: any) {
  // Vérifie si profil existe dans public.profiles
  // Si non → crée avec first_name, last_name, email
  // Si oui → met à jour si besoin
}
```

#### 3. Cache offline
```typescript
async cacheCredentials(user: User, session: Session) {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 jours
  
  if (isWeb) {
    localStorage.setItem('thomas_auth_user', JSON.stringify(user));
  } else {
    await SecureStore.setItemAsync('thomas_auth_user', JSON.stringify(user));
  }
}
```

### AuthContext (`src/contexts/AuthContext.tsx`)

**Rôle**: Contexte React global pour l'état d'authentification

**État exposé**:
```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, profile: Profile) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  clearCorruptedSession: () => Promise<void>;
}
```

**Hook d'utilisation**:
```typescript
const { user, loading, signIn, signOut } = useAuth();
```

---

## 🔒 Gestion des sessions

### 1. Initialisation au démarrage

```typescript
useEffect(() => {
  const initializeAuth = async () => {
    // 1. Récupérer la session existante
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setLoading(false);
      return;
    }
    
    // 2. Valider le JWT avec timeout (120s)
    const { data: { user }, error } = await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 120000)
      )
    ]);
    
    // 3. Nettoyer si JWT corrompu
    if (error?.message?.includes('JWT does not exist')) {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      return;
    }
    
    // 4. Restaurer session valide
    setSession(session);
    setUser(user);
    
    // 5. Créer profil si nécessaire
    await ensureProfileForUser(user);
  };
  
  initializeAuth();
}, []);
```

### 2. Écoute des changements d'état

```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth state changed:', event);
  
  setSession(session);
  setUser(session?.user ?? null);
  
  // Créer profil pour nouvel utilisateur
  if (session?.user) {
    await ensureProfileForUser(session.user);
  }
  
  // Sauvegarder dans SecureStore (limite 2048 bytes)
  if (session) {
    const essentialSession = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user_id: session.user?.id
    };
    await setItem('supabase-session', JSON.stringify(essentialSession));
  } else {
    await deleteItem('supabase-session');
  }
});
```

### 3. Rafraîchissement automatique

Supabase gère automatiquement le rafraîchissement du token avec:
```typescript
auth: {
  autoRefreshToken: true,
  persistSession: true,
}
```

---

## 🚀 Initialisation de l'application

### Séquence de démarrage complète

```
1. App.tsx
   └─► Render SafeAreaProvider
       └─► Render AuthProvider
           │
           ├─► Initialise AuthContext
           │   ├─► Récupère session Supabase
           │   ├─► Valide JWT
           │   └─► Charge utilisateur
           │
           └─► Render AppContent
               │
               ├─► SI loading = true
               │   └─► Affiche LoadingScreen
               │       "Vérification de la connexion..."
               │
               ├─► SI loading = false && !user
               │   └─► Affiche AuthScreens
               │       (Écran de connexion)
               │
               └─► SI loading = false && user
                   └─► Render FarmProvider
                       │
                       ├─► Initialise FarmContext
                       │   ├─► Charge fermes de l'utilisateur
                       │   └─► Sélectionne ferme active
                       │
                       └─► Render AppMainContent
                           │
                           ├─► SI FarmContext.loading
                           │   └─► LoadingScreen
                           │       "Chargement de vos fermes..."
                           │
                           ├─► SI FarmContext.error
                           │   └─► Écran d'erreur + Bouton réessayer
                           │
                           ├─► SI needsSetup = true
                           │   └─► FarmSetupScreen
                           │       (Création première ferme)
                           │
                           └─► SI tout est prêt
                               └─► NavigationProvider
                                   └─► NewSimpleNavigator
                                       (Application principale)
```

### Timing et performance

| Étape | Durée moyenne | Timeout |
|-------|---------------|---------|
| Récupération session | 100-500ms | - |
| Validation JWT | 500-2000ms | 120s |
| Chargement fermes | 500-3000ms | 120s |
| **Total** | **1-5s** | **240s** |

---

## 🔐 Sécurité et stockage

### 1. Stockage des credentials

**Mobile (React Native)**:
```typescript
import * as SecureStore from 'expo-secure-store';

// Stockage chiffré dans le Keychain/Keystore
await SecureStore.setItemAsync('thomas_auth_user', JSON.stringify(user));
```

**Web**:
```typescript
// Fallback sur localStorage (moins sécurisé)
localStorage.setItem('thomas_auth_user', JSON.stringify(user));
```

### 2. Limitation de taille (SecureStore)

**Problème**: SecureStore a une limite de **2048 bytes**

**Solution**: Ne stocker que les données essentielles
```typescript
const essentialSession = {
  access_token: session.access_token,
  refresh_token: session.refresh_token,
  expires_at: session.expires_at,
  expires_in: session.expires_in,
  token_type: session.token_type,
  user_id: session.user?.id
};
// ✅ Taille réduite, pas de user_metadata complet
```

### 3. Validation JWT

Détection et nettoyage des sessions corrompues:
```typescript
if (error?.message?.includes('User from sub claim in JWT does not exist')) {
  console.error('🚨 Session JWT corrompue - nettoyage');
  await supabase.auth.signOut();
  await clearCorruptedSession();
}
```

### 4. Création du profil applicatif

**Automatique** après connexion/inscription:
```typescript
const ensureProfileForUser = async (supabaseUser: User) => {
  // 1. Vérifier si profil existe dans public.profiles
  const { data } = await DirectSupabaseService.directSelect(
    'profiles',
    'id',
    [{ column: 'id', value: supabaseUser.id }],
    true
  );
  
  // 2. Créer si inexistant
  if (!data) {
    await DirectSupabaseService.directInsert('profiles', {
      id: supabaseUser.id,
      email: supabaseUser.email,
      first_name: supabaseUser.user_metadata?.first_name,
      last_name: supabaseUser.user_metadata?.last_name,
    });
  }
};
```

---

## 🧭 Navigation post-connexion

### Structure de navigation

```
Utilisateur connecté
    │
    └─► FarmProvider
        │
        ├─► Pas de ferme (needsSetup = true)
        │   └─► FarmSetupScreen
        │       └─► Après création
        │           └─► Recharge FarmContext
        │               └─► Redirige vers app principale
        │
        └─► Ferme active disponible
            └─► NavigationProvider
                └─► NewSimpleNavigator
                    │
                    ├─► Bottom Tabs
                    │   ├─► Statistiques
                    │   ├─► Tâches
                    │   ├─► Chat (défaut)
                    │   └─► Profil
                    │
                    └─► Screens secondaires
                        ├─► Settings
                        ├─► PlotsSettings
                        ├─► MaterialsSettings
                        ├─► FarmMembers
                        └─► Documents
```

### Écran par défaut

```typescript
const [activeTab, setActiveTab] = useState<TabName>('Chat');
```

L'application s'ouvre sur le **Chat** (Assistant IA) par défaut.

### Gestion du bouton retour

```typescript
const goBack = () => {
  const newHistory = [...navigationHistory];
  newHistory.pop(); // Retirer écran actuel
  
  const previousScreen = newHistory[newHistory.length - 1] || 'Chat';
  setCurrentScreen(previousScreen);
  setNavigationHistory(newHistory);
};
```

---

## ⚠️ Gestion des erreurs

### 1. Erreurs de connexion

**Types d'erreurs**:
```typescript
interface AuthError {
  code: string;
  message: string;
  details?: any;
}
```

**Mapping français**:
```typescript
const errorMap = {
  'Invalid login credentials': 'Email ou mot de passe incorrect',
  'Email not confirmed': 'Veuillez confirmer votre email',
  'User already registered': 'Cet email est déjà utilisé',
  'Rate limit exceeded': 'Trop de tentatives. Patientez.',
  'network_error': 'Problème de connexion réseau',
  'google_auth_cancelled': 'Connexion Google annulée',
};
```

### 2. Affichage dans l'interface

```typescript
{error && (
  <View style={{ marginTop: spacing.md }}>
    <Text variant="error">{error}</Text>
  </View>
)}

{message && (
  <View style={{ marginTop: spacing.md }}>
    <Text variant="success">{message}</Text>
  </View>
)}
```

### 3. Gestion des timeouts

**Validation JWT** (120s):
```typescript
const { data: { user }, error } = await Promise.race([
  supabase.auth.getUser(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), 120000)
  )
]);
```

**Fallback**: Utiliser la session locale même si la validation échoue

### 4. Mode debug

**Triple-tap** en développement pour ouvrir:
```typescript
const handleDebugTap = () => {
  tapCount++;
  if (tapCount >= 3) {
    setShowDebug(true);
  }
};
```

Affiche:
- État de l'authentification
- Informations de session
- Logs détaillés
- Tests de connectivité

---

## 📝 Configuration Supabase

### Variables d'environnement requises

**Fichier `.env`**:
```bash
# Supabase Configuration (Client-side)
EXPO_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...votre-clé-publique

# OAuth Configuration
EXPO_PUBLIC_GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
```

### Configuration OAuth

**Google OAuth**:
1. Google Cloud Console → Credentials
2. OAuth 2.0 Client IDs
3. Redirect URIs:
   - Web: `https://votre-projet.supabase.co/auth/v1/callback`
   - Mobile: `thomasv2://auth/callback`

**Supabase Dashboard**:
1. Authentication → Providers
2. Activer Google
3. Saisir Client ID et Client Secret
4. Redirect URLs:
   - Web: `window.location.href` (auto)
   - Mobile: `thomasv2://auth/callback`

---

## 🧪 Tests

### Écran de test Supabase

**Accès**: `SupabaseTestScreen.tsx`

**Tests disponibles**:
1. ✅ Test connexion database
2. ✅ Test authentification email
3. ✅ Test signup/login
4. ✅ Test récupération session

**Utilisation**:
```typescript
// À intégrer temporairement dans la navigation
import SupabaseTestScreen from './src/screens/SupabaseTestScreen';

// Dans le navigateur
<SupabaseTestScreen />
```

### Mode test avec AuthContext

**Fichier**: `AuthContext.test.tsx`

Connexion automatique avec utilisateur mock:
```typescript
const mockUser: User = {
  id: 'test-user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
};

// Connecté automatiquement après 1s
```

---

## 📊 Diagramme de flux complet

```
┌─────────────────────────────────────────────────────────────┐
│                      DÉMARRAGE APP                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │   SafeAreaProvider     │
          └────────────┬───────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │     AuthProvider       │
          │  (useEffect mount)     │
          └────────────┬───────────┘
                       │
                       ▼
          ┌─────────────────────────────────┐
          │  initializeAuth()               │
          │  • getSession()                 │
          │  • validate JWT                 │
          │  • ensureProfileForUser()       │
          └────────────┬────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    loading = true            loading = false
         │                           │
         ▼                           ▼
┌──────────────────┐      ┌──────────────────────┐
│  LoadingScreen   │      │  user === null?      │
│  "Vérification"  │      └──────┬───────┬───────┘
└──────────────────┘             │       │
                                OUI     NON
                                 │       │
                                 ▼       ▼
                        ┌───────────┐ ┌────────────────┐
                        │AuthScreens│ │  FarmProvider  │
                        │           │ └───────┬────────┘
                        │• Signin   │         │
                        │• Signup   │         ▼
                        │• Google   │ ┌──────────────────┐
                        │• Reset    │ │ initializeFarms()│
                        └───────────┘ │ • loadUserFarms  │
                                      │ • setActiveFarm  │
                                      └────────┬─────────┘
                                               │
                                    ┌──────────┴──────────┐
                                    │                     │
                              needsSetup?            loading?
                                    │                     │
                                   OUI                   OUI
                                    │                     │
                                    ▼                     ▼
                          ┌─────────────────┐  ┌──────────────────┐
                          │FarmSetupScreen  │  │  LoadingScreen   │
                          │"Créer ferme"    │  │"Chargement..."   │
                          └─────────────────┘  └──────────────────┘
                                    │
                                    │ (après création)
                                    │
                                    ▼
                          ┌─────────────────────────┐
                          │   NavigationProvider    │
                          │   NewSimpleNavigator    │
                          │                         │
                          │  ┌──────────────────┐  │
                          │  │  Bottom Tabs      │  │
                          │  │  • Statistics     │  │
                          │  │  • Tâches         │  │
                          │  │  • Chat (défaut)  │  │
                          │  │  • Profil         │  │
                          │  └──────────────────┘  │
                          └─────────────────────────┘
```

---

## 🎓 Exemples d'utilisation

### 1. Vérifier si l'utilisateur est connecté

```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  if (!user) return <AuthScreens />;
  
  return <div>Bienvenue {user.firstName}</div>;
}
```

### 2. Se connecter

```typescript
import { useAuth } from '@/contexts/AuthContext';

function LoginForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleLogin = async () => {
    const { error } = await signIn(email, password);
    if (error) {
      Alert.alert('Erreur', error);
    }
  };
  
  return (
    <View>
      <Input value={email} onChangeText={setEmail} />
      <Input value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Se connecter" onPress={handleLogin} />
    </View>
  );
}
```

### 3. Se déconnecter

```typescript
import { useAuth } from '@/contexts/AuthContext';

function ProfileScreen() {
  const { signOut, user } = useAuth();
  
  const handleLogout = async () => {
    await signOut();
    // Redirection automatique vers AuthScreens
  };
  
  return (
    <View>
      <Text>Connecté en tant que {user?.email}</Text>
      <Button title="Se déconnecter" onPress={handleLogout} />
    </View>
  );
}
```

### 4. Utiliser le service directement

```typescript
import { authService } from '@/services/auth';

// Récupérer l'utilisateur actuel
const user = await authService.getCurrentUser();

// Récupérer la session
const session = await authService.getSession();

// Rafraîchir la session
const newSession = await authService.refreshSession();

// Écouter les changements
const unsubscribe = authService.onAuthStateChanged((user) => {
  console.log('User changed:', user);
});

// Se désabonner
unsubscribe();
```

---

## 🔧 Dépannage

### Problème: "Session JWT corrompue"

**Symptôme**: Écran de connexion en boucle

**Solution**:
```typescript
const { clearCorruptedSession } = useAuth();
await clearCorruptedSession();
```

### Problème: "SecureStore size limit exceeded"

**Symptôme**: Erreur lors de la sauvegarde de la session

**Solution**: Vérifier que seules les données essentielles sont stockées
```typescript
// ❌ Ne pas stocker
await SecureStore.setItemAsync('session', JSON.stringify(fullSession));

// ✅ Stocker uniquement l'essentiel
const essentialSession = {
  access_token: session.access_token,
  refresh_token: session.refresh_token,
  expires_at: session.expires_at,
};
await SecureStore.setItemAsync('session', JSON.stringify(essentialSession));
```

### Problème: Timeout initialisation

**Symptôme**: LoadingScreen bloqué

**Solution**: Augmenter le timeout ou utiliser le fallback
```typescript
// Dans AuthContext.tsx, ligne 138
setTimeout(() => reject(new Error('Timeout')), 120000) // 120s
```

### Problème: OAuth ne fonctionne pas sur mobile

**Solution**: Vérifier le schéma de redirection
```typescript
// app.json
{
  "expo": {
    "scheme": "thomasv2"
  }
}

// Supabase Dashboard → Authentication → URL Configuration
// Redirect URLs: thomasv2://auth/callback
```

---

## 📚 Ressources

### Documentation Supabase
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [OAuth Providers](https://supabase.com/docs/guides/auth/social-login)
- [JWT Validation](https://supabase.com/docs/guides/auth/sessions)

### Documentation React Native
- [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/)
- [Deep Linking](https://reactnavigation.org/docs/deep-linking/)

### Fichiers clés du projet
- `App.tsx` - Point d'entrée
- `src/screens/AuthScreens.tsx` - Interface connexion
- `src/contexts/AuthContext.tsx` - État global
- `src/services/auth.ts` - Logique métier
- `src/utils/supabase.ts` - Client Supabase
- `src/screens/LoadingScreen.tsx` - Écran chargement
- `src/screens/FarmSetupScreen.tsx` - Setup initial

---

## ✅ Checklist de validation

### Fonctionnalités
- [ ] Connexion par email/mot de passe
- [ ] Inscription avec prénom/nom
- [ ] Connexion Google OAuth
- [ ] Réinitialisation mot de passe
- [ ] Déconnexion
- [ ] Persistance de session
- [ ] Validation JWT au démarrage
- [ ] Création automatique du profil
- [ ] Gestion des timeouts
- [ ] Messages d'erreur en français

### Sécurité
- [ ] Credentials stockés dans SecureStore (mobile)
- [ ] Session limitée à 2048 bytes
- [ ] Nettoyage des sessions corrompues
- [ ] Validation JWT avant utilisation
- [ ] Rafraîchissement automatique du token

### UX
- [ ] Loading screen pendant initialisation
- [ ] Messages d'erreur clairs
- [ ] Confirmation visuelle des actions
- [ ] Navigation fluide post-connexion
- [ ] Mode debug accessible en dev

---

## 📞 Support

Pour toute question sur le système d'authentification:

1. Vérifier cette documentation
2. Consulter les logs de l'AuthProvider
3. Utiliser le mode debug (triple-tap en dev)
4. Tester avec SupabaseTestScreen
5. Vérifier la configuration Supabase Dashboard

**Logs importants**:
```typescript
console.log('🔍 [AUTH] Initialisation...');
console.log('✅ [AUTH] Session trouvée');
console.log('✅ [AUTH] Utilisateur validé:', user.email);
console.log('🚨 [AUTH] Session JWT corrompue');
console.log('❌ [AUTH] Erreur initialisation:', error);
```

---

**Document généré le**: 6 janvier 2026  
**Version de l'application**: Thomas V2  
**Dernière mise à jour**: Migration 023 (fix temporal context)

