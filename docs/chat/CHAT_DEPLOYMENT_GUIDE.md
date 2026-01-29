# Guide de Déploiement - Système de Chat Réel

## 🚀 Déploiement Rapide

### 1. Appliquer la Migration de Base de Données

```bash
# Dans le répertoire du projet
cd /path/to/your/project

# Appliquer la migration
supabase db push

# Ou manuellement si nécessaire
supabase db reset --debug
```

### 2. Vérifier les Tables Créées

Connectez-vous à votre dashboard Supabase et vérifiez que les tables suivantes existent :

- ✅ `chat_sessions` (étendue)
- ✅ `chat_messages` (étendue) 
- ✅ `chat_participants` (nouvelle)
- ✅ Vue `chat_sessions_with_info`

### 3. Vérifier les Politiques RLS

Dans l'éditeur SQL Supabase, exécutez :

```sql
-- Vérifier que RLS est activé
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('chat_sessions', 'chat_messages', 'chat_participants');

-- Vérifier les politiques
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('chat_sessions', 'chat_messages', 'chat_participants');
```

### 4. Tester l'Application

```bash
# Démarrer l'application
npm start
# ou
npx expo start --web
```

### 5. Test Fonctionnel

1. **Connexion utilisateur** avec un compte de test
2. **Sélection d'une ferme** (doit avoir farm_id valide)
3. **Création d'un chat** via le bouton "+"
4. **Envoi de messages** dans la conversation
5. **Test archivage** via swipe ou bouton

## 🧪 Tests Recommandés

### Scénario 1 : Chat Privé Basique

```typescript
// 1. Créer un nouveau chat
// 2. Envoyer message simple: "Bonjour Thomas"
// 3. Vérifier réponse automatique
// 4. Envoyer message agricole: "j'ai récolté 5kg de tomates"
// 5. Vérifier analyse IA (ou message de fallback)
```

### Scénario 2 : Persistance des Données

```typescript
// 1. Créer un chat avec plusieurs messages
// 2. Rafraîchir la page
// 3. Vérifier que les messages sont toujours là
// 4. Archiver le chat
// 5. Vérifier qu'il disparaît de la liste principale
```

### Scénario 3 : Temps Réel (si possible)

```typescript
// 1. Ouvrir l'app dans 2 onglets/appareils
// 2. Créer un chat partagé
// 3. Ajouter un participant
// 4. Envoyer des messages depuis chaque appareil
// 5. Vérifier synchronisation temps réel
```

## ❌ Problèmes Courants et Solutions

### Erreur : "Cannot read properties of undefined (reading 'id')"

**Cause** : `activeFarm` n'est pas définie dans le contexte

**Solution** :
```typescript
// Vérifier dans FarmContext que l'utilisateur a une ferme active
// Ou créer une ferme de test dans Supabase
```

### Erreur : "Permission denied for table chat_sessions"

**Cause** : RLS mal configuré ou utilisateur sans farm_members

**Solution** :
```sql
-- Vérifier que l'utilisateur est membre d'au moins une ferme
SELECT * FROM farm_members WHERE user_id = auth.uid();

-- Si non, créer une association
INSERT INTO farm_members (farm_id, user_id, role, is_active)
VALUES (1, auth.uid(), 'owner', true);
```

### Erreur : "Subscription failed"

**Cause** : Realtime non activé ou problème réseau

**Solution** :
1. Activer Realtime dans Supabase Dashboard
2. Vérifier les tables autorisées pour Realtime
3. Tester sans subscription d'abord

### Messages non affichés

**Cause** : Problème d'adaptation des types

**Solution** :
```typescript
// Vérifier dans la console les erreurs de type
// S'assurer que adaptChatMessageToMessage fonctionne
console.log('Raw messages:', chatMessages);
console.log('Adapted messages:', adaptedMessages);
```

## 🔧 Configuration Avancée

### Variables d'Environnement

Assurez-vous que votre `.env` contient :

```bash
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-key # Pour l'IA
```

### Realtime Configuration

Dans Supabase Dashboard > Settings > API :

1. **Activer Realtime** pour les tables :
   - `chat_sessions`
   - `chat_messages`
   - `chat_participants`

2. **Configurer les filtres RLS** pour Realtime

### Performance Optimizations

```sql
-- Index supplémentaires si beaucoup de messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_session 
ON chat_messages(session_id, created_at DESC);

-- Nettoyage des anciens messages (optionnel)
DELETE FROM chat_messages 
WHERE created_at < NOW() - INTERVAL '1 year'
AND session_id IN (
    SELECT id FROM chat_sessions WHERE archived_at < NOW() - INTERVAL '6 months'
);
```

## ✅ Checklist de Déploiement

- [ ] Migration appliquée avec succès
- [ ] Tables présentes dans Supabase
- [ ] Politiques RLS actives et testées
- [ ] Realtime configuré (optionnel)
- [ ] Application démarre sans erreur
- [ ] Utilisateur peut se connecter
- [ ] Ferme sélectionnée/active
- [ ] Chat créé avec succès
- [ ] Messages envoyés et reçus
- [ ] Archivage fonctionnel
- [ ] Données persistantes après refresh

## 📊 Monitoring

### Requêtes de Diagnostic

```sql
-- Nombre de chats par ferme
SELECT farm_id, COUNT(*) as chat_count
FROM chat_sessions 
GROUP BY farm_id;

-- Messages par chat
SELECT cs.title, COUNT(cm.id) as message_count
FROM chat_sessions cs
LEFT JOIN chat_messages cm ON cs.id = cm.session_id
GROUP BY cs.id, cs.title
ORDER BY message_count DESC;

-- Participants actifs
SELECT cs.title, COUNT(cp.user_id) as participants
FROM chat_sessions cs
LEFT JOIN chat_participants cp ON cs.id = cp.chat_session_id AND cp.is_active = true
WHERE cs.is_shared = true
GROUP BY cs.id, cs.title;
```

### Logs Application

Surveillez les logs pour :
- Erreurs de connexion Supabase
- Échecs d'envoi de messages  
- Problèmes de subscription Realtime
- Erreurs d'analyse IA

---

🎉 **Le système de chat est maintenant opérationnel avec de vraies données !**

Pour toute question, référez-vous au fichier `REAL_CHAT_SYSTEM.md` pour la documentation complète.


