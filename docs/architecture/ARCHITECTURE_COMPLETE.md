# Thomas V2 - Architecture Complète et Cohérente

## 🎯 **Vision Générale**

Application mobile agricole française native avec chatbot IA intégré, gestion multi-utilisateur, et outils d'analyse sophistiqués pour maraîchers.

### **Principes Fondamentaux**
- **🇫🇷 Français Natif** : Pas de traduction, données française partout
- **🧠 IA Intégrée** : Chatbot au cœur de l'expérience
- **👥 Multi-Utilisateur** : Fermes partagées avec rôles
- **📱 Mobile First** : Optimisé pour terrain avec offline
- **🎯 Architecture Claire** : Une façon de faire chaque chose

---

## 🔐 **Système d'Authentication Unifié**

### **1. Méthodes de Connexion Supportées**

#### **Sign In Options**
```typescript
interface AuthOptions {
  email: {
    enabled: true;
    requireEmailVerification: true;
    passwordRequirements: "8+ chars, 1 number, 1 special";
  };
  google: {
    enabled: true;
    scopes: ["email", "profile"];
    autoCreateProfile: true;
  };
  apple: {
    enabled: true;
    scopes: ["email", "name"];
    autoCreateProfile: true;
  };
}
```

#### **Configuration Supabase Auth**
```sql
-- Auth providers setup
UPDATE auth.config SET 
  site_url = 'https://app.thomas-assistant.fr',
  jwt_expiry = 86400, -- 24 hours
  refresh_token_rotation = true,
  security_captcha_enabled = false, -- Pour développement
  external_google_enabled = true,
  external_apple_enabled = true;

-- Email templates en français
UPDATE auth.config SET
  mailer_template_invite = 'Vous êtes invité à rejoindre Thomas Assistant...',
  mailer_template_confirmation = 'Confirmez votre compte Thomas...',
  mailer_template_recovery = 'Réinitialiser votre mot de passe Thomas...';
```

#### **Gestion de Session Persistante**
```typescript
interface SessionManager {
  // Session persistante automatique
  autoRefresh: true;
  rememberUser: true; // Utilisateur reste connecté
  sessionDuration: "30 days";
  refreshThreshold: "24 hours";
  
  // Gestion offline
  offlineAuth: {
    cacheCredentials: true;
    allowOfflineAccess: "7 days";
    syncOnReconnect: true;
  };
}
```

### **2. Flux d'Authentification Unifié**

#### **Onboarding Flow**
```
📱 App Launch
    ↓
🔐 Auth Check
    ↓
┌─ Connected ─────────┐    ┌─ Not Connected ────┐
│ → Dashboard         │    │ → Welcome Screen    │
│ → Resume Session    │    │ → Sign In Options   │
└─────────────────────┘    │   • Email/Password  │
                           │   • Google          │
                           │   • Apple           │
                           └─────────────────────┘
                                   ↓
                           🏡 Farm Selection/Creation
                                   ↓
                           🚀 Main App
```

#### **Types d'Utilisateurs**
```typescript
enum UserRole {
  OWNER = "Owner",     // Propriétaire ferme
  MANAGER = "Manager", // Gestionnaire  
  EMPLOYEE = "Employee" // Employé/Ouvrier
}

interface User {
  id: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    language: "fr" | "en"; // Par défaut "fr"
  };
  currentFarm: Farm;
  farms: Farm[]; // Fermes accessibles
  role: UserRole; // Rôle dans la ferme courante
}
```

---

## 🏡 **Système de Fermes Multi-Utilisateur**

[Le reste du contenu du fichier original...]

---

**🎯 OBJECTIF**: Livrer Thomas V2 MVP fonctionnel en 21 jours avec architecture solide pour évolutions futures.


