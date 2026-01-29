# ⚙️ Features & Systèmes - Guides Techniques

Documentation des systèmes et fonctionnalités principales de Thomas V2.

## 📋 Contenu

### **Gestion Fermes**
- **FARM_CONTEXT_USAGE.md** ⭐ - Usage du FarmContext
- **FARM_DATA_CACHE_SYSTEM.md** - Système de cache données ferme
- **FARM_MEMBERS_GUIDE.md** - Gestion membres et permissions

### **Systèmes Core**
- **CONTAINER_SYSTEM_GUIDE.md** - Système de contenants
- **CULTURE_SYSTEM_GUIDE.md** - Système de cultures
- **FILTER_SYSTEM_GUIDE.md** - Système de filtres avancés
- **NOTIFICATIONS_SYSTEM_GUIDE.md** - Système de notifications
- **SOFT_DELETE_SYSTEM_GUIDE.md** - Suppression logique
- **OFFLINE_SYSTEM_COMPLETE.md** - Mode offline
- **PERMISSIONS_GUIDE.md** - Gestion permissions

### **UI & Navigation**
- **NAVIGATION_INTEGRATION.md** - Intégration navigation
- **STATISTICS_FARM_INTEGRATION.md** - Intégration statistiques
- **STATS_HEADER_GUIDE.md** - Headers statistiques
- **DATE_PICKER_GUIDE.md** - Sélecteur de dates

### **Corrections & Optimisations**
- **FILTER_DEFAULT_FIX.md** - Fix filtres par défaut
- **SOFT_DELETE_CONFORMITY_VALIDATION.md** - Validation soft delete

## 🎯 Par Où Commencer ?

### **Développement**
1. **Fermes** → `FARM_CONTEXT_USAGE.md`
2. **Cache** → `FARM_DATA_CACHE_SYSTEM.md`
3. **Cultures** → `CULTURE_SYSTEM_GUIDE.md`

### **Systèmes**
1. **Filtres** → `FILTER_SYSTEM_GUIDE.md`
2. **Notifications** → `NOTIFICATIONS_SYSTEM_GUIDE.md`
3. **Offline** → `OFFLINE_SYSTEM_COMPLETE.md`

## 🏡 Système de Fermes

### **FarmContext**

Context React central pour la gestion des fermes :

```typescript
const {
  farm,              // Ferme active
  setActiveFarm,     // Changer ferme active
  farms,             // Toutes les fermes utilisateur
  members,           // Membres ferme active
  cultures,          // Cultures ferme active
  plots,             // Parcelles ferme active
  isLoading,         // État chargement
  error,             // Erreur éventuelle
  refresh,           // Rafraîchir données
} = useFarm();
```

### **Cache Intelligent**

**3 niveaux de cache** :
1. **Memory cache** - Données en RAM (rapide)
2. **AsyncStorage** - Persistance local (offline)
3. **Supabase** - Source de vérité (sync)

**Stratégies** :
- ✅ Cache-first pour lecture
- ✅ Optimistic updates pour écriture
- ✅ Background sync
- ✅ Invalidation sélective

## 🌾 Cultures & Parcelles

### **Système de Cultures**

```typescript
interface Culture {
  id: string;
  farm_id: string;
  name: string;              // Ex: "Blé tendre"
  variety?: string;          // Ex: "Renan"
  plot_id?: string;          // Parcelle
  surface_ha: number;        // Surface en hectares
  start_date: string;        // Date plantation
  expected_harvest?: string; // Récolte prévue
  status: 'planned' | 'active' | 'harvested';
  notes?: string;
}
```

**Actions** :
- Créer culture
- Associer à parcelle
- Suivre état (planifié > actif > récolté)
- Historique cultures

## 📦 Système de Contenants

Gestion des contenants de stockage (silos, cuves, hangars, etc.)

```typescript
interface Container {
  id: string;
  farm_id: string;
  name: string;
  type: 'silo' | 'tank' | 'barn' | 'other';
  capacity: number;          // Capacité en unités
  unit: 'tons' | 'liters' | 'm3';
  current_stock: number;     // Stock actuel
  content?: string;          // Contenu actuel
  location?: string;
}
```

## 🔔 Système de Notifications

### **Types de Notifications**
- 📅 **Rappels tâches** - Tâches à venir
- 🌡️ **Alertes météo** - Conditions défavorables
- 🐛 **Alertes maladies** - Risques maladies
- 📊 **Rapports** - Rapports hebdo/mensuels
- 👥 **Social** - Invitations, mentions

### **Channels**
- **Push** - Notifications push (Expo)
- **In-app** - Badge + liste notifications
- **Email** - Résumés (optionnel)

### **Préférences**
Utilisateur peut configurer :
- Types notifications reçues
- Fréquence
- Horaires (pas la nuit)
- Channels activés

## 🔄 Système Offline

### **Mode Offline**

**Fonctionnalités disponibles offline** :
- ✅ Consultation données (cache)
- ✅ Création observations
- ✅ Création tâches
- ✅ Modification cultures
- ✅ Upload photos (queue)

**Synchronisation automatique** :
- Détection retour online
- Sync queue d'actions
- Résolution conflits
- Notification sync complète

### **Indicateurs**
- Badge "Offline" dans header
- Nombre d'actions en attente
- Progression sync

## 🗑️ Soft Delete

Suppression logique (pas de suppression physique).

### **Avantages**
- ✅ Récupération données
- ✅ Historique complet
- ✅ Audit trail
- ✅ Undo possible

### **Implémentation**
```sql
ALTER TABLE observations
ADD COLUMN deleted_at TIMESTAMP NULL;

-- Policy RLS
CREATE POLICY "Hide deleted"
ON observations FOR SELECT
USING (deleted_at IS NULL);
```

### **Actions**
- Soft delete : `UPDATE SET deleted_at = NOW()`
- Restore : `UPDATE SET deleted_at = NULL`
- Hard delete : Après 30 jours (CRON job)

## 🔐 Permissions & Rôles

### **Rôles Ferme**
- **owner** - Propriétaire (tous droits)
- **manager** - Gestionnaire (gestion quotidienne)
- **member** - Membre (consultation + certaines actions)
- **viewer** - Observateur (consultation uniquement)

### **Permissions**
```typescript
const permissions = {
  owner: ['all'],
  manager: ['read', 'write', 'delete', 'invite'],
  member: ['read', 'write'],
  viewer: ['read'],
};
```

### **Check Permission**
```typescript
const { hasPermission } = useFarm();

if (hasPermission('write')) {
  // Autoriser modification
}
```

## 📊 Statistiques

### **Métriques Disponibles**
- Surface totale cultivée
- Nombre cultures actives
- Tâches en cours/complétées
- Observations par type
- Documents par catégorie
- Évolution stocks contenants

### **Visualisations**
- Graphiques barres
- Camemberts
- Lignes temporelles
- Cartes parcelles

## 🎨 Composants UI

### **DatePicker**
```typescript
<DatePicker
  value={date}
  onChange={handleDateChange}
  mode="date" // ou "time" ou "datetime"
  minimumDate={new Date()}
  maximumDate={futureDate}
/>
```

### **FilterBar**
```typescript
<FilterBar
  filters={filters}
  onFilterChange={handleFilterChange}
  activeFilters={activeFilters}
  onClearAll={handleClearAll}
/>
```

## 🔗 Liens Utiles

### **Systèmes Core**
- **Fermes** : `FARM_CONTEXT_USAGE.md`, `FARM_DATA_CACHE_SYSTEM.md`
- **Cultures** : `CULTURE_SYSTEM_GUIDE.md`
- **Contenants** : `CONTAINER_SYSTEM_GUIDE.md`

### **Features**
- **Notifications** : `NOTIFICATIONS_SYSTEM_GUIDE.md`
- **Offline** : `OFFLINE_SYSTEM_COMPLETE.md`
- **Permissions** : `PERMISSIONS_GUIDE.md`

### **Architecture**
- **Architecture** : `../architecture/ARCHITECTURE_COMPLETE.md`
- **Design System** : `../design/DESIGN_SYSTEM_COMPLETE.md`

---

**16 documents** | Fermes, cultures, systèmes, notifications, offline, permissions




