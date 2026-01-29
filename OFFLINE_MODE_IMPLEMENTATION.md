# Mode Offline - Implémentation Complète

**Date**: 2026-01-14  
**Version**: 1.0  
**Statut**: ✅ IMPLÉMENTATION TERMINÉE

---

## 📋 Vue d'Ensemble

Système complet permettant à l'application de fonctionner sans connexion Internet :
- Enregistrement local des messages texte et audios
- Affichage des éléments en attente d'analyse/transcription
- Synchronisation automatique ou manuelle une fois la connexion retrouvée
- Détection de la connexion réseau en temps réel

---

## 🏗️ Architecture

### Flux de Données

```
Message/Audio Utilisateur
    ↓
Vérification Connexion (NetworkService)
    ↓
┌─────────────────┬─────────────────┐
│   Online        │   Offline        │
│   ↓             │   ↓              │
│ Envoi Direct    │ Queue Locale     │
│ Serveur         │ (AsyncStorage)   │
│                 │                  │
│                 │ Audio →          │
│                 │ Filesystem       │
│                 │ (expo-file-system)│
└─────────────────┴─────────────────┘
                    ↓
            Affichage "En Attente"
                    ↓
        Connexion Retrouvée
                    ↓
        Synchronisation Auto/Manuelle
                    ↓
        Upload → Transcription → Analyse IA
```

---

## 📦 Composants Créés

### 1. NetworkService
**Fichier**: `src/services/NetworkService.ts`

**Fonctionnalités**:
- Détection de l'état de la connexion (online/offline)
- Écoute des changements de connexion
- Test de connectivité réelle (ping serveur Supabase)

**Méthodes principales**:
```typescript
static async getStatus(): Promise<NetworkStatus>
static subscribe(callback: (status: NetworkStatus) => void): () => void
static async testConnection(): Promise<boolean>
static async isOnline(): Promise<boolean>
```

### 2. OfflineQueueService
**Fichier**: `src/services/OfflineQueueService.ts`

**Fonctionnalités**:
- Stockage des messages en attente (AsyncStorage)
- Gestion de l'ordre de traitement (FIFO)
- Gestion des statuts (pending, processing, failed)
- Retry automatique avec limite

**Structure de données**:
```typescript
interface PendingMessage {
  id: string;
  type: 'text' | 'audio';
  session_id: string;
  user_id: string;
  farm_id: number;
  content?: string;
  audio_uri?: string;
  audio_metadata?: AudioMetadata;
  created_at: number;
  status: 'pending' | 'processing' | 'failed';
  retry_count: number;
  error?: string;
}
```

### 3. AudioStorageService
**Fichier**: `src/services/AudioStorageService.ts`

**Fonctionnalités**:
- Sauvegarde des fichiers audio dans un répertoire persistant
- Génération de noms de fichiers uniques
- Nettoyage automatique des fichiers anciens (7 jours)
- Gestion de l'espace de stockage

**Utilise**: `expo-file-system`

### 4. SyncService
**Fichier**: `src/services/SyncService.ts`

**Fonctionnalités**:
- Traitement de la queue locale quand connexion disponible
- Upload des audios vers Supabase Storage
- Envoi des messages texte
- Transcription automatique des audios
- Analyse IA des messages
- Gestion des erreurs et retry
- Callback de progression

**Méthodes principales**:
```typescript
static async syncPendingItems(): Promise<SyncResult>
static async syncMessage(message: PendingMessage): Promise<boolean>
static async retryFailedItems(): Promise<SyncResult>
static setProgressCallback(callback: (progress: SyncProgress) => void): void
```

### 5. Hooks React

#### useNetworkStatus
**Fichier**: `src/hooks/useNetworkStatus.ts`

**Retourne**:
```typescript
{
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  isLoading: boolean;
}
```

#### useOfflineQueue
**Fichier**: `src/hooks/useOfflineQueue.ts`

**Retourne**:
```typescript
{
  messages: PendingMessage[];
  stats: OfflineQueueStats;
  isLoading: boolean;
  refreshQueue: () => Promise<void>;
  removeMessage: (id: string) => Promise<void>;
  retryMessage: (id: string) => Promise<void>;
}
```

### 6. Composants UI

#### OfflineIndicator
**Fichier**: `src/components/OfflineIndicator.tsx`

**Fonctionnalités**:
- Bandeau en haut de l'écran si offline
- Affichage du nombre d'éléments en attente
- Bouton "Synchroniser maintenant" si connexion disponible
- Indicateur de synchronisation en cours

#### PendingMessagesList
**Fichier**: `src/components/PendingMessagesList.tsx`

**Fonctionnalités**:
- Affichage des messages/audios en attente dans le chat
- Indicateur visuel "En attente de synchronisation"
- Bouton "Réessayer" pour les éléments échoués
- Animation pendant le traitement
- Affichage de la date/heure de création

---

## 🔧 Modifications des Services Existants

### ChatConversation.tsx

**Modifications**:
1. ✅ Vérification de la connexion avant d'envoyer un message texte
2. ✅ Si offline → ajout à la queue locale avec notification
3. ✅ Vérification de la connexion avant d'uploader un audio
4. ✅ Si offline → sauvegarde audio localement + ajout à la queue
5. ✅ Affichage des messages en attente dans la liste
6. ✅ Synchronisation automatique quand la connexion revient
7. ✅ Intégration de `OfflineIndicator` et `PendingMessagesList`

**Code ajouté**:
- Imports des services et hooks offline
- Vérification `NetworkService.isOnline()` dans `sendMessage()` et `sendAudioMessage()`
- Logique de sauvegarde locale si offline
- `useEffect` pour synchronisation automatique
- Composants UI dans le rendu

### MediaService.ts

**Aucune modification nécessaire** : La gestion offline est faite dans `ChatConversation` avant d'appeler `uploadAudioFile()`.

### AIChatService.ts

**Aucune modification nécessaire** : Les erreurs réseau sont gérées dans `SyncService` avec try-catch.

---

## 🎯 Flux Utilisateur

### Scénario 1: Message Texte Offline

1. Utilisateur tape un message
2. App détecte offline → sauvegarde locale
3. Message affiché avec badge "En attente"
4. Connexion retrouvée → synchronisation automatique (2s après reconnexion)
5. Message envoyé → badge retiré

### Scénario 2: Audio Offline

1. Utilisateur enregistre un audio
2. App détecte offline → sauvegarde fichier + métadonnées
3. Audio affiché avec badge "En attente de transcription"
4. Connexion retrouvée → upload → transcription → analyse
5. Résultats affichés → badge retiré

### Scénario 3: Synchronisation Manuelle

1. Utilisateur clique "Synchroniser maintenant" dans `OfflineIndicator`
2. App vérifie connexion
3. Si connecté → traitement de la queue avec progression
4. Notification de succès/échec

---

## 💾 Stockage Local

### AsyncStorage

**Clés utilisées**:
- `@thomas_offline_queue`: Array de `PendingMessage[]`

**Structure**:
```typescript
[
  {
    id: "offline_1234567890_abc123",
    type: "text" | "audio",
    session_id: "chat-uuid",
    user_id: "user-uuid",
    farm_id: 16,
    content?: "Message texte",
    audio_uri?: "file://...",
    audio_metadata?: {...},
    created_at: 1234567890,
    status: "pending" | "processing" | "failed",
    retry_count: 0,
    error?: "Message d'erreur"
  }
]
```

### Filesystem (expo-file-system)

**Répertoire**: `${FileSystem.documentDirectory}offline_audios/`

**Format fichiers**: `audio_{timestamp}_{randomId}.{extension}`

**Nettoyage automatique**: Fichiers > 7 jours supprimés automatiquement

---

## 🔄 Synchronisation

### Automatique

- Déclenchée 2 secondes après la reconnexion
- Traite tous les messages en attente (pending)
- Ne bloque pas l'UI (traitement en arrière-plan)
- Rafraîchit la queue après traitement

### Manuelle

- Bouton "Synchroniser" dans `OfflineIndicator`
- Traite tous les messages (pending + failed)
- Affiche la progression
- Notification de résultat

### Ordre de Traitement

1. Messages texte (plus rapides)
2. Messages audio (upload + transcription + analyse)
3. FIFO (premier ajouté = premier traité)

---

## ⚠️ Gestion des Erreurs

### Erreurs Réseau

- **Timeout**: Retry avec backoff (max 3 tentatives)
- **Erreur upload**: Marquer comme failed, permettre retry manuel
- **Erreur transcription**: Marquer comme failed, afficher message d'erreur
- **Erreur analyse IA**: Non bloquant, message envoyé quand même

### États des Messages

- **pending**: En attente de traitement
- **processing**: En cours de synchronisation
- **failed**: Échec (avec message d'erreur)

### Retry

- Maximum 3 tentatives automatiques
- Après 3 échecs → nécessite retry manuel
- Bouton "Réessayer" dans `PendingMessagesList`

---

## 📊 Interface Utilisateur

### OfflineIndicator

**Affichage**:
- Bandeau rouge si offline
- Bandeau orange si online avec éléments en attente
- Masqué si online et queue vide

**Informations affichées**:
- État de la connexion
- Nombre d'éléments en attente
- Nombre d'éléments échoués
- Bouton "Synchroniser" (si connecté)

### PendingMessagesList

**Affichage**:
- Cartes colorées selon le statut
- Badge "En attente" ou "Échoué"
- Date/heure de création
- Bouton "Réessayer" pour les échecs
- Animation pendant le traitement

---

## 🧪 Tests à Effectuer

### Test 1: Message Texte Offline
1. Désactiver WiFi/Données
2. Envoyer un message texte
3. **Vérifier**: Message affiché avec badge "En attente"
4. Réactiver connexion
5. **Vérifier**: Synchronisation automatique après 2s
6. **Vérifier**: Message envoyé, badge retiré

### Test 2: Audio Offline
1. Désactiver WiFi/Données
2. Enregistrer et envoyer un audio
3. **Vérifier**: Audio affiché avec badge "En attente"
4. **Vérifier**: Fichier sauvegardé localement
5. Réactiver connexion
6. **Vérifier**: Upload → Transcription → Analyse
7. **Vérifier**: Résultats affichés, badge retiré

### Test 3: Synchronisation Manuelle
1. Créer plusieurs messages offline
2. Réactiver connexion
3. Cliquer "Synchroniser maintenant"
4. **Vérifier**: Progression affichée
5. **Vérifier**: Tous les messages traités

### Test 4: Erreur Réseau
1. Créer un message offline
2. Réactiver connexion instable
3. Lancer synchronisation
4. **Vérifier**: Message marqué comme failed après 3 tentatives
5. **Vérifier**: Bouton "Réessayer" disponible

### Test 5: Persistance
1. Créer des messages offline
2. Fermer l'application
3. Rouvrir l'application
4. **Vérifier**: Messages toujours en attente
5. Réactiver connexion
6. **Vérifier**: Synchronisation automatique

---

## 📦 Dépendances Ajoutées

```json
{
  "@react-native-community/netinfo": "^11.0.0",
  "expo-file-system": "~16.0.0"
}
```

**Installation**:
```bash
npm install @react-native-community/netinfo expo-file-system
```

---

## 📁 Fichiers Créés

1. ✅ `src/services/NetworkService.ts`
2. ✅ `src/services/OfflineQueueService.ts`
3. ✅ `src/services/AudioStorageService.ts`
4. ✅ `src/services/SyncService.ts`
5. ✅ `src/components/OfflineIndicator.tsx`
6. ✅ `src/components/PendingMessagesList.tsx`
7. ✅ `src/hooks/useNetworkStatus.ts`
8. ✅ `src/hooks/useOfflineQueue.ts`

## 📝 Fichiers Modifiés

1. ✅ `src/components/ChatConversation.tsx`
2. ✅ `package.json` (dépendances)

---

## 🎉 Résultat Final

**Avant** ❌:
- Application bloquée sans Internet
- Messages perdus si pas de connexion
- Pas de possibilité de travailler offline

**Après** ✅:
- Application fonctionnelle sans Internet
- Messages et audios sauvegardés localement
- Synchronisation automatique dès la reconnexion
- Indicateurs visuels clairs de l'état
- Retry manuel pour les échecs

**Impact**:
- 📱 Expérience utilisateur améliorée (travail possible offline)
- 🔄 Synchronisation transparente
- 💾 Données préservées même sans connexion
- 🎯 Fiabilité accrue de l'application

---

**Implémentation terminée avec succès !** 🚀
