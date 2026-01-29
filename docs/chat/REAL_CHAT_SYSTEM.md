# Système de Chat Réel avec Base de Données

## 📋 Vue d'ensemble

Le système de chat a été entièrement refactorisé pour utiliser de vraies données depuis Supabase avec support des chats privés et partagés entre les membres d'une ferme.

## 🗃️ Structure de la Base de Données

### Tables Principales

#### `chat_sessions`
```sql
- id (uuid) - Identifiant unique du chat
- farm_id (integer) - Lié à la ferme
- user_id (uuid) - Créateur du chat
- title (varchar) - Titre du chat
- description (text) - Description optionnelle
- chat_type (varchar) - Type: 'general', 'task', 'observation'
- is_shared (boolean) - Chat privé (false) ou partagé (true)
- status (varchar) - 'active', 'archived'
- message_count (integer) - Nombre de messages
- last_message_at (timestamp) - Dernier message
- created_at, updated_at, archived_at
```

#### `chat_messages`
```sql
- id (uuid) - Identifiant unique du message
- session_id (uuid) - Lié au chat
- role (varchar) - 'user', 'assistant', 'system'
- content (text) - Contenu du message
- ai_confidence (numeric) - Confiance IA (0-1)
- metadata (jsonb) - Métadonnées diverses
- created_at, edited_at
- reply_to_id (uuid) - Réponse à un message
```

#### `chat_participants`
```sql
- id (uuid) - Identifiant unique
- chat_session_id (uuid) - Lié au chat
- user_id (uuid) - Utilisateur participant  
- role (varchar) - 'admin', 'member'
- joined_at, last_read_at - Dates de participation
- is_active (boolean) - Participant actif
```

## 🔐 Sécurité (RLS)

### Politiques Implémentées

1. **Chat Sessions**
   - ✅ Utilisateur voit ses propres chats
   - ✅ Utilisateur voit chats partagés où il participe
   - ✅ Création limitée aux fermes de l'utilisateur
   - ✅ Modification par propriétaire ou admin du chat

2. **Chat Messages** 
   - ✅ Messages visibles seulement aux participants
   - ✅ Envoi autorisé aux participants du chat

3. **Chat Participants**
   - ✅ Visibles aux participants du chat
   - ✅ Gestion par les admins du chat

## 🛠️ Services et API

### `ChatService` (`src/services/chatService.ts`)

#### Méthodes Principales

```typescript
// Gestion des sessions
getChatSessions(farmId: number): Promise<ChatSession[]>
getChatSession(sessionId: string): Promise<ChatSession | null>
createChatSession(data: CreateChatSessionData): Promise<ChatSession>
updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<void>
archiveChatSession(sessionId: string): Promise<void>
unarchiveChatSession(sessionId: string): Promise<void>

// Gestion des messages
getChatMessages(sessionId: string, limit?: number): Promise<ChatMessage[]>
sendMessage(data: CreateMessageData): Promise<ChatMessage>

// Gestion des participants (chats partagés)
addParticipant(sessionId: string, userId: string, role?: 'admin' | 'member'): Promise<void>
removeParticipant(sessionId: string, userId: string): Promise<void>
markAsRead(sessionId: string, userId: string): Promise<void>

// Temps réel
subscribeToMessages(sessionId: string, onMessage: (message: ChatMessage) => void)
subscribeToChatSessions(farmId: number, onUpdate: (session: ChatSession) => void)
```

### Vue `chat_sessions_with_info`

Vue enrichie combinant sessions, participants et derniers messages pour optimiser les requêtes.

## 🔄 Fonctionnalités

### Types de Chat

1. **Chats Privés** (`is_shared = false`)
   - Accessibles seulement au créateur
   - Parfait pour notes personnelles
   - Conversations avec l'IA

2. **Chats Partagés** (`is_shared = true`)
   - Accessibles aux participants ajoutés
   - Rôles: `admin` (gestion) / `member` (participation)
   - Collaboration entre membres de la ferme

### Temps Réel

- **Messages en direct** via Supabase Realtime
- **Mises à jour des sessions** (archivage, nouveaux chats)
- **Notifications de lecture** avec `last_read_at`

### Intelligence Artificielle

- **Détection automatique** de messages nécessitant l'IA
- **Analyse agricole** via `AIChatService`
- **Stockage des résultats** avec métadonnées
- **Mode dégradé** si IA indisponible

## 📱 Interface Utilisateur

### Composants Mis à Jour

#### `ChatList` (`src/components/ChatList.tsx`)
- ✅ **Chargement depuis BDD** via `ChatService.getChatSessions()`
- ✅ **Création de chats** avec `ChatService.createChatSession()`
- ✅ **Archivage/Désarchivage** en temps réel
- ✅ **Écoute temps réel** des nouvelles sessions
- ✅ **États de chargement** avec indicateurs visuels

#### `ChatConversation` (`src/components/ChatConversation.tsx`)
- ✅ **Messages de la BDD** via `ChatService.getChatMessages()`
- ✅ **Envoi de messages** via `ChatService.sendMessage()`
- ✅ **Écoute temps réel** des nouveaux messages
- ✅ **Intégration IA** pour analyse automatique
- ✅ **Adaptation UI** des types `ChatMessage` vers `Message`

#### `ChatScreen` (`src/screens/ChatScreen.tsx`)
- ✅ **Suppression des données simulées**
- ✅ **Gestion d'état simplifiée** (ChatList gère ses données)
- ✅ **Navigation responsive** préservée

## 🚀 Déploiement

### 1. Migration Base de Données

```bash
# Appliquer la migration
supabase db push

# Ou manuellement
psql -f supabase/migrations/006_extend_chat_system.sql
```

### 2. Vérification RLS

Assurer que les politiques de sécurité sont actives :

```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('chat_sessions', 'chat_messages', 'chat_participants');
```

### 3. Test des Permissions

Vérifier l'accès avec différents utilisateurs et rôles.

## 🧪 Tests et Validation

### Tests Fonctionnels

1. **Chats Privés**
   - ✅ Création par utilisateur
   - ✅ Invisible aux autres membres
   - ✅ Messages synchronisés

2. **Chats Partagés**
   - ✅ Ajout/suppression participants
   - ✅ Rôles admin/member
   - ✅ Permissions correctes

3. **Temps Réel**
   - ✅ Nouveaux messages instantanés
   - ✅ Archivage synchronisé
   - ✅ Déconnexion propre

4. **IA Integration**
   - ✅ Détection messages agricoles
   - ✅ Analyse et réponse
   - ✅ Mode dégradé fonctionnel

### Performance

- **Indexation optimisée** pour requêtes fréquentes
- **Pagination** des messages (limit par défaut: 100)
- **Vue matérialisée** pour sessions avec infos

## 🐛 Dépannage

### Problèmes Courants

1. **Messages non synchronisés**
   - Vérifier connexion Supabase Realtime
   - Contrôler les politiques RLS

2. **Chats invisibles**
   - Vérifier `farm_id` et appartenance
   - Contrôler `chat_participants` pour chats partagés

3. **Erreurs de permissions**
   - Vérifier RLS activé sur toutes les tables
   - Tester politiques avec différents utilisateurs

### Logs Utiles

```typescript
// Debug dans ChatService
console.log('Chat sessions loaded:', sessions.length);
console.log('User farm membership:', farmId);
console.log('Realtime subscription active:', subscription.state);
```

## 📈 Évolutions Futures

### Fonctionnalités Prévues

1. **Notifications Push** pour nouveaux messages
2. **Recherche avancée** dans l'historique
3. **Pièces jointes** (images, documents)
4. **Messages vocaux** avec transcription
5. **Threads de discussion** avec `reply_to_id`
6. **Chats de groupe** étendus avec channels
7. **Intégration calendrier** pour tâches planifiées
8. **Export/sauvegarde** des conversations importantes

### Optimisations Techniques

1. **Cache intelligent** avec React Query
2. **Compression des messages** pour historique
3. **Archivage automatique** des vieux chats
4. **Métriques d'utilisation** et analytics

---

## 📞 Support

Pour toute question sur le système de chat :

1. **Documentation technique** : Ce fichier
2. **Code source** : `src/services/chatService.ts` et composants
3. **Migration BDD** : `supabase/migrations/006_extend_chat_system.sql`
4. **Tests** : Utiliser ferme de développement avec plusieurs utilisateurs

Le système de chat est maintenant prêt pour un usage en production avec de vraies données ! 🎉


